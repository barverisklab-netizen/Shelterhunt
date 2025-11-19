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

const GEOJSON_PATH = path.resolve(
  process.cwd(),
  "../src/assets/Data/ihi_shelters.geojson",
);

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
        lat = toNumber(props["緯度"] ?? props["lat"]);
      }
      if (!Number.isFinite(lng ?? NaN)) {
        lng = toNumber(props["経度"] ?? props["lng"]);
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
      const address = normalizeText(props["住所"]) ?? normalizeText(props["address"]);
      const category = normalizeText(props["Category"]) ?? normalizeText(props["category"]);
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
        category,
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
           (code, share_code, external_id, sequence_no, name_en, name_jp, address, category, latitude, longitude)
         values
           ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         on conflict (code) do update set
           share_code = excluded.share_code,
           external_id = excluded.external_id,
           sequence_no = excluded.sequence_no,
           name_en = excluded.name_en,
           name_jp = excluded.name_jp,
           address = excluded.address,
           category = excluded.category,
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
          row.category,
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
