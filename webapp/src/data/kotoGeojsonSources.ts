// Canonical paths to locally bundled Koto geojson sources used for map layers.
export const KOTO_GEOJSON_SOURCES = {
  shelters: new URL("../../../data/geojson/ihi_shelters.geojson", import.meta.url).href,
  support: new URL("../../../data/geojson/ihi_support.geojson", import.meta.url).href,
  landmarks: new URL("../../../data/geojson/ihi_landmark.geojson", import.meta.url).href,
} as const;

export type KotoGeojsonKey = keyof typeof KOTO_GEOJSON_SOURCES;
