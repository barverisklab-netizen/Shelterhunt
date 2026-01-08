import { useEffect, useRef, useState, useCallback } from "react";
import type { Feature, FeatureCollection, Point, MultiPoint } from "geojson";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  Home,
  Flame,
  Hospital,
  Trees,
  Library,
  School,
  Layers,
  Heart,
  Building2,
  Cable,
  Train,
  Droplet,
  Archive,
} from "lucide-react";
import { POI } from "@/types/game";
import { kotoLayers } from "@/cityContext/koto/layers";
import { KotoLayerGroup } from "@/types/kotoLayers";
import { MAPBOX_CONFIG, getTilesetUrl } from "../config/mapbox";
import { MAPBOX_STYLE_URL, PROXIMITY_RADIUS_KM } from "@/config/runtime";
import { defaultCityContext } from "../data/cityContext";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast } from "sonner@2.0.3"
import { haversineDistanceKm } from "@/utils/lightningSelection";
import { getLocalShelters } from "@/services/mapLayerQueryService";
import { countAmenitiesWithinRadius } from "@/services/proximityIndex";
import { useI18n } from "@/i18n";
import { MeasurePanel } from "./MeasurePanel";

// Set Mapbox access token from config
mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;
// console.log(
//   "Mapbox token loaded",
// );
// console.log("Mapbox username configured:");

// Replace the whole function with this
const sanitizeToBauhausColor = (color?: string): string => {
  return (color ?? "#000000").trim();
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"'`=\/]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "/": "&#x2F;", "`": "&#x60;", "=": "&#x3D;" }[c] as string),
  );

