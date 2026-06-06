'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Filter, X, Layers, Map as MapIcon } from 'lucide-react';

// ============================================
// IMPORT CSS
// ============================================
// @ts-ignore
import 'leaflet/dist/leaflet.css';

// ============================================
// PROTECTION SSR POUR LEAFLET
// ============================================
let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  require('leaflet.heat');

  const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
  L.Marker.prototype.options.icon = DefaultIcon;
}

// ============================================
// TYPES
// ============================================
type MapTheme = 'light' | 'dark' | 'satellite';

interface MapComponentProps {
  panneaux: any[];
  onMarkerClick: (panneau: any) => void;
}

// ============================================
// CONFIGURATION DES TUILES PAR THÈME
// ============================================
const tileConfig = {
  
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & <a href="https://carto.com/">CARTO</a>'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & <a href="https://carto.com/">CARTO</a>'
  }
};

// ============================================
// LOGIQUE DE STATUT
// ============================================

const getFaceStatus = (face: any): { status: string; label: string } => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const currentRes = face.reservations?.find((res: any) => {
    const debut = new Date(res.dateDebut);
    const fin = new Date(res.dateFin);
    debut.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    return now >= debut && now <= fin;
  });

  if (currentRes) {
    const statut = currentRes.statut?.toLowerCase();
    if (statut === 'occupé') return { status: 'occupe', label: 'Occupé' };
    if (statut === 'réservé') return { status: 'reserve', label: 'Réservé' };
    return { status: 'occupe', label: 'Occupé' };
  }

  return { status: 'libre', label: 'Libre' };
};

const getPanneauStatus = (faces: any[]): { status: string; label: string } => {
  if (!faces || faces.length === 0) {
    return { status: 'maintenance', label: 'Maintenance' };
  }

  let hasOccupe = false;
  let hasReserve = false;
  let hasLibre = false;

  for (const face of faces) {
    const { status } = getFaceStatus(face);
    if (status === 'occupe') hasOccupe = true;
    if (status === 'reserve') hasReserve = true;
    if (status === 'libre') hasLibre = true;
  }

  if (hasOccupe) return { status: 'occupe', label: 'Occupé' };
  if (hasReserve) return { status: 'reserve', label: 'Réservé' };
  if (hasLibre) return { status: 'libre', label: 'Libre' };
  
  return { status: 'maintenance', label: 'Maintenance' };
};

// ============================================
// STYLES DES MARQUEURS
// ============================================
const getMarkerStyle = (status: string) => {
  const styles: Record<string, { color: string; glow: string; label: string }> = {
    libre: { color: '#10B981', glow: 'rgba(16, 185, 129, 0.3)', label: 'Libre' },
    occupe: { color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.3)', label: 'Occupé' },
    reserve: { color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.3)', label: 'Réservé' },
    maintenance: { color: '#EF4444', glow: 'rgba(239, 68, 68, 0.3)', label: 'Maintenance' }
  };
  return styles[status] || styles['maintenance'];
};

