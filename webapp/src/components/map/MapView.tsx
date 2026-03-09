import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import {
  MapPin,
  Home,
  Hospital,
  Heart,
  Building2,
  Cable,
  Train,
  Droplet,
  Archive,
} from "lucide-react";
import { POI } from "@/types/game";
import { deployedCity, deployedCityContext, deployedCityLayers } from "@/cityContext/deployedCity";
import {
  cityNearbyQuestionConfig,
  cityAmenityCategoryMap,
  cityPoiTypeByQuestionId,
  getCityPoiTypeLabel,
  isDesignatedShelterCategory,
  resolveCityAmenityQuestionId,
} from "@/cityContext/gameplayConfig";
import { MAPBOX_CONFIG } from "@/config/mapbox";
import { MAPBOX_STYLE_URL, PROXIMITY_RADIUS_KM } from "@/config/runtime";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getLocalShelters } from "@/services/mapLayerQueryService";
import { countAmenitiesWithinRadius } from "@/services/proximityIndex";
import { useTerrainElevation } from "@/features/elevation/hooks/useTerrainElevation";
import { useMeasurementTool } from "@/features/measurement/hooks/useMeasurementTool";
import { cityLayerGroups, type CityLayerGroup, useCityLayers } from "@/features/map/layers/useCityLayers";
import {
  buildPopupBodyHtml,
  buildPopupCardHtml,
  buildPopupSectionHtml,
} from "@/features/map/popups/popupHtml";
import { useI18n } from "@/i18n";
import { MeasurePanel } from "@/components/map/MeasurePanel";
import { MapLayerPanel } from "@/components/map/MapLayerPanel";

/**
 * MapView is the runtime map container for gameplay.
 * Responsibilities:
 * - initialize and own the Mapbox instance lifecycle
 * - coordinate feature hooks (city layers, measurement, terrain/elevation)
 * - render dynamic overlays (player range, lightning range, filtered POIs)
 * - emit gameplay-facing callbacks (amenity counts, shelter selection, elevation samples)
 */

// Set Mapbox access token from runtime config.
mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;

// Normalize fallback icon color values from layer metadata.
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
  // Approximate a geodesic circle polygon in WGS84 for Mapbox sources.
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

// Resolve a map-layer icon from known labels, with a colorized fallback pin.
const getCityLayerIcon = (layer: (typeof deployedCityLayers)[0]): React.ReactNode => {
  const icon = LAYER_ICON_BY_LABEL[layer.label];
  if (icon) return icon;

  const rawColor =
    layer.metadata?.legendItems?.[0]?.swatchStyle.strokeColor ||
    layer.metadata?.legendItems?.[0]?.swatchStyle.fillColor ||
    "#000000";

  const color = sanitizeToBauhausColor(rawColor);
  return <MapPin className="w-4 h-4" style={{ color }} />;
};

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
const CITY_LAYER_PREFIX = `city-layer-${deployedCity.id}-`;
const DEFAULT_START_LOCATION = deployedCityContext.mapConfig.startLocation;

const PLAYER_RADIUS_METERS = Math.max(1, PROXIMITY_RADIUS_KM * 1000);

interface MapViewProps {
  // Base POI data + player state.
  pois: POI[];
  playerLocation: { lat: number; lng: number };
  onPlayerLocationChange?: (location: { lat: number; lng: number }) => void;
  visitedPOIs: string[];
  gameEnded?: boolean;
  onPOIClick?: (poi: POI) => void;

  // Basemap and shelter callbacks.
  basemapUrl?: string;
  onSecretShelterChange?: (info: { id: string; name: string }) => void;
  onShelterOptionsChange?: (options: { id: string; name: string; lat?: number; lng?: number }[]) => void;

  // Measurement + layer panel coordination.
  measureTrigger?: number;
  onMeasurementActiveChange?: (active: boolean) => void;
  isFiltered?: boolean;
  onLayerPanelToggle?: (open: boolean) => void;
  layerPanelOpenSignal?: number;
  layerPanelCloseSignal?: number;

  // Mode-specific overlays.
  gameMode?: "lightning" | "citywide" | null;
  lightningCenter?: { lat: number; lng: number } | null;
  lightningRadiusKm?: number;
  otherPlayerLocations?: {
    userId: string;
    name: string;
    lat: number;
    lng: number;
    isStale: boolean;
  }[];

  // Derived gameplay telemetry.
  onAmenitiesWithinRadius?: (info: { counts: Record<string, number>; matchedCategories: string[] }) => void;
  amenityQueryTrigger?: number;
  secretShelterCoords?: { lat: number; lng: number } | null;
  onElevationSample?: (info: {
    playerElevationMeters: number | null;
    shelterElevationMeters: number | null;
  }) => void;
  elevationSampleTrigger?: number;
}

