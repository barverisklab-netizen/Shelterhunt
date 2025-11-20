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
import type { Player, POI } from "@/types/game";
import {
  defaultPlayers,
  defaultQuestions,
  defaultTriviaQuestions,
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
  startMultiplayerRace,
  toggleReadyState,
  type Player as SessionPlayer,
  type SessionResponse,
} from "./services/multiplayerSessionService";
import { ProfileNameModal } from "./components/ProfileNameModal";
import { HostShareModal } from "./components/HostShareModal";
import {
  getShelterByShareCode,
  type Shelter,
} from "./services/shelterDataService";

type GameState =
  | "intro"
  | "onboarding"
  | "mode-select"
  | "waiting"
  | "playing"
  | "ended";

type GameMode = "lightning" | "citywide";

const INITIAL_SHELTER_RADIUS_KM = 5;
const DESIGNATED_CATEGORY = "designated ec";
const MULTIPLAYER_RADIUS_KM = 2;
const MULTIPLAYER_DURATION_MINUTES = 60;

type SessionRole = "host" | "player";

interface MultiplayerSessionContext {
  sessionId: string;
  token: string;
  playerId: string;
  userId: string;
  role: SessionRole;
  shelterCode: string;
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
  radiusKm: number,
): Promise<POI[]> => {
  const normalizedRadius = Math.max(0, radiusKm);
  const origin = { lat: center.lat, lng: center.lng };
  const shelters = await getLocalShelters();
  console.log("[Multiplayer] Filtering shelters", {
    total: shelters.length,
    center,
    radiusKm: normalizedRadius,
  });
  return shelters
    .filter(
      (poi) =>
        poi.category?.toLowerCase() === DESIGNATED_CATEGORY &&
        Number.isFinite(poi.lat) &&
        Number.isFinite(poi.lng),
    )
    .filter(
      (poi) =>
        haversineDistanceKm(origin, { lat: poi.lat, lng: poi.lng }) <=
        normalizedRadius,
    )
    .map<POI>((poi) => ({
      id: poi.id,
      name: poi.name,
      lat: poi.lat,
      lng: poi.lng,
      type: "shelter",
    }));
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>("intro");
  const [gameCode, setGameCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Player[]>(defaultPlayers);
  const [currentUserId] = useState(() => crypto.randomUUID());
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
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [modeProcessing, setModeProcessing] = useState(false);
  const [lockSecretShelter, setLockSecretShelter] = useState(false);
  const [lockShelterOptions, setLockShelterOptions] = useState(false);
  const [designatedShelters, setDesignatedShelters] = useState<POI[]>([]);
  const [sessionContext, setSessionContext] = useState<MultiplayerSessionContext | null>(null);
  const sessionSocketRef = useRef<WebSocket | null>(null);
  const [sessionHostId, setSessionHostId] = useState<string | null>(null);
  const [currentShelter, setCurrentShelter] = useState<Shelter | null>(null);
  const [joinCodeScreenOpen, setJoinCodeScreenOpen] = useState(false);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Timer countdown
  useEffect(() => {
    if (!timerEnabled || gameState !== "playing") {
      return;
    }

    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setGameState("ended");
            setSecretShelter(null);
            setShelterOptions([]);
            setIsTimerCritical(false);
            setTimerEnabled(false);
            toast.error("Time's up! Game over.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, timeRemaining, timerEnabled]);

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
    const initialCenter = defaultCityContext.mapConfig.startLocation;
    loadDesignatedShelters(initialCenter, INITIAL_SHELTER_RADIUS_KM).catch(
      (error) => {
        console.warn(
          "[Lightning] Initial designated shelter preload failed:",
          error,
        );
      },
    );
  }, [loadDesignatedShelters]);

  useEffect(() => {
    return () => {
      if (sessionSocketRef.current) {
        sessionSocketRef.current.close();
      }
    };
  }, []);

  const resetGameContext = () => {
    setTimeRemaining(1800);
    setIsTimerCritical(false);
    setShelterOptions([]);
    setSecretShelter(null);
    setWrongGuessCount(0);
    setTimerEnabled(true);
    setGameMode(null);
    setLockSecretShelter(false);
    setLockShelterOptions(false);
  };

  const refreshSessionPlayers = useCallback(
    async (sessionId: string, token: string) => {
      try {
        const snapshot = await fetchSessionSnapshot(sessionId, token);
        setPlayers(
          mapSessionPlayersToUI(
            snapshot.players,
            snapshot.session.host_id,
          ),
        );
        setSessionHostId(snapshot.session.host_id);
      } catch (error) {
        console.warn("[Multiplayer] Failed to refresh session snapshot:", error);
      }
    },
    [],
  );

  const disconnectSession = useCallback(
    async (options?: { finish?: boolean }) => {
      if (sessionContext && options?.finish && sessionContext.role === "host") {
        try {
          await finishMultiplayerRace(sessionContext.sessionId, sessionContext.token);
        } catch (error) {
          console.warn("[Multiplayer] Failed to finish session:", error);
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
      setTimeRemaining(MULTIPLAYER_DURATION_MINUTES * 60);
      setTimerEnabled(true);
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

    const seedFromCoords = async () => {
      try {
        const coords = await requestUserLocation();
        const nearby = await buildLocalDesignatedShelters(coords, MULTIPLAYER_RADIUS_KM);
        if (!nearby.length) {
          useFallback();
          return;
        }
        const options = nearby.map((shelter) => ({
          id: shelter.id,
          name: shelter.name,
        }));
        finishSetup(options, coords);
      } catch (error) {
        console.warn("[Multiplayer] Unable to seed nearby shelters:", error);
        useFallback();
      }
    };

    if (sessionContext) {
      void seedFromCoords();
    } else {
      useFallback();
    }
  }, [currentShelter, sessionContext, requestUserLocation]);

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
      setTimeRemaining(1800);
      setTimerEnabled(true);
      setIsTimerCritical(false);
      await refreshSessionPlayers(response.session.id, response.token);
      setGameState("waiting");
    },
    [refreshSessionPlayers],
  );

  const handleSessionEvent = useCallback(
    (message: { type?: string }) => {
      if (!sessionContext) return;
      switch (message.type) {
        case "player_joined":
        case "ready_updated":
          refreshSessionPlayers(sessionContext.sessionId, sessionContext.token);
          break;
        case "race_started":
          beginMultiplayerRace();
          break;
        case "race_finished":
          setGameState("ended");
          toast.success("Shelter reached! Race finished.");
          break;
        default:
          break;
      }
    },
    [beginMultiplayerRace, refreshSessionPlayers, sessionContext],
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
  }, [handleSessionEvent, sessionContext]);

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

  const startHostFlow = useCallback(async (overrideName?: string) => {
    if (modeProcessing) return;
    setModeProcessing(true);
    setHostShareModalOpen(false);
    setHostShareCode(null);
    await disconnectSession();
    try {
      const coords = await requestUserLocation();
      console.log("[Multiplayer] Host location acquired", coords);
      const nearby = await buildLocalDesignatedShelters(
        coords,
        MULTIPLAYER_RADIUS_KM,
      );
      console.log("[Multiplayer] Nearby shelters", {
        count: nearby.length,
        radiusKm: MULTIPLAYER_RADIUS_KM,
      });
      if (!nearby.length) {
        throw new Error(
          `No shelters within ${MULTIPLAYER_RADIUS_KM} km. Move closer to the city.`,
        );
      }
      const { secretShelter } = selectLightningShelter(
        nearby,
        coords,
        MULTIPLAYER_RADIUS_KM,
      );
      console.log("[Multiplayer] Selected shelter candidate", {
        id: secretShelter.id,
        name: secretShelter.name,
      });
      const shareCode = secretShelter.id;
      const resolved = await getShelterByShareCode(shareCode);
      if (!resolved) {
        throw new Error("Selected shelter is unavailable. Try again.");
      }
      const displayName =
        overrideName?.trim() || profileName.trim() || "Navigator";
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
      setPlayerLocation(coords);
      setHostShareCode(response.session.shelter_code);
      setHostShareModalOpen(true);
    } catch (error) {
      console.error("[Multiplayer] Host flow failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to start multiplayer session",
      );
    } finally {
      setModeProcessing(false);
    }
  }, [
    modeProcessing,
    disconnectSession,
    requestUserLocation,
    buildLocalDesignatedShelters,
    currentUserId,
    profileName,
    bootstrapSession,
    getShelterByShareCode,
    createMultiplayerSession,
    toast,
  ]);

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
      setJoinError("Enter a valid shelter code.");
      return;
    }
    setJoinSubmitting(true);
    setJoinError(null);
    await disconnectSession();
    try {
      const displayName = profileName.trim() || "Navigator";
      const response = await joinMultiplayerSession({
        shelterCode: sanitized,
        userId: currentUserId,
        displayName,
      });
      const role: SessionRole =
        response.session.host_id === response.player.user_id ? "host" : "player";
      await bootstrapSession(response, role);
      toast.success(`Joined game ${response.session.shelter_code}`);
      setJoinCodeScreenOpen(false);
      setJoinError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to join session";
      setJoinError(message);
    } finally {
      setJoinSubmitting(false);
    }
  };

  const handleJoinNameSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error("Callsign cannot be empty.");
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
      toast.error("Callsign cannot be empty.");
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
  }: {
    mode: GameMode;
    timerSeconds: number | null;
    secret: { id: string; name: string } | null;
    options: { id: string; name: string }[];
    playerCoords?: { lat: number; lng: number };
    lockSecret: boolean;
    lockOptions: boolean;
  }) => {
    void disconnectSession();
    const soloPlayer: Player = {
      id: currentUserId,
      name: profileName.trim() || "Solo Player",
      ready: true,
    };
    setPlayers([soloPlayer]);
    setGameCode("SOLO");
    setIsHost(true);
    setWrongGuessCount(0);
    setIsTimerCritical(false);
    setGameMode(mode);

    if (typeof timerSeconds === "number" && timerSeconds > 0) {
      setTimeRemaining(timerSeconds);
      setTimerEnabled(true);
    } else {
      setTimeRemaining(0);
      setTimerEnabled(false);
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

    if (playerCoords) {
      setPlayerLocation(playerCoords);
    }

    setGameState("playing");
    toast.success(
      mode === "lightning"
        ? "Lightning hunt ready! Stay sharp."
        : "Citywide mode active! Explore at your pace.",
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
          toast.error("Unable to update ready status.");
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
          toast.error("Unable to start race. Try again.");
        },
      );
      return;
    }

    setTimeRemaining(1800);
    setIsTimerCritical(false);
    setShelterOptions([]);
    setSecretShelter(null);
    setWrongGuessCount(0);
    setTimerEnabled(true);
    setGameState("playing");
    toast.success("Game started! Find the secret shelter!");
  };

  const handleLeaveGame = () => {
    void disconnectSession();
    setGameState("onboarding");
    setGameCode("");
    setPlayers(defaultPlayers);
    setTimeRemaining(1800);
    setShelterOptions([]);
    setIsTimerCritical(false);
    setSecretShelter(null);
    setWrongGuessCount(0);
    setTimerEnabled(true);
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
    toast.info("Left the game");
  };

  const handleWrongGuessPenalty = (): WrongGuessStage => {
    const next = Math.min(wrongGuessCount + 1, 3);
    setWrongGuessCount(next);

    if (next === 1) {
      setTimeRemaining(600);
      setTimerEnabled(true);
      setIsTimerCritical(true);
      return "first";
    }

    if (next === 2) {
      setTimeRemaining(300);
      setTimerEnabled(true);
      setIsTimerCritical(true);
      return "second";
    }

    return "third";
  };

  const handleEndGame = () => {
    if (sessionContext) {
      void disconnectSession({ finish: sessionContext.role === "host" });
    }
    handleLeaveGame();
  };

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
      });
      setLockSecretShelter(true);
      setLockShelterOptions(true);
    } catch (error: unknown) {
      if (error instanceof Error && /No shelters/.test(error.message)) {
        toast.error(
          `No shelters within ${radiusKm} km. Try moving closer to another area.`,
        );
        return;
      }

      if (error instanceof Error && /tilequery/i.test(error.message)) {
        toast.error(
          "Unable to load designated shelters right now. Please try again.",
        );
        return;
      }

      let message = "Unable to access your location. Please try again.";

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as GeolocationPositionError).code === "number"
      ) {
        const geoError = error as GeolocationPositionError;
        if (geoError.code === geoError.PERMISSION_DENIED) {
          message =
            "Location permission denied. Allow access to start a lightning hunt.";
        } else {
          message = "Unable to determine location. Please try again.";
        }
      }

      toast.error(message);
    } finally {
      setModeProcessing(false);
    }
  };

  const handleSelectCitywide = () => {
    if (modeProcessing) return;
    setModeProcessing(true);
    setShelterOptions([]);
    setSecretShelter(null);
    setLockSecretShelter(false);
    setLockShelterOptions(false);
    startSoloMatch({
      mode: "citywide",
      timerSeconds: null,
      secret: null,
      options: [],
      lockSecret: false,
      lockOptions: false,
    });
    setTimerEnabled(false);
    setModeProcessing(false);
  };

  const currentPlayer = players.find((p) => p.id === currentUserId);
  const teamColor: "red" | "blue" = "red";

  const profilePromptActive =
    gameState === "onboarding" &&
    (joinNameModalOpen || hostSetupModalOpen || joinCodeScreenOpen);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Main Content */}
      <div className="relative z-10">
        {gameState === "intro" && <IntroScreen onContinue={handleSkipIntro} />}

        {gameState === "onboarding" && !profilePromptActive && (
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
            questions={defaultQuestions}
            triviaQuestions={defaultTriviaQuestions}
            playerLocation={playerLocation}
            teamColor={teamColor}
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
            title="Set Your Callsign"
            subtitle="Add a display name before joining a multiplayer session."
            placeholder="e.g. Sky Scout"
            submitLabel="Continue"
            variant="screen"
            onSubmit={handleJoinNameSubmit}
            onClose={() => setJoinNameModalOpen(false)}
          />

          <ProfileNameModal
            open={hostSetupModalOpen}
            initialValue={profileName}
            title="Create Multiplayer Session"
            subtitle="Enter a callsign before hosting for your team."
            placeholder="e.g. Sky Scout"
            submitLabel="Start Hosting"
            variant="screen"
            onSubmit={handleHostSetupSubmit}
            onClose={() => setHostSetupModalOpen(false)}
          />

          <ProfileNameModal
            open={joinCodeScreenOpen}
            initialValue=""
            title="Join Multiplayer Game"
            subtitle="Enter the shelter code shared by your host."
            placeholder="e.g. 9F2X"
            submitLabel={joinSubmitting ? "Joining..." : "Join Game"}
            label="Shelter Code"
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

      {modeProcessing && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/80 text-white">
          <div className="mb-4 flex items-center gap-3 text-lg font-black uppercase tracking-[0.3em]">
            Preparing multiplayer session…
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-4 w-4 animate-bounce rounded-full bg-white"
                style={{ animationDelay: `${index * 0.15}s` }}
              />
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-neutral-300">
            Checking your location & locking a nearby shelter
          </p>
        </div>
      )}
    </div>
  );
}
