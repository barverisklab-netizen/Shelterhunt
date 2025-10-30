import { useEffect, useRef, useState } from "react";
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
  Compass,
} from "lucide-react";
import { POI } from "../data/mockData";
import { kotoLayers } from "../types/kotoLayers";
import { MAPBOX_CONFIG, getTilesetUrl } from "../config/mapbox";
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
  secretShelterId: string;
  visitedPOIs: string[];
  gameEnded?: boolean;
  onPOIClick?: (poi: POI) => void;
  locationPickerMode?: boolean;
  onLocationPicked?: (location: { lat: number; lng: number }) => void;
  basemapUrl?: string;
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
  secretShelterId,
  visitedPOIs,
  gameEnded,
  onPOIClick,
  locationPickerMode,
  onLocationPicked,
  basemapUrl = "mapbox://styles/mapbox/dark-v11",
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const playerMarker = useRef<mapboxgl.Marker | null>(null);

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

    console.log("Initializing Mapbox map...");
    console.log("Container element:", mapContainer.current);
    console.log("Container dimensions:", {
      width: mapContainer.current.offsetWidth,
      height: mapContainer.current.offsetHeight,
    });

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: basemapUrl,
        center: [playerLocation.lng, playerLocation.lat],
        zoom: 14,
      });

      map.current.on("load", () => {
        console.log("Mapbox map loaded successfully!");
        // Add Koto layer sources and layers
        addKotoLayers();
      });

      console.log("Mapbox map created successfully");
    } catch (error) {
      console.error("Error initializing Mapbox:", error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [basemapUrl]);

  // Recenter camera when playerLocation changes (no reinit)
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    // cheap, no-flash update; use easeTo if you want animation
    m.jumpTo({ center: [playerLocation.lng, playerLocation.lat] });
    // or: m.easeTo({ center: [playerLocation.lng, playerLocation.lat], duration: 350 });
  }, [playerLocation.lng, playerLocation.lat]);


  // Handle location picker mode (minimal changes, adds console log)
  useEffect(() => {
    if (!map.current) return;

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (!locationPickerMode) return;

      const { lng, lat } = e.lngLat;
      // log picked location
      console.log(`[LocationPicker] lat=${lat}, lng=${lng}`);

      if (onLocationPicked) onLocationPicked({ lat, lng });
    };

    if (locationPickerMode) {
      map.current.getCanvas().style.cursor = "crosshair";
      map.current.on("click", handleMapClick);
    } else {
      // ensure cursor reset when leaving picker mode
      map.current.getCanvas().style.cursor = "";
      // in case a prior handler was still attached
      map.current.off("click", handleMapClick);
    }

    return () => {
      if (!map.current) return;
      map.current.off("click", handleMapClick);
      map.current.getCanvas().style.cursor = "";
    };
  }, [locationPickerMode, onLocationPicked]);

  // Toast notification when location picker mode is active
  useEffect(() => {
    if (!locationPickerMode) {
      // dismiss any existing toast when picker is off
      toast.dismiss("location-picker");
      return;
    }

    // show persistent toast while picker is active
      toast(
        (t) => (
          <div className="flex items-center gap-3 text-black">
            <Compass className="w-5 h-5 text-red-600" />
            <span className="font-bold uppercase">
              Click anywhere on the map to set your location
            </span>
          </div>
        ),
        {
          id: "location-picker", // ensures a single instance
          duration: Infinity,    // stays until manually dismissed
          style: {
            background: "yellow",
            border: "3px solid black",
            color: "black",
            boxShadow: "4px 4px 0 black",
          },
        }
      );
    }, [locationPickerMode]);
    
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

        // Bind popup/cursor only once per style layer id
        if (!boundLayers.has(layerId)) {
          const template = layer.metadata?.query?.template;

          if (template) {
            // Click → popup
            m.on("click", layerId, (e: any) => {
              const f = e.features?.[0];
              if (!f) return;

              const legend = layer.metadata?.legendItems?.[0];
              const headerHtml = `
                <div style="background: rgba(0,0,0,0.85); padding: 12px; border-radius: 8px; min-width: 220px; color: #fff;">
                  <div style="font-weight:700; margin-bottom:6px; font-size:14px;">
                    ${escapeHtml(legend?.label ?? layer.label)}
                  </div>
                  ${
                    legend?.description
                      ? `<div style="opacity:0.9; font-size:12px; margin-bottom:8px;">${legend.description}</div>`
                      : ""
                  }
                  <div style="font-size:12px;">
              `;
              const bodyHtml = renderTemplate(template, f.properties || {});
              const footerHtml = `</div></div>`;

              new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
                .setLngLat(e.lngLat)
                .setHTML(headerHtml + bodyHtml + footerHtml)
                .addTo(m);
            });

            // Hover cursor affordance
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
        className="absolute top-4 left-4 bg-white border-4 border-black p-3 hover:bg-black/5 transition-colors z-10"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Layers className="w-5 h-5 text-white" />
      </motion.button>

      {/* Koto Layer Control Panel */}
      <AnimatePresence>
        {showLayerControl && (
          <motion.div
            className="absolute top-16 left-4 bg-white border-4 border-black p-4 space-y-3 z-10 min-w-[220px]"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{
              backgroundColor: "#FFF", //FIXME: Use Bauhaus color variable
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
            className="absolute bottom-20 left-4 bg-white border-4 border-black p-3 space-y-2 z-10 max-h-[60vh] overflow-y-auto"
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
            className="absolute bottom-20 left-4 bg-white border-4 border-black p-3 z-10 text-black hover:bg-black/5 transition-colors"
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
