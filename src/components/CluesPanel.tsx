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
            className="fixed inset-0 bauhaus-white/80 z-50"
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
            <div className="bauhaus-white h-full flex flex-col border-l-4 border-black">
              {/* Header */}
              <div className="p-6 border-b-4 border-black">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="bauhaus-white p-3">
                      <Lightbulb className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h3 className="text-2xl text-black font-bold uppercase">My Clues</h3>
                      <p className="text-sm text-gray-600">
                        {clues.length} clue{clues.length !== 1 ? 's' : ''} collected
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="bauhaus-white border-4 border-black p-2 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-black" />
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
                    <div className="bauhaus-white p-6">
                      <Sparkles className="w-12 h-12 text-black" />
                    </div>
                    <div>
                      <div className="text-xl text-black mb-2 font-bold uppercase">No clues yet</div>
                      <div className="text-gray-600 text-sm max-w-xs">
                        Visit locations and answer trivia questions to unlock clues about the secret shelter
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {clues.map((clue, index) => (
                      <motion.div
                        key={clue.id}
                        className={`bauhaus-white border-4 p-4 ${
                          clue.answer
                            ? 'border-red-600'
                            : 'border-black'
                        }`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 mt-1 ${
                              clue.answer ? 'text-red-600' : 'text-black'
                            }`}
                          >
                            {clue.answer ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <XCircle className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-600 mb-1 uppercase tracking-wide font-bold">
                              {clue.category}
                            </div>
                            <div className="text-black">{clue.text}</div>
                            <div className="text-sm text-gray-500 mt-2">
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
                <div className="p-6 border-t-4 border-black">
                  <motion.div
                    className="bauhaus-white border-4 border-black p-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-black mb-1 font-bold uppercase">Deduction Tips</div>
                        <div className="text-xs text-gray-600 space-y-1">
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
              <div className="p-6 border-t-4 border-black">
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="lg"
                  className="w-full"
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
