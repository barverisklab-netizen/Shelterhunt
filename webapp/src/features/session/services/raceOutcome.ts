import type { RemoteOutcome } from "@/types/game";

export const deriveRemoteOutcomeFromRaceFinished = (
  payload: unknown,
  currentUserId: string,
  fallbackWinnerName: string,
): RemoteOutcome => {
  const winner = (payload as { winner?: { user_id?: string; display_name?: string } } | null)
    ?.winner;

  const isSelf = winner?.user_id === currentUserId;
  return {
    result: isSelf ? "win" : "lose",
    winnerName: winner?.display_name ?? fallbackWinnerName,
  };
};
