// Canonical paths to locally bundled Koto geojson sources used for map layers.
export const KOTO_GEOJSON_SOURCES = {
  shelters: new URL("../../../data/geojson/koto/shelters.geojson", import.meta.url).href,
  support: new URL("../../../data/geojson/koto/support.geojson", import.meta.url).href,
  landmarks: new URL("../../../data/geojson/koto/landmark.geojson", import.meta.url).href,
} as const;

export type KotoGeojsonKey = keyof typeof KOTO_GEOJSON_SOURCES;
