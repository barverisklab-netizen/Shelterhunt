import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pool } from "../src/db/pool.js";
import type { ShelterRecord } from "../src/types/shelter.js";

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

const GEOJSON_PATH = path.resolve(process.cwd(), "assets/ihi_shelters.geojson");

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const toNumber = (value: unknown) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};

const generateCode = (source: string, used: Set<string>): string => {
  const base = source.trim().toUpperCase();
  if (base && base.length >= 4 && !used.has(base)) {
    used.add(base);
    return base;
  }

  for (let i = 0; i < 20; i += 1) {
    const hash = crypto
      .createHash("sha1")
      .update(`${source}:${i}`)
      .digest("base64url")
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase();
    const candidate = hash.slice(0, 6).padEnd(6, "X");
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  throw new Error(`Unable to generate unique code for source: ${source}`);
};

const generateShareCode = (used: Set<string>) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  throw new Error("Failed to generate unique share code");
};

const parseFeatures = async () => {
  const raw = await fs.readFile(GEOJSON_PATH, "utf-8");
  const data = JSON.parse(raw) as GeoJSONCollection;
  const features = data.features ?? [];
  const usedCodes = new Set<string>();
  const usedShareCodes = new Set<string>();

  return features
    .map((feature, index) => {
      const props = feature.properties ?? {};
      const coords = feature.geometry?.coordinates;
      let lng = toNumber(coords?.[0]);
      let lat = toNumber(coords?.[1]);

      // Swap if lat/lng reversed
      if (
        typeof coords?.[0] === "number" &&
        typeof coords?.[1] === "number" &&
        Math.abs(coords[0]) < 90 &&
        Math.abs(coords[1]) > 90
      ) {
        lat = coords[0];
        lng = coords[1];
      }

      if (!Number.isFinite(lat ?? NaN)) {
        lat = toNumber(props["緯度"] ?? props["lat"] ?? props["Lat"] ?? props["LAT"] ?? props["Latitude"]);
      }
      if (!Number.isFinite(lng ?? NaN)) {
        lng = toNumber(
          props["経度"] ?? props["lng"] ?? props["Lng"] ?? props["LNG"] ?? props["Longitude"] ?? props["Longtitude"],
        );
      }

      if (!Number.isFinite(lat ?? NaN) || !Number.isFinite(lng ?? NaN)) {
        return null;
      }

      const externalId =
        normalizeText(props["共通ID"]) ??
        normalizeText(props["id"]) ??
        normalizeText(props["ID"]);
      const sequenceNo =
        toNumber(props["NO"]) ?? toNumber(props["No"]) ?? index + 1;
      const nameEn = normalizeText(props["Landmark Name (EN)"]);
      const nameJp =
        normalizeText(props["Landmark Name (JP)"]) ?? normalizeText(props["name"]);
      const addressEn =
        normalizeText(props["Address (EN)"]) ??
        normalizeText(props["住所（英語）"]) ??
        normalizeText(props["address_en"]);
      const addressJp =
        normalizeText(props["Address (JP)"]) ??
        normalizeText(props["住所"]) ??
        normalizeText(props["address_jp"]);
      const address =
        normalizeText(props["住所"]) ??
        normalizeText(props["address"]) ??
        addressEn ??
        addressJp;
      const category = normalizeText(props["Category"]) ?? normalizeText(props["category"]);
      const categoryJp =
        normalizeText(props["Category (JP)"]) ??
        normalizeText(props["カテゴリ"]) ??
        normalizeText(props["category_jp"]);
      const floodDepthRank = toNumber(props["Flood_Depth_Rank"]);
      const floodDepth = normalizeText(props["Flood_Depth"]);
      const stormSurgeDepthRank = toNumber(props["StormSurge_Depth_Rank"]);
      const stormSurgeDepth = normalizeText(props["StormSurge_Depth"]);
      const floodDurationRank = toNumber(props["Flood_Duration_Rank"]);
      const floodDuration = normalizeText(props["Flood_Duration"]);
      const inlandWatersDepthRank = toNumber(props["InlandWaters_Depth_Rank"]);
      const inlandWatersDepth = normalizeText(props["InlandWaters_Depth"]);
      const codeSource =
        externalId ??
        (typeof sequenceNo === "number" ? `SEQ-${sequenceNo}` : `${lat}-${lng}`);
      const code = generateCode(codeSource, usedCodes);
      const shareCode = generateShareCode(usedShareCodes);

      return {
        code,
        share_code: shareCode,
        external_id: externalId,
        sequence_no: typeof sequenceNo === "number" ? sequenceNo : null,
        name_en: nameEn,
        name_jp: nameJp,
        address,
        address_en: addressEn,
        address_jp: addressJp,
        category,
        category_jp: categoryJp,
        flood_depth_rank: typeof floodDepthRank === "number" ? floodDepthRank : null,
        flood_depth: floodDepth,
        storm_surge_depth_rank: typeof stormSurgeDepthRank === "number" ? stormSurgeDepthRank : null,
        storm_surge_depth: stormSurgeDepth,
        flood_duration_rank: typeof floodDurationRank === "number" ? floodDurationRank : null,
        flood_duration: floodDuration,
        inland_waters_depth_rank: typeof inlandWatersDepthRank === "number" ? inlandWatersDepthRank : null,
        inland_waters_depth: inlandWatersDepth,
        latitude: Number(lat),
        longitude: Number(lng),
      } satisfies Omit<ShelterRecord, "id" | "created_at">;
    })
    .filter((item): item is Omit<ShelterRecord, "id" | "created_at"> => Boolean(item));
};

