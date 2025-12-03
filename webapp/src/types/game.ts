export interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "shelter" | "fire_station" | "hospital" | "park" | "library" | "school";
  surgeRank?: number;
  capacity?: number;
  nearbyParks?: number;
}

export interface Question {
  id: string;
  text: string;
  category: "location" | "facility" | "nearby" | "capacity";
  paramType: "number" | "select";
  options?: (string | number)[];
  requiredPOIType?: string[];
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
