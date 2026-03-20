'use client';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Correction icône par défaut Leaflet (souvent requis en SSR)
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const getPriorityStatus = (faces: any[]) => {
  if (!faces || faces.length === 0) return 'Entretien';
  if (faces.some(f => f.statut === 'Libre')) return 'Libre';
  if (faces.some(f => f.statut === 'Occupé')) return 'Occupé';
  if (faces.some(f => f.statut === 'Réservé')) return 'Réservé';
  return 'Entretien';
};

const getMarkerColor = (statut: string) => {
  const colors: any = { 'Libre': '#10B981', 'Occupé': '#3B82F6', 'Réservé': '#F59E0B', 'Entretien': '#F43F5E' };
  return colors[statut] || '#F43F5E';
};

const getIcon = (color: string) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
  iconSize: [18, 18],
});

export default function MapComponent({ mapStyle, panneaux, onMarkerClick }: any) {
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

    // --- TECHNIQUE DE DÉCALAGE (JITTER) ---
    // Si deux panneaux ont des coordonnées proches, on ajoute un micro-offset aléatoire
    // pour éviter qu'ils soient parfaitement superposés.
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
    // --------------------------------------

    const color = getMarkerColor(getPriorityStatus(p.faces));

    return (
        <Marker
            key={p.id}
            position={[lat, lng]}
            icon={getIcon(color)}
            eventHandlers={{ click: () => onMarkerClick(p) }}
        />
    );
})}
    </MapContainer>
  );
}