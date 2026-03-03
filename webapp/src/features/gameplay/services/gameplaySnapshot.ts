import type { Clue, GameOutcome, POI, WrongGuessStage } from "@/types/game";

export type SnapshotFilterSource = "correct" | "wrong" | null;
export type SnapshotWrongGuessStage = WrongGuessStage;
export type SnapshotOutcome = GameOutcome;

export interface GameplaySnapshotData {
  clues: Clue[];
  visitedPOIs: string[];
  filteredPois: POI[] | null;
  filterSource: SnapshotFilterSource;
  penaltyStage: SnapshotWrongGuessStage | null;
  wrongGuessCount: number;
  solvedQuestions: string[];
  solvedNearbyAmenityKeys: string[];
  questionCooldowns: Record<string, number>;
  outcome: SnapshotOutcome;
  externalWinnerName?: string;
  selectedShelterId: string | null;
}

export interface GameplaySnapshotRecord {
  version: number;
  savedAt: number;
  resumeId: string;
  data: GameplaySnapshotData;
}

export const GAMEPLAY_SNAPSHOT_KEY = "shelterhunt.gameplaySnapshot.v1";
export const GAMEPLAY_SNAPSHOT_VERSION = 1;
export const GAMEPLAY_RESUME_GRACE_MS = 10 * 60 * 1000;

export const normalizeGameplaySnapshotData = (
  data: Partial<GameplaySnapshotData> | null | undefined,
): GameplaySnapshotData => {
  const raw = data ?? {};
  const normalizedOutcome =
    raw.outcome === "win" ||
    raw.outcome === "lose" ||
    raw.outcome === "penalty" ||
    raw.outcome === "none"
      ? raw.outcome
      : "none";

  return {
    clues: Array.isArray(raw.clues) ? raw.clues : [],
    visitedPOIs: Array.isArray(raw.visitedPOIs) ? raw.visitedPOIs : [],
    filteredPois: Array.isArray(raw.filteredPois) ? raw.filteredPois : null,
    filterSource:
      raw.filterSource === "correct" || raw.filterSource === "wrong"
        ? raw.filterSource
        : null,
    penaltyStage:
      raw.penaltyStage === "first" ||
      raw.penaltyStage === "second" ||
      raw.penaltyStage === "third"
        ? raw.penaltyStage
        : null,
    wrongGuessCount: typeof raw.wrongGuessCount === "number" ? raw.wrongGuessCount : 0,
    solvedQuestions: Array.isArray(raw.solvedQuestions) ? raw.solvedQuestions : [],
    solvedNearbyAmenityKeys: Array.isArray(raw.solvedNearbyAmenityKeys)
      ? raw.solvedNearbyAmenityKeys
      : [],
    questionCooldowns:
      raw.questionCooldowns && typeof raw.questionCooldowns === "object"
        ? raw.questionCooldowns
        : {},
    outcome: normalizedOutcome,
    externalWinnerName: raw.externalWinnerName,
    selectedShelterId: raw.selectedShelterId ?? null,
  };
};

export const saveGameplaySnapshotRecord = (params: {
  resumeId?: string;
  data: GameplaySnapshotData;
}) => {
  if (typeof window === "undefined") return;
  if (!params.resumeId) return;

  const snapshot: GameplaySnapshotRecord = {
    version: GAMEPLAY_SNAPSHOT_VERSION,
    savedAt: Date.now(),
    resumeId: params.resumeId,
    data: params.data,
  };

  try {
    localStorage.setItem(GAMEPLAY_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("[Resume] Failed to save gameplay snapshot", error);
  }
};

export const loadGameplaySnapshotRecord = (
  resumeId?: string,
): GameplaySnapshotRecord | null => {
  if (typeof window === "undefined") return null;
  if (!resumeId) return null;

  const raw = localStorage.getItem(GAMEPLAY_SNAPSHOT_KEY);
  if (!raw) return null;

  try {
    const snapshot = JSON.parse(raw) as GameplaySnapshotRecord;
    if (snapshot.version !== GAMEPLAY_SNAPSHOT_VERSION) return null;
    if (snapshot.resumeId !== resumeId) return null;
    if (Date.now() - snapshot.savedAt > GAMEPLAY_RESUME_GRACE_MS) return null;
    return snapshot;
  } catch (error) {
    console.warn("[Resume] Failed to parse gameplay snapshot", error);
    return null;
  }
};
