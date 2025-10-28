import { motion } from 'motion/react';
import { User, Check, X, Copy, Crown } from 'lucide-react';
import { Button } from './ui/button';
import { Player } from '../data/mockData';
import { useState } from 'react';

interface WaitingRoomProps {
  gameCode: string;
  players: Player[];
  isHost: boolean;
  currentUserId: string;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveGame: () => void;
}

export function WaitingRoom({
  gameCode,
  players,
  isHost,
  currentUserId,
  onToggleReady,
  onStartGame,
  onLeaveGame
}: WaitingRoomProps) {
  const currentPlayer = players.find(p => p.id === currentUserId);
  const redTeam = players.filter(p => p.team === 'red');
  const blueTeam = players.filter(p => p.team === 'blue');
  const allReady = players.every(p => p.ready);
  const [copied, setCopied] = useState(false);

  const copyGameCode = async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback: Create a temporary input element
      const input = document.createElement('input');
      input.value = gameCode;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-2xl space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.h1
            className="text-4xl gradient-text"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            Waiting Room
          </motion.h1>

          {/* Game Code */}
          <motion.div
            className="glass-card rounded-2xl p-4 inline-block"
            whileHover={{ scale: 1.05 }}
          >
            <div className="text-sm text-white/60 mb-1">Game Code</div>
            <div className="flex items-center gap-3">
              <div className="text-3xl tracking-widest text-white">
                {gameCode}
              </div>
              <Button
                onClick={copyGameCode}
                size="sm"
                className={`glass border-white/30 text-white hover:bg-white/20 transition-all ${
                  copied ? 'bg-green-500/20 border-green-400/50' : ''
                }`}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Red Team */}
          <motion.div
            className="glass-card rounded-2xl p-6 space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 rounded-full bg-red-400" />
              <h3 className="text-xl text-white">Red Team</h3>
            </div>
            <div className="space-y-2">
              {redTeam.map((player, index) => (
                <motion.div
                  key={player.id}
                  className="glass rounded-xl p-3 flex items-center justify-between"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{player.avatar}</div>
                    <div>
                      <div className="text-white flex items-center gap-2">
                        {player.name}
                        {isHost && player.id === currentUserId && (
                          <Crown className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <div className="text-xs text-white/60">
                        {player.id === currentUserId ? 'You' : 'Player'}
                      </div>
                    </div>
                  </div>
                  {player.ready ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <X className="w-5 h-5 text-white/30" />
                  )}
                </motion.div>
              ))}
              {redTeam.length === 0 && (
                <div className="text-center text-white/40 py-4">Waiting for players...</div>
              )}
            </div>
          </motion.div>

          {/* Blue Team */}
          <motion.div
            className="glass-card rounded-2xl p-6 space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 rounded-full bg-blue-400" />
              <h3 className="text-xl text-white">Blue Team</h3>
            </div>
            <div className="space-y-2">
              {blueTeam.map((player, index) => (
                <motion.div
                  key={player.id}
                  className="glass rounded-xl p-3 flex items-center justify-between"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{player.avatar}</div>
                    <div>
                      <div className="text-white flex items-center gap-2">
                        {player.name}
                        {isHost && player.id === currentUserId && (
                          <Crown className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <div className="text-xs text-white/60">
                        {player.id === currentUserId ? 'You' : 'Player'}
                      </div>
                    </div>
                  </div>
                  {player.ready ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <X className="w-5 h-5 text-white/30" />
                  )}
                </motion.div>
              ))}
              {blueTeam.length === 0 && (
                <div className="text-center text-white/40 py-4">Waiting for players...</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {isHost ? (
            <Button
              onClick={onStartGame}
              disabled={!allReady || players.length < 1}
              className="w-full glass-strong border-white/30 text-white py-6 text-lg rounded-2xl shadow-glow hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {allReady && players.length >= 1 ? 'Start Game' : 'Waiting for players to be ready...'}
            </Button>
          ) : (
            <Button
              onClick={onToggleReady}
              className={`w-full py-6 text-lg rounded-2xl transition-all ${
                currentPlayer?.ready
                  ? 'glass-strong border-green-400/50 text-white shadow-glow-green'
                  : 'glass border-white/30 text-white hover:bg-white/20'
              }`}
            >
              {currentPlayer?.ready ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Ready!
                </>
              ) : (
                'Mark as Ready'
              )}
            </Button>
          )}

          <Button
            onClick={onLeaveGame}
            variant="outline"
            className="w-full glass border-white/30 text-white/90 hover:text-white py-4 rounded-2xl hover:bg-white/10"
          >
            Leave Game
          </Button>
        </motion.div>

        {/* Player Count */}
        <motion.div
          className="text-center text-white/60 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <User className="w-4 h-4 inline mr-1" />
          {players.length} player{players.length !== 1 ? 's' : ''} in lobby
        </motion.div>
      </motion.div>
    </div>
  );
}
