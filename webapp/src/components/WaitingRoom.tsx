import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { User, Check, X, Copy, Crown } from "lucide-react";
import type { Player } from "@/types/game";
import { useI18n } from "@/i18n";

interface WaitingRoomProps {
  gameCode: string;
  players: Player[];
  isHost: boolean;
  currentUserId: string;
  hostId?: string | null;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveGame: () => void;
}

export function WaitingRoom({
  gameCode,
  players,
  isHost,
  currentUserId,
  hostId,
  onToggleReady,
  onStartGame,
  onLeaveGame,
}: WaitingRoomProps) {
  const { t } = useI18n();
  const currentPlayer = players.find((p) => p.id === currentUserId);
  const allReady = players.every((p) => p.ready);
  const [copied, setCopied] = useState(false);
  const orderedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.id === hostId) return -1;
      if (b.id === hostId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [players, hostId]);

  const copyGameCode = async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = gameCode;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-background px-4 py-6">
      <motion.div
        className="w-full max-w-4xl space-y-8 rounded-3xl border-4 border-black bg-white p-8 text-black shadow-[14px_14px_0_rgba(0,0,0,0.85)]"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-center space-y-4">
          <motion.h1
            className="text-3xl font-black uppercase tracking-wide"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {t("waiting.title")}
          </motion.h1>

          <motion.div
            className="mx-auto inline-flex items-center gap-4 rounded-2xl border-2 border-black bg-neutral-100 px-6 py-4"
            whileHover={{ scale: 1.02 }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/70">
                {t("waiting.shelterCode")}
              </p>
              <p className="text-3xl font-black uppercase tracking-[0.4em]">{gameCode}</p>
            </div>
            <button
              type="button"
              onClick={copyGameCode}
              className={`rounded-full border-2 border-black p-2 transition hover:bg-black hover:text-white ${
                copied ? "bg-black text-white" : "bg-white"
              }`}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </motion.div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
          <motion.div
            className="space-y-3 rounded-2xl bg-background p-5"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              <h3 className="text-xl font-black uppercase tracking-wide">
                {t("waiting.players")}
              </h3>
            </div>
            {orderedPlayers.length === 0 ? (
              <div className="py-8 text-center text-sm font-semibold uppercase tracking-wide text-black/60">
                {t("waiting.waitingForPlayers")}
              </div>
            ) : (
              <div className="space-y-2">
                {orderedPlayers.map((player, index) => (
                  <motion.div
                    key={player.id}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + index * 0.05 }}
                  >
                    <div className="flex items-center gap-3 text-sm font-black uppercase tracking-wide">
                      <span>{player.name || t("waiting.player")}</span>
                      {player.id === hostId && <Crown className="h-4 w-4 text-black" />}
                      {player.id === currentUserId && (
                        <span className="rounded-full px-2 py-0.5 text-[10px]">
                          {t("waiting.you")}
                        </span>
                      )}
                    </div>
                    
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            className="space-y-4 rounded-2xl border-2 border-black bg-white p-5"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <button
              type="button"
              onClick={onToggleReady}
              className={`w-full rounded-xl border-2 border-black px-4 py-3 text-sm font-black uppercase tracking-wide transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(0,0,0,0.9)] ${
                currentPlayer?.ready ? "bg-red-500 text-black" : "bg-white text-black"
              }`}
            >
              {currentPlayer?.ready ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="h-5 w-5" />
                  {t("waiting.ready")}
                </span>
              ) : (
                t("waiting.markReady")
              )}
            </button>

            {isHost ? (
              <button
                type="button"
                onClick={onStartGame}
                disabled={!allReady || players.length < 1}
                className="w-full rounded-xl border-2 border-black bg-red-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(0,0,0,0.9)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {allReady && players.length >= 1
                  ? t("waiting.startGame")
                  : t("waiting.waitingForEveryone")}
              </button>
            ) : (
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-black/60">
                {t("waiting.waitingForHost")}
              </p>
            )}

            <button
              type="button"
              onClick={onLeaveGame}
              className="w-full rounded-xl border-2 border-black px-4 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(0,0,0,0.9)]"
            >
              {t("waiting.leaveGame")}
            </button>

            <div className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-black/60">
              <User className="mr-1 inline h-3.5 w-3.5" />
              {t("waiting.playerCount", {
                replacements: {
                  count: players.length,
                  suffix: players.length !== 1 ? "s" : "",
                },
              })}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
