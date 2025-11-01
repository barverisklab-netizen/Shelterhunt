import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";

interface TerminalScreenProps {
  onRestart: () => void;
}

export function TerminalScreen({ onRestart }: TerminalScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-lg space-y-6 rounded-lg border-4 border-black bg-background p-8 text-center shadow-xl"
        initial={{ opacity: 0, scale: 0.85, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 18, stiffness: 240 }}
      >
        <div className="flex justify-center">
          <div className="rounded-full border-4 border-black bg-yellow-300 p-5">
            <AlertTriangle className="w-12 h-12 text-black" />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black uppercase text-black">
            Time's Up
          </h2>
          <p className="text-black font-semibold">
            You need to try harder. Study the clues, plan your next move, and
            return when you are ready.
          </p>
        </div>
        <Button
          onClick={onRestart}
          className="w-full rounded border-4 border-black bg-yellow-300 py-4 text-sm font-bold uppercase text-black transition-colors hover:bg-yellow-200"
        >
          Back to Onboarding
        </Button>
      </motion.div>
    </div>
  );
}
