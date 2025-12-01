import { motion } from "motion/react";
import { Button } from "./ui/button";
import introIllustration from "../assets/bosaisensai.svg";
import { useI18n } from "@/i18n";

interface ShelterVictoryScreenProps {
  shelterName?: string;
  clueCount: number;
  visitedCount: number;
  onPlayAgain: () => void;
}

export function ShelterVictoryScreen({
  shelterName,
  clueCount,
  visitedCount,
  onPlayAgain,
}: ShelterVictoryScreenProps) {
  const { t } = useI18n();
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6"
      initial={{ opacity: 0, scale: 0.85, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 40 }}
      transition={{ type: "spring", damping: 18, stiffness: 240 }}
    >
      <div className="w-full max-w-lg text-center space-y-6 rounded-lg bg-green-500/10 p-10 shadow-xl border-4 border-black">
        <motion.div
          className="mx-auto w-[140px] h-[140px] bg-white rounded-2xl border-4 border-black overflow-hidden shadow-[6px_6px_0_#000] flex justify-center items-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <img
            className="block h-full w-full object-cover"
            src={introIllustration}
            alt={t("victory.imageAlt", { fallback: "Bosai Sensei illustration" })}
          />
        </motion.div>

        <div>
          <h2 className="text-4xl text-green-600 mb-2 font-black tracking-widest uppercase drop-shadow-sm">
            {t("victory.title")}
          </h2>
          <p className="text-black font-bold text-lg uppercase">
            {t("victory.subtitle", {
              replacements: { shelter: shelterName ?? "" },
              fallback: "You found the secret shelter!",
            })}
          </p>
          <p>
            {shelterName ? ` ${shelterName}` : ""}
          </p>
        </div>

        <div className="rounded border border-neutral-900 bg-background p-4 space-y-2 text-left">
          <div className="flex justify-between text-black font-semibold uppercase">
            <span>{t("victory.clues")}</span>
            <span>{clueCount}</span>
          </div>
          <div className="flex justify-between text-black font-semibold uppercase">
            <span>{t("victory.visited")}</span>
            <span>{visitedCount}</span>
          </div>
        </div>

        <Button
          onClick={onPlayAgain}
          className="w-full"
        >
          {t("victory.playAgain")}
        </Button>
      </div>
    </motion.div>
  );
}
