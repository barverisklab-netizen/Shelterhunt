import { useCallback, useMemo, useState, useEffect } from "react";

export const QUESTION_COOLDOWN_MS = 120_000;

export const pruneExpiredQuestionCooldowns = (
  cooldowns: Record<string, number>,
  now: number,
): Record<string, number> => {
  const next: Record<string, number> = {};
  Object.entries(cooldowns).forEach(([id, expiresAt]) => {
    if (expiresAt > now) {
      next[id] = expiresAt;
    }
  });
  return next;
};

export const createQuestionCooldownExpiry = (now: number) => now + QUESTION_COOLDOWN_MS;

interface UseQuestionCooldownsArgs {
  proximityDisabledForTesting: boolean;
}

export function useQuestionCooldowns({
  proximityDisabledForTesting,
}: UseQuestionCooldownsArgs) {
  const [, setCooldownTick] = useState(0);
  const [questionCooldowns, setQuestionCooldowns] = useState<Record<string, number>>({});

  useEffect(() => {
    if (proximityDisabledForTesting) return;

    const intervalId = window.setInterval(() => {
      setQuestionCooldowns((prev) => {
        const now = Date.now();
        const next = pruneExpiredQuestionCooldowns(prev, now);
        const changed = Object.keys(next).length !== Object.keys(prev).length;
        return changed ? next : prev;
      });
      setCooldownTick((tick) => (tick + 1) % Number.MAX_SAFE_INTEGER);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [proximityDisabledForTesting]);

  const startQuestionCooldown = useCallback(
    (questionId: string) => {
      if (proximityDisabledForTesting) return;
      setQuestionCooldowns((prev) => ({
        ...prev,
        [questionId]: createQuestionCooldownExpiry(Date.now()),
      }));
    },
    [proximityDisabledForTesting],
  );

  const lockedQuestionIds = useMemo(() => Object.keys(questionCooldowns), [questionCooldowns]);

  return {
    lockedQuestionIds,
    questionCooldowns,
    setQuestionCooldowns,
    startQuestionCooldown,
  };
}
