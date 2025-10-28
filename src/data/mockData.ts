export interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'shelter' | 'fire_station' | 'hospital' | 'park' | 'library' | 'school';
  surgeRank?: number;
  capacity?: number;
  nearbyParks?: number;
}

export interface Question {
  id: string;
  text: string;
  category: 'location' | 'facility' | 'nearby' | 'capacity';
  paramType: 'number' | 'select';
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
  team: 'red' | 'blue';
  avatar: string;
  ready: boolean;
}

export interface Clue {
  id: string;
  text: string;
  answer: boolean;
  category: string;
  timestamp: number;
}

export const mockPOIs: POI[] = [
  { id: 'poi1', name: 'Central Fire Station', lat: 42.370, lng: -71.033, type: 'fire_station', surgeRank: 1 },
  { id: 'poi2', name: 'City Hospital', lat: 42.368, lng: -71.035, type: 'hospital', surgeRank: 2 },
  { id: 'poi3', name: 'Riverside Park', lat: 42.372, lng: -71.030, type: 'park', surgeRank: 3 },
  { id: 'poi4', name: 'Downtown Library', lat: 42.371, lng: -71.032, type: 'library', surgeRank: 2, capacity: 150 },
  { id: 'poi5', name: 'Lincoln Elementary', lat: 42.369, lng: -71.034, type: 'school', surgeRank: 1, capacity: 200 },
  { id: 'poi6', name: 'Community Center Shelter', lat: 42.373, lng: -71.029, type: 'shelter', surgeRank: 2, capacity: 120, nearbyParks: 3 },
  { id: 'poi7', name: 'Memorial Park', lat: 42.367, lng: -71.031, type: 'park', surgeRank: 2 },
  { id: 'poi8', name: 'Northside Fire Station', lat: 42.374, lng: -71.028, type: 'fire_station', surgeRank: 3 },
  { id: 'poi9', name: 'Harbor View Shelter', lat: 42.366, lng: -71.036, type: 'shelter', surgeRank: 4, capacity: 80, nearbyParks: 1 },
  { id: 'poi10', name: 'Greenfield Park', lat: 42.375, lng: -71.027, type: 'park', surgeRank: 1 },
];

export const mockQuestions: Question[] = [
  {
    id: 'q1',
    text: 'Is the surge inundation rank {param}?',
    category: 'location',
    paramType: 'select',
    options: [1, 2, 3, 4],
    requiredPOIType: ['shelter', 'fire_station', 'hospital', 'library']
  },
  {
    id: 'q2',
    text: 'Is the shelter type a {param}?',
    category: 'facility',
    paramType: 'select',
    options: ['library', 'school', 'community center', 'hospital'],
    requiredPOIType: ['shelter', 'library', 'school', 'hospital']
  },
  {
    id: 'q3',
    text: 'Are there more than {param} parks within 250m?',
    category: 'nearby',
    paramType: 'select',
    options: [1, 2, 3, 4],
    requiredPOIType: ['shelter', 'park']
  },
  {
    id: 'q4',
    text: 'Can the shelter accommodate more than {param} people?',
    category: 'capacity',
    paramType: 'select',
    options: [50, 100, 150, 200],
    requiredPOIType: ['shelter', 'school', 'library']
  },
];

export const mockTriviaQuestions: TriviaQuestion[] = [
  {
    id: 't1',
    question: 'What year was the Great Boston Fire?',
    answers: ['1872', '1905', '1845', '1889'],
    correctIndex: 0
  },
  {
    id: 't2',
    question: 'What is the recommended emergency water supply per person per day?',
    answers: ['1 liter', '2 liters', '3 liters', '4 liters'],
    correctIndex: 2
  },
  {
    id: 't3',
    question: 'Which hurricane category indicates sustained winds of 111-129 mph?',
    answers: ['Category 2', 'Category 3', 'Category 4', 'Category 5'],
    correctIndex: 1
  },
  {
    id: 't4',
    question: 'What does FEMA stand for?',
    answers: ['Federal Emergency Management Agency', 'Fire and Emergency Management Authority', 'Federal Environmental Monitoring Agency', 'First Emergency Medical Aid'],
    correctIndex: 0
  },
  {
    id: 't5',
    question: 'How long can a person typically survive without water?',
    answers: ['1 day', '3 days', '7 days', '14 days'],
    correctIndex: 1
  },
  {
    id: 't6',
    question: 'What is the universal emergency number in the United States?',
    answers: ['999', '111', '911', '112'],
    correctIndex: 2
  },
  {
    id: 't7',
    question: 'Which floor is generally safest during a hurricane?',
    answers: ['Basement', 'Ground floor', 'Second floor', 'Top floor'],
    correctIndex: 2
  },
  {
    id: 't8',
    question: 'What percentage of the human body is water?',
    answers: ['50%', '60%', '70%', '80%'],
    correctIndex: 1
  },
];

export const mockPlayers: Player[] = [
  { id: 'p1', name: 'Alex Storm', team: 'red', avatar: '🌟', ready: true },
  { id: 'p2', name: 'Jordan Rain', team: 'red', avatar: '⚡', ready: true },
  { id: 'p3', name: 'Casey Wind', team: 'blue', avatar: '🔥', ready: false },
  { id: 'p4', name: 'Morgan Sky', team: 'blue', avatar: '💎', ready: true },
];

export const SECRET_SHELTER_ID = 'poi6'; // Community Center Shelter
