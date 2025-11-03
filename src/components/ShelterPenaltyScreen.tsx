import { motion } from "motion/react";
import { Frown } from "lucide-react";
import { Button } from "./ui/button";

interface ShelterPenaltyScreenProps {
  onContinue: () => void;
  onReturn: () => void;
}

export function ShelterPenaltyScreen({
  onContinue,
  onReturn,
}: ShelterPenaltyScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6"
      initial={{ opacity: 0, scale: 0.85, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 30 }}
      transition={{ type: "spring", damping: 20, stiffness: 220 }}
    >
      <div className="w-full max-w-lg text-center space-y-6 rounded-lg border border-neutral-900 bg-background p-10 shadow-xl">
        <div className="inline-block rounded-full border border-neutral-900 bg-black p-6">
          <Frown className="w-16 h-16 text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl text-black font-bold uppercase">
            Not Quite There
          </h2>
          <p className="text-black font-semibold">
            That wasn&apos;t the secret shelter. Your timer has been reset to 10
            minutes—make every clue count.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            onClick={onContinue}
            className="w-full bg-black hover:bg-neutral-900"
          >
            Keep Playing
          </Button>
          <Button
            variant="outline"
            onClick={onReturn}
            className="w-full font-bold uppercase"
          >
            Return to Onboarding
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
