'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Tooltip, Circle } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Filter, X, Layers, Map as MapIcon, Navigation, Info, Search, RotateCcw } from 'lucide-react';

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
}

// ============================================
// TYPES
// ============================================
type MapTheme = 'light' | 'dark' | 'satellite';

interface MapComponentProps {
  panneaux: any[];
  onMarkerClick: (panneau: any) => void;
  userLocation?: { lat: number; lng: number } | null; // ← AJOUTEZ CETTE LIGNE

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
// LOGIQUE DE STATUT DES FACES
// ============================================
const getFaceStatus = (face: any): { status: string; label: string } => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const reservations = face.reservations || [];

  const activeRes = reservations.find((res: any) => {
    const debut = new Date(res.dateDebut);
    const fin = new Date(res.dateFin);
    debut.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    return now >= debut && now <= fin;
  });

  if (activeRes) {
    const statut = activeRes.statut?.toLowerCase();
    if (statut === 'occupé') return { status: 'occupe', label: 'Occupé' };
    if (statut === 'réservé') return { status: 'reserve', label: 'Réservé' };
    return { status: 'occupe', label: 'Occupé' };
  }

  return { status: 'libre', label: 'Libre' };
};

// ============================================
// LOGIQUE DE STATUT DU PANNEAU
// ============================================
const getPanneauStatus = (faces: any[]): { status: string; label: string; color: string; stats: any } => {
  if (!faces || faces.length === 0) {
    return {
      status: 'maintenance',
      label: 'Maintenance',
      color: '#EF4444',
      stats: { libre: 0, occupe: 0, reserve: 0, maintenance: 0, total: 0 }
    };
  }

  const stats = {
    libre: 0,
    occupe: 0,
    reserve: 0,
    maintenance: 0,
    total: faces.length
  };

  for (const face of faces) {
    const { status } = getFaceStatus(face);
    if (status === 'libre') stats.libre++;
    if (status === 'occupe') stats.occupe++;
    if (status === 'reserve') stats.reserve++;
    if (status === 'maintenance') stats.maintenance++;
  }

  // Règle 1: Toutes libres → VERT
  if (stats.libre === stats.total) {
    return { status: 'libre', label: 'Libre', color: '#10B981', stats };
  }

  // Règle 2: Toutes occupées → BLEU
  if (stats.occupe === stats.total) {
    return { status: 'occupe', label: 'Occupé', color: '#3B82F6', stats };
  }

  // Règle 3: Toutes réservées → JAUNE
  if (stats.reserve === stats.total) {
    return { status: 'reserve', label: 'Réservé', color: '#F59E0B', stats };
  }

  // Règle 4: Toutes maintenance → ROUGE
  if (stats.maintenance === stats.total) {
    return { status: 'maintenance', label: 'Maintenance', color: '#EF4444', stats };
  }

  // Cas mixtes: Priorité Libre > Réservé > Occupé > Maintenance
  if (stats.libre > 0) {
    return { status: 'libre', label: 'Libre', color: '#10B981', stats };
  }

  if (stats.reserve > 0) {
    return { status: 'reserve', label: 'Réservé', color: '#F59E0B', stats };
  }

  if (stats.occupe > 0) {
    return { status: 'occupe', label: 'Occupé', color: '#3B82F6', stats };
  }

  return { status: 'maintenance', label: 'Maintenance', color: '#EF4444', stats };
};

