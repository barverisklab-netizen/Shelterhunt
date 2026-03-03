import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import mapboxgl from "mapbox-gl";
import { toast } from "sonner@2.0.3";
import { kotoLayers } from "@/cityContext/koto/layers";
import { haversineDistanceKm } from "@/utils/lightningSelection";
import {
  FIXED_MEASURE_RADIUS_METERS,
  clearMeasurementCircleLayer,
  clearMeasurementShelterLayers,
  createMeasurementFeatureCaches,
  getFeatureCoordinates,
  getLayerMeasurementFeatures,
  hideMapLayers,
  restoreMapLayerVisibility,
  upsertMeasurementCircleLayer,
  upsertMeasurementShelterLayers,
} from "@/features/measurement/services/measurementLayers";

export type MeasureStatus = "idle" | "placing" | "active";

export type MeasureState = {
  status: MeasureStatus;
  radius: number;
  count: number;
  center: { lng: number; lat: number } | null;
  featureNames: string[];
  layerCounts: Record<string, number>;
};

type TranslateFn = (
  key: string,
  options?: { fallback?: string; replacements?: Record<string, string | number> },
) => string;

interface UseMeasurementToolParams {
  mapRef: MutableRefObject<mapboxgl.Map | null>;
  kotoLayersVisible: Record<string, boolean>;
  locale: string;
  measureTrigger?: number;
  onMeasurementActiveChange?: (active: boolean) => void;
  t: TranslateFn;
}

const SHELTER_KOTO_LAYER_IDS = kotoLayers
  .filter((layer) => /Designated Evacuation Centers/i.test(layer.label))
  .map((layer) => `koto-layer-${layer.id}`);

const createDefaultMeasureState = (): MeasureState => ({
  status: "idle",
  radius: FIXED_MEASURE_RADIUS_METERS,
  count: 0,
  center: null,
  featureNames: [],
  layerCounts: {},
});

