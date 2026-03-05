import distance from "@turf/distance";
import { point } from "@turf/helpers";
import { featureEach } from "@turf/meta";
import type { FeatureCollection, Point as TurfPoint } from "geojson";

import landmarkGeoJsonRaw from "../../../data/geojson/koto/landmark.geojson?raw";
import supportGeoJsonRaw from "../../../data/geojson/koto/support.geojson?raw";
import sheltersGeoJsonRaw from "../../../data/geojson/koto/shelters.geojson?raw";

type AmenityFeature = {
  lat: number;
  lng: number;
  category: string;
  id?: string;
  name?: string;
  nameEn?: string;
  nameJp?: string;
};

type NearbyShelterFeature = AmenityFeature & { distanceKm: number };

const DEFAULT_GEOJSON_SOURCES = [landmarkGeoJsonRaw, supportGeoJsonRaw, sheltersGeoJsonRaw];

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const normalizeText = (value: string | number | null | undefined) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim().toLowerCase()
    : "";

const parseGeoJson = (raw: string): FeatureCollection<TurfPoint> | null => {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "type" in parsed &&
      (parsed as any).type === "FeatureCollection"
    ) {
      return parsed as FeatureCollection<TurfPoint>;
    }
  } catch (error) {
    console.warn("[Amenities] Failed to parse geojson", error);
  }
  return null;
};

class ProximityIndex {
  private bucketSizeDeg = 0.005; // ~550m at this latitude
  private buckets = new Map<string, AmenityFeature[]>();
  private loadPromise: Promise<void> | null = null;
  private rawSources: string[] = DEFAULT_GEOJSON_SOURCES;

  private bucketKey(lat: number, lng: number) {
    const latBucket = Math.floor(lat / this.bucketSizeDeg);
    const lngBucket = Math.floor(lng / this.bucketSizeDeg);
    return `${latBucket}:${lngBucket}`;
  }

  private addFeature(feature: AmenityFeature) {
    const key = this.bucketKey(feature.lat, feature.lng);
    const list = this.buckets.get(key);
    if (list) {
      list.push(feature);
    } else {
      this.buckets.set(key, [feature]);
    }
  }

  private ingestCollection(collection: FeatureCollection<TurfPoint> | null) {
    if (!collection) return;
    featureEach(collection, (feat) => {
      if (!feat || feat.geometry?.type !== "Point") return;
      const props = feat.properties ?? {};
      const coords = feat.geometry.coordinates;
      const lng = coords[0];
      const lat = coords[1];
      const category =
        (props?.Category as string | undefined) ||
        (props?.["Category "] as string | undefined) ||
        "";
      const featureId =
        feat.id != null ? String(feat.id) : props?.NO != null ? String(props.NO) : undefined;
      const nameEn =
        typeof props?.["Landmark Name (EN)"] === "string"
          ? props["Landmark Name (EN)"].trim()
          : typeof props?.["Landmark name (EN)"] === "string"
            ? props["Landmark name (EN)"].trim()
            : undefined;
      const nameJp =
        typeof props?.["Landmark Name (JP)"] === "string"
          ? props["Landmark Name (JP)"].trim()
          : typeof props?.["Landmark name (JP)"] === "string"
            ? props["Landmark name (JP)"].trim()
            : undefined;
      const name = nameEn || nameJp || category;

      if (!isFiniteNumber(lat) || !isFiniteNumber(lng) || !category) return;

      this.addFeature({
        lat,
        lng,
        category,
        id: featureId,
        name,
        nameEn,
        nameJp,
      });
    });
  }

  private resetBuckets() {
    this.buckets.clear();
    this.loadPromise = null;
  }

  private async ensureLoaded() {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = Promise.resolve().then(() => {
      this.rawSources.forEach((raw) => {
        this.ingestCollection(parseGeoJson(raw));
      });
    });
    return this.loadPromise;
  }

  resetForTests() {
    this.resetBuckets();
  }

  setRawSourcesForTests(rawSources: string[]) {
    this.rawSources = [...rawSources];
    this.resetBuckets();
  }

  restoreDefaultSourcesForTests() {
    this.rawSources = DEFAULT_GEOJSON_SOURCES;
    this.resetBuckets();
  }

  async queryWithin(
    center: { lat: number; lng: number },
    radiusKm: number,
  ): Promise<{ features: AmenityFeature[]; rawCategories: Set<string> }> {
    await this.ensureLoaded();

    const candidates: AmenityFeature[] = [];
    const radiusDeg = radiusKm / 111; // rough degrees per km
    const bucketRadius = Math.max(1, Math.ceil(radiusDeg / this.bucketSizeDeg));

    const centerLatBucket = Math.floor(center.lat / this.bucketSizeDeg);
    const centerLngBucket = Math.floor(center.lng / this.bucketSizeDeg);

    for (let dLat = -bucketRadius; dLat <= bucketRadius; dLat += 1) {
      for (let dLng = -bucketRadius; dLng <= bucketRadius; dLng += 1) {
        const key = `${centerLatBucket + dLat}:${centerLngBucket + dLng}`;
        const bucket = this.buckets.get(key);
        if (bucket) {
          candidates.push(...bucket);
        }
      }
    }

    const centerPoint = point([center.lng, center.lat]);
    const features: AmenityFeature[] = [];
    const rawCategories = new Set<string>();

    candidates.forEach((feature) => {
      const dist = distance(centerPoint, point([feature.lng, feature.lat]), {
        units: "kilometers",
      });
      if (dist <= radiusKm) {
        features.push(feature);
        rawCategories.add(feature.category);
      }
    });

    return { features, rawCategories };
  }
}

