'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Filter, LayoutGrid, Database, CheckCircle2,
  Clock, MapPin, CreditCard, ChevronDown, Calendar, Image as ImageIcon,
  Globe, Building2, X, Menu, TrendingUp, DollarSign, Layers,
  Users, UserCheck, Target, AlertCircle, Activity, Eye, ThumbsUp,
  Home, FilePieChart, LogOut
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useSpring, useMotionValueEvent } from 'framer-motion';

// ============================================
// IMPORTATION DEPUIS LE FICHIER DE CONFIG
// ============================================
const config = require('../../../../config/db');

// ============================================
// INITIALISATION FIREBASE
// ============================================
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const app = !getApps().length ? initializeApp(config.firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// ============================================
// CONFIGURATION GÉOGRAPHIQUE
// ============================================
const GEOGRAPHIE = config.GEOGRAPHIE;
const LOGO_URL = config.LOGO_DISPROMALT;

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
const ReportPage = () => {
  const router = useRouter();

  // --- ÉTATS ---
  const [rawPanneaux, setRawPanneaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'faces' | 'agents'>('overview');
  const [hidden, setHidden] = useState(false);

  // Animation scroll
  const { scrollYProgress, scrollY } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const yBg = useSpring(scrollY, { stiffness: 100, damping: 30 });

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(latest > previous && latest > 150);
  });

  // États pour le filtrage
  const [geoFilter, setGeoFilter] = useState({
    pays: 'Tous',
    province: 'Tous',
    district: 'Tous',
    commune: 'Tous'
  });

  const [filter, setFilter] = useState({
    search: '',
    type: 'Tous',
    agent: 'Tous',
    status: 'Tous'
  });

  // --- RÉCUPÉRATION FIRESTORE ---
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "panneaux"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawPanneaux(data);
      setLoading(false);
    }, (error) => {
      console.error("Erreur Firebase:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- LOGIQUE DE FILTRAGE ---
  const processedData = useMemo(() => {
    if (!rawPanneaux || rawPanneaux.length === 0) return [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const data = rawPanneaux.map((p: any) => {
      const parts = p.adresse?.split('/') || [];
      const communeExtrait = parts[4]?.trim() || parts[3]?.trim() || "Inconnue";

      const facesEnrichies = (p.faces || []).map((f: any, index: number) => {
        const faceId = `${p.idPan || '?'}-${index + 1}`;

        const activeRes = (f.reservations || []).find((r: any) => {
          const debut = new Date(r.dateDebut);
          const fin = new Date(r.dateFin);
          debut.setHours(0, 0, 0, 0);
          fin.setHours(0, 0, 0, 0);
          return now >= debut && now <= fin;
        });

        let currentStatus = 'Libre';
        let currentStatusColor = 'text-emerald-400';
        let currentClient = null;
        let currentAgent = null;
        let currentPhoto = null;
        let currentDates = null;

        if (activeRes) {
          currentStatus = activeRes.statut || 'Occupé';
          currentStatusColor = currentStatus === 'Occupé' ? 'text-blue-400' : 'text-amber-400';
          currentClient = activeRes.societeLocatrice;
          currentAgent = activeRes.agentNom;
          currentPhoto = activeRes.photoCampagneUrl;
          currentDates = { debut: activeRes.dateDebut, fin: activeRes.dateFin };
        }

        const reservations = (f.reservations || []).map((r: any) => {
          const dDebut = r.dateDebut?.seconds ? new Date(r.dateDebut.seconds * 1000) : new Date(r.dateDebut);
          const dFin = r.dateFin?.seconds ? new Date(r.dateFin.seconds * 1000) : new Date(r.dateFin);

          let status = '';
          let statusColor = '';

          if (now >= dDebut && now <= dFin) {
            const diffDays = Math.ceil((dFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            status = `✓ ${diffDays}j`;
            statusColor = 'text-emerald-400';
          } else if (now < dDebut) {
            const startDiffDays = Math.ceil((dDebut.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            status = `⏳ Dans ${startDiffDays}j`;
            statusColor = 'text-amber-400';
          } else {
            status = '✗ Terminé';
            statusColor = 'text-red-400';
          }

          const nbrMois = Math.max(1, (dFin.getFullYear() - dDebut.getFullYear()) * 12 + (dFin.getMonth() - dDebut.getMonth()));
          return { ...r, dDebut, dFin, status, statusColor, nbrMois };
        });

        return {
          ...f,
          faceId,
          reservations,
          currentStatus,
          currentStatusColor,
          currentClient,
          currentAgent,
          currentPhoto,
          currentDates
        };
      });
      return { ...p, commune: communeExtrait, faces: facesEnrichies };
    });

    return data.filter((p: any) => {
      const matchPays = geoFilter.pays === 'Tous' || (GEOGRAPHIE[geoFilter.pays] && Object.values(GEOGRAPHIE[geoFilter.pays]).some((v: any) => Object.values(v).flat().includes(p.commune)));
      const matchProvince = geoFilter.province === 'Tous' || (GEOGRAPHIE[geoFilter.pays]?.[geoFilter.province] && Object.values(GEOGRAPHIE[geoFilter.pays][geoFilter.province]).flat().includes(p.commune));
      const matchDistrict = geoFilter.district === 'Tous' || (GEOGRAPHIE[geoFilter.pays]?.[geoFilter.province]?.[geoFilter.district]?.includes(p.commune));
      const matchCommune = geoFilter.commune === 'Tous' || p.commune.toLowerCase() === geoFilter.commune.toLowerCase();
      const matchType = filter.type === 'Tous' || p.type === filter.type;
      const searchTerm = filter.search.toLowerCase();
      const matchSearch = (p.idPan || "").toLowerCase().includes(searchTerm) || (p.adresse || "").toLowerCase().includes(searchTerm);

      let matchStatus = filter.status === 'Tous';
      if (!matchStatus) {
        matchStatus = p.faces.some((f: any) => f.currentStatus === filter.status);
      }

      let matchAgent = filter.agent === 'Tous';
      if (!matchAgent) {
        matchAgent = p.faces.some((f: any) => f.currentAgent === filter.agent);
      }

      return matchPays && matchProvince && matchDistrict && matchCommune && matchType && matchSearch && matchStatus && matchAgent;
    });
  }, [rawPanneaux, filter, geoFilter]);

  // --- STATISTIQUES ---
  const stats = useMemo(() => {
    let totalFaces = 0;
    let totalReservations = 0;
    let totalActive = 0;
    let totalLibre = 0;
    let totalOccupe = 0;
    let totalReserve = 0;
    let totalRevenue = 0;

    processedData.forEach(p => {
      totalFaces += p.faces?.length || 0;
      p.faces?.forEach((f: any) => {
        totalReservations += f.reservations?.length || 0;
        if (f.currentStatus === 'Libre') totalLibre++;
        if (f.currentStatus === 'Occupé') totalOccupe++;
        if (f.currentStatus === 'Réservé') totalReserve++;

        f.reservations?.forEach((r: any) => {
          if (r.validationComptable === true) {
            totalRevenue += Number(r.montant) || 0;
          }
          const now = new Date();
          const dFin = r.dFin || new Date(r.dateFin);
          if (now <= dFin) totalActive++;
        });
      });
    });

    return {
      totalPanneaux: processedData.length,
      totalFaces,
      totalReservations,
      totalActive,
      totalLibre,
      totalOccupe,
      totalReserve,
      totalRevenue
    };
  }, [processedData]);

  // --- STATISTIQUES PAR AGENT ---
  const agentStats = useMemo(() => {
    const agents = new Map<string, any>();

    processedData.forEach(p => {
      p.faces?.forEach((f: any) => {
        f.reservations?.forEach((r: any) => {
          if (r.agentEmail) {
            const agent = agents.get(r.agentEmail);
            const montant = Number(r.montant) || 0;
            if (agent) {
              agent.reservations++;
              agent.revenue += montant;
              if (r.validationComptable === true) agent.validated++;
              if (f.currentStatus === 'Occupé' || f.currentStatus === 'Réservé') agent.activeFaces++;
            } else {
              agents.set(r.agentEmail, {
                nom: r.agentNom || r.agentEmail.split('@')[0],
                email: r.agentEmail,
                reservations: 1,
                revenue: montant,
                validated: r.validationComptable === true ? 1 : 0,
                activeFaces: (f.currentStatus === 'Occupé' || f.currentStatus === 'Réservé') ? 1 : 0
              });
            }
          }
        });
      });
    });
    return Array.from(agents.values()).sort((a, b) => b.reservations - a.reservations);
  }, [processedData]);

  // Navigation
  const ouvrirLaCarte = () => {
    router.push('/dashboard/superviseurs/superviseur');
  };

  const handleLogout = async () => {
    // Logique de déconnexion
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="absolute inset-0">
          <img src="/fond.jpg" className="w-full h-full object-cover opacity-50" alt="" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-amber-500 text-xs font-bold uppercase tracking-wider">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* FOND D'ÉCRAN FIXE AVEC PARALLAXE */}
      <motion.div className="fixed inset-0 z-0" style={{ y: yBg }}>
        <img src="/fond.jpg" className="w-full h-[115%] object-cover" alt="Background" />
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      </motion.div>

      {/* BARRE DE PROGRESSION */}
      <motion.div style={{ scaleX }} className="fixed top-0 left-0 right-0 h-0.5 bg-amber-500 z-[250] origin-left" />

      {/* CONTENU */}
      <div className="relative z-10 min-h-screen pb-20">

        {/* ========== HEADER PREMIUM (SANS ESPACES EXCESSIFS) ========== */}
        <nav className={`fixed top-0 inset-x-0 z-[150] px-2 sm:px-3 md:px-4 py-2 sm:py-3 ${!hidden ? 'backdrop-blur-3xl' : 'backdrop-blur-xl'} transition-all duration-500`}>
          <div className="w-full mx-auto">
            <motion.div
              initial={{ y: 0, opacity: 0 }}
              animate={{
                y: hidden ? -120 : 0,
                opacity: 1,
                scale: hidden ? 0.95 : 1
              }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
                opacity: { duration: 0.3 }
              }}
              className={`
                relative group overflow-visible
                flex items-center justify-between 
                min-h-[52px] sm:min-h-[60px] md:min-h-[68px]
                px-2 xs:px-3 sm:px-4 md:px-5 lg:px-6
                rounded-xl sm:rounded-2xl md:rounded-3xl
                transition-all duration-500
                ${hidden
                  ? 'bg-white/90 backdrop-blur-xl border-white/20 shadow-md'
                  : 'bg-gradient-to-r from-white/90 via-white/80 to-white/90 backdrop-blur-2xl border-white/30 shadow-xl shadow-black/5'
                }
                border
                hover:border-amber-400/50
                hover:shadow-lg hover:shadow-amber-400/10
              `}
            >
              {/* Effets visuels */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="absolute bottom-0 left-4 right-4 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-center" />

              {/* ========== LOGO ========== */}
              <div
                onClick={() => window.location.reload()}
                className="relative flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 cursor-pointer group/logo flex-shrink-0"
              >
                <div className="absolute -inset-1 rounded-xl border-2 border-amber-400/0 group-hover/logo:border-amber-400/20 transition-all duration-500" />

                <div className="relative">
                  <div className="absolute inset-0 bg-white rounded-lg shadow-sm" />
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-yellow-500/10 rounded-lg" />
                  <img
                    src={LOGO_URL}
                    className="relative w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-lg object-cover border border-amber-400/30 group-hover/logo:border-amber-400/60 transition-all duration-300 shadow-sm"
                    alt="Logo"
                  />
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 xs:w-2 xs:h-2 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full animate-pulse shadow-sm" />
                </div>

                <div className="flex flex-col leading-tight">
                  <span className="text-base xs:text-lg sm:text-xl md:text-2xl font-black italic uppercase tracking-tighter">
                    <span className="text-gray-800 group-hover/logo:text-amber-600 transition-all">G</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-600">D</span>
                    <span className="text-gray-800 group-hover/logo:text-amber-600 transition-all">P</span>
                  </span>
                  <span className="text-[3px] xs:text-[4px] sm:text-[5px] md:text-[6px] font-black uppercase tracking-[0.15em] xs:tracking-[0.2em] text-amber-600/70 whitespace-nowrap">
                    DASHBOARD
                  </span>
                </div>
              </div>

              {/* ========== BOUTONS DE NAVIGATION ========== */}
              <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-2.5">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/dashboard/superviseurs')}
                  className="group flex items-center justify-center p-2 xs:p-2.5 sm:px-3 sm:py-2.5 rounded-xl transition-all duration-300 bg-white/80 text-gray-600 shadow-sm hover:shadow-md hover:shadow-amber-400/20 border border-gray-100 active:bg-gray-100"
                  aria-label="Accueil"
                >
                  <Home size={16} className="xs:w-[17px] xs:h-[17px] sm:w-[18px] sm:h-[18px] text-gray-500 group-hover:text-amber-500 transition-all" />
                  <span className="hidden sm:inline ml-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide group-hover:text-amber-500 transition-colors">
                    Accueil
                  </span>
                </motion.button>
              </div>

              {/* ========== USER SECTION ========== */}

            </motion.div>
          </div>
        </nav>

        {/* ESPACE POUR LE HEADER FIXE */}
        <div className="h-16 sm:h-20 md:h-24" />

        <div className="w-full px-3 sm:px-4 py-3 sm:py-4">

          {/* FILTRES RESPONSIFS */}
          <div className="mb-4 p-3 sm:p-4 bg-black/40 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 space-y-2 sm:space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
              <select className="bg-black/40 border border-white/10 rounded-lg px-1.5 sm:px-2 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold outline-none truncate" onChange={(e) => setGeoFilter({ pays: e.target.value, province: 'Tous', district: 'Tous', commune: 'Tous' })}>
                <option value="Tous">🌍 Pays</option>
                {Object.keys(GEOGRAPHIE).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="bg-black/40 border border-white/10 rounded-lg px-1.5 sm:px-2 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold outline-none truncate" onChange={(e) => setGeoFilter({ ...geoFilter, province: e.target.value, district: 'Tous', commune: 'Tous' })}>
                <option value="Tous">🏛️ Province</option>
                {geoFilter.pays !== 'Tous' && Object.keys(GEOGRAPHIE[geoFilter.pays] || {}).map(pr => <option key={pr} value={pr}>{pr}</option>)}
              </select>
              <select className="bg-black/40 border border-white/10 rounded-lg px-1.5 sm:px-2 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold outline-none truncate" onChange={(e) => setGeoFilter({ ...geoFilter, district: e.target.value, commune: 'Tous' })}>
                <option value="Tous">📌 District</option>
                {geoFilter.province !== 'Tous' && Object.keys(GEOGRAPHIE[geoFilter.pays]?.[geoFilter.province] || {}).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="bg-black/40 border border-white/10 rounded-lg px-1.5 sm:px-2 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold outline-none truncate" onChange={(e) => setGeoFilter({ ...geoFilter, commune: e.target.value })}>
                <option value="Tous">📍 Commune</option>
                {geoFilter.district !== 'Tous' && (GEOGRAPHIE[geoFilter.pays]?.[geoFilter.province]?.[geoFilter.district] || []).map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="bg-black/40 border border-white/10 rounded-lg px-1.5 sm:px-2 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold outline-none" onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                <option value="Tous">📋 Statut</option>
                <option value="Libre">🟢 Libre</option>
                <option value="Occupé">🔵 Occupé</option>
                <option value="Réservé">🟡 Réservé</option>
              </select>
              <select className="bg-black/40 border border-white/10 rounded-lg px-1.5 sm:px-2 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold outline-none truncate" onChange={(e) => setFilter({ ...filter, agent: e.target.value })}>
                <option value="Tous">👤 Agent</option>
                {agentStats.map(a => <option key={a.email} value={a.nom}>{a.nom}</option>)}
              </select>
            </div>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500"
                size={14}
              />
              <input
                type="text"
                placeholder="Rechercher par ID ou adresse..."
                className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 sm:py-2 pl-9 pr-3 text-[9px] sm:text-[10px] outline-none"
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              />
            </div>
          </div>

          {/* ONGLETS */}
          <div className="flex gap-1 bg-black/30 p-1 rounded-full w-fit mx-auto sm:mx-0 mb-4 sm:mb-6">
            <button onClick={() => setActiveTab('overview')} className={`px-3 sm:px-4 py-1.5 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-bold transition-all ${activeTab === 'overview' ? 'bg-amber-500 text-black' : 'text-white/60'}`}>📊 Vue Globale</button>
            <button onClick={() => setActiveTab('faces')} className={`px-3 sm:px-4 py-1.5 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-bold transition-all ${activeTab === 'faces' ? 'bg-amber-500 text-black' : 'text-white/60'}`}>🎯 État des Faces</button>
            <button onClick={() => setActiveTab('agents')} className={`px-3 sm:px-4 py-1.5 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-bold transition-all ${activeTab === 'agents' ? 'bg-amber-500 text-black' : 'text-white/60'}`}>👥 Agents</button>
          </div>

          {/* VUE GLOBALE */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                <StatCard label="Panneaux" value={stats.totalPanneaux} icon={<Database size={12} />} color="amber" />
                <StatCard label="Faces" value={stats.totalFaces} icon={<Layers size={12} />} color="blue" />
                <StatCard label="Réservations" value={stats.totalReservations} icon={<Calendar size={12} />} color="purple" />
                <StatCard label="Actives" value={stats.totalActive} icon={<Activity size={12} />} color="emerald" />
                <StatCard label="Libres" value={stats.totalLibre} icon={<CheckCircle2 size={12} />} color="green" />
                <StatCard label="Occupées" value={stats.totalOccupe} icon={<Users size={12} />} color="blue" />
                <StatCard label="CA" value={`$${stats.totalRevenue.toLocaleString()}`} icon={<DollarSign size={12} />} color="amber" />
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 p-3 sm:p-4">
                <h3 className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-2"><TrendingUp size={12} /> Top 5 Agents</h3>
                <div className="space-y-1.5 sm:space-y-2">
                  {agentStats.slice(0, 5).map((agent, idx) => (
                    <div key={agent.email} className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 xs:gap-2 p-1.5 sm:p-2 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-1.5 sm:gap-2"><span className="text-[8px] sm:text-[9px] font-black text-amber-400 w-4 sm:w-5">#{idx + 1}</span><UserCheck size={10} className="text-white/40" /><span className="text-[9px] sm:text-[10px] font-bold text-white truncate">{agent.nom}</span></div>
                      <div className="flex gap-2 sm:gap-3 text-[7px] sm:text-[8px]"><span className="text-emerald-400">{agent.reservations} résa</span><span className="text-amber-400">${agent.revenue.toLocaleString()}</span><span className="text-blue-400">{agent.validated} valid.</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* VUE FACES */}
          {activeTab === 'faces' && (
            <div className="space-y-3 sm:space-y-4">
              {processedData.length > 0 ? processedData.map((pan) => (
                <div key={pan.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden">
                  <div className="p-3 sm:p-4 border-b border-white/10 bg-black/20">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg sm:rounded-xl flex items-center justify-center text-black font-black text-base sm:text-lg shadow-lg">{pan.idPan}</div>
                      <div><div className="flex items-center gap-1.5 sm:gap-2 flex-wrap"><span className="text-[10px] sm:text-xs font-bold text-white">{pan.type}</span><span className="text-[6px] sm:text-[7px] text-white/40">{pan.dimension}</span></div><div className="flex items-center gap-0.5 sm:gap-1"><MapPin size={8} className="text-red-500" /><span className="text-[7px] sm:text-[8px] text-white/50 truncate max-w-[180px] sm:max-w-none">{pan.adresse}</span></div></div>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">{pan.faces.map((face: any, idx: number) => <FaceStatusCard key={idx} face={face} />)}</div></div>
                </div>
              )) : <EmptyState />}
            </div>
          )}

          {/* VUE AGENTS */}
          {activeTab === 'agents' && (
            <div className="bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="bg-black/30 border-b border-white/10">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[8px] sm:text-[9px] font-black text-amber-400 uppercase">Agent</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[8px] sm:text-[9px] font-black text-amber-400 uppercase">Résa</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[8px] sm:text-[9px] font-black text-amber-400 uppercase">Actives</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[8px] sm:text-[9px] font-black text-amber-400 uppercase">Valid.</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[8px] sm:text-[9px] font-black text-amber-400 uppercase">CA</th>
                  </tr>
                </thead>
                <tbody>
                  {agentStats.map((agent) => (
                    <tr key={agent.email} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-2 sm:px-4 py-2 sm:py-3"><div className="flex items-center gap-1.5 sm:gap-2"><div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center text-[6px] sm:text-[7px] font-black text-white">{agent.nom.charAt(0)}</div><span className="text-[9px] sm:text-[10px] font-bold text-white truncate max-w-[80px] sm:max-w-none">{agent.nom}</span></div></td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[9px] sm:text-[10px] text-emerald-400 font-bold">{agent.reservations}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[9px] sm:text-[10px] text-blue-400 font-bold">{agent.activeFaces}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[9px] sm:text-[10px] text-amber-400 font-bold">{agent.validated}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[9px] sm:text-[10px] font-black text-white">${agent.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANTS
// ============================================
const FaceStatusCard = ({ face }: any) => {
  const getStatusIcon = () => {
    switch (face.currentStatus) {
      case 'Libre': return <CheckCircle2 size={12} className="text-emerald-400" />;
      case 'Occupé': return <Users size={12} className="text-blue-400" />;
      case 'Réservé': return <Calendar size={12} className="text-amber-400" />;
      default: return <AlertCircle size={12} className="text-gray-400" />;
    }
  };
  const getStatusBg = () => {
    switch (face.currentStatus) {
      case 'Libre': return 'bg-emerald-500/10 border-emerald-500/30';
      case 'Occupé': return 'bg-blue-500/10 border-blue-500/30';
      case 'Réservé': return 'bg-amber-500/10 border-amber-500/30';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  };
  return (
    <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border ${getStatusBg()} transition-all hover:scale-[1.01] sm:hover:scale-[1.02]`}>
      <div className="flex justify-between items-start mb-1 sm:mb-2">
        <div className="flex items-center gap-1 sm:gap-2">
          {getStatusIcon()}
          <span className="text-amber-400 text-[8px] sm:text-[9px] font-black">{face.faceId}</span>
          <span className="text-[6px] sm:text-[7px] text-white/40 hidden xs:inline">{face.sens}</span>
        </div>
        <span className={`text-[7px] sm:text-[8px] font-black uppercase ${face.currentStatusColor}`}>
          {face.currentStatus === 'Libre' ? 'Libre' : face.currentStatus === 'Occupé' ? 'Occupé' : 'Réservé'}
        </span>
      </div>
      {face.currentStatus !== 'Libre' && face.currentClient ? (
        <>
          {face.currentPhoto && (
            <div className="mb-1 sm:mb-2">
              <img src={face.currentPhoto} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover border border-white/20" alt="" />
            </div>
          )}
          <p className="text-[8px] sm:text-[9px] font-bold text-white truncate">{face.currentClient}</p>
          <p className="text-[6px] sm:text-[7px] text-white/40 truncate">{face.currentAgent}</p>
          {face.currentDates && (
            <p className="text-[6px] sm:text-[7px] text-white/30 mt-0.5 sm:mt-1">{face.currentDates.debut} → {face.currentDates.fin}</p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center py-2 sm:py-3">
          <p className="text-[7px] sm:text-[8px] text-white/30">📢 Disponible</p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => {
  const colors: Record<string, string> = {
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30'
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.amber} border rounded-lg p-1.5 sm:p-2 text-center`}>
      <div className="flex justify-center mb-0.5 sm:mb-1 text-white/40">{icon}</div>
      <p className="text-sm sm:text-base md:text-lg font-black text-white">{value}</p>
      <p className="text-[6px] sm:text-[7px] text-white/50 uppercase tracking-wider">{label}</p>
    </div>
  );
};

const EmptyState = () => (
  <div className="text-center py-12 sm:py-16 bg-white/5 rounded-xl sm:rounded-2xl border border-dashed border-white/10">
    <Database size={24} className="mx-auto text-white/20 mb-2" />
    <p className="text-white/40 text-xs sm:text-sm">Aucune donnée trouvée</p>
  </div>
);

export default ReportPage;