import { motion, AnimatePresence } from 'motion/react';
import { Clock, Lightbulb, MapPin, X} from 'lucide-react';
import { MapView } from './MapView';
import { QuestionDrawer } from './QuestionDrawer';
import { GameplayPanel } from './GameplayPanel';
import { GuessConfirmScreen } from './GuessConfirmScreen';
import { ShelterVictoryScreen } from './ShelterVictoryScreen';
import { ShelterPenaltyScreen } from './ShelterPenaltyScreen';
import { POI, Question, Clue, QuestionAttribute } from "@/types/game";
import { defaultCityContext } from '../data/cityContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from "sonner@2.0.3";
import { BlurReveal } from './ui/blur-reveal';
import { useI18n } from "@/i18n";
import type { Shelter } from "@/services/shelterDataService";
import { ENABLE_WRONG_GUESS_PENALTY, LIGHTNING_RADIUS_KM } from "@/config/runtime";


const ENABLE_SECRET_SHELTER_BLUR = true;
const PROXIMITY_DISABLED_FOR_TESTING =
  import.meta.env?.VITE_ENABLE_PROXIMITY === "false";

export type WrongGuessStage = 'first' | 'second' | 'third';


interface GameScreenProps {
  pois: POI[];
  questionAttributes: QuestionAttribute[];
  shelters: Shelter[];
  playerLocation: { lat: number; lng: number };
  timeRemaining: number;
  secretShelter?: { id: string; name: string } | null;
  shelterOptions: { id: string; name: string }[];
  isTimerCritical: boolean;
  isTimerEnabled: boolean;
  onApplyPenalty: () => WrongGuessStage;
  onEndGame: () => void;
  onLocationChange?: (location: { lat: number; lng: number }) => void;
  onSecretShelterChange?: (info: { id: string; name: string }) => void;
  onShelterOptionsChange?: (options: { id: string; name: string }[]) => void;
  currentPlayerName?: string;
  currentPlayerId?: string;
  onMultiplayerWin?: (info: { winnerName: string; winnerUserId?: string }) => void;
  remoteOutcome?: { result: "win" | "lose"; winnerName?: string } | null;
  gameMode?: "lightning" | "citywide" | null;
  lightningCenter?: { lat: number; lng: number } | null;
  lightningRadiusKm?: number;
}

