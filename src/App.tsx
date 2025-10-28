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

type GameState = 'onboarding' | 'waiting' | 'playing' | 'ended';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('onboarding');
  const [gameCode, setGameCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Player[]>(mockPlayers);
  const [currentUserId] = useState('p1'); // Simulated user
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes
  const [showHelp, setShowHelp] = useState(false);
  const [playerLocation, setPlayerLocation] = useState({ lat: 42.370, lng: -71.033 });

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
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

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
          />
        )}
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Toast Notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'glass-strong border-white/30',
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
          },
        }}
      />
    </div>
  );
}
