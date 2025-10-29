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
    <div className="min-h-screen bauhaus-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Bauhaus Geometric Background Elements - White/Black/Red Only */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-red-600"></div>
      <div className="absolute top-40 right-20 w-24 h-24 rounded-full bauhaus-white"></div>
      <div className="absolute bottom-32 left-1/4" style={{
        width: 0,
        height: 0,
        borderLeft: '50px solid transparent',
        borderRight: '50px solid transparent',
        borderBottom: '87px solid #DC2626'
      }}></div>
      <div className="absolute bottom-20 right-1/3 w-16 h-16 bg-red-600"></div>
      <div className="absolute top-1/3 right-10 w-20 h-20 bauhaus-white"></div>
      
      <motion.div
        className="w-full max-w-md space-y-8 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo and Title - Bauhaus Style */}
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          {/* Geometric Logo Composition */}
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              {/* Large Red Square */}
              <div className="absolute inset-0 bg-red-600 border-4 border-black"></div>
              {/* Black Circle */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bauhaus-white border-4 border-white"></div>
              {/* MapPin Icon in Center */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <MapPin className="w-8 h-8 text-black" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-6xl font-black text-black uppercase tracking-tight leading-none">
              Secret<br/>Shelter
            </h1>
            <p className="text-black text-base font-medium uppercase tracking-wider">
              Find the shelter before the storm!
            </p>
          </div>
        </motion.div>

        {/* Action Buttons - Bauhaus Style */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {/* Join Game Section */}
          {!showJoinInput ? (
            <button
              onClick={() => setShowJoinInput(true)}
              className="w-full bauhaus-white border-4 border-black hover:shadow-[8px_8px_0_black] transition-all py-6 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Users className="w-5 h-5" />
              <span className="text-lg font-bold uppercase tracking-wide">Join Game</span>
            </button>
          ) : (
            <motion.div
              className="bauhaus-white border-4 border-red-600 p-4 space-y-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Input
                type="text"
                placeholder="ENTER CODE"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                className="border-2 border-black text-black placeholder:text-gray-400 text-center text-xl tracking-widest font-bold uppercase bauhaus-white"
                maxLength={6}
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowJoinInput(false)}
                  className="flex-1 bauhaus-white border-2 border-black py-3 font-bold uppercase text-sm hover:shadow-[4px_4px_0_black] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoin}
                  disabled={!gameCode.trim()}
                  className="flex-1 bg-red-600 text-black border-2 border-black py-3 font-bold uppercase text-sm hover:shadow-[4px_4px_0_black] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Join
                </button>
              </div>
            </motion.div>
          )}

          {/* Play Solo Button */}
          <button
            onClick={onPlaySolo}
            className="w-full bg-red-600 text-black border-4 border-black hover:shadow-[8px_8px_0_black] transition-all py-6 flex items-center justify-center gap-2 cursor-pointer"
          >
            <User className="w-5 h-5" />
            <span className="text-lg font-bold uppercase tracking-wide">Play Solo</span>
          </button>

          {/* Host Game Button */}
          <button
            onClick={onHostGame}
            className="w-full bauhaus-white text-black border-4 border-black hover:shadow-[8px_8px_0_red] transition-all py-6 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Users className="w-5 h-5" />
            <span className="text-lg font-bold uppercase tracking-wide">Host Multiplayer</span>
          </button>

          {/* How to Play Button */}
          <button
            onClick={onShowHelp}
            className="w-full bauhaus-white text-black border-4 border-black hover:shadow-[4px_4px_0_black] transition-all py-4 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Info className="w-5 h-5" />
            <span className="text-base font-bold uppercase tracking-wide">How to Play</span>
          </button>
        </motion.div>

        {/* Feature Tags - Bauhaus Geometric Style */}
        <motion.div
          className="flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {[
            { label: 'LOCATION', color: 'bg-red-600', textColor: 'text-black' },
            { label: 'TRIVIA', color: 'bauhaus-white', textColor: 'text-black' },
            { label: 'TEAM', color: 'bauhaus-white', textColor: 'text-black' }
          ].map((feature, index) => (
            <motion.div
              key={feature.label}
              className={`${feature.color} ${feature.textColor} px-6 py-2 text-sm font-bold uppercase tracking-wider border-2 border-black`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              {feature.label}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
