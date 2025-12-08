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
  layerId: string;
  layerName: string;
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
  sourceType: "vector";
  sourceData: KotoLayerSourceData;
  style: KotoLayerStyle;
}
