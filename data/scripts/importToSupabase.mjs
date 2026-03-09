import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import { Client } from "pg";

const parseArgs = (argv) => {
  const map = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    if (token.includes("=")) {
      const [key, value] = token.split("=");
      if (typeof value === "string") {
        map.set(key, value);
      }
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      map.set(token, next);
      index += 1;
    }
  }
  return map;
};

const argMap = parseArgs(process.argv.slice(2));
const databaseUrl = process.env.DATABASE_URL;
const cityId = (argMap.get("--city") ?? process.env.DEPLOYED_CITY_ID ?? process.env.CITY_ID ?? "").trim();
const schemaName = (argMap.get("--schema") ?? process.env.DB_SCHEMA ?? "public").trim();
const LOCAL_DB_HOSTS = new Set(["", "localhost", "127.0.0.1", "::1"]);

typecheckCityId();

if (!databaseUrl) {
  console.error("[Data] DATABASE_URL is required to import shelters.");
  process.exit(1);
}

const quoteIdent = (value) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid identifier: ${value}`);
  }
  return `"${value}"`;
};

const schemaSql = quoteIdent(schemaName);

const GEOJSON_CANDIDATE_PATHS = [
  argMap.get("--input"),
  process.env.SHELTER_DATA_PATH,
  path.resolve(process.cwd(), "geojson", cityId, "shelters.geojson"),
  path.resolve(process.cwd(), "../data/geojson", cityId, "shelters.geojson"),
].filter((value) => Boolean(value));

const CITY_CONFIG_CANDIDATE_PATHS = [
  path.resolve(process.cwd(), "city-config", `${cityId}.json`),
  path.resolve(process.cwd(), "../data/city-config", `${cityId}.json`),
];

const resolvePath = async (candidates, description) => {
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // continue
    }
  }
  throw new Error(`${description} not found. Checked: ${candidates.join(", ")}`);
};

const resolvePgConnection = (connectionString) => {
  const parsed = new URL(connectionString);
  const hostname = parsed.hostname.toLowerCase();
  const isLocalHost = LOCAL_DB_HOSTS.has(hostname);
  const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();
  const sslFlag = parsed.searchParams.get("ssl")?.toLowerCase();

  if (sslMode === "no-verify") {
    throw new Error(
      "DATABASE_URL must not use sslmode=no-verify. Use sslmode=require (hosted DB) or sslmode=disable (localhost only).",
    );
  }

  if (sslMode === "disable" && !isLocalHost) {
    throw new Error(
      "DATABASE_URL sslmode=disable is only allowed for localhost/loopback databases.",
    );
  }

  const wantsSslFromMode = Boolean(sslMode && sslMode !== "disable");
  const wantsSslFromFlag = sslFlag === "1" || sslFlag === "true";
  const shouldUseSsl = sslMode === "disable" ? false : !isLocalHost || wantsSslFromMode || wantsSslFromFlag;

  if (shouldUseSsl) {
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("ssl");
    return {
      connectionString: parsed.toString(),
      ssl: { rejectUnauthorized: true },
    };
  }

  return { connectionString: parsed.toString(), ssl: undefined };
};

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};

const generateCode = (source, used) => {
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

const generateShareCode = (used) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  throw new Error("Failed to generate unique share code");
};

const loadCityConfig = async () => {
  const configPath = await resolvePath(CITY_CONFIG_CANDIDATE_PATHS, "City config");
  const raw = await fs.readFile(configPath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.questionCatalog) || !parsed.questionCatalog.length) {
    throw new Error(`City config '${configPath}' has no questionCatalog entries.`);
  }
  return parsed;
};

const LEGACY_COLUMN_BY_QUESTION_ID = {
  floodDepth: "flood_depth",
  stormSurgeDepth: "storm_surge_depth",
  floodDuration: "flood_duration",
  inlandWatersDepth: "inland_waters_depth",
  facilityType: "facility_type",
  shelterCapacity: "shelter_capacity",
  waterStation250m: "water_station_250m",
  hospital250m: "hospital_250m",
  aed250m: "aed_250m",
  emergencySupplyStorage250m: "emergency_supply_storage_250m",
  communityCenter250m: "community_center_250m",
  trainStation250m: "train_station_250m",
  shrineTemple250m: "shrine_temple_250m",
  floodgate250m: "floodgate_250m",
  bridge250m: "bridge_250m",
};

const readQuestionValue = (props, question) => {
  if (!question.sourceProperty) {
    return question.kind === "number" ? question.defaultNumber ?? null : null;
  }

  const rawValue = props[question.sourceProperty];
  if (question.kind === "select") {
    return normalizeText(rawValue);
  }

  const numeric = toNumber(rawValue);
  if (numeric !== null) return numeric;
  if (typeof question.defaultNumber === "number") return question.defaultNumber;
  return null;
};

const parseFeatures = async (cityConfig) => {
  const geojsonPath = await resolvePath(GEOJSON_CANDIDATE_PATHS, "GeoJSON file");
  const raw = await fs.readFile(geojsonPath, "utf-8");
  const data = JSON.parse(raw);
  const features = Array.isArray(data?.features) ? data.features : [];
  const usedCodes = new Set();
  const usedShareCodes = new Set();

  const questionAttributes = cityConfig.questionCatalog.reduce((acc, item) => {
    acc[item.id] = {
      id: item.id,
      label: item.label,
      kind: item.kind,
      options: new Set(),
    };
    return acc;
  }, {});

  const rows = features
    .map((feature, index) => {
      const props = feature?.properties ?? {};
      const coords = feature?.geometry?.coordinates;
      let lng = toNumber(coords?.[0]);
      let lat = toNumber(coords?.[1]);

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
        normalizeText(props["ID"]) ??
        normalizeText(props["external_id"]);
      const sequenceNo =
        toNumber(props["NO"]) ?? toNumber(props["No"]) ?? toNumber(props["sequence_no"]) ?? index + 1;
      const nameEn = normalizeText(props["Landmark Name (EN)"]) ?? normalizeText(props["name_en"]);
      const nameJp =
        normalizeText(props["Landmark Name (JP)"]) ??
        normalizeText(props["name"]) ??
        normalizeText(props["name_jp"]);
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
      const stormSurgeDepthRank = toNumber(props["StormSurge_Depth_Rank"]);
      const floodDurationRank = toNumber(props["Flood_Duration_Rank"]);
      const inlandWatersDepthRank = toNumber(props["InlandWaters_Depth_Rank"]);

      const codeSource =
        normalizeText(props["code"]) ??
        externalId ??
        (typeof sequenceNo === "number" ? `SEQ-${sequenceNo}` : `${lat}-${lng}`);
      const code = generateCode(codeSource ?? `${lat}-${lng}`, usedCodes);
      const shareCode =
        normalizeText(props["share_code"]) ??
        (typeof props["share_code"] === "string" ? props["share_code"] : null) ??
        generateShareCode(usedShareCodes);

      const questionAnswers = {};
      cityConfig.questionCatalog.forEach((question) => {
        const value = readQuestionValue(props, question);
        if (value === null || value === undefined) return;
        questionAnswers[question.id] = value;
        if (question.kind === "select" && typeof value === "string") {
          questionAttributes[question.id]?.options.add(value);
        }
      });

      const row = {
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
        flood_depth: null,
        storm_surge_depth_rank: typeof stormSurgeDepthRank === "number" ? stormSurgeDepthRank : null,
        storm_surge_depth: null,
        flood_duration_rank: typeof floodDurationRank === "number" ? floodDurationRank : null,
        flood_duration: null,
        inland_waters_depth_rank: typeof inlandWatersDepthRank === "number" ? inlandWatersDepthRank : null,
        inland_waters_depth: null,
        facility_type: null,
        shelter_capacity: 0,
        water_station_250m: 0,
        hospital_250m: 0,
        aed_250m: 0,
        emergency_supply_storage_250m: 0,
        community_center_250m: 0,
        train_station_250m: 0,
        shrine_temple_250m: 0,
        floodgate_250m: 0,
        bridge_250m: 0,
        question_answers: questionAnswers,
        latitude: Number(lat),
        longitude: Number(lng),
      };

      cityConfig.questionCatalog.forEach((question) => {
        const legacyColumn = LEGACY_COLUMN_BY_QUESTION_ID[question.id];
        if (!legacyColumn) return;
        const value = questionAnswers[question.id];
        if (value === undefined || value === null) return;
        row[legacyColumn] = value;
      });

      return row;
    })
    .filter(Boolean);

  const questionAttributeRows = Object.values(questionAttributes).map((entry) => ({
    id: entry.id,
    label: entry.label,
    kind: entry.kind,
    options: entry.kind === "select" ? Array.from(entry.options).sort() : [],
  }));

  return {
    geojsonPath,
    rows,
    questionAttributeRows,
  };
};

const insertShelters = async (client, rows) => {
  for (const row of rows) {
    await client.query(
      `insert into shelters
         (code, share_code, external_id, sequence_no, name_en, name_jp, address, address_en, address_jp, category, category_jp,
          flood_depth_rank, flood_depth, storm_surge_depth_rank, storm_surge_depth,
          flood_duration_rank, flood_duration, inland_waters_depth_rank, inland_waters_depth,
          facility_type, shelter_capacity, water_station_250m, hospital_250m, aed_250m, emergency_supply_storage_250m,
          community_center_250m, train_station_250m, shrine_temple_250m, floodgate_250m, bridge_250m,
          question_answers, latitude, longitude)
       values
         ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15,
          $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25,
          $26, $27, $28, $29, $30,
          $31, $32, $33)
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
         question_answers = excluded.question_answers,
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
        JSON.stringify(row.question_answers ?? {}),
        row.latitude,
        row.longitude,
      ],
    );
  }
};

