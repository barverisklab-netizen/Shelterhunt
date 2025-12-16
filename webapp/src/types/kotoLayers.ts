// Koto, Tokyo map layer type definitions

export type KotoLayerSwatchType = "line" | "fill" | "symbol";
export type KotoLayerGroup =
  | "Shelters"
  | "Evacuation Support Facilities"
  | "City Landmarks"
  | "Hazard Layers";

export interface KotoLayerLegendItem {
  label: string;
  isActive?: boolean;
  isEnabled?: boolean;
  swatchType: KotoLayerSwatchType;
  description: string;
  labelKey?: string;
  descriptionKey?: string;
  swatchStyle: {
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
  };
}

export interface KotoLayerMetadata {
  query: {
    template: string;
  };
  loadOnInit: boolean;
  legendItems: KotoLayerLegendItem[];
}

export interface KotoLayerSourceData {
  // For vector sources, layerId + layerName are required; for geojson sources,
  // layerId is a stable identifier and geojsonUrl points to the bundled data.
  layerId: string;
  layerName?: string;
  geojsonUrl?: string;
}

export interface KotoLayerStyle {
  paint: Record<string, unknown>;
  filter?: unknown[];
  layout: Record<string, unknown>;
}

export interface KotoLayer {
  id: number;
  label: string;
  group: KotoLayerGroup;
  metadata: KotoLayerMetadata;
  layerType: "symbol" | "fill" | "line";
  sourceType: "vector" | "geojson";
  sourceData: KotoLayerSourceData;
  style: KotoLayerStyle;
}
