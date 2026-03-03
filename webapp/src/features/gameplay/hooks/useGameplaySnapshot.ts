import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Clue, POI } from "@/types/game";
import {
  loadGameplaySnapshotRecord,
  normalizeGameplaySnapshotData,
  saveGameplaySnapshotRecord,
  type SnapshotFilterSource,
  type SnapshotOutcome,
  type SnapshotWrongGuessStage,
} from "../services/gameplaySnapshot";

interface UseGameplaySnapshotArgs {
  clues: Clue[];
  externalWinnerName: string | undefined;
  filterSource: SnapshotFilterSource;
  filteredPois: POI[] | null;
  outcome: SnapshotOutcome;
  penaltyStage: SnapshotWrongGuessStage | null;
  questionCooldowns: Record<string, number>;
  resumeId?: string;
  selectedShelterId: string | null;
  setClues: Dispatch<SetStateAction<Clue[]>>;
  setExternalWinnerName: Dispatch<SetStateAction<string | undefined>>;
  setFilterSource: Dispatch<SetStateAction<SnapshotFilterSource>>;
  setFilteredPois: Dispatch<SetStateAction<POI[] | null>>;
  setOutcome: Dispatch<SetStateAction<SnapshotOutcome>>;
  setPenaltyStage: Dispatch<SetStateAction<SnapshotWrongGuessStage | null>>;
  setQuestionCooldowns: Dispatch<SetStateAction<Record<string, number>>>;
  setSelectedShelterId: Dispatch<SetStateAction<string | null>>;
  setSolvedNearbyAmenityKeys: Dispatch<SetStateAction<string[]>>;
  setSolvedQuestions: Dispatch<SetStateAction<string[]>>;
  setVisitedPOIs: Dispatch<SetStateAction<string[]>>;
  setWrongGuessCount: Dispatch<SetStateAction<number>>;
  solvedNearbyAmenityKeys: string[];
  solvedQuestions: string[];
  visitedPOIs: string[];
  wrongGuessCount: number;
}

export function useGameplaySnapshot({
  clues,
  externalWinnerName,
  filterSource,
  filteredPois,
  outcome,
  penaltyStage,
  questionCooldowns,
  resumeId,
  selectedShelterId,
  setClues,
  setExternalWinnerName,
  setFilterSource,
  setFilteredPois,
  setOutcome,
  setPenaltyStage,
  setQuestionCooldowns,
  setSelectedShelterId,
  setSolvedNearbyAmenityKeys,
  setSolvedQuestions,
  setVisitedPOIs,
  setWrongGuessCount,
  solvedNearbyAmenityKeys,
  solvedQuestions,
  visitedPOIs,
  wrongGuessCount,
}: UseGameplaySnapshotArgs) {
  const restoredGameplayRef = useRef(false);

  const saveGameplaySnapshot = useCallback(() => {
    saveGameplaySnapshotRecord({
      resumeId,
      data: {
        clues,
        visitedPOIs,
        filteredPois,
        filterSource,
        penaltyStage,
        wrongGuessCount,
        solvedQuestions,
        solvedNearbyAmenityKeys,
        questionCooldowns,
        outcome,
        externalWinnerName,
        selectedShelterId,
      },
    });
  }, [
    clues,
    externalWinnerName,
    filterSource,
    filteredPois,
    outcome,
    penaltyStage,
    questionCooldowns,
    resumeId,
    selectedShelterId,
    solvedNearbyAmenityKeys,
    solvedQuestions,
    visitedPOIs,
    wrongGuessCount,
  ]);

  useEffect(() => {
    if (!resumeId || restoredGameplayRef.current) return;

    const snapshot = loadGameplaySnapshotRecord(resumeId);
    if (!snapshot) return;

    const restored = normalizeGameplaySnapshotData(snapshot.data);
    setClues(restored.clues);
    setVisitedPOIs(restored.visitedPOIs);
    setFilteredPois(restored.filteredPois);
    setFilterSource(restored.filterSource as SnapshotFilterSource);
    setPenaltyStage(restored.penaltyStage as SnapshotWrongGuessStage | null);
    setWrongGuessCount(restored.wrongGuessCount);
    setSolvedQuestions(restored.solvedQuestions);
    setSolvedNearbyAmenityKeys(restored.solvedNearbyAmenityKeys);
    setQuestionCooldowns(restored.questionCooldowns);
    setOutcome(restored.outcome);
    setExternalWinnerName(restored.externalWinnerName);
    setSelectedShelterId(restored.selectedShelterId);
    restoredGameplayRef.current = true;
  }, [
    resumeId,
    setClues,
    setExternalWinnerName,
    setFilterSource,
    setFilteredPois,
    setOutcome,
    setPenaltyStage,
    setQuestionCooldowns,
    setSelectedShelterId,
    setSolvedNearbyAmenityKeys,
    setSolvedQuestions,
    setVisitedPOIs,
    setWrongGuessCount,
  ]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveGameplaySnapshot();
      }
    };

    const handlePageHide = () => {
      saveGameplaySnapshot();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [saveGameplaySnapshot]);

  return {
    saveGameplaySnapshot,
  };
}
