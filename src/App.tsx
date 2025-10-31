import { useState, useEffect } from "react";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { WaitingRoom } from "./components/WaitingRoom";
import { GameScreen } from "./components/GameScreen";
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

type GameState = "onboarding" | "waiting" | "playing" | "ended";

export default function App() {
  const [gameState, setGameState] = useState<GameState>("onboarding");
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

  // Timer countdown
  useEffect(() => {
    if (gameState === "playing" && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setGameState("ended");
            setSecretShelter(null);
            setShelterOptions([]);
            setIsTimerCritical(false);
            toast.error("Time's up! Game over.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, timeRemaining]);

  const handleJoinGame = (code: string) => {
    setGameCode(code);
    setIsHost(false);
    setTimeRemaining(1800);
    setIsTimerCritical(false);
    setShelterOptions([]);
    setSecretShelter(null);
    setGameState("waiting");
    toast.success(`Joined game ${code}`);
  };

  const handleHostGame = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGameCode(code);
    setIsHost(true);
    setTimeRemaining(1800);
    setIsTimerCritical(false);
    setShelterOptions([]);
    setSecretShelter(null);
    setGameState("waiting");
    toast.success(`Game created: ${code}`);
  };

  const handlePlaySolo = () => {
    // Create a single player game
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
    setTimeRemaining(1800);
    setIsTimerCritical(false);
    setShelterOptions([]);
    setSecretShelter(null);
    setGameState("playing");
    toast.success("Solo game started! Find the secret shelter!");
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
    toast.info("Left the game");
  };

  const handleWrongGuessPenalty = () => {
    setTimeRemaining(600);
    setIsTimerCritical(true);
  };

  const handleEndGame = () => {
    handleLeaveGame();
  };

  const currentPlayer = players.find((p) => p.id === currentUserId);
  const teamColor = currentPlayer?.team || "red";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Main Content */}
      <div className="relative z-10">
        {gameState === "onboarding" && (
          <OnboardingScreen
            onJoinGame={handleJoinGame}
            onHostGame={handleHostGame}
            onPlaySolo={handlePlaySolo}
            onShowHelp={() => setShowHelp(true)}
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
            onApplyPenalty={handleWrongGuessPenalty}
            onEndGame={handleEndGame}
            onLocationChange={setPlayerLocation}
            onSecretShelterChange={setSecretShelter}
            onShelterOptionsChange={setShelterOptions}
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
          className: "rounded border-4 border-black bg-yellow-300 text-black shadow-lg",
          style: { background: '#fde047', border: '4px solid #000', color: '#000' }
        }}
      />
    </div>
  );
}
