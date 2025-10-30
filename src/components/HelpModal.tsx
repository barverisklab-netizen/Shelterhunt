import { motion, AnimatePresence } from "motion/react";
import { X, MapPin, Brain, Lightbulb, Trophy } from "lucide-react";
import { Button } from "./ui/button";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const steps = [
    {
      icon: MapPin,
      title: "Visit Locations",
      description:
        "Move around the city to visit Points of Interest (POIs) marked on the map.",
      color: "text-black",
    },
    {
      icon: Brain,
      title: "Answer Trivia",
      description:
        "When near a POI, ask questions and answer trivia challenges to unlock clues.",
      color: "text-black",
    },
    {
      icon: Lightbulb,
      title: "Collect Clues",
      description:
        "Use correct answers to gather clues about the secret shelter's location and characteristics.",
      color: "text-black",
    },
    {
      icon: Trophy,
      title: "Find the Shelter",
      description:
        "Use your clues to deduce which shelter is the secret one, then visit it to win!",
      color: "text-black",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bauhaus-white z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
            <motion.div
              className="w-full max-w-2xl pointer-events-auto"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 10 }}
              style={{
                backgroundColor: "#FFF", //FIXME: Use Bauhaus color variable
              }}
            >
              <div className="bauhaus-white border-4 border-black p-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-3xl text-black mb-2 font-bold uppercase">
                      How to Play
                    </h2>
                    <p className="text-black/70">
                      Master the art of urban deduction
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="bg-white border-4 border-black p-2 hover:bg-black/5 transition-colors"
                  >
                    <X className="w-5 h-5 text-black" />
                  </button>
                </div>

                {/* Game Overview */}
                <motion.div
                  className="bg-white border-4 border-black p-6 mb-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-xl text-black mb-3 font-bold uppercase">
                    Game Overview
                  </h3>
                  <p className="text-black/70 leading-relaxed">
                    A hurricane is approaching! Your team must find the secret
                    emergency shelter hidden in the city. Visit various
                    locations, answer trivia questions about disaster
                    preparedness, and collect clues to deduce which shelter is
                    the secret one. The first team to find it wins!
                  </p>
                </motion.div>

                {/* Steps */}
                <div className="space-y-4 mb-6">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <motion.div
                        key={index}
                        className="bg-white border-4 border-black p-5"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                      >
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 bg-black p-3">
                            <Icon className="w-6 h-6 text-black" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-black/70 text-sm font-bold">
                                Step {index + 1}
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
                  className="bg-white border-4 border-black p-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <h3 className="text-xl text-black mb-4 flex items-center gap-2 font-bold uppercase">
                    <Lightbulb className="w-5 h-5 text-black" />
                    Pro Tips
                  </h3>
                  <ul className="space-y-2 text-black/70 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-black mt-1 font-bold">•</span>
                      <span>
                        Green clues tell you what the shelter HAS, red clues
                        tell you what it DOESN'T have
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-black mt-1 font-bold">•</span>
                      <span>
                        Wrong trivia answers lock that question for 2 minutes -
                        answer carefully!
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-black mt-1 font-bold">•</span>
                      <span>
                        Visit different types of POIs to unlock more question
                        categories
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-black mt-1 font-bold">•</span>
                      <span>
                        You only get ONE guess - make sure you're confident
                        before submitting!
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-black mt-1 font-bold">•</span>
                      <span>
                        Work with your team to cover more ground and share clues
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
