const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const LIGHTNING_DURATION_MINUTES = toNumber(
  import.meta.env.VITE_LIGHTNING_MINUTES,
  60,
);

export const LIGHTNING_RADIUS_KM = toNumber(
  import.meta.env.VITE_LIGHTNING_RADIUS_KM,
  2,
);
