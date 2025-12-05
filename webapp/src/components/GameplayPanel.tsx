import { AnimatePresence, motion } from "motion/react";
import { X, Lightbulb, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { LanguageToggle } from "./LanguageToggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Clue } from "@/types/game";
import { useI18n } from "@/i18n";

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
  onFilterByClue?: (clue: Clue) => void;
  onClearMapFilter?: () => void;
  isMapFilterActive?: boolean;
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
  onFilterByClue,
  onClearMapFilter,
  isMapFilterActive = false,
}: GameplayPanelProps) {
  const { t } = useI18n();
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
            className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-md flex-col border-neutral-900 bg-background"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <header className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-2 text-black">
                  <div className="bg-black p-3">
                    <Lightbulb className="h-12 w-12 text-black" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold uppercase">{t("gameplay.missionControl")}</h3>
                    <p className="text-sm text-black/70">
                      {t("gameplay.clueCount", {
                        replacements: {
                          count: clues.length,
                          suffix: clues.length === 1 ? "" : "s",
                        },
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onClose}
                  aria-label={t("gameplay.closePanel")}
                  className="px-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 ">
              <motion.div
                className="rounded border border-neutral-900 bg-neutral-50 p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-3 text-black">
                  <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-bold uppercase">
                      {t("gameplay.strategyTitle")}
                    </div>
                    <div className="space-y-1 text-xs text-black/70">
                      <p>• {t("gameplay.strategyTip1")}</p>
                      <p>• {t("gameplay.strategyTip2")}</p>
                      <p>• {t("gameplay.strategyTip3")}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <Accordion type="multiple" defaultValue={["clues"]} className="space-y-4">
                <AccordionItem
                  value="clues"
                  className="rounded border border-neutral-900 bg-neutral-100"
                >
                  <AccordionTrigger className="px-4 text-black">
                    <div className="flex w-full items-center justify-between text-sm font-bold uppercase tracking-wide">
                      <span>{t("gameplay.clues")}</span>
                      <span className="text-xs font-semibold text-black/60">
                        {t("gameplay.logged", { replacements: { count: clues.length } })}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-6">
                    <p className="mb-4 text-xs text-black/70">
                      {t("gameplay.clueHint")}
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
                            {t("gameplay.noCluesTitle")}
                          </div>
                          <p className="text-sm text-black/70">
                            {t("gameplay.noCluesSubtitle")}
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        {clues.map((clue, index) => (
                          <motion.div
                            key={clue.id}
                            className="rounded border p-4"
                            style={
                              clue.answer
                                ? {
                                    borderColor: "rgba(22, 163, 74, 0.35)",
                                    backgroundColor: "rgba(22, 163, 74, 0.08)",
                                  }
                                : {
                                    borderColor: "rgba(239, 68, 68, 0.5)",
                                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                                  }
                            }
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
                                  {clue.categoryId
                                    ? t(`questions.categories.${clue.categoryId}.name`, {
                                        fallback: clue.category,
                                      })
                                    : clue.category}
                                </div>
                                <div>
                                  {clue.questionId
                                    ? t(`questions.dynamic.${clue.questionId}.clue`, {
                                        fallback: clue.text,
                                      }).replace("{param}", `${clue.paramValue ?? ""}`)
                                    : clue.text}
                                </div>
                                {clue.answer && onFilterByClue && (
                                  <div className="mt-2 flex gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="text-xs font-semibold uppercase tracking-wide border border-black text-black hover:bg-neutral-200"
                                      onClick={() => {
                                        onFilterByClue(clue);
                                        onClose();
                                      }}
                                    >
                                      {t("gameplay.showInMap", { fallback: "Show in map" })}
                                    </Button>
                                    {isMapFilterActive && onClearMapFilter && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="text-xs font-semibold uppercase tracking-wide border border-black text-black hover:bg-neutral-200"
                                        onClick={onClearMapFilter}
                                      >
                                        {t("common.clear", { fallback: "Clear" })}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

{/* Measure tools */}
              <Accordion type="multiple" defaultValue={["tools", "guess"]} className="space-y-4">
                <AccordionItem
                  value="tools"
                  className="rounded border border-neutral-900 bg-neutral-100"
                >
                  <AccordionTrigger className="px-4 text-black">
                    <div className="flex w-full items-center justify-between text-sm font-bold uppercase tracking-wide">
                      <span>{t("gameplay.tools.title")}</span>
                      <span
                        className={`text-[10px] font-semibold uppercase ${
                          isMeasureActive ? "text-red-600" : "text-black/40"
                        }`}
                      >
                        {isMeasureActive
                          ? t("gameplay.tools.active")
                          : t("gameplay.tools.idle")}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-6">
                    <p className="mb-3 text-xs text-black/70">
                      {t("gameplay.tools.copy")}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        onClose();
                        onStartMeasure();
                      }}
                      className="w-full border border-black bg-white text-xs tracking-wide text-black transition-colors hover:bg-neutral-200 hover:text-black hover:border-black active:bg-neutral-800 active:text-black active:border-black disabled:border-neutral-400 disabled:text-black-40 disabled:bg-neutral-200"
                      disabled={isMeasureActive}
                    >
                      {isMeasureActive
                        ? t("gameplay.tools.activeButton")
                        : t("gameplay.tools.trigger")}
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
                      <span>{t("gameplay.finalDecision")}</span>
                      <span className="text-[10px] font-semibold uppercase text-black/60">
                        {t("gameplay.finalStep")}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 px-6 py-6">
                    <div className="space-y-2">
                      <label className="text-s font-semibold uppercase text-black/70 font-bold ">
                        {t("gameplay.selectShelter")}
                      </label>
                      <select
                        value={selectedShelterId ?? ""}
                        onChange={(event) => onShelterSelect(event.target.value || null)}
                        className="w-full rounded border border-neutral-700 bg-background p-2 text-sm font-semibold uppercase text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                      >
                        <option value="" disabled hidden>
                          {t("gameplay.selectPlaceholder")}
                        </option>
                        {shelterOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[11px] text-black/60">
                      {t("gameplay.guessWarning")}
                    </p>
                    <Button
                      onClick={onGuessRequest}
                      className="w-full border border-black bg-white text-black transition-colors hover:bg-neutral-200 hover:text-black hover:border-black active:bg-neutral-800 active:text-black active:border-black disabled:bg-neutral-200 disabled:text-black-40 disabled:border-neutral-400 disabled:opacity-100"
                      disabled={
                        isGuessDisabled || !selectedShelterId || !shelterOptions.length
                      }
                    >
                      {t("gameplay.submitGuess")}
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <LanguageToggle inline />
                  {isMapFilterActive && onClearMapFilter && (
                    <Button
                      type="button"
                      variant="outline"
                      className="border border-black text-black text-xs font-semibold uppercase tracking-wide hover:bg-neutral-200"
                      onClick={onClearMapFilter}
                    >
                      {t("gameplay.clearMapFilter", { fallback: "Show all shelters" })}
                    </Button>
                  )}
                </div>
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="default"
                  className="border border-black text-black transition-colors hover:bg-neutral-200 hover:text-black hover:border-black active:bg-neutral-800 active:text-black active:border-black disabled:bg-neutral-200 disabled:text-black-40 disabled:border-neutral-400 disabled:opacity-100"
                >
                  {t("gameplay.returnToMap")}
                </Button>
                
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
