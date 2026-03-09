#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      if (token.includes("=")) {
        const [k, v] = token.slice(2).split("=");
        args[k] = v;
        continue;
      }
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        args[key] = true;
        continue;
      }
      args[key] = next;
      i += 1;
      continue;
    }
    if (!args._) args._ = [];
    args._.push(token);
  }
  return args;
};

const toTitle = (value) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const toCamel = (value) => {
  const parts = value.split(/[-_\s]+/).filter(Boolean);
  if (!parts.length) return value;
  return (
    parts[0].toLowerCase() +
    parts
      .slice(1)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join("")
  );
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const writeIfMissing = async (filePath, contents, force) => {
  try {
    await fs.access(filePath);
    if (!force) {
      return false;
    }
  } catch {
    // File does not exist.
  }

  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, contents, "utf8");
  return true;
};

const upsertDeployedCityRegistry = async ({
  cityId,
  cityVar,
}) => {
  const filePath = path.join(ROOT, "webapp/src/cityContext/deployedCity.ts");
  let source = await fs.readFile(filePath, "utf8");

  const importBlock = [
    `import { ${cityVar}CityContext } from "@/cityContext/${cityId}/context";`,
    `import { ${cityVar}Layers, ${cityVar}LayerGroups, ${cityVar}MapStyle, ${cityVar}SupportedLocales } from "@/cityContext/${cityId}/layers";`,
    `import { ${cityVar}QuestionAdapter } from "@/cityContext/${cityId}/questionAdapter";`,
  ].join("\n");

  if (!source.includes(`@/cityContext/${cityId}/context`)) {
    source = source.replace(
      /import type \{ CityLayer, CityLayerGroup \} from "@\/types\/cityLayers";/,
      `${importBlock}\nimport type { CityLayer, CityLayerGroup } from "@/types/cityLayers";`,
    );
  }

  const registryKey = `${cityId}: {`;
  if (!source.includes(registryKey)) {
    const entry = [
      `  ${cityId}: {`,
      `    id: "${cityId}",`,
      `    context: ${cityVar}CityContext,`,
      `    mapStyle: ${cityVar}MapStyle,`,
      `    layerGroups: ${cityVar}LayerGroups,`,
      `    layers: ${cityVar}Layers,`,
      `    supportedLocales: ${cityVar}SupportedLocales,`,
      `    questionAdapter: ${cityVar}QuestionAdapter,`,
      "  },",
    ].join("\n");

    source = source.replace(
      /const CITY_REGISTRY: Record<string, DeployedCityDefinition> = \{\n([\s\S]*?)\n\};/,
      (_match, body) =>
        `const CITY_REGISTRY: Record<string, DeployedCityDefinition> = {\n${body}\n${entry}\n};`,
    );
  }

  await fs.writeFile(filePath, source, "utf8");
};

