import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildSessionSocketUrl,
  heartbeatSession,
} from "@/services/multiplayerSessionService";
import type { LatLng, OtherPlayerLocation } from "@/types/game";

const DEFAULT_LOCATION_UPDATE_MS = 5_000;
const DEFAULT_LOCATION_STALE_MS = 60_000;
const DEFAULT_STALE_CLOCK_INTERVAL_MS = 15_000;

export type SessionRole = "host" | "player";

export interface MultiplayerSessionContext {
  sessionId: string;
  token: string;
  playerId: string;
  userId: string;
  role: SessionRole;
  shelterCode: string;
}

export interface MultiplayerPlayerLocation {
  userId: string;
  lat: number;
  lng: number;
  updatedAt: number;
}

interface SessionPlayerIdentity {
  id: string;
  name: string;
}

interface UseMultiplayerSocketParams {
  sessionContext: MultiplayerSessionContext | null;
  gameState: string;
  playerLocation: LatLng;
  setPlayerLocation: (location: LatLng) => void;
  requestBroadcastLocation: () => Promise<LatLng | null>;
  isDefaultStartLocation: (location: LatLng) => boolean;
  roundLocationToGrid: (location: LatLng) => {
    lat: number;
    lng: number;
  };
  currentSessionUserId: string;
  players: SessionPlayerIdentity[];
  playerNameFallback: string;
  onPlayersChanged: () => void;
  onPlayerLeft: (options: { departedUserId?: string }) => void;
  onSessionClosed: () => void;
  onRaceStarted: () => void;
  onRaceFinished: (payload: any) => void;
  locationUpdateMs?: number;
  locationStaleMs?: number;
  staleClockIntervalMs?: number;
}

interface UseMultiplayerSocketResult {
  otherPlayerLocations: OtherPlayerLocation[];
  ensureSocketConnected: () => void;
  closeSocket: () => void;
  clearPlayerLocations: () => void;
}

