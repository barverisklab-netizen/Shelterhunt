import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import mapboxgl from "mapbox-gl";
import { kotoLayers as cityLayers } from "@/cityContext/koto/layers";
import type { KotoLayerGroup } from "@/types/kotoLayers";
import { getTilesetUrl } from "@/config/mapbox";
import {
  buildPopupBodyHtml,
  buildPopupCardHtml,
  buildPopupSectionHtml,
} from "@/features/map/popups/popupHtml";

export type CityLayerGroup = KotoLayerGroup;

export const CITY_LAYER_GROUPS: CityLayerGroup[] = [
  "Shelters",
  "Evacuation Support Facilities",
  "City Landmarks",
  "Hazard Layers",
];

type TranslateFn = (
  key: string,
  options?: { fallback?: string; replacements?: Record<string, string | number> },
) => string;

interface UseCityLayersParams {
  mapRef: MutableRefObject<mapboxgl.Map | null>;
  mapLoaded: boolean;
  locale: string;
  t: TranslateFn;
  infoPopupRef: MutableRefObject<mapboxgl.Popup | null>;
  onLayerPanelToggle?: (open: boolean) => void;
  layerPanelOpenSignal?: number;
  layerPanelCloseSignal?: number;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"'`=\/]/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "/": "&#x2F;",
      "`": "&#x60;",
      "=": "&#x3D;",
    }[c] as string),
  );

