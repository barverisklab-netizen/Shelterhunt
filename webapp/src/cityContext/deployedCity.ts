import { kotoCityContext } from "@/cityContext/koto/context";
import { kotoLayers, kotoLayerGroups, kotoMapStyle } from "@/cityContext/koto/layers";
import { kotoQuestionAdapter } from "@/cityContext/koto/questionAdapter";
import type { CityLayer, CityLayerGroup } from "@/types/cityLayers";
import type { CityContext } from "@/data/cityContext";
import type { CityMapStyle, CityQuestionAdapter } from "@/cityContext/types";

export interface DeployedCityDefinition {
  id: string;
  context: CityContext;
  mapStyle: CityMapStyle;
  layerGroups: ReadonlyArray<CityLayerGroup>;
  layers: CityLayer[];
  questionAdapter: CityQuestionAdapter;
}

const CITY_REGISTRY: Record<string, DeployedCityDefinition> = {
  koto: {
    id: "koto",
    context: kotoCityContext,
    mapStyle: kotoMapStyle,
    layerGroups: kotoLayerGroups,
    layers: kotoLayers,
    questionAdapter: kotoQuestionAdapter,
  },
};

const envCityId = (import.meta.env.VITE_DEPLOYED_CITY_ID as string | undefined)
  ?.trim()
  .toLowerCase();
if (!envCityId) {
  throw new Error("Missing required VITE_DEPLOYED_CITY_ID.");
}

export const DEPLOYED_CITY_ID = envCityId;

const resolved = CITY_REGISTRY[DEPLOYED_CITY_ID];

if (!resolved) {
  throw new Error(
    `Unsupported VITE_DEPLOYED_CITY_ID='${DEPLOYED_CITY_ID}'. Available: ${Object.keys(
      CITY_REGISTRY,
    ).join(", ")}`,
  );
}

const mapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim();
if (!mapboxToken) {
  throw new Error("Missing required VITE_MAPBOX_TOKEN.");
}

const mapboxUsername = (import.meta.env.VITE_MAPBOX_USERNAME as string | undefined)?.trim();
const usesVectorSources = resolved.layers.some((layer) => layer.sourceType === "vector");
if (usesVectorSources && !mapboxUsername) {
  throw new Error("Missing required VITE_MAPBOX_USERNAME for vector city layers.");
}

export const deployedCity = resolved;
export const deployedCityContext = resolved.context;
export const deployedCityLayers = resolved.layers;
export const deployedCityLayerGroups = resolved.layerGroups;
export const deployedCityQuestionAdapter = resolved.questionAdapter;
