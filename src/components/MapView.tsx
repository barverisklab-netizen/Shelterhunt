import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Home, Flame, Hospital, Trees, Library, School, Layers } from 'lucide-react';
import { POI } from '../data/mockData';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox access token from environment variable
const token = import.meta.env.VITE_MAPBOX_TOKEN as string;
console.log('Mapbox token loaded:', token ? 'Yes' : 'No', token?.substring(0, 10) + '...');
mapboxgl.accessToken = token;

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

      {/* Layer Control Panel */}
      <AnimatePresence>
        {showLayerControl && (
          <motion.div
            className="absolute top-16 left-4 glass-card rounded-2xl p-4 space-y-3 z-10 min-w-[200px]"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
          >
            <div className="text-white/90 mb-2">Map Layers</div>
            
            <LayerToggle
              label="Flood Zones"
              icon={<MapPin className="w-4 h-4 text-orange-400" />}
              checked={layersVisible.floods}
              onChange={() => toggleLayer('floods')}
            />
            
            <LayerToggle
              label="Shelters"
              icon={<Home className="w-4 h-4 text-purple-400" />}
              checked={layersVisible.shelters}
              onChange={() => toggleLayer('shelters')}
            />
            
            <LayerToggle
              label="Schools"
              icon={<School className="w-4 h-4 text-yellow-400" />}
              checked={layersVisible.schools}
              onChange={() => toggleLayer('schools')}
            />
            
            <LayerToggle
              label="Fire Stations"
              icon={<Flame className="w-4 h-4 text-red-400" />}
              checked={layersVisible.fireStations}
              onChange={() => toggleLayer('fireStations')}
            />
            
            <LayerToggle
              label="Hospitals"
              icon={<Hospital className="w-4 h-4 text-blue-400" />}
              checked={layersVisible.hospitals}
              onChange={() => toggleLayer('hospitals')}
            />
            
            <LayerToggle
              label="Parks"
              icon={<Trees className="w-4 h-4 text-green-400" />}
              checked={layersVisible.parks}
              onChange={() => toggleLayer('parks')}
            />
            
            <LayerToggle
              label="Libraries"
              icon={<Library className="w-4 h-4 text-cyan-400" />}
              checked={layersVisible.libraries}
              onChange={() => toggleLayer('libraries')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Legend - Minimizable */}
      <AnimatePresence>
        {showLayerControl ? (
          <motion.div
            className="absolute bottom-20 left-4 glass-card rounded-xl p-3 space-y-2 z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/90 text-sm font-semibold">Legend</span>
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
            <div className="flex items-center gap-2 text-xs text-white/90">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <span>High Risk Flood</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <div className="w-3 h-3 rounded-full bg-orange-500/50" />
              <span>Medium Risk</span>
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