export function useCityLayers({
  mapRef,
  mapLoaded,
  locale,
  t,
  infoPopupRef,
  onLayerPanelToggle,
  layerPanelOpenSignal,
  layerPanelCloseSignal,
}: UseCityLayersParams) {
  const [cityLayersVisible, setCityLayersVisible] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    cityLayers.forEach((layer) => {
      initialState[layer.label] = layer.metadata.loadOnInit;
    });
    return initialState;
  });
  const cityLayersVisibleRef = useRef(cityLayersVisible);
  const [layerGroupOpenState, setLayerGroupOpenState] = useState<
    Record<CityLayerGroup, boolean>
  >(() =>
    CITY_LAYER_GROUPS.reduce(
      (acc, group) => ({ ...acc, [group]: true }),
      {} as Record<CityLayerGroup, boolean>,
    ),
  );
  const [showLayerControl, setShowLayerControl] = useState(false);
  const translateRef = useRef(t);
  const localeRef = useRef(locale);
  const lastLayerPanelOpenSignalRef = useRef<number | undefined>(layerPanelOpenSignal);

  const applyCityLayerVisibility = useCallback((label: string, visible: boolean) => {
    const m = mapRef.current;
    if (!m) return;

    const layer = cityLayers.find((item) => item.label === label);
    if (!layer) return;

    const layerId = `koto-layer-${layer.id}`;
    if (!m.getLayer(layerId)) return;

    m.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }, [mapRef]);

  const localizeTextFieldExpression = useCallback(
    (expr: any, currentLocale: string): any => {
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

  const syncCityLayers = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;

    if (!m.isStyleLoaded && (m as any)._style === undefined) {
      m.once("load", () => syncCityLayers());
      return;
    }
    if (m.isStyleLoaded && !m.isStyleLoaded()) {
      m.once("load", () => syncCityLayers());
      return;
    }

    try {
      const sortedCityLayers = [...cityLayers].sort((a, b) => {
        if (a.layerType === b.layerType) return 0;
        if (a.layerType === "fill" && b.layerType !== "fill") return -1;
        if (a.layerType !== "fill" && b.layerType === "fill") return 1;
        return 0;
      });

      const expectedLayerIds = new Set(
        sortedCityLayers.map((layer) => `koto-layer-${layer.id}`),
      );
      const expectedSourceIds = new Set(
        sortedCityLayers.map((layer) => `koto-source-${layer.sourceData.layerId}`),
      );

      const styleLayers = m.getStyle()?.layers ?? [];
      styleLayers
        .map((layer) => layer.id)
        .filter((id) => id.startsWith("koto-layer-") && !expectedLayerIds.has(id))
        .forEach((staleId) => {
          if (m.getLayer(staleId)) {
            m.removeLayer(staleId);
          }
        });

      Object.keys(m.getStyle()?.sources ?? {})
        .filter((id) => id.startsWith("koto-source-") && !expectedSourceIds.has(id))
        .forEach((staleSourceId) => {
          if (m.getSource(staleSourceId)) {
            m.removeSource(staleSourceId);
          }
        });

      const boundLayers: Set<string> =
        (m as any).__cityBoundLayers || ((m as any).__cityBoundLayers = new Set());
      const addedSources = new Set<string>();
      const layerMetaRegistry: Record<
        string,
        {
          template?: string;
          label: string;
          labelJp?: string;
          layerNumericId?: number;
          legendItems?: (typeof cityLayers)[number]["metadata"]["legendItems"];
        }
      > = ((m as any).__cityLayerMeta = {});

      const renderTemplate = (template: string, props: Record<string, any>) => {
        return template.replace(/{{\s*([^}]+?)\s*}}/g, (_match, rawKey) => {
          const key = String(rawKey).trim();

          if (key.startsWith("t:")) {
            const translationKey = key.slice(2);
            const localized =
              typeof translateRef.current === "function"
                ? translateRef.current(translationKey, { fallback: translationKey })
                : translationKey;
            return escapeHtml(localized);
          }

          if (key.startsWith("locale:")) {
            const choices = key
              .slice("locale:".length)
              .split("|")
              .map((part) => part.trim())
              .filter(Boolean);
            const [enKey, jaKey] = choices;
            const chosenKey =
              localeRef.current === "ja" ? jaKey ?? enKey : enKey ?? jaKey;
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

      sortedCityLayers.forEach((layer) => {
        try {
          const sourceId = `koto-source-${layer.sourceData.layerId}`;
          const layerId = `koto-layer-${layer.id}`;

          if (!addedSources.has(sourceId) && !m.getSource(sourceId)) {
            if (layer.sourceType === "geojson") {
              const data = layer.sourceData.geojsonUrl;
              if (!data) {
                console.warn(`[city-layers] Missing geojsonUrl for layer ${layer.label}`);
              } else {
                m.addSource(sourceId, { type: "geojson", data });
                addedSources.add(sourceId);
              }
            } else {
              const tilesetUrl = getTilesetUrl(layer.sourceData.layerId);
              m.addSource(sourceId, { type: "vector", url: tilesetUrl });
              addedSources.add(sourceId);
            }
          }

          if (!m.getLayer(layerId)) {
            const layerConfig: any = {
              id: layerId,
              type: layer.layerType,
              source: sourceId,
              layout: (() => {
                const layout = {
                  ...layer.style.layout,
                  visibility:
                    (cityLayersVisibleRef.current[layer.label] ?? layer.metadata.loadOnInit)
                      ? "visible"
                      : "none",
                } as Record<string, unknown>;
                if (layout["icon-allow-overlap"] === true) {
                  layout["icon-ignore-placement"] = true;
                }
                if (layer.layerType === "symbol") {
                  layout["icon-optional"] = true;
                  layout["text-optional"] = true;
                  layout["text-allow-overlap"] = true;
                  layout["text-ignore-placement"] = true;
                  layout["text-font"] = ["Open Sans Bold", "Arial Unicode MS Bold"];
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
            if (layer.style.filter) {
              layerConfig.filter = layer.style.filter;
            }

            m.addLayer(layerConfig);
          }

          const template = layer.metadata?.query?.template;
          if (template) {
            layerMetaRegistry[layerId] = {
              template,
              label: layer.label,
              labelJp: layer.labelJp,
              layerNumericId: layer.id,
              legendItems: layer.metadata?.legendItems,
            };
          } else {
            delete layerMetaRegistry[layerId];
          }

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
        } catch (layerError) {
          console.warn("[city-layers] Failed to add individual layer", {
            layerId: layer.id,
            layerLabel: layer.label,
            error: layerError,
          });
        }
      });

      const previousPopupHandler = (m as any).__cityLayerPopupHandler;
      if (previousPopupHandler) {
        m.off("click", previousPopupHandler);
      }

      const handleCombinedClick = (
        e: mapboxgl.MapMouseEvent & mapboxgl.EventData,
      ) => {
        const layerIds = Object.keys(layerMetaRegistry).filter(
          (id) => layerMetaRegistry[id]?.template && m.getLayer(id),
        );
        if (!layerIds.length) return;

        const features = m.queryRenderedFeatures(e.point, { layers: layerIds });
        if (!features.length) {
          if (infoPopupRef.current) {
            infoPopupRef.current.remove();
            infoPopupRef.current = null;
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
              (meta.layerNumericId ? `map.layers.items.${meta.layerNumericId}` : undefined);
            const fallbackLabel =
              legend?.label ??
              (localeRef.current === "ja" ? meta.labelJp ?? meta.label : meta.label);
            const headerLabel = labelKey
              ? typeof translateRef.current === "function"
                ? translateRef.current(labelKey, { fallback: fallbackLabel })
                : fallbackLabel
              : fallbackLabel;

            const bodyHtml = renderTemplate(meta.template, feature.properties || {});
            return buildPopupSectionHtml({
              titleHtml: escapeHtml(headerLabel),
              contentHtml: buildPopupBodyHtml(bodyHtml),
            });
          })
          .filter((section): section is string => Boolean(section));

        if (!sections.length) {
          if (infoPopupRef.current) {
            infoPopupRef.current.remove();
            infoPopupRef.current = null;
          }
          return;
        }

        const combinedHtml = buildPopupCardHtml(sections);

        if (!infoPopupRef.current) {
          infoPopupRef.current = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: true,
          });
        }
        infoPopupRef.current.setLngLat(e.lngLat).setHTML(combinedHtml).addTo(m);
      };

      (m as any).__cityLayerPopupHandler = handleCombinedClick;
      m.on("click", handleCombinedClick);

      Object.entries(cityLayersVisibleRef.current).forEach(([label, visible]) => {
        applyCityLayerVisibility(label, visible);
      });
    } catch (error) {
      console.warn("[city-layers] Could not sync layers:", error);
    }
  }, [
    applyCityLayerVisibility,
    infoPopupRef,
    localizeTextFieldExpression,
    mapRef,
  ]);

  const toggleCityLayer = useCallback((label: string) => {
    const layer = cityLayers.find((item) => item.label === label);
    const layerId = layer ? `koto-layer-${layer.id}` : null;
    const newVisibility = !cityLayersVisibleRef.current[label];

    setCityLayersVisible((prev) => ({ ...prev, [label]: newVisibility }));
    cityLayersVisibleRef.current = {
      ...cityLayersVisibleRef.current,
      [label]: newVisibility,
    };

    if (layer && layerId && !mapRef.current?.getLayer(layerId)) {
      syncCityLayers();
      const activeMap = mapRef.current;
      if (activeMap) {
        const applyAfterStyleLoad = () => {
          if (!activeMap.getLayer(layerId)) {
            console.warn("[city-layers] Requested toggle but layer unavailable", {
              label,
              layerId,
            });
            if (newVisibility) {
              setCityLayersVisible((prev) => ({ ...prev, [label]: false }));
              cityLayersVisibleRef.current = {
                ...cityLayersVisibleRef.current,
                [label]: false,
              };
            }
            return;
          }
          applyCityLayerVisibility(label, newVisibility);
        };

        if (typeof activeMap.isStyleLoaded === "function" && !activeMap.isStyleLoaded()) {
          activeMap.once("style.load", applyAfterStyleLoad);
          return;
        }
        applyAfterStyleLoad();
        return;
      }
    }

    applyCityLayerVisibility(label, newVisibility);
  }, [applyCityLayerVisibility, mapRef, syncCityLayers]);

  const clearAllCityLayers = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;

    const updated: Record<string, boolean> = {};
    cityLayers.forEach((layer) => {
      const layerId = `koto-layer-${layer.id}`;
      if (m.getLayer(layerId)) {
        m.setLayoutProperty(layerId, "visibility", "none");
      }
      updated[layer.label] = false;
    });
    setCityLayersVisible(updated);
  }, [mapRef]);

  const handleLayerControlToggle = useCallback(
    (desiredState?: boolean) => {
      const targetState =
        typeof desiredState === "boolean" ? desiredState : !showLayerControl;
      setShowLayerControl(targetState);
      onLayerPanelToggle?.(targetState);
    },
    [onLayerPanelToggle, showLayerControl],
  );

  const toggleCityLayerGroup = useCallback((group: CityLayerGroup) => {
    setLayerGroupOpenState((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  }, []);

  useEffect(() => {
    cityLayersVisibleRef.current = cityLayersVisible;
  }, [cityLayersVisible]);

  useEffect(() => {
    translateRef.current = t;
  }, [t]);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    if (layerPanelCloseSignal !== undefined) {
      setShowLayerControl(false);
    }
  }, [layerPanelCloseSignal]);

  useEffect(() => {
    if (layerPanelOpenSignal === undefined) return;
    if (layerPanelOpenSignal === lastLayerPanelOpenSignalRef.current) return;
    lastLayerPanelOpenSignalRef.current = layerPanelOpenSignal;
    handleLayerControlToggle(true);
  }, [handleLayerControlToggle, layerPanelOpenSignal]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    const cloneFn = (globalThis as any).structuredClone as
      | (<T>(value: T) => T)
      | undefined;

    cityLayers.forEach((layer) => {
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
        console.warn("[city-layers] Failed to update text-field for locale", {
          layerId,
          error,
        });
      }
    });
  }, [locale, localizeTextFieldExpression, mapRef]);

  useEffect(() => {
    if (!mapLoaded) return;
    const m = mapRef.current;
    if (!m) return;

    const missingVisibleCityLayer = cityLayers.some((layer) => {
      if (!cityLayersVisible[layer.label]) return false;
      return !m.getLayer(`koto-layer-${layer.id}`);
    });
    if (missingVisibleCityLayer) {
      syncCityLayers();
    }
    Object.entries(cityLayersVisible).forEach(([label, visible]) => {
      applyCityLayerVisibility(label, visible);
    });
  }, [applyCityLayerVisibility, cityLayersVisible, mapLoaded, mapRef, syncCityLayers]);

  const anyLayerActive = Object.values(cityLayersVisible).some(Boolean);

  return {
    cityLayersVisible,
    layerGroupOpenState,
    showLayerControl,
    anyLayerActive,
    toggleCityLayer,
    toggleCityLayerGroup,
    clearAllCityLayers,
    handleLayerControlToggle,
    syncCityLayers,
  };
}
