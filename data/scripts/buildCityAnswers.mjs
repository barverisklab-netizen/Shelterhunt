import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const GEOJSON_DIR = path.join(ROOT_DIR, "data", "geojson");
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
const CITY_ID = argMap.get("--city") ?? process.env.CITY_ID ?? process.env.DEPLOYED_CITY_ID ?? "koto";
const CITY_GEOJSON_DIR = path.join(GEOJSON_DIR, CITY_ID);

const resolvePath = (...candidates) => candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];

const SHELTERS_PATH = resolvePath(
  process.env.SHELTERS_PATH ?? "",
  path.join(CITY_GEOJSON_DIR, "shelters.geojson"),
  // Legacy fallback (pre city-folder split)
  path.join(GEOJSON_DIR, "ihi_shelters.geojson"),
);
const SUPPORT_PATH = resolvePath(
  process.env.SUPPORT_PATH ?? "",
  path.join(CITY_GEOJSON_DIR, "support.geojson"),
  // Legacy fallback (pre city-folder split)
  path.join(GEOJSON_DIR, "ihi_support.geojson"),
);
const LANDMARK_PATH = resolvePath(
  process.env.LANDMARK_PATH ?? "",
  path.join(CITY_GEOJSON_DIR, "landmark.geojson"),
  // Legacy fallback (pre city-folder split)
  path.join(GEOJSON_DIR, "ihi_landmark.geojson"),
);
const OUTPUT_PATH =
  argMap.get("--output") ??
  process.env.OUTPUT_PATH ??
  (fs.existsSync(CITY_GEOJSON_DIR)
    ? path.join(CITY_GEOJSON_DIR, "answers.geojson")
    : path.join(GEOJSON_DIR, `${CITY_ID}_answers.geojson`));

const RADIUS_KM = 0.25;
const BUCKET_SIZE_DEG = 0.005; // ~550m at this latitude

const CATEGORY_TO_PROPERTY = {
  "Water Station": "250m_Water_Station",
  Hospital: "250m_Hospital",
  AED: "250m_AED",
  "Emergency Supply Storage": "250m_Emergency_Supply_Storage",
  "Community Center": "250m_Community_Center",
  "Train Station": "250m_Train_Station",
  "Shrine/Temple": "250m_Shrine_Temple",
  "Flood Gate": "250m_Floodgate",
  Bridge: "250m_Bridge",
};

const BOOLEAN_KEYS = new Set([
  "250m_Water_Station",
  "250m_Hospital",
  "250m_Train_Station",
  "250m_Floodgate",
]);

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

const queryCounts = (center, buckets) => {
  const counts = {};
  const radiusDeg = RADIUS_KM / 111;
  const bucketRadius = Math.max(1, Math.ceil(radiusDeg / BUCKET_SIZE_DEG));
  const centerLatBucket = Math.floor(center.lat / BUCKET_SIZE_DEG);
  const centerLngBucket = Math.floor(center.lng / BUCKET_SIZE_DEG);

  for (let dLat = -bucketRadius; dLat <= bucketRadius; dLat += 1) {
    for (let dLng = -bucketRadius; dLng <= bucketRadius; dLng += 1) {
      const key = `${centerLatBucket + dLat}:${centerLngBucket + dLng}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      for (const feature of bucket) {
        const propertyKey = CATEGORY_TO_PROPERTY[feature.category];
        if (!propertyKey) continue;
        const distKm = haversineKm(center, feature);
        if (distKm <= RADIUS_KM) {
          counts[propertyKey] = (counts[propertyKey] || 0) + 1;
        }
      }
    }
  }

  return counts;
};

const applyCounts = (properties, counts) => {
  Object.values(CATEGORY_TO_PROPERTY).forEach((propertyKey) => {
    const count = counts[propertyKey] || 0;
    properties[propertyKey] = BOOLEAN_KEYS.has(propertyKey) ? count > 0 : count;
  });
};

const run = () => {
  console.log("[buildAnswers] city:", CITY_ID);
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
    const counts = queryCounts({ lat, lng }, buckets);
    applyCounts(feature.properties, counts);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(shelters, null, 2));
  console.log(`Wrote ${OUTPUT_PATH}`);
};

run();
