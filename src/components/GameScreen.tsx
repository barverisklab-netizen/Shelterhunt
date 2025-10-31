import { motion, AnimatePresence } from 'motion/react';
import { Clock, Lightbulb, MapPin, X} from 'lucide-react';
import { MapView } from './MapView';
import { QuestionDrawer } from './QuestionDrawer';
import { CluesPanel } from './CluesPanel';
import { TriviaModal } from './TriviaModal';
import { GuessConfirmScreen } from './GuessConfirmScreen';
import { ShelterVictoryScreen } from './ShelterVictoryScreen';
import { ShelterPenaltyScreen } from './ShelterPenaltyScreen';
import { POI, Question, TriviaQuestion, Clue } from '../data/mockData';
import { defaultCityContext } from '../data/cityContext';
import { useState } from 'react';
import { toast } from "sonner@2.0.3";


interface GameScreenProps {
  pois: POI[];
  questions: Question[];
  triviaQuestions: TriviaQuestion[];
  playerLocation: { lat: number; lng: number };
  teamColor: 'red' | 'blue';
  timeRemaining: number;
  secretShelter?: { id: string; name: string } | null;
  shelterOptions: { id: string; name: string }[];
  isTimerCritical: boolean;
  onApplyPenalty: () => void;
  onEndGame: () => void;
  onLocationChange?: (location: { lat: number; lng: number }) => void;
  onSecretShelterChange?: (info: { id: string; name: string }) => void;
  onShelterOptionsChange?: (options: { id: string; name: string }[]) => void;
}

