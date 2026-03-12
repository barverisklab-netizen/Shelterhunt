import { API_BASE_URL } from "@/config/runtime";

const WARMUP_TIMEOUT_MS = 15_000;
const WARMUP_THROTTLE_MS = 45_000;

let lastWarmupAttemptAt = 0;
let inflightWarmup: Promise<void> | null = null;
let lastHealthWasOk = false;

const buildHealthUrl = () => `${API_BASE_URL.replace(/\/+$/, "")}/health`;

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

const pingHealth = async (): Promise<void> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS);

  try {
    const response = await fetch(buildHealthUrl(), {
      method: "GET",
      cache: "no-store",
      keepalive: true,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Warmup failed: ${response.status} ${response.statusText}`);
    }

    lastHealthWasOk = true;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const triggerApiWarmup = (): void => {
  if (typeof window === "undefined") return;
  if (lastHealthWasOk) return;

  const now = Date.now();
  if (now - lastWarmupAttemptAt < WARMUP_THROTTLE_MS) return;
  if (inflightWarmup) return;

  lastWarmupAttemptAt = now;
  inflightWarmup = pingHealth()
    .catch((error) => {
      lastHealthWasOk = false;
      if (!isAbortError(error)) {
        console.debug("[API warmup] ping failed", { error });
      }
    })
    .finally(() => {
      inflightWarmup = null;
    });
};
