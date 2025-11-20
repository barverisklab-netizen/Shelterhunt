import { pool } from "../db/pool.js";
import type { ShelterRecord } from "../types/shelter.js";

const normalizeCode = (code: string) => code.trim().toUpperCase();

export async function listShelters(): Promise<ShelterRecord[]> {
  const result = await pool.query<ShelterRecord>(
    `select id,
            code,
            share_code,
            external_id,
            sequence_no,
            name_en,
            name_jp,
            address,
            address_en,
            address_jp,
            category,
            category_jp,
            flood_depth_rank,
            flood_depth,
            storm_surge_depth_rank,
            storm_surge_depth,
            flood_duration_rank,
            flood_duration,
            inland_waters_depth_rank,
            inland_waters_depth,
            latitude,
            longitude,
            created_at
     from public.shelters
     order by coalesce(name_en, name_jp, share_code) asc`,
  );
  return result.rows;
}

export async function findShelterByShareCode(code: string): Promise<ShelterRecord | null> {
  const normalized = normalizeCode(code);
  const result = await pool.query<ShelterRecord>(
    `select id,
            code,
            share_code,
            external_id,
            sequence_no,
            name_en,
            name_jp,
            address,
            address_en,
            address_jp,
            category,
            category_jp,
            flood_depth_rank,
            flood_depth,
            storm_surge_depth_rank,
            storm_surge_depth,
            flood_duration_rank,
            flood_duration,
            inland_waters_depth_rank,
            inland_waters_depth,
            latitude,
            longitude,
            created_at
     from public.shelters
     where share_code = $1
     limit 1`,
    [normalized],
  );
  return result.rows[0] ?? null;
}

export async function requireShelterByShareCode(code: string): Promise<ShelterRecord> {
  const shelter = await findShelterByShareCode(code);
  if (!shelter) {
    throw new Error(`Shelter share code ${code} not found`);
  }
  return shelter;
}
