import distance from "@turf/distance";
import { point } from "@turf/helpers";
import { featureEach } from "@turf/meta";
import type { FeatureCollection, Point as TurfPoint } from "geojson";

import landmarkGeoJsonRaw from "../../../data/geojson/ihi_landmark.geojson?raw";
import supportGeoJsonRaw from "../../../data/geojson/ihi_support.geojson?raw";
import sheltersGeoJsonRaw from "../../../data/geojson/ihi_shelters.geojson?raw";

type AmenityFeature = {
  lat: number;
  lng: number;
  category: string;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

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

class AmenityIndex {
  private bucketSizeDeg = 0.005; // ~550m at this latitude
  private buckets = new Map<string, AmenityFeature[]>();
  private loadPromise: Promise<void> | null = null;

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
      const coords = feat.geometry.coordinates;
      const lng = coords[0];
      const lat = coords[1];
      const category =
        (feat.properties?.Category as string | undefined) ||
        (feat.properties?.["Category "] as string | undefined) ||
        "";

      if (!isFiniteNumber(lat) || !isFiniteNumber(lng) || !category) return;

      this.addFeature({ lat, lng, category });
    });
  }

  private async ensureLoaded() {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = Promise.resolve().then(() => {
      this.ingestCollection(parseGeoJson(landmarkGeoJsonRaw));
      this.ingestCollection(parseGeoJson(supportGeoJsonRaw));
      this.ingestCollection(parseGeoJson(sheltersGeoJsonRaw));
    });
    return this.loadPromise;
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

export const amenityIndex = new AmenityIndex();

export async function countAmenitiesWithinRadius(
  center: { lat: number; lng: number },
  radiusKm: number,
  categoryKeyMap: Record<string, string>,
): Promise<{ counts: Record<string, number>; matchedCategories: Set<string>; unmatched: Record<string, number> }> {
  const { features } = await amenityIndex.queryWithin(center, radiusKm);

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
