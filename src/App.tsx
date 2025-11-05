import { useState, useEffect, useCallback } from "react";
import { IntroScreen } from "./components/IntroScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { SoloModeScreen } from "./components/SoloModeScreen";
import { WaitingRoom } from "./components/WaitingRoom";
import { GameScreen, type WrongGuessStage } from "./components/GameScreen";
import { HelpModal } from "./components/HelpModal";
import { TerminalScreen } from "./components/TerminalScreen";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner@2.0.3";
import {
  mockPOIs,
  mockQuestions,
  mockTriviaQuestions,
  mockPlayers,
  Player,
} from "./data/mockData";
import { defaultCityContext } from "./data/cityContext";
import {
  LIGHTNING_DURATION_MINUTES,
  LIGHTNING_RADIUS_KM,
} from "./config/runtime";

type GameState =
  | "intro"
  | "onboarding"
  | "mode-select"
  | "waiting"
  | "playing"
  | "ended";

type GameMode = "lightning" | "citywide";

export default function App() {
  const [gameState, setGameState] = useState<GameState>("intro");
  const [gameCode, setGameCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Player[]>(mockPlayers);
  const [currentUserId] = useState("p1"); // Simulated user
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

  const handleJoinGame = (code: string) => {
    setGameCode(code);
    setIsHost(false);
    resetGameContext();
    setGameState("waiting");
    toast.success(`Joined game ${code}`);
  };

  const handleSkipIntro = () => {
    setGameState("onboarding");
  };

  const handleHostGame = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGameCode(code);
    setIsHost(true);
    resetGameContext();
    setGameState("waiting");
    toast.success(`Game created: ${code}`);
  };

  const handlePlaySolo = () => {
    resetGameContext();
    setGameState("mode-select");
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
    const soloPlayer: Player = {
      id: "p1",
      name: "Solo Player",
      team: "red",
      avatar: "🎯",
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
    setPlayers(
      players.map((p) =>
        p.id === currentUserId ? { ...p, ready: !p.ready } : p,
      ),
    );
  };

  const handleStartGame = () => {
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
    setGameState("onboarding");
    setGameCode("");
    setPlayers(mockPlayers);
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
    handleLeaveGame();
  };

  const handleModeBack = () => {
    resetGameContext();
    setGameState("onboarding");
  };

  const getDistanceKm = (
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const hav =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) *
        Math.sin(dLng / 2) *
        Math.cos(lat1) *
        Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
    return R * c;
  };

  const requestUserLocation = () =>
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
    });

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
      const eligibleShelters = mockPOIs
        .filter((poi) => poi.type === "shelter")
        .filter((shelter) => {
          const distance = getDistanceKm(coords, {
            lat: shelter.lat,
            lng: shelter.lng,
          });
          return distance <= radiusKm;
        })
        .map((shelter) => ({
          id: shelter.id,
          name: shelter.name,
        }));

      if (!eligibleShelters.length) {
        toast.error(
          `No shelters within ${radiusKm} km. Try moving closer to another area.`,
        );
        return;
      }

      const secret =
        eligibleShelters[Math.floor(Math.random() * eligibleShelters.length)];

      startSoloMatch({
        mode: "lightning",
        timerSeconds: durationMinutes * 60,
        secret,
        options: eligibleShelters,
        playerCoords: coords,
        lockSecret: true,
        lockOptions: true,
      });
      setLockSecretShelter(true);
      setLockShelterOptions(true);
    } catch (error: unknown) {
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
  const teamColor = currentPlayer?.team || "red";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Main Content */}
      <div className="relative z-10">
        {gameState === "intro" && <IntroScreen onContinue={handleSkipIntro} />}

        {gameState === "onboarding" && (
          <OnboardingScreen
            onJoinGame={handleJoinGame}
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
            onToggleReady={handleToggleReady}
            onStartGame={handleStartGame}
            onLeaveGame={handleLeaveGame}
          />
        )}

        {gameState === "playing" && (
          <GameScreen
            pois={mockPOIs}
            questions={mockQuestions}
            triviaQuestions={mockTriviaQuestions}
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
    </div>
  );
}
