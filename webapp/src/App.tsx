import { useState, useEffect, useCallback, useRef } from "react";
import { IntroScreen } from "./components/IntroScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { SoloModeScreen } from "./components/SoloModeScreen";
import { WaitingRoom } from "./components/WaitingRoom";
import { GameScreen, type WrongGuessStage } from "./components/GameScreen";
import { HelpModal } from "./components/HelpModal";
import { TerminalScreen } from "./components/TerminalScreen";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner@2.0.3";
import type { Player, POI, QuestionAttribute } from "@/types/game";
import {
  defaultPlayers,
} from "@/data/gameContent";
import { defaultCityContext } from "./data/cityContext";
import {
  LIGHTNING_DURATION_MINUTES,
  LIGHTNING_RADIUS_KM,
} from "./config/runtime";
import {
  haversineDistanceKm,
  selectLightningShelter,
} from "./utils/lightningSelection";
import { getLocalShelters } from "@/services/mapLayerQueryService";
import {
  buildSessionSocketUrl,
  createMultiplayerSession,
  fetchSessionSnapshot,
  finishMultiplayerRace,
  heartbeatSession,
  joinMultiplayerSession,
  leaveMultiplayerSession,
  startMultiplayerRace,
  toggleReadyState,
  type Player as SessionPlayer,
  type SessionResponse,
} from "./services/multiplayerSessionService";
import { ProfileNameModal } from "./components/ProfileNameModal";
import { HostShareModal } from "./components/HostShareModal";
import {
  getShelterByShareCode,
  getShelters,
  type Shelter,
} from "./services/shelterDataService";
import { getQuestionAttributes } from "./services/questionAttributeService";
import { useI18n } from "./i18n";
import { LanguageToggle } from "./components/LanguageToggle";
import { Clock } from "lucide-react";
import loadingCat from "./assets/graphics/Loading Cat.gif";

type GameState =
  | "intro"
  | "onboarding"
  | "mode-select"
  | "waiting"
  | "playing"
  | "ended";

type GameMode = "lightning" | "citywide";

const INITIAL_SHELTER_RADIUS_KM = LIGHTNING_RADIUS_KM;
const DESIGNATED_CATEGORY = "designated ec";
const MULTIPLAYER_DURATION_MINUTES = 60;
const EXCLUDED_QUESTION_ATTRIBUTE_IDS = new Set([
  "floodDepthRank",
  "stormSurgeDepthRank",
  "floodDurationRank",
  "inlandWatersDepthRank",
]);
const GAME_SNAPSHOT_KEY = "shelterhunt.gameSnapshot.v1";
const GAMEPLAY_SNAPSHOT_KEY = "shelterhunt.gameplaySnapshot.v1";
const GAME_SNAPSHOT_VERSION = 1;
const RESUME_GRACE_MS = 10 * 60 * 1000;

type SessionRole = "host" | "player";

interface MultiplayerSessionContext {
  sessionId: string;
  token: string;
  playerId: string;
  userId: string;
  role: SessionRole;
  shelterCode: string;
}

interface GameSnapshot {
  version: number;
  savedAt: number;
  resumeId: string;
  gameState: GameState;
  gameCode: string;
  isHost: boolean;
  players: Player[];
  currentUserId: string;
  timeRemaining: number;
  timerEnabled: boolean;
  timerEndsAt: number | null;
  isTimerCritical: boolean;
  playerLocation: { lat: number; lng: number };
  secretShelter: { id: string; name: string } | null;
  shelterOptions: { id: string; name: string }[];
  gameMode: GameMode | null;
  lightningCenter: { lat: number; lng: number } | null;
  lightningRadiusKm: number | null;
  designatedShelters: POI[];
  remoteOutcome: { result: "win" | "lose"; winnerName?: string } | null;
  sessionContext: MultiplayerSessionContext | null;
  sessionHostId: string | null;
  currentShelter: Shelter | null;
  lockSecretShelter: boolean;
  lockShelterOptions: boolean;
  wrongGuessCount: number;
}
const mapSessionPlayersToUI = (
  records: SessionPlayer[],
  hostId: string,
): Player[] => {
  return records.map<Player>((record, index) => ({
    id: record.user_id,
    name:
      record.display_name ??
      (record.user_id === hostId ? "Host" : `Player ${index + 1}`),
    ready: record.ready,
  }));
};

const buildLocalDesignatedShelters = async (
  center: { lat: number; lng: number },
  radiusKm?: number,
): Promise<POI[]> => {
  const normalizedRadius =
    radiusKm !== undefined && Number.isFinite(radiusKm) ? Math.max(0, radiusKm) : null;
  const origin = { lat: center.lat, lng: center.lng };
  let shelters;
  try {
    shelters = await getLocalShelters();
  } catch (error) {
    console.warn("[Multiplayer] Failed to load local shelters:", error);
    throw new Error(
      "Unable to load nearby shelters right now. Check your connection and try again.",
    );
  }
  console.log("[Multiplayer] Filtering shelters", {
    total: shelters.length,
    center,
    radiusKm: normalizedRadius ?? "unbounded",
  });
  return shelters
    .filter(
      (poi) =>
        poi.category?.toLowerCase() === DESIGNATED_CATEGORY &&
        Number.isFinite(poi.lat) &&
        Number.isFinite(poi.lng),
    )
    .filter((poi) => {
      if (normalizedRadius === null) return true;
      return (
        haversineDistanceKm(origin, { lat: poi.lat, lng: poi.lng }) <=
        normalizedRadius
      );
    })
    .map<POI>((poi) => ({
      id: poi.id,
      name: poi.name,
      lat: poi.lat,
      lng: poi.lng,
      type: "shelter",
    }));
};

