import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";

interface TerminalScreenProps {
  onRestart: () => void;
}

export function TerminalScreen({ onRestart }: TerminalScreenProps) {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-lg space-y-6 rounded-lg border border-neutral-800 bg-background p-8 text-center shadow-xl"
        initial={{ opacity: 0, scale: 0.85, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 18, stiffness: 240 }}
      >
        <div className="flex justify-center">
          <div className="rounded-full border border-neutral-900 bg-neutral-900 p-5">
            <AlertTriangle className="w-12 h-12 text-white" />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black uppercase text-neutral-900">
            Time's Up
          </h2>
          <p className="text-neutral-600 font-semibold">
            You need to try harder. Study the clues, plan your next move, and
            return when you are ready.
          </p>
        </div>
        <Button
          onClick={onRestart}
          className="w-full rounded border border-neutral-900 bg-neutral-900 py-4 text-sm font-bold uppercase text-white hover:bg-neutral-800"
        >
          Back to Onboarding
        </Button>
      </motion.div>
    </div>
  );
}
