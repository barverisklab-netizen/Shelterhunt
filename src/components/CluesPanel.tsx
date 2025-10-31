import { motion, AnimatePresence } from "motion/react";
import { X, Lightbulb, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Clue } from "../data/mockData";

interface CluesPanelProps {
  isOpen: boolean;
  clues: Clue[];
  onClose: () => void;
  shelterOptions: { id: string; name: string }[];
  selectedShelterId: string | null;
  onShelterSelect: (id: string | null) => void;
  onGuessRequest: () => void;
  isGuessDisabled?: boolean;
}

export function CluesPanel({
  isOpen,
  clues,
  onClose,
  shelterOptions,
  selectedShelterId,
  onShelterSelect,
  onGuessRequest,
  isGuessDisabled = false,
}: CluesPanelProps) {
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
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 w-full max-w-md z-50 flex flex-col bg-neutral-100"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="h-full flex flex-col border-l border-neutral-900 bg-background">
              {/* Header */}
              <div className="p-6 border-b border-neutral-900">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 text-black">
                    <div className="bg-black p-3">
                      <Lightbulb className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h3 className="text-2xl text-black font-bold uppercase">
                        My Clues
                      </h3>
                      <p className="text-sm text-black/70">
                        {clues.length} clue{clues.length !== 1 ? "s" : ""}{" "}
                        collected
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded border border-neutral-900 bg-background p-2 text-neutral-900 hover:bg-neutral-100 transition-colors"
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
                    <div className="bg-black p-6">
                      <Sparkles className="w-12 h-12 text-black" />
                    </div>
                    <div>
                      <div className="text-xl text-black mb-2 font-bold uppercase">
                        No clues yet
                      </div>
                      <div className="text-black/70 text-sm max-w-xs">
                        Visit locations and answer trivia questions to unlock
                        clues about the secret shelter
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {clues.map((clue, index) => (
                      <motion.div
                        key={clue.id}
                        className={`rounded border p-4 ${
                          clue.answer
                            ? "border-red-500 bg-background"
                            : "border-neutral-900 bg-background"
                        }`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 mt-1 ${
                              clue.answer ? "text-red-600" : "text-black"
                            }`}
                          >
                            {clue.answer ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <XCircle className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-black/70 mb-1 uppercase tracking-wide font-bold">
                              {clue.category}
                            </div>
                            <div className="text-black">{clue.text}</div>
                            <div className="text-sm text-black/60 mt-2">
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
                <div className="p-6 border-t border-neutral-900">
                  <motion.div
                    className="rounded border border-neutral-900 bg-neutral-50 p-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-start gap-3 text-black">
                      <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-black mb-1 font-bold uppercase">
                          Deduction Tips
                        </div>
                        <div className="text-xs text-black/70 space-y-1">
                          <p>• Use green clues to narrow down possibilities</p>
                          <p>• Red clues help eliminate wrong locations</p>
                          <p>• Visit the shelter when you're confident!</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Guess Controls */}
              <div className="p-6 border-t border-neutral-900 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-black font-bold uppercase">
                    Choose Your Shelter
                  </label>
                  <select
                    value={selectedShelterId ?? ""}
                    onChange={(event) =>
                      onShelterSelect(event.target.value || null)
                    }
                    className="w-full rounded border border-neutral-900 bg-background p-3 text-sm font-semibold uppercase text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                  >
                    <option value="" disabled hidden>
                      Select a shelter to guess
                    </option>
                    {shelterOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-black/70 font-semibold uppercase">
                  A wrong selection will reset your timer to 10 minutes. Make
                  sure you are confident before you lock in your guess.
                </div>

                <Button
                  onClick={onGuessRequest}
                  className="w-full rounded border border-neutral-900 bg-neutral-900 py-4 text-sm font-bold uppercase text-white hover:bg-neutral-800"
                  disabled={
                    isGuessDisabled || !selectedShelterId || !shelterOptions.length
                  }
                >
                  Submit Guess
                </Button>

                <Button
                  onClick={onClose}
                  variant="outline"
                  size="lg"
                  className="w-full font-semibold uppercase"
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
