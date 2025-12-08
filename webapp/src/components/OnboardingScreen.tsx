import { Users, Info, User } from 'lucide-react';
import { motion } from 'motion/react';
import packageInfo from '../../package.json';
import { MenuHeader } from './MenuHeader';
import { AcknowledgementFooter } from './AcknowledgementFooter';
import { useI18n } from "@/i18n";

interface OnboardingScreenProps {
  onJoinGame: () => void;
  onHostGame: () => void;
  onPlaySolo: () => void;
  onShowHelp: () => void;
}

export function OnboardingScreen({
  onJoinGame,
  onHostGame,
  onPlaySolo,
  onShowHelp,
}: OnboardingScreenProps) {
  const { t } = useI18n();
  const buttonBaseDelay = 1.1;
  const featureBaseDelay = 1.7; // currently unused

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-between px-6 py-10"
    >
      <motion.div
        className="absolute top-12 left-16 w-32 h-32 bg-red-600"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 0.8, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="absolute bottom-24 right-20 w-24 h-24 rounded-full bg-black"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 0.9, scale: 1 }}
        transition={{ delay: 0.28, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />

      <div className="relative z-10 w-full max-w-md space-y-6 flex-1 flex flex-col justify-center">
        <MenuHeader
          title={t("onboarding.title")}
          subtitle={t("onboarding.tagline")}
          versionLabel={`v${packageInfo.version}`}
        />

        {/* Action Buttons - Bauhaus Style */}
        <div className="space-y-4">
          <motion.button
            type="button"
            onClick={onPlaySolo}
            className="w-full bg-red-600 text-black border-4 border-black hover:bg-neutral-100 hover:shadow-[8px_8px_0_black] transition-all py-6 flex items-center justify-center gap-2 cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: buttonBaseDelay, duration: 0.45, ease: 'easeOut' }}
          >
            <User className="w-5 h-5" />
            <span className="text-lg font-bold uppercase tracking-wide">{t("onboarding.playSolo")}</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={onJoinGame}
            className="w-full bg-background border-4 border-black hover:bg-neutral-100 hover:shadow-[8px_8px_0_black] transition-all py-6 flex items-center justify-center gap-2 cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: buttonBaseDelay + 0.12, duration: 0.45, ease: 'easeOut' }}
          >
            <Users className="w-5 h-5 text-black" />
            <span className="text-lg font-bold uppercase tracking-wide text-black">{t("onboarding.joinGame")}</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={onHostGame}
            className="w-full bg-background border-4 border-black hover:bg-neutral-100 hover:shadow-[8px_8px_0_black] transition-all py-6 flex items-center justify-center gap-2 cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: buttonBaseDelay + 0.24, duration: 0.45, ease: 'easeOut' }}
          >
            <Users className="w-5 h-5 text-black" />
            <span className="text-lg font-bold uppercase tracking-wide text-black">{t("onboarding.hostGame")}</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={onShowHelp}
            className="w-full bg-background text-black border-4 border-black hover:bg-neutral-100 hover:shadow-[4px_4px_0_black] transition-all py-4 flex items-center justify-center gap-2 cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: buttonBaseDelay + 0.36, duration: 0.45, ease: 'easeOut' }}
          >
            <Info className="w-5 h-5" />
            <span className="text-base font-bold uppercase tracking-wide">{t("onboarding.howToPlay")}</span>
          </motion.button>
        </div>
      </div>
      <AcknowledgementFooter />
    </motion.div>
  );
}