const createCustomIcon = (color: string, isLibre: boolean) => {
  if (typeof window === 'undefined' || !L) return null;
  
  const pulseAnimation = isLibre ? `
    <div style="
      position: absolute;
      width: 28px;
      height: 28px;
      background-color: ${color};
      border-radius: 50%;
      opacity: 0.4;
      top: -7px;
      left: -7px;
      animation: pulse 1.5s infinite;
    "></div>
  ` : '';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative; width: 14px; height: 14px;">
        ${pulseAnimation}
        <div style="
          position: absolute;
          width: 14px;
          height: 14px;
          background-color: ${color};
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 8px rgba(0,0,0,0.3);
          transition: transform 0.2s ease;
        "></div>
      </div>
    `,
    iconSize: [14, 14],
    popupAnchor: [0, -7],
  });
};

// ============================================
// COMPOSANT DE CONTRÔLE
// ============================================
function MapController({ theme }: { theme: MapTheme }) {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      map.invalidateSize();
    }
  }, [map, theme]);
  
  return null;
}

// ============================================
// COMPOSANT PRINCIPAL MAP
// ============================================
export default function MapComponent({ panneaux, onMarkerClick }: MapComponentProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<MapTheme>('satellite');
  const [activeFilters, setActiveFilters] = useState({
    libre: true,
    occupe: true,
    reserve: true,
    maintenance: true
  });
  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(true);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const center: [number, number] = [-4.3276, 15.3136];
  
  const filteredPanneaux = panneaux.filter((panneau: any) => {
    const { status } = getPanneauStatus(panneau.faces);
    return activeFilters[status as keyof typeof activeFilters];
  });
  
  const stats = {
    total: filteredPanneaux.length,
    libre: panneaux.filter((p: any) => getPanneauStatus(p.faces).status === 'libre').length,
    occupe: panneaux.filter((p: any) => getPanneauStatus(p.faces).status === 'occupe').length,
    reserve: panneaux.filter((p: any) => getPanneauStatus(p.faces).status === 'reserve').length,
    maintenance: panneaux.filter((p: any) => getPanneauStatus(p.faces).status === 'maintenance').length
  };
  
  // État de chargement avec PHOTO DE FOND
  if (!isMounted) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        {/* IMAGE DE FOND */}
        <div className="absolute inset-0 z-0">
          <img
            src="/fond.jpg"
            alt="Background"
            className="w-full h-full object-cover opacity-40 dark:opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 to-gray-200/50 dark:from-[#0a1628]/80 dark:to-[#0d1f3c]/80" />
        </div>
        
        
      </div>
    );
  }
  
  const currentTile = tileConfig[theme];
  
  return (
    <div className="relative h-full w-full">
      {/* PANEL DE THÈMES */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-1.5 flex gap-1">
        <button
          onClick={() => setTheme('light')}
          className={`p-2 rounded-xl transition-all duration-300 ${theme === 'light' ? 'bg-amber-500 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          title="Mode Clair"
        >
          <Sun size={16} />
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`p-2 rounded-xl transition-all duration-300 ${theme === 'dark' ? 'bg-amber-500 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          title="Mode Sombre"
        >
          <Moon size={16} />
        </button>
        <button
          onClick={() => setTheme('satellite')}
          className={`p-2 rounded-xl transition-all duration-300 ${theme === 'satellite' ? 'bg-amber-500 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          title="Satellite"
        >
          <MapIcon size={16} />
        </button>
      </div>
      
      {/* BOUTON FILTRES */}
      <button
        onClick={() => setIsFilterPanelVisible(!isFilterPanelVisible)}
        className="absolute top-4 right-4 z-[1000] bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-2.5 text-white/80 hover:text-amber-400 transition-all"
        title="Filtres"
      >
        <Filter size={18} />
      </button>
      
      {/* PANEL FILTRES */}
      <AnimatePresence>
        {isFilterPanelVisible && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute top-16 right-4 z-[1000] bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-4 min-w-[180px]"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={12} /> Filtres
              </h3>
              <button
                onClick={() => setIsFilterPanelVisible(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition"
              >
                <X size={12} />
              </button>
            </div>
            
            <div className="space-y-2">
              <FilterOption
                label="Libre"
                count={stats.libre}
                color="bg-emerald-500"
                active={activeFilters.libre}
                onToggle={() => setActiveFilters({ ...activeFilters, libre: !activeFilters.libre })}
              />
              <FilterOption
                label="Occupé"
                count={stats.occupe}
                color="bg-blue-500"
                active={activeFilters.occupe}
                onToggle={() => setActiveFilters({ ...activeFilters, occupe: !activeFilters.occupe })}
              />
              <FilterOption
                label="Réservé"
                count={stats.reserve}
                color="bg-amber-500"
                active={activeFilters.reserve}
                onToggle={() => setActiveFilters({ ...activeFilters, reserve: !activeFilters.reserve })}
              />
              <FilterOption
                label="Maintenance"
                count={stats.maintenance}
                color="bg-red-500"
                active={activeFilters.maintenance}
                onToggle={() => setActiveFilters({ ...activeFilters, maintenance: !activeFilters.maintenance })}
              />
            </div>
            
            <div className="mt-3 pt-2 border-t border-white/10">
              <p className="text-[8px] text-white/40 text-center">
                {stats.total} panneau(x) affiché(s)
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* CARTE */}
      <MapContainer
        key={theme}
        center={center}
        zoom={12}
        zoomControl={true}
        attributionControl={true}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer 
          url={currentTile.url}
          attribution={currentTile.attribution}
        />
        
        <MapController theme={theme} />
        
        {filteredPanneaux.map((panneau: any, index: number) => {
          let lat = panneau.coords?.[0] || panneau.gps_raw?.lat;
          let lng = panneau.coords?.[1] || panneau.gps_raw?.lng;
          
          lat = typeof lat === 'string' ? parseFloat(lat) : lat;
          lng = typeof lng === 'string' ? parseFloat(lng) : lng;
          
          if (isNaN(lat) || isNaN(lng) || !lat || !lng) return null;
          if (lat < -4.5 || lat > -4.2 || lng < 15.2 || lng > 15.5) return null;
          
          const { status } = getPanneauStatus(panneau.faces);
          const { color } = getMarkerStyle(status);
          const isLibre = status === 'libre';
          const customIcon = createCustomIcon(color, isLibre);
          
          if (!customIcon) return null;
          
          return (
            <Marker
              key={panneau.id || index}
              position={[lat, lng]}
              icon={customIcon}
              eventHandlers={{ click: () => onMarkerClick(panneau) }}
            />
          );
        })}
      </MapContainer>
      
      {/* LÉGENDE */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-2">
        <div className="flex gap-3 text-[8px] font-black uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white/80">Libre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-white/80">Occupé</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-white/80">Réservé</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-white/80">Maintenance</span>
          </div>
        </div>
      </div>
      
      {/* STYLES */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.5); opacity: 0.1; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// FILTER OPTION
// ============================================
function FilterOption({ label, count, color, active, onToggle }: any) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between p-2 rounded-xl transition-all duration-200 ${active ? 'bg-white/10' : 'opacity-40'}`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color} ${active ? 'animate-pulse' : ''}`} />
        <span className="text-[10px] font-bold text-white uppercase">{label}</span>
      </div>
      <span className="text-[8px] font-black text-white/60 bg-white/10 px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    </button>
  );
}