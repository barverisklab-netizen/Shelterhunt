import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Home, Flame, Hospital, Trees, Library, School, Layers, Heart, Building2, Cable, Train } from 'lucide-react';
import { POI } from '../data/mockData';
import { kotoLayers } from '../types/kotoLayers';
import { MAPBOX_CONFIG, getTilesetUrl } from '../config/mapbox';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox access token from config
mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;
console.log('Mapbox token loaded:', MAPBOX_CONFIG.accessToken ? 'Yes' : 'No', MAPBOX_CONFIG.accessToken?.substring(0, 10) + '...');
console.log('Mapbox username configured:', MAPBOX_CONFIG.username);

// Bauhaus color sanitization - converts any color to approved palette
const sanitizeToBauhausColor = (color: string | undefined): string => {
  if (!color) return '#000000';
  
  // Approved Bauhaus colors only: white, black, red
  const BAUHAUS_BLACK = '#000000';
  const BAUHAUS_WHITE = '#FFFFFF';
  const BAUHAUS_RED = '#DC2626';
  
  const lowerColor = color.toLowerCase().trim();
  
  // Already approved colors - return as is
  if (lowerColor === '#dc2626' || lowerColor === '#000000' || lowerColor === '#ffffff') {
    return color.toUpperCase();
  }
  
  // Check if color is in red spectrum (hex colors starting with high red values)
  const hexMatch = lowerColor.match(/^#?([a-f0-9]{6}|[a-f0-9]{3})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    const fullHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);
    
    // If red channel is dominant (red > green and red > blue), map to Bauhaus red
    if (r > g && r > b && r > 128) {
      return BAUHAUS_RED;
    }
  }
  
  // Check for rgb/rgba strings
  const rgbMatch = lowerColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    
    // If red channel is dominant, map to Bauhaus red
    if (r > g && r > b && r > 128) {
      return BAUHAUS_RED;
    }
  }
  
  // Map all other colors (blue, green, yellow, etc.) to black
  return BAUHAUS_BLACK;
};

// Helper function to get icons for Koto layers based on ID
const getKotoLayerIcon = (layer: typeof kotoLayers[0]): React.ReactNode => {
  if (!layer?.metadata?.legendItems?.[0]) {
    return <MapPin className="w-4 h-4 text-black" />;
  }
  
  const rawColor = layer.metadata.legendItems[0].swatchStyle.strokeColor || 
                   layer.metadata.legendItems[0].swatchStyle.fillColor || 
                   '#000000';
  
  // Sanitize to Bauhaus-compliant color
  const color = sanitizeToBauhausColor(rawColor);
  
  switch (layer.id) {
    case 3: // AED Locations
      return <Heart className="w-4 h-4" style={{ color }} />;
    case 11: // Bridges
      return <Cable className="w-4 h-4" style={{ color }} />;
    case 12: // Shrines/Temples
      return <Home className="w-4 h-4" style={{ color }} />;
    case 9: // Flood Depth
      return <MapPin className="w-4 h-4" style={{ color }} />;
    case 6: // Community Centers
      return <Building2 className="w-4 h-4" style={{ color }} />;
    case 10: // Flood Gates
      return <Cable className="w-4 h-4" style={{ color }} />;
    case 13: // Train Stations
      return <Train className="w-4 h-4" style={{ color }} />;
    default:
      return <MapPin className="w-4 h-4" style={{ color }} />;
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

const POI_ICONS = {
  shelter: Home,
  fire_station: Flame,
  hospital: Hospital,
  park: Trees,
  library: Library,
  school: School,
};

const POI_COLORS: Record<string, string> = {
  shelter: '#000000',
  fire_station: '#DC2626',
  hospital: '#DC2626',
  park: '#000000',
  library: '#DC2626',
  school: '#DC2626',
};

// Mock flood hazard zones GeoJSON
const floodZonesGeoJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { name: 'High Risk Zone', level: 'high' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-71.036, 42.366],
          [-71.034, 42.366],
          [-71.033, 42.368],
          [-71.035, 42.369],
          [-71.036, 42.366]
        ]]
      }
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Medium Risk Zone', level: 'medium' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-71.032, 42.370],
          [-71.030, 42.370],
          [-71.029, 42.372],
          [-71.031, 42.373],
          [-71.032, 42.370]
        ]]
      }
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Low Risk Zone', level: 'low' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-71.035, 42.373],
          [-71.033, 42.373],
          [-71.032, 42.375],
          [-71.034, 42.375],
          [-71.035, 42.373]
        ]]
      }
    }
  ]
};

