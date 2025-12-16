import { describe, it, expect } from "vitest";
import { countAmenitiesWithinRadius } from "./amenityIndex";

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

describe("amenityIndex", () => {
  it("counts an amenity within 50m of the given center", async () => {
    const center = { lat: 35.7001659, lng: 139.8199422 }; // Kameido Water Supply Station
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
    const center = { lat: 0, lng: 0 };
    const { counts, matchedCategories, unmatched } = await countAmenitiesWithinRadius(
      center,
      0.25,
      AMENITY_CATEGORIES,
    );

    expect(Object.values(counts).every((v) => !v)).toBe(true);
    expect(matchedCategories.size).toBe(0);
    expect(Object.keys(unmatched)).toEqual([]);
  });

  it("returns the exact AED count for Daini Minamisuna JHS area (should be 1)", async () => {
    const center = { lat: 35.67795, lng: 139.8213 }; // Daini Minamisuna Junior High School
    const { counts, matchedCategories } = await countAmenitiesWithinRadius(
      center,
      0.25, // 250m
      AMENITY_CATEGORIES,
    );

    expect(counts.aed250m).toBe(1);
    expect(matchedCategories.has("AED")).toBe(true);
  });
});
