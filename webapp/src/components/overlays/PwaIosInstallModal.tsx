import { createPortal } from "react-dom";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useI18n } from "@/i18n";

interface PwaIosInstallModalProps {
  open: boolean;
  onSkip: () => void;
  onTimeoutClose: () => void;
  onAcknowledge: () => void;
}

export function PwaIosInstallModal({
  open,
  onSkip,
  onTimeoutClose,
  onAcknowledge,
}: PwaIosInstallModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const timeoutId = window.setTimeout(() => {
      onTimeoutClose();
    }, 10_000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onTimeoutClose, open]);

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
                {t("pwaInstallIos.title", { fallback: "Install on iPhone" })}
              </h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white">
                {t("pwaInstallIos.subtitle", {
                  fallback: "Save this app to your home screen in Safari.",
                })}
              </p>
            </div>

            <ol className="list-decimal space-y-1 pl-5 text-sm text-white">
              <li>
                {t("pwaInstallIos.step1", {
                  fallback: "Tap the Share button in Safari.",
                })}
              </li>
              <li>
                {t("pwaInstallIos.step2", {
                  fallback: "Scroll and choose Add to Home Screen.",
                })}
              </li>
              <li>
                {t("pwaInstallIos.step3", {
                  fallback: "Tap Add to finish installation.",
                })}
              </li>
            </ol>

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
                onClick={onAcknowledge}
                className="rounded border border-black px-4 py-2 text-sm font-bold uppercase tracking-wide hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("pwaInstallIos.gotIt", { fallback: "Got It" })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
