import { pool } from "../db/pool.js";
import type { ShelterRecord } from "../types/shelter.js";

const normalizeCode = (code: string) => code.trim().toUpperCase();
const isMissingQuestionAnswersColumnError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === "42703";

const SHELTER_SELECT_WITH_QUESTION_ANSWERS = `select id,
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
            facility_type,
            shelter_capacity,
            water_station_250m,
            hospital_250m,
            aed_250m,
            emergency_supply_storage_250m,
            community_center_250m,
            train_station_250m,
            shrine_temple_250m,
            floodgate_250m,
            bridge_250m,
            question_answers,
            latitude,
            longitude,
            created_at
     from shelters`;

const SHELTER_SELECT_WITH_FALLBACK_QUESTION_ANSWERS = `select id,
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
            facility_type,
            shelter_capacity,
            water_station_250m,
            hospital_250m,
            aed_250m,
            emergency_supply_storage_250m,
            community_center_250m,
            train_station_250m,
            shrine_temple_250m,
            floodgate_250m,
            bridge_250m,
            '{}'::jsonb as question_answers,
            latitude,
            longitude,
            created_at
     from shelters`;

export async function listShelters(): Promise<ShelterRecord[]> {
  const orderedSuffix = "\n     order by coalesce(name_en, name_jp, share_code) asc";
  try {
    const result = await pool.query<ShelterRecord>(
      `${SHELTER_SELECT_WITH_QUESTION_ANSWERS}${orderedSuffix}`,
    );
    return result.rows;
  } catch (error) {
    if (!isMissingQuestionAnswersColumnError(error)) {
      throw error;
    }
    const fallback = await pool.query<ShelterRecord>(
      `${SHELTER_SELECT_WITH_FALLBACK_QUESTION_ANSWERS}${orderedSuffix}`,
    );
    return fallback.rows;
  }
}

export async function findShelterByShareCode(code: string): Promise<ShelterRecord | null> {
  const normalized = normalizeCode(code);
  const whereSuffix = "\n     where share_code = $1\n     limit 1";
  try {
    const result = await pool.query<ShelterRecord>(
      `${SHELTER_SELECT_WITH_QUESTION_ANSWERS}${whereSuffix}`,
      [normalized],
    );
    return result.rows[0] ?? null;
  } catch (error) {
    if (!isMissingQuestionAnswersColumnError(error)) {
      throw error;
    }
    const fallback = await pool.query<ShelterRecord>(
      `${SHELTER_SELECT_WITH_FALLBACK_QUESTION_ANSWERS}${whereSuffix}`,
      [normalized],
    );
    return fallback.rows[0] ?? null;
  }
}

export async function requireShelterByShareCode(code: string): Promise<ShelterRecord> {
  const shelter = await findShelterByShareCode(code);
  if (!shelter) {
    throw new Error(`Shelter share code ${code} not found`);
  }
  return shelter;
}
