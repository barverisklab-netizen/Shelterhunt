import type { Question } from "@/types/game";
import type { CityLayer, CityLayerGroup } from "@/types/cityLayers";

export type CityLocale = "en" | "ja";

export interface CityMapStyle {
  styleUrl: string;
  fallbackStyleUrl?: string;
}

export interface CityQuestionAdapter {
  translationNamespace?: string;
  attributeCategoryMap: Record<string, Question["category"]>;
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
