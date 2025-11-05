import { Users, Info, User } from 'lucide-react';
import { motion } from 'motion/react';
import packageInfo from '../../package.json';
import { MenuHeader } from './MenuHeader';

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
  const featureBaseDelay = 1.7; // currently unused

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="flex flex-col items-center p-8"
    >
      <MenuHeader
        title="ShelterSearch"
        subtitle="Find the shelter before the storm!"
        versionLabel={`v${packageInfo.version}`}
      />

      {/* Action Buttons - Bauhaus Style */}
      <div className="space-y-4">
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

        <motion.button
          type="button"
          disabled
          className="w-full bg-background border-4 border-black transition-all py-6 flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
          title="Multiplayer coming soon"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: buttonBaseDelay + 0.12, duration: 0.45, ease: 'easeOut' }}
        >
          <Users className="w-5 h-5 text-neutral-500" />
          <span className="text-lg font-bold uppercase tracking-wide text-neutral-500">Join Game</span>
        </motion.button>

        <motion.button
          type="button"
          disabled
          className="w-full bg-background border-4 border-black transition-all py-6 flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
          title="Multiplayer coming soon"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: buttonBaseDelay + 0.24, duration: 0.45, ease: 'easeOut' }}
        >
          <Users className="w-5 h-5 text-neutral-500" />
          <span className="text-lg font-bold uppercase tracking-wide text-neutral-500">Host Multiplayer</span>
        </motion.button>

        <motion.button
          type="button"
          onClick={onShowHelp}
          className="w-full bg-background text-black border-4 border-black hover:shadow-[4px_4px_0_black] transition-all py-4 flex items-center justify-center gap-2 cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: buttonBaseDelay + 0.36, duration: 0.45, ease: 'easeOut' }}
        >
          <Info className="w-5 h-5" />
          <span className="text-base font-bold uppercase tracking-wide">How to Play</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
