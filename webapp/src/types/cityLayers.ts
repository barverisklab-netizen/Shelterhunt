export type CityLayerSwatchType = "line" | "fill" | "symbol";
export type CityLayerGroup = string;

export interface CityLayerLegendItem {
  label: string;
  isActive?: boolean;
  isEnabled?: boolean;
  swatchType: CityLayerSwatchType;
  description: string;
  labelKey?: string;
  descriptionKey?: string;
  swatchStyle: {
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
  };
}

export interface CityLayerMetadata {
  query: {
    template: string;
  };
  loadOnInit: boolean;
  legendItems: CityLayerLegendItem[];
}

export interface CityLayerSourceData {
  // For vector sources, layerId + layerName are required; for geojson sources,
  // layerId is a stable identifier and geojsonUrl points to the bundled data.
  layerId: string;
  layerName?: string;
  geojsonUrl?: string;
}

export interface CityLayerStyle {
  paint: Record<string, unknown>;
  filter?: unknown[];
  layout: Record<string, unknown>;
}

export interface CityLayer {
  id: number;
  label: string;
  labelJp?: string;
  group: CityLayerGroup;
  metadata: CityLayerMetadata;
  layerType: "symbol" | "fill" | "line";
  sourceType: "vector" | "geojson";
  sourceData: CityLayerSourceData;
  style: CityLayerStyle;
}
