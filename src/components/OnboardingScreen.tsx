import { motion } from 'motion/react';
import { MapPin, Users, Info, Play, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState } from 'react';

interface OnboardingScreenProps {
  onJoinGame: (code: string) => void;
  onHostGame: () => void;
  onPlaySolo: () => void;
  onShowHelp: () => void;
}

export function OnboardingScreen({ onJoinGame, onHostGame, onPlaySolo, onShowHelp }: OnboardingScreenProps) {
  const [gameCode, setGameCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  const handleJoin = () => {
    if (gameCode.trim()) {
      onJoinGame(gameCode.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo and Title */}
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.div
            className="inline-block glass-strong rounded-3xl p-6 shadow-glow"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <MapPin className="w-16 h-16 text-white" />
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-5xl gradient-text text-glow">
              Secret Shelter
            </h1>
            <p className="text-white/80 text-lg">
              Find the secret shelter before the storm!
            </p>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {/* Join Game Section */}
          {!showJoinInput ? (
            <Button
              onClick={() => setShowJoinInput(true)}
              className="w-full glass-strong hover:glass border-white/30 text-white py-6 text-lg rounded-2xl shadow-glow transition-all hover:scale-105"
            >
              <Users className="w-5 h-5 mr-2" />
              Join Game
            </Button>
          ) : (
            <motion.div
              className="glass-card rounded-2xl p-4 space-y-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Input
                type="text"
                placeholder="Enter game code..."
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                className="glass border-white/30 text-white placeholder:text-white/50 text-center text-lg tracking-wider"
                maxLength={6}
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowJoinInput(false)}
                  variant="outline"
                  className="flex-1 glass border-white/30 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleJoin}
                  disabled={!gameCode.trim()}
                  className="flex-1 glass-strong border-white/30 text-white hover:bg-white/20 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Join
                </Button>
              </div>
            </motion.div>
          )}

          {/* Play Solo Button */}
          <Button
            onClick={onPlaySolo}
            className="w-full glass-strong hover:glass border-white/30 text-white py-6 text-lg rounded-2xl shadow-glow transition-all hover:scale-105"
          >
            <User className="w-5 h-5 mr-2" />
            Play Solo
          </Button>

          {/* Host Game Button */}
          <Button
            onClick={onHostGame}
            className="w-full glass-strong hover:glass border-white/30 text-white py-6 text-lg rounded-2xl shadow-glow transition-all hover:scale-105"
          >
            <Users className="w-5 h-5 mr-2" />
            Host Multiplayer
          </Button>

          {/* How to Play Button */}
          <Button
            onClick={onShowHelp}
            variant="outline"
            className="w-full glass border-white/30 text-white/90 hover:text-white py-4 rounded-2xl hover:bg-white/10"
          >
            <Info className="w-5 h-5 mr-2" />
            How to Play
          </Button>
        </motion.div>

        {/* Feature Pills */}
        <motion.div
          className="flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {['Location-Based', 'Trivia Challenge', 'Team Competition'].map((feature, index) => (
            <motion.div
              key={feature}
              className="glass-card px-4 py-2 rounded-full text-sm text-white/80"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.1, type: 'spring' }}
            >
              {feature}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
