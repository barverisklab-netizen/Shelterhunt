import type { Feature, FeatureCollection, MultiPoint, Point } from "geojson";
import type mapboxgl from "mapbox-gl";

export const MEASURE_CIRCLE_SOURCE_ID = "measure-circle-source";
export const MEASURE_CIRCLE_FILL_LAYER_ID = "measure-circle-fill";
export const MEASURE_CIRCLE_OUTLINE_LAYER_ID = "measure-circle-outline";
export const MEASURE_SHELTERS_SOURCE_ID = "measure-shelters-source";
export const MEASURE_SHELTERS_LAYER_ID = "measure-shelters-layer";
export const MEASURE_SHELTERS_LABEL_LAYER_ID = "measure-shelters-label-layer";

export const FIXED_MEASURE_RADIUS_METERS = 250;

export type PointLikeGeometry = Point | MultiPoint;
export type PointLikeFeature = Feature<PointLikeGeometry, Record<string, any>>;

export interface MeasurementFeatureLayer {
  id: number;
  sourceType: string;
  sourceData: {
    geojsonUrl?: string;
  };
  style: {
    filter?: unknown;
  };
}

export interface MeasurementFeatureCaches {
  geojsonSourceCache: Record<string, PointLikeFeature[]>;
  geojsonSourcePromises: Record<string, Promise<PointLikeFeature[]>>;
  layerFeatureCache: Record<number, PointLikeFeature[]>;
  layerFeaturePromises: Record<number, Promise<PointLikeFeature[]>>;
}

export const createMeasurementFeatureCaches = (): MeasurementFeatureCaches => ({
  geojsonSourceCache: {},
  geojsonSourcePromises: {},
  layerFeatureCache: {},
  layerFeaturePromises: {},
});

export const createMeasurementCircleFeature = (
  center: { lng: number; lat: number },
  radiusMeters: number,
  steps = 64,
) => {
  const coordinates: [number, number][] = [];
  const earthRadius = 6378137;
  const latRad = (center.lat * Math.PI) / 180;

  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);

    const latOffset = (dy / earthRadius) * (180 / Math.PI);
    const lngOffset = (dx / (earthRadius * Math.cos(latRad))) * (180 / Math.PI);

    coordinates.push([center.lng + lngOffset, center.lat + latOffset]);
  }

  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [coordinates],
    },
    properties: {},
  };
};

export const getFeatureCoordinates = (feature: PointLikeFeature): [number, number][] => {
  const geometry = feature.geometry;
  if (!geometry) return [];

  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates;
    return Number.isFinite(lng) && Number.isFinite(lat) ? [[lng, lat]] : [];
  }

  if (geometry.type === "MultiPoint") {
    return geometry.coordinates.filter(
      (coords): coords is [number, number] =>
        Array.isArray(coords) && Number.isFinite(coords[0]) && Number.isFinite(coords[1]),
    );
  }

  return [];
};

const resolveFilterExpression = (
  expression: unknown,
  properties: Record<string, any>,
): unknown => {
  if (!Array.isArray(expression)) {
    return expression;
  }

  const [op, ...args] = expression;
  if (op === "get") {
    const key = args[0];
    if (typeof key === "string") {
      return properties?.[key];
    }
    return undefined;
  }

  if (op === "literal") {
    return args[0];
  }

  return expression;
};

export const evaluateLayerFilter = (
  filter: unknown,
  properties: Record<string, any>,
): boolean => {
  if (!filter) return true;
  if (!Array.isArray(filter)) return true;

  const [op, ...args] = filter;

  if (op === "==") {
    if (args.length < 2) return true;
    return (
      resolveFilterExpression(args[0], properties) ===
      resolveFilterExpression(args[1], properties)
    );
  }

  if (op === "in") {
    if (args.length < 2) return true;
    const needle = resolveFilterExpression(args[0], properties);
    const haystack = args.slice(1).flatMap((arg) => {
      const resolved = resolveFilterExpression(arg, properties);
      if (Array.isArray(resolved)) {
        return resolved;
      }
      return [resolved];
    });
    return haystack.some((value) => value === needle);
  }

  if (op === "all") {
    return args.every((clause) => evaluateLayerFilter(clause, properties));
  }

  if (op === "any") {
    return args.some((clause) => evaluateLayerFilter(clause, properties));
  }

  if (op === "!") {
    if (!args.length) return true;
    return !evaluateLayerFilter(args[0], properties);
  }

  return true;
};

