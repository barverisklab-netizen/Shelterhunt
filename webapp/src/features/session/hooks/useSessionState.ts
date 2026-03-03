import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { WrongGuessStage } from "@/types/game";

export type SessionPenaltyStage = WrongGuessStage;

interface UseSessionStateParams {
  setTimerState: (seconds: number, enabled: boolean) => void;
  setIsTimerCritical: (isCritical: boolean) => void;
}

interface UseSessionStateResult {
  wrongGuessCount: number;
  setWrongGuessCount: Dispatch<SetStateAction<number>>;
  applyWrongGuessPenalty: () => SessionPenaltyStage;
}

export function useSessionState({
  setTimerState,
  setIsTimerCritical,
}: UseSessionStateParams): UseSessionStateResult {
  const [wrongGuessCount, setWrongGuessCount] = useState(0);

  const applyWrongGuessPenalty = useCallback((): SessionPenaltyStage => {
    const next = Math.min(wrongGuessCount + 1, 3);
    setWrongGuessCount(next);

    if (next === 1) {
      setTimerState(600, true);
      setIsTimerCritical(true);
      return "first";
    }

    if (next === 2) {
      setTimerState(300, true);
      setIsTimerCritical(true);
      return "second";
    }

    return "third";
  }, [setIsTimerCritical, setTimerState, wrongGuessCount]);

  return {
    wrongGuessCount,
    setWrongGuessCount,
    applyWrongGuessPenalty,
  };
}
