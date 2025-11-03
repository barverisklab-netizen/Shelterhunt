import { useEffect, useRef, useState, useCallback } from "react";
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
} from "lucide-react";
import { POI } from "../data/mockData";
import { kotoLayers } from "@/cityContext/koto/layers";
import { MAPBOX_CONFIG, getTilesetUrl } from "../config/mapbox";
import { defaultCityContext } from "../data/cityContext";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast } from "sonner@2.0.3"
import { circle as turfCircle, booleanPointInPolygon, point as turfPoint } from "@turf/turf";

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


// Helper function to get icons for Koto layers based on ID
const getKotoLayerIcon = (layer: (typeof kotoLayers)[0]): React.ReactNode => {
  if (!layer?.metadata?.legendItems?.[0]) {
    return <MapPin className="w-4 h-4 text-black" />;
  }

  const rawColor =
    layer.metadata.legendItems[0].swatchStyle.strokeColor ||
    layer.metadata.legendItems[0].swatchStyle.fillColor ||
    "#000000";

  // Sanitize to Bauhaus-compliant color
  const color = sanitizeToBauhausColor(rawColor);

  switch (layer.id) {
    case 3: // AED Locations
      return <Heart className="w-4 h-4" />;
    case 11: // Bridges
      return <Cable className="w-4 h-4" />;
    case 12: // Shrines/Temples
      return <Home className="w-4 h-4" />;
    case 9: // Flood Depth
      return <MapPin className="w-4 h-4" />;
    case 6: // Community Centers
      return <Building2 className="w-4 h-4" />;
    case 10: // Flood Gates
      return <Cable className="w-4 h-4" />;
    case 13: // Train Stations
      return <Train className="w-4 h-4" />;
    default:
      return <MapPin className="w-4 h-4" />;
  }
};

const SHELTER_KOTO_LAYER_IDS = kotoLayers
  .filter((layer) => /Evacuation/i.test(layer.label))
  .map((layer) => `koto-layer-${layer.id}`);

const MEASURE_CIRCLE_SOURCE_ID = "measure-circle-source";
const MEASURE_CIRCLE_FILL_LAYER_ID = "measure-circle-fill";
const MEASURE_CIRCLE_OUTLINE_LAYER_ID = "measure-circle-outline";

type MeasureStatus = "idle" | "placing" | "configuring" | "active";

interface MapViewProps {
  pois: POI[];
  playerLocation: { lat: number; lng: number };
  visitedPOIs: string[];
  gameEnded?: boolean;
  onPOIClick?: (poi: POI) => void;
  basemapUrl?: string;
  onSecretShelterChange?: (info: { id: string; name: string }) => void;
  onShelterOptionsChange?: (options: { id: string; name: string }[]) => void;
  measureTrigger?: number;
  onMeasurementActiveChange?: (active: boolean) => void;
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
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const playerMarker = useRef<mapboxgl.Marker | null>(null);
  const geolocateControl = useRef<mapboxgl.GeolocateControl | null>(null);
  const infoPopup = useRef<mapboxgl.Popup | null>(null);
  const hasSelectedShelter = useRef(false);
  const hasEmittedShelterOptions = useRef(false);
  const measureMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const measureShelterMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const measurePopupRef = useRef<mapboxgl.Popup | null>(null);
  const shelterLayerVisibilityRef = useRef<Record<string, string>>({});
  const lastMeasureTriggerRef = useRef<number>(0);
  const measureStatusRef = useRef<MeasureStatus>("idle");

const [measureState, setMeasureState] = useState<{
  status: MeasureStatus;
  radius: number;
  count: number;
  center: { lng: number; lat: number } | null;
  shelterNames: string[];
}>({
  status: "idle",
  radius: 250,
  count: 0,
  center: null,
  shelterNames: [],
});

  const closeMeasurePopup = useCallback(() => {
    if (measurePopupRef.current) {
      measurePopupRef.current.remove();
      measurePopupRef.current = null;
    }
  }, []);

