import { describe, expect, expectTypeOf, it } from "vitest";

import { useElevation } from "../features/gameplay/hooks/useElevation";
import {
  haversineDistanceKm,
  listSheltersWithinRadius,
  selectLightningShelter,
} from "../utils/lightningSelection";
import type { POI } from "../types/game";

describe("measurement and elevation extraction contracts", () => {
  it("keeps distance measurement symmetric with zero baseline", () => {
    const pointA = { lat: 35.69516, lng: 139.8212 };
    const pointB = { lat: 35.69616, lng: 139.8212 };

    const distanceAB = haversineDistanceKm(pointA, pointB);
    const distanceBA = haversineDistanceKm(pointB, pointA);

    expect(haversineDistanceKm(pointA, pointA)).toBe(0);
    expect(distanceAB).toBeCloseTo(distanceBA, 12);
    expect(distanceAB).toBeGreaterThan(0.1);
    expect(distanceAB).toBeLessThan(0.12);
  });

  it("keeps radius filtering contract for shelter-only candidates", () => {
    const center = { lat: 35.69516, lng: 139.8212 };
    const pois: POI[] = [
      { id: "s1", name: "Near Shelter", lat: center.lat, lng: center.lng, type: "shelter" },
      { id: "s2", name: "Far Shelter", lat: 35.71, lng: 139.84, type: "shelter" },
      { id: "h1", name: "Nearby Hospital", lat: center.lat, lng: center.lng, type: "hospital" },
    ];

    const within250m = listSheltersWithinRadius(pois, center, 0.25);
    const ids = within250m.map((candidate) => candidate.id);

    expect(ids).toEqual(["s1"]);
    expect(within250m[0].distanceKm).toBe(0);

    const deterministic = selectLightningShelter(pois, center, 0.25, () => 0);
    expect(deterministic.secretShelter.id).toBe("s1");
    expect(deterministic.eligibleShelters).toHaveLength(1);
  });

  it("preserves extracted elevation hook API contract", () => {
    type UseElevationArgs = Parameters<typeof useElevation>[0];
    type UseElevationState = ReturnType<typeof useElevation>;

    expectTypeOf<UseElevationArgs>().toMatchTypeOf<{
      playerLocation: { lat: number; lng: number };
      secretShelterCoords: { lat: number; lng: number } | null;
      t: (key: string, options?: { replacements?: Record<string, string | number>; fallback?: string }) => string;
    }>();

    expectTypeOf<UseElevationState["elevationDeltaMeters"]>().toEqualTypeOf<number | null>();
    expectTypeOf<UseElevationState["elevationDeltaAbsDisplay"]>().toEqualTypeOf<string | null>();
    expectTypeOf<UseElevationState["elevationSampleTrigger"]>().toEqualTypeOf<number>();
    expectTypeOf<UseElevationState["elevationSummaryLabel"]>().toEqualTypeOf<string>();
    expectTypeOf<UseElevationState["elevationUnavailable"]>().toEqualTypeOf<boolean>();
    expectTypeOf<UseElevationState["isAboveShelterElevation"]>().toEqualTypeOf<boolean>();
    expectTypeOf<UseElevationState["isBelowShelterElevation"]>().toEqualTypeOf<boolean>();
    expectTypeOf<UseElevationState["handleElevationPillClick"]>().toEqualTypeOf<() => void>();
    expectTypeOf<UseElevationState["handleElevationSample"]>().toMatchTypeOf<
      (payload: { playerElevationMeters: number | null; shelterElevationMeters: number | null }) => void
    >();
  });
});