export function MapView({
  pois,
  playerLocation,
  secretShelterId,
  visitedPOIs,
  gameEnded,
  onPOIClick,
  locationPickerMode,
  onLocationPicked,
  basemapUrl = 'mapbox://styles/mapbox/dark-v11'
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
    libraries: true
  });
  const [showLayerControl, setShowLayerControl] = useState(false);
  
  // Koto layer visibility state
  const [kotoLayersVisible, setKotoLayersVisible] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    kotoLayers.forEach(layer => {
      initialState[layer.label] = layer.metadata.loadOnInit;
    });
    return initialState;
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    console.log('Initializing Mapbox map...');
    console.log('Container element:', mapContainer.current);
    console.log('Container dimensions:', {
      width: mapContainer.current.offsetWidth,
      height: mapContainer.current.offsetHeight
    });
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: basemapUrl,
        center: [playerLocation.lng, playerLocation.lat],
        zoom: 14
      });
      
      map.current.on('load', () => {
        console.log('Mapbox map loaded successfully!');
        
        // Add Koto layer sources and layers
        addKotoLayers();
      });
      
      console.log('Mapbox map created successfully');
    } catch (error) {
      console.error('Error initializing Mapbox:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [playerLocation.lng, playerLocation.lat]);

  // Handle location picker mode
  useEffect(() => {
    if (!map.current) return;

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (locationPickerMode && onLocationPicked) {
        const { lng, lat } = e.lngLat;
        onLocationPicked({ lat, lng });
      }
    };

    if (locationPickerMode) {
      map.current.getCanvas().style.cursor = 'crosshair';
      map.current.on('click', handleMapClick);
    } else {
      map.current.getCanvas().style.cursor = '';
    }

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick);
        map.current.getCanvas().style.cursor = '';
      }
    };
  }, [locationPickerMode, onLocationPicked]);

  // Temporarily disable POI markers and player markers for debugging

  const toggleLayer = (layer: keyof typeof layersVisible) => {
    setLayersVisible(prev => ({ ...prev, [layer]: !prev[layer] }));
  };
  
  // Add Koto layers to the map
  const addKotoLayers = () => {
    if (!map.current) return;
    
    try {
      // NOTE: These layers require Mapbox vector tilesets to be configured in Mapbox Studio
      // The tileset IDs below are placeholders and need to be replaced with actual tileset IDs
      // To use these layers:
      // 1. Upload your vector tile data to Mapbox Studio (https://studio.mapbox.com/)
      // 2. Note the tileset IDs for each dataset
      // 3. Update the sourceData.layerId in kotoLayers.ts with your actual tileset IDs
      
      // Track unique sources to avoid duplicates
      const addedSources = new Set<string>();
      
      kotoLayers.forEach(layer => {
        const sourceId = `koto-source-${layer.sourceData.layerId}`;
        const layerId = `koto-layer-${layer.id}`;
        
        // Add source if not already added
        if (!addedSources.has(sourceId) && !map.current!.getSource(sourceId)) {
          const tilesetUrl = getTilesetUrl(layer.sourceData.layerId);
          map.current!.addSource(sourceId, {
            type: 'vector',
            url: tilesetUrl
          });
          addedSources.add(sourceId);
          console.log(`Added source: ${sourceId} with URL: ${tilesetUrl}`);
        }
        
        // Add layer if not already added
        if (!map.current!.getLayer(layerId)) {
          const layerConfig: any = {
            id: layerId,
            type: layer.layerType,
            source: sourceId,
            'source-layer': layer.sourceData.layerName,
            layout: {
              ...layer.style.layout,
              visibility: layer.metadata.loadOnInit ? 'visible' : 'none'
            },
            paint: layer.style.paint
          };
          
          // Add filter if exists
          if (layer.style.filter) {
            layerConfig.filter = layer.style.filter;
          }
          
          map.current!.addLayer(layerConfig);
          console.log(`Added layer: ${layerId}`);
          
          // Add click handler for this layer
          map.current!.on('click', layerId, (e) => {
            if (e.features && e.features[0]) {
              const feature = e.features[0];
              const props = feature.properties || {};
              
              // Build popup HTML with layer info and feature data
              const legendItem = layer.metadata.legendItems[0];
              const popupHeader = `
                <div style="background: rgba(0,0,0,0.8); padding: 12px; border-radius: 8px; min-width: 200px;">
                  <div style="color: #fff; font-weight: bold; margin-bottom: 8px; font-size: 14px;">
                    ${legendItem.label}
                  </div>
                  <div style="color: #ccc; font-size: 12px; margin-bottom: 8px;">
                    ${legendItem.description}
                  </div>
                  <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px;">
              `;
              
              // Format feature data using the query template
              let featureData = layer.metadata.query.template;
              Object.keys(props).forEach(key => {
                featureData = featureData.replace(new RegExp(`{{${key}}}`, 'g'), props[key] || 'N/A');
              });
              
              const popupFooter = '</div></div>';
              const html = popupHeader + featureData + popupFooter;
              
              new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(html)
                .addTo(map.current!);
            }
          });
          
          // Change cursor on hover
          map.current!.on('mouseenter', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
          });
          map.current!.on('mouseleave', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
          });
        }
      });
      
      console.log('Koto layers initialized (Note: tilesets need to be configured in Mapbox Studio)');
    } catch (error) {
      console.warn('Could not add Koto layers - tilesets may not be configured:', error);
    }
  };
  
  // Toggle Koto layer visibility
  const toggleKotoLayer = (label: string) => {
    if (!map.current) return;
    
    const layer = kotoLayers.find(l => l.label === label);
    if (!layer) return;
    
    const layerId = `koto-layer-${layer.id}`;
    const newVisibility = !kotoLayersVisible[label];
    
    if (map.current.getLayer(layerId)) {
      map.current.setLayoutProperty(
        layerId,
        'visibility',
        newVisibility ? 'visible' : 'none'
      );
      
      setKotoLayersVisible(prev => ({
        ...prev,
        [label]: newVisibility
      }));
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] z-0">
      <div ref={mapContainer} className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }} />

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
        <Layers className="w-5 h-5 text-black" />
      </motion.button>

      {/* Koto Layer Control Panel */}
      <AnimatePresence>
        {showLayerControl && (
          <motion.div
            className="absolute top-16 left-4 bg-white border-4 border-black p-4 space-y-3 z-10 min-w-[220px]"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
          >
            <div className="text-black mb-2 font-bold uppercase">Koto Layers</div>
            
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
              <span className="text-black text-sm font-bold uppercase">Koto, Tokyo Layers</span>
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
                  const swatchColor = legendItem.swatchStyle.strokeColor || legendItem.swatchStyle.fillColor || '#000000';
                  const swatchClasses = legendItem.swatchType === 'symbol' || legendItem.swatchType === 'line' 
                    ? 'rounded-full' 
                    : '';
                  
                  return (
                    <div key={`${layer.id}-${itemIndex}`} className="flex items-center gap-2 text-xs text-black mb-2">
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
  onChange 
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
    case 'shelter':
      return '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>';
    case 'fire_station':
      return '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>';
    case 'hospital':
      return '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>';
    case 'park':
      return '<path d="M12 12c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm7-1c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-14 0c1.66 0 3-1.34 3-3S6.66 5 5 5 2 6.34 2 8s1.34 3 3 3zm7-8c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z"></path>';
    case 'library':
      return '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>';
    case 'school':
      return '<path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path>';
    default:
      return '<circle cx="12" cy="12" r="10"></circle>';
  }
}