export function useMeasurementTool({
  mapRef,
  kotoLayersVisible,
  locale,
  measureTrigger,
  onMeasurementActiveChange,
  t,
}: UseMeasurementToolParams) {
  const [measureState, setMeasureState] = useState<MeasureState>(createDefaultMeasureState);
  const [isMeasurePanelCollapsed, setIsMeasurePanelCollapsed] = useState(false);

  const localeRef = useRef(locale);
  const measureStatusRef = useRef<MeasureStatus>("idle");
  const measureMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const measurePopupRef = useRef<mapboxgl.Popup | null>(null);
  const shelterLayerVisibilityRef = useRef<Record<string, string>>({});
  const lastMeasureTriggerRef = useRef<number>(0);
  const lastMeasureRequestRef = useRef<number>(0);
  const featureCachesRef = useRef(createMeasurementFeatureCaches());

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    if (measureState.status !== "active") {
      setIsMeasurePanelCollapsed(false);
    }
  }, [measureState.status]);

  const closeMeasurePopup = useCallback(() => {
    if (measurePopupRef.current) {
      measurePopupRef.current.remove();
      measurePopupRef.current = null;
    }
  }, []);

  const removeMeasurementArtifacts = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    clearMeasurementCircleLayer(map);
    clearMeasurementShelterLayers(map);
    closeMeasurePopup();
  }, [closeMeasurePopup, mapRef]);

  const restoreShelterLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    restoreMapLayerVisibility(map, shelterLayerVisibilityRef.current);
    shelterLayerVisibilityRef.current = {};
  }, [mapRef]);

  const hideShelterLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    hideMapLayers(map, SHELTER_KOTO_LAYER_IDS, shelterLayerVisibilityRef.current);
  }, [mapRef]);

  const clearMeasurement = useCallback(() => {
    removeMeasurementArtifacts();
    restoreShelterLayers();
    if (measureMarkerRef.current) {
      measureMarkerRef.current.remove();
      measureMarkerRef.current = null;
    }
    setMeasureState(createDefaultMeasureState());
  }, [removeMeasurementArtifacts, restoreShelterLayers]);

  const updateCircle = useCallback(
    (center: { lng: number; lat: number }, radius: number) => {
      const map = mapRef.current;
      if (!map) return;

      const requestId = Date.now();
      lastMeasureRequestRef.current = requestId;

      upsertMeasurementCircleLayer(map, center, radius);

      (async () => {
        const radiusKm = Math.max(0, radius) / 1000;
        const origin = { lat: center.lat, lng: center.lng };

        const activeSymbolLayers = kotoLayers.filter(
          (layer) => layer.layerType === "symbol" && kotoLayersVisible[layer.label],
        );

        const layerResults = await Promise.all(
          activeSymbolLayers.map(async (layer) => ({
            layer,
            features: await getLayerMeasurementFeatures(layer, featureCachesRef.current),
          })),
        );

        const layerCounts: Record<string, number> = {};
        const markers: { id: string; name?: string; lat: number; lng: number }[] = [];

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

            const id = feature.id != null ? String(feature.id) : `${layer.id}-${index}`;

            markers.push({
              id,
              name,
              lat: Number(lat),
              lng: Number(lng),
            });
          });
        });

        if (lastMeasureRequestRef.current !== requestId) {
          return;
        }

        upsertMeasurementShelterLayers(map, markers);
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
    [hideShelterLayers, kotoLayersVisible, mapRef],
  );

  const beginMoveCenter = useCallback(() => {
    removeMeasurementArtifacts();
    restoreShelterLayers();
    if (measureMarkerRef.current) {
      measureMarkerRef.current.remove();
      measureMarkerRef.current = null;
    }
    setMeasureState({
      status: "placing",
      radius: FIXED_MEASURE_RADIUS_METERS,
      count: 0,
      center: null,
      featureNames: [],
      layerCounts: {},
    });
    toast.info(
      t("map.measure.placePrompt", {
        fallback: "Tap the map to place a new measurement point.",
      }),
    );
  }, [removeMeasurementArtifacts, restoreShelterLayers, t]);

  const showMarkerMenu = useCallback(() => {
    const map = mapRef.current;
    if (!map || !measureState.center) return;

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
      .addTo(map);

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
  }, [beginMoveCenter, clearMeasurement, closeMeasurePopup, mapRef, measureState.center, t]);

  const placeMeasureMarker = useCallback(
    (lng: number, lat: number) => {
      const map = mapRef.current;
      if (!map) return;

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
          .addTo(map);

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
      mapRef,
      removeMeasurementArtifacts,
      restoreShelterLayers,
      showMarkerMenu,
      updateCircle,
    ],
  );

  const handleMapClick = useCallback(
    (event: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
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
    },
    [placeMeasureMarker, updateCircle],
  );

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

    if (!mapRef.current) return;

    removeMeasurementArtifacts();
    restoreShelterLayers();
    if (measureMarkerRef.current) {
      measureMarkerRef.current.remove();
      measureMarkerRef.current = null;
    }
    setMeasureState({
      status: "placing",
      radius: FIXED_MEASURE_RADIUS_METERS,
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
  }, [mapRef, measureTrigger, removeMeasurementArtifacts, restoreShelterLayers, t]);

  const handleMoveMeasurementPoint = useCallback(() => {
    closeMeasurePopup();
    beginMoveCenter();
  }, [beginMoveCenter, closeMeasurePopup]);

  const handleDeleteMeasurement = useCallback(() => {
    closeMeasurePopup();
    clearMeasurement();
  }, [clearMeasurement, closeMeasurePopup]);

  useEffect(
    () => () => {
      closeMeasurePopup();
      measureMarkerRef.current?.remove();
      measureMarkerRef.current = null;
      const map = mapRef.current;
      if (!map) return;
      clearMeasurementCircleLayer(map);
      clearMeasurementShelterLayers(map);
      restoreMapLayerVisibility(map, shelterLayerVisibilityRef.current);
      shelterLayerVisibilityRef.current = {};
    },
    [closeMeasurePopup, mapRef],
  );

  return {
    clearMeasurement,
    handleDeleteMeasurement,
    handleMapClick,
    handleMoveMeasurementPoint,
    isMeasurePanelCollapsed,
    measureState,
    measureStatusRef,
    setIsMeasurePanelCollapsed,
  };
}
