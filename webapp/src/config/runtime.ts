const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toString = (value: string | undefined, fallback: string): string => {
  return value && value.trim().length > 0 ? value : fallback;
};

export const LIGHTNING_DURATION_MINUTES = toNumber(
  import.meta.env.VITE_LIGHTNING_MINUTES,
  60,
);

export const LIGHTNING_RADIUS_KM = toNumber(
  import.meta.env.VITE_LIGHTNING_RADIUS_KM,
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
