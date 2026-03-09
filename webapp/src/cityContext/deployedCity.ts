import { kotoCityContext } from "@/cityContext/koto/context";
import {
  kotoLayers,
  kotoLayerGroups,
  kotoMapStyle,
  kotoSupportedLocales,
} from "@/cityContext/koto/layers";
import { kotoQuestionAdapter } from "@/cityContext/koto/questionAdapter";
import type { CityLayer, CityLayerGroup } from "@/types/cityLayers";
import type { CityContext } from "@/data/cityContext";
import type { CityLocale, CityMapStyle, CityQuestionAdapter } from "@/cityContext/types";

export interface DeployedCityDefinition {
  id: string;
  context: CityContext;
  mapStyle: CityMapStyle;
  layerGroups: ReadonlyArray<CityLayerGroup>;
  layers: CityLayer[];
  supportedLocales: CityLocale[];
  questionAdapter: CityQuestionAdapter;
}

const CITY_REGISTRY: Record<string, DeployedCityDefinition> = {
  koto: {
    id: "koto",
    context: kotoCityContext,
    mapStyle: kotoMapStyle,
    layerGroups: kotoLayerGroups,
    layers: kotoLayers,
    supportedLocales: kotoSupportedLocales,
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

const envLocales = (import.meta.env.VITE_SUPPORTED_LOCALES as string | undefined)
  ?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const envLocalesDeduped = envLocales ? Array.from(new Set(envLocales)) : undefined;

const resolvedLocales = envLocalesDeduped?.length ? envLocalesDeduped : resolved.supportedLocales;

if (!resolvedLocales.length) {
  throw new Error("City must define at least one supported locale.");
}

const invalidEnvLocales = resolvedLocales.filter(
  (locale) => !resolved.supportedLocales.includes(locale as CityLocale),
);
if (invalidEnvLocales.length > 0) {
  throw new Error(
    `Unsupported locale override(s): ${invalidEnvLocales.join(
      ", ",
    )}. Allowed for city '${resolved.id}': ${resolved.supportedLocales.join(", ")}`,
  );
}
const citySupportedLocales = resolvedLocales as CityLocale[];

const questionCatalog = resolved.questionAdapter.questionCatalog;
if (!questionCatalog.length) {
  throw new Error(`City '${resolved.id}' questionCatalog cannot be empty.`);
}
const questionIds = questionCatalog.map((item) => item.id);
if (new Set(questionIds).size !== questionIds.length) {
  throw new Error(`City '${resolved.id}' questionCatalog has duplicate question ids.`);
}
if (!resolved.questionAdapter.poiTypes.length) {
  throw new Error(`City '${resolved.id}' must define at least one poiType.`);
}
const unknownPoiQuestionIds = resolved.questionAdapter.poiTypes
  .map((poiType) => poiType.questionId)
  .filter((questionId) => !questionIds.includes(questionId));
if (unknownPoiQuestionIds.length > 0) {
  throw new Error(
    `City '${resolved.id}' poiTypes reference unknown question ids: ${unknownPoiQuestionIds.join(", ")}`,
  );
}
if (!resolved.questionAdapter.designatedShelter.categoryMatchers.length) {
  throw new Error(`City '${resolved.id}' must define designatedShelter category matchers.`);
}
if (!resolved.questionAdapter.proximity.geojsonUrls.length) {
  throw new Error(`City '${resolved.id}' must define proximity geojsonUrls.`);
}
const nearbyRange = resolved.questionAdapter.nearbyQuestion;
if (nearbyRange.countMin > nearbyRange.countMax) {
  throw new Error(
    `City '${resolved.id}' nearby question countMin cannot be greater than countMax.`,
  );
}

export const deployedCity = resolved;
export const deployedCityContext = resolved.context;
export const deployedCityLayers = resolved.layers;
export const deployedCityLayerGroups = resolved.layerGroups;
export const deployedCitySupportedLocales = citySupportedLocales;
export const deployedCityQuestionAdapter = resolved.questionAdapter;
