const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toString = (value: string | undefined, fallback: string): string => {
  return value && value.trim().length > 0 ? value : fallback;
};

const env = import.meta.env ?? {};

const toBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value == null) return fallback;
  const normalized = value.toString().trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

export const LIGHTNING_DURATION_MINUTES = toNumber(
  env.VITE_LIGHTNING_MINUTES as string | undefined,
  60,
);

export const LIGHTNING_RADIUS_KM = toNumber(
  env.VITE_LIGHTNING_RADIUS_KM as string | undefined,
  2,
);

export const MULTIPLAYER_RADIUS_KM = toNumber(
  import.meta.env.VITE_MULTIPLAYER_RADIUS_KM,
  2,
);

export const MAPBOX_STYLE_URL = toString(
  import.meta.env.VITE_MAPBOX_STYLE_URL,
  "",
);

export const API_BASE_URL = toString(
  import.meta.env.VITE_API_BASE_URL,
  "http://localhost:4000",
);

export const WS_BASE_URL = toString(
  import.meta.env.VITE_WS_BASE_URL,
  API_BASE_URL.replace(/^http/i, "ws"),
);

export const ENABLE_WRONG_GUESS_PENALTY = toBool(
  env.VITE_ENABLE_WRONG_GUESS_PENALTY as string | undefined,
  false,
);
