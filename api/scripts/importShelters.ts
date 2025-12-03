import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pool } from "../src/db/pool.js";
import type { ShelterRecord } from "../src/types/shelter.js";

type AttributeKind = "number" | "select";

interface QuestionAttributeSeed {
  id: string;
  label: string;
  kind: AttributeKind;
  options: Set<string>;
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

const GEOJSON_CANDIDATE_PATHS = [
  process.env.SHELTER_DATA_PATH,
  path.resolve(process.cwd(), "../data/geojson/ihi_shelters.geojson"),
  path.resolve(process.cwd(), "assets/ihi_shelters.geojson"),
].filter((value): value is string => Boolean(value));

const resolveGeojsonPath = async (): Promise<string> => {
  for (const candidate of GEOJSON_CANDIDATE_PATHS) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // continue
    }
  }

  throw new Error(
    [
      "GeoJSON file not found.",
      "Set SHELTER_DATA_PATH to the dataset in your data repo (e.g. ../shelterhunt-data/geojson/ihi_shelters.geojson),",
      "or place the file under api/assets/.",
    ].join(" "),
  );
};

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

const toNumberOrZero = (value: unknown) => {
  const num = toNumber(value);
  return typeof num === "number" ? num : 0;
};

const ATTRIBUTE_CONFIG: Record<string, { label: string; kind: AttributeKind }> = {
  floodDepthRank: { label: "Flood Depth Rank", kind: "number" },
  floodDepth: { label: "Flood Depth", kind: "select" },
  stormSurgeDepthRank: { label: "Storm Surge Depth Rank", kind: "number" },
  stormSurgeDepth: { label: "Storm Surge Depth", kind: "select" },
  floodDurationRank: { label: "Flood Duration Rank", kind: "number" },
  floodDuration: { label: "Flood Duration", kind: "select" },
  inlandWatersDepthRank: { label: "Inland Waters Depth Rank", kind: "number" },
  inlandWatersDepth: { label: "Inland Waters Depth", kind: "select" },
  facilityType: { label: "Facility Type", kind: "select" },
  shelterCapacity: { label: "Shelter Capacity", kind: "number" },
  waterStation250m: { label: "Water Stations within 250m", kind: "number" },
  hospital250m: { label: "Hospitals within 250m", kind: "number" },
  aed250m: { label: "AEDs within 250m", kind: "number" },
  emergencySupplyStorage250m: { label: "Emergency Supply Storage within 250m", kind: "number" },
  communityCenter250m: { label: "Community Centers within 250m", kind: "number" },
  trainStation250m: { label: "Train Stations within 250m", kind: "number" },
  shrineTemple250m: { label: "Shrines/Temples within 250m", kind: "number" },
  floodgate250m: { label: "Floodgates within 250m", kind: "number" },
  bridge250m: { label: "Bridges within 250m", kind: "number" },
};

const initQuestionAttributes = (): Record<string, QuestionAttributeSeed> =>
  Object.entries(ATTRIBUTE_CONFIG).reduce<Record<string, QuestionAttributeSeed>>(
    (acc, [id, config]) => {
      acc[id] = { id, label: config.label, kind: config.kind, options: new Set<string>() };
      return acc;
    },
    {},
  );

