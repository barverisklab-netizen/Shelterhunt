import type { POI } from "@/types/game";
import { MAPBOX_CONFIG } from "@/config/mapbox";
import { kotoLayers } from "@/cityContext/koto/layers";

interface GeoPoint {
  lat: number;
  lng: number;
}

interface TileQueryFeature {
  id?: string | number;
  type?: string;
  geometry?: {
    type?: string;
    coordinates?: [number, number];
  };
  properties?: Record<string, unknown>;
}

interface TileQueryResponse {
  features?: TileQueryFeature[];
  unique?: Record<
    string,
    {
      values: Array<{ value: string | number | boolean; count: number }>;
    }
  >;
}

export interface ShelterQueryOptions {
  fetcher?: typeof fetch;
  radiusMeters: number;
  limit?: number;
  tilesetId?: string;
  layerName?: string;
  username?: string;
  token?: string;
}

const DESIGNATED_CATEGORY = "Designated EC";
const DEFAULT_LIMIT = 50;

const deriveShelterName = (props: Record<string, unknown>): string => {
  const raw =
    (props["Landmark name (EN)"] as string | undefined) ??
    (props["Landmark name (JP)"] as string | undefined) ??
    (props.name as string | undefined) ??
    "";
  return raw.trim();
};

const resolveShelterId = (
  featureId: string | number | undefined,
  name: string,
  props: Record<string, unknown>,
  seenIds: Set<string>,
): string => {
  const objectId =
    props["OBJECTID"] != null ? String(props["OBJECTID"]) : undefined;
  let candidateId =
    objectId ?? (featureId != null ? String(featureId) : name) ?? name;

  if (!candidateId) {
    candidateId = `${name}-${Math.random().toString(36).slice(2, 8)}`;
  }

  if (seenIds.has(candidateId)) {
    let suffix = 1;
    let next = `${candidateId}-${suffix}`;
    while (seenIds.has(next)) {
      suffix += 1;
      next = `${candidateId}-${suffix}`;
    }
    candidateId = next;
  }

  seenIds.add(candidateId);
  return candidateId;
};

const normalizeKey = (center: GeoPoint, radiusMeters: number) => {
  const lat = center.lat.toFixed(5);
  const lng = center.lng.toFixed(5);
  const radius = Math.round(radiusMeters);
  return `${lat}:${lng}:${radius}`;
};

type CacheEntry = {
  shelters: POI[];
  timestamp: number;
};

export class DesignatedShelterService {
  private cache = new Map<string, CacheEntry>();
  private cacheTtlMs = 60_000; // Refresh after 1 minute

  async queryShelters(
    center: GeoPoint,
    options: Omit<ShelterQueryOptions, "radiusMeters"> & { radiusMeters: number },
  ): Promise<POI[]> {
    const radiusMeters = Math.max(1, options.radiusMeters);
    const cacheKey = normalizeKey(center, radiusMeters);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.shelters;
    }

    const shelters = await this.fetchFromTilequery(center, {
      ...options,
      radiusMeters,
    });
    this.cache.set(cacheKey, { shelters, timestamp: Date.now() });
    return shelters;
  }

  private async fetchFromTilequery(
    center: GeoPoint,
    options: ShelterQueryOptions,
  ): Promise<POI[]> {
    const fetcher = options.fetcher ?? fetch;
    const limit =
      options.limit ?? Math.max(1, Math.min(DEFAULT_LIMIT, DEFAULT_LIMIT));
    const username = options.username ?? MAPBOX_CONFIG.username;
    const token = options.token ?? MAPBOX_CONFIG.accessToken;

    if (!token) {
      throw new Error("Mapbox access token is not configured.");
    }

    const designatedLayer =
      options.tilesetId && options.layerName
        ? {
            sourceData: {
              layerId: options.tilesetId,
              layerName: options.layerName,
            },
          }
        : kotoLayers.find((layer) =>
            /Designated Evacuation Centers/i.test(layer.label),
          );

    if (!designatedLayer) {
      throw new Error("Designated evacuation shelter layer metadata is missing.");
    }

    const tilesetId = `${username}.${designatedLayer.sourceData.layerId}`;
    const layerName = designatedLayer.sourceData.layerName;

    const radiusMeters = Math.max(1, Math.round(options.radiusMeters));
    const url = new URL(
      `https://api.mapbox.com/v4/${tilesetId}/tilequery/${center.lng},${center.lat}.json`,
    );
    url.searchParams.set("radius", String(radiusMeters));
    const normalizedLimit = Math.max(1, Math.min(50, limit));
    url.searchParams.set("limit", String(normalizedLimit));
    url.searchParams.set("dedupe", "true");
    url.searchParams.set("layers", layerName);
    url.searchParams.set("access_token", token);

    const response = await fetcher(url.toString());
    if (!response.ok) {
      throw new Error(
        `Mapbox tilequery request failed (${response.status} ${response.statusText})`,
      );
    }

    const payload = (await response.json()) as TileQueryResponse;
    const features = payload.features ?? [];

    console.log("[Tilequery] raw feature count:", features.length, {
      radiusKm: radiusMeters / 1000,
      center,
    });

    const seenNames = new Set<string>();
    const seenIds = new Set<string>();
    const shelters: POI[] = [];
    const categoryHistogram: Record<string, number> = {};

    features.forEach((feature) => {
      if (!feature || feature.geometry?.type !== "Point") {
        return;
      }
      const props = feature.properties ?? {};
      const category = (props["Category"] as string | undefined)?.trim();
      if (category) {
        categoryHistogram[category] = (categoryHistogram[category] || 0) + 1;
      }
      if (category !== DESIGNATED_CATEGORY) {
        return;
      }

      const name = deriveShelterName(props);
      if (!name) {
        return;
      }

      const nameKey = name.toLowerCase();
      if (seenNames.has(nameKey)) {
        return;
      }
      seenNames.add(nameKey);

      const [lng, lat] = feature.geometry?.coordinates ?? [];
      if (
        typeof lng !== "number" ||
        typeof lat !== "number" ||
        Number.isNaN(lng) ||
        Number.isNaN(lat)
      ) {
        return;
      }

      const id = resolveShelterId(feature.id, name, props, seenIds);

      shelters.push({
        id,
        name,
        lat,
        lng,
        type: "shelter",
      });
    });

    const uniqueCategories =
      payload.unique?.Category?.values?.map((entry) => ({
        value: entry.value,
        count: entry.count,
      })) ?? null;

    console.log("[Tilequery] filtered designated shelters:", shelters.length, {
      categories: categoryHistogram,
      uniqueCategories,
    });

    return shelters;
  }
}

export const designatedShelterService = new DesignatedShelterService();