const insertShelters = async (rows: Omit<ShelterRecord, "id" | "created_at">[]) => {
  if (!rows.length) {
    console.log("[Shelters] No rows to insert");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of rows) {
      await client.query(
        `insert into public.shelters
           (code, share_code, external_id, sequence_no, name_en, name_jp, address, address_en, address_jp, category, category_jp,
            flood_depth_rank, flood_depth, storm_surge_depth_rank, storm_surge_depth,
            flood_duration_rank, flood_duration, inland_waters_depth_rank, inland_waters_depth, latitude, longitude)
         values
           ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
            $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21)
         on conflict (code) do update set
           share_code = excluded.share_code,
           external_id = excluded.external_id,
           sequence_no = excluded.sequence_no,
           name_en = excluded.name_en,
           name_jp = excluded.name_jp,
           address = excluded.address,
           address_en = excluded.address_en,
           address_jp = excluded.address_jp,
           category = excluded.category,
           category_jp = excluded.category_jp,
           flood_depth_rank = excluded.flood_depth_rank,
           flood_depth = excluded.flood_depth,
           storm_surge_depth_rank = excluded.storm_surge_depth_rank,
           storm_surge_depth = excluded.storm_surge_depth,
           flood_duration_rank = excluded.flood_duration_rank,
           flood_duration = excluded.flood_duration,
           inland_waters_depth_rank = excluded.inland_waters_depth_rank,
           inland_waters_depth = excluded.inland_waters_depth,
           latitude = excluded.latitude,
           longitude = excluded.longitude`,
        [
          row.code,
          row.share_code,
          row.external_id,
          row.sequence_no,
          row.name_en,
          row.name_jp,
          row.address,
          row.address_en,
          row.address_jp,
          row.category,
          row.category_jp,
          row.flood_depth_rank,
          row.flood_depth,
          row.storm_surge_depth_rank,
          row.storm_surge_depth,
          row.flood_duration_rank,
          row.flood_duration,
          row.inland_waters_depth_rank,
          row.inland_waters_depth,
          row.latitude,
          row.longitude,
        ],
      );
    }
    await client.query("COMMIT");
    console.log(`[Shelters] Inserted/updated ${rows.length} shelters`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

async function main() {
  try {
    const rows = await parseFeatures();
    await insertShelters(rows);
  } catch (error) {
    console.error("[Shelters] Import failed:", error);
    process.exitCode = 1;
  }
}

await main();
