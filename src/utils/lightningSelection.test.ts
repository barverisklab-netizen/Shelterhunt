import { describe, expect, it } from "vitest";
import type { POI } from "@/data/mockData";
import {
  haversineDistanceKm,
  listSheltersWithinRadius,
  selectLightningShelter,
} from "./lightningSelection";

const createSeededRandom =
  (seed: number): (() => number) =>
  () => {
    // Simple LCG for deterministic tests
    const a = 1664525;
    const c = 1013904223;
    seed = (a * seed + c) % 2 ** 32;
    return seed / 2 ** 32;
  };

describe("lightning shelter selection", () => {
  it("includes the secret shelter in the eligible shelter list within 2km", () => {
    const rng = createSeededRandom(42);
    const userLocation = {
      lat: 35.665 + rng() * 0.01, // stays within Koto, Tokyo bounds
      lng: 139.81 + rng() * 0.015,
    };
    const radiusKm = 2;

    const { eligibleShelters, secretShelter } = selectLightningShelter(
      sampleShelters,
      userLocation,
      radiusKm,
      rng,
    );

    expect(eligibleShelters.length).toBeGreaterThan(0);
    expect(
      eligibleShelters.some((candidate) => candidate.id === secretShelter.id),
    ).toBe(true);

    eligibleShelters.forEach((candidate) => {
      expect(candidate.distanceKm).toBeLessThanOrEqual(radiusKm);
      const calculatedDistance = haversineDistanceKm(userLocation, {
        lat: candidate.lat,
        lng: candidate.lng,
      });
      expect(calculatedDistance).toBeCloseTo(candidate.distanceKm, 6);
    });

    expect(secretShelter.distanceKm).toBeLessThanOrEqual(radiusKm);
  });

  it("throws when no shelters fall within the requested radius", () => {
    const farAwayLocation = { lat: 0, lng: 0 };

    expect(() =>
      listSheltersWithinRadius(sampleShelters, farAwayLocation, 0.1),
    ).not.toThrow();

    expect(() =>
      selectLightningShelter(sampleShelters, farAwayLocation, 0.1),
    ).toThrowError("No shelters within the provided radius.");
  });
});
const sampleShelters: POI[] = [
  {
    id: "s1",
    name: "Ariake Community Center",
    lat: 35.67,
    lng: 139.82,
    type: "shelter",
  },
  {
    id: "s2",
    name: "Shinonome Shelter",
    lat: 35.668,
    lng: 139.822,
    type: "shelter",
  },
  {
    id: "s3",
    name: "Toyosu Temporary Shelter",
    lat: 35.66,
    lng: 139.81,
    type: "shelter",
  },
];