const upsertQuestionAttributes = async (client, attributes) => {
  for (const attribute of attributes) {
    await client.query(
      `insert into question_attributes (id, label, kind, options)
       values ($1, $2, $3, $4)
       on conflict (id) do update set
         label = excluded.label,
         kind = excluded.kind,
         options = excluded.options`,
      [attribute.id, attribute.label, attribute.kind, JSON.stringify(attribute.options ?? [])],
    );
  }

  const keepIds = attributes.map((attribute) => attribute.id);
  await client.query(
    `delete from question_attributes
     where id <> all($1::text[])`,
    [keepIds],
  );
};

function typecheckCityId() {
  if (!cityId) {
    console.error("[Data] Missing city id. Provide --city or set DEPLOYED_CITY_ID/CITY_ID.");
    process.exit(1);
  }
}

const main = async () => {
  const cityConfig = await loadCityConfig();
  const { geojsonPath, rows, questionAttributeRows } = await parseFeatures(cityConfig);

  console.log("[Data] Using GeoJSON:", geojsonPath, { cityId, schemaName });

  if (!rows.length) {
    console.log("[Data] No rows to import");
    return;
  }

  const connection = resolvePgConnection(databaseUrl);
  const client = new Client(connection);
  await client.connect();

  try {
    await client.query(`set search_path to ${schemaSql}, public`);
    await client.query("BEGIN");
    await insertShelters(client, rows);
    await upsertQuestionAttributes(client, questionAttributeRows);
    await client.query("COMMIT");
    console.log(
      `[Data] Seed complete for city '${cityId}' in schema '${schemaName}': ${rows.length} shelters, ${questionAttributeRows.length} attributes`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error("[Data] Import failed:", error);
  process.exitCode = 1;
});