export function GameScreen({
  pois,
  questions,
  triviaQuestions,
  playerLocation,
  teamColor,
  timeRemaining,
  secretShelter,
  shelterOptions,
  isTimerCritical,
  onApplyPenalty,
  onEndGame,
  onLocationChange,
  onSecretShelterChange,
  onShelterOptionsChange,
}: GameScreenProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cluesOpen, setCluesOpen] = useState(false);
  const [triviaOpen, setTriviaOpen] = useState(false);
  const [currentTrivia, setCurrentTrivia] = useState<TriviaQuestion | null>(null);
  const [clues, setClues] = useState<Clue[]>([]);
  const [visitedPOIs, setVisitedPOIs] = useState<string[]>([]);
  const [lockedQuestions, setLockedQuestions] = useState<string[]>([]);
  const [nearbyPOI, setNearbyPOI] = useState<POI | null>(null);
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);
  const [confirmGuessOpen, setConfirmGuessOpen] = useState(false);
  const [outcome, setOutcome] = useState<'none' | 'win' | 'penalty'>('none');

  const normalizeName = (value?: string | null) =>
    (value ?? '').trim().toLowerCase();
  const secretPOI = secretShelter
    ? pois.find(
        (p) => normalizeName(p.name) === normalizeName(secretShelter.name)
      )
    : undefined;

  // Check if player is near a POI (simplified for demo)
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
    const randomTrivia = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    setCurrentTrivia(randomTrivia);
    setTriviaOpen(true);
  };

  const handleTriviaSubmit = (answerIndex: number) => {
    if (!currentTrivia) return;

    const isCorrect = answerIndex === currentTrivia.correctIndex;

    if (isCorrect) {
      // Generate a clue based on the secret shelter
      const clueTexts = [
        { text: `Surge rank is ${secretPOI?.surgeRank || 2}`, answer: true, category: 'Location' },
        { text: `Capacity is ${secretPOI?.capacity || 100}+ people`, answer: true, category: 'Capacity' },
        { text: `Not a fire station`, answer: false, category: 'Facility' },
        { text: `Has ${secretPOI?.nearbyParks || 2}+ nearby parks`, answer: true, category: 'Nearby' },
        { text: `Not in surge rank 4`, answer: false, category: 'Location' },
      ];
      
      const unusedClues = clueTexts.filter(
        c => !clues.some(existing => existing.text === c.text)
      );
      
      if (unusedClues.length > 0) {
        const newClue: Clue = {
          id: `clue-${Date.now()}`,
          ...unusedClues[0],
          timestamp: Date.now(),
        };
        setClues([...clues, newClue]);
      }
    } else {
      // Lock the question for 2 minutes (simplified for demo)
      setLockedQuestions([...lockedQuestions, currentTrivia.id]);
    }

    setTriviaOpen(false);
    setCurrentTrivia(null);
  };
  const selectedShelterOption = selectedShelterId
    ? shelterOptions.find((option) => option.id === selectedShelterId) ?? null
    : null;

  const timerContainerClasses = [
    "flex items-center gap-2 px-4 py-2 border rounded-full",
    isTimerCritical
      ? "bg-neutral-900 border-red-500 text-white animate-pulse"
      : "bg-neutral-100 border-neutral-900 text-neutral-900"
  ].join(" ");
  const timerTextClasses = isTimerCritical
    ? "tabular-nums font-bold text-white"
    : "tabular-nums font-bold text-neutral-900";
  const isGuessDisabled = !secretShelter || shelterOptions.length === 0;

  const handleGuessRequest = () => {
    if (isGuessDisabled) {
      return;
    }

    if (!selectedShelterOption) {
      toast.warning("Select a shelter before submitting a guess.");
      return;
    }

    if (!secretShelter) {
      toast.error("The secret shelter is still being prepared. Try again in a moment.");
      return;
    }

    setConfirmGuessOpen(true);
  };

  const resolveGuess = () => {
    setConfirmGuessOpen(false);

    if (!selectedShelterOption || !secretShelter) {
      toast.error("Unable to submit your guess right now. Please try again.");
      return;
    }

    const matches =
      selectedShelterOption.id === secretShelter.id ||
      normalizeName(selectedShelterOption.name) ===
        normalizeName(secretShelter.name);

    setCluesOpen(false);
    setSelectedShelterId(null);

    if (matches) {
      toast.success(`🎉 Correct! You found ${selectedShelterOption.name}!`);
      setOutcome('win');
    } else {
      toast.error(`Not ${secretShelter.name}. Timer reset to 10 minutes.`);
      onApplyPenalty();
      setOutcome('penalty');
    }
  };

  const handlePenaltyContinue = () => {
    setOutcome('none');
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-950">
      {/* Top Bar */}
      <motion.div
        className={`bg-background text-neutral-900 p-4 border-b border-neutral-900 ${
          teamColor === 'red'
            ? 'border-l-4 border-l-neutral-500'
            : 'border-l-4 border-l-neutral-900'
        }`}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onEndGame}
              className="rounded border-4 border-black bg-yellow-300 p-2 text-black shadow-sm transition-colors hover:bg-yellow-200"
              title="Exit to main menu"
            >
              <X className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-black uppercase">
              Secret Shelter
              {secretShelter?.name ? ` — ${secretShelter.name}` : ''}
            </h1>
          </div>

          <div className={timerContainerClasses}>
            <Clock className={`w-4 h-4 ${isTimerCritical ? 'text-red-600' : 'text-black'}`} />
            <span className={timerTextClasses}>
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <div className="text-black text-sm font-bold uppercase">
            {clues.length} clue{clues.length !== 1 ? 's' : ''}
          </div>
        </div>
      </motion.div>

      {/* Map Container */}
      <div className="flex-1 relative z-0">
        <MapView
          pois={pois}
          playerLocation={playerLocation}
          visitedPOIs={visitedPOIs}
          gameEnded={outcome === 'win'}
          onPOIClick={simulateMove}
          onSecretShelterChange={onSecretShelterChange}
          onShelterOptionsChange={onShelterOptionsChange}
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
        {nearbyPOI && outcome !== 'win' && (
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
                <div className="text-xs text-neutral-600 font-medium">Tap to ask questions</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
  
      {/* Question Drawer */}
      <QuestionDrawer
        questions={questions}
        availableCategories={defaultCityContext.questionCategories}
        isOpen={drawerOpen}
        onToggle={() => setDrawerOpen(!drawerOpen)}
        onAskQuestion={handleAskQuestion}
        nearbyPOI={nearbyPOI?.id || null}
        lockedQuestions={lockedQuestions}
      />

      {/* Trivia Modal */}
      <TriviaModal
        isOpen={triviaOpen}
        trivia={currentTrivia}
        onClose={() => setTriviaOpen(false)}
        onSubmit={handleTriviaSubmit}
      />

      {/* Clues Panel */}
      <CluesPanel
        isOpen={cluesOpen}
        clues={clues}
        onClose={() => setCluesOpen(false)}
        shelterOptions={shelterOptions}
        selectedShelterId={selectedShelterId}
        onShelterSelect={setSelectedShelterId}
        onGuessRequest={handleGuessRequest}
        isGuessDisabled={isGuessDisabled}
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
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {outcome === 'penalty' && (
          <ShelterPenaltyScreen
            key="penalty"
            onContinue={handlePenaltyContinue}
            onReturn={onEndGame}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
