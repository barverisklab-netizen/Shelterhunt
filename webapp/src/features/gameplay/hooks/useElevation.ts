import { useCallback, useEffect, useState } from "react";

interface LatLng {
  lat: number;
  lng: number;
}

interface TranslateOptions {
  replacements?: Record<string, string | number>;
  fallback?: string;
}

type TranslateFn = (key: string, options?: TranslateOptions) => string;

interface UseElevationArgs {
  playerLocation: LatLng;
  secretShelterCoords: LatLng | null;
  t: TranslateFn;
}

const roundTo3 = (value: number) => {
  const rounded = Number(value.toFixed(3));
  return Object.is(rounded, -0) ? 0 : rounded;
};

export function useElevation({ playerLocation, secretShelterCoords, t }: UseElevationArgs) {
  const [playerElevationMeters, setPlayerElevationMeters] = useState<number | null>(null);
  const [shelterElevationMeters, setShelterElevationMeters] = useState<number | null>(null);
  const [playerElevationResolved, setPlayerElevationResolved] = useState(false);
  const [shelterElevationResolved, setShelterElevationResolved] = useState(false);
  const [elevationSampleTrigger, setElevationSampleTrigger] = useState(0);

  const handleElevationSample = useCallback(
    ({
      playerElevationMeters: nextPlayerElevationMeters,
      shelterElevationMeters: nextShelterElevationMeters,
    }: {
      playerElevationMeters: number | null;
      shelterElevationMeters: number | null;
    }) => {
      const deltaMeters =
        nextPlayerElevationMeters != null && nextShelterElevationMeters != null
          ? roundTo3(nextPlayerElevationMeters - nextShelterElevationMeters)
          : null;

      console.info("[Elevation Debug] Sample", {
        player: {
          lat: playerLocation.lat,
          lng: playerLocation.lng,
          elevationMeters: nextPlayerElevationMeters,
        },
        shelter: secretShelterCoords
          ? {
              lat: secretShelterCoords.lat,
              lng: secretShelterCoords.lng,
              elevationMeters: nextShelterElevationMeters,
            }
          : null,
        deltaMeters,
      });

      setPlayerElevationMeters(nextPlayerElevationMeters);
      setPlayerElevationResolved(true);

      if (!secretShelterCoords) {
        setShelterElevationMeters(null);
        setShelterElevationResolved(false);
        return;
      }

      setShelterElevationMeters(nextShelterElevationMeters);
      setShelterElevationResolved(true);
    },
    [playerLocation.lat, playerLocation.lng, secretShelterCoords?.lat, secretShelterCoords?.lng],
  );

  useEffect(() => {
    if (!secretShelterCoords) {
      setShelterElevationMeters(null);
      setShelterElevationResolved(false);
      return;
    }
    setShelterElevationResolved(false);
  }, [secretShelterCoords?.lat, secretShelterCoords?.lng]);

  useEffect(() => {
    setPlayerElevationResolved(false);
  }, [playerLocation.lat, playerLocation.lng]);

  const elevationDeltaMeters =
    playerElevationMeters != null && shelterElevationMeters != null
      ? roundTo3(playerElevationMeters - shelterElevationMeters)
      : null;
  const elevationDeltaAbsDisplay =
    elevationDeltaMeters != null ? Math.abs(elevationDeltaMeters).toFixed(3) : null;
  const isBelowShelterElevation = elevationDeltaMeters != null && elevationDeltaMeters < 0;
  const isAboveShelterElevation = elevationDeltaMeters != null && elevationDeltaMeters > 0;
  const elevationUnavailable =
    elevationDeltaMeters == null && playerElevationResolved && shelterElevationResolved;

  const elevationSummaryLabel =
    elevationDeltaMeters != null
      ? elevationDeltaMeters < 0
        ? t("game.elevationBelow", {
            replacements: { meters: elevationDeltaAbsDisplay ?? "0.000" },
            fallback: `Elevation: ${elevationDeltaAbsDisplay ?? "0.000"}m below shelter`,
          })
        : elevationDeltaMeters > 0
          ? t("game.elevationAbove", {
              replacements: { meters: elevationDeltaAbsDisplay ?? "0.000" },
              fallback: `Elevation: ${elevationDeltaAbsDisplay ?? "0.000"}m above shelter`,
            })
          : t("game.elevationSame", { fallback: "Elevation: same as shelter" })
      : elevationUnavailable
        ? t("game.elevationUnavailable", {
            fallback: "Elevation data unavailable.",
          })
        : t("game.elevationLoading", { fallback: "Checking elevation..." });

  const handleElevationPillClick = useCallback(() => {
    setPlayerElevationResolved(false);
    if (secretShelterCoords) {
      setShelterElevationResolved(false);
    }
    setElevationSampleTrigger((prev) => prev + 1);
  }, [secretShelterCoords]);

  return {
    elevationDeltaAbsDisplay,
    elevationDeltaMeters,
    elevationSampleTrigger,
    elevationSummaryLabel,
    elevationUnavailable,
    handleElevationPillClick,
    handleElevationSample,
    isAboveShelterElevation,
    isBelowShelterElevation,
  };
}
