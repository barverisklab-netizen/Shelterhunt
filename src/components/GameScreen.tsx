import { motion, AnimatePresence } from 'motion/react';
import { Clock, Lightbulb, MapPin, Home, Trophy, Frown, Navigation, X } from 'lucide-react';
import { Button } from './ui/button';
import { MapView } from './MapView';
import { QuestionDrawer } from './QuestionDrawer';
import { CluesPanel } from './CluesPanel';
import { TriviaModal } from './TriviaModal';
import { POI, Question, TriviaQuestion, Clue } from '../data/mockData';
import { defaultCityContext } from '../data/cityContext';
import { useState } from 'react';

interface GameScreenProps {
  pois: POI[];
  questions: Question[];
  triviaQuestions: TriviaQuestion[];
  playerLocation: { lat: number; lng: number };
  teamColor: 'red' | 'blue';
  timeRemaining: number;
  secretShelterId: string;
  onGuessSubmit: (poiId: string) => void;
  onEndGame: () => void;
  onLocationChange?: (location: { lat: number; lng: number }) => void;
}

export function GameScreen({
  pois,
  questions,
  triviaQuestions,
  playerLocation,
  teamColor,
  timeRemaining,
  secretShelterId,
  onGuessSubmit,
  onEndGame,
  onLocationChange
}: GameScreenProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cluesOpen, setCluesOpen] = useState(false);
  const [triviaOpen, setTriviaOpen] = useState(false);
  const [currentTrivia, setCurrentTrivia] = useState<TriviaQuestion | null>(null);
  const [clues, setClues] = useState<Clue[]>([]);
  const [visitedPOIs, setVisitedPOIs] = useState<string[]>([]);
  const [lockedQuestions, setLockedQuestions] = useState<string[]>([]);
  const [nearbyPOI, setNearbyPOI] = useState<POI | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [locationPickerMode, setLocationPickerMode] = useState(false);

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
      const secretPOI = pois.find(p => p.id === secretShelterId);
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

  const handleGuess = () => {
    if (!nearbyPOI || hasGuessed) return;

    setHasGuessed(true);
    const isCorrect = nearbyPOI.id === secretShelterId;
    setGameResult(isCorrect ? 'win' : 'lose');
    setGameEnded(true);
    onGuessSubmit(nearbyPOI.id);
  };

  const canGuess = nearbyPOI?.type === 'shelter' && !hasGuessed;

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {/* Top Bar */}
      <motion.div
        className={`bauhaus-white p-4 border-b-4 border-black ${
          teamColor === 'red' ? 'border-l-4 border-l-red-600' : 'border-l-4 border-l-black'
        }`}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onEndGame}
              className="bauhaus-black p-2 border-4 border-black hover:bauhaus-red transition-colors"
              title="Exit to main menu"
            >
              <X className="w-5 h-5 text-black" />
            </button>
            <h1 className="text-xl font-bold text-black uppercase">Secret Shelter</h1>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 ${
                  teamColor === 'red' ? 'bg-red-600' : 'bg-black'
                }`}
              />
              <span className="text-black text-sm font-bold uppercase">
                {teamColor === 'red' ? 'Red' : 'Blue'} Team
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bauhaus-red px-4 py-2 border-4 border-black">
            <Clock className="w-4 h-4 text-black" />
            <span className="text-black tabular-nums font-bold">
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
          secretShelterId={secretShelterId}
          visitedPOIs={visitedPOIs}
          gameEnded={gameEnded}
          onPOIClick={simulateMove}
          locationPickerMode={locationPickerMode}
          onLocationPicked={(location) => {
            if (onLocationChange) {
              onLocationChange(location);
            }
            setLocationPickerMode(false);
          }}
          basemapUrl={defaultCityContext.mapConfig.basemapUrl}
        />

        {/* Floating Action Buttons */}
        <div className="absolute top-4 right-4 flex flex-col gap-3">
          <motion.button
            onClick={() => setCluesOpen(true)}
            className="bauhaus-white p-4 border-4 border-black bauhaus-shadow hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Lightbulb className="w-6 h-6 text-red-600" />
            {clues.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 border-4 border-black flex items-center justify-center text-xs font-bold text-white">
                {clues.length}
              </div>
            )}
          </motion.button>

          {canGuess && (
            <motion.button
              onClick={handleGuess}
              className="bauhaus-red p-4 border-4 border-black bauhaus-shadow hover:scale-105 transition-transform"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Home className="w-6 h-6 text-black" />
            </motion.button>
          )}

          {/* Mock Location Selector Button */}
          <motion.button
            onClick={() => setLocationPickerMode(!locationPickerMode)}
            className={`bauhaus-black p-4 border-4 border-black bauhaus-shadow hover:scale-105 transition-transform ${
              locationPickerMode ? 'border-red-600' : ''
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={locationPickerMode ? "Cancel location selection" : "Pick location on map"}
          >
            <Navigation className={`w-6 h-6 ${locationPickerMode ? 'text-red-600' : 'text-black'}`} />
          </motion.button>
        </div>

        {/* Location Status */}
        {nearbyPOI && !gameEnded && (
          <motion.div
            className="absolute top-4 left-4 bauhaus-white p-4 max-w-xs border-4 border-black bauhaus-shadow"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-black font-bold">{nearbyPOI.name}</div>
                <div className="text-xs text-black/70 font-semibold">Tap to ask questions</div>
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
      <CluesPanel isOpen={cluesOpen} clues={clues} onClose={() => setCluesOpen(false)} />

      {/* Game End Modal */}
      <AnimatePresence>
        {gameEnded && gameResult && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/90 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
              <motion.div
                className="w-full max-w-md bauhaus-white p-8 text-center space-y-6 border-4 border-black bauhaus-shadow"
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 20 }}
              >
                {gameResult === 'win' ? (
                  <>
                    <motion.div
                      className="inline-block bauhaus-red p-6 border-4 border-black"
                      animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5, repeat: 2 }}
                    >
                      <Trophy className="w-16 h-16 text-black" />
                    </motion.div>
                    <div>
                      <h2 className="text-4xl text-black mb-2 font-bold uppercase">Victory! 🎉</h2>
                      <p className="text-black font-semibold">You found the secret shelter!</p>
                    </div>
                    <div className="bauhaus-white border-4 border-black p-4 space-y-2 text-left">
                      <div className="flex justify-between text-black font-bold">
                        <span>Clues Collected:</span>
                        <span>{clues.length}</span>
                      </div>
                      <div className="flex justify-between text-black font-bold">
                        <span>Locations Visited:</span>
                        <span>{visitedPOIs.length}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bauhaus-black p-6 inline-block border-4 border-black">
                      <Frown className="w-16 h-16 text-black" />
                    </div>
                    <div>
                      <h2 className="text-4xl text-black mb-2 font-bold uppercase">Not Quite</h2>
                      <p className="text-black font-semibold">That's not the shelter. Keep looking!</p>
                    </div>
                  </>
                )}
                <Button
                  onClick={onEndGame}
                  className="w-full bauhaus-red border-4 border-black text-black py-4 hover:bauhaus-black bauhaus-shadow font-bold uppercase"
                >
                  Return to Lobby
                </Button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Location Picker Mode Indicator */}
      <AnimatePresence>
        {locationPickerMode && (
          <motion.div
            className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bauhaus-white px-6 py-3 pointer-events-none border-4 border-black bauhaus-shadow"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex items-center gap-2 text-black">
              <Navigation className="w-5 h-5 text-red-600" />
              <span className="font-bold uppercase">Click anywhere on the map to set your location</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
