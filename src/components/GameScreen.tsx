import { motion, AnimatePresence } from 'motion/react';
import { Clock, Lightbulb, MapPin, Home, Trophy, Frown, Navigation } from 'lucide-react';
import { Button } from './ui/button';
import { MapView } from './MapView';
import { QuestionDrawer } from './QuestionDrawer';
import { CluesPanel } from './CluesPanel';
import { TriviaModal } from './TriviaModal';
import { POI, Question, TriviaQuestion, Clue } from '../data/mockData';
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
  const [locationSelectorOpen, setLocationSelectorOpen] = useState(false);

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
    <div className="fixed inset-0 flex flex-col bg-gray-900">
      {/* Top Bar */}
      <motion.div
        className={`glass-strong p-4 border-b border-white/20 ${
          teamColor === 'red' ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-blue-400'
        }`}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">Secret Shelter</h1>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  teamColor === 'red' ? 'bg-red-400' : 'bg-blue-400'
                }`}
              />
              <span className="text-white/80 text-sm">
                {teamColor === 'red' ? 'Red' : 'Blue'} Team
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full">
            <Clock className="w-4 h-4 text-white" />
            <span className="text-white tabular-nums">
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <div className="text-white/80 text-sm">
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
        />

        {/* Floating Action Buttons */}
        <div className="absolute top-4 right-4 flex flex-col gap-3">
          <motion.button
            onClick={() => setCluesOpen(true)}
            className="glass-strong rounded-2xl p-4 shadow-glow hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Lightbulb className="w-6 h-6 text-yellow-400" />
            {clues.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center text-xs">
                {clues.length}
              </div>
            )}
          </motion.button>

          {canGuess && (
            <motion.button
              onClick={handleGuess}
              className="glass-strong rounded-2xl p-4 border-2 border-green-400/50 shadow-glow-green hover:scale-105 transition-transform pulse-glow"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Home className="w-6 h-6 text-green-400" />
            </motion.button>
          )}

          {/* Mock Location Selector Button */}
          <motion.button
            onClick={() => setLocationSelectorOpen(true)}
            className="glass-strong rounded-2xl p-4 shadow-glow hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Change Mock Location"
          >
            <Navigation className="w-6 h-6 text-cyan-400" />
          </motion.button>
        </div>

        {/* Location Status */}
        {nearbyPOI && !gameEnded && (
          <motion.div
            className="absolute top-4 left-4 glass-card rounded-2xl p-4 max-w-xs"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-white">{nearbyPOI.name}</div>
                <div className="text-xs text-white/60">Tap to ask questions</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Question Drawer */}
      <QuestionDrawer
        questions={questions}
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
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
              <motion.div
                className="w-full max-w-md glass-strong rounded-3xl p-8 text-center space-y-6"
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 20 }}
              >
                {gameResult === 'win' ? (
                  <>
                    <motion.div
                      className="inline-block glass-card rounded-full p-6"
                      animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5, repeat: 2 }}
                    >
                      <Trophy className="w-16 h-16 text-yellow-400" />
                    </motion.div>
                    <div>
                      <h2 className="text-4xl text-white mb-2">Victory! 🎉</h2>
                      <p className="text-white/80">You found the secret shelter!</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4 space-y-2 text-left">
                      <div className="flex justify-between text-white/80">
                        <span>Clues Collected:</span>
                        <span>{clues.length}</span>
                      </div>
                      <div className="flex justify-between text-white/80">
                        <span>Locations Visited:</span>
                        <span>{visitedPOIs.length}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="glass-card rounded-full p-6 inline-block">
                      <Frown className="w-16 h-16 text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-4xl text-white mb-2">Not Quite</h2>
                      <p className="text-white/80">That's not the shelter. Keep looking!</p>
                    </div>
                  </>
                )}
                <Button
                  onClick={onEndGame}
                  className="w-full glass-strong border-white/30 text-white py-4 rounded-2xl hover:bg-white/20"
                >
                  Return to Lobby
                </Button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Mock Location Selector Modal */}
      <AnimatePresence>
        {locationSelectorOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLocationSelectorOpen(false)}
          >
            <motion.div
              className="rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
              style={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', backdropFilter: 'blur(10px)' }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Navigation className="w-5 h-5" />
                  Mock Location
                </h3>
                <button
                  onClick={() => setLocationSelectorOpen(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              <p className="text-white/70 text-sm mb-4">Select a location to simulate being there:</p>
              <div className="space-y-2">
                {pois.map((poi) => (
                  <button
                    key={poi.id}
                    onClick={() => {
                      if (onLocationChange) {
                        onLocationChange({ lat: poi.lat, lng: poi.lng });
                      }
                      setLocationSelectorOpen(false);
                    }}
                    className="w-full glass-card rounded-xl p-4 text-left hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{poi.type === 'shelter' ? '🏠' : '📍'}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                          {poi.name}
                        </div>
                        <div className="text-xs text-white/60 mt-1">
                          {poi.type === 'shelter' ? 'Emergency Shelter' : 'Point of Interest'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