// ============================================
// CRÉATION DE L'ICÔNE PIN SVG
// ============================================
const createCustomIcon = (color: string, status: string, isLibre: boolean) => {
  if (typeof window === 'undefined' || !L) return null;

  const width = isLibre ? 34 : 30;
  const height = isLibre ? 44 : 40;

  const pulseAnimation = isLibre ? `
    <div style="
      position: absolute;
      width: ${width + 10}px;
      height: ${height + 10}px;
      background-color: ${color};
      border-radius: 50%;
      opacity: 0.3;
      top: -${height / 2 + 5}px;
      left: -${width / 2 + 5}px;
      animation: pulse 1.8s infinite;
      z-index: 0;
    "></div>
  ` : '';

  const shadow = `
    <div style="
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: ${width - 8}px;
      height: 8px;
      background: rgba(0,0,0,0.25);
      border-radius: 50%;
      filter: blur(3px);
      z-index: 0;
    "></div>
  `;

  const pinSvg = `
    <svg 
      width="${width}" 
      height="${height}" 
      viewBox="0 0 24 35" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style="
        filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));
        transition: transform 0.2s ease, filter 0.2s ease;
        cursor: pointer;
      "
      class="marker-pin"
    >
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path 
        d="M12 0C7.58 0 4 3.58 4 8c0 6 8 14 8 14s8-8 8-14c0-4.42-3.58-8-8-8z" 
        fill="${color}" 
        stroke="white" 
        stroke-width="2"
        filter="${isLibre ? 'url(#glow)' : ''}"
      />
      <circle 
        cx="12" 
        cy="8" 
        r="4" 
        fill="white" 
        stroke="${color}" 
        stroke-width="1.5"
      />
      <circle 
        cx="12" 
        cy="8" 
        r="2" 
        fill="${color}"
      />
    </svg>
  `;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative; width: ${width}px; height: ${height + 12}px;">
        ${pulseAnimation}
        ${shadow}
        <div style="position: relative; z-index: 1;">
          ${pinSvg}
        </div>
      </div>
    `,
    iconSize: [width, height + 12],
    popupAnchor: [0, -height / 2],
    tooltipAnchor: [0, -height],
  });
};

// ============================================
// COMPOSANT POPUP PERSONNALISÉE
// ============================================
const CustomPopupContent = ({ panneau, status, stats, onMarkerClick, zoomToPanneau }: any) => {
  const getStatusLabel = () => {
    if (status === 'libre') return 'Libre';
    if (status === 'occupe') return 'Occupé';
    if (status === 'reserve') return 'Réservé';
    return 'Maintenance';
  };

  const getStatusColor = () => {
    if (status === 'libre') return 'from-green-600 to-green-500';
    if (status === 'occupe') return 'from-blue-600 to-blue-500';
    if (status === 'reserve') return 'from-amber-600 to-amber-500';
    return 'from-red-600 to-red-500';
  };

  return (
    <div className="min-w-[220px] overflow-hidden">
      <div className={`px-3 py-2 bg-gradient-to-r ${getStatusColor()} text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation size={14} className="text-white" />
            <h3 className="text-sm font-black uppercase tracking-wider">
              {panneau.idPan}
            </h3>
          </div>
          <div className={`w-2 h-2 rounded-full bg-white ${status === 'libre' ? 'animate-pulse' : ''}`} />
        </div>
      </div>

      <div className="p-3 bg-white">
        <p className="text-[9px] text-gray-500 font-medium mb-2 truncate max-w-[200px]">
          📍 {panneau.adresse}
        </p>

        <div className="flex gap-2 mb-2 pb-2 border-b border-gray-100">
          {stats.libre > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[7px] font-bold text-gray-600">{stats.libre}</span>
            </div>
          )}
          {stats.occupe > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[7px] font-bold text-gray-600">{stats.occupe}</span>
            </div>
          )}
          {stats.reserve > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[7px] font-bold text-gray-600">{stats.reserve}</span>
            </div>
          )}
          {stats.maintenance > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[7px] font-bold text-gray-600">{stats.maintenance}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${status === 'libre' ? 'bg-green-500 animate-pulse' : status === 'occupe' ? 'bg-blue-500' : status === 'reserve' ? 'bg-amber-500' : 'bg-red-500'}`} />
            <span className="text-[8px] font-bold uppercase text-gray-600">
              {getStatusLabel()}
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => zoomToPanneau(panneau)}
              className="text-[7px] font-black bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-1 rounded-full hover:shadow-md transition-all active:scale-95"
              title="Zoom sur le panneau"
            >
              🔍 Zoom
            </button>
            <button
              onClick={() => onMarkerClick(panneau)}
              className="text-[7px] font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-2 py-1 rounded-full hover:shadow-md transition-all active:scale-95"
            >
              Détails
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



