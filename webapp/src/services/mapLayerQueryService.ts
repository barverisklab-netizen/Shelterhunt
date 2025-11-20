import { getShelters, type Shelter } from "./shelterDataService";

export interface MapLayerPOI {
  id: string;
  shareCode: string;
  datasetCode: string;
  name: string;
  category: string | null;
  layerLabel: string;
  lat: number;
  lng: number;
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

const toPOI = (shelter: Shelter): MapLayerPOI => {
  const name =
    shelter.nameEn ??
    shelter.nameJp ??
    shelter.externalId ??
    `Shelter-${shelter.code}`;

  return {
    id: shelter.shareCode,
    shareCode: shelter.shareCode,
    datasetCode: shelter.code,
    name,
    category: shelter.category,
    layerLabel: "Shelters",
    lat: shelter.latitude,
    lng: shelter.longitude,
  };
};

export class MapLayerQueryService {
  private shelterPOIsPromise: Promise<MapLayerPOI[]> | null = null;
  private proximityMeters =
    Number(import.meta.env?.VITE_POI_PROXIMITY_RADIUS_METERS) || 25;

  private async loadShelterPOIs(): Promise<MapLayerPOI[]> {
    if (!this.shelterPOIsPromise) {
      this.shelterPOIsPromise = getShelters().then((shelters) =>
        shelters.map((shelter) => toPOI(shelter)),
      );
    }
    const pois = await this.shelterPOIsPromise;
    return [...pois];
  }

  async queryNearbyPOIs(center: { lat: number; lng: number }): Promise<MapLayerPOI[]> {
    const radius = Math.max(1, this.proximityMeters);
    const shelters = await this.loadShelterPOIs();
    return shelters.filter((poi) => haversineMeters(center, poi) <= radius);
  }

  async getAllShelters(): Promise<MapLayerPOI[]> {
    return this.loadShelterPOIs();
  }
}

export const mapLayerQueryService = new MapLayerQueryService();
export const getLocalShelters = (): Promise<MapLayerPOI[]> =>
  mapLayerQueryService.getAllShelters();
