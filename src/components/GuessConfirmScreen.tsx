import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";

interface GuessConfirmScreenProps {
  shelterName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GuessConfirmScreen({
  shelterName,
  onConfirm,
  onCancel,
}: GuessConfirmScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-neutral-50 flex flex-col"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", damping: 20, stiffness: 220 }}
    >
      <div className="flex items-center justify-between border-b border-neutral-900 bg-background px-4 py-3">
        <button
          onClick={onCancel}
          className="rounded border border-neutral-900 bg-background px-4 py-2 text-xs font-semibold uppercase text-neutral-900 hover:bg-neutral-100"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-neutral-900 bg-neutral-900 p-3">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-2xl font-black uppercase text-black">
            Confirm Guess
          </h3>
        </div>
        <div className="w-20" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-6 bg-neutral-50">
        <div className="space-y-3 max-w-md">
          <p className="text-sm uppercase font-semibold text-black/70">
            Are you sure you want to lock in this shelter?
          </p>
          <div className="rounded border border-neutral-900 bg-background p-4 text-lg font-bold uppercase text-neutral-900">
            {shelterName}
          </div>
          <p className="text-xs text-black/60">
            A wrong selection will reset your timer to 10 minutes and turn it
            red. Make sure you have gathered enough clues before you commit.
          </p>
        </div>

        <div className="w-full max-w-md flex flex-col gap-3">
          <Button
            className="w-full rounded border border-neutral-900 bg-neutral-900 py-4 text-sm font-bold uppercase text-white hover:bg-neutral-800"
            onClick={onConfirm}
          >
            Lock In Guess
          </Button>
          <Button
            variant="outline"
            className="w-full font-bold uppercase"
            onClick={onCancel}
          >
            Back to Clues
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
