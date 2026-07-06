'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Tooltip, Circle } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Filter, X, Layers, Map as MapIcon, Navigation, Info, Search, RotateCcw, ArrowLeft, Compass, ZoomIn, ZoomOut, ChevronDown, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  userLocation?: { lat: number; lng: number } | null;
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
// COMPOSANT DE CONTRÔLE DE LA CARTE
// ============================================
function MapController({ theme, onMapReady, maxZoom }: { theme: MapTheme; onMapReady: (map: any) => void; maxZoom: number }) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      map.setMaxZoom(maxZoom);
      map.invalidateSize();
      onMapReady(map);
    }
  }, [map, theme, maxZoom, onMapReady]);

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
// COMPOSANT DE FILTRAGE PAR ADRESSE AVEC SELECTS HIÉRARCHIQUES
// ============================================
function AddressFilter({
  selectedAddresses,
  onAddressToggle,
  onClearAll
}: {
  selectedAddresses: string[];
  onAddressToggle: (address: string) => void;
  onClearAll: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [addressData, setAddressData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  // États pour la sélection hiérarchique
  const [selectedPays, setSelectedPays] = useState<string>("");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedVille, setSelectedVille] = useState<string>("");

  // Liste des tronçons disponibles (qui sont directement dans la ville)
  const [availableTroncons, setAvailableTroncons] = useState<string[]>([]);

  // Charger la configuration au montage
  useEffect(() => {
    setIsLoading(true);
    try {
      const config = require('../config/db');
      const GEOGRAPHIE = config.GEOGRAPHIE || {};
      setAddressData(GEOGRAPHIE);
    } catch (error) {
      console.error('Erreur lors du chargement de la géographie:', error);
      // Données par défaut avec la bonne structure
      const defaultData = {
        "RDC": {
          "Kinshasa": {
            "Lukunga": ["Tronçon Aerodrome", "Tronçon Bokasa", "Tronçon Kabambare", "Tronçon Blvd 30 juin( gare centrale - socimat)",
              "Tronçon Colonel Mondjiba -Nguma-Ecuries-OZONE-Route Matadi",
              "Tronçon Avenue Huilerie - Blvd du 30 JUIN /REGIDESO",
              "Tronçon av Prince de Liège/REF: AVENUE LYCEE MGR,SHAUMBA"],
            "Funa": ["Tronçon av de l' Université / KIMWENZA",
              "Tronçon av Victoire - SAIO-Bongolo",
              "Tronçon Assossa - Av Huileries",
              "Tronçon Blvd Sendwe", "Av, Kasa-vubu",
              "Tronçon Av 24 Novembre(prison centrale--Blvd 30 juin)"],
            "Mont-Amba": ["Tronçon Blvd Lumumba",
              "Tronçon Poids Lourds",
              "Tronçon By Pass - Rond point Ngaba-Mt Ngafula",
              "Commune de Matete",
              "Commune de Lemba",
              "Tronçon Lemba Foire"],
            "Tshangu": ["Tronçon Aéroport de ndjili - Centre FECOFA",
              "Tronçon Aéroport de ndjili - LIMETE",
              "Commune de ndjili-Masina"]
          },
          "Kongo-Central": {
            "Matadi": ["Ville Haute", "Ville Basse", "Nzanza", "Sanga-Sanga"],
            "Boma": ["Nzadi", "Kabondo", "Kalamu"],
            "Mbanza-Ngungu": ["Noki", "Lukala"],
            "Inkisi": ["Kisantu", "Inkisi-Ville"]
          }
        },
        "Brazzaville": {
          "Brazzaville": {
            "Brazzaville": ["M'Pila", "Talangaï", "Ouenzé", "Poto-Poto", "Bacongo"]
          },
          "Pointe-Noire": {
            "Pointe-Noire": ["Lumumba", "Mvou-Mvou"]
          }
        }
      };
      setAddressData(defaultData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mettre à jour les tronçons disponibles quand la ville change
  useEffect(() => {
    if (selectedPays && selectedProvince && selectedVille) {
      try {
        // La structure est: pays -> province -> ville -> [tronçons]
        const troncons = addressData[selectedPays]?.[selectedProvince]?.[selectedVille] || [];
        setAvailableTroncons(Array.isArray(troncons) ? troncons : []);
      } catch (e) {
        setAvailableTroncons([]);
      }
    } else {
      setAvailableTroncons([]);
    }
  }, [selectedPays, selectedProvince, selectedVille, addressData]);
  // Ajouter cet état en haut du composant
  const [toastMessage, setToastMessage] = useState<{ show: boolean; message: string; type: 'error' | 'success' | 'info' }>({
    show: false,
    message: '',
    type: 'info'
  });

  // Ajouter la fonction pour afficher le toast
  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToastMessage({ show: true, message, type });
    setTimeout(() => {
      setToastMessage({ show: false, message: '', type: 'info' });
    }, 3000);
  };
  // Réinitialiser quand un niveau change
  const handlePaysChange = (pays: string) => {
    setSelectedPays(pays);
    setSelectedProvince("");
    setSelectedVille("");
    setAvailableTroncons([]);
  };

  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
    setSelectedVille("");
    setAvailableTroncons([]);
  };

  const handleVilleChange = (ville: string) => {
    setSelectedVille(ville);
  };

  // Fonction pour basculer la sélection d'un tronçon
  const toggleTroncon = (troncon: string) => {
    const fullAddress = `${troncon}, ${selectedVille}, ${selectedProvince}, ${selectedPays}`;
    onAddressToggle(fullAddress);
  };

  // Fonction pour sélectionner/désélectionner tous les tronçons
  const toggleAllTroncons = () => {
    const allSelected = availableTroncons.every(t =>
      selectedAddresses.includes(`${t}, ${selectedVille}, ${selectedProvince}, ${selectedPays}`)
    );

    if (allSelected) {
      // Désélectionner tous
      availableTroncons.forEach(t => {
        const fullAddress = `${t}, ${selectedVille}, ${selectedProvince}, ${selectedPays}`;
        if (selectedAddresses.includes(fullAddress)) {
          onAddressToggle(fullAddress);
        }
      });
    } else {
      // Sélectionner tous
      availableTroncons.forEach(t => {
        const fullAddress = `${t}, ${selectedVille}, ${selectedProvince}, ${selectedPays}`;
        if (!selectedAddresses.includes(fullAddress)) {
          onAddressToggle(fullAddress);
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-[10px] text-white/60">Chargement des adresses...</span>
      </div>
    );
  }

  const totalSelected = selectedAddresses.length;

  // Récupérer les options pour chaque niveau
  const paysOptions = Object.keys(addressData);
  const provinceOptions = selectedPays ? Object.keys(addressData[selectedPays] || {}) : [];
  const villeOptions = selectedPays && selectedProvince ? Object.keys(addressData[selectedPays]?.[selectedProvince] || {}) : [];

  return (
    <div className="w-full">
      {/* En-tête avec compteur */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white/60 hover:text-white transition p-1"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            📍 Filtrer par adresse
          </span>
          {totalSelected > 0 && (
            <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
              {totalSelected}
            </span>
          )}
        </div>
        {totalSelected > 0 && (
          <button
            onClick={onClearAll}
            className="text-[8px] text-white/40 hover:text-white transition"
          >
            ✕ Tout effacer
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Sélecteurs hiérarchiques - Style comme la page d'enregistrement */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Pays */}
            <select
              className="px-3 py-2 bg-white/5 rounded-lg border border-white/10 text-white text-[11px] outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={selectedPays}
              onChange={(e) => handlePaysChange(e.target.value)}
            >
              <option value="" className="text-gray-800">🌍 Pays</option>
              {paysOptions.map((pays) => (
                <option key={pays} value={pays} className="text-gray-800">{pays}</option>
              ))}
            </select>

            {/* Province */}
            <select
              className="px-3 py-2 bg-white/5 rounded-lg border border-white/10 text-white text-[11px] outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-40"
              value={selectedProvince}
              onChange={(e) => handleProvinceChange(e.target.value)}
              disabled={!selectedPays}
            >
              <option value="" className="text-gray-800">🏛️ Province</option>
              {provinceOptions.map((province) => (
                <option key={province} value={province} className="text-gray-800">{province}</option>
              ))}
            </select>

            {/* Ville */}
            <select
              className="px-3 py-2 bg-white/5 rounded-lg border border-white/10 text-white text-[11px] outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-40"
              value={selectedVille}
              onChange={(e) => handleVilleChange(e.target.value)}
              disabled={!selectedProvince}
            >
              <option value="" className="text-gray-800">🏙️ Ville</option>
              {villeOptions.map((ville) => (
                <option key={ville} value={ville} className="text-gray-800">{ville}</option>
              ))}
            </select>
          </div>

          {/* Liste des tronçons avec checkboxes */}
          {selectedVille && availableTroncons.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[8px] text-white/40">
                  {availableTroncons.length} tronçon(s) disponible(s)
                </p>
                <button
                  onClick={toggleAllTroncons}
                  className="text-[8px] text-amber-400 hover:text-amber-300 transition"
                >
                  {availableTroncons.every(t =>
                    selectedAddresses.includes(`${t}, ${selectedVille}, ${selectedProvince}, ${selectedPays}`)
                  ) ? 'Désélectionner tout' : 'Tout sélectionner'}
                </button>
              </div>
              <div className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                {availableTroncons.map((troncon, index) => {
                  const fullAddress = `${troncon}, ${selectedVille}, ${selectedProvince}, ${selectedPays}`;
                  const isSelected = selectedAddresses.includes(fullAddress);

                  return (
                    <label
                      key={index}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTroncon(troncon)}
                        className="w-3.5 h-3.5 rounded border-white/20 bg-transparent checked:bg-amber-500 checked:border-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className={`text-[9px] ${isSelected ? 'text-white' : 'text-white/60 group-hover:text-white'} transition`}>
                        {troncon}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message quand une ville est sélectionnée mais pas de tronçons */}
          {selectedVille && availableTroncons.length === 0 && (
            <div className="text-center py-2">
              <p className="text-[9px] text-white/40">
                Aucun tronçon disponible pour cette ville
              </p>
            </div>
          )}

          {/* Message d'invitation */}
          {!selectedVille && (
            <div className="text-center py-2">
              <p className="text-[9px] text-white/40">
                Sélectionnez un pays, une province et une ville pour voir les tronçons
              </p>
            </div>
          )}

          {/* Résumé des sélections */}
          {selectedAddresses.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="flex flex-wrap gap-1">
                {selectedAddresses.slice(0, 3).map((addr, index) => (
                  <span key={index} className="text-[7px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                    {addr.split(',')[0].trim()}
                  </span>
                ))}
                {selectedAddresses.length > 3 && (
                  <span className="text-[7px] text-white/40">
                    +{selectedAddresses.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
        select option {
          background: #1a1a2e;
          color: white;
        }
      `}</style>
    </div>
  );
}
// ============================================
// COMPOSANT PRINCIPAL MAP
// ============================================
export default function MapComponent({ panneaux, onMarkerClick, userLocation }: MapComponentProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [theme, setTheme] = useState<MapTheme>('satellite');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);

  // ✅ Cache des données pour éviter les rechargements
  const [cachedPanneaux, setCachedPanneaux] = useState<any[]>([]);

  // ✅ État pour le mode d'affichage
  const [filterMode, setFilterMode] = useState<'all' | 'single'>('all');
  const [selectedPanneauId, setSelectedPanneauId] = useState<string | null>(null);

  const [activeFilters, setActiveFilters] = useState({
    libre: true,
    occupe: true,
    reserve: true,
    maintenance: true
  });
  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(true);
  const [isAddressPanelVisible, setIsAddressPanelVisible] = useState(true);

  // ✅ Zoom maximum à 18 (environ 50m du sol) pour éviter les lignes vides
  const MAX_ZOOM = 18;

  // ✅ Mettre en cache les données lors du chargement initial
  useEffect(() => {
    if (panneaux.length > 0 && cachedPanneaux.length === 0) {
      setCachedPanneaux(panneaux);
      setIsLoadingData(false);
    }
  }, [panneaux]);

  // ✅ Utiliser les données en cache
  const displayPanneaux = cachedPanneaux.length > 0 ? cachedPanneaux : panneaux;

  // ✅ Charger le mode de filtrage depuis localStorage
  useEffect(() => {
    const filterType = localStorage.getItem('map_filter_type');
    const singlePanneau = localStorage.getItem('map_single_panneau');

    if (filterType === 'single' && singlePanneau) {
      try {
        const panneau = JSON.parse(singlePanneau);
        setFilterMode('single');
        setSelectedPanneauId(panneau.id);
      } catch (e) {
        console.error('Erreur lors du chargement du panneau sélectionné:', e);
        setFilterMode('all');
      }
    } else {
      setFilterMode('all');
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (displayPanneaux.length > 0) {
      setIsLoadingData(false);
      setLastUpdate(new Date());
    }
  }, [displayPanneaux]);

  const center: [number, number] = [-4.3276, 15.3136];

  // ✅ Fonction pour basculer une adresse
  const toggleAddress = (address: string) => {
    setSelectedAddresses(prev => {
      if (prev.includes(address)) {
        return prev.filter(a => a !== address);
      } else {
        return [...prev, address];
      }
    });
  };

  // ✅ Fonction pour effacer toutes les adresses sélectionnées
  const clearAllAddresses = () => {
    setSelectedAddresses([]);
  };

  // ✅ Filtrer les panneaux selon le mode
  // ✅ Filtrer les panneaux selon le mode
const filteredPanneaux = displayPanneaux.filter((panneau: any) => {
  // Si mode 'single', n'afficher que le panneau sélectionné
  if (filterMode === 'single' && selectedPanneauId) {
    return panneau.id === selectedPanneauId;
  }

  // ✅ PASSER etatPanneau À getPanneauStatus
  const { status } = getPanneauStatus(panneau.faces, panneau.etatPanneau);
  const matchStatus = activeFilters[status as keyof typeof activeFilters];

  // Filtrage par adresse - CORRIGÉ
  const matchAddress = selectedAddresses.length === 0 ||
    selectedAddresses.some(addr => {
      const parts = addr.split(',').map(p => p.trim());
      const troncon = parts[0]?.toLowerCase() || '';
      const panneauAdresse = panneau.adresse?.toLowerCase() || '';
      return panneauAdresse.includes(troncon);
    });

  return matchStatus && matchAddress;
});

  // ✅ Calculer les stats
 // ✅ Calculer les stats - CORRIGÉ avec etatPanneau
const allStats = {
  total: filteredPanneaux.length,
  libre: displayPanneaux.filter((p: any) => {
    const { status } = getPanneauStatus(p.faces, p.etatPanneau);
    return status === 'libre';
  }).length,
  occupe: displayPanneaux.filter((p: any) => {
    const { status } = getPanneauStatus(p.faces, p.etatPanneau);
    return status === 'occupe';
  }).length,
  reserve: displayPanneaux.filter((p: any) => {
    const { status } = getPanneauStatus(p.faces, p.etatPanneau);
    return status === 'reserve';
  }).length,
  maintenance: displayPanneaux.filter((p: any) => {
    const { status } = getPanneauStatus(p.faces, p.etatPanneau);
    return status === 'maintenance';
  }).length
};

  // ✅ Fonction pour réinitialiser le mode
  const resetToAllPanneaux = () => {
    setFilterMode('all');
    setSelectedPanneauId(null);
    localStorage.removeItem('map_filter_type');
    localStorage.removeItem('map_single_panneau');
  };

  // Fonction pour zoomer sur un panneau (limité à MAX_ZOOM)
  const zoomToPanneau = (panneau: any) => {
    if (mapInstance) {
      let lat = panneau.coords?.[0] || panneau.gps_raw?.lat;
      let lng = panneau.coords?.[1] || panneau.gps_raw?.lng;
      lat = typeof lat === 'string' ? parseFloat(lat) : lat;
      lng = typeof lng === 'string' ? parseFloat(lng) : lng;
      if (!isNaN(lat) && !isNaN(lng)) {
        mapInstance.setView([lat, lng], Math.min(18, MAX_ZOOM));
      }
    }
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

  // ✅ Récupérer les informations du panneau sélectionné
  const selectedPanneau = filterMode === 'single' && selectedPanneauId
    ? displayPanneaux.find((p: any) => p.id === selectedPanneauId)
    : null;

  return (
    <div className="relative h-full w-full">
      {/* ✅ BOUTON RETOUR QUAND UN SEUL PANNEAU EST AFFICHÉ */}
      {filterMode === 'single' && selectedPanneau && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-black/60 backdrop-blur-xl rounded-2xl border border-amber-500/30 shadow-2xl px-4 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={resetToAllPanneaux}
              className="flex items-center gap-2 text-white hover:text-amber-400 transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="text-xs font-bold">Voir tous les panneaux</span>
            </button>
            <div className="w-px h-6 bg-white/20" />
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getPanneauStatus(selectedPanneau.faces).status === 'libre' ? 'bg-green-500 animate-pulse' : getPanneauStatus(selectedPanneau.faces).status === 'occupe' ? 'bg-blue-500' : 'bg-amber-500'}`} />
              <span className="text-white text-xs font-bold">{selectedPanneau.idPan}</span>
              <span className="text-white/60 text-[10px]">{selectedPanneau.adresse?.substring(0, 30)}...</span>
            </div>
          </div>
        </div>
      )}

      {/* Indicateur de chargement - Masqué complètement après chargement */}
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

      {/* PANEL DE FILTRES PAR ADRESSE - En haut au centre */}
      {filterMode !== 'single' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-[400px]">
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddressPanelVisible(!isAddressPanelVisible)}
                  className="text-white/60 hover:text-white transition"
                >
                  {isAddressPanelVisible ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <MapIcon size={12} className="text-amber-400" />
                  Filtrer par adresse
                </span>
                {selectedAddresses.length > 0 && (
                  <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                    {selectedAddresses.length} sélectionnée(s)
                  </span>
                )}
              </div>
              {selectedAddresses.length > 0 && (
                <button
                  onClick={clearAllAddresses}
                  className="text-[8px] text-white/40 hover:text-white transition"
                >
                  ✕ Tout effacer
                </button>
              )}
            </div>

            {isAddressPanelVisible && (
              <AddressFilter
                selectedAddresses={selectedAddresses}
                onAddressToggle={toggleAddress}
                onClearAll={clearAllAddresses}
              />
            )}

            {/* Résumé des filtres actifs */}
            {selectedAddresses.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="flex flex-wrap gap-1">
                  {selectedAddresses.slice(0, 3).map((addr, index) => (
                    <span key={index} className="text-[7px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
                      {addr.split(',')[0].trim()}
                    </span>
                  ))}
                  {selectedAddresses.length > 3 && (
                    <span className="text-[7px] text-white/40">
                      +{selectedAddresses.length - 3}
                    </span>
                  )}
                </div>
                <div className="text-[7px] text-white/40 mt-1">
                  {filteredPanneaux.length} panneau(x) trouvé(s)
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL DE THÈMES - En haut à gauche */}
      <div className="absolute top-24 left-4 z-[1000] bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-1.5 flex flex-col gap-1">
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

      {/* BOUTON FILTRES STATUT - En haut à droite */}
      {filterMode !== 'single' && (
        <button
          onClick={() => setIsFilterPanelVisible(!isFilterPanelVisible)}
          className="absolute top-24 right-4 z-[1000] bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-2.5 text-white/80 hover:text-amber-400 transition-all active:scale-95"
          title="Filtres par statut"
        >
          <Filter size={18} />
        </button>
      )}

      {/* PANEL FILTRES STATUT - À droite */}
      {filterMode !== 'single' && (
        <AnimatePresence>
          {isFilterPanelVisible && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute top-32 right-4 z-[1000] bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-4 min-w-[180px]"
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

              <div className="grid grid-cols-2 gap-1.5">
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
      )}

      {/* CONTROLE DE ZOOM PERSONNALISÉ */}
      <div className="absolute bottom-20 right-4 z-[1000] flex flex-col gap-1">
        <button
          onClick={() => mapInstance?.zoomIn()}
          className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/20 p-2 text-white/80 hover:text-amber-400 transition-all hover:bg-black/60"
          title="Zoom avant"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => mapInstance?.zoomOut()}
          className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/20 p-2 text-white/80 hover:text-amber-400 transition-all hover:bg-black/60"
          title="Zoom arrière"
        >
          <ZoomOut size={18} />
        </button>
      </div>

      {/* Message quand aucun panneau ne correspond */}
      {filteredPanneaux.length === 0 && !isLoadingData && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl px-6 py-4 text-center pointer-events-auto max-w-[90%]">
            <Filter size={24} className="text-amber-400 mx-auto mb-2" />
            <p className="text-white text-sm font-black uppercase">Aucun panneau</p>
            <p className="text-white/40 text-[8px] mt-1">
              {filterMode === 'single'
                ? 'Le panneau sélectionné n\'a pas été trouvé'
                : selectedAddresses.length > 0
                  ? `Aucun panneau trouvé pour les adresses sélectionnées`
                  : 'Aucun panneau ne correspond aux filtres sélectionnés'
              }
            </p>
            {filterMode === 'single' && (
              <button
                onClick={resetToAllPanneaux}
                className="mt-3 text-[8px] font-bold bg-amber-500 text-black px-3 py-1 rounded-full pointer-events-auto"
              >
                Voir tous les panneaux
              </button>
            )}
            {filterMode !== 'single' && selectedAddresses.length > 0 && (
              <button
                onClick={clearAllAddresses}
                className="mt-2 text-[8px] font-bold bg-blue-500 text-white px-3 py-1 rounded-full pointer-events-auto ml-2"
              >
                Effacer les adresses
              </button>
            )}
            {filterMode !== 'single' && (
              <button
                onClick={() => setActiveFilters({ libre: true, occupe: true, reserve: true, maintenance: true })}
                className="mt-2 text-[8px] font-bold bg-amber-500 text-black px-3 py-1 rounded-full pointer-events-auto"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </div>
      )}

      {/* CARTE - avec fond personnalisé pour éviter les lignes vides */}
      <div className="relative h-full w-full" style={{ background: '#1a1a2e' }}>
        <MapContainer
          key={theme}
          center={userLocation ? [userLocation.lat, userLocation.lng] : center}
          zoom={userLocation ? 17 : 12}
          zoomControl={false}
          attributionControl={true}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          {/* ✅ Fond de secours pour les zones sans tuiles */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: '#1a1a2e',
            zIndex: -1
          }} />

          <TileLayer
            url={currentTile.url}
            attribution={currentTile.attribution}
            // ✅ Éviter l'affichage des tuiles vides
            errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          />

          <MapController
            theme={theme}
            onMapReady={setMapInstance}
            maxZoom={MAX_ZOOM}
          />

          {/* CERCLE DE PRÉCISION GPS */}
          {userLocation && typeof window !== 'undefined' && L && (
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={10} // Rayon de 30 mètres pour la précision GPS
              pathOptions={{
                color: '#7C3AED',
                fillColor: '#7C3AED',
                fillOpacity: 0.2,
                weight: 1,
              }}
            />
          )}

          {/* MARQUEUR DE LA POSITION UTILISATEUR */}
          {/* MARQUEUR DE LA POSITION UTILISATEUR - EN VIOLET */}
          {userLocation && typeof window !== 'undefined' && L && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={L.divIcon({
                className: 'user-marker',
                html: `
        <div style="position: relative;">
          <div style="
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #7C3AED, #8B5CF6);
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 20px rgba(124, 58, 237, 0.8), inset 0 0 15px rgba(124, 58, 237, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 8px;
              height: 8px;
              background: white;
              border-radius: 50%;
              box-shadow: 0 0 10px rgba(255,255,255,0.5);
            "></div>
          </div>
        </div>
      `,
                iconSize: [24, 24],
                popupAnchor: [0, -10],
              })}
            >
              <Tooltip direction="top" offset={[0, -10]} permanent={false} className="user-tooltip">
                <div className="text-center px-2 py-1">
                  <div className="font-black text-[10px] text-purple-600">📍 Vous êtes ici</div>
                  <div className="text-[8px] text-gray-500">Position GPS précise</div>
                </div>
              </Tooltip>
            </Marker>
          )}
          {/* Toast pour les panneaux en panne */}

          {filteredPanneaux.map((panneau: any, index: number) => {
            let lat = panneau.coords?.[0] || panneau.gps_raw?.lat;
            let lng = panneau.coords?.[1] || panneau.gps_raw?.lng;

            lat = typeof lat === 'string' ? parseFloat(lat) : lat;
            lng = typeof lng === 'string' ? parseFloat(lng) : lng;

            if (isNaN(lat) || isNaN(lng) || !lat || !lng) return null;
            if (lat < -4.5 || lat > -4.2 || lng < 15.2 || lng > 15.5) return null;

            const estEnPanne = panneau.etatPanneau === 'En panne';
            const { status, color, stats } = getPanneauStatus(panneau.faces, panneau.etatPanneau);
            const isLibre = status === 'libre';
            const customIcon = createCustomIcon(color, status, isLibre, estEnPanne);

            if (!customIcon) return null;

            // ✅ Si le panneau est en panne, on affiche un message au clic
            // ✅ Si le panneau est en panne, on affiche un message au clic
            if (estEnPanne) {
              let tooltipInstance: any = null; // Stocker l'instance du tooltip

              return (
                <Marker
                  key={panneau.id || index}
                  position={[lat, lng]}
                  icon={customIcon}
                  interactive={true}
                  keyboard={false}
                  zIndexOffset={-100}
                  eventHandlers={{
                    click: () => {
                      alert(`🚫 Panneau "${panneau.idPan}" en panne\n\nAucune action n'est autorisée pour le moment.`);
                    },
                    mouseover: (e) => {
                      // Créer et stocker le tooltip
                      if (mapInstance) {
                        // Fermer l'ancien tooltip s'il existe
                        if (tooltipInstance) {
                          mapInstance.removeLayer(tooltipInstance);
                          tooltipInstance = null;
                        }

                        tooltipInstance = L.tooltip({
                          permanent: false,
                          direction: 'top',
                          offset: [0, -20],
                          className: 'panne-tooltip'
                        })
                          .setContent(`🚫 Panneau "${panneau.idPan}" en panne - Cliquez pour info`)
                          .setLatLng([lat, lng]);

                        tooltipInstance.addTo(mapInstance);
                      }
                    },
                    mouseout: () => {
                      // Supprimer le tooltip
                      if (mapInstance && tooltipInstance) {
                        mapInstance.removeLayer(tooltipInstance);
                        tooltipInstance = null;
                      }
                    }
                  }}
                />
              );
            }
            // ✅ Panneaux normaux avec toutes les interactions
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
                    estEnPanne={estEnPanne}
                  />
                </div>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

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
        .panne-tooltip {
    background: rgba(220, 38, 38, 0.95) !important;
    border: 2px solid #DC2626 !important;
    border-radius: 10px !important;
    color: white !important;
    font-weight: bold !important;
    font-size: 10px !important;
    padding: 6px 12px !important;
    box-shadow: 0 4px 20px rgba(220, 38, 38, 0.5) !important;
  }

  .panne-tooltip::before {
    border-top-color: #DC2626 !important;
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

        .leaflet-container {
          touch-action: none;
          background: #1a1a2e !important;
        }
        
        /* ✅ Éviter l'affichage des tuiles vides */
        .leaflet-tile-pane {
          filter: none !important;
        }
        
        .leaflet-tile {
          background: transparent !important;
        }

         @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.4); opacity: 0.1; }
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
  
  /* ✅ Animation de clignotement pour les panneaux en panne */
  @keyframes clignotement {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.2; }
  }
  
  /* ✅ Animation de pulse pour les panneaux en panne */
  @keyframes pulse-panne {
    0%, 100% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.5); opacity: 0.05; }
  }
  
  .clignotant {
    animation: clignotement 0.8s ease-in-out infinite;
  }
  
  .pulse-panne {
    animation: pulse-panne 1.2s ease-in-out infinite;
  }
      `}</style>
    </div>
  );
}

// ============================================
// LOGIQUE DE STATUT DES FACES
// ============================================
const getFaceStatus = (face: any): { status: string; label: string; activeReservation: any } => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const reservations = face.reservations || [];

  const activeRes = reservations.find((res: any) => {
    if (!res.dateDebut || !res.dateFin) return false;

    const debut = new Date(res.dateDebut);
    const fin = new Date(res.dateFin);
    debut.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);

    return now >= debut && now <= fin;
    return now >= debut && now <= fin;
  });

  if (activeRes) {
    const statut = activeRes.statut?.toLowerCase();
    if (statut === 'occupé') return { status: 'occupe', label: 'Occupé', activeReservation: activeRes };
    if (statut === 'réservé') return { status: 'reserve', label: 'Réservé', activeReservation: activeRes };
    return { status: 'occupe', label: 'Occupé', activeReservation: activeRes };
  }

  return { status: 'libre', label: 'Libre', activeReservation: null };
};

// ============================================
// LOGIQUE DE STATUT DU PANNEAU - AVEC ETATPANNEAU
// ============================================
const getPanneauStatus = (faces: any[], etatPanneau?: string): { status: string; label: string; color: string; stats: any } => {
  // ✅ Si le panneau est en panne, on retourne directement le statut "maintenance"
  if (etatPanneau === 'En panne') {
    return {
      status: 'maintenance',
      label: 'En panne',
      color: '#EF4444',
      stats: { libre: 0, occupe: 0, reserve: 0, maintenance: faces?.length || 0, total: faces?.length || 0 }
    };
  }

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

  if (stats.libre === stats.total) {
    return { status: 'libre', label: 'Libre', color: '#10B981', stats };
  }

  if (stats.occupe === stats.total) {
    return { status: 'occupe', label: 'Occupé', color: '#3B82F6', stats };
  }

  if (stats.reserve === stats.total) {
    return { status: 'reserve', label: 'Réservé', color: '#F59E0B', stats };
  }

  if (stats.maintenance === stats.total) {
    return { status: 'maintenance', label: 'Maintenance', color: '#EF4444', stats };
  }

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
// CRÉATION DE L'ICÔNE PIN SVG - AVEC CLIGNOTEMENT ROUGE POUR PANNE (SANS CERCLES)
// ============================================
const createCustomIcon = (color: string, status: string, isLibre: boolean, estEnPanne: boolean = false) => {
  if (typeof window === 'undefined' || !L) return null;

  const width = isLibre ? 34 : 30;
  const height = isLibre ? 44 : 40;

  // ✅ Animation de clignotement pour les panneaux en panne (le pin lui-même clignote)
  const clignotement = estEnPanne ? `
    <style>
      @keyframes clignotement {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.3; transform: scale(0.92); }
      }
      .clignotant {
        animation: clignotement 0.6s ease-in-out infinite;
      }
    </style>
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

  // ✅ Icône rouge avec croix blanche pour les panneaux en panne (clignotante, sans cercles)
  const pinSvg = estEnPanne ? `
    <svg 
      width="${width}" 
      height="${height}" 
      viewBox="0 0 24 35" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style="
        filter: drop-shadow(0 2px 15px rgba(239, 68, 68, 0.8));
        transition: transform 0.2s ease;
        cursor: pointer;
      "
      class="marker-pin clignotant"
    >
      <defs>
        <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <!-- Pin principal rouge -->
      <path 
        d="M12 0C7.58 0 4 3.58 4 8c0 6 8 14 8 14s8-8 8-14c0-4.42-3.58-8-8-8z" 
        fill="#DC2626" 
        stroke="white" 
        stroke-width="2.5"
        filter="url(#glow-red)"
      />
      <!-- Croix blanche -->
      <line x1="8" y1="5" x2="16" y2="13" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="16" y1="5" x2="8" y2="13" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Cercle intérieur -->
      <circle 
        cx="12" 
        cy="8" 
        r="4" 
        fill="white" 
        stroke="#DC2626" 
        stroke-width="1.5"
      />
    </svg>
  ` : `
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
        ${clignotement}
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
// COMPOSANT POPUP PERSONNALISÉE - AVEC AFFICHAGE DE LA PANNE
// ============================================
const CustomPopupContent = ({ panneau, status, stats, onMarkerClick, zoomToPanneau, estEnPanne }: any) => {
  const getStatusLabel = () => {
    if (estEnPanne) return 'EN PANNE';
    if (status === 'libre') return 'Libre';
    if (status === 'occupe') return 'Occupé';
    if (status === 'reserve') return 'Réservé';
    return 'Maintenance';
  };

  const getStatusColor = () => {
    if (estEnPanne) return 'from-red-600 to-red-700';
    if (status === 'libre') return 'from-green-600 to-green-500';
    if (status === 'occupe') return 'from-blue-600 to-blue-500';
    if (status === 'reserve') return 'from-amber-600 to-amber-500';
    return 'from-red-600 to-red-500';
  };

  const getStatusDotColor = () => {
    if (estEnPanne) return 'bg-red-500';
    if (status === 'libre') return 'bg-green-500';
    if (status === 'occupe') return 'bg-blue-500';
    if (status === 'reserve') return 'bg-amber-500';
    return 'bg-red-500';
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
          <div className={`w-2 h-2 rounded-full ${getStatusDotColor()} ${estEnPanne || status === 'libre' ? 'animate-pulse' : ''}`} />
        </div>
      </div>

      <div className="p-3 bg-white">
        <p className="text-[9px] text-gray-500 font-medium mb-2 truncate max-w-[200px]">
          📍 {panneau.adresse}
        </p>

        {/* ✅ Affichage spécial pour les panneaux en panne */}
        {estEnPanne ? (
          <div className="mb-2 pb-2 border-b border-red-100">
            <div className="flex items-center gap-2 bg-red-50 rounded-lg p-2">
              <span className="text-[12px]">🚫</span>
              <span className="text-[8px] font-bold text-red-600 uppercase tracking-wider">
                PANNE TOTALE - En maintenance
              </span>
            </div>
          </div>
        ) : (
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
        )}

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${getStatusDotColor()} ${estEnPanne || status === 'libre' ? 'animate-pulse' : ''}`} />
            <span className={`text-[8px] font-bold uppercase ${estEnPanne ? 'text-red-600' : 'text-gray-600'}`}>
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