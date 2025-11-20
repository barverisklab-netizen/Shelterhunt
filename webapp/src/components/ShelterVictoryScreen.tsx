import { motion } from "motion/react";
import { Trophy } from "lucide-react";
import { Button } from "./ui/button";

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
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6"
      initial={{ opacity: 0, scale: 0.85, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 40 }}
      transition={{ type: "spring", damping: 18, stiffness: 240 }}
    >
      <div className="w-full max-w-lg text-center space-y-6 rounded-lg bg-red-500/10 p-10 shadow-xl">
        <motion.div
          className="inline-block rounded-full bg-red-500/20 p-6"
          animate={{ rotate: [0, 8, -8, 8, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, repeat: 1 }}
        >
          <Trophy className="w-16 h-16 text-black" />
        </motion.div>

        <div>
          <h2 className="text-4xl text-black mb-2 font-bold uppercase">
            Victory! 🎉
          </h2>
          <p className="text-black font-bold text-lg uppercase">
            You found the secret shelter!! </p><p>
            {shelterName ? ` ${shelterName}` : ""}
          </p>
        </div>

        <div className="rounded border border-neutral-900 bg-background p-4 space-y-2 text-left">
          <div className="flex justify-between text-black font-semibold uppercase">
            <span>Clues Collected</span>
            <span>{clueCount}</span>
          </div>
          <div className="flex justify-between text-black font-semibold uppercase">
            <span>Locations Visited</span>
            <span>{visitedCount}</span>
          </div>
        </div>

        <Button
          onClick={onPlayAgain}
          className="w-full"
        >
          Play Again
        </Button>
      </div>
    </motion.div>
  );
}
