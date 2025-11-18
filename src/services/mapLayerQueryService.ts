import sheltersRaw from "@/assets/Data/ihi_shelters.geojson?raw";

export interface MapLayerPOI {
  id: string;
  name: string;
  category: string | null;
  layerLabel: string;
  lat: number;
  lng: number;
}

interface GeoJSONFeature {
  type: string;
  properties?: Record<string, any>;
  geometry?: {
    type?: string;
    coordinates?: [number, number];
  };
}

interface GeoJSONCollection {
  type: string;
  features?: GeoJSONFeature[];
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const haversineMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return R * c;
};

const parseShelterPOIs = (): MapLayerPOI[] => {
  const parsed = JSON.parse(sheltersRaw) as GeoJSONCollection;
  const features = parsed.features ?? [];
  return features
    .map((feature, index) => {
      const props = feature.properties ?? {};
      const latFromProps = Number(props["緯度"] ?? props["lat"]);
      const lngFromProps = Number(props["経度"] ?? props["lng"]);
      const coords = feature.geometry?.coordinates;
      let lng = typeof coords?.[0] === "number" ? coords[0] : Number.isFinite(lngFromProps) ? lngFromProps : NaN;
      let lat = typeof coords?.[1] === "number" ? coords[1] : Number.isFinite(latFromProps) ? latFromProps : NaN;
      // Fix datasets where coordinates were stored reversed (lat, lng)
      if (
        typeof coords?.[0] === "number" &&
        typeof coords?.[1] === "number" &&
        Math.abs(coords[0]) < 90 &&
        Math.abs(coords[1]) > 90
      ) {
        lat = coords[0];
        lng = coords[1];
      }

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      const name =
        (props["Landmark Name (EN)"] as string | undefined) ??
        (props["Landmark Name (JP)"] as string | undefined) ??
        (props.name as string | undefined) ??
        `Shelter-${index + 1}`;

      const category = (props["Category"] as string | undefined) ?? null;
      const id =
        (props["共通ID"] as string | undefined) ??
        (props["NO"] != null ? String(props["NO"]) : undefined) ??
        feature.geometry?.type === "Point"
          ? `poi-${lat.toFixed(6)}-${lng.toFixed(6)}`
          : `poi-${index}`;

      return {
        id,
        name,
        category,
        layerLabel: "Shelters",
        lat,
        lng,
      } satisfies MapLayerPOI;
    })
    .filter((poi): poi is MapLayerPOI => Boolean(poi));
};

const LOCAL_POIS = parseShelterPOIs();

export class MapLayerQueryService {
  private proximityMeters =
    Number(import.meta.env?.VITE_POI_PROXIMITY_RADIUS_METERS) || 25;

  async queryNearbyPOIs(center: { lat: number; lng: number }): Promise<MapLayerPOI[]> {
    const radius = Math.max(1, this.proximityMeters);
    return LOCAL_POIS.filter((poi) => haversineMeters(center, poi) <= radius);
  }
}

export const mapLayerQueryService = new MapLayerQueryService();
export const getLocalShelters = (): MapLayerPOI[] => [...LOCAL_POIS];
