import { afterEach, describe, expect, it, vi } from "vitest";
import type { POI } from "@/types/game";
import {
  fetchDesignatedShelterPOIs,
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("filters designated shelters from tilequery payload and deduplicates by name", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        features: [
          {
            id: "a-1",
            geometry: { type: "Point", coordinates: [139.8212, 35.69516] },
            properties: {
              Category: "Designated EC",
              "Landmark name (EN)": "Ariake Shelter",
              OBJECTID: 101,
            },
          },
          {
            id: "a-2",
            geometry: { type: "Point", coordinates: [139.82125, 35.6952] },
            properties: {
              Category: "Designated EC",
              "Landmark name (EN)": "ariake shelter",
              OBJECTID: 102,
            },
          },
          {
            id: "b-1",
            geometry: { type: "Point", coordinates: [139.822, 35.696] },
            properties: {
              Category: "Hospital",
              "Landmark name (EN)": "Not a Shelter",
              OBJECTID: 103,
            },
          },
        ],
      }),
    });

    const shelters = await fetchDesignatedShelterPOIs(
      { lat: 35.69516, lng: 139.8212 },
      0.25,
      {
        fetcher: fetchMock as unknown as typeof fetch,
        token: "token-1",
        username: "user-1",
        tilesetId: "tileset-1",
        layerName: "layer-1",
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(calledUrl).toContain("/v4/user-1.tileset-1/tilequery/139.8212,35.69516.json");
    expect(calledUrl).toContain("layers=layer-1");
    expect(calledUrl).toContain("radius=250");

    expect(shelters).toHaveLength(1);
    expect(shelters[0]).toMatchObject({
      id: "101",
      name: "Ariake Shelter",
      type: "shelter",
    });
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