export function MapView({
  pois,
  playerLocation,
  onPlayerLocationChange,
  visitedPOIs,
  gameEnded,
  onPOIClick,
  basemapUrl = deployedCity.mapStyle.styleUrl || deployedCityContext.mapConfig.basemapUrl,
  onSecretShelterChange,
  onShelterOptionsChange,
  measureTrigger,
  onMeasurementActiveChange,
  isFiltered = false,
  onLayerPanelToggle,
  layerPanelOpenSignal,
  layerPanelCloseSignal,
  gameMode,
  lightningCenter,
  lightningRadiusKm = 2,
  otherPlayerLocations = [],
  onAmenitiesWithinRadius,
  amenityQueryTrigger,
  secretShelterCoords,
  onElevationSample,
  elevationSampleTrigger = 0,
}: MapViewProps) {
  const { t, locale } = useI18n();
  const translateRef = useRef(t);
  const localeRef = useRef(locale);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geolocateControl = useRef<mapboxgl.GeolocateControl | null>(null);
  const infoPopup = useRef<mapboxgl.Popup | null>(null);
  const otherPlayerMarkersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const hasSelectedShelter = useRef(false);
  const hasEmittedShelterOptions = useRef(false);
  const pendingPoiRefreshRef = useRef<POI[] | null>(null);
  const pendingPoiRefreshHandlerRef = useRef<(() => void) | null>(null);
  const filteredPoiPopupHandlerRef = useRef<
    ((event: mapboxgl.MapLayerMouseEvent & mapboxgl.EventData) => void) | null
  >(null);
  const geolocateHandlerRef = useRef<((event: GeolocationPosition) => void) | null>(null);
  const lastLightningParamsRef = useRef<{ center: { lat: number; lng: number }; radiusKm: number } | null>(null);
  const amenityCountsRef = useRef<Record<string, number>>({});
  const reapplyPlayerRangeRef = useRef<() => void>(() => {});
  const latestLocationRef = useRef<{ lat: number; lng: number }>(playerLocation);
  const amenitiesCallbackRef = useRef<
    ((info: { counts: Record<string, number>; matchedCategories: string[] }) => void) | undefined
  >(onAmenitiesWithinRadius);

  // Lightweight DOM markers for other players (no React mount per marker).
  const createOtherPlayerMarkerElement = useCallback(
    (player: { name: string; isStale: boolean }) => {
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.alignItems = "center";
      wrapper.style.pointerEvents = "none";
      wrapper.style.opacity = player.isStale ? "0.6" : "1";

      const label = document.createElement("div");
      label.setAttribute("data-role", "label");
      label.textContent = player.name;
      label.style.fontSize = "11px";
      label.style.fontWeight = "700";
      label.style.padding = "2px 6px";
      label.style.marginBottom = "4px";
      label.style.border = "1px solid #000";
      label.style.borderRadius = "999px";
      label.style.background = player.isStale ? "#e5e7eb" : "#ffffff";
      label.style.color = "#000";
      label.style.whiteSpace = "nowrap";
      label.style.maxWidth = "140px";
      label.style.overflow = "hidden";
      label.style.textOverflow = "ellipsis";

      const dot = document.createElement("div");
      dot.setAttribute("data-role", "dot");
      dot.style.width = "14px";
      dot.style.height = "14px";
      dot.style.borderRadius = "999px";
      dot.style.border = "2px solid #000";
      dot.style.background = player.isStale ? "#9ca3af" : "#ef4444";

      wrapper.appendChild(label);
      wrapper.appendChild(dot);
      return wrapper;
    },
    [],
  );

  const updateOtherPlayerMarkerElement = useCallback(
    (element: HTMLElement, player: { name: string; isStale: boolean }) => {
      const label = element.querySelector<HTMLElement>("[data-role='label']");
      const dot = element.querySelector<HTMLElement>("[data-role='dot']");
      element.style.opacity = player.isStale ? "0.6" : "1";
      if (label) {
        label.textContent = player.name;
        label.style.background = player.isStale ? "#e5e7eb" : "#ffffff";
      }
      if (dot) {
        dot.style.background = player.isStale ? "#9ca3af" : "#ef4444";
      }
    },
    [],
  );

  useEffect(() => {
    translateRef.current = t;
  }, [t]);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  // Shared map state used by overlay effects.
  const [userCircleCenter, setUserCircleCenter] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [hasUserLocationFix, setHasUserLocationFix] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [visiblePois, setVisiblePois] = useState<POI[]>([]);

  // Terrain and elevation sampling lifecycle.
  const { ensureTerrainEnabled, sampleTerrainElevation } = useTerrainElevation({
    accessToken: MAPBOX_CONFIG.accessToken,
    mapRef: map,
    onElevationSample,
    playerLocation,
    secretShelterCoords,
  });

  // City layer state/events extracted from MapView to reduce monolith complexity.
  const {
    cityLayersVisible,
    layerGroupOpenState,
    showLayerControl,
    anyLayerActive,
    toggleCityLayer,
    toggleCityLayerGroup,
    clearAllCityLayers,
    handleLayerControlToggle,
    syncCityLayers,
  } = useCityLayers({
    mapRef: map,
    mapLoaded,
    locale,
    t,
    infoPopupRef: infoPopup,
    onLayerPanelToggle,
    layerPanelOpenSignal,
    layerPanelCloseSignal,
  });

  // Measurement feature state/events.
  const {
    clearMeasurement,
    handleDeleteMeasurement,
    handleMapClick,
    handleMoveMeasurementPoint,
    isMeasurePanelCollapsed,
    measureState,
    setIsMeasurePanelCollapsed,
  } = useMeasurementTool({
    mapRef: map,
    cityLayersVisible: cityLayersVisible,
    locale,
    measureTrigger,
    onMeasurementActiveChange,
    t,
  });

  // Build standardized popup content for designated shelter results.
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

    const sectionHtml = buildPopupSectionHtml({
      titleHtml: escapeHtml(headerLabel),
      descriptionHtml: headerDescription ? escapeHtml(headerDescription) : undefined,
      contentHtml: buildPopupBodyHtml(rowsHtml, { lineHeight: "1.5" }),
    });

    return buildPopupCardHtml([sectionHtml]);
  }, [t]);

  // Keep filtered view POIs in a dedicated local list.
  useEffect(() => {
    if (isFiltered) {
      setVisiblePois(pois);
    } else {
      setVisiblePois([]);
    }
  }, [isFiltered, pois]);

  const refreshFilteredPoiLayers = useCallback(
    (poisToRender: POI[]) => {
      // Maintains a map-only source/layer pair for filtered POI rendering and popup behavior.
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
              closeButton: false,
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
      const radiusKm = Number(cityNearbyQuestionConfig.radiusKm || PROXIMITY_RADIUS_KM);
      const { counts, matchedCategories, unmatched } = await countAmenitiesWithinRadius(
        { lat: latestLocationRef.current.lat, lng: latestLocationRef.current.lng },
        radiusKm,
        cityAmenityCategoryMap,
      );
      const matchedQuestionIds = Array.from(
        new Set(
          Array.from(matchedCategories)
            .map((rawCategory) => resolveCityAmenityQuestionId(rawCategory))
            .filter((value): value is string => Boolean(value)),
        ),
      );
      const matchedLabels = matchedQuestionIds.map((questionId) => {
        const poiType = cityPoiTypeByQuestionId[questionId];
        if (!poiType) return questionId;
        return getCityPoiTypeLabel(poiType, t);
      });

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
        matchedCategories: matchedLabels,
      });
    } catch (error) {
      amenitiesCallbackRef.current?.({ counts: {}, matchedCategories: [] });
      console.warn("[Amenities] Failed to update counts from geojson index", error);
    }
  }, []);

  const selectShelterFromLocalData = useCallback(() => {
    // Select once per map lifecycle; emit all options + chosen shelter for game state.
    if (hasSelectedShelter.current) {
      return;
    }

    (async () => {
      try {
        const allShelters = await getLocalShelters();
        const designated = allShelters.filter(
          (poi) => isDesignatedShelterCategory(poi.category),
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

  // Initialize/destroy the Mapbox instance once per basemap style.
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    hasEmittedShelterOptions.current = false;
    let handleStyleData: (() => void) | null = null;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAPBOX_STYLE_URL || basemapUrl,
        center: [playerLocation.lng, playerLocation.lat],
        zoom: 14,
        minZoom: deployedCityContext.mapConfig.minZoom ?? 10,
      });

      map.current.on("load", () => {
        console.log("Mapbox map loaded successfully!");
        setMapLoaded(true);
        ensureTerrainEnabled();
        syncCityLayers();
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
            onPlayerLocationChange?.({ lat: latitude, lng: longitude });
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
        handleStyleData = () => {
          moveAttributionToBottomLeft();
          ensureTerrainEnabled();
          const reapply = reapplyPlayerRangeRef.current;
          const mInner = map.current;
          if (!reapply || !mInner) return;
          const missingCityLayer = deployedCityLayers.some(
            (layer) => !mInner.getLayer(`${CITY_LAYER_PREFIX}${layer.id}`),
          );
          if (missingCityLayer) {
            syncCityLayers();
          }
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
        };
        map.current?.on("styledata", handleStyleData);
      });

      console.log("Mapbox map created successfully");
    } catch (error) {
      console.error("Error initializing Mapbox:", error);
    }

    return () => {
      if (map.current) {
        if ((map.current as any)?.__cityLayerPopupHandler) {
          map.current.off(
            "click",
            (map.current as any).__cityLayerPopupHandler,
          );
          (map.current as any).__cityLayerPopupHandler = null;
        }
        if ((map.current as any)?.__legacyPopupHandler) {
          map.current.off(
            "click",
            (map.current as any).__legacyPopupHandler,
          );
          (map.current as any).__legacyPopupHandler = null;
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
        if (handleStyleData) {
          map.current.off("styledata", handleStyleData);
        }
        Object.values(otherPlayerMarkersRef.current).forEach((marker) => marker.remove());
        otherPlayerMarkersRef.current = {};
        map.current?.off("styledata", moveAttributionToBottomLeft);
        map.current.remove();
        map.current = null;
        hasSelectedShelter.current = false;
        hasEmittedShelterOptions.current = false;
        setMapLoaded(false);
      }
    };
    // Intentionally initialize once per basemap style.
  }, [basemapUrl]);

  // Keep camera center in sync with latest player location.
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
    sampleTerrainElevation();
  }, [playerLocation.lng, playerLocation.lat, hasUserLocationFix, sampleTerrainElevation]);

  useEffect(() => {
    if (!mapLoaded) return;
    ensureTerrainEnabled();
  }, [ensureTerrainEnabled, mapLoaded]);

  // Re-sample terrain when map, player, or shelter sample trigger changes.
  useEffect(() => {
    if (!mapLoaded) return;
    sampleTerrainElevation();
  }, [mapLoaded, sampleTerrainElevation, secretShelterCoords?.lat, secretShelterCoords?.lng]);

  useEffect(() => {
    if (!mapLoaded) return;
    sampleTerrainElevation();
  }, [elevationSampleTrigger, mapLoaded, sampleTerrainElevation]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const nextIds = new Set(otherPlayerLocations.map((player) => player.userId));

    Object.entries(otherPlayerMarkersRef.current).forEach(([userId, marker]) => {
      if (nextIds.has(userId)) return;
      marker.remove();
      delete otherPlayerMarkersRef.current[userId];
    });

    otherPlayerLocations.forEach((player) => {
      if (!Number.isFinite(player.lat) || !Number.isFinite(player.lng)) {
        return;
      }

      const existingMarker = otherPlayerMarkersRef.current[player.userId];
      if (existingMarker) {
        existingMarker.setLngLat([player.lng, player.lat]);
        updateOtherPlayerMarkerElement(existingMarker.getElement(), player);
        return;
      }

      const markerElement = createOtherPlayerMarkerElement(player);
      otherPlayerMarkersRef.current[player.userId] = new mapboxgl.Marker({
        element: markerElement,
        anchor: "bottom",
      })
        .setLngLat([player.lng, player.lat])
        .addTo(m);
    });
  }, [
    createOtherPlayerMarkerElement,
    otherPlayerLocations,
    updateOtherPlayerMarkerElement,
  ]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;

    // Draw/update player proximity radius overlay.
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

    // Manage lightning mode boundary overlay and style reload recovery.
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

    m.on("click", handleMapClick);

    return () => {
      m.off("click", handleMapClick);
    };
  }, [handleMapClick]);

  // Adapt city-layer model into UI-friendly grouped sections.
  const translateGroup = (group: CityLayerGroup) =>
    t(`map.layers.groups.${group}`, { fallback: group });
  const translateLayerLabel = (layerId: number, label: string) =>
    t(`map.layers.items.${layerId}`, { fallback: label });
  const groupedLayerSections = cityLayerGroups.map((group) => {
    const layers = deployedCityLayers.filter((layer) => layer.group === group);
    return {
      group,
      title: translateGroup(group),
      isOpen: layerGroupOpenState[group],
      onToggleGroup: () => toggleCityLayerGroup(group),
      layers: layers.map((layer) => ({
        id: layer.id,
        label: translateLayerLabel(layer.id, layer.label),
        icon: getCityLayerIcon(layer),
        checked: cityLayersVisible[layer.label],
        onChange: () => toggleCityLayer(layer.label),
      })),
    };
  }).filter((section) => section.layers.length > 0);
  const isPanelCollapsed =
    measureState.status === "active" && isMeasurePanelCollapsed;

  // Mapbox control positioning helpers (kept local to map view ownership).
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

     

      <MapLayerPanel
        showLayerControl={showLayerControl}
        onPanelToggle={handleLayerControlToggle}
        titleLabel={t("map.layers.title", { fallback: "Map Layers" })}
        clearAllLabel={t("map.layers.clearAll", { fallback: "Clear All" })}
        clearAllDisabled={!anyLayerActive}
        onClearAll={clearAllCityLayers}
        groupedLayers={groupedLayerSections}
      />

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
