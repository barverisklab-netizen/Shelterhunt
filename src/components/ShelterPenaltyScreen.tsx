import { motion } from "motion/react";
import { Frown } from "lucide-react";
import { Button } from "./ui/button";

type PenaltyStage = "first" | "second" | "third";

interface ShelterPenaltyScreenProps {
  stage: PenaltyStage;
  onContinue: () => void;
}

const penaltyCopy: Record<PenaltyStage, { title: string; message: string }> = {
  first: {
    title: "Not Quite There",
    message:
      "That wasn't the secret shelter. Your timer has been reset to 10 minutes—make every clue count.",
  },
  second: {
    title: "Pressure Rising",
    message:
      "Another miss. The timer now drops to 5 minutes. You will get one last chance, choose wisely.",
  },
  third: {
    title: "Game Over",
    message:
      "You've used all three guesses. The shelter stays hidden—time to regroup and start again.",
  },
};

export function ShelterPenaltyScreen({
  stage,
  onContinue,
}: ShelterPenaltyScreenProps) {
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
        <div className="inline-block rounded-full bg-black p-6">
          <Frown className="w-16 h-16" color="#ef4444" strokeWidth={1.8} />
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
              className="w-full bg-black text-black border hover:bg-neutral-900 hover:text-white"
            >
              Keep Playing
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
