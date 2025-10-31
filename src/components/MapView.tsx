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
import { kotoLayers } from "../types/kotoLayers";
import { MAPBOX_CONFIG, getTilesetUrl } from "../config/mapbox";
import { defaultCityContext } from "../data/cityContext";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast } from "sonner@2.0.3"

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

interface MapViewProps {
  pois: POI[];
  playerLocation: { lat: number; lng: number };
  visitedPOIs: string[];
  gameEnded?: boolean;
  onPOIClick?: (poi: POI) => void;
  basemapUrl?: string;
  onSecretShelterChange?: (info: { id: string; name: string }) => void;
  onShelterOptionsChange?: (options: { id: string; name: string }[]) => void;
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
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const playerMarker = useRef<mapboxgl.Marker | null>(null);
  const geolocateControl = useRef<mapboxgl.GeolocateControl | null>(null);
  const infoPopup = useRef<mapboxgl.Popup | null>(null);
  const hasSelectedShelter = useRef(false);
  const hasEmittedShelterOptions = useRef(false);

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
          map.current?.addControl(control, "top-right");

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


  // Handle location picker mode (minimal changes, adds console log)
  // Temporarily disable POI markers and player markers for debugging

  const toggleLayer = (layer: keyof typeof layersVisible) => {
    setLayersVisible((prev) => ({ ...prev, [layer]: !prev[layer] }));
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
            className={
              "absolute top-16 left-4 z-10 bg-background border-4 border-black p-4 space-y-3 " +
              "w-[90vw] sm:w-auto min-w-[220px]"
            }
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{
              backgroundColor: "#FFF", //FIXME: Use Bauhaus color variable
              // Limit height so roughly 4 items are visible; allow scrolling for the rest.
              // `min(60vh, 240px)` keeps the panel usable on very tall screens while
              // ensuring ~4 items fit on most devices.
              maxHeight: "min(60vh, 240px)",
              overflowY: "auto",
            }}
          >
            <div className="text-black mb-2 font-bold uppercase">
              Koto Layers
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

      {/* Map Legend - Minimizable - Koto, Tokyo */}
      <AnimatePresence>
        {showLayerControl ? (
          <motion.div
            className="absolute bottom-20 left-4 bg-background border-4 border-black p-3 space-y-2 z-10 max-h-[60vh] overflow-y-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm font-bold uppercase">
                Koto, Tokyo Layers
              </span>
              <button
                onClick={() => setShowLayerControl(false)}
                className="text-black hover:text-red-600 transition-colors font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-black">
              <div className="w-3 h-3 rounded-full bg-red-600" />
              <span>Your Location</span>
            </div>
            <div className="border-t-4 border-black my-2"></div>

            {/* Dynamic Legend Items from kotoLayers */}
            {kotoLayers.map((layer, layerIndex) => (
              <div key={layer.id}>
                {layer.metadata.legendItems.map((legendItem, itemIndex) => {
                  const swatchColor =
                    legendItem.swatchStyle.strokeColor ||
                    legendItem.swatchStyle.fillColor ||
                    "#000000";
                  const swatchClasses =
                    legendItem.swatchType === "symbol" ||
                    legendItem.swatchType === "line"
                      ? "rounded-full"
                      : "";

                  return (
                    <div
                      key={`${layer.id}-${itemIndex}`}
                      className="flex items-center gap-2 text-xs text-black mb-2"
                    >
                      <div
                        className={`w-3 h-3 ${swatchClasses}`}
                        style={{ backgroundColor: swatchColor }}
                      />
                      <span>{legendItem.label}</span>
                    </div>
                  );
                })}
                {layerIndex < kotoLayers.length - 1 && (
                  <div className="border-t-4 border-black my-2"></div>
                )}
              </div>
            ))}

            <div className="text-xs text-black/70 mt-3">
              Note: Actual layer data requires Mapbox tileset configuration
            </div>
          </motion.div>
        ) : (
          <motion.button
            onClick={() => setShowLayerControl(true)}
            className="absolute bottom-20 left-4 bg-background border-4 border-black p-3 z-10 text-black hover:bg-black/5 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <span className="text-sm font-bold uppercase">Legend</span>
          </motion.button>
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
    <label className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-2 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 accent-black border-4 border-black"
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