export const proximityIndex = new ProximityIndex();
export const __setProximityIndexRawSourcesForTests = (rawSources: string[]) => {
  proximityIndex.setRawSourcesForTests(rawSources);
};
export const __resetProximityIndexForTests = () => {
  proximityIndex.restoreDefaultSourcesForTests();
};
export const SHELTER_CATEGORY_MAP: Record<string, string> = {
  "Designated Evacuation Center": "shelter",
  "Voluntary Evacuation Center": "shelter",
  "Temporary Evacuation Center": "shelter",
  "Special Needs Shelter": "shelter",
  "Evacuation Center": "shelter",
  "EC": "shelter",
  "Designated EC": "shelter",
  "EC/Voluntary EC": "shelter",
};

const isShelterCategory = (category: string) => {
  if (!category) return false;
  if (SHELTER_CATEGORY_MAP[category]) return true;
  const normalized = category.trim().toLowerCase();
  return (
    normalized.includes("evacuation center") ||
    normalized === "ec" ||
    normalized.includes("designated ec") ||
    normalized.includes("voluntary ec") ||
    normalized.includes("ec/")
  );
};

export async function countAmenitiesWithinRadius(
  center: { lat: number; lng: number },
  radiusKm: number,
  categoryKeyMap: Record<string, string>,
): Promise<{ counts: Record<string, number>; matchedCategories: Set<string>; unmatched: Record<string, number> }> {
  const { features } = await proximityIndex.queryWithin(center, radiusKm);

  const counts: Record<string, number> = {};
  const unmatched: Record<string, number> = {};
  const matchedCategories = new Set<string>();

  features.forEach((feature) => {
    const key = categoryKeyMap[feature.category];
    if (!key) {
      unmatched[feature.category] = (unmatched[feature.category] ?? 0) + 1;
      return;
    }
    matchedCategories.add(feature.category);
    counts[key] = (counts[key] ?? 0) + 1;
  });

  return { counts, matchedCategories, unmatched };
}

export async function hasShelterWithinRadius(
  center: { lat: number; lng: number },
  radiusKm: number,
): Promise<{ found: boolean; nearest?: NearbyShelterFeature }> {
  const { features } = await proximityIndex.queryWithin(center, radiusKm);

  let nearest: NearbyShelterFeature | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  features.forEach((feature) => {
    if (!isShelterCategory(feature.category)) return;
    const d = distance(point([center.lng, center.lat]), point([feature.lng, feature.lat]), {
      units: "kilometers",
    });
    if (d < nearestDistance) {
      nearestDistance = d;
      nearest = { ...feature, distanceKm: d };
    }
  });

  return { found: Boolean(nearest), nearest };
}

export type ShelterMatchTarget = {
  id?: string;
  name?: string;
  altIds?: string[];
  altNames?: string[];
};

export async function matchShelterWithinRadius(
  center: { lat: number; lng: number },
  radiusKm: number,
  target: ShelterMatchTarget,
): Promise<{ match: NearbyShelterFeature | null; nearest?: NearbyShelterFeature }> {
  const { features } = await proximityIndex.queryWithin(center, radiusKm);

  const centerPoint = point([center.lng, center.lat]);
  const targetIds = [target.id, ...(target.altIds ?? [])]
    .map(normalizeText)
    .filter(Boolean);
  const targetNames = [target.name, ...(target.altNames ?? [])]
    .map(normalizeText)
    .filter(Boolean);

  let nearest: NearbyShelterFeature | undefined;

  for (const feature of features) {
    if (!isShelterCategory(feature.category)) continue;

    const distanceKm = distance(centerPoint, point([feature.lng, feature.lat]), {
      units: "kilometers",
    });
    const withDistance: NearbyShelterFeature = { ...feature, distanceKm };

    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = withDistance;
    }

    const candidateTokens = [
      feature.id,
      feature.name,
      feature.nameEn,
      feature.nameJp,
      feature.category,
    ]
      .map(normalizeText)
      .filter(Boolean);

    const matchesId = targetIds.some((id) => candidateTokens.includes(id));
    const matchesName = targetNames.some((name) => candidateTokens.includes(name));

    if (matchesId || matchesName) {
      return { match: withDistance, nearest };
    }
  }

  return { match: null, nearest };
}
