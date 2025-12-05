import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { useI18n } from "@/i18n";
import catWaving from "../assets/graphics/cat_waving.svg";

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
  const { t } = useI18n();
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", damping: 20, stiffness: 220 }}
    >
      <div className="flex items-center justify-between border-b border-neutral-900 bg-background px-4 py-3">
        <button
          onClick={onCancel}
          className="rounded border border-neutral-900 bg-background px-4 py-3 text-xs font-semibold uppercase text-black hover:bg-neutral-100"
        >
          {t("common.back")}
        </button>
        <div className="flex items-center gap-3">
          <div className="rounded-full  border-neutral-900 bg-black p-3">
            <AlertTriangle className="w-6 h-6 text-black" />
          </div>
          <h3 className="text-2xl font-black uppercase text-black">
            {t("guess.confirmTitle")}
          </h3>
        </div>
        <div className="w-20" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-6 bg-background">
        <div className="flex justify-center">
          <img
            src={catWaving}
            alt={t("guess.confirmImageAlt", { fallback: "Cat waving illustration" })}
            className="h-max object-contain"
            style={{ width: 200, height: 200 }}
          />
        </div>

        <div className="space-y-3 max-w-md">
          <p className="text-lg uppercase font-semibold text-black/70">
            {t("guess.confirmPrompt")}
          </p>
          <div className="rounded bg-neutral-200 p-4 text-m font-bold uppercase text-black">
            {shelterName}
          </div>
          <p className="text-xs text-black/60">
            {t("guess.confirmWarning")}
          </p>
        </div>

        <div className="flex w-full max-w-md flex-col gap-3">
          <Button
            className="w-full rounded border border-black bg-red-500 py-4 text-sm font-bold uppercase text-black transition-colors hover:bg-red-600"
            onClick={onConfirm}
          >
            {t("guess.lockIn")}
          </Button>
          <Button
            variant="outline"
            className="w-full rounded border border-black bg-background py-4 text-sm font-bold uppercase text-black transition-colors hover:bg-neutral-900 hover:text-white"
            onClick={onCancel}
          >
            {t("guess.backToClues")}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
