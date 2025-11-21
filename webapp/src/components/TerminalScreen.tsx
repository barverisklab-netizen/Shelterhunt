import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { useI18n } from "@/i18n";

interface TerminalScreenProps {
  onRestart: () => void;
}

export function TerminalScreen({ onRestart }: TerminalScreenProps) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
      <motion.div
        className="w-full max-w-lg space-y-6 rounded-lg border-4 border-black bg-background p-8 text-center shadow-xl"
        initial={{ opacity: 0, scale: 0.85, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 18, stiffness: 240 }}
      >
        <div className="flex justify-center">
          <div className="rounded-full border-4 border-black bg-red-500 p-5">
            <AlertTriangle className="w-12 h-12 text-white" />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black uppercase text-black">
            {t("terminal.title")}
          </h2>
          <p className="text-black font-semibold">
            {t("terminal.message")}
          </p>
        </div>
        <Button
          onClick={onRestart}
          className="w-full rounded border-4 border-black bg-red-500 py-4 text-sm font-bold uppercase text-white transition-colors hover:bg-red-600"
        >
          {t("terminal.back")}
        </Button>
      </motion.div>
    </div>
  );
}
