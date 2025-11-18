import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Zap, Map } from "lucide-react";
import {
  LIGHTNING_DURATION_MINUTES,
  LIGHTNING_RADIUS_KM,
} from "../config/runtime";
import { MenuHeader } from "./MenuHeader";

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
            className="inline-flex items-center gap-2 rounded-full border-4 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all hover:-translate-x-1 hover:bg-neutral-900 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <MenuHeader title="ShelterSearch" subtitle="Solo Play" />
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
                  <Zap className="h-5 w-5" /> Lightning Hunt
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-600">
                  Timed hunt · requires location access
                </span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={onSelectCitywide}
                className="w-full bg-background text-black border-4 border-black hover:shadow-[4px_4px_0_black] transition-all py-6 px-5 flex flex-col items-center gap-2 cursor-pointer text-center"
              >
                <span className="flex items-center gap-3 text-md font-bold uppercase tracking-wide">
                  <Map className="h-5 w-5" /> Citywide Search
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-600">
                  No timer · roam freely
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
                  Ready for the lightning hunt?
                </h2>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-600">
                  {LIGHTNING_DURATION_MINUTES}-minute countdown · radius{" "}
                  {LIGHTNING_RADIUS_KM} km
                </p>
                <p className="text-sm font-medium text-neutral-700 normal-case">
                  We’ll lock onto shelters within range once your location is
                  confirmed. If none are nearby, you’ll be prompted to
                  reposition before starting.
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={onSelectLightning}
                  className="w-full max-w-xs border border-black bg-white text-black transition-colors hover:bg-neutral-200 hover:text-black hover:border-black active:bg-black active:text-white active:border-black disabled:bg-neutral-200 disabled:text-neutral-500 disabled:border-neutral-400 disabled:opacity-100">
                  Start lightning hunt
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
