import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LOCAL_API_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
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
const cityId =
  argMap.get("--city") ??
  process.env.DEPLOYED_CITY_ID ??
  process.env.CITY_ID;
if (!cityId) {
  throw new Error("Missing city id. Provide --city or set DEPLOYED_CITY_ID/CITY_ID.");
}
const apiBase = process.env.DATA_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:4000";
const outputPath = path.resolve(
  process.env.OUTPUT_PATH ??
    argMap.get("--output") ??
    path.join(process.cwd(), "geojson", cityId, "shelters.geojson"),
);
const apiUrl = new URL(apiBase);

if (apiUrl.protocol !== "https:" && !LOCAL_API_HOSTS.has(apiUrl.hostname.toLowerCase())) {
  throw new Error(
    "DATA_API_BASE_URL must use https:// for non-local hosts. Only localhost/loopback may use http://.",
  );
}

const toNumber = (value) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};

const buildFeatureCollection = (shelters) => {
  const features = shelters
    .map((item) => {
      const lat = toNumber(item.latitude);
      const lng = toNumber(item.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        properties: {
          code: item.code,
          share_code: item.share_code,
          external_id: item.external_id,
          sequence_no: item.sequence_no,
          name_en: item.name_en,
          name_jp: item.name_jp,
          address: item.address,
          address_en: item.address_en,
          address_jp: item.address_jp,
          category: item.category,
          category_jp: item.category_jp,
          flood_depth_rank: item.flood_depth_rank,
          flood_depth: item.flood_depth,
          storm_surge_depth_rank: item.storm_surge_depth_rank,
          storm_surge_depth: item.storm_surge_depth,
          flood_duration_rank: item.flood_duration_rank,
          flood_duration: item.flood_duration,
          inland_waters_depth_rank: item.inland_waters_depth_rank,
          inland_waters_depth: item.inland_waters_depth,
          question_answers: item.question_answers ?? {},
        },
      };
    })
    .filter(Boolean);

  return {
    type: "FeatureCollection",
    features,
  };
};

const fetchShelters = async () => {
  const url = `${apiBase}/shelters`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch shelters (${response.status} ${response.statusText})`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload?.shelters)) {
    throw new Error("Unexpected response: missing shelters array");
  }
  return payload.shelters;
};

const writeGeojson = async (collection) => {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const pretty = JSON.stringify(collection, null, 2);
  await fs.writeFile(outputPath, pretty);
};

const main = async () => {
  console.log("[Data] Fetching shelters from API:", apiBase, { cityId });
  const shelters = await fetchShelters();
  const collection = buildFeatureCollection(shelters);
  await writeGeojson(collection);
  console.log(
    `[Data] Wrote ${collection.features.length} features to ${outputPath}`,
  );
};

main().catch((error) => {
  console.error("[Data] Export failed:", error);
  process.exitCode = 1;
});
