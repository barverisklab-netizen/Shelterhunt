import { motion, AnimatePresence } from "motion/react";
import { X, MapPin, Brain, Lightbulb, Trophy } from "lucide-react";
import { Button } from "./ui/button";
import { useI18n } from "@/i18n";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { t } = useI18n();
  const steps = [
    {
      icon: MapPin,
      title: t("help.steps.visit"),
      description: t("help.steps.visitDesc"),
      color: "text-black",
    },
    {
      icon: Brain,
      title: t("help.steps.answer"),
      description: t("help.steps.answerDesc"),
      color: "text-black",
    },
    {
      icon: Lightbulb,
      title: t("help.steps.collect"),
      description: t("help.steps.collectDesc"),
      color: "text-black",
    },
    {
      icon: Trophy,
      title: t("help.steps.find"),
      description: t("help.steps.findDesc"),
      color: "text-black",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
            <motion.div
              className="w-full max-w-2xl pointer-events-auto rounded-lg border border-neutral-900 bg-background shadow-xl"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 10 }}
            >
              <div className="max-h-[90vh] overflow-y-auto p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-3xl text-black mb-2 font-bold uppercase">
                      {t("help.title")}
                    </h2>
                    <p className="text-black/70">
                      {t("help.subtitle")}
                    </p>
                  </div>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    size="icon"
                    className="hover:bg-neutral-100 transition-colors"
                    aria-label="Close help"
                  >
                    <X className="w-5 h-5 text-black" />
                  </Button>
                </div>

                {/* Game Overview */}
                <motion.div
                  className="mb-6 rounded border border-neutral-900 bg-neutral-50 p-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-xl text-black mb-3 font-bold uppercase">
                    {t("help.overviewTitle")}
                  </h3>
                  <p className="text-black/70 leading-relaxed">
                    {t("help.overviewBody")}
                  </p>
                </motion.div>

                {/* Steps */}
                <div className="space-y-4 mb-6">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <motion.div
                        key={index}
                        className="rounded border border-neutral-900 bg-background p-5"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                      >
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 rounded-full bg-neutral-900 p-3">
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                        <div className="flex items-center gap-3 mb-2">
                              <span className="text-black/70 text-sm font-bold">
                                {t("help.stepLabel", {
                                  replacements: { number: index + 1 },
                                })}
                              </span>
                              <h4 className="text-lg text-black font-bold uppercase">
                                {step.title}
                              </h4>
                            </div>
                            <p className="text-black/70 text-sm">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Tips */}
                <motion.div
                  className="rounded border border-neutral-900 bg-neutral-50 p-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <h3 className="text-xl text-black mb-4 flex items-center gap-2 font-bold uppercase">
                    <Lightbulb className="w-5 h-5 text-black" />
                    {t("help.proTips")}
                  </h3>
                  <ul className="space-y-2 text-black/70 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-black mt-1 font-bold">•</span>
                      <span>
                        {t("help.tips.greenRed")}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-black mt-1 font-bold">•</span>
                      <span>
                        {t("help.tips.cooldown")}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-black mt-1 font-bold">•</span>
                      <span>
                        {t("help.tips.visitPoi")}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-black mt-1 font-bold">•</span>
                      <span>
                        {t("help.tips.oneGuess")}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-black mt-1 font-bold">•</span>
                      <span>
                        {t("help.tips.teamwork")}
                      </span>
                    </li>
                  </ul>
                </motion.div>

                {/* Close Button */}
                <motion.div
                  className="mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button
                    onClick={onClose}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    {t("common.continue")}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
