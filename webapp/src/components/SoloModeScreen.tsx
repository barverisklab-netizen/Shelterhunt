import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Zap, Map } from "lucide-react";
import {
  LIGHTNING_DURATION_MINUTES,
  LIGHTNING_RADIUS_KM,
} from "../config/runtime";
import { MenuHeader } from "./MenuHeader";
import { useI18n } from "@/i18n";

interface SoloModeScreenProps {
  onBack: () => void;
  onSelectLightning: () => void;
  onSelectCitywide: () => void;
  isProcessing: boolean;
}

export function SoloModeScreen({
  onBack,
  onSelectLightning,
  onSelectCitywide,
  isProcessing,
}: SoloModeScreenProps) {
  const { t } = useI18n();
  const [selection, setSelection] = useState<"lightning" | null>(null);

  return (
    <motion.div
      className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <motion.div
        className="absolute top-16 left-12 w-28 h-28 bg-red-600"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="absolute bottom-24 right-16 w-24 h-24 rounded-full bg-black"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.28, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />

      <div className="relative z-10 w-full max-w-md space-y-10">
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border-4 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all hover:-translate-x-1 hover:bg-neutral-200 hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </button>
        </div>

        <MenuHeader title={t("common.appName")} subtitle={t("solo.soloPlay")} />
        <AnimatePresence>
          {selection !== "lightning" && (
            <motion.div
              key="mode-options"
              className="space-y-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.2 }}
            >
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setSelection("lightning")}
                className="w-full bg-background text-black border-4 border-black hover:shadow-[4px_4px_0_black] transition-all py-6 px-5 flex flex-col items-center gap-2 cursor-pointer text-center"
              >
                <span className="flex items-center gap-3 text-lg font-bold uppercase tracking-wide">
                  <Zap className="h-5 w-5" /> {t("solo.lightningHunt")}
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-600">
                  {t("solo.lightningMeta")}
                </span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={onSelectCitywide}
                className="w-full bg-background text-black border-4 border-black hover:shadow-[4px_4px_0_black] transition-all py-6 px-5 flex flex-col items-center gap-2 cursor-pointer text-center"
              >
                <span className="flex items-center gap-3 text-md font-bold uppercase tracking-wide">
                  <Map className="h-5 w-5" /> {t("solo.citywideSearch")}
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-600">
                  {t("solo.citywideMeta")}
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selection === "lightning" && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="space-y-4 rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0_black]"
            >
              <div className="space-y-2 text-center">
                <h2 className="text-lg font-black uppercase tracking-wide">
                  {t("solo.lightningPrompt")}
                </h2>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-600">
                  {t("solo.lightningDetails", {
                    replacements: {
                      minutes: LIGHTNING_DURATION_MINUTES,
                      radius: LIGHTNING_RADIUS_KM,
                    },
                  })}
                </p>
                <p className="text-sm font-medium text-neutral-700 normal-case">
                  {t("solo.lightningDescription")}
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={onSelectLightning}
                  className="w-full max-w-xs border border-black bg-white text-black transition-colors hover:bg-neutral-200 hover:text-black hover:border-black active:bg-neutral-800 active:text-black active:border-black disabled:bg-neutral-200 disabled:text-black-40 disabled:border-neutral-400 disabled:opacity-100">
                  {t("solo.startLightning")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
