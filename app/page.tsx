"use client";

import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useSpring, useMotionValueEvent } from 'framer-motion';

// Ajoutez ces imports spécifiques à Firestore
import {
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import {
  Search, MapPin, Filter, PlusCircle, CheckCircle2,
  Menu, X, Home, Zap, Globe,
  Lock, Mail, Loader2, FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
  authDomain: "kin-geo-market.firebaseapp.com",
  projectId: "kin-geo-market",
  storageBucket: "kin-geo-market.firebasestorage.app",
  messagingSenderId: "50335362445",
  appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// --- COMPOSANT ELEGANT CARD ---

const ElegantCard = ({ panneau, selectedIds = [], onSelect, index, onEdit }: any) => {
  const [selectedFaceDetails, setSelectedFaceDetails] = useState<any>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const faces = panneau?.faces || [];

  const getStatusStyles = (statut: string) => {
    switch (statut?.toLowerCase()) {
      case 'occupé': return "bg-red-500/20 text-red-400 border-red-500/40";
      case 'réservé': return "bg-orange-500/20 text-orange-400 border-orange-500/40";
      case 'maintenance': return "bg-blue-500/20 text-blue-400 border-blue-400/40";
      default: return "bg-green-500/20 text-green-400 border-green-500/40";
    }
  };

  const downloadImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `campagne_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) { console.error("Erreur téléchargement", err); }
  };

  const LOGO_DISPROMALT = "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg";
  const getActiveData = (face: any) => {
    const now = new Date();
    // On met les heures à 0 pour ne comparer que les jours
    now.setHours(0, 0, 0, 0);

    // Chercher une réservation active parmi toutes les réservations de la face
    const currentRes = face.reservations?.find((res: any) => {
      const debut = new Date(res.dateDebut);
      const fin = new Date(res.dateFin);
      debut.setHours(0, 0, 0, 0);
      fin.setHours(0, 0, 0, 0);

      return now >= debut && now <= fin;
    });

    if (currentRes) {
      return {
        hasReservation: true,
        label: currentRes.statut || "Occupé",
        photo: currentRes.photoCampagneUrl || face.photoCampagneUrl || LOGO_DISPROMALT,
        client: currentRes.societeLocatrice,
        agent: currentRes.agentNom || "Non spécifié",
        dates: `${new Date(currentRes.dateDebut).toLocaleDateString()} - ${new Date(currentRes.dateFin).toLocaleDateString()}`
      };
    }

    // Si on est ici, aucune réservation n'est active aujourd'hui
    return {
      hasReservation: false,
      label: "Libre",
      photo: face.photoParDefaut || LOGO_DISPROMALT,
      client: null,
      agent: null,
      dates: null
    };
  };


  return (
    <>
      <AnimatePresence>
        {selectedFaceDetails && (
          <FaceDetailModal isOpen={true} onClose={() => setSelectedFaceDetails(null)} panneau={panneau} face={selectedFaceDetails} />
        )}
      </AnimatePresence>

      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-lg" alt="Zoom" />
        </div>
      )}

      {faces.map((face: any, fIdx: number) => {
        const data = getActiveData(face);
        const displayId = `${panneau.idPan}-${face.id || fIdx + 1}`;

        return (
          <motion.div key={fIdx} className="relative w-full h-[450px] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 group">

            {/* IMAGE ET LOGIQUE D'INTERACTION */}
            <div className="absolute inset-0 overflow-hidden">
              <img src={data.photo} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none" alt="Face" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              <div
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={() => setZoomedImage(data.photo)}
                onMouseDown={() => setPressTimer(setTimeout(() => downloadImage(data.photo), 600))}
                onMouseUp={() => pressTimer && clearTimeout(pressTimer)}
                onMouseLeave={() => pressTimer && clearTimeout(pressTimer)}
                onTouchStart={() => setPressTimer(setTimeout(() => downloadImage(data.photo), 600))}
                onTouchEnd={() => pressTimer && clearTimeout(pressTimer)}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>

            {/* BADGE STATUT */}
            <div className="absolute top-4 right-4">
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-md ${getStatusStyles(data.label)}`}>
                {data.label}
              </span>
            </div>

            {/* INFOS */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="mb-4">
                <h3 className="text-2xl font-black italic uppercase">Face : {displayId}</h3>
                <p className="text-[10px] text-[#d4af37] font-bold uppercase">{panneau.adresse} • Zone: {panneau.zone}</p>
                <p className="text-[10px] text-white/60 font-bold uppercase">Dimension: {panneau.dimension}</p>
              </div>


              {data.hasReservation && (
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md mb-4 border border-white/10">
                  <p className="text-[8px] uppercase text-white/50 font-bold">
                    Client: <span className="text-white">{data.client}</span>
                  </p>
                  <p className="text-[8px] uppercase text-white/50 font-bold">
                    Agent: <span className="text-white">{data.agent}</span>
                  </p>
                  <p className="text-[8px] uppercase text-white/50 font-bold">
                    Période: <span className="text-white">{data.dates}</span>
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFaceDetails(face);
                  }}
                  className="relative z-20 flex-1 py-3 bg-white/10 backdrop-blur-md rounded-xl text-[10px] font-black uppercase hover:bg-white hover:text-black transition-all"
                >
                  Détails
                </button>

              </div>
            </div>
          </motion.div>
        );
      })}
    </>
  );
};


