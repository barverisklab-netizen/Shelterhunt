import { motion, AnimatePresence } from 'motion/react';
import { X, Lightbulb, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Clue } from '../data/mockData';

interface CluesPanelProps {
  isOpen: boolean;
  clues: Clue[];
  onClose: () => void;
}

export function CluesPanel({ isOpen, clues, onClose }: CluesPanelProps) {
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

          {/* Panel */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 w-full max-w-md z-50 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="glass-strong h-full flex flex-col border-l border-white/20">
              {/* Header */}
              <div className="p-6 border-b border-white/20">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="glass-card rounded-2xl p-3">
                      <Lightbulb className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl text-white">My Clues</h3>
                      <p className="text-sm text-white/60">
                        {clues.length} clue{clues.length !== 1 ? 's' : ''} collected
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="glass rounded-full p-2 hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-white/80" />
                  </button>
                </div>
              </div>

              {/* Clues List */}
              <div className="flex-1 overflow-y-auto p-6">
                {clues.length === 0 ? (
                  <motion.div
                    className="flex flex-col items-center justify-center h-full text-center space-y-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="glass-card rounded-full p-6">
                      <Sparkles className="w-12 h-12 text-white/40" />
                    </div>
                    <div>
                      <div className="text-xl text-white mb-2">No clues yet</div>
                      <div className="text-white/60 text-sm max-w-xs">
                        Visit locations and answer trivia questions to unlock clues about the secret shelter
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {clues.map((clue, index) => (
                      <motion.div
                        key={clue.id}
                        className={`glass-card rounded-2xl p-4 ${
                          clue.answer
                            ? 'border-green-400/30 bg-green-500/5'
                            : 'border-red-400/30 bg-red-500/5'
                        }`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 mt-1 ${
                              clue.answer ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {clue.answer ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <XCircle className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-white/60 mb-1 uppercase tracking-wide">
                              {clue.category}
                            </div>
                            <div className="text-white">{clue.text}</div>
                            <div className="text-sm text-white/50 mt-2">
                              {new Date(clue.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tips Section */}
              {clues.length > 0 && (
                <div className="p-6 border-t border-white/20">
                  <motion.div
                    className="glass-card rounded-2xl p-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-white mb-1">Deduction Tips</div>
                        <div className="text-xs text-white/70 space-y-1">
                          <p>• Use green clues to narrow down possibilities</p>
                          <p>• Red clues help eliminate wrong locations</p>
                          <p>• Visit the shelter when you're confident!</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Back Button */}
              <div className="p-6 border-t border-white/20">
                <Button
                  onClick={onClose}
                  className="w-full glass-strong border-white/30 text-white py-4 rounded-2xl hover:bg-white/20"
                >
                  Back to Map
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
