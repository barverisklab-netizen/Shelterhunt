import { motion } from 'motion/react';
import { MapPin, Users, Info, User } from 'lucide-react';

interface OnboardingScreenProps {
  onJoinGame: (code: string) => void;
  onHostGame: () => void;
  onPlaySolo: () => void;
  onShowHelp: () => void;
}

export function OnboardingScreen({
  onJoinGame: _onJoinGame,
  onHostGame: _onHostGame,
  onPlaySolo,
  onShowHelp,
}: OnboardingScreenProps) {

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Bauhaus Geometric Background Elements - White/Black/Red Only */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-red-600"></div>
      <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-black"></div>
      
      <div className="absolute bottom-20 right-1/3 w-16 h-16 bg-red-600"></div>
      <div className="absolute top-1/3 right-10 w-20 h-20 bg-black"></div>
      
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
              {/* MapPin Icon in Center */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <MapPin className="w-12 h-12 text-black" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-black text-black uppercase tracking-tight leading-none">
              ShelterHunt
            </h1>
            <p className="text-black text-base font-medium titlecase tracking-wider">
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
          {/* Play Solo Button */}
          <button
            onClick={onPlaySolo}
            className="w-full bg-red-600 text-black border-4 border-black hover:shadow-[8px_8px_0_black] transition-all py-6 flex items-center justify-center gap-2 cursor-pointer"
          >
            <User className="w-5 h-5" />
            <span className="text-lg font-bold uppercase tracking-wide">Play Solo</span>
          </button>

          {/* Join Game Section */}
          {/* TODO: Re-enable multiplayer join flow when networking is implemented */}
          <button
            disabled
            className="w-full bg-gray-200 border-4 border-black transition-all py-6 flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
            title="Multiplayer coming soon"
          >
            <Users className="w-5 h-5 text-black-30" />
            <span className="text-lg font-bold uppercase tracking-wide text-black-30">Join Game</span>
          </button>

          {/* Host Game Button */}
          {/* TODO: Re-enable multiplayer hosting controls when networking is implemented */}
          <button
            disabled
            className="w-full bg-gray-200 border-4 border-black transition-all py-6 flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
            title="Multiplayer coming soon"
          >
            <Users className="w-5 h-5 text-black-30" />
            <span className="text-lg font-bold uppercase tracking-wide text-black-30">Host Multiplayer</span>
          </button>

          {/* How to Play Button */}
          <button
            onClick={onShowHelp}
            className="w-full bg-background text-black border-4 border-black hover:shadow-[4px_4px_0_black] transition-all py-4 flex items-center justify-center gap-2 cursor-pointer"
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
            { label: 'TRIVIA', color: 'bg-black', textColor: 'text-black' },
            { label: 'TEAM', color: 'bg-background', textColor: 'text-black' }
          ].map((feature, index) => (
            <motion.div
              key={feature.label}
              className={`${feature.color} ${feature.textColor} px-6 py-2 text-sm font-bold uppercase tracking-wider border-4 border-black`}
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
