import { motion } from "motion/react";
import { Button } from "./ui/button";
import { useI18n } from "@/i18n";
import catCrying from "../assets/graphics/cat_crying.svg";

type PenaltyStage = "first" | "second" | "third";

interface ShelterPenaltyScreenProps {
  stage: PenaltyStage;
  onContinue: () => void;
}

export function ShelterPenaltyScreen({
  stage,
  onContinue,
}: ShelterPenaltyScreenProps) {
  const { t } = useI18n();
  const penaltyCopy: Record<PenaltyStage, { title: string; message: string }> = {
    first: {
      title: t("penalty.first.title"),
      message: t("penalty.first.message"),
    },
    second: {
      title: t("penalty.second.title"),
      message: t("penalty.second.message"),
    },
    third: {
      title: t("penalty.third.title"),
      message: t("penalty.third.message"),
    },
  };
  const { title, message } = penaltyCopy[stage];
  const showContinue = stage !== "third";

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6"
      initial={{ opacity: 0, scale: 0.85, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 30 }}
      transition={{ type: "spring", damping: 20, stiffness: 220 }}
    >
      <div className="w-full max-w-lg text-center space-y-6 rounded-lg bg-background p-10 shadow-xl">
        <div className="inline-flex items-center justify-center rounded-full bg-black p-4">
          <img
            src={catCrying}
            alt={t("penalty.imageAlt", { fallback: "Sad cat illustration for wrong answer" })}
            className="h-max w-full object-contain"
            style={{ width: 200, height: 200 }}
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl text-black font-bold uppercase">
            {title}
          </h2>
          <p className="text-black font-semibold">{message}</p>
        </div>
        <div className="flex flex-col gap-3">
          {showContinue && (
            <Button
              onClick={onContinue}
              className="w-full border border-black bg-background text-black hover:bg-neutral-100"
            >
              {t("penalty.keepPlaying")}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
