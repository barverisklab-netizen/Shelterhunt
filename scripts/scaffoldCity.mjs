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
    `import { ${cityVar}Layers, ${cityVar}LayerGroups, ${cityVar}MapStyle } from "@/cityContext/${cityId}/layers";`,
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
import type { CityMapStyle } from "@/cityContext/types";

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

export const ${cityVar}Layers: CityLayer[] = [];
`;

  const questionAdapterTs = `import type { CityQuestionAdapter } from "@/cityContext/types";

export const ${cityVar}QuestionAdapter: CityQuestionAdapter = {
  translationNamespace: "${cityId}",
  attributeCategoryMap: {
    floodDepth: "location",
    stormSurgeDepth: "location",
    floodDuration: "location",
    inlandWatersDepth: "location",
    facilityType: "facility",
    shelterCapacity: "facility",
    waterStation250m: "nearby",
    hospital250m: "nearby",
    aed250m: "nearby",
    emergencySupplyStorage250m: "nearby",
    communityCenter250m: "nearby",
    trainStation250m: "nearby",
    shrineTemple250m: "nearby",
    floodgate250m: "nearby",
    bridge250m: "nearby",
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

  const contractTestTs = `import { describe, expect, it } from "vitest";
import { ${cityVar}Layers, ${cityVar}MapStyle } from "./layers";

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
  console.log(`3) Update webapp/src/cityContext/${cityId}/questionAdapter.ts as needed.`);
  console.log(`4) Run data scripts with --city=${cityId} and your target --schema.`);
  console.log(`5) Set VITE_DEPLOYED_CITY_ID=${cityId}, DEPLOYED_CITY_ID=${cityId}, DB_SCHEMA=<schema>.`);
};

main().catch((error) => {
  console.error("[scaffold:city] Failed:", error);
  process.exit(1);
});
