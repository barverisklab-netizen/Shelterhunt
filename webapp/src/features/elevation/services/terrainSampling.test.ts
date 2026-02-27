import { describe, expect, it } from "vitest";
import {
  clampLatitude,
  decodeTerrainRgbElevation,
  getElevationCacheKey,
  setBoundedElevationCacheValue,
  toTerrainTilePoint,
} from "./terrainSampling";

describe("terrainSampling helpers", () => {
  it("clamps latitude to Web Mercator limits", () => {
    expect(clampLatitude(90)).toBe(85.05112878);
    expect(clampLatitude(-90)).toBe(-85.05112878);
    expect(clampLatitude(35.7)).toBe(35.7);
  });

  it("converts coordinates to terrain tile and pixel at zoom 14", () => {
    const result = toTerrainTilePoint({ lat: 0, lng: 0 }, 14);
    expect(result).toEqual({
      tileX: 8192,
      tileY: 8192,
      pixelX: 0,
      pixelY: 0,
    });
  });

  it("decodes terrain-rgb elevation values", () => {
    expect(decodeTerrainRgbElevation(0, 0, 0)).toBe(-10000);
    expect(decodeTerrainRgbElevation(128, 0, 0)).toBeCloseTo(828860.8, 6);
  });

  it("creates a stable rounded cache key", () => {
    expect(getElevationCacheKey({ lat: 35.123456, lng: 139.987654 })).toBe(
      "35.12346,139.98765",
    );
  });

  it("evicts the oldest cache entry when over limit", () => {
    const cache = new Map<string, number | null>();

    setBoundedElevationCacheValue(cache, "a", 1, 2);
    setBoundedElevationCacheValue(cache, "b", 2, 2);
    setBoundedElevationCacheValue(cache, "c", 3, 2);

    expect([...cache.keys()]).toEqual(["b", "c"]);
    expect(cache.get("a")).toBeUndefined();
  });
});
