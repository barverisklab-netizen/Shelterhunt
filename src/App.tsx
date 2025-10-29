import { useState, useEffect } from 'react';
import { OnboardingScreen } from './components/OnboardingScreen';
import { WaitingRoom } from './components/WaitingRoom';
import { GameScreen } from './components/GameScreen';
import { HelpModal } from './components/HelpModal';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import {
  mockPOIs,
  mockQuestions,
  mockTriviaQuestions,
  mockPlayers,
  SECRET_SHELTER_ID,
  Player
} from './data/mockData';
import { defaultCityContext } from './data/cityContext';

type GameState = 'onboarding' | 'waiting' | 'playing' | 'ended';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('onboarding');
  const [gameCode, setGameCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Player[]>(mockPlayers);
  const [currentUserId] = useState('p1'); // Simulated user
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes
  const [showHelp, setShowHelp] = useState(false);
  const [playerLocation, setPlayerLocation] = useState({
    lat: defaultCityContext.mapConfig.startLocation.lat,
    lng: defaultCityContext.mapConfig.startLocation.lng
  });

  // Timer countdown
  useEffect(() => {
    if (gameState === 'playing' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setGameState('ended');
            toast.error('Time\'s up! Game over.');
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
    setGameState('waiting');
    toast.success(`Joined game ${code}`);
  };

  const handleHostGame = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGameCode(code);
    setIsHost(true);
    setGameState('waiting');
    toast.success(`Game created: ${code}`);
  };

  const handlePlaySolo = () => {
    // Create a single player game
    const soloPlayer: Player = {
      id: 'p1',
      name: 'Solo Player',
      team: 'red',
      avatar: '🎯',
      ready: true
    };
    setPlayers([soloPlayer]);
    setGameCode('SOLO');
    setIsHost(true);
    setGameState('playing');
    toast.success('Solo game started! Find the secret shelter!');
  };

  const handleToggleReady = () => {
    setPlayers(
      players.map((p) =>
        p.id === currentUserId ? { ...p, ready: !p.ready } : p
      )
    );
  };

  const handleStartGame = () => {
    setGameState('playing');
    toast.success('Game started! Find the secret shelter!');
  };

  const handleLeaveGame = () => {
    setGameState('onboarding');
    setGameCode('');
    setPlayers(mockPlayers);
    setTimeRemaining(1800);
    toast.info('Left the game');
  };

  const handleGuessSubmit = (poiId: string) => {
    if (poiId === SECRET_SHELTER_ID) {
      toast.success('🎉 Correct! You found the secret shelter!');
    } else {
      toast.error('Wrong shelter! Keep searching...');
    }
  };

  const handleEndGame = () => {
    handleLeaveGame();
  };

  const currentPlayer = players.find((p) => p.id === currentUserId);
  const teamColor = currentPlayer?.team || 'red';

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Main Content */}
      <div className="relative z-10">
        {gameState === 'onboarding' && (
          <OnboardingScreen
            onJoinGame={handleJoinGame}
            onHostGame={handleHostGame}
            onPlaySolo={handlePlaySolo}
            onShowHelp={() => setShowHelp(true)}
          />
        )}

        {gameState === 'waiting' && (
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

        {gameState === 'playing' && (
          <GameScreen
            pois={mockPOIs}
            questions={mockQuestions}
            triviaQuestions={mockTriviaQuestions}
            playerLocation={playerLocation}
            teamColor={teamColor}
            timeRemaining={timeRemaining}
            secretShelterId={SECRET_SHELTER_ID}
            onGuessSubmit={handleGuessSubmit}
            onEndGame={handleEndGame}
            onLocationChange={setPlayerLocation}
          />
        )}
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Toast Notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'bauhaus-card bauhaus-border',
          style: {
            background: 'white',
            border: '3px solid black',
            color: 'black',
          },
        }}
      />
    </div>
  );
}
