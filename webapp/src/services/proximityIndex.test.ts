import { afterEach, describe, expect, it } from "vitest";
import {
  __resetProximityIndexForTests,
  __setProximityIndexRawSourcesForTests,
  countAmenitiesWithinRadius,
  hasShelterWithinRadius,
} from "./proximityIndex";

// Mapping used in MapView for amenity keys
const AMENITY_CATEGORIES: Record<string, string> = {
  "Water Station": "waterStation250m",
  "Hospital": "hospital250m",
  "AED": "aed250m",
  "Emergency Supply Storage": "emergencySupplyStorage250m",
  "Community Center": "communityCenter250m",
  "Train Station": "trainStation250m",
  "Shrine/Temple": "shrineTemple250m",
  "Flood Gate": "floodgate250m",
  "Bridge": "bridge250m",
};

type FixtureFeature = {
  lat: number;
  lng: number;
  category: string;
  id?: string;
  nameEn?: string;
  nameJp?: string;
};

const toRawCollection = (features: FixtureFeature[]) =>
  JSON.stringify({
    type: "FeatureCollection",
    features: features.map((feature, idx) => ({
      type: "Feature",
      id: feature.id ?? `${feature.category}-${idx}`,
      geometry: { type: "Point", coordinates: [feature.lng, feature.lat] },
      properties: {
        Category: feature.category,
        "Landmark Name (EN)": feature.nameEn ?? feature.category,
        "Landmark Name (JP)": feature.nameJp ?? feature.category,
      },
    })),
  });

const installFixtureCollections = (...collections: FixtureFeature[][]) => {
  __setProximityIndexRawSourcesForTests(collections.map(toRawCollection));
};

afterEach(() => {
  __resetProximityIndexForTests();
});

describe("amenityIndex", () => {
  it("counts an amenity within 50m of the given center", async () => {
    installFixtureCollections([
      { lat: 35.7, lng: 139.82, category: "Water Station" },
      { lat: 35.71, lng: 139.82, category: "Water Station" },
    ]);

    const center = { lat: 35.7, lng: 139.82 };
    const { counts, matchedCategories, unmatched } = await countAmenitiesWithinRadius(
      center,
      0.05, // 50m
      AMENITY_CATEGORIES,
    );

    expect(counts.waterStation250m).toBe(1);
    expect(matchedCategories.has("Water Station")).toBe(true);
    expect(unmatched).toEqual({});
  });

  it("returns zero counts when nothing is within radius", async () => {
    installFixtureCollections([{ lat: 35.7, lng: 139.82, category: "Hospital" }]);

    const center = { lat: 0, lng: 0 };
    const { counts, matchedCategories, unmatched } = await countAmenitiesWithinRadius(
      center,
      0.25,
      AMENITY_CATEGORIES,
    );

    expect(counts).toEqual({});
    expect(matchedCategories.size).toBe(0);
    expect(Object.keys(unmatched)).toEqual([]);
  });

  it("returns the exact AED count for Daini Minamisuna JHS area (should be 1)", async () => {
    installFixtureCollections([
      { lat: 35.678, lng: 139.821, category: "AED" },
      { lat: 35.69, lng: 139.821, category: "AED" },
    ]);

    const center = { lat: 35.678, lng: 139.821 };
    const { counts, matchedCategories } = await countAmenitiesWithinRadius(
      center,
      0.25, // 250m
      AMENITY_CATEGORIES,
    );

    expect(counts.aed250m).toBe(1);
    expect(matchedCategories.has("AED")).toBe(true);
  });

  it("detects a shelter within 250m using geojson index", async () => {
    installFixtureCollections([
      { lat: 35.69516, lng: 139.8212, category: "Hospital" },
      { lat: 35.6956, lng: 139.8212, category: "Designated Evacuation Center" },
      { lat: 35.706, lng: 139.8212, category: "Evacuation Center" },
    ]);

    const center = { lat: 35.69516, lng: 139.8212 };
    const { found, nearest } = await hasShelterWithinRadius(center, 0.25);
    expect(found).toBe(true);
    expect(nearest?.category).toBe("Designated Evacuation Center");
  });

  it("replaces fixture data without leaking previously indexed features", async () => {
    const center = { lat: 35.7, lng: 139.82 };

    installFixtureCollections([{ lat: 35.7, lng: 139.82, category: "Water Station" }]);
    const first = await countAmenitiesWithinRadius(center, 0.05, AMENITY_CATEGORIES);
    expect(first.counts.waterStation250m).toBe(1);

    installFixtureCollections([{ lat: 35.7, lng: 139.82, category: "Hospital" }]);
    const second = await countAmenitiesWithinRadius(center, 0.05, AMENITY_CATEGORIES);
    expect(second.counts.waterStation250m).toBeUndefined();
    expect(second.counts.hospital250m).toBe(1);
  });
});