const addSelectOption = (seed: Record<string, QuestionAttributeSeed>, id: string, value: unknown) => {
  if (!value || typeof value !== "string") return;
  const normalized = value.trim();
  if (!normalized) return;
  seed[id]?.options.add(normalized);
};

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "t", "yes", "y", "1"].includes(normalized)) {
      return true;
    }
    if (["false", "f", "no", "n", "0"].includes(normalized)) {
      return false;
    }
  }
  return null;
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
  const geojsonPath = await resolveGeojsonPath();
  console.log("[Shelters] Using GeoJSON:", geojsonPath);

  const raw = await fs.readFile(geojsonPath, "utf-8");
  const data = JSON.parse(raw) as GeoJSONCollection;
  const features = data.features ?? [];
  const usedCodes = new Set<string>();
  const usedShareCodes = new Set<string>();
  const questionAttributes = initQuestionAttributes();

  const rows = features
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
      const facilityType = normalizeText(props["Facility_Type"]);
      const shelterCapacity = toNumber(props["Shelter_Capacity"]);
      const waterStation250m = toNumberOrZero(props["250m_Water_Station"]);
      const hospital250m = toNumberOrZero(props["250m_Hospital"]);
      const aed250m = toNumber(props["250m_AED"]);
      const emergencySupplyStorage250m = toNumber(props["250m_Emergency_Supply_Storage"]);
      const communityCenter250m = toNumber(props["250m_Community_Center"]);
      const trainStation250m = toNumberOrZero(props["250m_Train_Station"]);
      const shrineTemple250m = toNumber(props["250m_Shrine_Temple"]);
      const floodgate250m = toNumberOrZero(props["250m_Floodgate"]);
      const bridge250m = toNumber(props["250m_Bridge"]);
      const codeSource =
        externalId ??
        (typeof sequenceNo === "number" ? `SEQ-${sequenceNo}` : `${lat}-${lng}`);
      const code = generateCode(codeSource, usedCodes);
      const shareCode = generateShareCode(usedShareCodes);

      addSelectOption(questionAttributes, "floodDepth", floodDepth);
      addSelectOption(questionAttributes, "stormSurgeDepth", stormSurgeDepth);
      addSelectOption(questionAttributes, "floodDuration", floodDuration);
      addSelectOption(questionAttributes, "inlandWatersDepth", inlandWatersDepth);
      addSelectOption(questionAttributes, "facilityType", facilityType);

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
        facility_type: facilityType,
        shelter_capacity: typeof shelterCapacity === "number" ? shelterCapacity : 0,
        water_station_250m: typeof waterStation250m === "number" ? waterStation250m : 0,
        hospital_250m: typeof hospital250m === "number" ? hospital250m : 0,
        aed_250m: typeof aed250m === "number" ? aed250m : 0,
        emergency_supply_storage_250m:
          typeof emergencySupplyStorage250m === "number" ? emergencySupplyStorage250m : 0,
        community_center_250m: typeof communityCenter250m === "number" ? communityCenter250m : 0,
        train_station_250m: typeof trainStation250m === "number" ? trainStation250m : 0,
        shrine_temple_250m: typeof shrineTemple250m === "number" ? shrineTemple250m : 0,
        floodgate_250m: typeof floodgate250m === "number" ? floodgate250m : 0,
        bridge_250m: typeof bridge250m === "number" ? bridge250m : 0,
        latitude: Number(lat),
        longitude: Number(lng),
      } satisfies Omit<ShelterRecord, "id" | "created_at">;
    })
    .filter((item): item is Omit<ShelterRecord, "id" | "created_at"> => Boolean(item));

  const questionAttributeRows = Object.values(questionAttributes).map((entry) => ({
    id: entry.id,
    label: entry.label,
    kind: entry.kind,
    options: entry.kind === "select" ? Array.from(entry.options).sort() : [],
  }));

  return { rows, questionAttributeRows };
};

const insertShelters = async (client: any, rows: Omit<ShelterRecord, "id" | "created_at">[]) => {
  for (const row of rows) {
    await client.query(
      `insert into public.shelters
           (code, share_code, external_id, sequence_no, name_en, name_jp, address, address_en, address_jp, category, category_jp,
            flood_depth_rank, flood_depth, storm_surge_depth_rank, storm_surge_depth,
            flood_duration_rank, flood_duration, inland_waters_depth_rank, inland_waters_depth,
            facility_type, shelter_capacity, water_station_250m, hospital_250m, aed_250m, emergency_supply_storage_250m,
            community_center_250m, train_station_250m, shrine_temple_250m, floodgate_250m, bridge_250m,
            latitude, longitude)
         values
           ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
            $12, $13, $14, $15,
            $16, $17, $18, $19,
            $20, $21, $22, $23, $24, $25,
            $26, $27, $28, $29, $30,
            $31, $32)
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
           facility_type = excluded.facility_type,
           shelter_capacity = excluded.shelter_capacity,
           water_station_250m = excluded.water_station_250m,
           hospital_250m = excluded.hospital_250m,
           aed_250m = excluded.aed_250m,
           emergency_supply_storage_250m = excluded.emergency_supply_storage_250m,
           community_center_250m = excluded.community_center_250m,
           train_station_250m = excluded.train_station_250m,
           shrine_temple_250m = excluded.shrine_temple_250m,
           floodgate_250m = excluded.floodgate_250m,
           bridge_250m = excluded.bridge_250m,
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
          row.facility_type,
          row.shelter_capacity,
          row.water_station_250m,
          row.hospital_250m,
          row.aed_250m,
          row.emergency_supply_storage_250m,
          row.community_center_250m,
          row.train_station_250m,
          row.shrine_temple_250m,
          row.floodgate_250m,
          row.bridge_250m,
          row.latitude,
          row.longitude,
        ],
      );
    }
};

const upsertQuestionAttributes = async (
  client: any,
  attributes: { id: string; label: string; kind: AttributeKind; options: (string | number)[] }[],
) => {
  for (const attribute of attributes) {
    await client.query(
      `insert into public.question_attributes (id, label, kind, options)
       values ($1, $2, $3, $4)
       on conflict (id) do update set
         label = excluded.label,
         kind = excluded.kind,
         options = excluded.options`,
      [attribute.id, attribute.label, attribute.kind, JSON.stringify(attribute.options ?? [])],
    );
  }
  console.log(`[Shelters] Upserted ${attributes.length} question attribute definitions`);
};

async function main() {
  try {
    const { rows, questionAttributeRows } = await parseFeatures();
    if (!rows.length) {
      console.log("[Shelters] No rows to insert");
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await insertShelters(client, rows);
      await upsertQuestionAttributes(client, questionAttributeRows);
      await client.query("COMMIT");
      console.log(`[Shelters] Inserted/updated ${rows.length} shelters`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error("[Shelters] Import failed:", error);
    process.exitCode = 1;
  }
}

await main();
