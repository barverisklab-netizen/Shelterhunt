import type { POI } from "@/data/mockData";
import { MAPBOX_CONFIG } from "@/config/mapbox";
import { kotoLayers } from "@/cityContext/koto/layers";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ShelterCandidate {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
}

export type RandomFn = () => number;

export const haversineDistanceKm = (a: GeoPoint, b: GeoPoint): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) *
      Math.sin(dLng / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return R * c;
};

export const listSheltersWithinRadius = (
  pois: POI[],
  center: GeoPoint,
  radiusKm: number,
): ShelterCandidate[] => {
  return pois
    .filter((poi) => poi.type === "shelter")
    .map<ShelterCandidate>((poi) => ({
      id: poi.id,
      name: poi.name,
      lat: poi.lat,
      lng: poi.lng,
      distanceKm: haversineDistanceKm(center, { lat: poi.lat, lng: poi.lng }),
    }))
    .filter((candidate) => candidate.distanceKm <= radiusKm);
};

export const selectLightningShelter = (
  pois: POI[],
  center: GeoPoint,
  radiusKm: number,
  rng: RandomFn = Math.random,
): { eligibleShelters: ShelterCandidate[]; secretShelter: ShelterCandidate } => {
  const eligibleShelters = listSheltersWithinRadius(pois, center, radiusKm);

  if (!eligibleShelters.length) {
    throw new Error("No shelters within the provided radius.");
  }

  const index = Math.floor(rng() * eligibleShelters.length);
  const secretShelter = eligibleShelters[index];

  return { eligibleShelters, secretShelter };
};

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
}

export interface FetchDesignatedShelterOptions {
  fetcher?: typeof fetch;
  limit?: number;
  token?: string;
  username?: string;
  tilesetId?: string;
  layerName?: string;
}

const DESIGNATED_CATEGORY = "Designated EC";

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

export const fetchDesignatedShelterPOIs = async (
  center: GeoPoint,
  radiusKm: number,
  options?: FetchDesignatedShelterOptions,
): Promise<POI[]> => {
  const fetcher = options?.fetcher ?? fetch;
  const limit = options?.limit ?? 200;
  const username = options?.username ?? MAPBOX_CONFIG.username;
  const token = options?.token ?? MAPBOX_CONFIG.accessToken;

  if (!token) {
    throw new Error("Mapbox access token is not configured.");
  }

  const designatedLayer =
    options?.tilesetId && options?.layerName
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

  const clampedRadiusKm = Math.max(0, radiusKm);
  const radiusMeters = Math.max(1, Math.round(clampedRadiusKm * 1000));
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

  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  const shelters: POI[] = [];

  features.forEach((feature) => {
    if (!feature || feature.geometry?.type !== "Point") {
      return;
    }
    const props = feature.properties ?? {};
    const category = (props["Category"] as string | undefined)?.trim();
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

    const [lng, lat] = feature.geometry.coordinates ?? [];
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

  return shelters;
};
