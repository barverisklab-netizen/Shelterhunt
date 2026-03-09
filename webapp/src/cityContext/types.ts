import type { CityLayer, CityLayerGroup } from "@/types/cityLayers";

export type CityLocale = "en" | "ja";
export type CityQuestionKind = "number" | "select";
export type CityQuestionSource = "shelter" | "nearby";
export type CityQuestionEvaluation = "equals" | "atMost";
export type CityNearbyQuestionMode = "picker" | "per-poi";

export interface CityMapStyle {
  styleUrl: string;
  fallbackStyleUrl?: string;
}

export interface CityQuestionCatalogItem {
  id: string;
  label: string;
  kind: CityQuestionKind;
  category: string;
  source: CityQuestionSource;
  evaluation: CityQuestionEvaluation;
  sourceProperty?: string;
  defaultNumber?: number;
}

export interface CityPoiType {
  id: string;
  questionId: string;
  rawCategoryMatchers: string[];
}

export interface CityNearbyQuestionConfig {
  mode: CityNearbyQuestionMode;
  questionId: string;
  categoryId: string;
  radiusKm: number;
  countMin: number;
  countMax: number;
  cooldownScope: "shared" | "per-poi";
}

export interface CityDesignatedShelterConfig {
  categoryMatchers: string[];
  layerLabelMatchers: string[];
}

export interface CityProximityConfig {
  geojsonUrls: string[];
}

export interface CityQuestionAdapter {
  translationNamespace?: string;
  questionCatalog: CityQuestionCatalogItem[];
  poiTypes: CityPoiType[];
  nearbyQuestion: CityNearbyQuestionConfig;
  designatedShelter: CityDesignatedShelterConfig;
  proximity: CityProximityConfig;
  buildQuestionFallback: (attribute: { id: string; label: string; kind: "number" | "select" }) => string;
  buildClueFallback: (attribute: { id: string; label: string; kind: "number" | "select" }) => string;
  nearbyAmenityQuestionFallback: string;
}

export interface CityLayersConfig {
  mapStyle: CityMapStyle;
  layerGroups: CityLayerGroup[];
  layers: CityLayer[];
  supportedLocales: CityLocale[];
}
