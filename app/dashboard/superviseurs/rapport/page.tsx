'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Filter, LayoutGrid, Database, CheckCircle2,
  Clock, MapPin, CreditCard, ChevronDown, Calendar, Image as ImageIcon,
  Globe, Building2 // Note: 'City' n'existe pas dans lucide-react, utilisez 'Building2'
} from 'lucide-react';

// --- IMPORTATIONS FIREBASE CORRIGÉES ---
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
  authDomain: "kin-geo-market.firebaseapp.com",
  projectId: "kin-geo-market",
  storageBucket: "kin-geo-market.firebasestorage.app",
  messagingSenderId: "50335362445",
  appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
};

// Initialisation sécurisée pour Next.js (évite de réinitialiser au refresh)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- CONFIGURATION GÉOGRAPHIQUE ---
const GEOGRAPHIE: any = {
  "RDC": {
    "Kinshasa": {
      "Lukunga": [
        "Gombe", "Barumbu", "Kinshasa", "Lingwala",
        "Kintambo", "Ngaliema", "Mont-Ngafula"
      ],
      "Funa": [
        "Bandalungwa", "Kasa-Vubu", "Kalamu", "Ngiri-Ngiri",
        "Bumbu", "Makala", "Selembao"
      ],
      "Mont-Amba": [
        "Limete", "Lemba", "Matete", "Ngaba",
        "Kisenso"
      ],
      "Tshangu": [
        "Masina", "Ndjili", "Kimbanseke", "Nsele",
        "Maluku"
      ]
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


// ... la suite de votre composant ReportPage reste la même ...
const ReportPage = () => {
  // --- ÉTATS ---
  const [rawPanneaux, setRawPanneaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bgTheme, setBgTheme] = useState('#000a1a');
  const [textColor, setTextColor] = useState('text-white');

  // États pour le filtrage géographique en cascade
  const [geoFilter, setGeoFilter] = useState({
    pays: 'Tous',
    province: 'Tous',
    district: 'Tous',
    commune: 'Tous'
  });

  const [filter, setFilter] = useState({
    search: '',
    type: 'Tous',
    dateX: '',
    dateY: ''
  });

  // --- RÉCUPÉRATION FIRESTORE ---
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "panneaux"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRawPanneaux(data);
      setLoading(false);
    }, (error) => {
      console.error("Erreur Firebase:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- LOGIQUE DE THÈME ---
  const handleThemeChange = (color: string) => {
    setBgTheme(color);
    // Si le fond est clair (blanc), on met le texte en noir/sombre
    if (color === '#ffffff' || color === '#f8fafc') {
      setTextColor('text-slate-900');
    } else {
      setTextColor('text-white');
    }
  };

  // --- LOGIQUE DE FILTRAGE & CALCULS ---
  const processedData = useMemo(() => {
    if (!rawPanneaux || rawPanneaux.length === 0) return [];

    const now = new Date();

    // 1. Préparation et enrichissement des données
    const data = rawPanneaux.map((p: any) => {
      const parts = p.adresse?.split('/') || [];
      const communeExtrait = parts[4]?.trim() || "Inconnue";

      const facesEnrichies = (p.faces || []).map((f: any, index: number) => {
        const faceId = `${p.idPan || '?'}-${index + 1}`;
        const reservations = (f.reservations || []).map((r: any) => {
          const dDebut = r.dateDebut?.seconds ? new Date(r.dateDebut.seconds * 1000) : new Date(r.dateDebut);
          const dFin = r.dateFin?.seconds ? new Date(r.dateFin.seconds * 1000) : new Date(r.dateFin);

          const diffMs = dFin.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const startDiffDays = Math.ceil((dDebut.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          let message = "";
          let statusColor = "text-gray-400";

          if (now >= dDebut && now <= dFin) {
            message = `${diffDays}j restants`;
            statusColor = "text-emerald-500";
          } else if (now < dDebut) {
            message = `Dans ${startDiffDays}j`;
            statusColor = "text-amber-500";
          } else {
            message = "Terminé";
            statusColor = "text-red-500";
          }

          const nbrMois = Math.max(1, (dFin.getFullYear() - dDebut.getFullYear()) * 12 + (dFin.getMonth() - dDebut.getMonth()));
          return { ...r, dDebut, dFin, message, color: statusColor, nbrMois };
        });
        return { ...f, faceId, reservations };
      });
      return { ...p, commune: communeExtrait, faces: facesEnrichies };
    });

    // 2. Logique de Filtrage Dynamique Multi-Pays / Multi-Villes
    return data.filter((p: any) => {
      // Vérification du Pays
      const matchPays = geoFilter.pays === 'Tous' || (GEOGRAPHIE[geoFilter.pays] && Object.values(GEOGRAPHIE[geoFilter.pays]).some((v: any) => Object.values(v).flat().includes(p.commune)));

      // Vérification de la Province / Ville
      const matchProvince = geoFilter.province === 'Tous' || (GEOGRAPHIE[geoFilter.pays]?.[geoFilter.province] && Object.values(GEOGRAPHIE[geoFilter.pays][geoFilter.province]).flat().includes(p.commune));

      // Vérification du District
      const matchDistrict = geoFilter.district === 'Tous' || (GEOGRAPHIE[geoFilter.pays]?.[geoFilter.province]?.[geoFilter.district]?.includes(p.commune));

      // Vérification de la Commune
      const matchCommune = geoFilter.commune === 'Tous' || p.commune.toLowerCase() === geoFilter.commune.toLowerCase();

      // Filtres secondaires
      const matchType = filter.type === 'Tous' || p.type === filter.type;
      const searchTerm = filter.search.toLowerCase();
      const matchSearch = (p.idPan || "").toLowerCase().includes(searchTerm) || (p.adresse || "").toLowerCase().includes(searchTerm);

      // Un panneau est affiché s'il valide toute la chaîne géographique choisie
      return matchPays && matchProvince && matchDistrict && matchCommune && matchType && matchSearch;
    });
  }, [rawPanneaux, filter, geoFilter]);
  // --- STATISTIQUES ---
  const stats = useMemo(() => {
    let totalPan = processedData.length;
    let totalFaces = processedData.reduce((acc, p) => acc + (p.faces?.length || 0), 0);
    let totalValide = 0;

    processedData.forEach(p => {
      p.faces?.forEach((f: any) => {
        f.reservations?.forEach((r: any) => {
          // Correction ici : on force Number() et on vérifie la validation
          if (r.validationComptable === true) {
            const mnt = Number(r.montant) || 0;
            totalValide += mnt;
          }
        });
      });
    });

    return { totalPan, totalFaces, totalValide };
  }, [processedData]);




  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#000a1a] text-[#FFD700]">
        <div className="w-16 h-16 border-4 border-t-transparent border-[#FFD700] rounded-full animate-spin mb-4"></div>
        <p className="font-black tracking-widest animate-pulse">SYNCHRONISATION FIRESTORE...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-500 font-sans ${textColor} pb-20`} style={{ backgroundColor: bgTheme }}>

      {/* HEADER */}
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-[#FFD700]">DISPRO <span className="opacity-50">REPORTING</span></h1>
            <p className="text-xs text-red-500 font-bold tracking-widest uppercase italic">Live Database Monitoring</p>
          </div>

          {/* SÉLECTEUR DE THÈME ÉLARGI */}
          <div className="flex gap-2 bg-black/20 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
            {[
              { c: '#000a1a', n: 'Nuit' },
              { c: '#0806a8', n: 'Bleu Clair' }, // Bleu ciel / Clair
              { c: '#7f1d1d', n: 'Rouge' },
              { c: '#656668', n: 'Blanc' },
              { c: '#000000', n: 'Noir' }
            ].map(theme => (
              <button
                key={theme.c}
                onClick={() => handleThemeChange(theme.c)}
                className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${bgTheme === theme.c ? 'border-[#FFD700] ring-2 ring-[#FFD700]/30' : 'border-transparent'}`}
                style={{ backgroundColor: theme.c }}
                title={theme.n}
              />
            ))}
          </div>
        </div>

        {/* BARRE DE FILTRES GÉOGRAPHIQUES EN CASCADE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
          {/* 1. SÉLECTION PAYS */}
          <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/5">
            <Globe size={14} className="text-[#FFD700]" />
            <select
              className="bg-transparent text-[11px] font-bold outline-none w-full text-inherit"
              onChange={(e) => setGeoFilter({ pays: e.target.value, province: 'Tous', district: 'Tous', commune: 'Tous' })}
            >
              <option value="Tous">Tous les Pays</option>
              {Object.keys(GEOGRAPHIE).map(p => <option key={p} value={p} className="text-black">{p}</option>)}
            </select>
          </div>

          {/* 2. SÉLECTION PROVINCE / VILLE */}
          <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/5">
            <Building2 size={14} className="text-[#FFD700]" />
            <select
              className="bg-transparent text-[11px] font-bold outline-none w-full text-inherit"
              disabled={geoFilter.pays === 'Tous'}
              onChange={(e) => setGeoFilter({ ...geoFilter, province: e.target.value, district: 'Tous', commune: 'Tous' })}
            >
              <option value="Tous">Toutes les Provinces</option>
              {geoFilter.pays !== 'Tous' && Object.keys(GEOGRAPHIE[geoFilter.pays]).map(pr => (
                <option key={pr} value={pr} className="text-black">{pr}</option>
              ))}
            </select>
          </div>

          {/* 3. SÉLECTION DISTRICT */}
          <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/5">
            <LayoutGrid size={14} className="text-[#FFD700]" />
            <select
              className="bg-transparent text-[11px] font-bold outline-none w-full text-inherit"
              disabled={geoFilter.province === 'Tous'}
              onChange={(e) => setGeoFilter({ ...geoFilter, district: e.target.value, commune: 'Tous' })}
            >
              <option value="Tous">Tous les Districts</option>
              {geoFilter.province !== 'Tous' && Object.keys(GEOGRAPHIE[geoFilter.pays][geoFilter.province]).map(d => (
                <option key={d} value={d} className="text-black">{d}</option>
              ))}
            </select>
          </div>

          {/* 4. SÉLECTION COMMUNE */}
          <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/5">
            <MapPin size={14} className="text-[#FFD700]" />
            <select
              className="bg-transparent text-[11px] font-bold outline-none w-full text-inherit"
              disabled={geoFilter.district === 'Tous'}
              onChange={(e) => setGeoFilter({ ...geoFilter, commune: e.target.value })}
            >
              <option value="Tous">Toutes les Communes</option>
              {geoFilter.district !== 'Tous' && GEOGRAPHIE[geoFilter.pays][geoFilter.province][geoFilter.district].map((c: string) => (
                <option key={c} value={c} className="text-black">{c}</option>
              ))}
            </select>
          </div>
        </div>
        {/* FILTRES RECHERCHE ET TYPES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFD700]" size={16} />
            <input
              type="text" placeholder="Rechercher ID ou Adresse..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-10 text-xs focus:ring-2 ring-[#FFD700] outline-none transition-all"
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
          </div>

          <select
            className="bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-xs outline-none font-bold"
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          >
            <option value="Tous" className="text-black">Tous les Supports</option>
            <option value="Vinyle" className="text-black">Vinyle</option>
            <option value="LED" className="text-black">LED</option>
            <option value="Bache" className="text-black">Bache</option>
          </select>

          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl px-4 py-3">
            <Calendar size={14} className="text-[#FFD700]" />
            <input type="date" className="bg-transparent text-[10px] outline-none flex-1" onChange={(e) => setFilter({ ...filter, dateX: e.target.value })} />
            <span className="opacity-20">/</span>
            <input type="date" className="bg-transparent text-[10px] outline-none flex-1" onChange={(e) => setFilter({ ...filter, dateY: e.target.value })} />
          </div>

          <button className="flex items-center justify-center bg-[#FFD700] hover:bg-white text-black rounded-2xl font-black text-xs px-4 py-3 shadow-lg shadow-[#FFD700]/10 transition-all active:scale-95">
            EXPORTER LE RAPPORT (.XLSX)
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Total Panneaux" value={stats.totalPan} icon={<Database size={24} />} color="#FFD700" />
          <StatCard label="Faces Actives" value={stats.totalFaces} icon={<LayoutGrid size={24} />} color="#ef4444" />
          <StatCard label="Revenu Validé" value={`$${stats.totalValide.toLocaleString()}`} icon={<CreditCard size={24} />} color="#10b981" />
        </div>
      </div>

      {/* LISTE DES PANNEAUX */}
      <div className="px-4 md:px-8">
        <div className="space-y-6">
          {processedData.length > 0 ? processedData.map((pan) => (
            <div key={pan.id} className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-md hover:border-[#FFD700]/30 transition-all">
              <div className="flex flex-col lg:flex-row">
                {/* Info Panneau Latérale */}
                <div className="lg:w-72 p-6 bg-black/20 border-r border-white/5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-14 w-14 bg-gradient-to-tr from-[#FFD700] to-red-600 rounded-2xl flex items-center justify-center text-black font-black text-xl shadow-xl">
                      {pan.idPan}
                    </div>
                    <div>
                      <h3 className="font-black text-lg leading-none uppercase">{pan.type}</h3>
                      <p className="text-[10px] opacity-50 font-bold tracking-widest">{pan.dimension}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-red-500 mt-1 shrink-0" />
                      <p className="text-[11px] font-medium opacity-80">{pan.adresse}</p>
                    </div>
                    <div className="inline-block px-3 py-1 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-full text-[9px] font-black text-[#FFD700] uppercase italic">
                      Avenue: {pan.commune}
                    </div>
                  </div>
                </div>

                {/* Liste des Faces */}
                <div className="flex-1 p-6">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {pan.faces.map((face: any) => (
                      <div key={face.faceId} className="bg-white/5 rounded-3xl p-5 border border-white/10">
                        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                          <span className="font-black text-[#FFD700] text-xs uppercase tracking-tighter">{face.faceId} // {face.sens}</span>
                          <span className="text-[9px] bg-red-500 text-white px-2 py-0.5 rounded-md font-bold uppercase">{face.reservations.length} Résa</span>
                        </div>

                        <div className="space-y-4">
                          {face.reservations.map((res: any, idx: number) => (
                            <div key={idx} className="flex gap-4 items-center animate-in slide-in-from-right-4 duration-300">
                              <img src={res.photoCampagneUrl} className="w-14 h-14 rounded-xl object-cover border-2 border-white/10" alt="campaign" />
                              <div className="flex-1">
                                <h4 className="text-[11px] font-black uppercase tracking-tight">{res.societeLocatrice}</h4>
                                <div className="flex items-center gap-2 text-[9px] opacity-60">
                                  <Clock size={10} />
                                  <span>{res.dateDebut} au {res.dateFin}</span>
                                </div>
                                <span className={`text-[9px] font-black uppercase ${res.color}`}>{res.message}</span>
                              </div>
                              {/* Section Finance & Statut Agent */}
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                {/* Statut de Validation */}
                                <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter shadow-sm ${res.validationComptable
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse'
                                  }`}>
                                  {res.validationComptable ? 'Validé par Compta'
                                   : 'Attente Validation'}
                                </div>

                                {/* Affichage de l'Agent si non validé */}
                                {!res.validationComptable && (
                                  <div className="text-[7px] text-red-400 font-bold uppercase mt-1">
                                     {res.agentNom || "Agent inconnu"}
                                  </div>
                                )}
                                <p className="text-[11px] text-white/30 uppercase">{res.nbrMois} Mois</p>
                              </div>
                            </div>
                          ))}
                          {face.reservations.length === 0 && (
                            <p className="text-center text-[10px] opacity-20 py-4 italic uppercase tracking-widest">Disponible à la location</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-20 text-center bg-black/20 rounded-[3rem] border-2 border-dashed border-white/10">
              <Database className="mx-auto mb-4 text-[#FFD700]/20" size={48} />
              <p className="text-xl font-black opacity-30 uppercase tracking-widest">Aucun résultat correspondant aux filtres</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- COMPOSANT STATS ---
function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="relative overflow-hidden bg-white/5 border border-white/10 p-6 rounded-[2.5rem] backdrop-blur-xl transition-all hover:-translate-y-1 hover:bg-white/10 shadow-2xl">
      <div className="absolute top-0 right-0 p-4 opacity-10" style={{ color: color }}>
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-black tracking-tighter">{value}</p>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }}></div>
      </div>
      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div className="h-full w-1/3 rounded-full" style={{ backgroundColor: color }}></div>
      </div>
    </div>
  );
}

export default ReportPage;