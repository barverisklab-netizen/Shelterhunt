export interface POI {
  id: string;
  name: string;
  nameEn?: string | null;
  nameJp?: string | null;
  lat: number;
  lng: number;
  type: "shelter" | "fire_station" | "hospital" | "park" | "library" | "school";
  properties?: Record<string, string | number | null>;
}

export interface Question {
  id: string;
  text: string;
  category: string;
  paramType: "number" | "select";
  options?: (string | number)[];
  requiredPOIType?: string[];
  evaluationMode?: "equals" | "atMost";
}

export interface TriviaQuestion {
  id: string;
  question: string;
  answers: string[];
  correctIndex: number;
}

export interface Player {
  id: string;
  name: string;
  ready: boolean;
}

export interface Clue {
  id: string;
  text: string;
  answer: boolean;
  category: string;
  categoryId?: string;
  questionId?: string;
  paramValue?: string | number | null;
  timestamp: number;
}

export interface QuestionAttribute {
  id: string;
  label: string;
  kind: "number" | "select";
  options?: (string | number)[];
}

export type ShelterAnswerValue = string | number | null;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ShelterOption {
  id: string;
  name: string;
}

export interface SecretShelterInfo extends ShelterOption {}

export interface MultiplayerWinInfo {
  winnerName: string;
  winnerUserId?: string;
}

export interface RemoteOutcome {
  result: "win" | "lose";
  winnerName?: string;
}

export interface OtherPlayerLocation {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  isStale: boolean;
}

export type WrongGuessStage = "first" | "second" | "third";

export type GameOutcome = "none" | "win" | "lose" | "penalty";

export interface SessionOwnedGameContract {
  playerLocation: LatLng;
  timeRemaining: number;
  timerEnabled: boolean;
  isTimerCritical: boolean;
  wrongGuessCount: number;
  remoteOutcome: RemoteOutcome | null;
  resumeId: string;
}

export interface GameplayOwnedStateContract {
  clues: Clue[];
  visitedPOIs: string[];
  filteredPois: POI[] | null;
  filterSource: "correct" | "wrong" | null;
  selectedShelterId: string | null;
  solvedQuestions: string[];
  solvedNearbyAmenityKeys: string[];
  questionCooldowns: Record<string, number>;
  outcome: GameOutcome;
}
