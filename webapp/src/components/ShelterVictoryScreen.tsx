import { motion } from "motion/react";
import { Button } from "./ui/button";
import catHappy from "../assets/graphics/cat_happy.svg";
import catCrying from "../assets/graphics/cat_crying.svg";
import { useI18n } from "@/i18n";

interface ShelterVictoryScreenProps {
  shelterName?: string;
  clueCount: number;
  visitedCount: number;
  onPlayAgain: () => void;
  result?: "win" | "lose";
}

export function ShelterVictoryScreen({
  shelterName,
  clueCount,
  visitedCount,
  onPlayAgain,
  result = "win",
}: ShelterVictoryScreenProps) {
  const { t } = useI18n();
  const isWin = result === "win";
  const title = isWin
    ? t("victory.title")
    : t("defeat.title", { fallback: "Wrong shelter" });
  const subtitle = isWin
    ? t("victory.subtitle", {
        replacements: { shelter: shelterName ?? "" },
        fallback: "You found the secret shelter!",
      })
    : t("defeat.subtitle", {
        fallback: "That was your final guess. Try again with a new hunt.",
      });
  const imageAlt = isWin
    ? t("victory.imageAlt", { fallback: "Celebration cat illustration" })
    : t("defeat.imageAlt", { fallback: "Sad cat illustration" });
  const imageSrc = isWin ? catHappy : catCrying;
  const titleClass = isWin ? "text-green-600" : "text-red-600";

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6"
      initial={{ opacity: 0, scale: 0.85, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 40 }}
      transition={{ type: "spring", damping: 18, stiffness: 240 }}
    >
      <div className="w-full max-w-lg text-center space-y-6 rounded-lg bg-green-500/10 p-10 shadow-xl border-4 border-black">
        <div className="flex justify-center">
          <motion.div
            className="bg-white rounded-2xl border-4 border-black overflow-hidden shadow-[6px_6px_0_#000] flex justify-center items-center"
            style={{ width: 200, height: 200 }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <img
              className="block w-full h-max object-contain"
              src={imageSrc}
              alt={imageAlt}
            />
          </motion.div>
        </div>

        <div>
          <h2
            className={`text-4xl ${titleClass} mb-2 font-black tracking-widest uppercase drop-shadow-sm`}
          >
            {title}
          </h2>
          <p className="text-black font-bold text-lg uppercase">
            {subtitle}
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
          className="w-full rounded border border-black bg-red-500 py-4 text-sm font-bold uppercase text-black transition-colors hover:bg-red-600"
          >
          {t("victory.playAgain")}
        </Button>
      </div>
    </motion.div>
  );
}
