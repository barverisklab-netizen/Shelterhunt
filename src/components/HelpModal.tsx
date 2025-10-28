import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Brain, Lightbulb, Trophy } from 'lucide-react';
import { Button } from './ui/button';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const steps = [
    {
      icon: MapPin,
      title: 'Visit Locations',
      description: 'Move around the city to visit Points of Interest (POIs) marked on the map.',
      color: 'text-cyan-400'
    },
    {
      icon: Brain,
      title: 'Answer Trivia',
      description: 'When near a POI, ask questions and answer trivia challenges to unlock clues.',
      color: 'text-purple-400'
    },
    {
      icon: Lightbulb,
      title: 'Collect Clues',
      description: 'Use correct answers to gather clues about the secret shelter\'s location and characteristics.',
      color: 'text-yellow-400'
    },
    {
      icon: Trophy,
      title: 'Find the Shelter',
      description: 'Use your clues to deduce which shelter is the secret one, then visit it to win!',
      color: 'text-green-400'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
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
              transition={{ type: 'spring', damping: 25 }}
            >
              <div className="glass-strong rounded-3xl p-6 shadow-2xl border border-white/30 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-3xl gradient-text mb-2">How to Play</h2>
                    <p className="text-white/80">Master the art of urban deduction</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="glass rounded-full p-2 hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-white/80" />
                  </button>
                </div>

                {/* Game Overview */}
                <motion.div
                  className="glass-card rounded-2xl p-6 mb-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-xl text-white mb-3">Game Overview</h3>
                  <p className="text-white/80 leading-relaxed">
                    A hurricane is approaching! Your team must find the secret emergency shelter hidden in the city. 
                    Visit various locations, answer trivia questions about disaster preparedness, and collect clues 
                    to deduce which shelter is the secret one. The first team to find it wins!
                  </p>
                </motion.div>

                {/* Steps */}
                <div className="space-y-4 mb-6">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <motion.div
                        key={index}
                        className="glass-card rounded-2xl p-5"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                      >
                        <div className="flex gap-4">
                          <div className={`flex-shrink-0 glass rounded-2xl p-3 ${step.color}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-white/40 text-sm">Step {index + 1}</span>
                              <h4 className="text-lg text-white">{step.title}</h4>
                            </div>
                            <p className="text-white/70 text-sm">{step.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Tips */}
                <motion.div
                  className="glass-card rounded-2xl p-6 border-cyan-400/30"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <h3 className="text-xl text-white mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    Pro Tips
                  </h3>
                  <ul className="space-y-2 text-white/80 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">•</span>
                      <span>Green clues tell you what the shelter HAS, red clues tell you what it DOESN'T have</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">•</span>
                      <span>Wrong trivia answers lock that question for 2 minutes - answer carefully!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">•</span>
                      <span>Visit different types of POIs to unlock more question categories</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">•</span>
                      <span>You only get ONE guess - make sure you're confident before submitting!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">•</span>
                      <span>Work with your team to cover more ground and share clues</span>
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
                    className="w-full glass-strong border-white/30 text-white py-4 rounded-2xl hover:bg-white/20"
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