export function GameScreen({
  pois,
  questionAttributes,
  shelters,
  playerLocation,
  timeRemaining,
  secretShelter,
  shelterOptions,
  isTimerCritical,
  isTimerEnabled,
  onApplyPenalty,
  onEndGame,
  onLocationChange,
  onSecretShelterChange,
  onShelterOptionsChange,
  currentPlayerName,
  currentPlayerId,
  onMultiplayerWin,
  remoteOutcome,
  gameMode = null,
  lightningCenter = null,
  lightningRadiusKm,
}: GameScreenProps) {
  const { t } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cluesOpen, setCluesOpen] = useState(false);
  const [clues, setClues] = useState<Clue[]>([]);
  const [visitedPOIs, setVisitedPOIs] = useState<string[]>([]);
  const [nearbyPOI, setNearbyPOI] = useState<POI | null>(null);
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);
  const [confirmGuessOpen, setConfirmGuessOpen] = useState(false);
  const [outcome, setOutcome] = useState<'none' | 'win' | 'lose'>('none');
  const [measureTrigger, setMeasureTrigger] = useState(0);
  const [isMeasureActive, setIsMeasureActive] = useState(false);
  const [filteredPois, setFilteredPois] = useState<POI[] | null>(null);
  const [filterSource, setFilterSource] = useState<"correct" | "wrong" | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [penaltyStage, setPenaltyStage] = useState<WrongGuessStage | null>(null); // retained for compatibility
  const [wrongGuessCount, setWrongGuessCount] = useState(0);
  const [solvedQuestions, setSolvedQuestions] = useState<string[]>([]);
  const lastToastPoiId = useRef<string | null>(null);
  const [externalWinnerName, setExternalWinnerName] = useState<string | undefined>(undefined);
  const [activePanel, setActivePanel] = useState<"layers" | "questions" | "gameplay" | null>(
    null,
  );
  const [layerPanelCloseSignal, setLayerPanelCloseSignal] = useState(0);
  const DESIGNATED_CATEGORY = "designated ec";
  const normalizeValue = (value: unknown) =>
    typeof value === "number" ? String(value) : String(value ?? "").trim().toLowerCase();

  const closeLayerPanel = useCallback(() => {
    setLayerPanelCloseSignal((prev) => prev + 1);
  }, []);

  const activatePanel = useCallback(
    (panel: "layers" | "questions" | "gameplay" | null) => {
      if (panel !== "layers") {
        closeLayerPanel();
      }

      setDrawerOpen(panel === "questions");
      setCluesOpen(panel === "gameplay");
      setActivePanel(panel);
    },
    [closeLayerPanel],
  );

  useEffect(() => {
    if (isMeasureActive && activePanel === "questions") {
      activatePanel(null);
    }
  }, [activatePanel, activePanel, isMeasureActive]);

  useEffect(() => {
    if (!remoteOutcome) return;
    console.log("[GameScreen] remoteOutcome received", remoteOutcome);
    setOutcome(remoteOutcome.result);
    setExternalWinnerName(remoteOutcome.winnerName);
  }, [remoteOutcome]);

  const attributeCategoryMap: Record<string, Question["category"]> = {
    floodDepthRank: "location",
    floodDepth: "location",
    stormSurgeDepthRank: "location",
    stormSurgeDepth: "location",
    floodDurationRank: "location",
    floodDuration: "location",
    inlandWatersDepthRank: "location",
    inlandWatersDepth: "location",
    facilityType: "facility",
    shelterCapacity: "capacity",
    waterStation250m: "nearby",
    hospital250m: "nearby",
    aed250m: "nearby",
    emergencySupplyStorage250m: "nearby",
    communityCenter250m: "nearby",
    trainStation250m: "nearby",
    shrineTemple250m: "nearby",
    floodgate250m: "nearby",
    bridge250m: "nearby",
  };

  const buildQuestionTexts = (attribute: QuestionAttribute) => {
    const baseLabel = attribute.label;
    const defaultQuestion = (() => {
      if (attribute.kind === "number") {
        if (attribute.id.endsWith("250m")) {
          return `Are there {param} ${baseLabel}?`;
        }
        return `Is the ${baseLabel} {param}?`;
      }
      return `Is the ${baseLabel} {param}?`;
    })();
    const defaultClue = attribute.id.endsWith("250m")
      ? `There are {param} ${baseLabel}`
      : `The ${baseLabel} is {param}`;

    const questionText = t(`questions.dynamic.${attribute.id}.question`, {
      fallback: defaultQuestion,
    });
    const clueTemplate = t(`questions.dynamic.${attribute.id}.clue`, {
      fallback: defaultClue,
    });

    return { questionText, clueTemplate };
  };

  const normalizeName = (value?: string | null) =>
    (value ?? '').trim().toLowerCase();
  const secretShelterRecord = secretShelter
    ? shelters.find(
        (shelter) =>
          shelter.shareCode === secretShelter.id ||
          shelter.code === secretShelter.id ||
          normalizeName(shelter.nameEn ?? shelter.nameJp ?? shelter.externalId ?? shelter.id) ===
            normalizeName(secretShelter.name),
      )
    : undefined;
  const attributeValueLookup: Record<string, (shelter: Shelter) => string | number | null> = {
    floodDepthRank: (shelter) => shelter.floodDepthRank,
    floodDepth: (shelter) => shelter.floodDepth,
    stormSurgeDepthRank: (shelter) => shelter.stormSurgeDepthRank,
    stormSurgeDepth: (shelter) => shelter.stormSurgeDepth,
    floodDurationRank: (shelter) => shelter.floodDurationRank,
    floodDuration: (shelter) => shelter.floodDuration,
    inlandWatersDepthRank: (shelter) => shelter.inlandWatersDepthRank,
    inlandWatersDepth: (shelter) => shelter.inlandWatersDepth,
    facilityType: (shelter) => shelter.facilityType,
    shelterCapacity: (shelter) => shelter.shelterCapacity,
    waterStation250m: (shelter) => shelter.waterStation250m,
    hospital250m: (shelter) => shelter.hospital250m,
    aed250m: (shelter) => shelter.aed250m,
    emergencySupplyStorage250m: (shelter) => shelter.emergencySupplyStorage250m,
    communityCenter250m: (shelter) => shelter.communityCenter250m,
    trainStation250m: (shelter) => shelter.trainStation250m,
    shrineTemple250m: (shelter) => shelter.shrineTemple250m,
    floodgate250m: (shelter) => shelter.floodgate250m,
    bridge250m: (shelter) => shelter.bridge250m,
  };

  const handleApplyWrongClueFilter = () => {
    if (filterSource !== "correct" || !filteredPois) {
      toast.info(
        t("gameplay.filterUnavailable", {
          fallback: "Filter a correct clue first to remove wrong clues.",
        }),
      );
      return;
    }

    const wrongClues = clues.filter(
      (clue) => !clue.answer && clue.questionId && clue.paramValue != null,
    );
    if (!wrongClues.length) {
      toast.info(
        t("gameplay.filterUnavailable", {
          fallback: "No wrong clues available to filter.",
        }),
      );
      return;
    }

    const designatedShelters = shelters.filter(
      (shelter) =>
        typeof shelter.category === "string" &&
        shelter.category.toLowerCase() === DESIGNATED_CATEGORY,
    );

    const baseShelters = designatedShelters.filter((shelter) => {
      const sid = shelter.shareCode || shelter.code || shelter.id;
      return filteredPois.some((poi) => poi.id === sid);
    });

    const refinedShelters = baseShelters.filter((shelter) => {
      for (const clue of wrongClues) {
        const extractor = attributeValueLookup[clue.questionId as string];
        if (!extractor) continue;
        const value = extractor(shelter as any);
        if (normalizeValue(value) === normalizeValue(clue.paramValue)) {
          return false;
        }
      }
      return true;
    });

    if (!refinedShelters.length) {
      toast.error(
        t("gameplay.filterNoMatches", {
          fallback: "No shelters remain after removing wrong clues.",
        }),
      );
      return;
    }

    const refinedPois = refinedShelters
      .map<POI>((shelter) => ({
        id: shelter.shareCode || shelter.code || shelter.id,
        name: shelter.nameEn || shelter.nameJp || shelter.externalId || shelter.code,
        ...(shelter.nameEn ? { nameEn: shelter.nameEn } : {}),
        ...(shelter.nameJp ? { nameJp: shelter.nameJp } : {}),
        lat: Number(shelter.latitude),
        lng: Number(shelter.longitude),
        type: "shelter",
      }))
      .filter((poi) => Number.isFinite(poi.lat) && Number.isFinite(poi.lng) && poi.name);

    setFilteredPois(refinedPois);
    toast.success(
      t("gameplay.filteredWrongClues", {
        fallback: "Removed shelters matching wrong clues.",
      }),
    );
  };

  const getSecretAnswer = (attributeId: string): string | number | null => {
    if (!secretShelterRecord) return null;
    const extractor = attributeValueLookup[attributeId];
    if (!extractor) return null;
    return extractor(secretShelterRecord);
  };

  const questions: (Question & { clueTemplate?: string })[] = questionAttributes
    .filter((attribute) => !solvedQuestions.includes(attribute.id))
    .filter((attribute) => {
      const value = getSecretAnswer(attribute.id);
      return value !== null && value !== undefined;
    })
    .map((attribute) => {
      const { questionText, clueTemplate } = buildQuestionTexts(attribute);
      return {
        id: attribute.id,
        text: questionText,
        clueTemplate,
        category: attributeCategoryMap[attribute.id] ?? "location",
        paramType: attribute.kind === "number" ? "number" : "select",
        options: attribute.kind === "select" ? attribute.options : undefined,
      };
    });

  // Check if player is near a POI (simplified for dem #ToFix)
  const checkNearbyPOI = () => {
    const nearPOI = pois.find(poi => {
      const distance = Math.sqrt(
        Math.pow(poi.lat - playerLocation.lat, 2) + Math.pow(poi.lng - playerLocation.lng, 2)
      );
      return distance < 0.002; // Simulated radius
    });
    setNearbyPOI(nearPOI || null);
    if (nearPOI && !visitedPOIs.includes(nearPOI.id)) {
      setVisitedPOIs([...visitedPOIs, nearPOI.id]);
    }
  };

  // Simulate player movement (for demo)
  const simulateMove = (poi: POI) => {
    playerLocation.lat = poi.lat;
    playerLocation.lng = poi.lng;
    checkNearbyPOI();
  };

  const handleAskQuestion = (questionId: string, param: string | number) => {
    const question = questions.find((q) => q.id === questionId);
    const expected = getSecretAnswer(questionId);

    if (!question || expected === null || expected === undefined) {
      toast.error(
        t("game.toasts.submitError", {
          fallback: "Unable to check this clue right now.",
        }),
      );
      return;
    }

    const normalizeVal = (value: string | number | null | undefined) => {
      if (typeof value === "number") return value;
      return value ? value.toString().trim().toLowerCase() : "";
    };

    let isCorrect = false;
    const minCountIds = new Set([
      "waterStation250m",
      "hospital250m",
      "aed250m",
      "emergencySupplyStorage250m",
      "communityCenter250m",
      "trainStation250m",
      "shrineTemple250m",
      "floodgate250m",
      "bridge250m",
      "shelterCapacity",
    ]);
    const isMinCountQuestion = minCountIds.has(questionId);

    if (question.paramType === "number") {
      const numericGuess = Number(param);
      const numericExpected = Number(expected);
      isCorrect =
        Number.isFinite(numericGuess) &&
        Number.isFinite(numericExpected) &&
        (isMinCountQuestion ? numericGuess <= numericExpected : numericGuess === numericExpected);
    } else {
      isCorrect = normalizeVal(param) === normalizeVal(expected);
    }

    const clueTemplate =
      (question as Question & { clueTemplate?: string }).clueTemplate || question.text;
    const clueValue =
      isMinCountQuestion && typeof expected !== "undefined" && expected !== null
        ? expected
        : param ?? expected;
    const clueText = clueTemplate.replace("{param}", `${clueValue ?? ""}`);
    const categoryLabel =
      defaultCityContext.questionCategories.find((cat) => cat.id === question.category)
        ?.name ?? question.category;

    const newClue: Clue = {
      id: `clue-${Date.now()}`,
      text: clueText,
      answer: isCorrect,
      category: categoryLabel,
      categoryId: question.category,
      questionId: question.id,
      paramValue: clueValue,
      timestamp: Date.now(),
    };

    if (isCorrect) {
      setClues((prev) => [...prev, newClue]);
      setSolvedQuestions((prev) => (prev.includes(questionId) ? prev : [...prev, questionId]));
      toast.success(
        t("questions.correct", {
          fallback: "Correct clue unlocked!",
        }),
      );
    } else {
      setClues((prev) => [...prev, newClue]);
      toast.error(
        t("questions.incorrect", {
          fallback: "That clue was incorrect. Try another guess.",
        }),
      );
    }
  };
  const selectedShelterOption = selectedShelterId
    ? shelterOptions.find((option) => option.id === selectedShelterId) ?? null
    : null;

  useEffect(() => {
    if (PROXIMITY_DISABLED_FOR_TESTING) {
      if (lastToastPoiId.current !== "testing") {
        toast.info(
          t("game.tapToAsk", { fallback: "Tap to ask questions." }),
        );
        lastToastPoiId.current = "testing";
      }
      return;
    }

    if (nearbyPOI?.id && lastToastPoiId.current !== nearbyPOI.id) {
      toast.info(
        t("game.tapToAsk", { fallback: "Tap to ask questions." }),
      );
      lastToastPoiId.current = nearbyPOI.id;
    }
  }, [nearbyPOI, t]);

  const timerContainerClasses = [
    "flex items-center gap-2 px-4 py-2 border rounded-full",
    isTimerEnabled && isTimerCritical
      ? "bg-red-500/50 border-red-400/30 text-red-900 animate-pulse"
      : "bg-neutral-100 border-neutral-900 text-red-900"
  ].join(" ");
  const timerTextClasses = isTimerEnabled && isTimerCritical
    ? "tabular-nums font-bold text-black"
    : "tabular-nums font-bold text-black";
  const formattedTimer = `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60)
    .toString()
    .padStart(2, "0")}`;
  const isGuessDisabled = !secretShelter || shelterOptions.length === 0;

  const handleGuessRequest = () => {
    if (isGuessDisabled) {
      return;
    }

    if (!selectedShelterOption) {
      toast.warning(
        t("game.toasts.selectShelterFirst", {
          fallback: "Select a shelter before submitting a guess.",
        }),
      );
      return;
    }

    if (!secretShelter) {
      toast.error(
        t("game.toasts.shelterPreparing", {
          fallback: "The secret shelter is still being prepared. Try again in a moment.",
        }),
      );
      return;
    }

    setConfirmGuessOpen(true);
  };

  const resolveGuess = () => {
    setConfirmGuessOpen(false);

    if (!selectedShelterOption || !secretShelter) {
      toast.error(
        t("game.toasts.submitError", {
          fallback: "Unable to submit your guess right now. Please try again.",
        }),
      );
      return;
    }

    const matches =
      selectedShelterOption.id === secretShelter.id ||
      normalizeName(selectedShelterOption.name) ===
        normalizeName(secretShelter.name);

    activatePanel(null);
    setSelectedShelterId(null);

    if (matches) {
      toast.success(
        t("game.toasts.correctShelter", {
          fallback: "You found the correct shelter!",
        }),
      );
      setPenaltyStage(null);
      setWrongGuessCount(0);
      setOutcome('win');
      if (outcome !== "win") {
        setExternalWinnerName(undefined);
      }
      onMultiplayerWin?.({
        winnerName:
          currentPlayerName ||
          t("app.defaults.navigator", { fallback: "Navigator" }),
        winnerUserId: currentPlayerId,
      });
    } else {
      if (ENABLE_WRONG_GUESS_PENALTY) {
        const stage = onApplyPenalty ? onApplyPenalty() : "third";
        setPenaltyStage(stage);

        if (stage === "third") {
          toast.error(
            t("game.toasts.finalGuess", { fallback: "That was your final guess. Game over." }),
          );
          setOutcome("lose");
          return;
        }

        toast.error(
          stage === "first"
            ? t("game.toasts.penaltyFirst", { fallback: "Wrong guess! 2 guesses remaining." })
            : t("game.toasts.penaltySecond", { fallback: "Wrong guess! 1 guess remaining." }),
        );
        setOutcome("penalty");
      } else {
        const nextCount = wrongGuessCount + 1;
        setWrongGuessCount(nextCount);
        const stage: WrongGuessStage =
          nextCount === 1 ? "first" : nextCount === 2 ? "second" : "third";
        setPenaltyStage(stage);

        if (stage === "third") {
          toast.error(
            t("game.toasts.finalGuess", { fallback: "That was your final guess. Game over." }),
          );
          setOutcome("lose");
          return;
        }

        toast.error(
          stage === "first"
            ? t("game.toasts.penaltyFirst", { fallback: "Wrong guess! 2 guesses remaining." })
            : t("game.toasts.penaltySecond", { fallback: "Wrong guess! 1 guess remaining." }),
        );
        setOutcome("none");
      }
    }
  };

  const handlePenaltyContinue = () => {
    setOutcome('none');
    setPenaltyStage(null);
  };

  const handleStartMeasure = () => {
    activatePanel(null);
    setMeasureTrigger((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-950">
      {/* Top Bar */}
      <motion.div
        className="bg-background text-neutral-900 p-4 border-b border-neutral-900"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="rounded border-4 border-black bg-red-500 p-4 text-black shadow-sm transition-colors hover:bg-red-600"
              title={t("game.exitTitle")}
            >
              <X className="w-15 h-15" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-black uppercase">
                {t("game.secretShelter")}
              </h1>
              {secretShelter?.name ? (
                ENABLE_SECRET_SHELTER_BLUR ? (
                  <BlurReveal
                    className="text-sm font-semibold text-black/90"
                    aria-label={t("game.secretShelterName")}
                  >
                    {secretShelter.name}
                  </BlurReveal>
                ) : (
                  <span className="text-sm font-semibold text-black/90">
                    {secretShelter.name}
                  </span>
                )
              ) : null}
            </div>
          </div>

          {isTimerEnabled ? (
            <div className={timerContainerClasses}>
              <Clock className={`w-4 h-4 ${isTimerCritical ? 'text-red-600' : 'text-black'}`} />
              <span className={timerTextClasses}>{formattedTimer}</span>
            </div>
          ) : null}
        </div>
      </motion.div>

      {/* Map Container */}
      <div className="flex-1 relative z-0">
        <MapView
          pois={filteredPois ?? pois}
          playerLocation={playerLocation}
          visitedPOIs={visitedPOIs}
          gameEnded={outcome === 'win' || outcome === 'lose'}
          onPOIClick={simulateMove}
          onSecretShelterChange={onSecretShelterChange}
      onShelterOptionsChange={onShelterOptionsChange}
      measureTrigger={measureTrigger}
      onMeasurementActiveChange={setIsMeasureActive}
      isFiltered={Boolean(filteredPois)}
      gameMode={gameMode}
      lightningCenter={lightningCenter}
      lightningRadiusKm={lightningRadiusKm ?? LIGHTNING_RADIUS_KM}
      onLayerPanelToggle={(open) => {
        if (open) {
          activatePanel("layers");
        } else if (activePanel === "layers") {
          activatePanel(null);
        }
      }}
      layerPanelCloseSignal={layerPanelCloseSignal}
    />

        {/* Floating Action Buttons */}
        <div className="absolute top-4 right-4 flex flex-col gap-3">
          <motion.button
            onClick={() => activatePanel("gameplay")}
            className="relative flex items-center justify-center bg-background p-4 border border-neutral-900 shadow-md hover:scale-105 transition-transform rounded-full"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Lightbulb className="w-6 h-6 text-black" />
            {clues.length > 0 && (
              <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-neutral-900 bg-background text-xs font-bold text-neutral-900">
                {clues.length}
              </div>
            )}
          </motion.button>
        </div>

      </div>
  
      {/* Question Drawer */}
      {!isMeasureActive && (
        <QuestionDrawer
          questions={questions}
          availableCategories={defaultCityContext.questionCategories}
          isOpen={drawerOpen}
          onToggle={() => {
            const next = !drawerOpen;
            if (next) {
              activatePanel("questions");
            } else if (activePanel === "questions") {
              activatePanel(null);
            }
          }}
          onAskQuestion={handleAskQuestion}
          nearbyPOI={PROXIMITY_DISABLED_FOR_TESTING ? "testing-override" : nearbyPOI?.id || null}
          lockedQuestions={[]}
        />
      )}

      {/* Gameplay Panel */}
      <GameplayPanel
        isOpen={cluesOpen}
        clues={clues}
        onClose={() => activatePanel(null)}
        shelterOptions={shelterOptions}
        selectedShelterId={selectedShelterId}
        onShelterSelect={setSelectedShelterId}
        onGuessRequest={handleGuessRequest}
        isGuessDisabled={isGuessDisabled}
        onStartMeasure={handleStartMeasure}
        isMeasureActive={isMeasureActive}
        onFilterByClue={(clue) => {
          console.log("[ClueFilter] show in map clicked", clue);
          const id = clue.questionId;
          if (!id || clue.paramValue == null) {
            console.warn("[ClueFilter] Missing questionId or paramValue", { id, clue });
            toast.error(
              t("gameplay.filterUnavailable", {
                fallback: "Unable to filter map for this clue.",
              }),
            );
            return;
          }

          const extractor = attributeValueLookup[id];
          if (!extractor) {
            console.warn("[ClueFilter] No extractor for question", { id });
            toast.error(
              t("gameplay.filterUnavailable", {
                fallback: "Unable to filter map for this clue.",
              }),
            );
            return;
          }

          const target = normalizeValue(clue.paramValue);
          console.log("[ClueFilter] Target value", { target });

          const designatedShelters = shelters.filter(
            (shelter) =>
              typeof shelter.category === "string" &&
              shelter.category.toLowerCase() === DESIGNATED_CATEGORY,
          );

          const baseShelters =
            filteredPois && filteredPois.length
              ? designatedShelters.filter((shelter) => {
                  const sid = shelter.shareCode || shelter.code || shelter.id;
                  return filteredPois.some((poi) => poi.id === sid);
                })
              : designatedShelters;

          const matches = baseShelters
            .filter((shelter) => {
              const value = extractor(shelter as any);
              const match = normalizeValue(value) === target;
              if (match) {
                console.log("[ClueFilter] Shelter match", {
                  id: shelter.id,
                  code: shelter.code,
                  shareCode: shelter.shareCode,
                  name: shelter.nameEn || shelter.nameJp,
                  value,
                });
              }
              return match;
            })
            .map<POI>((shelter) => ({
              id: shelter.shareCode || shelter.code || shelter.id,
              name: shelter.nameEn || shelter.nameJp || shelter.externalId || shelter.code,
              // Preserve localized names for map labels
              ...(shelter.nameEn ? { nameEn: shelter.nameEn } : {}),
              ...(shelter.nameJp ? { nameJp: shelter.nameJp } : {}),
              lat: Number(shelter.latitude),
              lng: Number(shelter.longitude),
              type: "shelter",
            }))
            .filter(
              (poi) => Number.isFinite(poi.lat) && Number.isFinite(poi.lng) && poi.name,
            );

          if (!matches.length) {
            console.warn("[ClueFilter] No matches for clue", { clue, target });
            toast.error(
              t("gameplay.filterNoMatches", {
                fallback: "No shelters match this clue.",
              }),
            );
            return;
          }

          console.log("[ClueFilter] Applying map filter", { matches: matches.length });
          setFilteredPois(matches);
          setFilterSource(clue.answer ? "correct" : "wrong");
          activatePanel(null);
        }}
        onClearMapFilter={() => {
          setFilteredPois(null);
          setFilterSource(null);
        }}
        isMapFilterActive={Boolean(filteredPois)}
        onApplyWrongClueFilter={handleApplyWrongClueFilter}
        canApplyWrongClueFilter={Boolean(
          filteredPois && filterSource === "correct" && clues.some((clue) => !clue.answer),
        )}
      />

      <AnimatePresence>
        {confirmGuessOpen && selectedShelterOption && (
          <GuessConfirmScreen
            key="guess-confirm"
            shelterName={selectedShelterOption.name}
            onConfirm={resolveGuess}
            onCancel={() => setConfirmGuessOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {outcome === 'win' && (
          <ShelterVictoryScreen
            key="victory"
            shelterName={secretShelter?.name}
            clueCount={clues.length}
            onPlayAgain={onEndGame}
            result="win"
          />
        )}
        {outcome === 'lose' && (
          <ShelterVictoryScreen
            key="defeat"
            shelterName={secretShelter?.name}
            clueCount={clues.length}
            onPlayAgain={onEndGame}
            result="lose"
            winnerName={externalWinnerName}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {outcome === 'penalty' && penaltyStage && (
          <ShelterPenaltyScreen
            key="penalty"
            stage={penaltyStage}
            onContinue={handlePenaltyContinue}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm rounded-lg border-2 border-black bg-background p-6 text-black shadow-xl text-center"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
            >
              <h2 className="text-lg font-bold text-black uppercase mb-2">
                {t("game.exitConfirmTitle", { fallback: "Leave the game?" })}
              </h2>
              <p className="text-sm text-black mb-4">
                {t("game.exitConfirmBody", {
                  fallback: "Your progress in this match will be lost.",
                })}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  className="rounded border border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-neutral-100"
                  onClick={() => setShowExitConfirm(false)}
                >
                  {t("common.cancel", { fallback: "Cancel" })}
                </button>
                <button
                  className="rounded border border-black bg-red-500 px-4 py-2 text-sm font-bold text-black uppercase tracking-wide text-black shadow-sm hover:bg-red-600"
                  onClick={() => {
                    setShowExitConfirm(false);
                    onEndGame();
                  }}
                >
                  {t("game.exitConfirmLeave", { fallback: "Exit" })}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