export function useMultiplayerSocket({
  sessionContext,
  gameState,
  playerLocation,
  setPlayerLocation,
  requestBroadcastLocation,
  isDefaultStartLocation,
  roundLocationToGrid,
  currentSessionUserId,
  players,
  playerNameFallback,
  onPlayersChanged,
  onPlayerLeft,
  onSessionClosed,
  onRaceStarted,
  onRaceFinished,
  locationUpdateMs = DEFAULT_LOCATION_UPDATE_MS,
  locationStaleMs = DEFAULT_LOCATION_STALE_MS,
  staleClockIntervalMs = DEFAULT_STALE_CLOCK_INTERVAL_MS,
}: UseMultiplayerSocketParams): UseMultiplayerSocketResult {
  const sessionSocketRef = useRef<WebSocket | null>(null);
  const latestPlayerLocationRef = useRef(playerLocation);
  const locationBroadcastInFlightRef = useRef(false);
  const [socketReconnectKey, setSocketReconnectKey] = useState(0);
  const [multiplayerPlayerLocations, setMultiplayerPlayerLocations] = useState<
    Record<string, MultiplayerPlayerLocation>
  >({});
  const [locationClockTick, setLocationClockTick] = useState(0);

  const clearPlayerLocations = useCallback(() => {
    setMultiplayerPlayerLocations({});
  }, []);

  const closeSocket = useCallback(() => {
    const socket = sessionSocketRef.current;
    if (socket) {
      socket.close();
      sessionSocketRef.current = null;
    }
  }, []);

  const ensureSocketConnected = useCallback(() => {
    if (!sessionContext) {
      return;
    }
    const socket = sessionSocketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setSocketReconnectKey((previous) => previous + 1);
    }
  }, [sessionContext]);

  useEffect(() => {
    latestPlayerLocationRef.current = playerLocation;
  }, [playerLocation.lat, playerLocation.lng]);

  useEffect(() => {
    if (!sessionContext || gameState !== "playing") {
      return;
    }
    const interval = setInterval(() => {
      setLocationClockTick((tick) => tick + 1);
    }, staleClockIntervalMs);
    return () => clearInterval(interval);
  }, [gameState, sessionContext, staleClockIntervalMs]);

  const otherPlayerLocations = useMemo(() => {
    if (!sessionContext || gameState !== "playing") {
      return [];
    }

    const now = Date.now();
    void locationClockTick;

    return Object.values(multiplayerPlayerLocations)
      .filter((location) => location.userId !== currentSessionUserId)
      .map((location) => {
        const playerName =
          players.find((player) => player.id === location.userId)?.name ??
          playerNameFallback;
        return {
          userId: location.userId,
          name: playerName,
          lat: location.lat,
          lng: location.lng,
          isStale: now - location.updatedAt >= locationStaleMs,
        };
      });
  }, [
    currentSessionUserId,
    gameState,
    locationClockTick,
    locationStaleMs,
    multiplayerPlayerLocations,
    playerNameFallback,
    players,
    sessionContext,
  ]);

  const routeSessionEvent = useCallback(
    (message: any) => {
      const payload = (message as any)?.payload ?? {};

      switch (message?.type) {
        case "player_joined":
        case "ready_updated":
          onPlayersChanged();
          break;
        case "player_left":
        case "player_disconnected": {
          if (payload?.user_id) {
            setMultiplayerPlayerLocations((previous) => {
              const next = { ...previous };
              delete next[String(payload.user_id)];
              return next;
            });
          }
          const departedUserId =
            typeof payload?.player_id === "string"
              ? payload.player_id
              : typeof payload?.user_id === "string"
                ? payload.user_id
                : undefined;
          onPlayerLeft({ departedUserId });
          break;
        }
        case "player_location_removed":
          if (payload?.user_id) {
            setMultiplayerPlayerLocations((previous) => {
              const next = { ...previous };
              delete next[String(payload.user_id)];
              return next;
            });
          }
          break;
        case "player_locations_snapshot": {
          const locations = Array.isArray(payload?.locations) ? payload.locations : [];
          setMultiplayerPlayerLocations(() => {
            const next: Record<string, MultiplayerPlayerLocation> = {};
            locations.forEach((entry) => {
              const userId = typeof entry?.user_id === "string" ? entry.user_id : null;
              const lat = typeof entry?.lat === "number" ? entry.lat : Number.NaN;
              const lng = typeof entry?.lng === "number" ? entry.lng : Number.NaN;
              const updatedAt =
                typeof entry?.updated_at === "number" ? entry.updated_at : Date.now();
              if (!userId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
                return;
              }
              next[userId] = { userId, lat, lng, updatedAt };
            });
            return next;
          });
          break;
        }
        case "player_location_updated": {
          const userId = typeof payload?.user_id === "string" ? payload.user_id : null;
          const lat = typeof payload?.lat === "number" ? payload.lat : Number.NaN;
          const lng = typeof payload?.lng === "number" ? payload.lng : Number.NaN;
          const updatedAt =
            typeof payload?.updated_at === "number" ? payload.updated_at : Date.now();
          if (!userId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
            break;
          }
          setMultiplayerPlayerLocations((previous) => ({
            ...previous,
            [userId]: { userId, lat, lng, updatedAt },
          }));
          break;
        }
        case "session_closed":
          onSessionClosed();
          break;
        case "race_started":
          clearPlayerLocations();
          onRaceStarted();
          break;
        case "race_finished":
          onRaceFinished(payload);
          break;
        default:
          break;
      }
    },
    [
      clearPlayerLocations,
      onPlayerLeft,
      onPlayersChanged,
      onRaceFinished,
      onRaceStarted,
      onSessionClosed,
    ],
  );

  useEffect(() => {
    if (!sessionContext) {
      return undefined;
    }

    const socket = new WebSocket(
      buildSessionSocketUrl(sessionContext.sessionId, sessionContext.token),
    );
    sessionSocketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        routeSessionEvent(payload);
      } catch (error) {
        console.warn("[Multiplayer] Failed to parse session event:", error);
      }
    };

    socket.onclose = () => {
      if (sessionSocketRef.current === socket) {
        sessionSocketRef.current = null;
      }
    };

    socket.onerror = (event) => {
      console.warn("[Multiplayer] WebSocket error:", event);
    };

    return () => {
      socket.close();
      if (sessionSocketRef.current === socket) {
        sessionSocketRef.current = null;
      }
    };
  }, [routeSessionEvent, sessionContext, socketReconnectKey]);

  useEffect(() => {
    if (!sessionContext || gameState !== "playing") {
      return undefined;
    }

    const sendLocationUpdate = async () => {
      if (locationBroadcastInFlightRef.current) {
        return;
      }
      const socket = sessionSocketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }

      locationBroadcastInFlightRef.current = true;
      try {
        let location = latestPlayerLocationRef.current;
        if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
          return;
        }

        const freshLocation = await requestBroadcastLocation();
        if (
          freshLocation &&
          Number.isFinite(freshLocation.lat) &&
          Number.isFinite(freshLocation.lng)
        ) {
          const previousLocation = latestPlayerLocationRef.current;
          location = freshLocation;
          latestPlayerLocationRef.current = freshLocation;
          if (
            Math.abs(previousLocation.lat - freshLocation.lat) > 1e-6 ||
            Math.abs(previousLocation.lng - freshLocation.lng) > 1e-6
          ) {
            setPlayerLocation(freshLocation);
          }
        }

        if (isDefaultStartLocation(location)) {
          return;
        }

        const rounded = roundLocationToGrid(location);
        socket.send(
          JSON.stringify({
            type: "location_update",
            payload: {
              lat: rounded.lat,
              lng: rounded.lng,
            },
          }),
        );
      } finally {
        locationBroadcastInFlightRef.current = false;
      }
    };

    void sendLocationUpdate();
    const interval = setInterval(() => {
      void sendLocationUpdate();
    }, locationUpdateMs);

    return () => clearInterval(interval);
  }, [
    gameState,
    isDefaultStartLocation,
    locationUpdateMs,
    requestBroadcastLocation,
    roundLocationToGrid,
    sessionContext,
    setPlayerLocation,
  ]);

  useEffect(() => {
    if (!sessionContext) {
      return undefined;
    }

    let cancelled = false;

    const sendHeartbeat = () => {
      if (cancelled) {
        return;
      }
      heartbeatSession(sessionContext.sessionId, sessionContext.token).catch((error) => {
        console.warn("[Multiplayer] Heartbeat failed:", error);
      });
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 20_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionContext]);

  useEffect(() => {
    if (!sessionContext) {
      setMultiplayerPlayerLocations({});
    }
  }, [sessionContext]);

  return {
    otherPlayerLocations,
    ensureSocketConnected,
    closeSocket,
    clearPlayerLocations,
  };
}