import { LogOut, } from 'lucide-react';

// --- PAGE PRINCIPALE ---
export default function UltimateSupervisor() {

  // 1. TOUS LES ÉTATS
  const [panneauxData, setPanneauxData] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filters, setFilters] = useState({ zone: '', statut: '', format: '' });
  const [hidden, setHidden] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const router = useRouter();

  // 2. HOOKS (Framer Motion & Scroll)
  const { scrollYProgress, scrollY } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  // 3. ACTIONS
  const ouvrirLaCarte = () => {
    router.push('/dashboard/client');
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    router.push('/');
  };

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(latest > previous && latest > 150);
  });

  // 4. EFFETS (Firebase)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "panneaux"), (snap) => {
      setPanneauxData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 5. LOGIQUE DE FILTRAGE
  const filtered = panneauxData.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term ||
      p.idPan?.toLowerCase().includes(term) ||
      p.zone?.toLowerCase().includes(term);

    const matchesZone = filters.zone === '' || p.zone === filters.zone;
    const matchesFormat = filters.format === '' || (p.type === filters.format || p.format === filters.format);

    const filterStatut = filters.statut?.toLowerCase();
    const matchesStatut = !filterStatut || (
      Array.isArray(p.faces) && p.faces.some((f: any) => f?.statut?.toLowerCase() === filterStatut)
    );

    return matchesSearch && matchesZone && matchesFormat && matchesStatut;
  });

  const logoUrl = "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg";

  if (loading) {
    return (
      <div className="h-screen bg-[#1e40af] flex flex-col items-center justify-center">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.5 }}>
          <img src={logoUrl} className="w-20 h-20 rounded-2xl shadow-2xl shadow-[#d4af37]/20" alt="Loading" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[#1e40af] text-white overflow-x-hidden font-sans selection:bg-[#d4af37]/30">
      {/* Barre de progression dorée */}
      <motion.div style={{ scaleX }} className="fixed top-0 left-0 right-0 h-1 bg-[#d4af37] z-[250] origin-left" />

      {/* BACKGROUND EFFECTS - Bleu profond & Doré */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-[#2563eb]/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#d4af37]/5 rounded-full blur-[120px]" />
      </div>

      {/* NAV HEADER */}
      <nav className="fixed top-0 inset-x-0 z-[150] p-4 lg:p-6">
        <div className="max-w-[1500px] mx-auto">
          <motion.div
            animate={{ y: hidden ? -120 : 0 }}
            className="flex items-center justify-between h-20 px-6 lg:px-10 rounded-[2.5rem] bg-[#1e40af]/60 backdrop-blur-3xl border border-white/10 shadow-2xl"
          >
            {/* LOGO */}
            <div onClick={() => window.location.reload()} className="flex items-center gap-4 cursor-pointer group">
              <img src={logoUrl} className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl object-cover border border-white/10" alt="Logo" />
              <div className="flex flex-col leading-[0.75]">
                <span className="text-2xl lg:text-3xl font-black uppercase italic text-white">G<span className="text-[#d4af37]">D</span>P</span>
                <span className="text-[6px] font-black uppercase tracking-[0.3em] text-[#d4af37] mt-1">Gestion Digitale</span>
              </div>
            </div>

            {/* DESKTOP MENU */}
            <div className="hidden xl:flex items-center gap-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-[#d4af37] text-black px-6 py-3 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all shadow-lg shadow-[#d4af37]/20 active:scale-95"
              >
                Accueil
              </button>

              <button
                onClick={ouvrirLaCarte}
                className="flex items-center gap-2 bg-[#d4af37] text-black px-6 py-3 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all shadow-lg shadow-[#d4af37]/20 active:scale-95"
              >
                <MapPin size={14} />
                Carte interactive
              </button>

              <button

                className="bg-red-600 text-white px-8 py-4 rounded-full font-[1000] uppercase text-[11px] tracking-[0.2em] hover:bg-red-700 transition-all shadow-xl shadow-red-600/30 active:scale-95 border border-white/10"
              >
                Vous avez une commande
              </button>

              <div className="h-6 w-px bg-white/10 mx-2" />

              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center gap-2 bg-white/5 border border-[#d4af37]/30 text-[#d4af37] px-6 py-3 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-[#d4af37] hover:text-black transition-all"
              >
                <Filter size={14} /> Menu Filtre
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="xl:hidden p-3 bg-white/5 rounded-2xl border border-white/10 text-[#d4af37] hover:bg-[#d4af37]/10 transition-all"
            >
              <Menu size={28} />
            </button>
          </motion.div>
        </div>
      </nav>

      {/* SIDEBAR / MENU LATÉRAL */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-white/[0.02] backdrop-blur-[3px] z-[250] cursor-pointer"
            />
            <motion.div
              initial={{ x: "100%", opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.5 }}
              transition={{ type: "spring", damping: 25, stiffness: 150 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-[#1e40af] border-l border-white/30 z-[300] flex flex-col shadow-[-40px_0_80px_rgba(0,0,0,0.4)]"
            >
              <div className="p-10 flex justify-between items-center border-b border-white/20 bg-black/10">
                <div className="flex flex-col">
                  <span className="text-2xl font-black italic uppercase text-white tracking-tighter leading-none">
                    Menu <span className="text-[#d4af37] drop-shadow-[0_2px_10px_rgba(212,175,55,0.4)]">Général</span>
                  </span>
                  <span className="text-[7px] font-black uppercase tracking-[0.5em] text-white/40 mt-1">Système de Supervision</span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="group p-3 bg-white/5 hover:bg-red-500/80 rounded-2xl transition-all border border-white/10 shadow-xl"
                >
                  <X size={22} className="text-white group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#d4af37] group-focus-within:scale-110 transition-transform" size={20} />
                  <input
                    type="text"
                    placeholder="RECHERCHER UN ÉLÉMENT..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/40 border-2 border-white/5 rounded-2xl py-6 pl-14 pr-6 text-[12px] font-black uppercase outline-none focus:border-[#d4af37]/50 focus:bg-black/60 text-white placeholder:text-white/20 shadow-inner transition-all"
                  />
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.4em] mb-6 opacity-80">Exploration</p>
                  {[
                    { icon: <Home size={20} />, label: "Tableau de Bord", action: () => window.location.reload() },
                    { icon: <MapPin size={20} />, label: "Carte Interactive", action: ouvrirLaCarte },
                    {
                      icon: <PlusCircle size={20} />,
                      label: "Réservé aux Admins",
                      action: () => setIsLoginOpen(true)
                    },].map((item, i) => (
                      <button
                        key={i}
                        onClick={() => { item.action(); setIsSidebarOpen(false); }}
                        className="w-full flex items-center justify-between p-6 rounded-[1.5rem] bg-white/5 hover:bg-white 
                      hover:text-[#1e40af] border border-white/10 text-white font-black uppercase text-[11px] 
                      tracking-widest transition-all shadow-lg active:scale-95 group"
                      >
                        <div className="flex items-center gap-5">
                          <span className="group-hover:text-[#1e40af] transition-colors">{item.icon}</span>
                          {item.label}
                        </div>
                        <div className="w-2 h-2 rounded-full bg-[#d4af37] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                </div>

                <div className="space-y-6 pt-8 border-t border-white/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Filter size={14} className="text-[#d4af37]" />
                    <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Filtres Intelligents</p>
                  </div>
                  <div className="grid gap-5">
                    <select
                      value={filters.zone}
                      onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                      className="w-full bg-black/30 border border-white/10 rounded-2xl p-5 text-[11px] font-black text-white uppercase outline-none focus:border-[#d4af37] cursor-pointer appearance-none shadow-md"
                    >
                      <option value="" className="bg-[#1e40af]">Toutes les Communes</option>
                      {Array.from(new Set(panneauxData.map(p => p.zone))).filter(Boolean).sort().map(z => (
                        <option key={z} value={z} className="bg-[#1e40af]">{z}</option>
                      ))}
                    </select>
                    <div className="flex gap-3">
                      {['Libre', 'Occupé'].map(s => (
                        <button
                          key={s}
                          onClick={() => setFilters({ ...filters, statut: filters.statut === s ? '' : s })}
                          className={`flex-1 py-5 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${filters.statut === s
                            ? 'bg-[#d4af37] text-black border-white shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-[1.05]'
                            : 'bg-black/20 border-white/10 text-white hover:border-white/40'
                            }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <main className="relative z-10 max-w-[1500px] mx-auto px-6 pt-44 pb-40">
        <header className="mb-20 relative">
          {/* HALO DE FOND SUBTIL */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-red-600/5 blur-[100px] rounded-full pointer-events-none" />

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-start gap-6">

              {/* INDICATEUR DE LIGNE ROUGE AFFINÉ */}
              <div className="w-[3px] h-24 bg-gradient-to-b from-red-600 via-red-600/20 to-transparent shadow-[0_0_15px_#ef4444] rounded-full mt-2" />

              <div className="space-y-4">
                {/* TITRE RÉDUIT ET AJUSTÉ */}
                <div className="space-y-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-black text-red-500 uppercase tracking-[0.4em]">Network Status: Online</span>
                    <div className="w-1 h-1 bg-red-600 rounded-full animate-ping" />
                  </div>

                  <h1 className="text-4xl lg:text-6xl font-[1000] text-white tracking-tighter uppercase italic leading-[0.9]">
                    GESTION <br />
                    <span className="text-[#d4af37]">DIGITALE</span> <br />
                    {/* AJOUT DU MOT PANNEAUX EN ROUGE ÉCLATANT */}
                    <span className="text-red-600 text-3xl lg:text-5xl not-italic tracking-[0.2em] font-black drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                      PANNEAUX
                    </span>
                  </h1>
                </div>

                {/* BADGE D'INVENTAIRE DASHBOARD STYLE */}
                <div className="flex flex-wrap items-center gap-4 mt-6">
                  <div className="flex items-center gap-4 bg-black/40 backdrop-blur-2xl px-6 py-4 rounded-3xl border border-white/10 hover:border-red-600/30 transition-all duration-500">

                    <div className="relative p-2 bg-white/5 rounded-xl">
                      <Globe size={16} className="text-[#d4af37]" />
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]" />
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Database Sync</span>
                      <span className="text-lg font-black text-white italic">
                        {filtered.reduce((acc, p) => acc + (p.faces?.length || 0), 0)}
                        <span className="text-[9px] text-red-500 not-italic ml-2 tracking-widest uppercase">Faces Actives</span>
                      </span>
                    </div>

                    {/* MICRO PANNEAUX HUD ROUGES */}
                    <div className="flex gap-0.5 ml-2 border-l border-white/10 pl-4">
                      <div className="w-1 h-3 bg-red-600 rounded-full animate-[bounce_2s_infinite]" />
                      <div className="w-1 h-3 bg-red-600/30 rounded-full" />
                    </div>
                  </div>

                  {/* INDICATEUR DE RÉGIE ROUGE */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-600/10 border border-red-600/20 rounded-xl">
                    <div className="w-1.5 h-1.5 bg-red-600 rounded-full shadow-[0_0_5px_#ef4444]" />
                    <span className="text-[8px] font-black text-red-500 uppercase tracking-widest italic">Régie Dispromalt</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </header>

        {/* GRILLE DES PANNEAUX */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {filtered.map((p, idx) => (
              <ElegantCard
                key={p.id}
                panneau={p}
                index={idx}
                // "selected" contient maintenant des clés type "IDPANNEAU_IDFACE"
                selectedIds={selected}
                onSelect={(selectionKey: string) => {
                  // On reçoit la clé combinée venant de la modale ou de la carte
                  setSelected((prev) =>
                    prev.includes(selectionKey)
                      ? prev.filter((id) => id !== selectionKey) // Si déjà là, on retire
                      : [...prev, selectionKey]                // Sinon, on ajoute
                  );
                }}
                ouvrirLaCarte={ouvrirLaCarte}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {filtered.length === 0 && (
          <div className="py-40 text-center">
            <p className="text-zinc-200/50 font-black uppercase tracking-[0.5em] italic">Aucun panneau trouvé</p>
          </div>
        )}
      </main>

      {/* PANIER FLOTTANT */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ y: 150, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 150, x: '-50%', opacity: 0 }}
            className="fixed bottom-10 left-1/2 w-[90%] max-w-xl z-[200]"
          >
            <div className="bg-[#d4af37] p-[2px] rounded-[3rem] shadow-2xl shadow-[#d4af37]/30">
              <div className="bg-[#1e40af] rounded-[2.9rem] p-4 flex items-center justify-between">
                <div className="flex items-center gap-5 ml-6">
                  <div className="bg-[#d4af37] p-3 rounded-full text-black">
                    <Zap size={20} fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-[#d4af37] tracking-widest">Sélection active</p>
                    <p className="text-2xl font-black italic leading-none text-white">{selected.length} Face{selected.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelected([])} className="px-5 text-[10px] font-black uppercase text-zinc-200/60 hover:text-white transition-colors">
                    Vider
                  </button>
                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="bg-[#d4af37] text-black px-8 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.15em] hover:bg-white hover:scale-105 transition-all shadow-xl active:scale-95 flex items-center gap-2"
                  >
                    Planifier
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      <AnimatePresence>
        {isCartOpen && (
          <CartModall
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            selectedIds={selected}
            panneauxData={panneauxData}
          />
        )}
      </AnimatePresence>




      {/* SECTION MODALES UNIFIÉE */}
      <AnimatePresence mode="wait">
        {/* MODALE CONNEXION (Appel unique) */}
        {isLoginOpen && (
          <LoginModal
            isOpen={isLoginOpen}
            onClose={() => setIsLoginOpen(false)}
          />
        )}
      </AnimatePresence>


    </div>
  );
}




// --- MODAL DÉTAILS ---

const FaceDetailModal = ({ isOpen, onClose, panneau, face, onSelect, isSelected, ouvrirLaCarte }: any) => {
  if (!isOpen || !face) return null;

  const isLibre = face.statut?.toLowerCase() === 'libre';
  const selectionKey = `${panneau.id}_${face.id}`;

  const metrics = [
    { label: "Visibilité", value: face.visibilite || 85, color: "bg-blue-400" },
    { label: "Exposition", value: face.exposition || 70, color: "bg-blue-300" },
    { label: "Mobimétrie", value: face.mobimetrie || 92, color: "bg-[#d4af37]" },
    { label: "Audience Est.", value: face.audience || 65, color: "bg-sky-400" },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
      onClick={onClose} // CLIC SUR LE FOND NOIR = FERMETURE
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()} // CLIC SUR LA MODALE = NE FERME PAS
        className="bg-[#1e40af] border border-white/10 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl cursor-default relative"
      >
        {/* IMAGE + BOUTON CROIX RENFORCÉ */}
        <div className="relative aspect-video">
          <img
            src={face.photoCampagneUrl || "https://via.placeholder.com/800x600"}
            className="w-full h-full object-cover"
            alt={`Panneau ${panneau.idPan}`}
          />

        </div>


        {/* BOUTON FERMER (X) DYNAMIQUE */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 md:top-10 md:right-10 z-[100] p-3 rounded-2xl bg-black/20 border border-white/10 text-white/40 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-300 group"
        >
          <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>





        <div className="p-8 space-y-6">
          {/* HEADER INFO */}
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-lg font-black text-white italic uppercase tracking-tighter leading-none">
                Face: {face.faceId}
              </h3>
              <p className="text-[9px] font-black text-[#d4af37] uppercase mt-2 tracking-[0.1em] opacity-90 flex flex-wrap gap-2">
                <span>ID: {panneau.idPan}</span>
                <span className="text-white/20">|</span>
                <span>{panneau.zone}</span>
                <span className="text-white/20">•</span>
                <span>{panneau.adresse}</span>
                <span className="text-white/20">•</span>
                <span className="text-white/60">{panneau.type}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest">Dimension</p>
              <p className="text-[10px] font-black text-white">{panneau.dimension || '12x4m'}</p>
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* STATISTIQUES */}
            <div className="space-y-4">
              <h3 className="text-white text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-white/80">Performance</h3>
              {metrics.map((m, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-white/70">
                    <span>{m.label}</span>
                    <span>{m.value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.value}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full ${m.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* FICHE TECHNIQUE */}
            {/* FICHE TECHNIQUE COMPLÈTE */}
            <div className="bg-black/10 rounded-3xl p-6 space-y-3 border border-white/5 shadow-inner">
              <h3 className="text-[#d4af37] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Fiche Technique</h3>

              {/* ADRESSE */}
              <div className="flex justify-between border-b border-white/5 pb-2 text-[10px] font-bold uppercase">
                <span className="text-white/50">Adresse</span>
                <span className="text-white text-right ml-4">{panneau.adresse || 'Non spécifiée'}</span>
              </div>

              {/* ZONE / COMMUNE */}
              <div className="flex justify-between border-b border-white/5 pb-2 text-[10px] font-bold uppercase">
                <span className="text-white/50">Zone</span>
                <span className="text-white">{panneau.zone || 'N/A'}</span>
              </div>

              {/* TYPE */}
              <div className="flex justify-between border-b border-white/5 pb-2 text-[10px] font-bold uppercase">
                <span className="text-white/50">Type</span>
                <span className="text-white">{panneau.type || 'Standard'}</span>
              </div>

              {/* SENS TRAFIC (Vient de la face) */}
              <div className="flex justify-between border-b border-white/5 pb-2 text-[10px] font-bold uppercase">
                <span className="text-white/50">Sens Trafic</span>
                <span className="text-white">{face.sens || 'N/A'}</span>
              </div>

              {/* PRIX */}
              <div className="flex justify-between border-b border-white/5 pb-2 text-[10px] font-bold uppercase">
                <span className="text-white/50">Tarif Mensuel</span>
                <span className="text-[#d4af37] font-black">
                  {panneau.prix ? `${Number(panneau.prix).toLocaleString()} $` : 'Sur devis'}
                </span>
              </div>

              {/* STATUT */}
              <div className="mt-4 p-2 bg-black/20 rounded-lg text-center">
                <span className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full ${isLibre ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                  {face.statut || 'Inconnu'}
                </span>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <button
              type="button"
              className="flex items-center justify-center gap-3 py-4 rounded-2xl border border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37] text-[10px] font-black uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-all cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                ouvrirLaCarte();
                onClose();
              }} >
              <MapPin size={16} /> Voir sur la carte
            </button>

            <button
              type="button"
              disabled={!isLibre}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(selectionKey);
              }}
              className={`flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${!isLibre
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                : isSelected
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-[#d4af37] text-black hover:bg-white hover:scale-[1.02] shadow-[#d4af37]/20 cursor-pointer active:scale-95'
                }`}
            >
              {isSelected ? <X size={16} /> : <PlusCircle size={16} />}
              {isSelected ? 'Retirer' : 'Ajouter'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};



interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  panneauxData: any[];
}

const CartModall = ({ isOpen, onClose, selectedIds = [], panneauxData = [] }: CartModalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  // 1. Préparation des données (CORRIGÉ : Recherche par index si l'ID n'existe pas)
  const selectedFaces = (selectedIds || [])
    .map((fullId: string) => {
      const [panId, faceIndexStr] = fullId.split('_');
      const panneau = panneauxData?.find((p: any) => p.id === panId);

      // On cherche la face soit par son ID, soit par son index dans le tableau
      const faceIndex = parseInt(faceIndexStr);
      const face = panneau?.faces?.[faceIndex] || panneau?.faces?.find((f: any) => f.id?.toString() === faceIndexStr);

      if (!panneau || !face) return null;

      const loc = [panneau.zone, panneau.adresse].filter(Boolean).join(" — ");

      let rawPrix = face.prix;
      if (typeof rawPrix === 'string') {
        rawPrix = rawPrix.replace(/[^\d.-]/g, '');
      }
      const prixNumerique = parseFloat(rawPrix) || 0;

      return {
        idPan: panneau.idPan || 'N/A',
        faceId: faceIndexStr,
        adresse: loc || 'Localisation non spécifiée',
        prix: prixNumerique
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const totalPrix = selectedFaces.reduce((acc, curr) => acc + curr.prix, 0);

  // 2. Génération du PDF
  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString('fr-FR');
      const documentNumber = `GDP-${Math.floor(10000 + Math.random() * 90000)}`;

      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(212, 175, 55);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("GDP - DEVIS OFFICIEL", 15, 20);

      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`DATE : ${date}`, 150, 15);
      doc.text(`RÉFÉRENCE : ${documentNumber}`, 150, 22);

      const tableRows = selectedFaces.map(item => [
        `${item.idPan} (Face ${item.faceId})`,
        item.adresse,
        `${item.prix.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $`
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['RÉFÉRENCE', 'LOCALISATION', 'TARIF MENSUEL (HT)']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], textColor: [212, 175, 55] },
        styles: { fontSize: 9 },
        foot: [[
          { content: 'TOTAL GÉNÉRAL', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: `${totalPrix.toLocaleString('fr-FR')} $ USD`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ]]
      });

      doc.save(`GDP_DEVIS_${documentNumber}.pdf`);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      alert("Erreur lors de la création du PDF.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl cursor-pointer"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1e40af] border border-white/20 w-full max-w-4xl rounded-[3rem] overflow-hidden flex flex-col shadow-2xl cursor-default"
      >
        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-black/[0.1]">
          <div>
            <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">
              Votre <span className="text-[#d4af37]">Panier</span>
            </h2>
            <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1">
              {selectedFaces.length} face(s) prête(s) pour votre campagne
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/10 text-white hover:bg-red-500 transition-all rounded-full cursor-pointer shadow-lg"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[50vh] p-8 custom-scrollbar">
          {selectedFaces.length > 0 ? (
            <table className="w-full text-left border-separate border-spacing-y-3">
              <thead>
                <tr className="text-white/40 text-[10px] uppercase tracking-[0.2em]">
                  <th className="px-6 pb-2 font-black">Identification</th>
                  <th className="px-6 pb-2 font-black">Zone & Détails</th>
                  <th className="px-6 pb-2 text-right font-black">Prix HT</th>
                </tr>
              </thead>
              <tbody>
                {selectedFaces.map((item, i) => (
                  <tr key={i} className="bg-black/20 hover:bg-black/30 transition-colors group rounded-2xl">
                    <td className="p-6 rounded-l-2xl border-l-4 border-[#d4af37]">
                      <div className="font-black text-white text-sm">ID: {item.idPan}</div>
                      <div className="text-[#d4af37] text-[10px] font-black uppercase">Face {item.faceId}</div>
                    </td>
                    <td className="p-6">
                      <p className="text-white/80 text-xs font-medium leading-relaxed max-w-xs italic">{item.adresse}</p>
                    </td>
                    <td className="p-6 rounded-r-2xl text-right">
                      <span className="font-black text-white text-xl">
                        {item.prix.toLocaleString('fr-FR')} $
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-30 text-white">
              <FileText size={64} strokeWidth={1} className="mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">Le panier est vide</p>
            </div>
          )}
        </div>

        <div className="p-10 bg-black/30 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">Total estimé mensuel</span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-[#d4af37] italic drop-shadow-lg">
                {mounted ? totalPrix.toLocaleString('fr-FR') : "0"}
              </span>
              <span className="text-xl font-bold text-[#d4af37]">$</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <button
              onClick={onClose}
              className="px-8 py-5 rounded-2xl border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
            >
              Modifier
            </button>
            <button
              onClick={generatePDF}
              disabled={selectedFaces.length === 0}
              className="px-12 py-5 bg-[#d4af37] text-black rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-[#d4af37]/20 hover:bg-white hover:scale-[1.05] active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
            >
              <FileText size={18} />
              Générer le Devis PDF
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};







import { doc, getDoc, } from 'firebase/firestore';

import { ShieldCheck, } from 'lucide-react';

import {
  updateDoc,        // <--- Vérifie cet import
  serverTimestamp   // <--- Vérifie cet import
} from 'firebase/firestore';

import { signOut } from 'firebase/auth';


import { useAuth } from "@/context/AuthContext"; // Si tu es dans app/


interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);



  // 2. APPELLE LE HOOK ICI (tout en haut du composant, pas dans handleLogin)

  const { login } = useAuth();


  if (!isOpen) return null;



  const [showPassword, setShowPassword] = useState(false); // ICI !

  if (!isOpen) return null;

  const logoUrl = "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg";

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  // Nettoyage des entrées pour éviter les erreurs 400 stupides (espaces, casses)
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanPassword) {
    alert("Veuillez remplir tous les champs.");
    setLoading(false);
    return;
  }

  try {
    let userData: any = null;
    let userId: string = "";

    // --- ÉTAPE 1 : TENTATIVE DE CONNEXION VIA FIREBASE AUTH ---
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      userId = userCredential.user.uid;
      
      // On cherche les infos dans la collection "societes"
      const docSnap = await getDoc(doc(db, "societes", userId));
      if (docSnap.exists()) {
        userData = docSnap.data();
      }
    } catch (authError: any) {
      console.warn("Auth standard échouée, tentative recherche manuelle Firestore...");
      
      // --- ÉTAPE 1B : RECHERCHE MANUELLE (Si l'user n'est pas dans Auth mais uniquement dans Firestore) ---
      const q = query(
        collection(db, "societes"), 
        where("email", "==", cleanEmail), 
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const resDoc = querySnapshot.docs[0];
        const data = resDoc.data();
        
        // VÉRIFICATION DU MOT DE PASSE EN CLAIR (Attention: Sécurité faible)
        if (data.password === cleanPassword) {
          userId = resDoc.id;
          userData = data;
        } else {
          throw new Error("Mot de passe incorrect.");
        }
      } else {
        throw new Error("Utilisateur introuvable.");
      }
    }

    if (!userData) {
      throw new Error("Identifiants incorrects ou compte inexistant.");
    }

    // --- ÉTAPE 2 : VÉRIFICATION DU STATUT ACTIF ---
    if (userData.actif !== true) {
      if (auth.currentUser) await signOut(auth);
      throw new Error("Compte non activé. Contactez l'administrateur.");
    }

    // --- ÉTAPE 3 : ROUTAGE ---
    const routes: Record<string, string> = {
      visiteur: '/dashboard/visiteurs',
      admin: '/dashboard/admin',
      superviseurs: '/dashboard/components', // Ajout du / manquant
      commercial: '/dashboard/superviseurs',
      comptable: '/dashboard/Comptable',
      client: '/dashboard/client'
    };

    // On récupère le rôle et on nettoie pour la correspondance
    const userRole = userData.role?.toLowerCase() || "";
    const targetRoute = routes[userRole];

    if (targetRoute) {
      // --- ÉTAPE 4 : MISE À JOUR DE L'ÉTAT EN LIGNE ---
      const userRef = doc(db, "societes", userId);
      await updateDoc(userRef, {
        isOnline: true,
        lastLogin: serverTimestamp()
      });

      // Utilisation de ton contexte de login
      if (typeof login === 'function') {
        login({ id: userId, ...userData });
      }

      // Fermeture du modal et redirection
      if (typeof onClose === 'function') onClose();
      
      router.push(targetRoute);
    } else {
      throw new Error(`Le rôle "${userData.role}" n'a pas de route configurée.`);
    }

  } catch (err: any) {
    console.error("Login Error Details:", err);
    
    // Traduction des messages d'erreur Firebase communs
    let errorMessage = err.message;
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      errorMessage = "Email ou mot de passe incorrect.";
    } else if (err.code === 'auth/too-many-requests') {
      errorMessage = "Trop de tentatives. Veuillez réessayer plus tard.";
    }
    
    alert(errorMessage);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="fixed inset-0 z-[2000] bg-[#020617]/90 backdrop-blur-xl flex items-center justify-center p-4">
      {/* BOUTON FERMER STYLE AÉRONAUTIQUE */}
      <button
        onClick={onClose}
        className="fixed top-6 right-6 z-[2100] p-4 bg-red-600 text-white rounded-full shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:scale-110 hover:bg-white hover:text-red-600 transition-all duration-500 border border-white/20"
      >
        <X size={24} strokeWidth={3} />
      </button>

      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-[#1e3a8a] rounded-[3rem] lg:rounded-[4rem] border-4 border-white/10 shadow-[0_60px_150px_-20px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden relative"
      >
        {/* TEXTURE DE FOND */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-black/60 pointer-events-none" />

        {/* HEADER STYLE DASHBOARD */}
        <div className="relative px-10 py-12 bg-black/40 backdrop-blur-3xl border-b border-white/10 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative p-1 bg-white/10 rounded-[2rem] border border-white/20">
              <img src={logoUrl} className="w-20 h-20 rounded-[1.8rem] object-cover" alt="Logo" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-2 border-[#1e3a8a] animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-1.5 h-4 bg-red-600 shadow-[0_0_10px_#ef4444]" />
            <p className="text-[#d4af37] text-[9px] font-[1000] uppercase tracking-[0.5em]">
              Système d'authentification
            </p>
          </div>

          <h2 className="text-4xl font-[1000] text-white uppercase italic tracking-tighter">
            ACCÈS <span className="text-[#d4af37]">G</span>DP
          </h2>
        </div>

        {/* FORMULAIRE */}
        <form onSubmit={handleLogin} className="relative z-10 p-10 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-2 italic">ID Terminal</label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-[#d4af37]" size={20} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border-2 border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white text-sm focus:border-[#d4af37] outline-none transition-all font-bold"
                placeholder="votre-id@dispromalt.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-2 italic">Clé de Sécurité</label>
            <div className="relative group">
              <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-[#d4af37]" size={20} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border-2 border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white text-sm focus:border-[#d4af37] outline-none transition-all font-bold"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#d4af37] hover:bg-white text-black font-[1000] py-6 rounded-[2rem] uppercase text-[12px] tracking-[0.3em] shadow-[0_20px_40px_rgba(212,175,55,0.2)] transition-all active:scale-95 flex items-center justify-center gap-4 group"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <><Zap size={18} className="group-hover:animate-bounce" /> Lancer la Session</>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 opacity-40 pt-4">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            <p className="text-[8px] font-black text-white uppercase tracking-[0.4em]">Cryptage 256-bit actif</p>
          </div>
        </form>

        {/* LIGNE DE SCAN ROUGE INFÉRIEURE */}
        <div className="h-2 w-full bg-red-600/20 relative overflow-hidden">
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="absolute inset-0 w-40 bg-gradient-to-r from-transparent via-red-600 to-transparent shadow-[0_0_15px_#ef4444]"
          />
        </div>
      </motion.div>
    </div>
  );
}