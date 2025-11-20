import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { TriviaQuestion } from "@/types/game";
import { useState } from 'react';

interface TriviaModalProps {
  isOpen: boolean;
  trivia: TriviaQuestion | null;
  onClose: () => void;
  onSubmit: (answerIndex: number) => void;
}

export function TriviaModal({ isOpen, trivia, onClose, onSubmit }: TriviaModalProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSubmit = () => {
    if (selectedAnswer === null || !trivia) return;

    const correct = selectedAnswer === trivia.correctIndex;
    setIsCorrect(correct);
    setShowResult(true);

    setTimeout(() => {
      onSubmit(selectedAnswer);
      setShowResult(false);
      setSelectedAnswer(null);
    }, 2500);
  };

  const handleClose = () => {
    setSelectedAnswer(null);
    setShowResult(false);
    onClose();
  };

  if (!trivia) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/80 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
            <motion.div
              className="w-full max-w-lg pointer-events-auto"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
            >
              <div className="bg-background border-4 border-black p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-black p-3">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl text-black font-bold uppercase">Trivia Challenge</h3>
                      <p className="text-sm text-black/70">Answer correctly to unlock a clue</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    size="icon"
                    className="hover:bg-black/5 transition-colors"
                    aria-label="Close trivia"
                  >
                    <X className="w-5 h-5 text-black" />
                  </Button>
                </div>

                {/* Question */}
                <motion.div
                  className="bg-background border-4 border-black p-6 mb-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="text-lg text-black leading-relaxed font-bold">
                    {trivia.question}
                  </div>
                </motion.div>

                {/* Answers */}
                <div className="space-y-3 mb-6">
                  {trivia.answers.map((answer, index) => {
                    const isSelected = selectedAnswer === index;
                    const showCorrect = showResult && index === trivia.correctIndex;
                    const showWrong = showResult && isSelected && index !== trivia.correctIndex;

                    return (
                      <motion.button
                        key={index}
                        onClick={() => !showResult && setSelectedAnswer(index)}
                        disabled={showResult}
                        className={`w-full p-4 border-4 text-left transition-all ${
                          showCorrect
                            ? 'bg-background border-red-600'
                            : showWrong
                            ? 'bg-background border-black'
                            : isSelected
                            ? 'bg-black text-white border-black'
                            : 'bg-background text-black border-black hover:bg-black/5'
                        } disabled:cursor-not-allowed`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        whileHover={!showResult ? { scale: 1.01 } : {}}
                        whileTap={!showResult ? { scale: 0.99 } : {}}
                      >
                        <div className="flex items-center justify-between">
                          <span className={showCorrect || showWrong ? 'text-black' : ''}>{answer}</span>
                          {showCorrect && <CheckCircle className="w-5 h-5 text-red-600" />}
                          {showWrong && <XCircle className="w-5 h-5 text-black" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Result Message */}
                <AnimatePresence>
                  {showResult && (
                    <motion.div
                      className={`mb-6 p-4 border-4 ${
                        isCorrect
                          ? 'bg-background border-red-600'
                          : 'bg-background border-black'
                      }`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div className="flex items-center gap-3">
                        {isCorrect ? (
                          <>
                            <CheckCircle className="w-6 h-6 text-red-600" />
                            <div>
                              <div className="text-black font-bold uppercase">Correct! 🎉</div>
                              <div className="text-sm text-black/70">You unlocked a clue!</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-6 h-6 text-black" />
                            <div>
                              <div className="text-black font-bold uppercase">Incorrect</div>
                              <div className="text-sm text-black/70">This question is locked for 2 minutes</div>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                {!showResult && (
                  <Button
                    onClick={handleSubmit}
                    disabled={selectedAnswer === null}
                    variant="destructive"
                    size="lg"
                    className="w-full"
                  >
                    Submit Answer
                  </Button>
                )}
              </div>

              {/* Confetti Effect for Correct Answer */}
              <AnimatePresence>
                {showResult && isCorrect && (
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                          background: ['#DC2626', '#000000', '#FFFFFF'][i % 3],
                          left: `${50 + (Math.random() - 0.5) * 30}%`,
                          top: '50%',
                        }}
                        initial={{ opacity: 1, scale: 0 }}
                        animate={{
                          opacity: 0,
                          scale: 1,
                          x: (Math.random() - 0.5) * 200,
                          y: (Math.random() - 0.5) * 200,
                        }}
                        transition={{ duration: 1, delay: i * 0.02 }}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
