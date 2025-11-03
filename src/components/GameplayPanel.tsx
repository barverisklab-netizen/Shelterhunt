import { AnimatePresence, motion } from "motion/react";
import { X, Lightbulb, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Clue } from "../data/mockData";

interface GameplayPanelProps {
  isOpen: boolean;
  clues: Clue[];
  onClose: () => void;
  shelterOptions: { id: string; name: string }[];
  selectedShelterId: string | null;
  onShelterSelect: (id: string | null) => void;
  onGuessRequest: () => void;
  isGuessDisabled?: boolean;
  onStartMeasure: () => void;
  isMeasureActive?: boolean;
}

export function GameplayPanel({
  isOpen,
  clues,
  onClose,
  shelterOptions,
  selectedShelterId,
  onShelterSelect,
  onGuessRequest,
  isGuessDisabled = false,
  onStartMeasure,
  isMeasureActive = false,
}: GameplayPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-md flex-col border-l border-neutral-900 bg-background"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <header className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex gap-2 text-black">
                  <div className="bg-black p-3">
                    <Lightbulb className="h-12 w-12 text-black" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold uppercase">Mission Control</h3>
                    <p className="text-sm text-black/70">
                      {clues.length} clue{clues.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close gameplay panel"
                  className="px-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 ">
              <Accordion type="multiple" defaultValue={["clues"]} className="space-y-4">
                <AccordionItem
                  value="clues"
                  className="rounded border border-neutral-900 bg-neutral-100"
                >
                  <AccordionTrigger className="px-4 text-black">
                    <div className="flex w-full items-center justify-between text-sm font-bold uppercase tracking-wide">
                      <span>Clues</span>
                      <span className="text-xs font-semibold text-black/60">
                        {clues.length} logged
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-6">
                    <p className="mb-4 text-xs text-black/70">
                      Each clue narrows the possible shelters. Compare green
                      confirmations against red denials to deduce the right location.
                    </p>
                    {clues.length === 0 ? (
                      <motion.div
                        className="flex flex-col items-center justify-center gap-4 py-8 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="bg-black p-6">
                          <Sparkles className="h-12 w-12 text-black" />
                        </div>
                        <div>
                          <div className="mb-2 text-xl font-bold uppercase">
                            No clues yet
                          </div>
                          <p className="text-sm text-black/70">
                            Visit locations and answer trivia questions to unlock
                            intelligence about the secret shelter.
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        {clues.map((clue, index) => (
                          <motion.div
                            key={clue.id}
                            className={`rounded border p-4 ${
                              clue.answer
                                ? "border-green-600 bg-background"
                                : "border-red-500 bg-background"
                            }`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-1 flex-shrink-0 ${
                                  clue.answer ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {clue.answer ? (
                                  <CheckCircle className="h-5 w-5" />
                                ) : (
                                  <XCircle className="h-5 w-5" />
                                )}
                              </div>
                              <div className="flex-1 text-black">
                                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-black/70">
                                  {clue.category}
                                </div>
                                <div>{clue.text}</div>
                                <div className="mt-2 text-sm text-black/60">
                                  {new Date(clue.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {clues.length > 0 && (
                <motion.div
                  className="rounded border border-neutral-900 bg-neutral-50 p-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-start gap-3 text-black">
                    <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-bold uppercase">Strategy Tips</div>
                      <div className="space-y-1 text-xs text-black/70">
                        <p>• Use green clue markers to confirm correct attributes</p>
                        <p>• Red clue markers help you rule out bad candidates</p>
                        <p>• Stack multiple hints before locking in a guess</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

{/* Measure tools */}
              <Accordion type="multiple" defaultValue={["tools", "guess"]} className="space-y-4">
                <AccordionItem
                  value="tools"
                  className="rounded border border-neutral-900 bg-neutral-100"
                >
                  <AccordionTrigger className="px-4 text-black">
                    <div className="flex w-full items-center justify-between text-sm font-bold uppercase tracking-wide">
                      <span>Tools</span>
                      <span
                        className={`text-[10px] font-semibold uppercase ${
                          isMeasureActive ? "text-red-600" : "text-black/40"
                        }`}
                      >
                        {isMeasureActive ? "Active" : "Idle"}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-6">
                    <p className="mb-3 text-xs text-black/70">
                      Draw a search radius to inspect which shelters fall within a
                      chosen distance.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        onClose();
                        onStartMeasure();
                      }}
                      className="w-full border border-black bg-white text-xs tracking-wide text-black transition-colors hover:bg-neutral-200 hover:text-black hover:border-black active:bg-black active:text-white active:border-black disabled:border-neutral-400 disabled:text-neutral-500 disabled:bg-neutral-200"
                      disabled={isMeasureActive}
                    >
                      {isMeasureActive ? "Measurement Active" : "Measure Shelters Radius"}
                    </Button>
                  </AccordionContent>
                </AccordionItem>

{/* Shelter selection and guess submission */}
                <AccordionItem
                  value="guess"
                  className="rounded border border-neutral-900 bg-neutral-100"
                >
                  <AccordionTrigger className="px-4  text-black">
                    <div className="flex w-full items-center justify-between text-sm font-bold uppercase tracking-wide">
                      <span>Final Decision</span>
                      <span className="text-[10px] font-semibold uppercase text-black/60">
                        Final step
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 px-6 py-6">
                    <div className="space-y-2">
                      <label className="text-s font-semibold uppercase text-black/70 font-bold ">
                        Select target shelter
                      </label>
                      <select
                        value={selectedShelterId ?? ""}
                        onChange={(event) => onShelterSelect(event.target.value || null)}
                        className="w-full rounded border border-neutral-700 bg-background p-2 text-sm font-semibold uppercase text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                      >
                        <option value="" disabled hidden>
                          Select a shelter
                        </option>
                        {shelterOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[11px] text-black/60">
                      Wrong guesses reset the timer to <strong>10 minutes</strong>. Make
                      sure your clues line up before submitting.
                    </p>
                    <Button
                      onClick={onGuessRequest}
                      className="w-full border border-black bg-white text-black transition-colors hover:bg-neutral-200 hover:text-black hover:border-black active:bg-black active:text-white active:border-black disabled:bg-neutral-200 disabled:text-neutral-500 disabled:border-neutral-400 disabled:opacity-100"
                      disabled={
                        isGuessDisabled || !selectedShelterId || !shelterOptions.length
                      }
                    >
                      Submit Guess
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Button
                onClick={onClose}
                variant="outline"
                size="default"
                className="w-full font-semibold uppercase"
              >
                Return to Map
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