  const removeShelterMarkers = useCallback(() => {
    measureShelterMarkersRef.current.forEach((marker) => marker.remove());
    measureShelterMarkersRef.current = [];
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
    radius: 250,
    count: 0,
    center: null,
    shelterNames: [],
  });
  }, [removeMeasurementArtifacts, restoreShelterLayers]);

  const updateShelterMarkers = useCallback(
    (features: mapboxgl.MapboxGeoJSONFeature[]) => {
      const m = map.current;
      if (!m) return;

      measureShelterMarkersRef.current.forEach((marker) => marker.remove());
      const newMarkers: mapboxgl.Marker[] = [];

      features.forEach((feature) => {
        if (feature.geometry.type !== "Point") return;
        const coords = feature.geometry.coordinates as [number, number];
        if (!coords || coords.length < 2) return;

        const el = document.createElement("div");
        el.className = "measure-shelter-marker";
        el.title =
          (feature.properties?.["Landmark name (EN)"] as string) ||
          (feature.properties?.["Landmark name (JP)"] as string) ||
          (feature.properties?.["name"] as string) ||
          "Shelter";

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat(coords as [number, number])
          .addTo(m);
        newMarkers.push(marker);
      });

      measureShelterMarkersRef.current = newMarkers;
    },
    [],
  );

  const updateCircle = useCallback(
    (center: { lng: number; lat: number }, radius: number) => {
      const m = map.current;
      if (!m) return;

      const circleFeature = turfCircle([center.lng, center.lat], radius / 1000, {
        steps: 64,
        units: "kilometers",
      });

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

      const shelterFeatures = m.queryRenderedFeatures(undefined, {
        layers: SHELTER_KOTO_LAYER_IDS,
      });

      const inside = shelterFeatures.filter((feature) => {
        if (feature.geometry.type !== "Point") return false;
        const coords = feature.geometry.coordinates as [number, number];
        if (!coords) return false;
        return booleanPointInPolygon(turfPoint(coords), circleFeature);
      });

      const insideNames = inside
        .map((feature) => {
          const props = feature.properties || {};
          return (
            (props["Landmark name (EN)"] as string) ||
            (props["Landmark name (JP)"] as string) ||
            (props["name"] as string) ||
            "Shelter"
          );
        })
        .filter(Boolean);

      updateShelterMarkers(inside);
      hideShelterLayers();

      setMeasureState((prev) => ({
        ...prev,
        status: "active",
        center,
        radius,
        count: inside.length,
        shelterNames: insideNames,
      }));
    },
    [hideShelterLayers, updateShelterMarkers],
  );

  const beginAdjustRadius = useCallback(() => {
    removeMeasurementCircle();
    updateShelterMarkers([]);
    restoreShelterLayers();
    setMeasureState((prev) => ({
      ...prev,
      status: prev.center ? "configuring" : "placing",
      count: 0,
      shelterNames: [],
    }));
  }, [removeMeasurementCircle, restoreShelterLayers, updateShelterMarkers]);

  const beginMoveCenter = useCallback(() => {
    removeMeasurementArtifacts();
    restoreShelterLayers();
    if (measureMarkerRef.current) {
      measureMarkerRef.current.remove();
      measureMarkerRef.current = null;
    }
    setMeasureState((prev) => ({
      status: "placing",
      radius: prev.radius ?? 250,
      count: 0,
      center: null,
      shelterNames: [],
    }));
    toast.info("Tap the map to place a new measurement point.");
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
          <button type="button" data-action="adjust">Adjust radius</button>
          <button type="button" data-action="move">Move center</button>
          <button type="button" data-action="delete" class="danger">Delete</button>
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

    bindAction('[data-action="adjust"]', () => {
      closeMeasurePopup();
      beginAdjustRadius();
    });
    bindAction('[data-action="move"]', () => {
      closeMeasurePopup();
      beginMoveCenter();
    });
    bindAction('[data-action="delete"]', () => {
      closeMeasurePopup();
      clearMeasurement();
    });
  }, [
    beginAdjustRadius,
    beginMoveCenter,
    clearMeasurement,
    closeMeasurePopup,
    measureState.center,
  ]);

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
          status: "configuring",
          center: { lng: updated.lng, lat: updated.lat },
          count: 0,
          shelterNames: [],
        }));
          toast.info("Set a radius and draw the circle.");
        });
      }

      measureMarkerRef.current?.setLngLat([lng, lat]);
    },
    [closeMeasurePopup, removeMeasurementArtifacts, restoreShelterLayers, showMarkerMenu],
  );

  const handleRadiusValueChange = useCallback((value: number) => {
    setMeasureState((prev) => ({
      ...prev,
      radius: value,
    }));
  }, []);

  const handleDrawCircle = useCallback(() => {
    if (!measureState.center) {
      toast.warning("Choose a point on the map first.");
      return;
    }

    updateCircle(measureState.center, measureState.radius);
    toast.success("Radius applied. Shelters in range highlighted.");
  }, [measureState.center, measureState.radius, updateCircle]);

  const selectShelterFromTiles = useCallback(() => {
    if (hasSelectedShelter.current || !map.current) {
      return;
    }

    try {
      const features = map.current.querySourceFeatures(
        "koto-source-8sbllw5a",
        {
          sourceLayer: "ihi_evacuation_centers_all-c2o5a5",
          filter: ["==", ["get", "Category"], "Designated EC"],
        },
      );

      const options: { id: string; name: string }[] = [];
      const seenNames = new Set<string>();
      const seenIds = new Set<string>();

      features.forEach((feature) => {
        const properties = (feature.properties || {}) as Record<
          string,
          unknown
        >;
        const rawName =
          (properties["Landmark name (EN)"] as string | undefined) ??
          (properties["Landmark name (JP)"] as string | undefined) ??
          (properties.name as string | undefined) ??
          "";
        const name = rawName?.trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (seenNames.has(key)) return;
        seenNames.add(key);

        let resolvedId =
          (properties["OBJECTID"] != null
            ? String(properties["OBJECTID"])
            : feature.id != null
              ? String(feature.id)
              : name) ?? name;

        if (seenIds.has(resolvedId)) {
          let suffix = 1;
          while (seenIds.has(`${resolvedId}-${suffix}`)) {
            suffix += 1;
          }
          resolvedId = `${resolvedId}-${suffix}`;
        }
        seenIds.add(resolvedId);

        options.push({ id: resolvedId, name });
      });

      if (onShelterOptionsChange && (options.length || !hasEmittedShelterOptions.current)) {
        const sorted = [...options].sort((a, b) => a.name.localeCompare(b.name));
        onShelterOptionsChange(sorted);
        hasEmittedShelterOptions.current = true;
      }

      if (!options.length || !onSecretShelterChange) {
        return;
      }

      const chosen =
        options[Math.floor(Math.random() * options.length)];

      hasSelectedShelter.current = true;
      onSecretShelterChange({ id: chosen.id, name: chosen.name });
      map.current.off("idle", selectShelterFromTiles);
    } catch (error) {
      console.warn("[mapbox] Unable to select shelter from tiles:", error);
    }
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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    hasEmittedShelterOptions.current = false;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: basemapUrl,
        center: [playerLocation.lng, playerLocation.lat],
        zoom: 14,
        minZoom: defaultCityContext.mapConfig.minZoom ?? 10,
      });

      map.current.on("load", () => {
        console.log("Mapbox map loaded successfully!");
        // Add Koto layer sources and layers
        addKotoLayers();

        if (onSecretShelterChange) {
          hasSelectedShelter.current = false;
          map.current?.on("idle", selectShelterFromTiles);
        }

        if (!geolocateControl.current) {
          const control = new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true,
            showAccuracyCircle: false,
          });
          geolocateControl.current = control;
          map.current?.addControl(control, "bottom-right");

          window.requestAnimationFrame(() => {
            try {
              control.trigger();
            } catch (error) {
              console.warn("[mapbox] Failed to trigger geolocate control:", error);
            }
          });
        }
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
          map.current.off("idle", selectShelterFromTiles);
        }
        if (geolocateControl.current) {
          map.current.removeControl(geolocateControl.current);
          geolocateControl.current = null;
        }
        map.current.remove();
        map.current = null;
        hasSelectedShelter.current = false;
        hasEmittedShelterOptions.current = false;
      }
    };
  }, [basemapUrl, onSecretShelterChange, onShelterOptionsChange, selectShelterFromTiles]);

  // Recenter camera when playerLocation changes (no reinit)
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    // cheap, no-flash update; use easeTo if you want animation
    m.jumpTo({ center: [playerLocation.lng, playerLocation.lat] });
    // or: m.easeTo({ center: [playerLocation.lng, playerLocation.lat], duration: 350 });
  }, [playerLocation.lng, playerLocation.lat]);

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
      shelterNames: [],
    });
    toast.info("Tap the map to drop a measurement point.");
  }, [
    measureTrigger,
    removeMeasurementArtifacts,
    restoreShelterLayers,
  ]);

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
        status: "configuring",
        center: { lng, lat },
        count: 0,
        shelterNames: [],
      }));
      toast.info("Set a radius and draw the circle.");
    };

    m.on("click", handleMapClick);

    return () => {
      m.off("click", handleMapClick);
    };
  }, [placeMeasureMarker]);


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
          legendItems?: (typeof kotoLayers)[number]["metadata"]["legendItems"];
        }
      > = (m as any).__kotoLayerMeta || ((m as any).__kotoLayerMeta = {});

      // Simple, safe HTML escape for interpolated values
      const escapeHtml = (s: string) =>
        s.replace(/[&<>"'`=\/]/g, (c) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "/": "&#x2F;", "`": "&#x60;", "=": "&#x3D;" }[c] as string)
        );

      // Render {{ token }} with props[key]; unknown -> em dash
      const renderTemplate = (template: string, props: Record<string, any>) => {
        return template.replace(/{{\s*([^}]+?)\s*}}/g, (_match, rawKey) => {
          const key = String(rawKey);
          const val = props?.[key];
          return val == null || val === "" ? "—" : escapeHtml(String(val));
        });
      };

      kotoLayers.forEach((layer) => {
        const sourceId = `koto-source-${layer.sourceData.layerId}`;
        const layerId = `koto-layer-${layer.id}`;

        // Add source (vector) if needed
        if (!addedSources.has(sourceId) && !m.getSource(sourceId)) {
          const tilesetUrl = getTilesetUrl(layer.sourceData.layerId); // your existing util
          m.addSource(sourceId, { type: "vector", url: tilesetUrl });
          addedSources.add(sourceId);
          // console.debug(`[koto] add source: ${sourceId} -> ${tilesetUrl}`);
        }

        // Add style layer if missing
        if (!m.getLayer(layerId)) {
          const layerConfig: any = {
            id: layerId,
            type: layer.layerType,
            source: sourceId,
            "source-layer": layer.sourceData.layerName,
            layout: {
              ...layer.style.layout,
              visibility: layer.metadata.loadOnInit ? "visible" : "none",
            },
            paint: layer.style.paint,
          };
          if (layer.style.filter) layerConfig.filter = layer.style.filter;

          m.addLayer(layerConfig);
          // console.debug(`[koto] add layer: ${layerId}`);
        }

        const template = layer.metadata?.query?.template;
        if (template) {
          layerMetaRegistry[layerId] = {
            template,
            label: layer.label,
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

      if (!(m as any).__kotoPopupHandler) {
        const handleCombinedClick = (
          e: mapboxgl.MapMouseEvent & mapboxgl.EventData,
        ) => {
          if (measureStatusRef.current !== "idle") {
            return;
          }

          const layerIds = Object.keys(layerMetaRegistry).filter(
            (id) => layerMetaRegistry[id]?.template,
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
              const headerHtml = `
                <div style="padding: 12px;">
                  <div style="font-weight:700; margin-bottom:6px; font-size:14px;">
                    ${escapeHtml(legend?.label ?? meta.label)}
                  </div>
                  ${
                    legend?.description
                      ? `<div style="opacity:0.9; font-size:12px; margin-bottom:8px;">${escapeHtml(legend.description)}</div>`
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

          infoPopup.current
            .setLngLat(e.lngLat)
            .setHTML(combinedHtml)
            .addTo(m);
        };

        (m as any).__kotoPopupHandler = handleCombinedClick;
        m.on("click", handleCombinedClick);
      }

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

  const anyLayerActive = Object.values(kotoLayersVisible).some(Boolean);

  return (
    <div className="relative w-full h-full min-h-[500px] z-0">
      
      <div
        ref={mapContainer}
        className="absolute inset-0 z-0"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Add CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2); opacity: 0; }
        }
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
        .measure-shelter-marker {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 3px solid #c1272d;
          background: #0f0f0f;
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.45);
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
          font-family: 'Inter', sans-serif;
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
        onClick={() => setShowLayerControl(!showLayerControl)}
        className="absolute top-4 left-4 z-10 rounded-full border border-neutral-900 bg-background p-3 text-neutral-900 shadow-sm transition-colors hover:bg-neutral-100"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Layers className="w-5 h-5 text-black" />
      </motion.button>

       {/* Koto Layer Control Panel */}
      <AnimatePresence>
        {showLayerControl && (
          <motion.div
            className="absolute top-16 left-4 z-10 w-[90vw] min-w-[220px] space-y-3 rounded-lg border border-black bg-background p-4 shadow-lg sm:w-auto"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{
              maxHeight: "min(60vh, 240px)",
              overflowY: "auto",
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase text-black">Map Layers</span>
              <button
                type="button"
                onClick={clearAllLayers}
                disabled={!anyLayerActive}
                className="rounded border border-black bg-background px-3 py-1 text-xs font-semibold uppercase text-black transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-200 disabled:text-neutral-500"
              >
                Clear All
              </button>
            </div>

            {kotoLayers.map((layer) => (
              <LayerToggle
                key={layer.id}
                label={layer.label}
                icon={getKotoLayerIcon(layer)}
                checked={kotoLayersVisible[layer.label]}
                onChange={() => toggleKotoLayer(layer.label)}
              />
            ))}
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
                onClick={() => setShowLayerControl(false)}
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
            onClick={() => setShowLayerControl(true)}
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
          <motion.div
            className="absolute bottom-4 left-1/2 z-30 w-[92vw] max-w-sm -translate-x-1/2 rounded-lg border border-black bg-background p-4 shadow-xl"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
          >
            <div className="space-y-3 text-black">
              {measureState.status === "placing" && (
                <>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide">
                      Measure Shelters
                    </h3>
                    <p className="text-xs text-black/70">
                      Tap anywhere on the map to drop a center point. We’ll help you
                      count nearby shelters.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={clearMeasurement}
                      className="w-full sm:w-auto rounded border border-black px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-neutral-100"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {measureState.status === "configuring" && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide">
                        Set Radius
                      </h3>
                      <p className="text-xs text-black/70">
                        Choose a radius in 10&nbsp;m increments (100&nbsp;m – 1,000&nbsp;m).
                      </p>
                    </div>
                    <div className="text-lg font-bold text-black">
                      {measureState.radius}m
                    </div>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={1000}
                    step={10}
                    value={measureState.radius}
                    onChange={(event) =>
                      handleRadiusValueChange(Number(event.target.value))
                    }
                    className="w-full accent-black"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={clearMeasurement}
                      className="w-full sm:w-auto rounded border border-black px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-neutral-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDrawCircle}
                      className="w-full sm:w-auto rounded border border-black bg-background px-3 py-2 text-xs font-bold uppercase tracking-wide text-black hover:bg-neutral-100"
                    >
                      Draw Circle
                    </button>
                  </div>
                </>
              )}

              {measureState.status === "active" && (
                <>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide">
                      Shelters Nearby
                    </h3>
                    <p className="text-xs text-black/70">
                      {measureState.count} shelter{measureState.count === 1 ? "" : "s"} within{" "}
                      {measureState.radius} meters.
                    </p>
                    {measureState.shelterNames.length > 0 ? (
                      <ul className="mt-3 space-y-1 rounded border border-black/40 bg-background p-3 text-xs font-semibold uppercase tracking-wide text-black">
                        {measureState.shelterNames.map((name, index) => (
                          <li key={`${name}-${index}`} className="flex items-center gap-2">
                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-black" />
                            <span className="truncate">{name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-xs text-black/50 italic">
                        No shelters detected in this radius.
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => {
                        closeMeasurePopup();
                        beginAdjustRadius();
                      }}
                      className="rounded border border-black px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-neutral-100"
                    >
                      Adjust Radius
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closeMeasurePopup();
                        beginMoveCenter();
                      }}
                      className="rounded border border-black px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-neutral-100"
                    >
                      Move Point
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closeMeasurePopup();
                        clearMeasurement();
                      }}
                      className="rounded border border-black bg-red-500/20 px-3 py-2 text-xs font-bold uppercase tracking-wide text-black hover:bg-red-600 hover:text-white active:bg-red-600 active:text-white"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {measureState.status === "active" && measureState.center && (
          <motion.div
            className="absolute top-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-black bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black shadow-md"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {measureState.count} shelter{measureState.count === 1 ? "" : "s"} within{" "}
            {measureState.radius}m
          </motion.div>
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

function getIconSVG(type: string): string {
  switch (type) {
    case "shelter":
      return '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>';
    case "fire_station":
      return '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>';
    case "hospital":
      return '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>';
    case "park":
      return '<path d="M12 12c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm7-1c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-14 0c1.66 0 3-1.34 3-3S6.66 5 5 5 2 6.34 2 8s1.34 3 3 3zm7-8c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z"></path>';
    case "library":
      return '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>';
    case "school":
      return '<path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path>';
    default:
      return '<circle cx="12" cy="12" r="10"></circle>';
  }
}
