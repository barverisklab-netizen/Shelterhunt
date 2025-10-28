import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Home, Flame, Hospital, Trees, Library, School, Layers } from 'lucide-react';
import { POI } from '../data/mockData';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJZOUR1cl9VIn0.EH5JnIHj5vAqroV5IMSmcw'; // Replace with your actual token

interface MapViewProps {
  pois: POI[];
  playerLocation: { lat: number; lng: number };
  secretShelterId: string;
  visitedPOIs: string[];
  gameEnded?: boolean;
  onPOIClick?: (poi: POI) => void;
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
  onPOIClick
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

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [playerLocation.lng, playerLocation.lat],
      zoom: 14,
      pitch: 0,
      bearing: 0
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add flood zones layer
      map.current.addSource('flood-zones', {
        type: 'geojson',
        data: floodZonesGeoJSON
      });

      map.current.addLayer({
        id: 'flood-zones-fill',
        type: 'fill',
        source: 'flood-zones',
        paint: {
          'fill-color': [
            'match',
            ['get', 'level'],
            'high', '#ef4444',
            'medium', '#f59e0b',
            'low', '#eab308',
            '#666666'
          ],
          'fill-opacity': 0.3
        }
      });

      map.current.addLayer({
        id: 'flood-zones-outline',
        type: 'line',
        source: 'flood-zones',
        paint: {
          'line-color': [
            'match',
            ['get', 'level'],
            'high', '#dc2626',
            'medium', '#d97706',
            'low', '#ca8a04',
            '#555555'
          ],
          'line-width': 2,
          'line-opacity': 0.8
        }
      });

      // Add labels for flood zones
      map.current.addLayer({
        id: 'flood-zones-labels',
        type: 'symbol',
        source: 'flood-zones',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 12,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1
        }
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update POI markers
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};

    // Add new markers
    pois.forEach((poi) => {
      const isVisited = visitedPOIs.includes(poi.id);
      const isSecret = poi.id === secretShelterId && gameEnded;
      const shouldShow = 
        (poi.type === 'shelter' && layersVisible.shelters) ||
        (poi.type === 'school' && layersVisible.schools) ||
        (poi.type === 'fire_station' && layersVisible.fireStations) ||
        (poi.type === 'hospital' && layersVisible.hospitals) ||
        (poi.type === 'park' && layersVisible.parks) ||
        (poi.type === 'library' && layersVisible.libraries);

      if (!shouldShow) return;

      const el = document.createElement('div');
      el.className = 'poi-marker';
      el.style.width = '48px';
      el.style.height = '48px';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div style="
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${isVisited ? `
            <div style="
              position: absolute;
              inset: 0;
              border-radius: 50%;
              background: rgba(34, 211, 238, 0.3);
              filter: blur(8px);
              animation: pulse 2s infinite;
            "></div>
          ` : ''}
          ${isSecret ? `
            <div style="
              position: absolute;
              inset: 0;
              border-radius: 50%;
              background: rgba(74, 222, 128, 0.5);
              filter: blur(12px);
              animation: pulse 1.5s infinite;
            "></div>
          ` : ''}
          <div style="
            position: relative;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 50%;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            ${isSecret ? 'box-shadow: 0 0 20px rgba(74, 222, 128, 0.5);' : 'box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);'}
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${POI_COLORS[poi.type]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${getIconSVG(poi.type)}
            </svg>
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        onPOIClick?.(poi);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([poi.lng, poi.lat])
        .addTo(map.current!);

      // Add popup
      const popup = new mapboxgl.Popup({ offset: 25, className: 'poi-popup' })
        .setHTML(`
          <div style="
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 12px;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
          ">
            <strong>${poi.name}</strong>
            ${isSecret ? '<br/><span style="color: #4ade80;">★ SECRET SHELTER</span>' : ''}
          </div>
        `);

      marker.setPopup(popup);
      markers.current[poi.id] = marker;
    });
  }, [pois, visitedPOIs, gameEnded, secretShelterId, onPOIClick, layersVisible]);

  // Update player marker
  useEffect(() => {
    if (!map.current) return;

    if (playerMarker.current) {
      playerMarker.current.setLngLat([playerLocation.lng, playerLocation.lat]);
    } else {
      const el = document.createElement('div');
      el.style.width = '40px';
      el.style.height = '40px';
      el.innerHTML = `
        <div style="
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: rgba(96, 165, 250, 0.5);
            filter: blur(16px);
            animation: pulse 2s infinite;
          "></div>
          <div style="
            position: relative;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 50%;
            padding: 8px;
            border: 2px solid #60a5fa;
          ">
            <div style="
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #60a5fa;
            "></div>
          </div>
          <div style="
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 2px solid rgba(96, 165, 250, 0.3);
            animation: ripple 2s infinite;
          "></div>
        </div>
      `;

      playerMarker.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([playerLocation.lng, playerLocation.lat])
        .addTo(map.current);
    }

    // Pan map to player location
    map.current.panTo([playerLocation.lng, playerLocation.lat]);
  }, [playerLocation]);

  // Toggle layer visibility
  useEffect(() => {
    if (!map.current) return;

    if (map.current.getLayer('flood-zones-fill')) {
      map.current.setLayoutProperty(
        'flood-zones-fill',
        'visibility',
        layersVisible.floods ? 'visible' : 'none'
      );
      map.current.setLayoutProperty(
        'flood-zones-outline',
        'visibility',
        layersVisible.floods ? 'visible' : 'none'
      );
      map.current.setLayoutProperty(
        'flood-zones-labels',
        'visibility',
        layersVisible.floods ? 'visible' : 'none'
      );
    }
  }, [layersVisible.floods]);

  const toggleLayer = (layer: keyof typeof layersVisible) => {
    setLayersVisible(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-2xl overflow-hidden" />

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

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 glass-card rounded-xl p-3 space-y-2 z-10">
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
      </div>
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