const createCityScaffold = async ({
  cityId,
  cityName,
  lat,
  lng,
  force,
}) => {
  const cityVar = toCamel(cityId);
  const cityDir = path.join(ROOT, "webapp/src/cityContext", cityId);
  const dataDir = path.join(ROOT, "data/geojson", cityId);
  const cityConfigDir = path.join(ROOT, "data/city-config");

  const contextTs = `import type { CityContext } from "@/data/cityContext";

export const ${cityVar}CityContext: CityContext = {
  cityName: "${cityName}",
  mapConfig: {
    basemapUrl: "mapbox://styles/mapbox/streets-v12",
    startLocation: {
      lat: ${lat},
      lng: ${lng},
    },
    minZoom: 12,
    maxZoom: 18,
  },
  questionCategories: [
    {
      id: "location",
      name: "Location Details",
      description: "Ask about surge inundation and environmental factors",
      icon: "MapPin",
    },
    {
      id: "facility",
      name: "Facility & Resources",
      description: "Ask about facility type, capacity, and resources",
      icon: "Home",
    },
    {
      id: "nearby",
      name: "Nearby Amenities",
      description: "Ask about facilities and services in the area",
      icon: "Radar",
    },
  ],
};
`;

  const layersTs = `import type { CityLayer } from "@/types/cityLayers";
import type { CityLocale, CityMapStyle } from "@/cityContext/types";

export const ${cityVar}MapStyle: CityMapStyle = {
  styleUrl: "mapbox://styles/mapbox/streets-v12",
  fallbackStyleUrl: "mapbox://styles/mapbox/streets-v12",
};

export const ${cityVar}LayerGroups = [
  "Shelters",
  "Evacuation Support Facilities",
  "City Landmarks",
  "Hazard Layers",
] as const;

export const ${cityVar}SupportedLocales: CityLocale[] = ["en", "ja"];

export const ${cityVar}Layers: CityLayer[] = [];
`;

  const questionAdapterTs = `import type { CityQuestionAdapter } from "@/cityContext/types";
import cityConfigRaw from "../../../../data/city-config/${cityId}.json";

const cityConfig = cityConfigRaw as {
  questionCatalog: CityQuestionAdapter["questionCatalog"];
  poiTypes: CityQuestionAdapter["poiTypes"];
  nearbyQuestion: CityQuestionAdapter["nearbyQuestion"];
  designatedShelter: CityQuestionAdapter["designatedShelter"];
};

export const ${cityVar}QuestionAdapter: CityQuestionAdapter = {
  translationNamespace: "${cityId}",
  questionCatalog: cityConfig.questionCatalog,
  poiTypes: cityConfig.poiTypes,
  nearbyQuestion: cityConfig.nearbyQuestion,
  designatedShelter: cityConfig.designatedShelter,
  proximity: {
    geojsonUrls: [
      new URL("../../../../data/geojson/${cityId}/shelters.geojson", import.meta.url).href,
      new URL("../../../../data/geojson/${cityId}/support.geojson", import.meta.url).href,
      new URL("../../../../data/geojson/${cityId}/landmark.geojson", import.meta.url).href,
    ],
  },
  buildQuestionFallback: (attribute) => {
    if (attribute.kind === "number" && attribute.id.endsWith("250m")) {
      return \`Are there {param} \${attribute.label}?\`;
    }
    return \`Is the \${attribute.label} {param}?\`;
  },
  buildClueFallback: (attribute) => {
    if (attribute.id.endsWith("250m")) {
      return \`There are {param} \${attribute.label}\`;
    }
    return \`The \${attribute.label} is {param}\`;
  },
  nearbyAmenityQuestionFallback: "Are there nearby amenities within 250m?",
};
`;

  const cityConfigJson = `{
  "cityId": "${cityId}",
  "nearbyQuestion": {
    "mode": "picker",
    "questionId": "nearbyAmenity",
    "categoryId": "nearby",
    "radiusKm": 0.25,
    "countMin": 0,
    "countMax": 10,
    "cooldownScope": "shared"
  },
  "designatedShelter": {
    "categoryMatchers": ["designated evacuation center"],
    "layerLabelMatchers": ["Designated Evacuation Centers"]
  },
  "poiTypes": [],
  "questionCatalog": []
}
`;

  const contractTestTs = `import { describe, expect, it } from "vitest";
import { ${cityVar}Layers, ${cityVar}MapStyle, ${cityVar}SupportedLocales } from "./layers";

describe("${cityId} layer contracts", () => {
  it("has unique ids and labels", () => {
    const ids = ${cityVar}Layers.map((layer) => layer.id);
    const labels = ${cityVar}Layers.map((layer) => layer.label);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("defines map style contract", () => {
    expect(${cityVar}MapStyle.styleUrl).toBeTruthy();
  });

  it("defines supported locales for this city", () => {
    expect(${cityVar}SupportedLocales.length).toBeGreaterThan(0);
    expect(new Set(${cityVar}SupportedLocales).size).toBe(${cityVar}SupportedLocales.length);
  });
});
`;

  const emptyGeojson = `{
  "type": "FeatureCollection",
  "features": []
}
`;

  const writes = [];
  writes.push(
    writeIfMissing(path.join(cityDir, "context.ts"), contextTs, force),
    writeIfMissing(path.join(cityDir, "layers.ts"), layersTs, force),
    writeIfMissing(path.join(cityDir, "questionAdapter.ts"), questionAdapterTs, force),
    writeIfMissing(path.join(cityDir, "layers.contract.test.ts"), contractTestTs, force),
    writeIfMissing(path.join(cityConfigDir, `${cityId}.json`), cityConfigJson, force),
    writeIfMissing(path.join(dataDir, "shelters.geojson"), emptyGeojson, force),
    writeIfMissing(path.join(dataDir, "support.geojson"), emptyGeojson, force),
    writeIfMissing(path.join(dataDir, "landmark.geojson"), emptyGeojson, force),
  );
  await Promise.all(writes);
  await upsertDeployedCityRegistry({ cityId, cityVar });
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const cityId = (args.city ?? args._?.[0] ?? "").toString().trim().toLowerCase();
  const force = Boolean(args.force);

  if (!cityId) {
    console.error("Usage: npm run scaffold:city -- --city=<city-id> [--name=\"City Name\"] [--lat=35.0 --lng=139.0] [--force]");
    process.exit(1);
  }

  if (!/^[a-z][a-z0-9-]*$/.test(cityId)) {
    console.error("Invalid city id. Use lowercase letters, numbers, and hyphens. Example: osaka-bay");
    process.exit(1);
  }

  const cityName = (args.name ?? toTitle(cityId)).toString();
  const lat = toNumber(args.lat, 35.6731);
  const lng = toNumber(args.lng, 139.8171);

  await createCityScaffold({ cityId, cityName, lat, lng, force });

  console.log(`[scaffold:city] Scaffold ready for '${cityId}'.`);
  console.log("Next steps:");
  console.log(`1) Fill data/geojson/${cityId}/*.geojson with city data.`);
  console.log(`2) Update webapp/src/cityContext/${cityId}/layers.ts with real layer definitions.`);
  console.log(`3) Populate data/city-config/${cityId}.json with questionCatalog + poiTypes.`);
  console.log(`4) Update webapp/src/cityContext/${cityId}/questionAdapter.ts as needed.`);
  console.log(`5) Run data scripts with --city=${cityId} and your target --schema.`);
  console.log(`6) Set VITE_DEPLOYED_CITY_ID=${cityId}, DEPLOYED_CITY_ID=${cityId}, DB_SCHEMA=<schema>.`);
};

main().catch((error) => {
  console.error("[scaffold:city] Failed:", error);
  process.exit(1);
});
