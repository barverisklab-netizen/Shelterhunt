import { API_BASE_URL } from "@/config/runtime";

export interface Shelter {
  id: string;
  code: string;
  shareCode: string;
  externalId: string | null;
  sequenceNo: number | null;
  nameEn: string | null;
  nameJp: string | null;
  address: string | null;
  addressEn: string | null;
  addressJp: string | null;
  category: string | null;
  categoryJp: string | null;
  floodDepthRank: number | null;
  floodDepth: string | null;
  stormSurgeDepthRank: number | null;
  stormSurgeDepth: string | null;
  floodDurationRank: number | null;
  floodDuration: string | null;
  inlandWatersDepthRank: number | null;
  inlandWatersDepth: string | null;
  latitude: number;
  longitude: number;
}

interface ApiShelter {
  id: string;
  code: string;
  share_code: string;
  external_id: string | null;
  sequence_no: number | null;
  name_en: string | null;
  name_jp: string | null;
  address: string | null;
  address_en: string | null;
  address_jp: string | null;
  category: string | null;
  category_jp: string | null;
  flood_depth_rank: number | null;
  flood_depth: string | null;
  storm_surge_depth_rank: number | null;
  storm_surge_depth: string | null;
  flood_duration_rank: number | null;
  flood_duration: string | null;
  inland_waters_depth_rank: number | null;
  inland_waters_depth: string | null;
  latitude: number;
  longitude: number;
}

let sheltersPromise: Promise<Shelter[]> | null = null;

const mapShelter = (item: ApiShelter): Shelter => ({
  id: item.id,
  code: item.code,
  shareCode: item.share_code,
  externalId: item.external_id,
  sequenceNo: item.sequence_no,
  nameEn: item.name_en,
  nameJp: item.name_jp,
  address: item.address,
  addressEn: item.address_en,
  addressJp: item.address_jp,
  category: item.category,
  categoryJp: item.category_jp,
  floodDepthRank: item.flood_depth_rank,
  floodDepth: item.flood_depth,
  stormSurgeDepthRank: item.storm_surge_depth_rank,
  stormSurgeDepth: item.storm_surge_depth,
  floodDurationRank: item.flood_duration_rank,
  floodDuration: item.flood_duration,
  inlandWatersDepthRank: item.inland_waters_depth_rank,
  inlandWatersDepth: item.inland_waters_depth,
  latitude: item.latitude,
  longitude: item.longitude,
});

async function requestShelters(): Promise<Shelter[]> {
  const response = await fetch(`${API_BASE_URL}/shelters`);
  if (!response.ok) {
    throw new Error(`Failed to load shelters: ${response.status} ${response.statusText}`);
  }
  const payload = (await response.json()) as { shelters: ApiShelter[] };
  return payload.shelters.map(mapShelter);
}

export function getShelters(force = false): Promise<Shelter[]> {
  if (!sheltersPromise || force) {
    sheltersPromise = requestShelters();
  }
  return sheltersPromise;
}

export async function getShelterByShareCode(code: string): Promise<Shelter | undefined> {
  const shelters = await getShelters();
  return shelters.find((shelter) => shelter.shareCode === code.toUpperCase());
}
