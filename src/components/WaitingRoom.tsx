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
            className="text-4xl text-black"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            Waiting Room
          </motion.h1>

          {/* Game Code */}
          <motion.div
            className="bauhaus-white border-4 border-black p-4 inline-block"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-sm text-gray-600 mb-1 font-bold uppercase">Game Code</div>
            <div className="flex items-center gap-3">
              <div className="text-3xl tracking-widest text-black font-bold">
                {gameCode}
              </div>
              <Button
                onClick={copyGameCode}
                size="sm"
                variant={copied ? "outline" : "outline"}
                className={copied ? 'border-red-600 text-red-600' : ''}
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
            className="bauhaus-white border-4 border-black p-6 space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 bg-red-600" />
              <h3 className="text-xl text-black font-bold uppercase">Red Team</h3>
            </div>
            <div className="space-y-2">
              {redTeam.map((player, index) => (
                <motion.div
                  key={player.id}
                  className="bauhaus-white border-3 border-black p-3 flex items-center justify-between"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{player.avatar}</div>
                    <div>
                      <div className="text-black flex items-center gap-2 font-bold">
                        {player.name}
                        {isHost && player.id === currentUserId && (
                          <Crown className="w-4 h-4 text-black" />
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {player.id === currentUserId ? 'You' : 'Player'}
                      </div>
                    </div>
                  </div>
                  {player.ready ? (
                    <Check className="w-5 h-5 text-red-600" />
                  ) : (
                    <X className="w-5 h-5 text-gray-400" />
                  )}
                </motion.div>
              ))}
              {redTeam.length === 0 && (
                <div className="text-center text-gray-600 py-4">Waiting for players...</div>
              )}
            </div>
          </motion.div>

          {/* Blue Team */}
          <motion.div
            className="bauhaus-white border-4 border-black p-6 space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 bauhaus-white" />
              <h3 className="text-xl text-black font-bold uppercase">Blue Team</h3>
            </div>
            <div className="space-y-2">
              {blueTeam.map((player, index) => (
                <motion.div
                  key={player.id}
                  className="bauhaus-white border-3 border-black p-3 flex items-center justify-between"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{player.avatar}</div>
                    <div>
                      <div className="text-black flex items-center gap-2 font-bold">
                        {player.name}
                        {isHost && player.id === currentUserId && (
                          <Crown className="w-4 h-4 text-black" />
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {player.id === currentUserId ? 'You' : 'Player'}
                      </div>
                    </div>
                  </div>
                  {player.ready ? (
                    <Check className="w-5 h-5 text-red-600" />
                  ) : (
                    <X className="w-5 h-5 text-gray-400" />
                  )}
                </motion.div>
              ))}
              {blueTeam.length === 0 && (
                <div className="text-center text-gray-600 py-4">Waiting for players...</div>
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
              variant="destructive"
              size="lg"
              className="w-full"
            >
              {allReady && players.length >= 1 ? 'Start Game' : 'Waiting for players to be ready...'}
            </Button>
          ) : (
            <Button
              onClick={onToggleReady}
              variant={currentPlayer?.ready ? "default" : "outline"}
              size="lg"
              className="w-full"
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
            size="lg"
            className="w-full"
          >
            Leave Game
          </Button>
        </motion.div>

        {/* Player Count */}
        <motion.div
          className="text-center text-black/60 text-sm"
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
