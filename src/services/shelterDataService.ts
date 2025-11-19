import { API_BASE_URL } from "@/config/runtime";

export interface Shelter {
  id: string;
  code: string;
  shareCode: string;
  externalId: string | null;
  nameEn: string | null;
  nameJp: string | null;
  address: string | null;
  category: string | null;
  latitude: number;
  longitude: number;
}

interface ApiShelter {
  id: string;
  code: string;
  share_code: string;
  external_id: string | null;
  name_en: string | null;
  name_jp: string | null;
  address: string | null;
  category: string | null;
  latitude: number;
  longitude: number;
}

let sheltersPromise: Promise<Shelter[]> | null = null;

const mapShelter = (item: ApiShelter): Shelter => ({
  id: item.id,
  code: item.code,
  shareCode: item.share_code,
  externalId: item.external_id,
  nameEn: item.name_en,
  nameJp: item.name_jp,
  address: item.address,
  category: item.category,
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
