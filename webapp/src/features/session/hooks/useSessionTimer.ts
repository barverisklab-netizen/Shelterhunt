import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

interface UseSessionTimerParams {
  gameState: string;
  onTimeUp: () => void;
  initialTimeRemaining?: number;
  initialTimerEnabled?: boolean;
  initialTimerEndsAt?: number | null;
  initialIsTimerCritical?: boolean;
}

export interface SessionTimerState {
  timeRemaining: number;
  timerEnabled: boolean;
  timerEndsAt: number | null;
  isTimerCritical: boolean;
}

export interface UseSessionTimerResult extends SessionTimerState {
  setTimeRemaining: Dispatch<SetStateAction<number>>;
  setTimerEnabled: Dispatch<SetStateAction<boolean>>;
  setTimerEndsAt: Dispatch<SetStateAction<number | null>>;
  setIsTimerCritical: Dispatch<SetStateAction<boolean>>;
  setTimerState: (seconds: number, enabled: boolean) => void;
}

export function useSessionTimer({
  gameState,
  onTimeUp,
  initialTimeRemaining = 1800,
  initialTimerEnabled = true,
  initialTimerEndsAt = null,
  initialIsTimerCritical = false,
}: UseSessionTimerParams): UseSessionTimerResult {
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);
  const [timerEnabled, setTimerEnabled] = useState(initialTimerEnabled);
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(initialTimerEndsAt);
  const [isTimerCritical, setIsTimerCritical] = useState(initialIsTimerCritical);

  const setTimerState = useCallback((seconds: number, enabled: boolean) => {
    setTimeRemaining(seconds);
    setTimerEnabled(enabled);
    setTimerEndsAt(enabled ? Date.now() + seconds * 1000 : null);
  }, []);

  useEffect(() => {
    if (!timerEnabled || gameState !== "playing" || !timerEndsAt) {
      return;
    }

    const tick = () => {
      const nextRemaining = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
      if (nextRemaining <= 0) {
        setTimeRemaining(0);
        setTimerEnabled(false);
        setTimerEndsAt(null);
        setIsTimerCritical(false);
        onTimeUp();
        return;
      }
      setTimeRemaining(nextRemaining);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [gameState, onTimeUp, timerEnabled, timerEndsAt]);

  return {
    timeRemaining,
    timerEnabled,
    timerEndsAt,
    isTimerCritical,
    setTimeRemaining,
    setTimerEnabled,
    setTimerEndsAt,
    setIsTimerCritical,
    setTimerState,
  };
}
