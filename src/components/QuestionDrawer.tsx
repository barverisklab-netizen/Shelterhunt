import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, Lock, Unlock, MapPin, Home, Users, Radar, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Question } from '../data/mockData';
import { QuestionCategory } from '../data/cityContext';
import { useState } from 'react';

interface QuestionDrawerProps {
  questions: Question[];
  availableCategories: QuestionCategory[];
  isOpen: boolean;
  onToggle: () => void;
  onAskQuestion: (questionId: string, param: string | number) => void;
  nearbyPOI: string | null;
  lockedQuestions: string[];
}

const CATEGORY_ICONS = {
  location: MapPin,
  facility: Home,
  nearby: Radar,
  capacity: Users
};

export function QuestionDrawer({
  questions,
  availableCategories = [],
  isOpen,
  onToggle,
  onAskQuestion,
  nearbyPOI,
  lockedQuestions
}: QuestionDrawerProps) {
  const [selectedParams, setSelectedParams] = useState<Record<string, string | number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isQuestionEligible = (question: Question) => {
    return nearbyPOI !== null && !lockedQuestions.includes(question.id);
  };

  const filteredQuestions = selectedCategory
    ? questions.filter(q => q.category === selectedCategory)
    : [];

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-40"
      initial={{ y: '100%' }}
      animate={{ y: isOpen ? 0 : 'calc(100% - 60px)' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    >
      <div className="glass-strong border-t border-white/20 rounded-t-3xl shadow-2xl">
        {/* Drawer Handle */}
        <button
          onClick={onToggle}
          className="w-full py-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors rounded-t-3xl"
        >
          <div className="w-12 h-1.5 rounded-full bg-white/30" />
          <div className="flex items-center gap-2 text-white">
            <MapPin className="w-5 h-5" />
            <span className="text-lg">Ask a Question</span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronUp className="w-5 h-5" />
            </motion.div>
          </div>
        </button>

        {/* Drawer Content */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="max-h-[60vh] overflow-y-auto p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Location Status */}
              <motion.div
                className={`mb-4 p-4 rounded-2xl ${
                  nearbyPOI
                    ? 'glass-card border-green-400/30'
                    : 'glass-card border-red-400/30'
                }`}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
              >
                <div className="flex items-center gap-3">
                  {nearbyPOI ? (
                    <>
                      <Unlock className="w-5 h-5 text-green-400" />
                      <div>
                        <div className="text-white">In Range</div>
                        <div className="text-sm text-white/60">You can ask questions at this location</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 text-red-400" />
                      <div>
                        <div className="text-white">Out of Range</div>
                        <div className="text-sm text-white/60">Visit a POI to unlock questions</div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Category Selection or Questions */}
              {!selectedCategory ? (
                // Show Categories
                <div className="space-y-3">
                  <h3 className="text-white font-semibold text-lg mb-3">Choose a Category</h3>
                  {availableCategories.map((category, index) => {
                    const IconComponent = CATEGORY_ICONS[category.id];
                    const questionsInCategory = questions.filter(q => q.category === category.id);
                    
                    return (
                      <motion.button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        disabled={!nearbyPOI}
                        className="w-full glass-card rounded-2xl p-4 text-left hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="glass-strong rounded-xl p-3">
                            <IconComponent className="w-6 h-6 text-cyan-400" />
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-semibold mb-1">{category.name}</div>
                            <div className="text-sm text-white/60 mb-2">{category.description}</div>
                            <div className="text-xs text-cyan-400">
                              {questionsInCategory.length} question{questionsInCategory.length !== 1 ? 's' : ''} available
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                // Show Questions in Selected Category
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setSelectedParams({});
                      }}
                      className="glass-card rounded-xl p-2 hover:bg-white/10 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <h3 className="text-white font-semibold text-lg">
                      {availableCategories.find(c => c.id === selectedCategory)?.name}
                    </h3>
                  </div>

                  {filteredQuestions.map((question, index) => {
                    const isEligible = isQuestionEligible(question);
                    const isLocked = lockedQuestions.includes(question.id);
                    const selectedParam = selectedParams[question.id];

                    return (
                      <motion.div
                        key={question.id}
                        className={`glass-card rounded-2xl p-4 space-y-3 ${
                          isLocked ? 'opacity-50' : ''
                        }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {/* Question Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="text-white">
                              {question.text.replace('{param}', '___')}
                            </div>
                          </div>
                          {isLocked && (
                            <Lock className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                        </div>

                        {/* Parameter Selection */}
                        {question.options && (
                          <div className="flex flex-wrap gap-2">
                            {question.options.map((option) => (
                              <button
                                key={option}
                                onClick={() =>
                                  setSelectedParams({ ...selectedParams, [question.id]: option })
                                }
                                disabled={!isEligible || isLocked}
                                className={`px-4 py-2 rounded-xl text-sm transition-all ${
                                  selectedParam === option
                                    ? 'glass-strong border-cyan-400/50 text-white shadow-glow'
                                    : 'glass border-white/20 text-white/80 hover:border-white/40'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Ask Button */}
                        <Button
                          onClick={() => {
                            if (selectedParam) {
                              onAskQuestion(question.id, selectedParam);
                            }
                          }}
                          disabled={!isEligible || !selectedParam || isLocked}
                          className={`w-full rounded-xl transition-all ${
                            isEligible && selectedParam && !isLocked
                              ? 'glass-strong border-green-400/50 text-white shadow-glow-green hover:bg-white/20'
                              : 'glass border-white/20 text-white/60'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isLocked ? (
                            'Locked - Answer Cooldown'
                          ) : isEligible && selectedParam ? (
                            <>
                              <Unlock className="w-4 h-4 mr-2" />
                              Ask Now
                            </>
                          ) : (
                            'Select parameter and visit location'
                          )}
                        </Button>

                        {isLocked && (
                          <div className="text-xs text-center text-red-400">
                            Try again in 2 minutes after a wrong answer
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
