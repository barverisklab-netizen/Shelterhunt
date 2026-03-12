import { createPortal } from "react-dom";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useI18n } from "@/i18n";

interface PwaInstallModalProps {
  open: boolean;
  installing?: boolean;
  onInstall: () => void;
  onSkip: () => void;
  onTimeoutClose: () => void;
}

export function PwaInstallModal({
  open,
  installing = false,
  onInstall,
  onSkip,
  onTimeoutClose,
}: PwaInstallModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open || installing) return;
    const timeoutId = window.setTimeout(() => {
      onTimeoutClose();
    }, 10_000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [installing, onTimeoutClose, open]);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center p-4"
          style={{ zIndex: 2147483647 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <motion.div
            className="pointer-events-auto relative w-full max-w-lg rounded-lg border-2 border-black bg-black/70 p-5 text-white shadow-xl"
            initial={{ y: 56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 56, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.9 }}
          >
            <div className="mb-4 pr-20">
              <h3 className="text-lg font-bold uppercase">
                {t("pwaInstall.title", { fallback: "Install Shelterhunt" })}
              </h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white">
                {t("pwaInstall.subtitle", {
                  fallback: "Save this app to your home screen for faster access.",
                })}
              </p>
            </div>

            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={onSkip}
                className="rounded border border-black px-4 py-2 text-sm font-bold uppercase tracking-wide hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("tutorial.skip", { fallback: "Skip" })}
              </button>
              <button
                type="button"
                onClick={onInstall}
                disabled={installing}
                className="rounded border border-black px-4 py-2 text-sm font-bold uppercase tracking-wide hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {installing
                  ? t("pwaInstall.installing", { fallback: "Opening..." })
                  : t("pwaInstall.installNow", { fallback: "Install App" })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