const createCircleFeature = (
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
    const lngOffset =
      (dx / (earthRadius * Math.cos(latRad))) * (180 / Math.PI);

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

type PointLikeGeometry = Point | MultiPoint;
type PointLikeFeature = Feature<PointLikeGeometry, Record<string, any>>;

const getFeatureCoordinates = (feature: PointLikeFeature): [number, number][] => {
  const geometry = feature.geometry;
  if (!geometry) return [];

  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates;
    return Number.isFinite(lng) && Number.isFinite(lat) ? [[lng, lat]] : [];
  }

  if (geometry.type === "MultiPoint") {
    return geometry.coordinates.filter(
      (coords): coords is [number, number] =>
        Array.isArray(coords) &&
        Number.isFinite(coords[0]) &&
        Number.isFinite(coords[1]),
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

const evaluateLayerFilter = (
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


const LAYER_ICON_BY_LABEL: Record<string, React.ReactNode> = {
  "AED Locations": <Heart className="w-4 h-4" />,
  "Bridges": <Cable className="w-4 h-4" />,
  "Shrines/Temples": <Home className="w-4 h-4" />,
  "Community Centers": <Building2 className="w-4 h-4" />,
  "Flood Gates": <Cable className="w-4 h-4" />,
  "Train Stations": <Train className="w-4 h-4" />,
  "Water Stations": <Droplet className="w-4 h-4" />,
  "Hospitals": <Hospital className="w-4 h-4" />,
  "Emergency Supply Storage": <Archive className="w-4 h-4" />,
};

// Helper function to get icons for Koto layers based on label
const getKotoLayerIcon = (layer: (typeof kotoLayers)[0]): React.ReactNode => {
  const icon = LAYER_ICON_BY_LABEL[layer.label];
  if (icon) return icon;

  const rawColor =
    layer.metadata?.legendItems?.[0]?.swatchStyle.strokeColor ||
    layer.metadata?.legendItems?.[0]?.swatchStyle.fillColor ||
    "#000000";

  const color = sanitizeToBauhausColor(rawColor);
  return <MapPin className="w-4 h-4" style={{ color }} />;
};

const KOTO_LAYER_GROUPS: KotoLayerGroup[] = [
  "Shelters",
  "Evacuation Support Facilities",
  "City Landmarks",
  "Hazard Layers",
];

const SHELTER_KOTO_LAYER_IDS = kotoLayers
  .filter((layer) => /Designated Evacuation Centers/i.test(layer.label))
  .map((layer) => `koto-layer-${layer.id}`);
const AMENITY_CATEGORIES: Record<string, string> = {
  "Water Station": "waterStation250m",
  "Hospital": "hospital250m",
  "AED": "aed250m",
  "Emergency Supply Storage": "emergencySupplyStorage250m",
  "Community Center": "communityCenter250m",
  "Train Station": "trainStation250m",
  "Shrine/Temple": "shrineTemple250m",
  "Flood Gate": "floodgate250m",
  "Bridge": "bridge250m",
};

const MEASURE_CIRCLE_SOURCE_ID = "measure-circle-source";
const MEASURE_CIRCLE_FILL_LAYER_ID = "measure-circle-fill";
const MEASURE_CIRCLE_OUTLINE_LAYER_ID = "measure-circle-outline";
const MEASURE_SHELTERS_SOURCE_ID = "measure-shelters-source";
const MEASURE_SHELTERS_LAYER_ID = "measure-shelters-layer";
const MEASURE_SHELTERS_LABEL_LAYER_ID = "measure-shelters-label-layer";
const PLAYER_RANGE_SOURCE_ID = "player-range-source";
const PLAYER_RANGE_FILL_LAYER_ID = "player-range-fill-layer";
const PLAYER_RANGE_OUTLINE_LAYER_ID = "player-range-outline-layer";
const FILTER_POIS_SOURCE_ID = "filtered-pois-source";
const FILTER_POIS_LAYER_ID = "filtered-pois-layer";
const FILTER_POIS_LABEL_LAYER_ID = "filtered-pois-label-layer";
const LIGHTNING_RANGE_SOURCE_ID = "lightning-range-source";
const LIGHTNING_RANGE_FILL_LAYER_ID = "lightning-range-fill-layer";
const LIGHTNING_RANGE_OUTLINE_LAYER_ID = "lightning-range-outline-layer";
const GEOLOCATE_STYLE_ID = "mapbox-geolocate-circle-style";
const ATTRIBUTION_STYLE_ID = "mapbox-attribution-position-style";
const DEFAULT_START_LOCATION = defaultCityContext.mapConfig.startLocation;

type MeasureStatus = "idle" | "placing" | "active";
const FIXED_MEASURE_RADIUS_METERS = 250;
const PLAYER_RADIUS_METERS = Math.max(1, PROXIMITY_RADIUS_KM * 1000);

interface MapViewProps {
  pois: POI[];
  playerLocation: { lat: number; lng: number };
  visitedPOIs: string[];
  gameEnded?: boolean;
  onPOIClick?: (poi: POI) => void;
  basemapUrl?: string;
  onSecretShelterChange?: (info: { id: string; name: string }) => void;
  onShelterOptionsChange?: (options: { id: string; name: string; lat?: number; lng?: number }[]) => void;
  measureTrigger?: number;
  onMeasurementActiveChange?: (active: boolean) => void;
  isFiltered?: boolean;
  onLayerPanelToggle?: (open: boolean) => void;
  layerPanelCloseSignal?: number;
  gameMode?: "lightning" | "citywide" | null;
  lightningCenter?: { lat: number; lng: number } | null;
  lightningRadiusKm?: number;
  onAmenitiesWithinRadius?: (info: { counts: Record<string, number>; matchedCategories: string[] }) => void;
  amenityQueryTrigger?: number;
}

// const POI_ICONS = {
//   shelter: Home,
//   fire_station: Flame,
//   hospital: Hospital,
//   park: Trees,
//   library: Library,
//   school: School,
// };


export function MapView({
  pois,
  playerLocation,
  visitedPOIs,
  gameEnded,
  onPOIClick,
  basemapUrl = defaultCityContext.mapConfig.basemapUrl,
  onSecretShelterChange,
  onShelterOptionsChange,
  measureTrigger,
  onMeasurementActiveChange,
  isFiltered = false,
  onLayerPanelToggle,
  layerPanelCloseSignal,
  gameMode,
  lightningCenter,
  lightningRadiusKm = 2,
  onAmenitiesWithinRadius,
  amenityQueryTrigger,
}: MapViewProps) {
  const { t, locale } = useI18n();
  const translateRef = useRef(t);
  const localeRef = useRef(locale);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const playerMarker = useRef<mapboxgl.Marker | null>(null);
  const geolocateControl = useRef<mapboxgl.GeolocateControl | null>(null);
const infoPopup = useRef<mapboxgl.Popup | null>(null);
const hasSelectedShelter = useRef(false);
const hasEmittedShelterOptions = useRef(false);
const pendingPoiRefreshRef = useRef<POI[] | null>(null);
const pendingPoiRefreshHandlerRef = useRef<(() => void) | null>(null);
const filteredPoiPopupHandlerRef = useRef<
  ((event: mapboxgl.MapLayerMouseEvent & mapboxgl.EventData) => void) | null
>(null);
const measureMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const measureShelterMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const measurePopupRef = useRef<mapboxgl.Popup | null>(null);
  const shelterLayerVisibilityRef = useRef<Record<string, string>>({});
  const lastMeasureTriggerRef = useRef<number>(0);
  const measureStatusRef = useRef<MeasureStatus>("idle");
  const lastMeasureRequestRef = useRef<number>(0);
  const geolocateHandlerRef = useRef<((event: GeolocationPosition) => void) | null>(null);
  const lastLightningParamsRef = useRef<{ center: { lat: number; lng: number }; radiusKm: number } | null>(null);
  const amenityCountsRef = useRef<Record<string, number>>({});
  const geojsonSourceCacheRef = useRef<Record<string, PointLikeFeature[]>>({});
  const geojsonSourcePromisesRef = useRef<Record<string, Promise<PointLikeFeature[]>>>({});
  const layerFeatureCacheRef = useRef<Record<number, PointLikeFeature[]>>({});
  const layerFeaturePromisesRef = useRef<Record<number, Promise<PointLikeFeature[]>>>({});
  const reapplyPlayerRangeRef = useRef<() => void>(() => {});
  const latestLocationRef = useRef<{ lat: number; lng: number }>(playerLocation);
  const amenitiesCallbackRef = useRef<
    ((info: { counts: Record<string, number>; matchedCategories: string[] }) => void) | undefined
  >(onAmenitiesWithinRadius);

  // Koto layer visibility state
  const [kotoLayersVisible, setKotoLayersVisible] = useState<
    Record<string, boolean>
  >(() => {
    const initialState: Record<string, boolean> = {};
    kotoLayers.forEach((layer) => {
      initialState[layer.label] = layer.metadata.loadOnInit;
    });
    return initialState;
  });

  useEffect(() => {
    if (layerPanelCloseSignal !== undefined) {
      setShowLayerControl(false);
      onLayerPanelToggle?.(false);
    }
  }, [layerPanelCloseSignal]);

  useEffect(() => {
    translateRef.current = t;
  }, [t]);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  const localizeTextFieldExpression = useCallback(
    (expr: any, currentLocale: typeof locale): any => {
      if (Array.isArray(expr)) {
        return expr.map((item) => localizeTextFieldExpression(item, currentLocale));
      }
      if (typeof expr === "string") {
        const normalized = expr.trim().toLowerCase();
        const wantsName =
          normalized === "landmark name (jp)" ||
          normalized === "landmark name (en)" ||
          normalized === "landmark name";
        const wantsAddress =
          normalized === "address (jp)" ||
          normalized === "address (en)" ||
          normalized === "address";

        if (wantsName) {
          return currentLocale === "ja" ? "Landmark Name (JP)" : "Landmark Name (EN)";
        }
        if (wantsAddress) {
          return currentLocale === "ja" ? "Address (JP)" : "Address (EN)";
        }
      }
      return expr;
    },
    [],
  );

  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const cloneFn = (globalThis as any).structuredClone as
      | (<T>(value: T) => T)
      | undefined;

    kotoLayers.forEach((layer) => {
      const layerId = `koto-layer-${layer.id}`;
      const baseTextField = layer.style.layout?.["text-field"];
      if (!baseTextField) return;
      if (!m.getLayer(layerId)) return;

      const cloned = cloneFn
        ? cloneFn(baseTextField)
        : JSON.parse(JSON.stringify(baseTextField));
      const localized = localizeTextFieldExpression(cloned, locale);

      try {
        m.setLayoutProperty(layerId, "text-field", localized);
      } catch (error) {
        console.warn("[koto] Failed to update text-field for locale", {
          layerId,
          error,
        });
      }
    });
  }, [locale, localizeTextFieldExpression]);

  const [layerGroupOpenState, setLayerGroupOpenState] = useState<
    Record<KotoLayerGroup, boolean>
  >(() =>
    KOTO_LAYER_GROUPS.reduce(
      (acc, group) => ({ ...acc, [group]: true }),
      {} as Record<KotoLayerGroup, boolean>,
    ),
  );

  const [measureState, setMeasureState] = useState<{
    status: MeasureStatus;
    radius: number;
    count: number;
    center: { lng: number; lat: number } | null;
    featureNames: string[];
    layerCounts: Record<string, number>;
  }>({
    status: "idle",
    radius: FIXED_MEASURE_RADIUS_METERS,
    count: 0,
    center: null,
    featureNames: [],
    layerCounts: {},
  });

  const [userCircleCenter, setUserCircleCenter] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [hasUserLocationFix, setHasUserLocationFix] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [isMeasurePanelCollapsed, setIsMeasurePanelCollapsed] = useState(false);
  const [visiblePois, setVisiblePois] = useState<POI[]>([]);

  const loadGeojsonPointFeatures = useCallback(
    async (geojsonUrl?: string): Promise<PointLikeFeature[]> => {
      if (!geojsonUrl) return [];

      if (geojsonSourceCacheRef.current[geojsonUrl]) {
        return geojsonSourceCacheRef.current[geojsonUrl];
      }

      if (!geojsonSourcePromisesRef.current[geojsonUrl]) {
        geojsonSourcePromisesRef.current[geojsonUrl] = fetch(geojsonUrl)
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
            geojsonSourceCacheRef.current[geojsonUrl] = pointFeatures;
            return pointFeatures;
          })
          .catch((error) => {
            console.warn(`[Measure] Unable to load geojson ${geojsonUrl}`, error);
            delete geojsonSourcePromisesRef.current[geojsonUrl];
            return [];
          });
      }

      return geojsonSourcePromisesRef.current[geojsonUrl];
    },
    [],
  );

  const getLayerMeasurementFeatures = useCallback(
    async (layer: (typeof kotoLayers)[number]): Promise<PointLikeFeature[]> => {
      if (layer.sourceType !== "geojson") {
        return [];
      }

      if (layerFeatureCacheRef.current[layer.id]) {
        return layerFeatureCacheRef.current[layer.id];
      }

      if (!layerFeaturePromisesRef.current[layer.id]) {
        layerFeaturePromisesRef.current[layer.id] = loadGeojsonPointFeatures(
          layer.sourceData.geojsonUrl,
        ).then((features) => {
          const filtered = features.filter((feature) =>
            evaluateLayerFilter(layer.style.filter, feature.properties ?? {}),
          );
          layerFeatureCacheRef.current[layer.id] = filtered;
          return filtered;
        });
      }

      return layerFeaturePromisesRef.current[layer.id];
    },
    [loadGeojsonPointFeatures],
  );

  const buildDesignatedShelterPopupHtml = useCallback((props: Record<string, any>) => {
    const translate = translateRef.current;
    const currentLocale = localeRef.current;

    const translateLabel = (key: string, fallback: string) =>
      typeof translate === "function" ? translate(key, { fallback }) : fallback;

    const headerLabel = translateLabel(
      "map.layers.items.1",
      "Designated Evacuation Centers",
    );
    const headerDescription = translateLabel(
      "map.layers.descriptions.1",
      "Government-designated evacuation center.",
    );

    const getLocalizedValue = (enKey: string, jaKey: string) => {
      if (currentLocale === "ja") {
        return props?.[jaKey] ?? props?.[enKey] ?? null;
      }
      return props?.[enKey] ?? props?.[jaKey] ?? null;
    };

    const name =
      getLocalizedValue("Landmark Name (EN)", "Landmark Name (JP)") ??
      (currentLocale === "ja"
        ? props?.name_jp ?? props?.name
        : props?.name_en ?? props?.name);
    const category = getLocalizedValue("Category", "Category (JP)");
    const capacity =
      props?.Shelter_Capacity ??
      props?.["Shelter_Capacity"] ??
      props?.shelterCapacity ??
      null;
    const address = getLocalizedValue("Address (EN)", "Address (JP)");

    const rows = [
      { label: translateLabel("map.popup.name", "Name"), value: name },
      { label: translateLabel("map.popup.category", "Category"), value: category },
      {
        label: translateLabel("map.popup.shelterCapacity", "Shelter Capacity"),
        value: capacity,
      },
      { label: translateLabel("map.popup.address", "Address"), value: address },
    ].filter((row) => row.value != null && row.value !== "");

    if (!rows.length) return null;

    const rowsHtml = rows
      .map(
        (row) =>
          `${escapeHtml(row.label)}: <b>${escapeHtml(
            String(row.value ?? ""),
          )}</b>`,
      )
      .join("<br>");

    const inner = `
      <div style="padding: 12px;">
        <div style="font-weight:700; margin-bottom:6px; font-size:14px;">
          ${escapeHtml(headerLabel)}
        </div>
        ${
          headerDescription
            ? `<div style="opacity:0.9; font-size:12px; margin-bottom:8px;">${escapeHtml(headerDescription)}</div>`
            : ""
        }
        <div style="font-size:12px; line-height:1.5;">
          ${rowsHtml}
        </div>
      </div>
    `;

    return `
      <div style="background: rgba(0,0,0,0.85); border-radius: 8px; min-width: 220px; color: #fff;">
        ${inner}
      </div>
    `;
  }, []);


  useEffect(() => {
    if (measureState.status !== "active") {
      setIsMeasurePanelCollapsed(false);
    }
  }, [measureState.status]);

  useEffect(() => {
    if (isFiltered) {
      setVisiblePois(pois);
    } else {
      setVisiblePois([]);
    }
  }, [isFiltered, pois]);

  const closeMeasurePopup = useCallback(() => {
    if (measurePopupRef.current) {
      measurePopupRef.current.remove();
      measurePopupRef.current = null;
    }
  }, []);

  const removeShelterMarkers = useCallback(() => {
    measureShelterMarkersRef.current.forEach((marker) => marker.remove());
    measureShelterMarkersRef.current = [];
    const m = map.current;
    if (!m) return;

    if (m.getLayer(MEASURE_SHELTERS_LABEL_LAYER_ID)) {
      m.removeLayer(MEASURE_SHELTERS_LABEL_LAYER_ID);
    }
    if (m.getLayer(MEASURE_SHELTERS_LAYER_ID)) {
      m.removeLayer(MEASURE_SHELTERS_LAYER_ID);
    }
    if (m.getSource(MEASURE_SHELTERS_SOURCE_ID)) {
      m.removeSource(MEASURE_SHELTERS_SOURCE_ID);
    }
  }, []);

  const removeMeasurementCircle = useCallback(() => {
    const m = map.current;
    if (!m) return;

    if (m.getLayer(MEASURE_CIRCLE_FILL_LAYER_ID)) {
      m.removeLayer(MEASURE_CIRCLE_FILL_LAYER_ID);
    }
    if (m.getLayer(MEASURE_CIRCLE_OUTLINE_LAYER_ID)) {
      m.removeLayer(MEASURE_CIRCLE_OUTLINE_LAYER_ID);
    }
    if (m.getSource(MEASURE_CIRCLE_SOURCE_ID)) {
      m.removeSource(MEASURE_CIRCLE_SOURCE_ID);
    }
  }, []);

  const removeMeasurementArtifacts = useCallback(() => {
    removeMeasurementCircle();
    removeShelterMarkers();
    closeMeasurePopup();
  }, [closeMeasurePopup, removeMeasurementCircle, removeShelterMarkers]);

  const restoreShelterLayers = useCallback(() => {
    const m = map.current;
    if (!m) return;

    Object.entries(shelterLayerVisibilityRef.current).forEach(
      ([layerId, visibility]) => {
        if (m.getLayer(layerId)) {
          m.setLayoutProperty(layerId, "visibility", visibility);
        }
      },
    );
    shelterLayerVisibilityRef.current = {};
  }, []);

  const hideShelterLayers = useCallback(() => {
    const m = map.current;
    if (!m) return;

    SHELTER_KOTO_LAYER_IDS.forEach((layerId) => {
      if (!m.getLayer(layerId)) return;
      const currentVisibility =
        (m.getLayoutProperty(layerId, "visibility") as string) ?? "visible";
      if (!(layerId in shelterLayerVisibilityRef.current)) {
        shelterLayerVisibilityRef.current[layerId] = currentVisibility;
      }
      m.setLayoutProperty(layerId, "visibility", "none");
    });
  }, []);

  const clearMeasurement = useCallback(() => {
    removeMeasurementArtifacts();
    restoreShelterLayers();
    if (measureMarkerRef.current) {
      measureMarkerRef.current.remove();
      measureMarkerRef.current = null;
    }
    setMeasureState({
      status: "idle",
      radius: FIXED_MEASURE_RADIUS_METERS,
      count: 0,
      center: null,
      featureNames: [],
      layerCounts: {},
    });
  }, [removeMeasurementArtifacts, restoreShelterLayers]);

  const refreshFilteredPoiLayers = useCallback(
    (poisToRender: POI[]) => {
      const m = map.current;
      if (!m) return;
      if (typeof m.isStyleLoaded === "function" && !m.isStyleLoaded()) {
        pendingPoiRefreshRef.current = poisToRender;
        if (!pendingPoiRefreshHandlerRef.current) {
          const handler = () => {
            const activeMap = map.current;
            if (!activeMap) return;
            if (typeof activeMap.isStyleLoaded === "function" && !activeMap.isStyleLoaded()) {
              return;
            }
            if (pendingPoiRefreshHandlerRef.current) {
              activeMap.off("idle", pendingPoiRefreshHandlerRef.current);
              pendingPoiRefreshHandlerRef.current = null;
            }
            const pending = pendingPoiRefreshRef.current;
            pendingPoiRefreshRef.current = null;
            if (pending) {
              refreshFilteredPoiLayers(pending);
            }
          };
          pendingPoiRefreshHandlerRef.current = handler;
          m.on("idle", handler);
        }
        return;
      }

      if (!poisToRender.length) {
        if (m.getLayer(FILTER_POIS_LABEL_LAYER_ID)) m.removeLayer(FILTER_POIS_LABEL_LAYER_ID);
        if (m.getLayer(FILTER_POIS_LAYER_ID)) m.removeLayer(FILTER_POIS_LAYER_ID);
        if (m.getSource(FILTER_POIS_SOURCE_ID)) m.removeSource(FILTER_POIS_SOURCE_ID);
        if (filteredPoiPopupHandlerRef.current) {
          m.off("click", FILTER_POIS_LAYER_ID, filteredPoiPopupHandlerRef.current);
          filteredPoiPopupHandlerRef.current = null;
        }
        return;
      }

      const featureCollection = {
        type: "FeatureCollection",
        features: poisToRender.map((poi) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [poi.lng, poi.lat] },
          properties: {
            name: poi.name ?? "Shelter",
            name_en: poi.nameEn ?? poi.name ?? null,
            name_jp: poi.nameJp ?? poi.name ?? null,
            ...(poi.properties ?? {}),
          },
        })),
      } as const;

      if (m.getSource(FILTER_POIS_SOURCE_ID)) {
        (m.getSource(FILTER_POIS_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(
          featureCollection as any,
        );
      } else {
        m.addSource(FILTER_POIS_SOURCE_ID, {
          type: "geojson",
          data: featureCollection as any,
        });
      }

      if (!m.getLayer(FILTER_POIS_LAYER_ID)) {
        m.addLayer({
          id: FILTER_POIS_LAYER_ID,
          type: "circle",
          source: FILTER_POIS_SOURCE_ID,
          paint: {
            "circle-radius": 7,
            "circle-color": "#0f0f0f",
            "circle-stroke-color": "#c1272d",
            "circle-stroke-width": 3,
          },
        });
      }

      if (!m.getLayer(FILTER_POIS_LABEL_LAYER_ID)) {
        m.addLayer({
          id: FILTER_POIS_LABEL_LAYER_ID,
          type: "symbol",
          source: FILTER_POIS_SOURCE_ID,
          layout: {
            "text-field":
              locale === "ja"
                ? ["coalesce", ["get", "name_jp"], ["get", "name"], ["get", "name_en"]]
                : ["coalesce", ["get", "name_en"], ["get", "name"], ["get", "name_jp"]],
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
      }

      if (!filteredPoiPopupHandlerRef.current) {
        const handler = (
          event: mapboxgl.MapLayerMouseEvent & mapboxgl.EventData,
        ) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const html = buildDesignatedShelterPopupHtml(feature.properties ?? {});
          if (!html) return;
          if (!infoPopup.current) {
            infoPopup.current = new mapboxgl.Popup({
              closeButton: true,
              closeOnClick: true,
            });
          }
          infoPopup.current.setLngLat(event.lngLat).setHTML(html).addTo(m);
        };
        filteredPoiPopupHandlerRef.current = handler;
        m.on("click", FILTER_POIS_LAYER_ID, handler);
      }
    },
    [locale, buildDesignatedShelterPopupHtml],
  );

  useEffect(() => {
    latestLocationRef.current = playerLocation;
  }, [playerLocation.lat, playerLocation.lng]);

  useEffect(() => {
    amenitiesCallbackRef.current = onAmenitiesWithinRadius;
  }, [onAmenitiesWithinRadius]);

  const updateNearbyAmenityCounts = useCallback(async () => {
    // Reset cached counts so consumers don't see stale data between polls
    amenityCountsRef.current = {};
    amenitiesCallbackRef.current?.({ counts: {}, matchedCategories: [] });
    try {
      console.info("Amenity query center", latestLocationRef.current);
      const radiusKm = PROXIMITY_RADIUS_KM;
      const { counts, matchedCategories, unmatched } = await countAmenitiesWithinRadius(
        { lat: latestLocationRef.current.lat, lng: latestLocationRef.current.lng },
        radiusKm,
        AMENITY_CATEGORIES,
      );

      amenityCountsRef.current = counts;
      console.info("[Amenities] Counts within radius", {
        center: latestLocationRef.current,
        radiusKm,
        counts,
        matchedKeys: Object.keys(counts),
        matchedCategories: Array.from(matchedCategories),
        unmatched,
      });
      if (matchedCategories.size > 0) {
        console.info("[Amenities] Categories within radius", Array.from(matchedCategories));
      }
      amenitiesCallbackRef.current?.({
        counts,
        matchedCategories: Array.from(matchedCategories),
      });
    } catch (error) {
      amenitiesCallbackRef.current?.({ counts: {}, matchedCategories: [] });
      console.warn("[Amenities] Failed to update counts from geojson index", error);
    }
  }, []);

  const updateShelterMarkers = useCallback(
    (shelters: POI[]) => {
      const m = map.current;
      if (!m) return;

      measureShelterMarkersRef.current.forEach((marker) => marker.remove());
      measureShelterMarkersRef.current = [];

      if (m.getLayer(MEASURE_SHELTERS_LABEL_LAYER_ID)) {
        m.removeLayer(MEASURE_SHELTERS_LABEL_LAYER_ID);
      }
      if (m.getLayer(MEASURE_SHELTERS_LAYER_ID)) {
        m.removeLayer(MEASURE_SHELTERS_LAYER_ID);
      }

      const validShelters = shelters.filter(
        (shelter) =>
          typeof shelter.lng === "number" &&
          typeof shelter.lat === "number" &&
          Number.isFinite(shelter.lng) &&
          Number.isFinite(shelter.lat),
      );

      if (!validShelters.length) {
        if (m.getSource(MEASURE_SHELTERS_SOURCE_ID)) {
          m.removeSource(MEASURE_SHELTERS_SOURCE_ID);
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

      if (m.getSource(MEASURE_SHELTERS_SOURCE_ID)) {
        (m.getSource(MEASURE_SHELTERS_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(
          featureCollection as any,
        );
      } else {
        m.addSource(MEASURE_SHELTERS_SOURCE_ID, {
          type: "geojson",
          data: featureCollection as any,
        });
      }

      m.addLayer({
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

      m.addLayer({
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
    },
    [],
  );

  const updateCircle = useCallback(
    (center: { lng: number; lat: number }, radius: number) => {
      const m = map.current;
      if (!m) return;

      const requestId = Date.now();
      lastMeasureRequestRef.current = requestId;

      const circleFeature = createCircleFeature(center, radius);

      if (m.getSource(MEASURE_CIRCLE_SOURCE_ID)) {
        (m.getSource(MEASURE_CIRCLE_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(
          circleFeature as any,
        );
      } else {
        m.addSource(MEASURE_CIRCLE_SOURCE_ID, {
          type: "geojson",
          data: circleFeature as any,
        });
        m.addLayer({
          id: MEASURE_CIRCLE_FILL_LAYER_ID,
          type: "fill",
          source: MEASURE_CIRCLE_SOURCE_ID,
          paint: {
            "fill-color": "#c1272d",
            "fill-opacity": 0.18,
          },
        });
        m.addLayer({
          id: MEASURE_CIRCLE_OUTLINE_LAYER_ID,
          type: "line",
          source: MEASURE_CIRCLE_SOURCE_ID,
          paint: {
            "line-color": "#c1272d",
            "line-width": 2,
            "line-dasharray": [1.5, 1.5],
          },
        });
      }

      (async () => {
        const radiusKm = Math.max(0, radius) / 1000;
        const origin = { lat: center.lat, lng: center.lng };

        const activeSymbolLayers = kotoLayers.filter(
          (layer) => layer.layerType === "symbol" && kotoLayersVisible[layer.label],
        );

        const layerResults = await Promise.all(
          activeSymbolLayers.map(async (layer) => ({
            layer,
            features: await getLayerMeasurementFeatures(layer),
          })),
        );

        const layerCounts: Record<string, number> = {};
        const markers: POI[] = [];

        layerResults.forEach(({ layer, features }) => {
          const displayLabel =
            localeRef.current === "ja" ? layer.labelJp ?? layer.label : layer.label;
          features.forEach((feature, index) => {
            const coordinates = getFeatureCoordinates(feature);
            if (!coordinates.length) return;

            const isWithinRadius = coordinates.some(([lng, lat]) =>
              haversineDistanceKm(origin, { lat, lng }) <= radiusKm,
            );
            if (!isWithinRadius) return;

            const [lng, lat] = coordinates[0];
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
              return;
            }

            layerCounts[displayLabel] = (layerCounts[displayLabel] ?? 0) + 1;

            const props = feature.properties ?? {};
            const localizedName =
              localeRef.current === "ja"
                ? (props["Landmark Name (JP)"] as string) ??
                  (props["Landmark name (JP)"] as string) ??
                  (props["Landmark Name (EN)"] as string) ??
                  (props["Landmark name (EN)"] as string)
                : (props["Landmark Name (EN)"] as string) ??
                  (props["Landmark name (EN)"] as string) ??
                  (props["Landmark Name (JP)"] as string) ??
                  (props["Landmark name (JP)"] as string);
            const name = localizedName ?? (props.name as string) ?? displayLabel;

            const id =
              feature.id != null
                ? String(feature.id)
                : `${layer.id}-${index}`;

            markers.push({
              id,
              name,
              lat: Number(lat),
              lng: Number(lng),
              type: "shelter",
            });
          });
        });

        if (lastMeasureRequestRef.current !== requestId) {
          return;
        }

        updateShelterMarkers(markers);
        hideShelterLayers();

        console.log("[Measure] features within radius", {
          center,
          radiusMeters: radius,
          total: markers.length,
          layers: layerCounts,
        });

        setMeasureState((prev) => ({
          ...prev,
          status: "active",
          center,
          radius,
          count: markers.length,
          featureNames: markers
            .map((feature) => feature.name)
            .filter((name): name is string => Boolean(name)),
          layerCounts,
        }));
      })().catch((error) => {
        console.error("[Measure] Failed to load shelters", error);
      });
    },
    [getLayerMeasurementFeatures, hideShelterLayers, updateShelterMarkers, kotoLayersVisible],
  );

  const beginMoveCenter = useCallback(() => {
    removeMeasurementArtifacts();
    restoreShelterLayers();
    if (measureMarkerRef.current) {
      measureMarkerRef.current.remove();
      measureMarkerRef.current = null;
    }
    setMeasureState((prev) => ({
      status: "placing",
      radius: FIXED_MEASURE_RADIUS_METERS,
      count: 0,
      center: null,
      featureNames: [],
      layerCounts: {},
    }));
    toast.info(
      t("map.measure.placePrompt", {
        fallback: "Tap the map to place a new measurement point.",
      }),
    );
  }, [removeMeasurementArtifacts, restoreShelterLayers]);

  const showMarkerMenu = useCallback(() => {
    const m = map.current;
    if (!m || !measureState.center) return;

    if (!measurePopupRef.current) {
      measurePopupRef.current = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: 18,
        className: "measure-popup-wrapper",
      });
    }

    measurePopupRef.current
      .setLngLat([measureState.center.lng, measureState.center.lat])
      .setHTML(`
        <div class="measure-popup">
          <button type="button" data-action="move">${t("map.measure.popup.move", { fallback: "Move center" })}</button>
          <button type="button" data-action="delete" class="danger">${t("map.measure.popup.delete", { fallback: "Delete" })}</button>
        </div>
      `)
      .addTo(m);

    const popupEl = measurePopupRef.current.getElement();
    const bindAction = (selector: string, handler: () => void) => {
      const node = popupEl.querySelector(selector);
      if (!node) return;
      node.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();
          handler();
        },
        { once: true },
      );
    };

    bindAction('[data-action="move"]', () => {
      closeMeasurePopup();
      beginMoveCenter();
    });
    bindAction('[data-action="delete"]', () => {
      closeMeasurePopup();
      clearMeasurement();
    });
  }, [beginMoveCenter, clearMeasurement, closeMeasurePopup, measureState.center]);

  const placeMeasureMarker = useCallback(
    (lng: number, lat: number) => {
      const m = map.current;
      if (!m) return;

      if (!measureMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "measure-marker";
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          showMarkerMenu();
        });

        measureMarkerRef.current = new mapboxgl.Marker({
          element: el,
          draggable: true,
        })
          .setLngLat([lng, lat])
          .addTo(m);

        measureMarkerRef.current.on("dragstart", () => {
          closeMeasurePopup();
        });

        measureMarkerRef.current.on("dragend", () => {
          const updated = measureMarkerRef.current?.getLngLat();
          if (!updated) return;
          removeMeasurementArtifacts();
          restoreShelterLayers();
          setMeasureState((prev) => ({
            ...prev,
            status: "active",
            center: { lng: updated.lng, lat: updated.lat },
            radius: FIXED_MEASURE_RADIUS_METERS,
            count: 0,
            featureNames: [],
            layerCounts: {},
          }));
          updateCircle(
            { lng: updated.lng, lat: updated.lat },
            FIXED_MEASURE_RADIUS_METERS,
          );
        });
      }

      measureMarkerRef.current?.setLngLat([lng, lat]);
    },
    [
      closeMeasurePopup,
      removeMeasurementArtifacts,
      restoreShelterLayers,
      showMarkerMenu,
      updateCircle,
    ],
  );

  const selectShelterFromLocalData = useCallback(() => {
    if (hasSelectedShelter.current) {
      return;
    }

    (async () => {
      try {
        const allShelters = await getLocalShelters();
        const designated = allShelters.filter(
          (poi) => poi.category?.toLowerCase() === "designated ec",
        );

        const options: { id: string; name: string; lat?: number; lng?: number }[] = [];
        const seenNames = new Set<string>();
        const seenIds = new Set<string>();

        designated.forEach((poi) => {
          const name = poi.name?.trim();
          if (!name) return;
          const key = name.toLowerCase();
          if (seenNames.has(key)) return;
          seenNames.add(key);

          let resolvedId = poi.id ?? key;
          if (seenIds.has(resolvedId)) {
            let suffix = 1;
            while (seenIds.has(`${resolvedId}-${suffix}`)) {
              suffix += 1;
            }
            resolvedId = `${resolvedId}-${suffix}`;
          }
          seenIds.add(resolvedId);

          const hasCoords =
            Number.isFinite(poi.lat) && Number.isFinite(poi.lng);

          options.push({
            id: resolvedId,
            name,
            lat: hasCoords ? (poi.lat as number) : undefined,
            lng: hasCoords ? (poi.lng as number) : undefined,
          });
        });

        if (
          onShelterOptionsChange &&
          (options.length || !hasEmittedShelterOptions.current)
        ) {
          const sorted = [...options].sort((a, b) => a.name.localeCompare(b.name));
          onShelterOptionsChange(sorted);
          hasEmittedShelterOptions.current = true;
        }

        if (!options.length || !onSecretShelterChange) {
          return;
        }

        const chosen = options[Math.floor(Math.random() * options.length)];

        hasSelectedShelter.current = true;
        onSecretShelterChange({ id: chosen.id, name: chosen.name });
        map.current?.off("idle", selectShelterFromLocalData);
      } catch (error) {
        console.warn("[mapbox] Unable to select shelter from local data:", error);
      }
    })();
  }, [onSecretShelterChange, onShelterOptionsChange]);
  const [layersVisible, setLayersVisible] = useState({
    floods: true,
    shelters: true,
    schools: true,
    fireStations: true,
    hospitals: true,
    parks: true,
    libraries: true,
  });
  const [showLayerControl, setShowLayerControl] = useState(false);
  useEffect(() => {
    if (layerPanelCloseSignal !== undefined) {
      setShowLayerControl(false);
    }
  }, [layerPanelCloseSignal]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    hasEmittedShelterOptions.current = false;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAPBOX_STYLE_URL || basemapUrl,
        center: [playerLocation.lng, playerLocation.lat],
        zoom: 14,
        minZoom: defaultCityContext.mapConfig.minZoom ?? 10,
      });

      map.current.on("load", () => {
        console.log("Mapbox map loaded successfully!");
        setMapLoaded(true);
        // Add Koto layer sources and layers
        addKotoLayers();
        if (reapplyPlayerRangeRef.current) {
          reapplyPlayerRangeRef.current();
        }

        if (onSecretShelterChange) {
          hasSelectedShelter.current = false;
          map.current?.on("idle", selectShelterFromLocalData);
        }

        console.log("[POI] Initial marker render", { total: visiblePois.length });
        refreshFilteredPoiLayers(visiblePois);

        if (!geolocateControl.current) {
          ensureGeolocateStyle();
          ensureAttributionStyle();
          const control = new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: false },
            trackUserLocation: false,
            showUserHeading: true,
            showAccuracyCircle: false,
      });
      geolocateControl.current = control;
      map.current?.addControl(control, "bottom-right");

          const handleGeolocate = (event: GeolocationPosition) => {
            const { latitude, longitude } = event.coords;
            setUserCircleCenter({ lat: latitude, lng: longitude });
            setHasUserLocationFix(true);
          };
          geolocateHandlerRef.current = handleGeolocate;
          control.on("geolocate", handleGeolocate);

          // Trigger once after the control has fully attached
          window.setTimeout(() => {
            try {
              if ((control as any)?._map) {
                control.trigger();
              }
            } catch (error) {
              console.warn("[mapbox] Failed to trigger geolocate control:", error);
            }
          }, 50);
        }

        moveAttributionToBottomLeft();
        map.current?.on("styledata", () => {
          moveAttributionToBottomLeft();
          const reapply = reapplyPlayerRangeRef.current;
          const mInner = map.current;
          if (!reapply || !mInner) return;
          const hasRangeSource = (() => {
            try {
              return Boolean(mInner.getSource(PLAYER_RANGE_SOURCE_ID));
            } catch {
              return false;
            }
          })();
          if (hasRangeSource) return;
          if (mInner.isStyleLoaded()) {
            reapply();
          } else {
            mInner.once("idle", () => reapply());
          }
        });
      });

      console.log("Mapbox map created successfully");
    } catch (error) {
      console.error("Error initializing Mapbox:", error);
    }

    return () => {
      if (map.current) {
        if ((map.current as any)?.__kotoPopupHandler) {
          map.current.off(
            "click",
            (map.current as any).__kotoPopupHandler,
          );
          (map.current as any).__kotoPopupHandler = null;
        }
        if (infoPopup.current) {
          infoPopup.current.remove();
          infoPopup.current = null;
        }
        if (onSecretShelterChange) {
          map.current.off("idle", selectShelterFromLocalData);
        }
        if (geolocateControl.current) {
          if (geolocateHandlerRef.current) {
            geolocateControl.current.off("geolocate", geolocateHandlerRef.current);
            geolocateHandlerRef.current = null;
          }
          map.current.removeControl(geolocateControl.current);
          geolocateControl.current = null;
        }
        if (filteredPoiPopupHandlerRef.current) {
          map.current?.off("click", FILTER_POIS_LAYER_ID, filteredPoiPopupHandlerRef.current);
          filteredPoiPopupHandlerRef.current = null;
        }
        if (pendingPoiRefreshHandlerRef.current) {
          map.current.off("idle", pendingPoiRefreshHandlerRef.current);
          pendingPoiRefreshHandlerRef.current = null;
        }
        map.current?.off("styledata", moveAttributionToBottomLeft);
        map.current.remove();
        map.current = null;
        hasSelectedShelter.current = false;
        hasEmittedShelterOptions.current = false;
        setMapLoaded(false);
      }
    };
  }, []);

  // Recenter camera when playerLocation changes (no reinit)
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    // cheap, no-flash update; use easeTo if you want animation
    m.jumpTo({ center: [playerLocation.lng, playerLocation.lat] });
    // or: m.easeTo({ center: [playerLocation.lng, playerLocation.lat], duration: 350 });
    const isDefaultStart =
      Math.abs(playerLocation.lat - DEFAULT_START_LOCATION.lat) < 1e-6 &&
      Math.abs(playerLocation.lng - DEFAULT_START_LOCATION.lng) < 1e-6;

    if (isDefaultStart && !hasUserLocationFix) {
      return;
    }

    setUserCircleCenter({ lat: playerLocation.lat, lng: playerLocation.lng });
    if (!isDefaultStart) {
      setHasUserLocationFix(true);
    }
  }, [playerLocation.lng, playerLocation.lat, hasUserLocationFix]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const applyRange = () => {
      if (!userCircleCenter) return;
      // Style can briefly be undefined during reloads; skip until ready
      // @ts-expect-error: mapbox private style access
      if (!(m as any)?.style) return;
      const feature = createCircleFeature(userCircleCenter, PLAYER_RADIUS_METERS, 96);

      const existingSource = (() => {
        try {
          return m.getSource(PLAYER_RANGE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
        } catch {
          return undefined;
        }
      })();

      if (existingSource) {
        existingSource.setData(feature as any);
        return;
      }

      try {
        m.addSource(PLAYER_RANGE_SOURCE_ID, {
          type: "geojson",
          data: feature as any,
        });
        m.addLayer({
          id: PLAYER_RANGE_FILL_LAYER_ID,
          type: "fill",
          source: PLAYER_RANGE_SOURCE_ID,
          paint: {
            "fill-color": "#4da3ff",
            "fill-opacity": 0.12,
          },
        });
        m.addLayer({
          id: PLAYER_RANGE_OUTLINE_LAYER_ID,
          type: "line",
          source: PLAYER_RANGE_SOURCE_ID,
          paint: {
            "line-color": "#4da3ff",
            "line-width": 2,
            "line-dasharray": [2, 2],
          },
        });
      } catch (error) {
        console.warn("[Map] Failed to draw player range", error);
      }
    };

    reapplyPlayerRangeRef.current = applyRange;

    if (!m.isStyleLoaded()) {
      m.once("load", applyRange);
      return;
    }

    applyRange();
  }, [userCircleCenter?.lat, userCircleCenter?.lng]);

  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    if (!amenityQueryTrigger) return;
    // Only run when explicitly triggered (e.g., opening Questions panel)
    void updateNearbyAmenityCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amenityQueryTrigger, mapLoaded]);

  useEffect(() => {
    const hasCenter =
      gameMode === "lightning" &&
      lightningCenter &&
      Number.isFinite(lightningCenter.lat) &&
      Number.isFinite(lightningCenter.lng);
    const hasRadius = Number.isFinite(lightningRadiusKm);

    if (hasCenter && hasRadius) {
      lastLightningParamsRef.current = {
        center: { lat: lightningCenter!.lat, lng: lightningCenter!.lng },
        radiusKm: lightningRadiusKm as number,
      };
    }
  }, [gameMode, lightningCenter?.lat, lightningCenter?.lng, lightningRadiusKm]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const removeLightningCircle = () => {
      if (!map.current || m !== map.current) return;
      if (m.getLayer(LIGHTNING_RANGE_FILL_LAYER_ID)) m.removeLayer(LIGHTNING_RANGE_FILL_LAYER_ID);
      if (m.getLayer(LIGHTNING_RANGE_OUTLINE_LAYER_ID))
        m.removeLayer(LIGHTNING_RANGE_OUTLINE_LAYER_ID);
      if (m.getSource(LIGHTNING_RANGE_SOURCE_ID)) m.removeSource(LIGHTNING_RANGE_SOURCE_ID);
    };

    if (gameMode !== "lightning") {
      removeLightningCircle();
      return;
    }

    const applyLightningCircle = () => {
      if (!map.current || m !== map.current) return;
      const params = lastLightningParamsRef.current;
      if (!params) return;
      const styleLoaded =
        typeof m.isStyleLoaded === "function" ? m.isStyleLoaded() : true;
      if (!styleLoaded && !mapLoaded) {
        console.info("[Lightning] Style not loaded yet, waiting for load");
        return;
      }
      const feature = createCircleFeature(
        params.center,
        Math.max(0, (params.radiusKm ?? 2) * 1000),
        128,
      );

      if (m.getSource(LIGHTNING_RANGE_SOURCE_ID)) {
        (m.getSource(LIGHTNING_RANGE_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(
          feature as any,
        );
        if (m.getLayer(LIGHTNING_RANGE_FILL_LAYER_ID)) {
          m.removeLayer(LIGHTNING_RANGE_FILL_LAYER_ID);
        }
      } else {
        m.addSource(LIGHTNING_RANGE_SOURCE_ID, { type: "geojson", data: feature as any });
      }

      if (!m.getLayer(LIGHTNING_RANGE_OUTLINE_LAYER_ID)) {
        m.addLayer({
          id: LIGHTNING_RANGE_OUTLINE_LAYER_ID,
          type: "line",
          source: LIGHTNING_RANGE_SOURCE_ID,
          paint: {
            "line-color": "rgba(239, 68, 68, 0.7)",
            "line-width": 2,
            "line-dasharray": [3, 2, 0.5, 2],
          },
        });
      }
    };

    const bindStyleData = () => {
      const handleStyleData = () => {
        if (gameMode !== "lightning") {
          removeLightningCircle();
          return;
        }
        applyLightningCircle();
      };
      m.on("styledata", handleStyleData);
      return () => m.off("styledata", handleStyleData);
    };

    if (!mapLoaded || (typeof m.isStyleLoaded === "function" && !m.isStyleLoaded())) {
      const loadHandler = () => {
        applyLightningCircle();
        m.off("load", loadHandler);
      };
      m.on("load", loadHandler);
      const cleanupStyle = bindStyleData();
      return () => {
        m.off("load", loadHandler);
        cleanupStyle();
        removeLightningCircle();
      };
    }

    applyLightningCircle();
    const cleanupStyle = bindStyleData();

    return () => {
      cleanupStyle();
      removeLightningCircle();
    };
  }, [gameMode, lightningCenter?.lat, lightningCenter?.lng, lightningRadiusKm, mapLoaded]);

  useEffect(() => {
    measureStatusRef.current = measureState.status;
  }, [measureState.status]);

  useEffect(() => {
    onMeasurementActiveChange?.(measureState.status !== "idle");
  }, [measureState.status, onMeasurementActiveChange]);

  useEffect(() => {
    if (measureTrigger == null) return;
    if (measureTrigger === lastMeasureTriggerRef.current) return;
    lastMeasureTriggerRef.current = measureTrigger;

    if (!map.current) return;

    removeMeasurementArtifacts();
    restoreShelterLayers();
    if (measureMarkerRef.current) {
      measureMarkerRef.current.remove();
      measureMarkerRef.current = null;
    }
    setMeasureState({
      status: "placing",
      radius: 250,
      count: 0,
      center: null,
      featureNames: [],
      layerCounts: {},
    });
    toast.info(
      t("map.measure.dropPrompt", {
        fallback: "Tap the map to drop a measurement point.",
      }),
    );
  }, [
    measureTrigger,
    removeMeasurementArtifacts,
    restoreShelterLayers,
  ]);

  useEffect(() => {
    if (!map.current) return;
    console.log("[POI] Updating filtered markers", { total: visiblePois.length });
    refreshFilteredPoiLayers(visiblePois);
  }, [refreshFilteredPoiLayers, visiblePois]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!isFiltered) return;
    if (!visiblePois.length) return;

    const bounds = new mapboxgl.LngLatBounds();
    visiblePois.forEach((poi) => {
      if (Number.isFinite(poi.lng) && Number.isFinite(poi.lat)) {
        bounds.extend([poi.lng, poi.lat]);
      }
    });

    if (!bounds.isEmpty()) {
      console.log("[POI] Fitting map to filtered bounds", {
        count: visiblePois.length,
        bounds: bounds.toArray(),
      });
      m.fitBounds(bounds, { padding: 40, maxZoom: 16 });
    }
  }, [isFiltered, visiblePois]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const handleMapClick = (
      event: mapboxgl.MapMouseEvent & mapboxgl.EventData,
    ) => {
      if (measureStatusRef.current !== "placing") {
        return;
      }

      const { lng, lat } = event.lngLat;
      placeMeasureMarker(lng, lat);
      setMeasureState((prev) => ({
        ...prev,
        status: "active",
        center: { lng, lat },
        radius: FIXED_MEASURE_RADIUS_METERS,
        count: 0,
        featureNames: [],
        layerCounts: {},
      }));
      updateCircle({ lng, lat }, FIXED_MEASURE_RADIUS_METERS);
    };

    m.on("click", handleMapClick);

    return () => {
      m.off("click", handleMapClick);
    };
  }, [placeMeasureMarker, updateCircle]);


  // Handle location picker mode (minimal changes, adds console log)
  // Temporarily disable POI markers and player markers for debugging

  const toggleLayer = (layer: keyof typeof layersVisible) => {
    setLayersVisible((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const clearAllLayers = () => {
    if (!map.current) return;

    const updated: Record<string, boolean> = {};

    kotoLayers.forEach((layer) => {
      const layerId = `koto-layer-${layer.id}`;
      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(layerId, "visibility", "none");
      }
      updated[layer.label] = false;
    });

    setKotoLayersVisible(updated);
  };

  // Add Koto layers to the map
  const addKotoLayers = () => {
    const m = map.current;
    if (!m) return;

    // If style not ready, bind a one-time load and retry once.
    if (!m.isStyleLoaded && (m as any)._style === undefined) {
      m.once("load", () => addKotoLayers());
      return;
    }
    if (m.isStyleLoaded && !m.isStyleLoaded()) {
      m.once("load", () => addKotoLayers());
      return;
    }

    try {
      const sortedKotoLayers = [...kotoLayers].sort((a, b) => {
        if (a.layerType === b.layerType) return 0;
        if (a.layerType === "fill" && b.layerType !== "fill") return -1;
        if (a.layerType !== "fill" && b.layerType === "fill") return 1;
        return 0;
      });

      const expectedLayerIds = new Set(
        sortedKotoLayers.map((layer) => `koto-layer-${layer.id}`),
      );
      const expectedSourceIds = new Set(
        sortedKotoLayers.map((layer) => `koto-source-${layer.sourceData.layerId}`),
      );

      // Remove stale Koto layers/sources from previous configs
      const styleLayers = m.getStyle()?.layers ?? [];
      styleLayers
        .map((layer) => layer.id)
        .filter(
          (id) => id.startsWith("koto-layer-") && !expectedLayerIds.has(id),
        )
        .forEach((staleId) => {
          if (m.getLayer(staleId)) {
            m.removeLayer(staleId);
          }
        });

      Object.keys(m.getStyle()?.sources ?? {})
        .filter(
          (id) => id.startsWith("koto-source-") && !expectedSourceIds.has(id),
        )
        .forEach((staleSourceId) => {
          if (m.getSource(staleSourceId)) {
            m.removeSource(staleSourceId);
          }
        });

      // Registry to avoid duplicate event bindings across calls
      const boundLayers: Set<string> =
        (m as any).__kotoBoundLayers || ((m as any).__kotoBoundLayers = new Set());

      // Track sources we add in this call to avoid re-adding
      const addedSources = new Set<string>();
      const layerMetaRegistry: Record<
        string,
        {
          template?: string;
          label: string;
          layerNumericId?: number;
          legendItems?: (typeof kotoLayers)[number]["metadata"]["legendItems"];
        }
      > = ((m as any).__kotoLayerMeta = {});

      // Render {{ token }} with props[key]; unknown -> em dash
      const renderTemplate = (template: string, props: Record<string, any>) => {
        return template.replace(/{{\s*([^}]+?)\s*}}/g, (_match, rawKey) => {
          const key = String(rawKey).trim();

          if (key.startsWith("t:")) {
            const translationKey = key.slice(2);
            const translate = translateRef.current;
            const localized =
              typeof translate === "function"
                ? translate(translationKey, { fallback: translationKey })
                : translationKey;
            return escapeHtml(localized);
          }

          if (key.startsWith("locale:")) {
            const choices = key.slice("locale:".length).split("|").map((part) => part.trim()).filter(Boolean);
            const [enKey, jaKey] = choices;
            const currentLocale = localeRef.current;
            const chosenKey = currentLocale === "ja" ? jaKey ?? enKey : enKey ?? jaKey;
            if (chosenKey) {
              const val = props?.[chosenKey];
              return val == null || val === "" ? "—" : escapeHtml(String(val));
            }
            return "—";
          }

          const val = props?.[key];
          return val == null || val === "" ? "—" : escapeHtml(String(val));
        });
      };

      sortedKotoLayers.forEach((layer) => {
        const sourceId = `koto-source-${layer.sourceData.layerId}`;
        const layerId = `koto-layer-${layer.id}`;

        // Add source if needed (vector or geojson)
        if (!addedSources.has(sourceId) && !m.getSource(sourceId)) {
          if (layer.sourceType === "geojson") {
            const data = layer.sourceData.geojsonUrl;
            if (!data) {
              console.warn(`[koto] Missing geojsonUrl for layer ${layer.label}`);
            } else {
              m.addSource(sourceId, { type: "geojson", data });
              addedSources.add(sourceId);
            }
          } else {
            const tilesetUrl = getTilesetUrl(layer.sourceData.layerId);
            m.addSource(sourceId, { type: "vector", url: tilesetUrl });
            addedSources.add(sourceId);
            // console.debug(`[koto] add source: ${sourceId} -> ${tilesetUrl}`);
          }
        }

        // Add style layer if missing
        if (!m.getLayer(layerId)) {
          const layerConfig: any = {
            id: layerId,
            type: layer.layerType,
            source: sourceId,
            layout: (() => {
              const layout = {
                ...layer.style.layout,
                visibility: layer.metadata.loadOnInit ? "visible" : "none",
              } as Record<string, unknown>;
              if (layout["icon-allow-overlap"] === true) {
                layout["icon-ignore-placement"] = true;
              }
              return layout;
            })(),
            paint: layer.style.paint,
          };
          if (layer.style.layout?.["text-field"]) {
            const baseTextField = layer.style.layout["text-field"];
            const cloneFn = (globalThis as any).structuredClone as
              | (<T>(value: T) => T)
              | undefined;
            const cloned = cloneFn
              ? cloneFn(baseTextField)
              : JSON.parse(JSON.stringify(baseTextField));
            layerConfig.layout["text-field"] = localizeTextFieldExpression(
              cloned,
              localeRef.current,
            );
          }
          if (layer.sourceType === "vector" && layer.sourceData.layerName) {
            layerConfig["source-layer"] = layer.sourceData.layerName;
          }
          if (layer.style.filter) layerConfig.filter = layer.style.filter;

          m.addLayer(layerConfig);
          // console.debug(`[koto] add layer: ${layerId}`);
        }

        const template = layer.metadata?.query?.template;
        if (template) {
          layerMetaRegistry[layerId] = {
            template,
            label: layer.label,
            layerNumericId: layer.id,
            legendItems: layer.metadata?.legendItems,
          };
        } else {
          delete layerMetaRegistry[layerId];
        }

        // Bind cursor only once per style layer id
        if (!boundLayers.has(layerId)) {
          if (template) {
            m.on("mouseenter", layerId, () => {
              m.getCanvas().style.cursor = "pointer";
            });
            m.on("mouseleave", layerId, () => {
              m.getCanvas().style.cursor = "";
            });
          }

          boundLayers.add(layerId);
        }
      });

      const previousPopupHandler = (m as any).__kotoPopupHandler;
      if (previousPopupHandler) {
        m.off("click", previousPopupHandler);
      }

      const handleCombinedClick = (
        e: mapboxgl.MapMouseEvent & mapboxgl.EventData,
      ) => {
        if (measureStatusRef.current !== "idle") {
          return;
        }

        const layerIds = Object.keys(layerMetaRegistry).filter(
          (id) => layerMetaRegistry[id]?.template && m.getLayer(id),
        );

        if (!layerIds.length) {
          return;
        }

        const features = m.queryRenderedFeatures(e.point, {
          layers: layerIds,
        });

        if (!features.length) {
          if (infoPopup.current) {
            infoPopup.current.remove();
            infoPopup.current = null;
          }
          return;
        }

        const sections = features
          .map((feature) => {
            const mapLayerId = feature.layer?.id;
            if (!mapLayerId) return null;
            const meta = layerMetaRegistry[mapLayerId];
            if (!meta?.template) return null;

            const legend = meta.legendItems?.[0];
            const labelKey =
              legend?.labelKey ??
              (meta.layerNumericId
                ? `map.layers.items.${meta.layerNumericId}`
                : undefined);
            const descriptionKey =
              legend?.descriptionKey ??
              (meta.layerNumericId
                ? `map.layers.descriptions.${meta.layerNumericId}`
                : undefined);
            const headerLabel = labelKey
              ? t(labelKey, {
                  fallback: legend?.label ?? meta.label,
                })
              : legend?.label ?? meta.label;
            const description = descriptionKey
              ? t(descriptionKey, { fallback: legend?.description ?? "" })
              : legend?.description ?? "";

            const headerHtml = `
              <div style="padding: 12px;">
                <div style="font-weight:700; margin-bottom:6px; font-size:14px;">
                  ${escapeHtml(headerLabel)}
                </div>
                ${
                  description
                    ? `<div style="opacity:0.9; font-size:12px; margin-bottom:8px;">${escapeHtml(description)}</div>`
                    : ""
                }
                <div style="font-size:12px;">
            `;
            const bodyHtml = renderTemplate(
              meta.template,
              feature.properties || {},
            );
            const footerHtml = `</div></div>`;
            return headerHtml + bodyHtml + footerHtml;
          })
          .filter((section): section is string => Boolean(section));

        if (!sections.length) {
          if (infoPopup.current) {
            infoPopup.current.remove();
            infoPopup.current = null;
          }
          return;
        }

        const combinedHtml = `
          <div style="background: rgba(0,0,0,0.85); border-radius: 8px; min-width: 220px; color: #fff;">
            ${sections.join(
              `<div style="height:1px; background: rgba(255,255,255,0.2); margin: 0 12px;"></div>`,
            )}
          </div>
        `;

        if (!infoPopup.current) {
          infoPopup.current = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
          });
        }

        infoPopup.current.setLngLat(e.lngLat).setHTML(combinedHtml).addTo(m);
      };

      (m as any).__kotoPopupHandler = handleCombinedClick;
      m.on("click", handleCombinedClick);

      // console.info("[koto] layers initialized");
    } catch (error) {
      console.warn("[koto] Could not add layers - check tilesets/source-layer names:", error);
    }
  };


  // Toggle Koto layer visibility
  const toggleKotoLayer = (label: string) => {
    if (!map.current) return;

    const layer = kotoLayers.find((l) => l.label === label);
    if (!layer) return;

    const layerId = `koto-layer-${layer.id}`;
    const newVisibility = !kotoLayersVisible[label];

    if (map.current.getLayer(layerId)) {
      map.current.setLayoutProperty(
        layerId,
        "visibility",
        newVisibility ? "visible" : "none",
      );

      setKotoLayersVisible((prev) => ({
        ...prev,
        [label]: newVisibility,
      }));
    }
  };

  const handleLayerControlToggle = useCallback(
    (desiredState?: boolean) => {
      const targetState =
        typeof desiredState === "boolean" ? desiredState : !showLayerControl;

      if (targetState && measureState.status !== "idle") {
        const shouldCloseOthers = window.confirm(
          "Another panel is open. Close it and open Map Layers?",
        );
        if (!shouldCloseOthers) return;
        clearMeasurement();
      }

      setShowLayerControl(targetState);
      onLayerPanelToggle?.(targetState);
    },
    [clearMeasurement, measureState.status, onLayerPanelToggle, showLayerControl],
  );

  const toggleLayerGroupOpen = (group: KotoLayerGroup) => {
    setLayerGroupOpenState((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const groupedKotoLayers = KOTO_LAYER_GROUPS.map((group) => ({
    group,
    layers: kotoLayers.filter((layer) => layer.group === group),
  })).filter(({ layers }) => layers.length > 0);
  const translateGroup = (group: KotoLayerGroup) =>
    t(`map.layers.groups.${group}`, { fallback: group });
  const translateLayerLabel = (layerId: number, label: string) =>
    t(`map.layers.items.${layerId}`, { fallback: label });

  const anyLayerActive = Object.values(kotoLayersVisible).some(Boolean);
  const isPanelCollapsed =
    measureState.status === "active" && isMeasurePanelCollapsed;

  const handleMoveMeasurementPoint = useCallback(() => {
    closeMeasurePopup();
    beginMoveCenter();
  }, [beginMoveCenter, closeMeasurePopup]);

  const handleDeleteMeasurement = useCallback(() => {
    closeMeasurePopup();
    clearMeasurement();
  }, [clearMeasurement, closeMeasurePopup]);

  const moveAttributionToBottomLeft = useCallback(() => {
    const m = map.current;
    if (!m) return;
    const container = m.getContainer()?.querySelector(".mapboxgl-control-container");
    if (!container) return;
    const attrib = container.querySelector(".mapboxgl-ctrl-attrib") as HTMLElement | null;
    if (!attrib) return;
    let bottomLeft = container.querySelector(".mapboxgl-ctrl-bottom-left") as HTMLElement | null;
    if (!bottomLeft) {
      bottomLeft = document.createElement("div");
      bottomLeft.className = "mapboxgl-ctrl-bottom-left";
      container.appendChild(bottomLeft);
    }
    if (attrib.parentElement !== bottomLeft) {
      bottomLeft.appendChild(attrib);
    }
  }, []);

  const ensureGeolocateStyle = useCallback(() => {
    if (typeof document === "undefined") return;
    const style =
      (document.getElementById(GEOLOCATE_STYLE_ID) as HTMLStyleElement | null) ||
      document.createElement("style");
    style.id = GEOLOCATE_STYLE_ID;
    style.textContent = `
      .mapboxgl-ctrl-bottom-right {
        bottom: 65px !important;
        right: 6px !important;
      }
      .mapboxgl-ctrl-bottom-right .mapboxgl-ctrl-group {
        border-radius: 9999px !important;
        overflow: hidden !important;
        border: none !important;
        margin: 0 !important;
      }
      .mapboxgl-ctrl-geolocate {
        width: 44px !important;
        height: 44px !important;
        border-radius: 9999px !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      .mapboxgl-ctrl-geolocate .mapboxgl-ctrl-icon {
        width: 44px !important;
        height: 44px !important;
        border-radius: 9999px !important;
        background-position: center !important;
        background-size: 50% 50% !important;
        margin: 0 !important;
      }
      .mapboxgl-ctrl-geolocate svg {
        display: none !important;
      }
    `;
    if (!style.parentElement) {
      document.head.appendChild(style);
    }
  }, []);

  const ensureAttributionStyle = useCallback(() => {
    if (typeof document === "undefined") return;
    const style =
      (document.getElementById(ATTRIBUTION_STYLE_ID) as HTMLStyleElement | null) ||
      document.createElement("style");
    style.id = ATTRIBUTION_STYLE_ID;
    style.textContent = `
      .mapboxgl-ctrl-attrib.mapboxgl-ctrl,
      .mapboxgl-ctrl-bottom-left .mapboxgl-ctrl-attrib,
      .mapboxgl-ctrl-bottom-right .mapboxgl-ctrl-attrib {
        position: absolute !important;
        left: 5px !important;
        right: auto !important;
        bottom: 65px !important;
        margin: 0 !important;
        white-space: nowrap !important;
        display: inline-flex !important;
        flex-wrap: nowrap !important;
      }
    `;
    if (!style.parentElement) {
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="relative w-full h-full min-h-[500px] z-0">
      
      <div
        ref={mapContainer}
        className="absolute inset-0 z-0"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Add CSS animations */}
      <style>{`
        .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .mapboxgl-popup-tip {
          display: none;
        }
        .measure-marker {
          width: 20px;
          height: 20px;
          border: 3px solid #c1272d;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 0 2px #000000;
          position: relative;
        }
        .measure-marker::after {
          content: "";
          position: absolute;
          inset: 4px;
          background: #c1272d;
          border-radius: 50%;
          opacity: 0.85;
        }
        .measure-popup {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: #ffffff;
          color: #0f0f0f;
          border: 1px solid #0f0f0f;
          border-radius: 8px;
          padding: 10px;
          min-width: 160px;
          font-family: 'Noto Sans', sans-serif;
        }
        .measure-popup button {
          border: 1px solid #0f0f0f;
          background: #f5f5f5;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 8px;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .measure-popup button:hover {
          background: #e2e2e2;
        }
        .measure-popup button.danger {
          background: #0f0f0f;
          color: #ffffff;
          border-color: #000000;
        }
        .measure-popup button.danger:hover {
          background: #1a1a1a;
        }
      `}</style>

      {/* Layer Control Button */}
      <motion.button
        onClick={() => handleLayerControlToggle()}
        className="absolute top-4 left-4 z-10 rounded-full border border-neutral-900 bg-background p-3 text-neutral-900 shadow-sm transition-colors hover:bg-neutral-100 cursor-pointer"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Layers className="w-5 h-5 text-black" />
      </motion.button>

       {/* Koto Layer Control Panel */}
      <AnimatePresence>
        {showLayerControl && (
          <motion.div
            className="absolute top-16 left-4 z-10 w-[300px] max-w-[90vw] min-w-[220px] space-y-3 rounded-lg border border-black bg-background p-4 shadow-lg"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{
              width: "300px",
              minWidth: "220px",
              maxWidth: "90vw",
              marginTop: "10px",
              maxHeight: "min(80vh, 320px)",
              overflowY: "auto",
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase text-black">
                {t("map.layers.title", { fallback: "Map Layers" })}
              </span>
              <button
                type="button"
                onClick={clearAllLayers}
                disabled={!anyLayerActive}
                className="rounded border border-black bg-background px-3 py-1 text-xs font-semibold uppercase text-black transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-200 disabled:text-neutral-500"
              >
                {t("map.layers.clearAll", { fallback: "Clear All" })}
              </button>
            </div>

            <div className="space-y-2">
              {groupedKotoLayers.map(({ group, layers }) => (
                <div
                  key={group}
                  className="rounded-md bg-white"
                >
                  <button
                    type="button"
                    onClick={() => toggleLayerGroupOpen(group)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-black"
                  >
                    <span>{translateGroup(group)}</span>
                    <span className="text-lg leading-none">
                      {layerGroupOpenState[group] ? "-" : "+"}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {layerGroupOpenState[group] && (
                      <motion.div
                        key={`${group}-content`}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-1 border-t border-neutral-200 px-2 py-2"
                      >
                        {layers.map((layer) => (
                          <LayerToggle
                            key={layer.id}
                            label={translateLayerLabel(layer.id, layer.label)}
                            icon={getKotoLayerIcon(layer)}
                            checked={kotoLayersVisible[layer.label]}
                            onChange={() => toggleKotoLayer(layer.label)}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

{/* Map Legend */}
      <AnimatePresence>
        {showLayerControl ? (
          <motion.div
            className="absolute bottom-20 left-4 z-10 max-h-[60vh] space-y-2 overflow-y-auto rounded-lg border border-black bg-background p-3 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase text-black">Layer Legend</span>
              <button
                onClick={() => handleLayerControlToggle(false)}
                className="text-black transition-colors hover:text-red-600"
                aria-label="Close legend"
              >
                ✕
              </button>
            </div>
            <div className="my-2 flex items-center gap-2 text-xs text-black">
              <div className="h-3 w-3 rounded-full bg-black" />
              <span>Your Location</span>
            </div>
            <div className="my-2 border-t border-black"></div>

            {kotoLayers.map((layer, layerIndex) => (
              <div key={layer.id}>
                {layer.metadata.legendItems.map((legendItem, itemIndex) => {
                  const swatchColor =
                    legendItem.swatchStyle.strokeColor ||
                    legendItem.swatchStyle.fillColor ||
                    "#000";
                  const swatchClasses =
                    legendItem.swatchType === "symbol" ||
                    legendItem.swatchType === "line"
                      ? "rounded-full"
                      : "rounded";

                  return (
                    <div
                      key={`${layer.id}-${itemIndex}`}
                      className="mb-2 flex items-center gap-2 text-xs text-black"
                    >
                      <div
                        className={`h-3 w-3 ${swatchClasses}`}
                        style={{ backgroundColor: swatchColor }}
                      />
                      <span>{legendItem.label}</span>
                    </div>
                  );
                })}
                {layerIndex < kotoLayers.length - 1 && (
                  <div className="my-2 border-t border-neutral-300"></div>
                )}
              </div>
            ))}

            <div className="mt-3 text-xs text-black/70">
              Note: Actual layer data requires Mapbox tileset configuration
            </div>
          </motion.div>
        ) : (
          <motion.button
            onClick={() => handleLayerControlToggle(true)}
            className="absolute bottom-20 left-4 z-10 rounded-full border border-black bg-background px-4 py-2 text-sm font-semibold uppercase text-black shadow-sm transition-colors hover:bg-neutral-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            Legend
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {measureState.status !== "idle" && (
          <MeasurePanel
            measureState={measureState}
            isPanelCollapsed={isPanelCollapsed}
            onToggleCollapse={() => setIsMeasurePanelCollapsed((prev) => !prev)}
            onMovePoint={handleMoveMeasurementPoint}
            onDeleteMeasurement={handleDeleteMeasurement}
            onCancelPlacement={clearMeasurement}
            t={t}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

function LayerToggle({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer rounded px-2 py-1 transition-colors hover:bg-neutral-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-black border border-black"
      />
      {icon}
      <span className="text-sm text-black">{label}</span>
    </label>
  );
}
