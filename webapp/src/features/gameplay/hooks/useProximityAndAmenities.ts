import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { PROXIMITY_RADIUS_KM } from "@/config/runtime";
import { hasShelterWithinRadius } from "@/services/proximityIndex";
import { haversineDistanceKm } from "@/utils/lightningSelection";
import type { POI } from "@/types/game";

interface LatLng {
  lat: number;
  lng: number;
}

interface UseProximityAndAmenitiesArgs {
  drawerOpen: boolean;
  onLocationChange?: (location: LatLng) => void;
  playerLocation: LatLng;
  proximityDisabledForTesting: boolean;
  setVisitedPOIs: Dispatch<SetStateAction<string[]>>;
  visitedPOIs: string[];
}

export function useProximityAndAmenities({
  drawerOpen,
  onLocationChange,
  playerLocation,
  proximityDisabledForTesting,
  setVisitedPOIs,
  visitedPOIs,
}: UseProximityAndAmenitiesArgs) {
  const [nearbyPOI, setNearbyPOI] = useState<POI | null>(null);
  const [nearbyShelterName, setNearbyShelterName] = useState<string | null>(null);
  const [nearbyAmenityCounts, setNearbyAmenityCounts] = useState<Record<string, number>>({});
  const [nearbyAmenityCategories, setNearbyAmenityCategories] = useState<string[]>([]);
  const [amenityQueryTrigger, setAmenityQueryTrigger] = useState(0);

  const previousNearbyPOIRef = useRef<POI | null>(null);
  const staleLocationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeoStatusRef = useRef<string>("unknown");
  const hasLoggedProximityRef = useRef(false);
  const lastAmenityQueryLocationRef = useRef<LatLng | null>(null);
  const lastLocationRequestRef = useRef<number>(0);
  const lastHighAccuracyRequestRef = useRef<number>(0);
  const lastWatchLocationRef = useRef<(LatLng & { sampledAt: number }) | null>(null);

  const requestLatestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation || !onLocationChange) return;

    const now = Date.now();
    if (now - lastLocationRequestRef.current < 4000) return;

    lastLocationRequestRef.current = now;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lastGeoStatusRef.current = "ok";
        onLocationChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        lastGeoStatusRef.current = `error:${err.code ?? "unknown"}`;
        console.warn("[Geo] Unable to refresh location", err);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
    );
  }, [onLocationChange]);

  const requestHighAccuracyLocation = useCallback(
    () =>
      new Promise<LatLng | null>((resolve) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          resolve(null);
          return;
        }

        const now = Date.now();
        if (now - lastHighAccuracyRequestRef.current < 4000) {
          resolve(null);
          return;
        }

        lastHighAccuracyRequestRef.current = now;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            lastGeoStatusRef.current = "ok";
            lastLocationRequestRef.current = Date.now();
            const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            onLocationChange?.(next);
            resolve(next);
          },
          (err) => {
            lastGeoStatusRef.current = `error:${err.code ?? "unknown"}`;
            console.warn("[Geo] High-accuracy refresh failed", err);
            resolve(null);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 },
        );
      }),
    [onLocationChange],
  );

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation || !onLocationChange) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        lastGeoStatusRef.current = "ok";
        const now = Date.now();
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        const previous = lastWatchLocationRef.current;
        if (previous) {
          const movedMeters = haversineDistanceKm(previous, next) * 1000;
          if (movedMeters < 1 && now - previous.sampledAt < 3000) {
            return;
          }
        }

        lastWatchLocationRef.current = {
          ...next,
          sampledAt: now,
        };
        lastLocationRequestRef.current = now;
        onLocationChange(next);
      },
      (err) => {
        lastGeoStatusRef.current = `error:${err.code ?? "unknown"}`;
        if (err.code !== 1) {
          console.warn("[Geo] watchPosition update failed", err);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [onLocationChange]);

  const checkNearbyPOI = useCallback(
    async ({ forceLog = false }: { forceLog?: boolean } = {}) => {
      try {
        const result = await hasShelterWithinRadius(playerLocation, PROXIMITY_RADIUS_KM);
        let closest: POI | null = null;
        let closestDistanceKm = Number.POSITIVE_INFINITY;

        if (result.found && result.nearest) {
          closest = {
            id: `shelter-proximity-${result.nearest.lat}-${result.nearest.lng}`,
            name: result.nearest.category || "Nearby shelter",
            lat: result.nearest.lat,
            lng: result.nearest.lng,
            type: "shelter",
          };
          closestDistanceKm = haversineDistanceKm(playerLocation, {
            lat: result.nearest.lat,
            lng: result.nearest.lng,
          });
        }

        const previous = previousNearbyPOIRef.current;
        const changed = (previous?.id || null) !== (closest?.id || null);
        if (changed || forceLog || !hasLoggedProximityRef.current) {
          if (closest) {
            console.info("[Proximity] Nearby shelter detected", {
              id: closest.id,
              name: closest.name,
              distanceMeters: Math.round(closestDistanceKm * 1000),
              radiusKm: PROXIMITY_RADIUS_KM,
            });
          } else {
            console.info("[Proximity] No shelter within radius", {
              radiusKm: PROXIMITY_RADIUS_KM,
            });
          }
          previousNearbyPOIRef.current = closest;
          hasLoggedProximityRef.current = true;
        }

        setNearbyPOI(closest);
        setNearbyShelterName(closest?.name ?? null);
        if (closest && !visitedPOIs.includes(closest.id)) {
          setVisitedPOIs((prev) => [...prev, closest.id]);
        }
      } catch (error) {
        console.warn("[Proximity] Failed to check nearby shelter", error);
      }
    },
    [playerLocation.lat, playerLocation.lng, setVisitedPOIs, visitedPOIs],
  );

  const pollNearbyShelter = useCallback(() => {
    if (proximityDisabledForTesting) return;
    requestLatestLocation();
    void checkNearbyPOI({ forceLog: true });
  }, [checkNearbyPOI, proximityDisabledForTesting, requestLatestLocation]);

  const pollProximityAndAmenities = useCallback(() => {
    pollNearbyShelter();
    if (proximityDisabledForTesting) return;
    setAmenityQueryTrigger((prev) => prev + 1);
  }, [pollNearbyShelter, proximityDisabledForTesting]);

  useEffect(() => {
    void checkNearbyPOI();
  }, [checkNearbyPOI]);

  useEffect(() => {
    if (drawerOpen) {
      void checkNearbyPOI({ forceLog: true });
    }
  }, [checkNearbyPOI, drawerOpen, playerLocation.lat, playerLocation.lng]);

  useEffect(() => {
    console.info("[GameScreen] Player location updated", playerLocation);
    if (staleLocationTimerRef.current) {
      clearTimeout(staleLocationTimerRef.current);
    }
    staleLocationTimerRef.current = setTimeout(() => {
      console.info("[NearbyAmenity] Location stale, clearing amenity counts");
      setNearbyAmenityCounts({});
      setNearbyAmenityCategories([]);
    }, 15000);
  }, [playerLocation.lat, playerLocation.lng]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = lastAmenityQueryLocationRef.current;
    if (!prev || prev.lat !== playerLocation.lat || prev.lng !== playerLocation.lng) {
      setAmenityQueryTrigger((n) => n + 1);
      lastAmenityQueryLocationRef.current = {
        lat: playerLocation.lat,
        lng: playerLocation.lng,
      };
    }
  }, [drawerOpen, playerLocation.lat, playerLocation.lng]);

  useEffect(() => {
    return () => {
      if (staleLocationTimerRef.current) {
        clearTimeout(staleLocationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // logging trimmed per request
  }, [playerLocation.lat, playerLocation.lng, nearbyAmenityCounts]);

  const handleAmenitiesWithinRadius = useCallback(
    (info: { counts: Record<string, number>; matchedCategories: string[] }) => {
      setNearbyAmenityCounts(info.counts ?? {});
      setNearbyAmenityCategories(info.matchedCategories ?? []);
    },
    [],
  );

  return {
    amenityQueryTrigger,
    checkNearbyPOI,
    handleAmenitiesWithinRadius,
    nearbyAmenityCategories,
    nearbyAmenityCounts,
    nearbyPOI,
    nearbyShelterName,
    pollNearbyShelter,
    pollProximityAndAmenities,
    requestHighAccuracyLocation,
  };
}
