import { MapPin, Users, Info, User } from 'lucide-react';
import { motion } from 'motion/react';

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
  const buttonBaseDelay = 1.1;
  const featureBaseDelay = 1.7;

  return (
    <motion.div
      className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {/* Bauhaus Geometric Background Elements - White/Black/Red Only */}
      <motion.div
        className="absolute top-10 left-10 w-32 h-32 bg-red-600"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="absolute top-40 right-20 w-24 h-24 rounded-full bg-black"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.div
        className="absolute bottom-20 right-1/3 w-16 h-16 bg-red-600"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="absolute top-1/3 right-10 w-20 h-20 bg-black"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />

      <div className="w-full max-w-md space-y-10 relative z-10">
        {/* Logo and Title - Bauhaus Style */}
        <div className="text-center space-y-6">
          {/* Geometric Logo Composition */}
          <motion.div
            className="flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.3, ease: 'easeOut' }}
          >
            <motion.div
              className="relative w-32 h-32"
              initial={{ scale: 0, opacity: 0, y: -60, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
              transition={{
                delay: 0.35,
                type: 'spring',
                stiffness: 280,
                damping: 22,
              }}
            >
              {/* MapPin Icon in Center */}
              <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                initial={{ scale: 0, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{
                  delay: 0.45,
                  type: 'spring',
                  stiffness: 340,
                  damping: 18,
                }}
              >
                <MapPin className="w-12 h-12 text-black" />
              </motion.div>
            </motion.div>
          </motion.div>

          <div className="space-y-4">
            <motion.h1
              className="text-4xl font-black uppercase tracking-tight leading-none"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              ShelterHunt
            </motion.h1>
            <motion.p
              className="text-base font-medium titlecase tracking-wider text-black"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              Find the shelter before the storm!
            </motion.p>
          </div>
        </div>

        {/* Action Buttons - Bauhaus Style */}
        <div className="space-y-4">
          {/* Play Solo Button */}
          <motion.button
            type="button"
            onClick={onPlaySolo}
            className="w-full bg-red-600 text-black border-4 border-black hover:shadow-[8px_8px_0_black] transition-all py-6 flex items-center justify-center gap-2 cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: buttonBaseDelay, duration: 0.45, ease: 'easeOut' }}
          >
            <User className="w-5 h-5" />
            <span className="text-lg font-bold uppercase tracking-wide">Play Solo</span>
          </motion.button>

          {/* Join Game Section */}
          {/* TODO: Re-enable multiplayer join flow when networking is implemented */}
          <motion.button
            type="button"
            disabled
            className="w-full bg-gray-200 border-4 border-black transition-all py-6 flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
            title="Multiplayer coming soon"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: buttonBaseDelay + 0.12,
              duration: 0.45,
              ease: 'easeOut',
            }}
          >
            <Users className="w-5 h-5 text-black-30" />
            <span className="text-lg font-bold uppercase tracking-wide text-black-30">Join Game</span>
          </motion.button>

          {/* Host Game Button */}
          {/* TODO: Re-enable multiplayer hosting controls when networking is implemented */}
          <motion.button
            type="button"
            disabled
            className="w-full bg-gray-200 border-4 border-black transition-all py-6 flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
            title="Multiplayer coming soon"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: buttonBaseDelay + 0.24,
              duration: 0.45,
              ease: 'easeOut',
            }}
          >
            <Users className="w-5 h-5 text-black-30" />
            <span className="text-lg font-bold uppercase tracking-wide text-black-30">Host Multiplayer</span>
          </motion.button>

          {/* How to Play Button */}
          <motion.button
            type="button"
            onClick={onShowHelp}
            className="w-full bg-background text-black border-4 border-black hover:shadow-[4px_4px_0_black] transition-all py-4 flex items-center justify-center gap-2 cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: buttonBaseDelay + 0.36,
              duration: 0.45,
              ease: 'easeOut',
            }}
          >
            <Info className="w-5 h-5" />
            <span className="text-base font-bold uppercase tracking-wide">How to Play</span>
          </motion.button>
        </div>

        {/* Feature Tags - Bauhaus Geometric Style */}
        <div
          className="flex flex-wrap justify-center gap-3"
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
              transition={{
                delay: featureBaseDelay + index * 0.12,
                duration: 0.45,
                ease: 'easeOut',
              }}
            >
              {feature.label}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