// ============================================
// COMPOSANT DE CONTRÔLE DE LA CARTE
// ============================================
function MapController({ theme, onMapReady }: { theme: MapTheme; onMapReady: (map: any) => void }) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      map.invalidateSize();
      onMapReady(map);
    }
  }, [map, theme, onMapReady]);

  return null;
}

// ============================================
// COMPOSANT FILTER OPTION
// ============================================
function FilterOption({ label, count, active, onToggle }: any) {
  const getColorClass = () => {
    if (label === 'Libre') return 'bg-green-500';
    if (label === 'Occupé') return 'bg-blue-500';
    if (label === 'Réservé') return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between p-2 rounded-xl transition-all duration-200 ${active ? 'bg-white/15' : 'opacity-40'}`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getColorClass()} ${active ? 'animate-pulse' : ''}`} />
        <span className="text-[10px] font-bold text-white uppercase">{label}</span>
      </div>
      <span className="text-[8px] font-black text-white/60 bg-white/10 px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    </button>
  );
}

// ============================================
// COMPOSANT PRINCIPAL MAP
// ============================================
export default function MapComponent({ panneaux, onMarkerClick, userLocation }: MapComponentProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [theme, setTheme] = useState<MapTheme>('satellite');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [searchAddress, setSearchAddress] = useState('');
  const [activeAddressFilter, setActiveAddressFilter] = useState('');

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

  useEffect(() => {
    if (panneaux.length > 0) {
      setIsLoadingData(false);
      setLastUpdate(new Date());
    }
  }, [panneaux]);

  const center: [number, number] = [-4.3276, 15.3136];

  // Filtrer par statut et par adresse
  const filteredPanneaux = panneaux.filter((panneau: any) => {
    const { status } = getPanneauStatus(panneau.faces);
    const matchStatus = activeFilters[status as keyof typeof activeFilters];
    const matchAddress = !activeAddressFilter ||
      panneau.adresse?.toLowerCase().includes(activeAddressFilter.toLowerCase());
    return matchStatus && matchAddress;
  });

  const allStats = {
    total: filteredPanneaux.length,
    libre: panneaux.filter((p: any) => getPanneauStatus(p.faces).status === 'libre').length,
    occupe: panneaux.filter((p: any) => getPanneauStatus(p.faces).status === 'occupe').length,
    reserve: panneaux.filter((p: any) => getPanneauStatus(p.faces).status === 'reserve').length,
    maintenance: panneaux.filter((p: any) => getPanneauStatus(p.faces).status === 'maintenance').length
  };

  // Fonction pour zoomer sur un panneau
  const zoomToPanneau = (panneau: any) => {
    if (mapInstance) {
      let lat = panneau.coords?.[0] || panneau.gps_raw?.lat;
      let lng = panneau.coords?.[1] || panneau.gps_raw?.lng;
      lat = typeof lat === 'string' ? parseFloat(lat) : lat;
      lng = typeof lng === 'string' ? parseFloat(lng) : lng;
      if (!isNaN(lat) && !isNaN(lng)) {
        mapInstance.setView([lat, lng], 18);
      }
    }
  };

  // Fonction pour rechercher par adresse
  const searchByAddress = () => {
    if (searchAddress.trim()) {
      setActiveAddressFilter(searchAddress.trim());
    }
  };

  // Fonction pour réinitialiser le filtre d'adresse
  const resetAddressFilter = () => {
    setSearchAddress('');
    setActiveAddressFilter('');
  };

  if (!isMounted) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center animate-pulse">
              <MapIcon size={32} className="text-amber-500" />
            </div>
            <p className="mt-4 text-white/60 text-sm font-bold uppercase tracking-wider">
              Chargement de la carte...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentTile = tileConfig[theme];

  return (
    <div className="relative h-full w-full">
      {/* Indicateur de chargement des données */}
      {isLoadingData && (
        <div className="absolute inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-white/80 text-[10px] font-bold">Chargement des panneaux...</p>
          </div>
        </div>
      )}

      {/* Dernière mise à jour */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-black/40 backdrop-blur-xl rounded-xl px-2 py-1">
        <p className="text-[6px] text-white/40">
          Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
        </p>
      </div>

      {/* PANEL DE RECHERCHE PAR ADRESSE */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-1.5 min-w-[200px] sm:min-w-[300px]">
        <div className="flex items-center gap-1">
          <Search size={14} className="text-amber-400 ml-1" />
          <input
            type="text"
            placeholder="Filtrer par adresse..."
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchByAddress()}
            className="bg-transparent text-white text-[10px] sm:text-[11px] font-medium px-2 py-1.5 outline-none flex-1 placeholder:text-white/40"
          />
          {activeAddressFilter && (
            <button
              onClick={resetAddressFilter}
              className="p-1 hover:bg-white/10 rounded-lg transition"
              title="Réinitialiser"
            >
              <RotateCcw size={12} className="text-amber-400" />
            </button>
          )}
          <button
            onClick={searchByAddress}
            className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition text-amber-400 text-[8px] font-bold uppercase"
          >
            Filtrer
          </button>
        </div>
        {activeAddressFilter && (
          <div className="px-2 pb-1 text-[7px] text-amber-400/80">
            Filtre actif: "{activeAddressFilter}"
          </div>
        )}
      </div>

      {/* PANEL DE THÈMES */}
      <div className="absolute top-4 left-4 z-[1000] bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-1.5 flex gap-1">
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

      {/* BOUTON FILTRES STATUT */}
      <button
        onClick={() => setIsFilterPanelVisible(!isFilterPanelVisible)}
        className="absolute top-4 right-4 z-[1000] bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-2.5 text-white/80 hover:text-amber-400 transition-all active:scale-95"
        title="Filtres par statut"
      >
        <Filter size={18} />
      </button>

      {/* PANEL FILTRES STATUT */}
      <AnimatePresence>
        {isFilterPanelVisible && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute top-16 right-4 z-[1000] bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-4 min-w-[180px]"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={12} /> Statuts
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
                count={allStats.libre}
                active={activeFilters.libre}
                onToggle={() => setActiveFilters({ ...activeFilters, libre: !activeFilters.libre })}
              />
              <FilterOption
                label="Occupé"
                count={allStats.occupe}
                active={activeFilters.occupe}
                onToggle={() => setActiveFilters({ ...activeFilters, occupe: !activeFilters.occupe })}
              />
              <FilterOption
                label="Réservé"
                count={allStats.reserve}
                active={activeFilters.reserve}
                onToggle={() => setActiveFilters({ ...activeFilters, reserve: !activeFilters.reserve })}
              />
              <FilterOption
                label="Maintenance"
                count={allStats.maintenance}
                active={activeFilters.maintenance}
                onToggle={() => setActiveFilters({ ...activeFilters, maintenance: !activeFilters.maintenance })}
              />
            </div>

            {/* Statistiques compactes */}
            <div className="mt-3 pt-2 border-t border-white/10">
              <div className="grid grid-cols-2 gap-1 text-center">
                <div className="bg-white/5 rounded-lg p-1">
                  <p className="text-[10px] font-black text-amber-400">{allStats.total}</p>
                  <p className="text-[6px] text-white/40 uppercase">Affichés</p>
                </div>
                <div className="bg-white/5 rounded-lg p-1">
                  <p className="text-[10px] font-black text-green-400">{allStats.libre}</p>
                  <p className="text-[6px] text-white/40 uppercase">Libres</p>
                </div>
                <div className="bg-white/5 rounded-lg p-1">
                  <p className="text-[10px] font-black text-blue-400">{allStats.occupe}</p>
                  <p className="text-[6px] text-white/40 uppercase">Occupés</p>
                </div>
                <div className="bg-white/5 rounded-lg p-1">
                  <p className="text-[10px] font-black text-amber-400">{allStats.reserve}</p>
                  <p className="text-[6px] text-white/40 uppercase">Réservés</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message quand aucun panneau ne correspond */}
      {filteredPanneaux.length === 0 && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl px-6 py-4 text-center pointer-events-auto">
            <Filter size={24} className="text-amber-400 mx-auto mb-2" />
            <p className="text-white text-sm font-black uppercase">Aucun panneau</p>
            <p className="text-white/40 text-[8px] mt-1">
              {activeAddressFilter
                ? `Aucun panneau trouvé pour "${activeAddressFilter}"`
                : 'Aucun panneau ne correspond aux filtres sélectionnés'}
            </p>
            <div className="flex gap-2 mt-3 justify-center">
              {activeAddressFilter && (
                <button
                  onClick={resetAddressFilter}
                  className="text-[8px] font-bold bg-blue-500 text-white px-3 py-1 rounded-full pointer-events-auto"
                >
                  Effacer l'adresse
                </button>
              )}
              <button
                onClick={() => setActiveFilters({ libre: true, occupe: true, reserve: true, maintenance: true })}
                className="text-[8px] font-bold bg-amber-500 text-black px-3 py-1 rounded-full pointer-events-auto"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARTE */}
      {/* CARTE */}
      <MapContainer
        key={theme}
        center={userLocation ? [userLocation.lat, userLocation.lng] : center}
        zoom={userLocation ? 17 : 12}
        zoomControl={true}
        attributionControl={true}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          url={currentTile.url}
          attribution={currentTile.attribution}
        />

        <MapController theme={theme} onMapReady={setMapInstance} />

        {/* MARQUEUR DE LA POSITION UTILISATEUR */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={L.divIcon({
              className: 'user-marker',
              html: `
          <div style="position: relative;">
            <div style="
              width: 20px;
              height: 20px;
              background: #10B981;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 0 15px rgba(16, 185, 129, 0.9);
              animation: pulse-blue 1.5s infinite;
            "></div>
            <div style="
              position: absolute;
              top: 7px;
              left: 7px;
              width: 6px;
              height: 6px;
              background: white;
              border-radius: 50%;
            "></div>
          </div>
        `,
              iconSize: [20, 20],
              popupAnchor: [0, -10],
            })}
            eventHandlers={{
              click: () => {
                // Ouvrir une popup d'information
              }
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} permanent={false} className="user-tooltip">
              <div className="text-center px-2 py-1">
                <div className="font-black text-[10px] text-emerald-600">📍 Vous êtes ici</div>
                <div className="text-[8px] text-gray-500">Position GPS précise</div>
              </div>
            </Tooltip>
          </Marker>
        )}

        {/* CERCLE DE PRÉCISION GPS */}
        {/* MARQUEUR DE LA POSITION UTILISATEUR */}
{userLocation && typeof window !== 'undefined' && L && (
  <Marker
    position={[userLocation.lat, userLocation.lng]}
    icon={L.divIcon({
      className: 'user-marker',
      html: `
        <div style="position: relative;">
          <div style="
            width: 20px;
            height: 20px;
            background: #10B981;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.9);
            animation: pulse-blue 1.5s infinite;
          "></div>
          <div style="
            position: absolute;
            top: 7px;
            left: 7px;
            width: 6px;
            height: 6px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
      `,
      iconSize: [20, 20],
      popupAnchor: [0, -10],
    })}
  >
    <Tooltip direction="top" offset={[0, -10]} permanent={false} className="user-tooltip">
      <div className="text-center px-2 py-1">
        <div className="font-black text-[10px] text-emerald-600">📍 Vous êtes ici</div>
        <div className="text-[8px] text-gray-500">Position GPS précise</div>
      </div>
    </Tooltip>
  </Marker>
)}
        {filteredPanneaux.map((panneau: any, index: number) => {
          let lat = panneau.coords?.[0] || panneau.gps_raw?.lat;
          let lng = panneau.coords?.[1] || panneau.gps_raw?.lng;

          lat = typeof lat === 'string' ? parseFloat(lat) : lat;
          lng = typeof lng === 'string' ? parseFloat(lng) : lng;

          if (isNaN(lat) || isNaN(lng) || !lat || !lng) return null;
          if (lat < -4.5 || lat > -4.2 || lng < 15.2 || lng > 15.5) return null;

          const { status, color, stats } = getPanneauStatus(panneau.faces);
          const isLibre = status === 'libre';
          const customIcon = createCustomIcon(color, status, isLibre);

          if (!customIcon) return null;

          return (
            <Marker
              key={panneau.id || index}
              position={[lat, lng]}
              icon={customIcon}
              eventHandlers={{
                click: () => onMarkerClick(panneau),
                mouseover: (e) => {
                  e.target.openTooltip();
                  const pin = e.target.getElement()?.querySelector('.marker-pin');
                  if (pin) pin.style.transform = 'scale(1.15)';
                },
                mouseout: (e) => {
                  const pin = e.target.getElement()?.querySelector('.marker-pin');
                  if (pin) pin.style.transform = 'scale(1)';
                }
              }}
            >
              <Tooltip direction="top" offset={[0, -20]} className="custom-tooltip" permanent={false}>
                <div className="text-center px-2 py-1">
                  <div className="font-black text-xs text-gray-800">{panneau.idPan}</div>
                  <div className="flex gap-1.5 justify-center mt-0.5">
                    {stats.libre > 0 && <span className="text-green-500 text-[8px] font-bold">●{stats.libre}</span>}
                    {stats.occupe > 0 && <span className="text-blue-500 text-[8px] font-bold">●{stats.occupe}</span>}
                    {stats.reserve > 0 && <span className="text-amber-500 text-[8px] font-bold">●{stats.reserve}</span>}
                    {stats.maintenance > 0 && <span className="text-red-500 text-[8px] font-bold">●{stats.maintenance}</span>}
                  </div>
                </div>
              </Tooltip>

              <div className="custom-popup">
                <CustomPopupContent
                  panneau={panneau}
                  status={status}
                  stats={stats}
                  onMarkerClick={onMarkerClick}
                  zoomToPanneau={zoomToPanneau}
                />
              </div>
            </Marker>
          );
        })}
      </MapContainer>


      {/* LÉGENDE */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-2">
        <div className="flex gap-3 text-[8px] font-black uppercase tracking-wider">
          <div className="flex items-center gap-1.5 group cursor-help">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white/80 group-hover:text-white transition">Libre</span>
          </div>
          <div className="flex items-center gap-1.5 group cursor-help">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-white/80 group-hover:text-white transition">Occupé</span>
          </div>
          <div className="flex items-center gap-1.5 group cursor-help">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-white/80 group-hover:text-white transition">Réservé</span>
          </div>
          <div className="flex items-center gap-1.5 group cursor-help">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-white/80 group-hover:text-white transition">Maintenance</span>
          </div>
        </div>
      </div>

      {/* STYLES GLOBAUX */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.4); opacity: 0.1; }
        }
        
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .marker-pin {
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        
        .custom-marker:hover .marker-pin {
          transform: scale(1.15);
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
        }
        
        .custom-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 12px !important;
          overflow: hidden !important;
        }
        
        .custom-popup .leaflet-popup-tip {
          background: white !important;
          box-shadow: none !important;
        }
        
        .leaflet-popup-content {
          margin: 0 !important;
          min-width: 220px;
        }
        
        .custom-tooltip {
          background: rgba(255, 255, 255, 0.95) !important;
          border: none !important;
          border-radius: 8px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
          font-size: 10px !important;
          font-weight: bold !important;
        }
        
        .leaflet-control-zoom a {
          background-color: rgba(0, 0, 0, 0.6) !important;
          color: white !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          backdrop-filter: blur(8px) !important;
        }
        
        .leaflet-control-zoom a:hover {
          background-color: rgba(212, 175, 55, 0.8) !important;
          color: black !important;
        }
        
        .leaflet-control-attribution {
          background-color: rgba(0, 0, 0, 0.5) !important;
          backdrop-filter: blur(4px) !important;
          font-size: 7px !important;
          color: rgba(255, 255, 255, 0.5) !important;
        }
        
        .leaflet-control-attribution a {
          color: rgba(255, 255, 255, 0.7) !important;
        }


       
@keyframes pulse-blue {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

.user-marker {
  background: transparent !important;
  border: none !important;
  z-index: 1000 !important;
}

.user-tooltip {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid #10B981 !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
  font-size: 10px !important;
}

.user-tooltip::before {
  border-top-color: #10B981 !important;
}
      `}</style>
    </div>
  );
}