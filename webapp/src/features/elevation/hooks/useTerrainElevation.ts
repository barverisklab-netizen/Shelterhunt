import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import {
  ELEVATION_CACHE_LIMIT,
  ensureMapTerrainEnabled,
  getElevationCacheKey,
  queryMapTerrainElevation,
  queryTerrainRgbElevation,
  type LatLng,
  setBoundedElevationCacheValue,
} from "../services/terrainSampling";

interface UseTerrainElevationArgs {
  accessToken: string;
  mapRef: RefObject<MapboxMap | null>;
  onElevationSample?: (info: {
    playerElevationMeters: number | null;
    shelterElevationMeters: number | null;
  }) => void;
  playerLocation: LatLng;
  secretShelterCoords?: LatLng | null;
}

export function useTerrainElevation({
  accessToken,
  mapRef,
  onElevationSample,
  playerLocation,
  secretShelterCoords,
}: UseTerrainElevationArgs) {
  const elevationCallbackRef = useRef(onElevationSample);
  const elevationCacheRef = useRef<Map<string, number | null>>(new Map());
  const elevationSampleVersionRef = useRef(0);
  const terrainEnablePendingRef = useRef(false);

  useEffect(() => {
    elevationCallbackRef.current = onElevationSample;
  }, [onElevationSample]);

  const fetchFallbackElevation = useCallback(
    async (coords?: LatLng | null) => {
      if (!coords) return null;

      const key = getElevationCacheKey(coords);
      const cached = elevationCacheRef.current.get(key);
      if (cached !== undefined) {
        return cached;
      }

      try {
        const fallbackElevation = await queryTerrainRgbElevation(coords, accessToken);
        setBoundedElevationCacheValue(
          elevationCacheRef.current,
          key,
          fallbackElevation,
          ELEVATION_CACHE_LIMIT,
        );
        return fallbackElevation;
      } catch (error) {
        console.warn("[Map] Terrain fallback elevation query failed", { coords, error });
        setBoundedElevationCacheValue(
          elevationCacheRef.current,
          key,
          null,
          ELEVATION_CACHE_LIMIT,
        );
        return null;
      }
    },
    [accessToken],
  );

  const ensureTerrainEnabled = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;
    if (terrainEnablePendingRef.current) return;
    terrainEnablePendingRef.current = true;

    const applyTerrain = () => {
      const activeMap = mapRef.current;
      if (!activeMap || activeMap !== m) {
        terrainEnablePendingRef.current = false;
        return;
      }

      if (typeof activeMap.isStyleLoaded === "function" && !activeMap.isStyleLoaded()) {
        activeMap.once("style.load", applyTerrain);
        return;
      }

      ensureMapTerrainEnabled(activeMap);
      terrainEnablePendingRef.current = false;
    };

    // Avoid mutating style sources during an active render frame.
    m.once("idle", applyTerrain);
  }, [mapRef]);

  const sampleTerrainElevation = useCallback(() => {
    const m = mapRef.current;
    const callback = elevationCallbackRef.current;
    if (!m || !callback) return;
    const sampleVersion = ++elevationSampleVersionRef.current;

    const currentPlayerCoords = { lat: playerLocation.lat, lng: playerLocation.lng };
    const currentShelterCoords = secretShelterCoords
      ? { lat: secretShelterCoords.lat, lng: secretShelterCoords.lng }
      : null;

    const emit = (playerElevationMeters: number | null, shelterElevationMeters: number | null) => {
      if (sampleVersion !== elevationSampleVersionRef.current) return;
      callback({ playerElevationMeters, shelterElevationMeters });
    };

    const playerElevationMeters = queryMapTerrainElevation(m, currentPlayerCoords);
    const shelterElevationMeters = queryMapTerrainElevation(m, currentShelterCoords);

    const needsRetry =
      playerElevationMeters == null ||
      (currentShelterCoords != null && shelterElevationMeters == null);
    if (!needsRetry) {
      emit(playerElevationMeters, shelterElevationMeters);
      return;
    }

    const resolveWithFallback = async (afterIdle: boolean) => {
      let resolvedPlayer = afterIdle
        ? queryMapTerrainElevation(m, currentPlayerCoords)
        : playerElevationMeters;
      let resolvedShelter = afterIdle
        ? queryMapTerrainElevation(m, currentShelterCoords)
        : shelterElevationMeters;

      if (resolvedPlayer == null) {
        resolvedPlayer = await fetchFallbackElevation(currentPlayerCoords);
      }
      if (currentShelterCoords && resolvedShelter == null) {
        resolvedShelter = await fetchFallbackElevation(currentShelterCoords);
      }

      emit(resolvedPlayer, resolvedShelter);
    };

    if (m.isStyleLoaded()) {
      m.once("idle", () => {
        void resolveWithFallback(true);
      });
    } else {
      void resolveWithFallback(false);
    }
  }, [
    fetchFallbackElevation,
    mapRef,
    playerLocation.lat,
    playerLocation.lng,
    secretShelterCoords?.lat,
    secretShelterCoords?.lng,
  ]);

  return {
    ensureTerrainEnabled,
    sampleTerrainElevation,
  };
}
