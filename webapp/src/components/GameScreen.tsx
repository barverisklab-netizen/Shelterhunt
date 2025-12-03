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
import { useEffect, useState } from 'react';
import { toast } from "sonner@2.0.3";
import { BlurReveal } from './ui/blur-reveal';
import { useI18n } from "@/i18n";
import type { Shelter } from "@/services/shelterDataService";


const ENABLE_SECRET_SHELTER_BLUR = true;

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
}: GameScreenProps) {
  const { t } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cluesOpen, setCluesOpen] = useState(false);
  const [clues, setClues] = useState<Clue[]>([]);
  const [visitedPOIs, setVisitedPOIs] = useState<string[]>([]);
  const [nearbyPOI, setNearbyPOI] = useState<POI | null>(null);
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);
  const [confirmGuessOpen, setConfirmGuessOpen] = useState(false);
  const [outcome, setOutcome] = useState<'none' | 'win' | 'penalty' | 'lose'>('none');
  const [measureTrigger, setMeasureTrigger] = useState(0);
  const [isMeasureActive, setIsMeasureActive] = useState(false);
  const [penaltyStage, setPenaltyStage] = useState<WrongGuessStage | null>(null);
  const [solvedQuestions, setSolvedQuestions] = useState<string[]>([]);

  useEffect(() => {
    if (isMeasureActive) {
      setDrawerOpen(false);
    }
  }, [isMeasureActive]);

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

  const buildQuestionText = (attribute: QuestionAttribute) => {
    const baseLabel = attribute.label;
    if (attribute.kind === "number") {
      if (attribute.id.endsWith("250m")) {
        return `Are there {param} ${baseLabel}?`;
      }
      if (attribute.id.toLowerCase().includes("capacity")) {
        return `Is the ${baseLabel} {param}?`;
      }
      return `Is the ${baseLabel} {param}?`;
    }
    return `Is the ${baseLabel} ${"{param}"}?`;
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

  const getSecretAnswer = (attributeId: string): string | number | null => {
    if (!secretShelterRecord) return null;
    const extractor = attributeValueLookup[attributeId];
    if (!extractor) return null;
    return extractor(secretShelterRecord);
  };

  const questions: Question[] = questionAttributes
    .filter((attribute) => !solvedQuestions.includes(attribute.id))
    .filter((attribute) => {
      const value = getSecretAnswer(attribute.id);
      return value !== null && value !== undefined;
    })
    .map((attribute) => ({
      id: attribute.id,
      text: buildQuestionText(attribute),
      category: attributeCategoryMap[attribute.id] ?? "location",
      paramType: attribute.kind === "number" ? "number" : "select",
      options: attribute.kind === "select" ? attribute.options : undefined,
    }));

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
    if (question.paramType === "number") {
      const numericGuess = Number(param);
      const numericExpected = Number(expected);
      isCorrect = Number.isFinite(numericGuess) && numericGuess === numericExpected;
    } else {
      isCorrect = normalizeVal(param) === normalizeVal(expected);
    }

    const clueText = question.text.replace("{param}", `${param}`);
    const categoryLabel =
      defaultCityContext.questionCategories.find((cat) => cat.id === question.category)
        ?.name ?? question.category;

    const newClue: Clue = {
      id: `clue-${Date.now()}`,
      text: `${clueText} → ${expected}`,
      answer: isCorrect,
      category: categoryLabel,
      timestamp: Date.now(),
    };

    setClues((prev) => [...prev, newClue]);
    if (isCorrect) {
      setSolvedQuestions((prev) => (prev.includes(questionId) ? prev : [...prev, questionId]));
      toast.success(
        t("questions.correct", {
          fallback: "Correct clue unlocked!",
        }),
      );
    } else {
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

  const timerContainerClasses = [
    "flex items-center gap-2 px-4 py-2 border rounded-full",
    isTimerEnabled && isTimerCritical
      ? "bg-neutral-900 border-red-500 text-white animate-pulse"
      : "bg-neutral-100 border-neutral-900 text-neutral-900"
  ].join(" ");
  const timerTextClasses = isTimerEnabled && isTimerCritical
    ? "tabular-nums font-bold text-white"
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

    setCluesOpen(false);
    setSelectedShelterId(null);

    if (matches) {
      toast.success(
        t("game.toasts.correctShelter", {
          fallback: "You found the correct shelter!",
        }),
      );
      setPenaltyStage(null);
      setOutcome('win');
    } else {
      const stage = onApplyPenalty();
      if (stage === 'third') {
        setPenaltyStage(null);
        setOutcome('lose');
        return;
      }

      const penaltyMessage = stage === 'first'
        ? t("game.toasts.penaltyFirst", {
            fallback: "Wrong guess! Timer set to 10 minutes.",
          })
        : t("game.toasts.penaltySecond", {
            fallback: "Wrong guess! Timer set to 5 minutes.",
          });

      toast.error(penaltyMessage);
      setPenaltyStage(stage);
      setOutcome('penalty');
    }
  };

  const handlePenaltyContinue = () => {
    setOutcome('none');
    setPenaltyStage(null);
  };

  const handleStartMeasure = () => {
    setCluesOpen(false);
    setDrawerOpen(false);
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
              onClick={onEndGame}
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
          pois={pois}
          playerLocation={playerLocation}
          visitedPOIs={visitedPOIs}
          gameEnded={outcome === 'win' || outcome === 'lose'}
          onPOIClick={simulateMove}
          onSecretShelterChange={onSecretShelterChange}
          onShelterOptionsChange={onShelterOptionsChange}
          measureTrigger={measureTrigger}
          onMeasurementActiveChange={setIsMeasureActive}
        />

        {/* Floating Action Buttons */}
        <div className="absolute top-4 right-4 flex flex-col gap-3">
          <motion.button
            onClick={() => setCluesOpen(true)}
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

        {/* Location Status */}
        {nearbyPOI && outcome !== 'win' && outcome !== 'lose' && (
          <motion.div
            className="absolute top-4 left-4 max-w-xs rounded-xl border border-neutral-900 bg-background p-4 shadow-md"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-900 bg-neutral-100">
                  <MapPin className="w-5 h-5 text-neutral-800" />
                </div>
                <div>
                  <div className="text-neutral-900 font-semibold">{nearbyPOI.name}</div>
                  <div className="text-xs text-neutral-600 font-medium">
                    {t("game.tapToAsk")}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
      </div>
  
      {/* Question Drawer */}
      {!isMeasureActive && (
        <QuestionDrawer
          questions={questions}
          availableCategories={defaultCityContext.questionCategories}
          isOpen={drawerOpen}
          onToggle={() => setDrawerOpen(!drawerOpen)}
          onAskQuestion={handleAskQuestion}
          nearbyPOI={nearbyPOI?.id || null}
          lockedQuestions={[]}
        />
      )}

      {/* Gameplay Panel */}
      <GameplayPanel
        isOpen={cluesOpen}
        clues={clues}
        onClose={() => setCluesOpen(false)}
        shelterOptions={shelterOptions}
        selectedShelterId={selectedShelterId}
        onShelterSelect={setSelectedShelterId}
        onGuessRequest={handleGuessRequest}
        isGuessDisabled={isGuessDisabled}
        onStartMeasure={handleStartMeasure}
        isMeasureActive={isMeasureActive}
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
            visitedCount={visitedPOIs.length}
            onPlayAgain={onEndGame}
            result="win"
          />
        )}
        {outcome === 'lose' && (
          <ShelterVictoryScreen
            key="defeat"
            shelterName={secretShelter?.name}
            clueCount={clues.length}
            visitedCount={visitedPOIs.length}
            onPlayAgain={onEndGame}
            result="lose"
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

    </div>
  );
}
