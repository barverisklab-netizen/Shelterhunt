import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, MapPin, Brain, Lightbulb, Trophy, LucideIcon } from "lucide-react";
import { Button } from "./ui/button";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* --------------------------- Constants & Types --------------------------- */

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const STEPS: Readonly<Step[]> = [
  {
    icon: MapPin,
    title: "Visit Locations",
    description:
      "Move around the city to visit Points of Interest (POIs) marked on the map.",
  },
  {
    icon: Brain,
    title: "Answer Trivia",
    description:
      "When near a POI, ask questions and answer trivia challenges to unlock clues.",
  },
  {
    icon: Lightbulb,
    title: "Collect Clues",
    description:
      "Use correct answers to gather clues about the secret shelter's location and characteristics.",
  },
  {
    icon: Trophy,
    title: "Find the Shelter",
    description:
      "Use your clues to deduce which shelter is the secret one, then visit it to win!",
  },
];

const PRO_TIPS: Readonly<string[]> = [
  "Green clues tell you what the shelter HAS, red clues tell you what it DOESN'T have.",
  "Wrong trivia answers lock that question for 2 minutes—answer carefully!",
  "Visit different types of POIs to unlock more question categories.",
  "You only get ONE guess—make sure you're confident before submitting!",
  "Work with your team to cover more ground and share clues.",
];

/* ----------------------------- Anim Variants ---------------------------- */

const backDropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", damping: 26, stiffness: 250 },
  },
  exit: { opacity: 0, scale: 0.92, y: 20 },
};

const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.18 + i * 0.08 },
  }),
};

/* ----------------------------- Step Component --------------------------- */

function StepCard({ step, index }: { step: Step; index: number }) {
  const Icon = step.icon;
  return (
    <motion.div
      custom={index}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="bg-white border-4 border-black p-5"
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0 bg-black p-3 rounded" aria-hidden="true">
          {/* White icon for contrast on black background */}
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="text-sm font-bold text-gray-600">
              Step {index + 1}
            </span>
            <h4 className="text-lg font-bold uppercase text-black">
              {step.title}
            </h4>
          </div>
          <p className="text-sm text-gray-700">{step.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* --------------------------------- Modal -------------------------------- */

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();

  // Focus management: remember previous focus, focus close on open, restore on close
  React.useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      // Delay to ensure element exists
      const t = setTimeout(() => closeBtnRef.current?.focus(), 0);
      // Prevent body scroll
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
        clearTimeout(t);
        previouslyFocusedRef.current?.focus?.();
      };
    }
  }, [isOpen]);

  // ESC to close
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-white"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={backDropVariants}
            onClick={onClose}
          />

          {/* Modal wrapper (clicks inside shouldn't close) */}
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="pointer-events-auto w-full max-w-2xl"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={shouldReduceMotion ? { duration: 0 } : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-h-[90vh] overflow-y-auto border-4 border-black bg-white p-6">
                {/* Header */}
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h2
                      id={titleId}
                      className="mb-2 text-3xl font-bold uppercase text-black"
                    >
                      How to Play
                    </h2>
                    <p className="text-gray-600">
                      Master the art of urban deduction
                    </p>
                  </div>
                  <button
                    ref={closeBtnRef}
                    onClick={onClose}
                    aria-label="Close help modal"
                    className="border-4 border-black bg-white p-2 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <X className="h-5 w-5 text-black" />
                  </button>
                </div>

                {/* Game Overview */}
                <motion.div
                  className="mb-6 border-4 border-black bg-white p-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    shouldReduceMotion ? { duration: 0 } : { delay: 0.08 }
                  }
                >
                  <h3 className="mb-3 text-xl font-bold uppercase text-black">
                    Game Overview
                  </h3>
                  <p className="leading-relaxed text-gray-700">
                    A hurricane is approaching! Your team must find the secret
                    emergency shelter hidden in the city. Visit various
                    locations, answer trivia questions about disaster
                    preparedness, and collect clues to deduce which shelter is
                    the secret one. The first team to find it wins!
                  </p>
                </motion.div>

                {/* Steps */}
                <div className="mb-6 space-y-4">
                  {STEPS.map((step, i) => (
                    <StepCard key={step.title} step={step} index={i} />
                  ))}
                </div>

                {/* Tips */}
                <motion.div
                  className="border-4 border-black bg-white p-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    shouldReduceMotion ? { duration: 0 } : { delay: 0.16 }
                  }
                >
                  <h3 className="mb-4 flex items-center gap-2 text-xl font-bold uppercase text-black">
                    <Lightbulb
                      className="h-5 w-5 text-black"
                      aria-hidden="true"
                    />
                    Pro Tips
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {PRO_TIPS.map((tip) => (
                      <li key={tip} className="flex items-start gap-2">
                        <span className="mt-1 font-bold text-black">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Close Button */}
                <motion.div
                  className="mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={
                    shouldReduceMotion ? { duration: 0 } : { delay: 0.22 }
                  }
                >
                  <Button
                    onClick={onClose}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    Got It!
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