export const loadGeojsonPointFeatures = async (
  geojsonUrl: string | undefined,
  caches: MeasurementFeatureCaches,
): Promise<PointLikeFeature[]> => {
  if (!geojsonUrl) return [];

  if (caches.geojsonSourceCache[geojsonUrl]) {
    return caches.geojsonSourceCache[geojsonUrl];
  }

  if (!caches.geojsonSourcePromises[geojsonUrl]) {
    caches.geojsonSourcePromises[geojsonUrl] = fetch(geojsonUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load geojson source ${geojsonUrl}: ${response.status} ${response.statusText}`,
          );
        }
        return response.json() as Promise<FeatureCollection>;
      })
      .then((collection) => {
        if (
          !collection ||
          collection.type !== "FeatureCollection" ||
          !Array.isArray(collection.features)
        ) {
          return [];
        }
        const pointFeatures = collection.features.filter(
          (feature): feature is PointLikeFeature => {
            const type = feature?.geometry?.type;
            return type === "Point" || type === "MultiPoint";
          },
        );
        caches.geojsonSourceCache[geojsonUrl] = pointFeatures;
        return pointFeatures;
      })
      .catch((error) => {
        console.warn(`[Measure] Unable to load geojson ${geojsonUrl}`, error);
        delete caches.geojsonSourcePromises[geojsonUrl];
        return [];
      });
  }

  return caches.geojsonSourcePromises[geojsonUrl];
};

export const getLayerMeasurementFeatures = async (
  layer: MeasurementFeatureLayer,
  caches: MeasurementFeatureCaches,
): Promise<PointLikeFeature[]> => {
  if (layer.sourceType !== "geojson") {
    return [];
  }

  if (caches.layerFeatureCache[layer.id]) {
    return caches.layerFeatureCache[layer.id];
  }

  if (!caches.layerFeaturePromises[layer.id]) {
    caches.layerFeaturePromises[layer.id] = loadGeojsonPointFeatures(
      layer.sourceData.geojsonUrl,
      caches,
    ).then((features) => {
      const filtered = features.filter((feature) =>
        evaluateLayerFilter(layer.style.filter, feature.properties ?? {}),
      );
      caches.layerFeatureCache[layer.id] = filtered;
      return filtered;
    });
  }

  return caches.layerFeaturePromises[layer.id];
};

export const clearMeasurementCircleLayer = (map: mapboxgl.Map) => {
  if (map.getLayer(MEASURE_CIRCLE_FILL_LAYER_ID)) {
    map.removeLayer(MEASURE_CIRCLE_FILL_LAYER_ID);
  }
  if (map.getLayer(MEASURE_CIRCLE_OUTLINE_LAYER_ID)) {
    map.removeLayer(MEASURE_CIRCLE_OUTLINE_LAYER_ID);
  }
  if (map.getSource(MEASURE_CIRCLE_SOURCE_ID)) {
    map.removeSource(MEASURE_CIRCLE_SOURCE_ID);
  }
};

export const clearMeasurementShelterLayers = (map: mapboxgl.Map) => {
  if (map.getLayer(MEASURE_SHELTERS_LABEL_LAYER_ID)) {
    map.removeLayer(MEASURE_SHELTERS_LABEL_LAYER_ID);
  }
  if (map.getLayer(MEASURE_SHELTERS_LAYER_ID)) {
    map.removeLayer(MEASURE_SHELTERS_LAYER_ID);
  }
  if (map.getSource(MEASURE_SHELTERS_SOURCE_ID)) {
    map.removeSource(MEASURE_SHELTERS_SOURCE_ID);
  }
};

export const upsertMeasurementCircleLayer = (
  map: mapboxgl.Map,
  center: { lng: number; lat: number },
  radiusMeters: number,
) => {
  const circleFeature = createMeasurementCircleFeature(center, radiusMeters);

  if (map.getSource(MEASURE_CIRCLE_SOURCE_ID)) {
    (map.getSource(MEASURE_CIRCLE_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(
      circleFeature as any,
    );
    return;
  }

  map.addSource(MEASURE_CIRCLE_SOURCE_ID, {
    type: "geojson",
    data: circleFeature as any,
  });
  map.addLayer({
    id: MEASURE_CIRCLE_FILL_LAYER_ID,
    type: "fill",
    source: MEASURE_CIRCLE_SOURCE_ID,
    paint: {
      "fill-color": "#c1272d",
      "fill-opacity": 0.18,
    },
  });
  map.addLayer({
    id: MEASURE_CIRCLE_OUTLINE_LAYER_ID,
    type: "line",
    source: MEASURE_CIRCLE_SOURCE_ID,
    paint: {
      "line-color": "#c1272d",
      "line-width": 2,
      "line-dasharray": [1.5, 1.5],
    },
  });
};

export interface MeasurementShelterMarker {
  name?: string;
  lat: number;
  lng: number;
}

export const upsertMeasurementShelterLayers = (
  map: mapboxgl.Map,
  shelters: MeasurementShelterMarker[],
) => {
  if (map.getLayer(MEASURE_SHELTERS_LABEL_LAYER_ID)) {
    map.removeLayer(MEASURE_SHELTERS_LABEL_LAYER_ID);
  }
  if (map.getLayer(MEASURE_SHELTERS_LAYER_ID)) {
    map.removeLayer(MEASURE_SHELTERS_LAYER_ID);
  }

  const validShelters = shelters.filter(
    (shelter) =>
      typeof shelter.lng === "number" &&
      typeof shelter.lat === "number" &&
      Number.isFinite(shelter.lng) &&
      Number.isFinite(shelter.lat),
  );

  if (!validShelters.length) {
    if (map.getSource(MEASURE_SHELTERS_SOURCE_ID)) {
      map.removeSource(MEASURE_SHELTERS_SOURCE_ID);
    }
    return;
  }

  const featureCollection = {
    type: "FeatureCollection",
    features: validShelters.map((shelter) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [shelter.lng, shelter.lat],
      },
      properties: {
        name: shelter.name || "Shelter",
      },
    })),
  } as const;

  if (map.getSource(MEASURE_SHELTERS_SOURCE_ID)) {
    (map.getSource(MEASURE_SHELTERS_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(
      featureCollection as any,
    );
  } else {
    map.addSource(MEASURE_SHELTERS_SOURCE_ID, {
      type: "geojson",
      data: featureCollection as any,
    });
  }

  map.addLayer({
    id: MEASURE_SHELTERS_LAYER_ID,
    type: "circle",
    source: MEASURE_SHELTERS_SOURCE_ID,
    paint: {
      "circle-radius": 6,
      "circle-color": "#0f0f0f",
      "circle-stroke-color": "#c1272d",
      "circle-stroke-width": 3,
    },
  });

  map.addLayer({
    id: MEASURE_SHELTERS_LABEL_LAYER_ID,
    type: "symbol",
    source: MEASURE_SHELTERS_SOURCE_ID,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Inter Regular", "Arial Unicode MS Regular"],
      "text-size": 10,
      "text-anchor": "top",
      "text-offset": [0, 1.2],
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#0f0f0f",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.2,
    },
  });
};

export const hideMapLayers = (
  map: mapboxgl.Map,
  layerIds: string[],
  visibilityRef: Record<string, string>,
) => {
  layerIds.forEach((layerId) => {
    if (!map.getLayer(layerId)) return;
    const currentVisibility = (map.getLayoutProperty(layerId, "visibility") as string) ?? "visible";
    if (!(layerId in visibilityRef)) {
      visibilityRef[layerId] = currentVisibility;
    }
    map.setLayoutProperty(layerId, "visibility", "none");
  });
};

export const restoreMapLayerVisibility = (
  map: mapboxgl.Map,
  visibilityRef: Record<string, string>,
) => {
  Object.entries(visibilityRef).forEach(([layerId, visibility]) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  });
};
