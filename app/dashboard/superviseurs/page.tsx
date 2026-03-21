"use client";

import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, } from 'firebase/firestore';
import { getAuth, } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useSpring, useMotionValueEvent } from 'framer-motion';
import {
  Search, MapPin, Filter, PlusCircle, CheckCircle2,
  Menu, X, Home, Zap, Globe, Loader2, FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  Settings,
} from 'lucide-react';

import {

  query,
  orderBy,

  // Ajoutez 'doc' si vous l'utilisez ailleurs, 
  // mais dans ce useEffect précis, c'est le 'doc' du snapshot (pas l'import)
} from 'firebase/firestore';







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
  // État pour afficher la modale de détails d'une face spécifique
  const [selectedFaceDetails, setSelectedFaceDetails] = useState<any>(null);

  // Sécurité sur les faces
  const faces = panneau?.faces || [];

  return (
    <>
      {/* Modale de détails (s'affiche si une face est sélectionnée) */}
      <AnimatePresence>
        {selectedFaceDetails && (
          <FaceDetailModal
            isOpen={true}
            onClose={() => setSelectedFaceDetails(null)}
            panneau={panneau}
            face={selectedFaceDetails}
            onSelect={onSelect}
            isSelected={selectedIds?.includes(`${panneau.id}_${selectedFaceDetails.id}`)}
          />
        )}
      </AnimatePresence>

      {/* Mapping des faces du panneau */}
      {faces.map((face: any, fIdx: number) => {
        const faceUniqueId = `${panneau.id}_${face.id || fIdx}`;
        const isFaceSelected = selectedIds?.includes(faceUniqueId);
        const isLibre = face.statut?.toLowerCase() === 'libre';

        return (
          <motion.div
            key={faceUniqueId}
            layout
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.6,
              delay: (index + fIdx) * 0.05,
              type: "spring",
              stiffness: 100
            }}
            whileHover={{ y: -10 }}
            className={`relative group rounded-[2.5rem] p-px overflow-hidden bg-gradient-to-b transition-all duration-500 
                ${isFaceSelected
                ? 'from-[#d4af37] to-[#1e40af] shadow-[0_25px_50px_rgba(0,0,0,0.5)]'
                : 'from-white/20 to-transparent'
              }`}
          >
            <div className="relative bg-[#1e40af] backdrop-blur-3xl rounded-[2.4rem] overflow-hidden h-full flex flex-col">

              {/* SECTION IMAGE */}
              <div className="relative aspect-video overflow-hidden bg-black/20">
                <motion.img
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.8 }}
                  src={face.photoCampagneUrl || 'https://via.placeholder.com/800x600'}
                  className="w-full h-full object-cover"
                  alt={`Face ${face.id}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e40af] via-transparent to-transparent opacity-80" />

                {/* Badge Type & Statut (Top) */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                  <span className="bg-black/40 backdrop-blur-xl text-white text-[7px] font-black px-3 py-1.5 rounded-full uppercase border border-[#d4af37]/30 shadow-lg">
                    {panneau.type || 'DIGITAL'}
                  </span>

                  <span className={`px-3 py-1.5 rounded-full text-[7px] font-black uppercase border shadow-lg backdrop-blur-xl
                    ${isLibre
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                    {face.statut || 'INCONNU'}
                  </span>
                </div>
              </div>

              {/* CONTENU TECHNIQUE */}
              <div className="p-5 space-y-4 flex-grow">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-lg font-black text-white italic uppercase tracking-tighter leading-none">
                      Face: {face.faceId || fIdx + 1}
                    </h3>
                    <p className="text-[8px] font-black text-[#d4af37] uppercase mt-2 tracking-[0.2em] opacity-90">
                      ID: {panneau.idPan}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest">Dimension</p>
                    <p className="text-[10px] font-black text-white">{panneau.dimension || '12x4m'}</p>
                  </div>
                </div>

                {/* GRILLE D'INFOS (ZONE & SENS) */}
                <div className="grid grid-cols-2 gap-2 bg-black/20 rounded-2xl p-3 border border-white/5">
                  <div className="space-y-1">
                    <p className="text-[7px] font-bold text-[#d4af37] uppercase tracking-widest">Zone</p>
                    <p className="text-[9px] font-black text-white truncate uppercase">{panneau.zone || 'N/A'}</p>
                  </div>
                  <div className="space-y-1 border-l border-white/10 pl-3">
                    <p className="text-[7px] font-bold text-[#d4af37] uppercase tracking-widest">Sens</p>
                    <p className="text-[9px] font-black text-white truncate uppercase">{face.sens || 'VERS CENTRE'}</p>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedFaceDetails(face)}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/5 text-[8px] font-black text-white uppercase hover:bg-white hover:text-[#1e40af] transition-all cursor-pointer z-10 shadow-sm"
                    >
                      Détails
                    </button>

                    <button
                      type="button"
                      onClick={() => isLibre && onSelect(faceUniqueId)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[8px] font-black uppercase transition-all shadow-md z-10
                          ${!isLibre
                          ? 'bg-black/30 text-white/20 cursor-not-allowed border border-white/5'
                          : isFaceSelected
                            ? 'bg-red-600 text-white shadow-[0_10px_20px_rgba(220,38,38,0.3)]'
                            : 'bg-[#d4af37] text-black hover:bg-white active:scale-95'
                        }`}
                    >
                      {isFaceSelected ? <CheckCircle2 size={12} /> : <PlusCircle size={12} />}
                      {isFaceSelected ? 'Retirer' : 'Panier'}
                    </button>
                  </div>

                  {/* BOUTON MODIFIER - FULL WIDTH */}
                  <button
                    type="button"
                    onClick={() => onEdit && onEdit(panneau)}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/10 border border-white/20 text-white hover:bg-[#d4af37] hover:text-black transition-all duration-300 group/edit z-10 shadow-xl"
                  >
                    <Settings size={14} className="group-hover/edit:rotate-90 transition-transform duration-500" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Éditer Support</span>
                  </button>
                </div>
              </div>

              {/* Brillance décorative */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full -mr-10 -mt-10 pointer-events-none" />
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
  const router = useRouter();

  // 2. HOOKS (Framer Motion & Scroll)
  const { scrollYProgress, scrollY } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const [panneauToEdit, setPanneauToEdit] = useState<any>(null);
  // 3. ACTIONS
  const ouvrirLaCarte = () => {
    router.push('/dashboard/superviseurs/superviseur');
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
  // Remplace tes deux anciens useEffect par celui-ci :
  useEffect(() => {
    const panelsRef = collection(db, "panneaux");
    // On trie par date de création
    const q = query(panelsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const panelsData = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data()
      }));

      // CORRECTION ICI : Utilise le nom exact de ton setter d'état
      setPanneauxData(panelsData);
      setLoading(false);
    }, (error) => {
      console.error("Erreur Firestore :", error);
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

  const [isAddModalOpen, setIsAddModalOpen] = useState(true);
  // 1. Initialiser l'état pour stocker les panneaux
  const [panels, setPanels] = useState<any[]>([]);

  // 2. Récupérer les données en temps réel pour avoir le "count" à jour

  const logoUrl = "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg";

  if (loading) {
    return (
      <div className="h-screen bg-[#1e40af] flex flex-col items-center justify-center">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }}>
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
                    { icon: <PlusCircle size={20} />, label: "Nouveau Panneau", action: () => setIsAddModalOpen(true) },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { item.action(); setIsSidebarOpen(false); }}
                      className="w-full flex items-center justify-between p-6 rounded-[1.5rem] bg-white/5 hover:bg-white hover:text-[#1e40af] border border-white/10 text-white font-black uppercase text-[11px] tracking-widest transition-all shadow-lg active:scale-95 group"
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

              <div className="p-10 bg-black/20 border-t border-white/20">
                <button
                  onClick={handleLogout}
                  className="w-full py-6 bg-gradient-to-r from-red-600 to-red-500 hover:from-white hover:to-white hover:text-red-600 text-white rounded-[2rem] font-black uppercase text-[12px] tracking-[0.3em] shadow-[0_15px_30px_rgba(220,38,38,0.3)] transition-all flex items-center justify-center gap-4 active:scale-95"
                >
                  <LogOut size={20} /> Quitter la Session
                </button>
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
                onEdit={() => setPanneauToEdit(p)}
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

      <EditPanneauModal
        isOpen={!!panneauToEdit}
        onClose={() => setPanneauToEdit(null)}
        panneau={panneauToEdit}
      />
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
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter text-white">
                ID: {panneau.idPan}
              </h2>
              <p className="text-[#d4af37] font-bold text-sm uppercase tracking-widest">
                Face: {face.id} — {panneau.zone}
              </p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black text-white">{face.prix || 0} $</span>
              <p className="text-white/50 text-[10px] uppercase font-bold">Prix Mensuel HT</p>
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
            <div className="bg-black/10 rounded-3xl p-6 space-y-3 border border-white/5 shadow-inner">
              <h3 className="text-[#d4af37] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Fiche Technique</h3>
              <div className="flex justify-between border-b border-white/5 pb-2 text-[10px] font-bold uppercase">
                <span className="text-white/50">Format</span>
                <span className="text-white">{panneau.format || '12m²'}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2 text-[10px] font-bold uppercase">
                <span className="text-white/50">Type</span>
                <span className="text-white">{panneau.type || 'Standard'}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span className="text-white/50">Sens Trafic</span>
                <span className="text-white">{face.sens || 'N/A'}</span>
              </div>
              <div className="mt-4 p-2 bg-[#d4af37]/20 rounded-lg text-center">
                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${isLibre ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
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
              }}
            >
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

  // 1. Préparation des données
  const selectedFaces = (selectedIds || [])
    .map((fullId: string) => {
      const [panId, faceId] = fullId.split('_');
      const panneau = panneauxData?.find((p: any) => p.id === panId);
      const face = panneau?.faces?.find((f: any) => f.id?.toString() === faceId.toString());

      if (!panneau || !face) return null;

      const loc = [panneau.zone, panneau.adresse].filter(Boolean).join(" — ");

      let rawPrix = face.prix;
      if (typeof rawPrix === 'string') {
        rawPrix = rawPrix.replace(/[^\d.-]/g, '');
      }
      const prixNumerique = parseFloat(rawPrix) || 0;

      return {
        idPan: panneau.idPan || 'N/A',
        faceId: faceId,
        adresse: loc || 'Localisation non spécifiée',
        prix: prixNumerique
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const totalPrix = selectedFaces.reduce((acc, curr) => acc + curr.prix, 0);

  // 2. Génération du PDF avec les nouvelles couleurs (Bleu Roi Profond #1e40af)
  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString('fr-FR');
      const documentNumber = `GDP-${Math.floor(10000 + Math.random() * 90000)}`;

      // Header PDF : Bleu Roi Profond #1e40af (RGB: 30, 64, 175)
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(212, 175, 55); // Doré #d4af37
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
        {/* Header Modale */}
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

        {/* Liste défilante */}
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

        {/* Footer avec Total et Actions */}
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




import { addDoc, serverTimestamp } from 'firebase/firestore';
import {
  Save,
  Maximize2,
  Layers,

  Camera,
  Tag
} from 'lucide-react';
import { panneaux } from '@/data/panneaux';



import { useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Layout, Upload, } from 'lucide-react';

// --- CONFIGURATION ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dn7wnikzp/image/upload";
const UPLOAD_PRESET = "ml_default"; // Assurez-vous que ce preset est "Unsigned" dans Cloudinary


const TYPES_SUPPORTS = [
  "Billboard (Classique)", "Digital (LED)", "Abribus", "Grand Format (Totem)",
  "Murale", "Banderole", "Tri-vision", "Sucette", "Portique"
];

const STATUTS_POSSIBLES = ["Libre", "Occupé", "En Maintenance", "Réservé"];

export const EditPanneauModal = ({ isOpen, onClose, panneau }: any) => {
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (panneau) {
      setFormData({ ...panneau });
    }
  }, [panneau]);

  if (!isOpen || !formData) return null;

  // --- LOGIQUE CLOUDINARY + PREVIEW ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Prévisualisation locale immédiate
    const localPreviewUrl = URL.createObjectURL(file);
    const previewFaces = [...formData.faces];
    previewFaces[index].photoCampagneUrl = localPreviewUrl;
    setFormData({ ...formData, faces: previewFaces });

    // 2. Envoi vers Cloudinary
    setUploadingIndex(index);
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", UPLOAD_PRESET);
    data.append("cloud_name", "dn7wnikzp");

    try {
      const response = await fetch(CLOUDINARY_URL, { method: "POST", body: data });
      const result = await response.json();

      if (result.secure_url) {
        // 3. Mise à jour de l'URL finale Cloudinary
        const finalFaces = [...formData.faces];
        finalFaces[index].photoCampagneUrl = result.secure_url;
        setFormData({ ...formData, faces: finalFaces });
      }
    } catch (error) {
      console.error("Erreur Cloudinary:", error);
      alert("Échec de l'upload. L'image de prévisualisation sera annulée.");
      // Optionnel: remettre l'ancienne image en cas d'échec
    } finally {
      setUploadingIndex(null);
    }
  };

  const updateFace = (index: number, field: string, value: any) => {
    const newFaces = [...formData.faces];
    newFaces[index] = { ...newFaces[index], [field]: value };
    setFormData({ ...formData, faces: newFaces });
  };

  const handleSave = async () => {
    // Vérification obligatoire : Si Occupé, il faut une photo
    const faceIncomplete = formData.faces.find(
      (f: any) => f.statut === "Occupé" && (!f.photoCampagneUrl || f.photoCampagneUrl.startsWith('blob:'))
    );

    if (faceIncomplete) {
      alert("Erreur : Une face 'Occupé' doit avoir une photo valide (attendez la fin de l'upload).");
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, "panneaux", panneau.id);

      // On ne modifie que les champs autorisés
      const dataToUpdate = {
        adresse: formData.adresse || "",
        zone: formData.zone || "",
        type: formData.type || "",
        dimension: formData.dimension || "",
        faces: formData.faces.map((f: any) => ({
          ...f,
          sens: f.sens || "",
          statut: f.statut || "Libre",
          photoCampagneUrl: f.photoCampagneUrl || ""
        }))
      };

      await updateDoc(docRef, dataToUpdate);
      onClose();
    } catch (error) {
      console.error("Erreur Firebase:", error);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-2 md:p-4 bg-black/90 backdrop-blur-xl">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => handleImageUpload(e, parseInt(fileInputRef.current?.dataset.idx || "0"))}
      />

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#1e40af] border border-white/20 w-full max-w-6xl max-h-[96vh] rounded-[2rem] md:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">

        {/* HEADER */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#d4af37] rounded-2xl text-black"><Layout size={24} /></div>
            <h2 className="text-xl md:text-2xl font-black italic text-white uppercase italic">Support <span className="text-[#d4af37]">{formData.idPan}</span></h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-red-500 text-white"><X size={20} /></button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-[#d4af37] uppercase ml-1">Adresse</label>
              <input type="text" value={formData.adresse || ''} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[#d4af37]" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-[#d4af37] uppercase ml-1">Commune</label>
              <select value={formData.zone || ''} onChange={(e) => setFormData({ ...formData, zone: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none">
                {COMMUNES_KINSHASA.map(c => <option key={c} value={c} className="bg-[#1e40af]">{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-[#d4af37] uppercase ml-1">Type</label>
              <select value={formData.type || ''} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none">
                {TYPES_SUPPORTS.map(t => <option key={t} value={t} className="bg-[#1e40af]">{t}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-[#d4af37] uppercase ml-1">Dimensions</label>
              <input type="text" value={formData.dimension || ''} onChange={(e) => setFormData({ ...formData, dimension: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none" />
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em]">Gestion des faces</h3>
            <div className="grid gap-6">
              {formData.faces?.map((face: any, idx: number) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 flex flex-col lg:flex-row items-center gap-6 group hover:border-[#d4af37]">

                  <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-black border border-white/10 shadow-xl flex-shrink-0">
                    <img src={face.photoCampagneUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="Face" />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingIndex === idx ? (
                        <Loader2 className="text-[#d4af37] animate-spin" size={32} />
                      ) : (
                        <button onClick={() => { fileInputRef.current!.dataset.idx = idx.toString(); fileInputRef.current?.click(); }} className="p-3 bg-[#d4af37] rounded-full text-black hover:scale-110 transition-transform">
                          <Upload size={20} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-white/30 uppercase italic">ID Face (Lecture seule)</p>
                      <input type="text" value={face.faceId || ''} readOnly className="w-full bg-white/5 border-b border-white/10 text-xs font-bold text-white/50 p-2 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-white/30 uppercase italic">Sens de vue</p>
                      <input type="text" value={face.sens || ''} onChange={(e) => updateFace(idx, 'sens', e.target.value)} className="w-full bg-white/5 border-b border-white/10 text-xs font-bold text-white p-2 outline-none focus:border-[#d4af37]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-white/30 uppercase italic">Statut</p>
                      <select value={face.statut || ''} onChange={(e) => updateFace(idx, 'statut', e.target.value)} className="w-full bg-transparent text-xs font-bold text-[#d4af37] p-2 outline-none">
                        {STATUTS_POSSIBLES.map(s => <option key={s} value={s} className="bg-[#1e40af]">{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-8 bg-black/40 border-t border-white/10 flex justify-end items-center gap-4">
          <button onClick={onClose} className="px-8 py-3 text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors">Annuler</button>
          <button onClick={handleSave} disabled={isSaving || uploadingIndex !== null} className="flex items-center gap-3 bg-[#d4af37] text-black px-12 py-4 rounded-full font-black uppercase text-[10px] hover:scale-105 transition-all shadow-xl disabled:opacity-50">
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Enregistrer les modifications
          </button>
        </div>
      </motion.div>
    </div>
  );
};


const COMMUNES_KINSHASA = ["Bandalungwa", "Barumbu", "Gombe", "Kalamu", "Kasa-Vubu", "Kimbanseke", "Kinshasa", "Kintambo", "Lemba", "Limete", "Lingwala", "Masina", "Matete", "Mont-Ngafula", "Ngaliema", "Ndjili", "Nsele"];
import Link from 'next/link';
