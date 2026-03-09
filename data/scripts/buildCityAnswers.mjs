import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const GEOJSON_DIR = path.join(ROOT_DIR, "data", "geojson");
const CITY_CONFIG_DIR = path.join(ROOT_DIR, "data", "city-config");
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
const CITY_ID = argMap.get("--city") ?? process.env.CITY_ID ?? process.env.DEPLOYED_CITY_ID;
if (!CITY_ID) {
  throw new Error("Missing city id. Provide --city or set DEPLOYED_CITY_ID/CITY_ID.");
}
const CITY_GEOJSON_DIR = path.join(GEOJSON_DIR, CITY_ID);
const CITY_CONFIG_PATH = path.join(CITY_CONFIG_DIR, `${CITY_ID}.json`);

const resolvePath = (description, ...candidates) => {
  const existing = candidates
    .filter((candidate) => typeof candidate === "string" && candidate.trim().length > 0)
    .find((candidate) => fs.existsSync(candidate));
  if (existing) return existing;
  throw new Error(
    `${description} not found. Checked: ${candidates
      .filter((candidate) => typeof candidate === "string" && candidate.trim().length > 0)
      .join(", ")}`,
  );
};

const SHELTERS_PATH = resolvePath(
  "Shelters GeoJSON",
  process.env.SHELTERS_PATH ?? "",
  path.join(CITY_GEOJSON_DIR, "shelters.geojson"),
);
const SUPPORT_PATH = resolvePath(
  "Support GeoJSON",
  process.env.SUPPORT_PATH ?? "",
  path.join(CITY_GEOJSON_DIR, "support.geojson"),
);
const LANDMARK_PATH = resolvePath(
  "Landmark GeoJSON",
  process.env.LANDMARK_PATH ?? "",
  path.join(CITY_GEOJSON_DIR, "landmark.geojson"),
);
const OUTPUT_PATH =
  argMap.get("--output") ??
  process.env.OUTPUT_PATH ??
  (fs.existsSync(CITY_GEOJSON_DIR)
    ? path.join(CITY_GEOJSON_DIR, "answers.geojson")
    : path.join(GEOJSON_DIR, `${CITY_ID}_answers.geojson`));

const BUCKET_SIZE_DEG = 0.005; // ~550m at this latitude

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return R * c;
};

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

const readGeoJson = (filePath) => {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.type !== "FeatureCollection") {
    throw new Error(`Expected FeatureCollection in ${filePath}`);
  }
  return parsed;
};

const loadCityConfig = () => {
  const configPath = CITY_CONFIG_PATH;
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing city config: ${configPath}`);
  }
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.questionCatalog) || !Array.isArray(parsed.poiTypes)) {
    throw new Error(`Invalid city config: ${configPath}`);
  }
  return parsed;
};

const normalizeCategory = (value) => String(value ?? "").trim().toLowerCase();

const bucketKey = (lat, lng) => {
  const latBucket = Math.floor(lat / BUCKET_SIZE_DEG);
  const lngBucket = Math.floor(lng / BUCKET_SIZE_DEG);
  return `${latBucket}:${lngBucket}`;
};

const ingestFeatures = (collection) => {
  const features = [];
  for (const feature of collection.features || []) {
    if (!feature || feature.geometry?.type !== "Point") continue;
    const [lng, lat] = feature.geometry.coordinates || [];
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) continue;
    const props = feature.properties || {};
    const category = props.Category || props["Category "] || "";
    if (!category) continue;
    features.push({ lat, lng, category });
  }
  return features;
};

const buildBuckets = (features) => {
  const buckets = new Map();
  for (const feature of features) {
    const key = bucketKey(feature.lat, feature.lng);
    const list = buckets.get(key);
    if (list) {
      list.push(feature);
    } else {
      buckets.set(key, [feature]);
    }
  }
  return buckets;
};

const queryCounts = (center, buckets, radiusKm, categoryToProperty) => {
  const counts = {};
  const radiusDeg = radiusKm / 111;
  const bucketRadius = Math.max(1, Math.ceil(radiusDeg / BUCKET_SIZE_DEG));
  const centerLatBucket = Math.floor(center.lat / BUCKET_SIZE_DEG);
  const centerLngBucket = Math.floor(center.lng / BUCKET_SIZE_DEG);

  for (let dLat = -bucketRadius; dLat <= bucketRadius; dLat += 1) {
    for (let dLng = -bucketRadius; dLng <= bucketRadius; dLng += 1) {
      const key = `${centerLatBucket + dLat}:${centerLngBucket + dLng}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      for (const feature of bucket) {
        const propertyKey =
          categoryToProperty[feature.category] ??
          categoryToProperty[normalizeCategory(feature.category)];
        if (!propertyKey) continue;
        const distKm = haversineKm(center, feature);
        if (distKm <= radiusKm) {
          counts[propertyKey] = (counts[propertyKey] || 0) + 1;
        }
      }
    }
  }

  return counts;
};

const applyCounts = (properties, counts, nearbyPropertyKeys) => {
  nearbyPropertyKeys.forEach((propertyKey) => {
    properties[propertyKey] = counts[propertyKey] || 0;
  });
};

const run = () => {
  console.log("[buildAnswers] city:", CITY_ID);
  const cityConfig = loadCityConfig();
  const questionById = Object.fromEntries(cityConfig.questionCatalog.map((item) => [item.id, item]));
  const categoryToProperty = {};

  cityConfig.poiTypes.forEach((poiType) => {
    const question = questionById[poiType.questionId];
    if (!question?.sourceProperty) return;
    poiType.rawCategoryMatchers.forEach((rawCategory) => {
      categoryToProperty[rawCategory] = question.sourceProperty;
      categoryToProperty[normalizeCategory(rawCategory)] = question.sourceProperty;
    });
  });

  const nearbyPropertyKeys = Array.from(new Set(Object.values(categoryToProperty)));
  const radiusKm = Number(cityConfig.nearbyQuestion?.radiusKm) || 0.25;

  const shelters = readGeoJson(SHELTERS_PATH);
  const support = readGeoJson(SUPPORT_PATH);
  const landmarks = readGeoJson(LANDMARK_PATH);

  const amenityFeatures = [
    ...ingestFeatures(support),
    ...ingestFeatures(landmarks),
    ...ingestFeatures(shelters),
  ];

  const buckets = buildBuckets(amenityFeatures);

  for (const feature of shelters.features || []) {
    if (!feature || feature.geometry?.type !== "Point") continue;
    const [lng, lat] = feature.geometry.coordinates || [];
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) continue;
    feature.properties = feature.properties || {};
    const counts = queryCounts({ lat, lng }, buckets, radiusKm, categoryToProperty);
    applyCounts(feature.properties, counts, nearbyPropertyKeys);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(shelters, null, 2));
  console.log(`Wrote ${OUTPUT_PATH}`);
};

run();
