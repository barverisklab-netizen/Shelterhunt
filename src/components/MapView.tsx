import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Home, Flame, Hospital, Trees, Library, School, Layers, Heart, Building2, Cable, Train } from 'lucide-react';
import { POI } from '../data/mockData';
import { kotoLayers } from '../types/kotoLayers';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox access token from environment variable
const token = import.meta.env.VITE_MAPBOX_TOKEN as string;
console.log('Mapbox token loaded:', token ? 'Yes' : 'No', token?.substring(0, 10) + '...');
mapboxgl.accessToken = token;

// Helper function to get icons for Koto layers
const getKotoLayerIcon = (label: string): React.ReactNode => {
  switch (label) {
    case 'AED Locations':
      return <Heart className="w-4 h-4 text-red-400" />;
    case 'Bridges':
      return <Cable className="w-4 h-4 text-blue-400" />;
    case 'Shrines/Temples':
      return <Home className="w-4 h-4 text-purple-400" />;
    case 'Flood Depth':
      return <MapPin className="w-4 h-4 text-orange-400" />;
    case 'Community Centers':
      return <Building2 className="w-4 h-4 text-cyan-400" />;
    case 'Flood Gates':
      return <Cable className="w-4 h-4 text-indigo-400" />;
    case 'Train Stations':
      return <Train className="w-4 h-4 text-green-400" />;
    default:
      return <MapPin className="w-4 h-4 text-gray-400" />;
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
  shelter: '#c084fc',
  fire_station: '#f87171',
  hospital: '#60a5fa',
  park: '#4ade80',
  library: '#22d3ee',
  school: '#facc15',
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
  onLocationPicked
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
        style: 'mapbox://styles/mapbox/dark-v11',
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
          // WARNING: This tileset URL is a placeholder
          // Replace 'YOUR_MAPBOX_USERNAME' and the tileset ID with your actual values
          map.current!.addSource(sourceId, {
            type: 'vector',
            url: `mapbox://YOUR_MAPBOX_USERNAME.${layer.sourceData.layerId}`
          });
          addedSources.add(sourceId);
          console.log(`Added source: ${sourceId}`);
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
              
              // Format HTML using the query template
              let html = layer.metadata.query.template;
              Object.keys(props).forEach(key => {
                html = html.replace(new RegExp(`{{${key}}}`, 'g'), props[key] || 'N/A');
              });
              
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
        className="absolute top-4 left-4 glass-strong rounded-2xl p-3 shadow-glow hover:scale-105 transition-transform z-10"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Layers className="w-5 h-5 text-white" />
      </motion.button>

      {/* Koto Layer Control Panel */}
      <AnimatePresence>
        {showLayerControl && (
          <motion.div
            className="absolute top-16 left-4 glass-card rounded-2xl p-4 space-y-3 z-10 min-w-[220px]"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
          >
            <div className="text-white/90 mb-2 font-semibold">Koto Layers</div>
            
            {kotoLayers.map((layer) => (
              <LayerToggle
                key={layer.id}
                label={layer.label}
                icon={getKotoLayerIcon(layer.label)}
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
            className="absolute bottom-20 left-4 glass-card rounded-xl p-3 space-y-2 z-10 max-h-[60vh] overflow-y-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/90 text-sm font-semibold">Koto, Tokyo Layers</span>
              <button
                onClick={() => setShowLayerControl(false)}
                className="text-white/60 hover:text-white/90 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <div className="w-3 h-3 rounded-full bg-blue-400" />
              <span>Your Location</span>
            </div>
            <div className="border-t border-white/10 my-2"></div>
            <div className="text-xs text-white/70 font-semibold mb-1">Flood Zones</div>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <div className="w-3 h-3 bg-[#fc0303]" />
              <span>8-10m+ depth</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <div className="w-3 h-3 bg-[#fb8783]" />
              <span>6-8m depth</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <div className="w-3 h-3 bg-[#f98f48]" />
              <span>4-6m depth</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <div className="w-3 h-3 bg-[hsl(31,100%,65%)]" />
              <span>2-4m depth</span>
            </div>
            <div className="border-t border-white/10 my-2"></div>
            <div className="text-xs text-white/70 font-semibold mb-1">Infrastructure</div>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <div className="w-3 h-3 rounded-full bg-cyan-400" />
              <span>Train Stations</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <div className="w-3 h-3 rounded-full bg-blue-400" />
              <span>Bridges</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <div className="w-3 h-3 rounded-full bg-indigo-400" />
              <span>Flood Gates</span>
            </div>
            <div className="border-t border-white/10 my-2"></div>
            <div className="text-xs text-white/70 font-semibold mb-1">Emergency</div>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span>AED Locations</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <div className="w-3 h-3 rounded-full bg-orange-400" />
              <span>Community Centers</span>
            </div>
            <div className="border-t border-white/10 my-2"></div>
            <div className="text-xs text-white/70 font-semibold mb-1">Cultural</div>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <div className="w-3 h-3 rounded-full bg-purple-400" />
              <span>Shrines/Temples</span>
            </div>
            <div className="text-xs text-white/60 mt-3 italic">
              Note: Actual layer data requires Mapbox tileset configuration
            </div>
          </motion.div>
        ) : (
          <motion.button
            onClick={() => setShowLayerControl(true)}
            className="absolute bottom-20 left-4 glass-card rounded-xl p-3 z-10 text-white/90 hover:text-white transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <span className="text-sm font-semibold">Legend</span>
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
    <label className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-lg p-2 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded accent-cyan-400"
      />
      {icon}
      <span className="text-sm text-white/80">{label}</span>
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
