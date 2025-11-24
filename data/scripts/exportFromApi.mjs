import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const apiBase =
  process.env.DATA_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:4000";
const outputPath = path.resolve(
  process.env.OUTPUT_PATH ?? path.join(process.cwd(), "geojson/ihi_shelters.geojson"),
);

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
  console.log("[Data] Fetching shelters from API:", apiBase);
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
