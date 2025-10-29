import * as React from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronUp,
  Lock,
  Unlock,
  MapPin,
  Home,
  Users,
  Radar,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import { Question } from "../data/mockData";
import { QuestionCategory } from "../data/cityContext";

interface QuestionDrawerProps {
  questions: Question[];
  availableCategories: QuestionCategory[];
  isOpen: boolean;
  onToggle: () => void;
  onAskQuestion: (questionId: string, param: string | number) => void;
  nearbyPOI: string | null;
  lockedQuestions: string[];
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  location: MapPin,
  facility: Home,
  nearby: Radar,
  capacity: Users,
};

export function QuestionDrawer({
  questions,
  availableCategories = [],
  isOpen,
  onToggle,
  onAskQuestion,
  nearbyPOI,
  lockedQuestions,
}: QuestionDrawerProps) {
  const [selectedParams, setSelectedParams] = useState<
    Record<string, string | number>
  >({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isQuestionEligible = (question: Question) =>
    nearbyPOI !== null && !lockedQuestions.includes(question.id);

  const filteredQuestions = selectedCategory
    ? questions.filter((q) => q.category === selectedCategory)
    : [];

  // Render content into <body> to escape any transformed ancestor / stacking context
  const portalTarget = typeof window !== "undefined" ? document.body : null;

  const drawerUI = (
    <>
      {/* Solid white full-screen backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[9998] bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Bottom sheet drawer */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[9999]"
        initial={{ y: "100%" }}
        animate={{ y: isOpen ? 0 : "calc(100% - 60px)" }}
        transition={{ type: "spring", damping: 24, stiffness: 320 }}
      >
        <div className="bg-white border-t-4 border-black">
          {/* Drawer Handle */}
          <button
            onClick={onToggle}
            className="w-full py-4 flex flex-col items-center gap-2 cursor-pointer transition-colors hover:bg-gray-100 bg-white"
          >
            <div className="w-12 h-1 bg-white" />
            <div className="flex items-center gap-2 text-black">
              <MapPin className="w-5 h-5" />
              <span className="text-lg font-bold uppercase">
                Ask a Question
              </span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronUp className="w-5 h-5" />
              </motion.div>
            </div>
          </button>

          {/* Drawer Content */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="max-h-[60vh] overflow-y-auto p-4 bg-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Location Status */}
                <motion.div
                  className={`mb-4 p-4 border-4 bg-white ${
                    nearbyPOI ? "border-red-600" : "border-red-600"
                  }`}
                  initial={{ scale: 0.98 }}
                  animate={{ scale: 1 }}
                >
                  <div className="flex items-center gap-3">
                    {nearbyPOI ? (
                      <>
                        <Unlock className="w-5 h-5 text-red-600" />
                        <div>
                          <div className="text-black font-bold uppercase">
                            In Range
                          </div>
                          <div className="text-sm text-gray-600">
                            You can ask questions at this location
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 text-red-600" />
                        <div>
                          <div className="text-black font-bold uppercase">
                            Out of Range
                          </div>
                          <div className="text-sm text-gray-600">
                            Visit a POI to unlock questions
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>

                {/* Category Selection or Questions */}
                {!selectedCategory ? (
                  // Show Categories
                  <div className="space-y-3">
                    <h3 className="text-black font-bold text-lg mb-3 uppercase">
                      Choose a Category
                    </h3>
                    {availableCategories.map((category, index) => {
                      const IconComponent =
                        CATEGORY_ICONS[category.id] ?? MapPin;
                      const questionsInCategory = questions.filter(
                        (q) => q.category === category.id,
                      );

                      return (
                        <motion.button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          disabled={!nearbyPOI}
                          className="w-full bg-white border-4 border-black p-4 text-left transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.08 }}
                        >
                          <div className="flex items-start gap-4">
                            <div className="bg-white p-3">
                              <IconComponent className="w-6 h-6 text-black" />
                            </div>
                            <div className="flex-1">
                              <div className="text-black font-bold mb-1 uppercase">
                                {category.name}
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                {category.description}
                              </div>
                              <div className="text-xs text-black font-bold">
                                {questionsInCategory.length} question
                                {questionsInCategory.length !== 1
                                  ? "s"
                                  : ""}{" "}
                                available
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
                        className="bg-white border-4 border-black p-2 transition-colors hover:bg-gray-100"
                      >
                        <ArrowLeft className="w-5 h-5 text-black" />
                      </button>
                      <h3 className="text-black font-bold text-lg uppercase">
                        {
                          availableCategories.find(
                            (c) => c.id === selectedCategory,
                          )?.name
                        }
                      </h3>
                    </div>

                    {filteredQuestions.map((question, index) => {
                      const isEligible = isQuestionEligible(question);
                      const isLocked = lockedQuestions.includes(question.id);
                      const selectedParam = selectedParams[question.id];

                      return (
                        <motion.div
                          key={question.id}
                          className={`bg-white border-4 border-black p-4 space-y-3 ${isLocked ? "opacity-50" : ""}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          {/* Question Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="text-black">
                                {question.text.replace("{param}", "___")}
                              </div>
                            </div>
                            {isLocked && (
                              <Lock className="w-5 h-5 text-red-600 flex-shrink-0" />
                            )}
                          </div>

                          {/* Parameter Selection */}
                          {question.options && (
                            <div className="flex flex-wrap gap-2">
                              {question.options.map((option) => (
                                <button
                                  key={option}
                                  onClick={() =>
                                    setSelectedParams({
                                      ...selectedParams,
                                      [question.id]: option,
                                    })
                                  }
                                  disabled={!isEligible || isLocked}
                                  className={`px-4 py-2 border-3 text-sm transition-all bg-white text-black border-black ${
                                    selectedParam === option
                                      ? ""
                                      : "hover:bg-gray-100"
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
                            variant={
                              isEligible && selectedParam && !isLocked
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {isLocked ? (
                              "Locked - Answer Cooldown"
                            ) : isEligible && selectedParam ? (
                              <>
                                <Unlock className="w-4 h-4 mr-2" />
                                Ask Now
                              </>
                            ) : (
                              "Select parameter and visit location"
                            )}
                          </Button>

                          {isLocked && (
                            <div className="text-xs text-center text-red-600 font-bold">
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
    </>
  );

  if (!portalTarget) return null;
  return createPortal(drawerUI, portalTarget);
}
