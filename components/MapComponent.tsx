'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// --- PROTECTION SSR POUR LEAFLET ---
// On déclare L à l'extérieur pour qu'il soit accessible partout
let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  require('leaflet.heat');

  // Correction icône par défaut Leaflet (uniquement côté client)
  const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
  L.Marker.prototype.options.icon = DefaultIcon;
}

// --- TA LOGIQUE DE STATUT ---
const getPriorityStatus = (faces: any[]) => {
  if (!faces || faces.length === 0) return 'Entretien';
  if (faces.some(f => f.statut === 'Libre')) return 'Libre';
  if (faces.some(f => f.statut === 'Occupé')) return 'Occupé';
  if (faces.some(f => f.statut === 'Réservé')) return 'Réservé';
  return 'Entretien';
};

const getMarkerColor = (statut: string) => {
  const colors: any = { 
    'Libre': '#10B981', 
    'Occupé': '#3B82F6', 
    'Réservé': '#F59E0B', 
    'Entretien': '#F43F5E' 
  };
  return colors[statut] || '#F43F5E';
};

// --- TA LOGIQUE D'ICÔNE ---
const getIcon = (color: string) => {
  if (typeof window === 'undefined' || !L) return null;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18],
  });
};

export default function MapComponent({ mapStyle, panneaux, onMarkerClick }: any) {
  // Sécurité pour éviter le rendu tant que la fenêtre n'est pas prête
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="h-full w-full bg-zinc-900" />;

  return (
    <MapContainer
      center={[-4.3276, 15.3136]}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer url={mapStyle || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />

      {panneaux && panneaux.map((p: any, index: number) => {
        let lat = parseFloat(p.coords?.[0]);
        let lng = parseFloat(p.coords?.[1]);

        if (isNaN(lat) || isNaN(lng)) return null;

        // --- TA TECHNIQUE DE DÉCALAGE (JITTER) ---
        const offset = 0.0001; 
        const isDuplicate = panneaux.some((other: any, i: number) => 
            i !== index && 
            Math.abs(parseFloat(other.coords?.[0]) - lat) < 0.00001 && 
            Math.abs(parseFloat(other.coords?.[1]) - lng) < 0.00001
        );

        if (isDuplicate) {
            lat += (Math.random() - 0.5) * offset;
            lng += (Math.random() - 0.5) * offset;
        }

        const color = getMarkerColor(getPriorityStatus(p.faces));
        const customIcon = getIcon(color);

        return (
            <Marker
                key={p.id || index}
                position={[lat, lng]}
                icon={customIcon}
                eventHandlers={{ click: () => onMarkerClick(p) }}
            />
        );
      })}
    </MapContainer>
  );
}