export default function App() {
  const { t } = useI18n();
  const [gameState, setGameState] = useState<GameState>("intro");
  const [gameCode, setGameCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Player[]>(defaultPlayers);
  const [currentUserId, setCurrentUserId] = useState(() => {
    if (typeof window === "undefined") return crypto.randomUUID();
    const stored = localStorage.getItem("shelterhunt.currentUserId");
    if (stored) return stored;
    const created = crypto.randomUUID();
    localStorage.setItem("shelterhunt.currentUserId", created);
    return created;
  });
  const [resumeId, setResumeId] = useState(() => crypto.randomUUID());
  const [profileName, setProfileName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("shelterhunt.profileName") ?? "";
  });
  const [joinNameModalOpen, setJoinNameModalOpen] = useState(false);
  const [hostSetupModalOpen, setHostSetupModalOpen] = useState(false);
  const [hostShareModalOpen, setHostShareModalOpen] = useState(false);
  const [hostShareCode, setHostShareCode] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes
  const [showHelp, setShowHelp] = useState(false);
  const [playerLocation, setPlayerLocation] = useState({
    lat: defaultCityContext.mapConfig.startLocation.lat,
    lng: defaultCityContext.mapConfig.startLocation.lng,
  });
  const [secretShelter, setSecretShelter] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [shelterOptions, setShelterOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [isTimerCritical, setIsTimerCritical] = useState(false);
  const [wrongGuessCount, setWrongGuessCount] = useState(0);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [lightningCenter, setLightningCenter] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [lightningRadiusKm, setLightningRadiusKm] = useState<number | null>(null);
  const [modeProcessing, setModeProcessing] = useState(false);
  const [sessionBootstrapLoading, setSessionBootstrapLoading] = useState(false);
  const [lockSecretShelter, setLockSecretShelter] = useState(false);
  const [lockShelterOptions, setLockShelterOptions] = useState(false);
  const [designatedShelters, setDesignatedShelters] = useState<POI[]>([]);
  const [remoteOutcome, setRemoteOutcome] = useState<
    { result: "win" | "lose"; winnerName?: string } | null
  >(null);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [questionAttributes, setQuestionAttributes] = useState<QuestionAttribute[]>([]);
  const [sessionContext, setSessionContext] = useState<MultiplayerSessionContext | null>(null);
  const sessionSocketRef = useRef<WebSocket | null>(null);
  const [socketReconnectKey, setSocketReconnectKey] = useState(0);
  const [sessionHostId, setSessionHostId] = useState<string | null>(null);
  const [currentShelter, setCurrentShelter] = useState<Shelter | null>(null);
  const [joinCodeScreenOpen, setJoinCodeScreenOpen] = useState(false);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const defaultNavigatorName = t("app.defaults.navigator", { fallback: "Navigator" });
  const defaultSoloName = t("app.defaults.soloPlayer", { fallback: "Solo Player" });
  const currentPlayerDisplayName = sessionContext
    ? players.find((player) => player.id === sessionContext.userId)?.name ||
      profileName ||
      defaultNavigatorName
    : profileName || defaultSoloName;
  const currentSessionUserId = sessionContext?.userId ?? currentUserId;
  const restoredFromSnapshotRef = useRef(false);

  const handleTimeUp = useCallback(() => {
    setGameState("ended");
    setSecretShelter(null);
    setShelterOptions([]);
    setIsTimerCritical(false);
    setTimerEnabled(false);
    setTimerEndsAt(null);
    toast.error(t("app.toasts.timeUp", { fallback: "Time's up! Game over." }));
  }, [t]);

  const setTimerState = useCallback((seconds: number, enabled: boolean) => {
    setTimeRemaining(seconds);
    setTimerEnabled(enabled);
    setTimerEndsAt(enabled ? Date.now() + seconds * 1000 : null);
  }, []);

  const buildGameSnapshot = useCallback(
    (): GameSnapshot => ({
      version: GAME_SNAPSHOT_VERSION,
      savedAt: Date.now(),
      resumeId,
      gameState,
      gameCode,
      isHost,
      players,
      currentUserId: sessionContext?.userId ?? currentUserId,
      timeRemaining,
      timerEnabled,
      timerEndsAt,
      isTimerCritical,
      playerLocation,
      secretShelter,
      shelterOptions,
      gameMode,
      lightningCenter,
      lightningRadiusKm,
      designatedShelters,
      remoteOutcome,
      sessionContext,
      sessionHostId,
      currentShelter,
      lockSecretShelter,
      lockShelterOptions,
      wrongGuessCount,
    }),
    [
      currentShelter,
      currentUserId,
      designatedShelters,
      gameCode,
      gameMode,
      gameState,
      isHost,
      isTimerCritical,
      lightningCenter,
      lightningRadiusKm,
      lockSecretShelter,
      lockShelterOptions,
      playerLocation,
      players,
      remoteOutcome,
      resumeId,
      secretShelter,
      sessionContext,
      sessionHostId,
      shelterOptions,
      timeRemaining,
      timerEnabled,
      timerEndsAt,
      wrongGuessCount,
    ],
  );

  const saveGameSnapshot = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const snapshot = buildGameSnapshot();
      localStorage.setItem(GAME_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn("[Resume] Failed to save snapshot", error);
    }
  }, [buildGameSnapshot]);

  const clearGameSnapshots = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(GAME_SNAPSHOT_KEY);
    localStorage.removeItem(GAMEPLAY_SNAPSHOT_KEY);
  }, []);

  const loadGameSnapshot = useCallback((): GameSnapshot | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(GAME_SNAPSHOT_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as GameSnapshot;
      if (parsed.version !== GAME_SNAPSHOT_VERSION) {
        return null;
      }
      return parsed;
    } catch (error) {
      console.warn("[Resume] Failed to parse snapshot", error);
      return null;
    }
  }, []);

  const applyGameSnapshot = useCallback(
    (snapshot: GameSnapshot) => {
      const now = Date.now();
      if (now - snapshot.savedAt > RESUME_GRACE_MS) {
        clearGameSnapshots();
        return;
      }

      const resolvedTimerEndsAt =
        snapshot.timerEnabled
          ? Number.isFinite(snapshot.timerEndsAt)
            ? (snapshot.timerEndsAt as number)
            : snapshot.savedAt + snapshot.timeRemaining * 1000
          : null;
      const nextTimeRemaining = resolvedTimerEndsAt
        ? Math.max(0, Math.ceil((resolvedTimerEndsAt - now) / 1000))
        : snapshot.timeRemaining;
      const shouldEnd =
        snapshot.timerEnabled && snapshot.gameState === "playing" && nextTimeRemaining <= 0;

      setResumeId(snapshot.resumeId || crypto.randomUUID());
      setGameState(shouldEnd ? "ended" : snapshot.gameState);
      setGameCode(snapshot.gameCode ?? "");
      setPlayers(snapshot.players ?? defaultPlayers);
      setIsHost(snapshot.isHost ?? false);
      setTimeRemaining(nextTimeRemaining);
      setTimerEnabled(snapshot.timerEnabled ?? true);
      setTimerEndsAt(snapshot.timerEnabled ? resolvedTimerEndsAt : null);
      setIsTimerCritical(snapshot.isTimerCritical ?? false);
      setPlayerLocation(snapshot.playerLocation ?? defaultCityContext.mapConfig.startLocation);
      setSecretShelter(snapshot.secretShelter ?? null);
      setShelterOptions(snapshot.shelterOptions ?? []);
      setGameMode(snapshot.gameMode ?? null);
      setLightningCenter(snapshot.lightningCenter ?? null);
      setLightningRadiusKm(snapshot.lightningRadiusKm ?? null);
      setDesignatedShelters(snapshot.designatedShelters ?? []);
      setRemoteOutcome(snapshot.remoteOutcome ?? null);
      setSessionContext(snapshot.sessionContext ?? null);
      setSessionHostId(snapshot.sessionHostId ?? null);
      setCurrentShelter(snapshot.currentShelter ?? null);
      setLockSecretShelter(snapshot.lockSecretShelter ?? false);
      setLockShelterOptions(snapshot.lockShelterOptions ?? false);
      setWrongGuessCount(snapshot.wrongGuessCount ?? 0);

      if (snapshot.currentUserId && snapshot.currentUserId !== currentUserId) {
        setCurrentUserId(snapshot.currentUserId);
        if (typeof window !== "undefined") {
          localStorage.setItem("shelterhunt.currentUserId", snapshot.currentUserId);
        }
      }

      if (shouldEnd) {
        handleTimeUp();
      }
    },
    [clearGameSnapshots, currentUserId, handleTimeUp],
  );

  // Timer countdown
  useEffect(() => {
    if (!timerEnabled || gameState !== "playing" || !timerEndsAt) {
      return;
    }

    const tick = () => {
      const nextRemaining = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
      if (nextRemaining <= 0) {
        setTimeRemaining(0);
        handleTimeUp();
        return;
      }
      setTimeRemaining(nextRemaining);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [gameState, handleTimeUp, timerEnabled, timerEndsAt]);

  useEffect(() => {
    getShelters()
      .then(setShelters)
      .catch((error) => console.warn("[Shelters] Failed to load shelter dataset:", error));
    getQuestionAttributes()
      .then((attributes) =>
        setQuestionAttributes(
          attributes.filter((attribute) => !EXCLUDED_QUESTION_ATTRIBUTE_IDS.has(attribute.id)),
        ),
      )
      .catch((error) => console.warn("[Questions] Failed to load question attributes:", error));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (restoredFromSnapshotRef.current) return;
    const snapshot = loadGameSnapshot();
    if (!snapshot) return;
    applyGameSnapshot(snapshot);
    restoredFromSnapshotRef.current = true;
  }, [applyGameSnapshot, loadGameSnapshot]);


  const updateSecretShelter = useCallback(
    (info: { id: string; name: string }) => {
      if (lockSecretShelter) return;
      setSecretShelter(info);
    },
    [lockSecretShelter],
  );

  const updateShelterOptions = useCallback(
    (options: { id: string; name: string }[]) => {
      if (lockShelterOptions) return;
      setShelterOptions(options);
    },
    [lockShelterOptions],
  );

  const loadDesignatedShelters = useCallback(
    async (center: { lat: number; lng: number }, radiusKm: number) => {
      try {
        const shelters = await buildLocalDesignatedShelters(center, radiusKm);
        setDesignatedShelters(shelters);
        return shelters;
      } catch (error) {
        console.error(
          "[Lightning] Failed to load designated shelters from local data:",
          error,
        );
        throw error;
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (sessionSocketRef.current) {
        sessionSocketRef.current.close();
      }
    };
  }, []);

  const resetGameContext = () => {
    clearGameSnapshots();
    setResumeId(crypto.randomUUID());
    setTimerState(1800, true);
    setIsTimerCritical(false);
    setShelterOptions([]);
    setSecretShelter(null);
    setWrongGuessCount(0);
    setGameMode(null);
    setLockSecretShelter(false);
    setLockShelterOptions(false);
    setRemoteOutcome(null);
  };

  const disconnectSession = useCallback(
    async (options?: { finish?: boolean }) => {
      if (sessionContext) {
        if (options?.finish && sessionContext.role === "host") {
          try {
            await finishMultiplayerRace(sessionContext.sessionId, sessionContext.token);
          } catch (error) {
            console.warn("[Multiplayer] Failed to finish session:", error);
          }
        } else {
          try {
            await leaveMultiplayerSession(sessionContext.sessionId, sessionContext.token);
          } catch (error) {
            console.warn("[Multiplayer] Failed to leave session:", error);
          }
        }
      }
      if (sessionSocketRef.current) {
        sessionSocketRef.current.close();
        sessionSocketRef.current = null;
      }
      setSessionContext(null);
      setCurrentShelter(null);
      setSessionHostId(null);
    },
    [sessionContext],
  );

  const performSessionReset = useCallback(
    (options?: { toastMessage?: string; skipToast?: boolean; targetState?: GameState }) => {
      clearGameSnapshots();
      setResumeId(crypto.randomUUID());
      setRemoteOutcome(null);
      void disconnectSession();
      setGameState(options?.targetState ?? "onboarding");
      setGameCode("");
      setPlayers(defaultPlayers);
      setTimerState(1800, true);
      setShelterOptions([]);
      setIsTimerCritical(false);
      setSecretShelter(null);
      setWrongGuessCount(0);
      setGameMode(null);
      setLockSecretShelter(false);
      setLockShelterOptions(false);
      setModeProcessing(false);
      setJoinCodeScreenOpen(false);
      setJoinError(null);
      setHostShareModalOpen(false);
      setHostShareCode(null);
      setHostSetupModalOpen(false);
      setJoinNameModalOpen(false);

      if (!options?.skipToast) {
        toast.info(
          options?.toastMessage ??
            t("app.toasts.leftGame", { fallback: "Left the game" }),
        );
      }
    },
    [clearGameSnapshots, disconnectSession, setTimerState, t],
  );

  const refreshSessionPlayers = useCallback(
    async (
      sessionId: string,
      token: string,
      options?: { announceDeparture?: boolean; departedUserId?: string },
    ) => {
      try {
        const snapshot = await fetchSessionSnapshot(sessionId, token);
        const nextPlayers = mapSessionPlayersToUI(
          snapshot.players,
          snapshot.session.host_id,
        );

        let promotedHostId: string | null = null;

        setPlayers((previous) => {
          const removed = previous.filter(
            (player) => !nextPlayers.some((next) => next.id === player.id),
          );

          const hostDeparted =
            Boolean(sessionHostId) &&
            (removed.some((player) => player.id === sessionHostId) ||
              options?.departedUserId === sessionHostId);

          if (hostDeparted) {
            if (gameState === "playing") {
              performSessionReset({
                toastMessage: t("app.toasts.hostLeft", {
                  fallback: "Host left the game. Returning to lobby.",
                }),
                targetState: "ended",
              });
              return nextPlayers;
            }

            if (nextPlayers.length > 0) {
              promotedHostId = nextPlayers[0].id;
              console.info("[Multiplayer] Host left lobby, promoting new host", {
                previousHost: sessionHostId,
                newHost: promotedHostId,
              });
              if (promotedHostId === currentUserId) {
                setIsHost(true);
              } else {
                setIsHost(false);
              }
              toast.info(
                t("app.toasts.hostPromoted", {
                  replacements: { name: nextPlayers[0].name ?? "New host" },
                  fallback: `${nextPlayers[0].name ?? "A player"} is now the host.`,
                }),
              );
              return mapSessionPlayersToUI(snapshot.players, promotedHostId);
            }
          }

          if (
            removed.length &&
            (options?.announceDeparture || gameState === "playing")
          ) {
            removed.forEach((player) => {
              const name =
                player.name ||
                t("waiting.player", { fallback: "A player" });
              toast.info(
                t("app.toasts.playerLeft", {
                  replacements: { name },
                  fallback: `${name} left the game.`,
                }),
              );
            });
          }

          return nextPlayers;
        });

        const nextHostId = promotedHostId ?? snapshot.session.host_id;
        setSessionHostId(nextHostId);
        setIsHost(nextHostId === currentUserId);
      } catch (error) {
        console.warn("[Multiplayer] Failed to refresh session snapshot:", error);
      }
    },
    [currentUserId, gameState, performSessionReset, sessionHostId, t],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveGameSnapshot();
        return;
      }

      const snapshot = loadGameSnapshot();
      if (snapshot && snapshot.resumeId === resumeId) {
        applyGameSnapshot(snapshot);
      }

      if (sessionContext) {
        const socket = sessionSocketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          setSocketReconnectKey((prev) => prev + 1);
        }
        refreshSessionPlayers(sessionContext.sessionId, sessionContext.token);
        heartbeatSession(sessionContext.sessionId, sessionContext.token).catch((error) => {
          console.warn("[Multiplayer] Heartbeat failed after resume:", error);
        });
      }
    };

    const handlePageHide = () => {
      saveGameSnapshot();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [
    applyGameSnapshot,
    loadGameSnapshot,
    refreshSessionPlayers,
    resumeId,
    saveGameSnapshot,
    sessionContext,
  ]);

  useEffect(() => {
    if (!sessionContext || !restoredFromSnapshotRef.current) return;
    refreshSessionPlayers(sessionContext.sessionId, sessionContext.token);
  }, [refreshSessionPlayers, sessionContext]);

  const requestUserLocation = useCallback(
    () =>
      new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        if (!("geolocation" in navigator)) {
          reject(new Error("Geolocation is unavailable on this device."));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          },
          (err) => {
            reject(err);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          },
        );
      }),
    [],
  );

  const beginMultiplayerRace = useCallback(() => {
    if (!currentShelter) {
      return;
    }
    setResumeId(crypto.randomUUID());

    const label =
      currentShelter.nameEn ??
      currentShelter.nameJp ??
      currentShelter.code;

    const finishSetup = (options: { id: string; name: string }[], coords?: { lat: number; lng: number }) => {
      setSecretShelter({ id: currentShelter.code, name: label });
      setShelterOptions(options);
      setLockSecretShelter(true);
      setLockShelterOptions(true);
      setGameMode("lightning");
      setTimerState(MULTIPLAYER_DURATION_MINUTES * 60, true);
      setIsTimerCritical(false);
      if (coords) {
        setPlayerLocation(coords);
      }
      setGameState("playing");
    };

    const useFallback = () => {
      console.warn("[Multiplayer] Fallback to selected shelter only");
      finishSetup([{ id: currentShelter.code, name: label }]);
    };

    const seedCitywide = async () => {
      try {
        const cityCenter = defaultCityContext.mapConfig.startLocation;
        const nearby = designatedShelters.length
          ? designatedShelters
          : await buildLocalDesignatedShelters(cityCenter);
        if (!nearby.length) {
          useFallback();
          return;
        }
        const options = nearby.map((shelter) => ({
          id: shelter.id,
          name: shelter.name,
        }));
        finishSetup(options);
      } catch (error) {
        console.warn("[Multiplayer] Unable to seed citywide shelters:", error);
        useFallback();
      }
    };

    if (sessionContext) {
      void seedCitywide();
    } else {
      useFallback();
    }
  }, [buildLocalDesignatedShelters, currentShelter, designatedShelters, sessionContext, setTimerState]);

  const bootstrapSession = useCallback(
    async (
      response: SessionResponse,
      role: SessionRole,
      options?: { shelter?: Shelter },
    ) => {
      const displayName =
        response.player.display_name ??
        (profileName.trim() || "Player");
      const initialPlayer: Player = {
        id: response.player.user_id,
        name: displayName,
        ready: response.player.ready,
      };
      setPlayers([initialPlayer]);

      const resolvedShelter =
        options?.shelter ??
        (await getShelterByShareCode(response.session.shelter_code));
      if (resolvedShelter) {
        setCurrentShelter(resolvedShelter);
      }

      setSessionContext({
        sessionId: response.session.id,
        token: response.token,
        playerId: response.player.id,
        userId: response.player.user_id,
        role,
        shelterCode: response.session.shelter_code,
      });
      setSessionHostId(response.session.host_id);
      setGameCode(response.session.shelter_code);
      setIsHost(role === "host");
      setGameMode(null);
      setLockSecretShelter(false);
      setLockShelterOptions(false);
      setSecretShelter(null);
      setShelterOptions([]);
      setTimerState(1800, true);
      setIsTimerCritical(false);
      await refreshSessionPlayers(response.session.id, response.token);
      setGameState("waiting");
    },
    [getShelterByShareCode, profileName, refreshSessionPlayers, setTimerState],
  );

  const handleSessionEvent = useCallback(
    (message: any) => {
      if (!sessionContext) return;
      switch (message.type) {
        case "player_joined":
        case "ready_updated":
          refreshSessionPlayers(sessionContext.sessionId, sessionContext.token);
          break;
        case "player_left":
        case "player_disconnected":
          refreshSessionPlayers(sessionContext.sessionId, sessionContext.token, {
            announceDeparture: true,
            departedUserId: message.player_id ?? message.user_id,
          });
          break;
        case "session_closed":
          toast.error(
            t("app.toasts.hostLeft", {
              fallback: "Host left the game. Returning to lobby.",
            }),
          );
          performSessionReset({
            skipToast: true,
            targetState: gameState === "playing" ? "ended" : "onboarding",
          });
          break;
        case "race_started":
          beginMultiplayerRace();
          break;
        case "race_finished": {
          const payload = (message as any)?.payload ?? {};
          const winner = payload.winner ?? {};
          console.log("[Multiplayer] race_finished event", payload);
          const winnerName =
            winner.display_name ??
            t("defeat.subtitle", { fallback: "Another team reached the shelter." });
          if (sessionContext) {
            const isSelf = winner.user_id === sessionContext.userId;
            setRemoteOutcome({
              result: isSelf ? "win" : "lose",
              winnerName,
            });
            if (!isSelf) {
              toast.error(
                t("app.toasts.raceFinished", {
                  fallback: "Another team found the shelter first.",
                }),
              );
            }
          }
          break;
        }
        default:
          break;
      }
    },
    [beginMultiplayerRace, gameState, performSessionReset, refreshSessionPlayers, sessionContext, t],
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
        handleSessionEvent(payload);
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
    };
  }, [handleSessionEvent, sessionContext, socketReconnectKey]);

  useEffect(() => {
    if (!sessionContext) {
      return undefined;
    }

    let cancelled = false;

    const sendHeartbeat = () => {
      if (cancelled) return;
      heartbeatSession(sessionContext.sessionId, sessionContext.token).catch(
        (error) => {
          console.warn("[Multiplayer] Heartbeat failed:", error);
        },
      );
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionContext]);

  const handleSkipIntro = () => {
    setGameState("onboarding");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const trimmed = profileName.trim();
    if (trimmed) {
      localStorage.setItem("shelterhunt.profileName", trimmed);
    }
  }, [profileName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("shelterhunt.currentUserId", currentUserId);
  }, [currentUserId]);

  const startHostFlow = useCallback(
    async (overrideName?: string) => {
      if (modeProcessing) return;
      setModeProcessing(true);
      setHostShareModalOpen(false);
      setHostShareCode(null);
      await disconnectSession();
      try {
        const cityCenter = defaultCityContext.mapConfig.startLocation;
        const nearby = await buildLocalDesignatedShelters(cityCenter);
        console.log("[Multiplayer] Citywide shelters available", {
          count: nearby.length,
        });
        if (!nearby.length) {
          throw new Error(
            "No shelters available in the dataset. Please try again.",
          );
        }
        const { secretShelter } = selectLightningShelter(
          nearby,
          cityCenter,
          Number.POSITIVE_INFINITY,
        );
        console.log("[Multiplayer] Selected shelter candidate", {
          id: secretShelter.id,
          name: secretShelter.name,
        });
        const shareCode = secretShelter.id;
        const resolved = await getShelterByShareCode(shareCode);
        if (!resolved) {
          throw new Error(
            t("app.errors.shelterUnavailable", {
              fallback: "Selected shelter is unavailable. Try again.",
            }),
          );
        }
        const displayName =
          overrideName?.trim() || profileName.trim() || defaultNavigatorName;
        console.log("[Multiplayer] Creating session", {
          shareCode,
          displayName,
          ttlMinutes: MULTIPLAYER_DURATION_MINUTES,
        });
        const response = await createMultiplayerSession({
          shelterCode: shareCode,
          hostId: currentUserId,
          displayName,
          ttlMinutes: MULTIPLAYER_DURATION_MINUTES,
        });
        console.log("[Multiplayer] Session created", {
          sessionId: response.session.id,
          hostPlayerId: response.player.id,
        });
        await bootstrapSession(response, "host", { shelter: resolved });
        setHostShareCode(response.session.shelter_code);
        setHostShareModalOpen(true);
      } catch (error) {
        console.error("[Multiplayer] Host flow failed:", error);
        toast.error(
          t("app.errors.startMultiplayer", {
            fallback: "Unable to start multiplayer session",
          }),
        );
      } finally {
        setModeProcessing(false);
      }
    },
    [
      modeProcessing,
      disconnectSession,
      buildLocalDesignatedShelters,
      currentUserId,
      profileName,
      bootstrapSession,
      getShelterByShareCode,
      createMultiplayerSession,
      toast,
    ],
  );

  const handleJoinGameRequest = () => {
    if (gameState !== "onboarding") {
      return;
    }
    if (profileName.trim()) {
      setJoinError(null);
      setJoinCodeScreenOpen(true);
    } else {
      setJoinNameModalOpen(true);
    }
  };

  const handleHostGame = () => {
    if (gameState !== "onboarding") {
      return;
    }
    setJoinCodeScreenOpen(false);
    setJoinError(null);
    setHostSetupModalOpen(true);
  };

  const handlePlaySolo = () => {
    void disconnectSession();
    resetGameContext();
    setGameState("mode-select");
    setJoinCodeScreenOpen(false);
    setJoinError(null);
  };

  const handleJoinSessionSubmit = async (code: string) => {
    if (joinSubmitting) return;
    const sanitized = code.trim().toUpperCase();
    if (!sanitized) {
      setJoinError(t("app.errors.invalidCode", { fallback: "Enter a valid shelter code." }));
      return;
    }
    setJoinSubmitting(true);
    setJoinError(null);
    await disconnectSession();
    try {
      const displayName = profileName.trim() || defaultNavigatorName;
      const response = await joinMultiplayerSession({
        shelterCode: sanitized,
        userId: currentUserId,
        displayName,
      });
      const role: SessionRole =
        response.session.host_id === response.player.user_id ? "host" : "player";
      await bootstrapSession(response, role);
      toast.success(
        t("app.toasts.joinedGame", {
          replacements: { code: response.session.shelter_code },
          fallback: `Joined game ${response.session.shelter_code}`,
        }),
      );
      setJoinCodeScreenOpen(false);
      setJoinError(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("app.errors.joinSession", { fallback: "Unable to join session" });
      setJoinError(message);
    } finally {
      setJoinSubmitting(false);
    }
  };

  const handleJoinNameSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error(
        t("app.errors.callsignRequired", { fallback: "Callsign cannot be empty." }),
      );
      return;
    }
    setProfileName(trimmed);
    setJoinNameModalOpen(false);
    setJoinError(null);
    setJoinCodeScreenOpen(true);
  };

  const handleHostSetupSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error(
        t("app.errors.callsignRequired", { fallback: "Callsign cannot be empty." }),
      );
      return;
    }
    setProfileName(trimmed);
    setHostSetupModalOpen(false);
    void startHostFlow(trimmed);
  };

  const startSoloMatch = ({
    mode,
    timerSeconds,
    secret,
    options,
    playerCoords,
    lockSecret,
    lockOptions,
    lightningRadiusKm: startLightningRadiusKm = null,
    lightningCenter: startLightningCenter = null,
  }: {
    mode: GameMode;
    timerSeconds: number | null;
    secret: { id: string; name: string } | null;
    options: { id: string; name: string }[];
    playerCoords?: { lat: number; lng: number };
    lockSecret: boolean;
    lockOptions: boolean;
    lightningRadiusKm?: number | null;
    lightningCenter?: { lat: number; lng: number } | null;
  }) => {
    void disconnectSession();
    setResumeId(crypto.randomUUID());
    const soloPlayer: Player = {
      id: currentUserId,
      name: profileName.trim() || defaultSoloName,
      ready: true,
    };
    setPlayers([soloPlayer]);
    setGameCode("SOLO");
    setIsHost(true);
    setWrongGuessCount(0);
    setIsTimerCritical(false);
    setGameMode(mode);

    if (typeof timerSeconds === "number" && timerSeconds > 0) {
      setTimerState(timerSeconds, true);
    } else {
      setTimerState(0, false);
    }

    setLockSecretShelter(lockSecret);
    setLockShelterOptions(lockOptions);

    if (lockSecret && secret) {
      setSecretShelter(secret);
    } else {
      setSecretShelter(null);
    }

    if (lockOptions) {
      setShelterOptions(options);
    } else {
      setShelterOptions([]);
    }

    if (mode === "lightning" && playerCoords) {
      setLightningCenter(startLightningCenter ?? playerCoords);
      setLightningRadiusKm(
        typeof startLightningRadiusKm === "number" ? startLightningRadiusKm : LIGHTNING_RADIUS_KM,
      );
    } else {
      setLightningCenter(null);
      setLightningRadiusKm(null);
    }

    if (playerCoords) {
      setPlayerLocation(playerCoords);
    }

    setGameState("playing");
    toast.success(
      mode === "lightning"
        ? t("app.toasts.lightningReady", {
            fallback: "Lightning hunt ready! Stay sharp.",
          })
        : t("app.toasts.citywideReady", {
            fallback: "Citywide mode active! Explore at your pace.",
          }),
    );
  };

  const handleToggleReady = () => {
    if (sessionContext) {
      const currentPlayer = players.find(
        (player) => player.id === sessionContext.userId,
      );
      const nextReady = !currentPlayer?.ready;
      toggleReadyState(sessionContext.sessionId, sessionContext.token, nextReady)
        .catch((error) => {
          console.warn("[Multiplayer] Failed to toggle ready:", error);
          toast.error(
            t("app.errors.readyStatus", { fallback: "Unable to update ready status." }),
          );
        });
      return;
    }

    setPlayers(
      players.map((p) =>
        p.id === currentUserId ? { ...p, ready: !p.ready } : p,
      ),
    );
  };

  const handleStartGame = () => {
    if (sessionContext) {
      startMultiplayerRace(sessionContext.sessionId, sessionContext.token).catch(
        (error) => {
          console.warn("[Multiplayer] Failed to start race:", error);
          toast.error(
            t("app.errors.startRace", { fallback: "Unable to start race. Try again." }),
          );
        },
      );
      return;
    }

    setResumeId(crypto.randomUUID());
    setTimerState(1800, true);
    setIsTimerCritical(false);
    setShelterOptions([]);
    setSecretShelter(null);
    setWrongGuessCount(0);
    setGameState("playing");
    toast.success(
      t("app.toasts.gameStarted", {
        fallback: "Game started! Find the secret shelter!",
      }),
    );
  };

  const handleLeaveGame = () => {
    performSessionReset();
  };

  const handleWrongGuessPenalty = (): WrongGuessStage => {
    const next = Math.min(wrongGuessCount + 1, 3);
    setWrongGuessCount(next);

    if (next === 1) {
      setTimerState(600, true);
      setIsTimerCritical(true);
      return "first";
    }

    if (next === 2) {
      setTimerState(300, true);
      setIsTimerCritical(true);
      return "second";
    }

    return "third";
  };

  const handleEndGame = () => {
    if (sessionContext) {
      void disconnectSession({ finish: sessionContext.role === "host" });
    }
    setRemoteOutcome(null);
    handleLeaveGame();
  };

  const handleMultiplayerWin = useCallback(
    (info: { winnerName: string; winnerUserId?: string }) => {
      if (!sessionContext) {
        console.log("[Multiplayer] handleMultiplayerWin ignored, no session", { info, sessionContext });
        return;
      }

      const winnerUserId = info.winnerUserId ?? sessionContext.userId;
      console.log("[Multiplayer] Finishing race for winner", {
        sessionId: sessionContext.sessionId,
        winnerUserId,
        winnerDisplayName: info.winnerName,
      });

      finishMultiplayerRace(sessionContext.sessionId, sessionContext.token, {
        winnerUserId,
        winnerDisplayName: info.winnerName,
      }).catch((error) => {
        console.warn("[Multiplayer] Failed to finish race:", error);
      });
    },
    [sessionContext],
  );

  const handleModeBack = () => {
    resetGameContext();
    setGameState("onboarding");
  };

  const handleSelectLightning = async () => {
    if (modeProcessing) return;
    setModeProcessing(true);
    setShelterOptions([]);
    setSecretShelter(null);

    const radiusKm = Number.isFinite(LIGHTNING_RADIUS_KM)
      ? Math.max(0.1, LIGHTNING_RADIUS_KM)
      : 2;
    const durationMinutes = Number.isFinite(LIGHTNING_DURATION_MINUTES)
      ? Math.max(1, LIGHTNING_DURATION_MINUTES)
      : 60;

    try {
      const coords = await requestUserLocation();
      const shelterPool = await loadDesignatedShelters(coords, radiusKm);

      const { eligibleShelters, secretShelter } = selectLightningShelter(
        shelterPool,
        coords,
        radiusKm,
      );

      const options = eligibleShelters.map((shelter) => ({
        id: shelter.id,
        name: shelter.name,
      }));

      const shelterNames = eligibleShelters.map((shelter) => shelter.name);
      console.log({
        message: "[Lightning] Eligible designated shelters",
        source: "mapbox.designated-ec",
        radiusKm,
        shelters: shelterNames,
      });

      const secret = {
        id: secretShelter.id,
        name: secretShelter.name,
      };

      startSoloMatch({
        mode: "lightning",
        timerSeconds: durationMinutes * 60,
        secret,
        options,
        playerCoords: coords,
        lockSecret: true,
        lockOptions: true,
        lightningRadiusKm: radiusKm,
        lightningCenter: coords,
      });
      setLockSecretShelter(true);
      setLockShelterOptions(true);
    } catch (error: unknown) {
      if (error instanceof Error && /No shelters/.test(error.message)) {
        toast.error(
          t("app.errors.noSheltersNearby", {
            replacements: { radius: radiusKm },
            fallback: `No shelters within ${radiusKm} km. Try moving closer to another area.`,
          }),
        );
        return;
      }

      if (error instanceof Error && /tilequery/i.test(error.message)) {
        toast.error(
          t("app.errors.loadShelters", {
            fallback: "Unable to load designated shelters right now. Please try again.",
          }),
        );
        return;
      }

      let message = t("app.errors.locationAccess", {
        fallback: "Unable to access your location. Please try again.",
      });

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as GeolocationPositionError).code === "number"
      ) {
        const geoError = error as GeolocationPositionError;
        if (geoError.code === geoError.PERMISSION_DENIED) {
          message =
            t("app.errors.locationDenied", {
              fallback: "Location permission denied. Allow access to start a lightning hunt.",
            });
        } else {
          message = t("app.errors.locationUnknown", {
            fallback: "Unable to determine location. Please try again.",
          });
        }
      }

      toast.error(message);
    } finally {
      setModeProcessing(false);
    }
  };

  const handleSelectCitywide = async () => {
    if (modeProcessing) return;
    setModeProcessing(true);
    setShelterOptions([]);
    setSecretShelter(null);
    setLockSecretShelter(false);
    setLockShelterOptions(false);
    let playerCoords: { lat: number; lng: number } | undefined;
    try {
      playerCoords = await requestUserLocation();
    } catch (error) {
      console.warn("[Citywide] Unable to fetch player location", error);
    }
    startSoloMatch({
      mode: "citywide",
      timerSeconds: null,
      secret: null,
      options: [],
      lockSecret: false,
      lockOptions: false,
      playerCoords,
    });
    setModeProcessing(false);
  };

  const currentPlayer = players.find((p) => p.id === currentUserId);

  const profilePromptActive =
    gameState === "onboarding" &&
    (joinNameModalOpen || hostSetupModalOpen || joinCodeScreenOpen);

  const showLoadingOverlay = modeProcessing || sessionBootstrapLoading;
  const loadingTitle = sessionBootstrapLoading
    ? t("app.processing.connecting", {
        fallback: "Connecting to your lobby…",
      })
    : t("app.processing.title", {
        fallback: "Preparing multiplayer session…",
      });
  const loadingSubtitle = sessionBootstrapLoading
    ? t("app.processing.connectingSubtitle", {
        fallback: "Setting up your waiting room and pulling players in",
      })
    : t("app.processing.subtitle", {
        fallback: "Checking your location & locking a nearby shelter",
      });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {gameState !== "playing" && <LanguageToggle />}
      {/* Main Content */}
      <div className="relative z-10">
        {gameState === "intro" && <IntroScreen onContinue={handleSkipIntro} />}

        {gameState === "onboarding" && !profilePromptActive && !showLoadingOverlay && (
          <OnboardingScreen
            onJoinGame={handleJoinGameRequest}
            onHostGame={handleHostGame}
            onPlaySolo={handlePlaySolo}
            onShowHelp={() => setShowHelp(true)}
          />
        )}

        {gameState === "mode-select" && (
          <SoloModeScreen
            isProcessing={modeProcessing}
            onBack={handleModeBack}
            onSelectLightning={handleSelectLightning}
            onSelectCitywide={handleSelectCitywide}
          />
        )}

        {gameState === "waiting" && (
          <WaitingRoom
            gameCode={gameCode}
            players={players}
            isHost={isHost}
            currentUserId={currentUserId}
             hostId={sessionHostId}
            onToggleReady={handleToggleReady}
            onStartGame={handleStartGame}
            onLeaveGame={handleLeaveGame}
          />
        )}

        {gameState === "playing" && (
          <GameScreen
            pois={designatedShelters}
            questionAttributes={questionAttributes}
            shelters={shelters}
            playerLocation={playerLocation}
            timeRemaining={timeRemaining}
            secretShelter={secretShelter}
            shelterOptions={shelterOptions}
            isTimerCritical={isTimerCritical}
            isTimerEnabled={timerEnabled}
            onApplyPenalty={handleWrongGuessPenalty}
            onEndGame={handleEndGame}
            onLocationChange={setPlayerLocation}
            onSecretShelterChange={updateSecretShelter}
            onShelterOptionsChange={updateShelterOptions}
            currentPlayerName={currentPlayerDisplayName}
            currentPlayerId={currentSessionUserId}
            onMultiplayerWin={sessionContext ? handleMultiplayerWin : undefined}
            remoteOutcome={remoteOutcome}
            gameMode={gameMode}
            lightningCenter={lightningCenter}
            lightningRadiusKm={lightningRadiusKm ?? undefined}
            resumeId={resumeId}
          />
        )}

        {gameState === "ended" && (
          <TerminalScreen onRestart={handleLeaveGame} />
        )}
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Toast Notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          className: "rounded border-4 border-black bg-red-500 text-white shadow-lg",
          style: { background: "#ef4444", border: "4px solid #000", color: "#fff" },
        }}
      />

      {gameState === "onboarding" && (
        <>
          <ProfileNameModal
            open={joinNameModalOpen}
            initialValue={profileName}
            title={t("profile.setCallsignTitle")}
            subtitle={t("profile.setCallsignSubtitle")}
            placeholder={t("profile.callsignPlaceholder")}
            submitLabel={t("profile.submitContinue")}
            variant="screen"
            onSubmit={handleJoinNameSubmit}
            onClose={() => setJoinNameModalOpen(false)}
          />

          <ProfileNameModal
            open={hostSetupModalOpen}
            initialValue={profileName}
            title={t("profile.createSessionTitle")}
            subtitle={t("profile.createSessionSubtitle")}
            placeholder={t("profile.callsignPlaceholder")}
            submitLabel={t("profile.submitStart")}
            variant="screen"
            onSubmit={handleHostSetupSubmit}
            onClose={() => setHostSetupModalOpen(false)}
          />

          <ProfileNameModal
            open={joinCodeScreenOpen}
            initialValue=""
            title={t("profile.joinGameTitle")}
            subtitle={t("profile.joinGameSubtitle")}
            placeholder={t("profile.codePlaceholder")}
            submitLabel={
              joinSubmitting
                ? t("profile.joining")
                : t("profile.submitJoin")
            }
            label={t("profile.codeLabel")}
            variant="screen"
            submitting={joinSubmitting}
            error={joinError}
            onSubmit={handleJoinSessionSubmit}
            onClose={() => {
              if (joinSubmitting) return;
              setJoinCodeScreenOpen(false);
              setJoinError(null);
            }}
          />
        </>
      )}

      <HostShareModal
        open={hostShareModalOpen && Boolean(hostShareCode)}
        code={hostShareCode}
        onClose={() => setHostShareModalOpen(false)}
      />

      {showLoadingOverlay && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 text-black">
          <div className="w-full max-w-[320px] text-center px-6 py-8 rounded-2xl border-4 border-black bg-white shadow-[8px_8px_0_#000]">
            <div className="mb-4 flex justify-center">
              <img
                src={loadingCat}
                alt={t("app.processing.loadingCatAlt", {
                  fallback: "Cat animation showing the game is loading",
                })}
                className="h-28 w-28 object-contain"
              />
            </div>
            <div className="mb-4 flex items-center justify-center gap-3 text-lg font-black uppercase tracking-[0.3em]">
              <Clock className="h-5 w-5" />
              {loadingTitle}
            </div>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-4 w-4 animate-bounce rounded-full bg-white"
                  style={{ animationDelay: `${index * 0.15}s` }}
                />
              ))}
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-neutral-300">
              {loadingSubtitle}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
