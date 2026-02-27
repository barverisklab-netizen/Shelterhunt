import type { Map as MapboxMap } from "mapbox-gl";

export interface LatLng {
  lat: number;
  lng: number;
}

export const TERRAIN_DEM_SOURCE_ID = "mapbox-terrain-dem-source";
export const TERRAIN_DEM_TILESET = "mapbox://mapbox.mapbox-terrain-dem-v1";
export const TERRAIN_RGB_TILESET_ID = "mapbox.terrain-rgb";
export const TERRAIN_RGB_ZOOM = 14;
export const ELEVATION_CACHE_LIMIT = 1024;

export const clampLatitude = (lat: number) =>
  Math.max(-85.05112878, Math.min(85.05112878, lat));

export const toTerrainTilePoint = (coords: LatLng, zoom: number) => {
  const lat = clampLatitude(coords.lat);
  const lng = ((((coords.lng + 180) % 360) + 360) % 360) - 180;
  const scale = 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    scale;

  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  const pixelX = Math.max(0, Math.min(255, Math.floor((x - tileX) * 256)));
  const pixelY = Math.max(0, Math.min(255, Math.floor((y - tileY) * 256)));

  return { tileX, tileY, pixelX, pixelY };
};

export const decodeTerrainRgbElevation = (r: number, g: number, b: number) =>
  -10000 + (r * 256 * 256 + g * 256 + b) * 0.1;

export const getElevationCacheKey = (coords: LatLng) =>
  `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;

export const setBoundedElevationCacheValue = (
  cache: Map<string, number | null>,
  key: string,
  value: number | null,
  limit = ELEVATION_CACHE_LIMIT,
) => {
  cache.set(key, value);
  if (cache.size > limit) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
};

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load terrain tile: ${url}`));
    image.src = url;
  });

export const queryTerrainRgbElevation = async (
  coords: LatLng,
  accessToken: string,
): Promise<number | null> => {
  if (typeof document === "undefined" || !accessToken) {
    return null;
  }

  const { tileX, tileY, pixelX, pixelY } = toTerrainTilePoint(coords, TERRAIN_RGB_ZOOM);
  const tileUrl =
    `https://api.mapbox.com/v4/${TERRAIN_RGB_TILESET_ID}/${TERRAIN_RGB_ZOOM}/${tileX}/${tileY}.pngraw` +
    `?access_token=${encodeURIComponent(accessToken)}`;

  const image = await loadImage(tileUrl);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.drawImage(image, 0, 0);
  const pixel = context.getImageData(pixelX, pixelY, 1, 1).data;
  if (!pixel || pixel.length < 4 || pixel[3] === 0) {
    return null;
  }

  return decodeTerrainRgbElevation(pixel[0], pixel[1], pixel[2]);
};

export const queryMapTerrainElevation = (
  map: MapboxMap,
  coords?: LatLng | null,
): number | null => {
  if (!coords) return null;
  try {
    const value = (map as any).queryTerrainElevation?.([coords.lng, coords.lat], {
      exaggerated: false,
    });
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

export const ensureMapTerrainEnabled = (map: MapboxMap) => {
  try {
    if (typeof map.isStyleLoaded === "function" && !map.isStyleLoaded()) {
      return;
    }
    if (!map.getSource(TERRAIN_DEM_SOURCE_ID)) {
      map.addSource(TERRAIN_DEM_SOURCE_ID, {
        type: "raster-dem",
        url: TERRAIN_DEM_TILESET,
        tileSize: 512,
        maxzoom: 14,
      });
    }
    const currentTerrain = (map as any).getTerrain?.();
    if (!currentTerrain || currentTerrain.source !== TERRAIN_DEM_SOURCE_ID) {
      map.setTerrain({ source: TERRAIN_DEM_SOURCE_ID, exaggeration: 1 });
    }
  } catch (error) {
    console.warn("[Map] Failed to enable terrain source", error);
  }
};
