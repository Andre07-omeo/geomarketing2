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
import { useTransform } from 'framer-motion';

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

  // On crée d'abord scrollYProgress grâce à useScroll()
  const { scrollYProgress, scrollY } = useScroll();

  // Maintenant qu'elle existe, on peut l'utiliser pour yBg et scaleX !
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
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

  // --- RENDU : LOADING PREMIUM ---
  if (loading) {
    return (
      <div className="h-screen relative flex flex-col items-center justify-center overflow-hidden bg-[#1e40af]">

        {/* 1. LA TEXTURE DE FOND : Présente dès le départ pour éliminer le flash bleu brut */}
        <img
          src="/fond.jpg"
          alt="Background Texture"
          className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[1px]"
        />

        {/* 2. L'EFFET D'ÉCHANGE (Le Halo Doré qui pulse en arrière-plan) */}
        <motion.div
          animate={{
            scale: [1, 1.4, 1],      // Le halo s'agrandit...
            opacity: [0.1, 0.35, 0.1] // ...et devient plus lumineux en rythme
          }}
          transition={{
            repeat: Infinity,
            duration: 2.5,           // Animation fluide et lente
            ease: "easeInOut"
          }}
          className="absolute w-[350px] h-[350px] bg-[#d4af37]/30 rounded-full blur-[90px]"
        />

        {/* 3. LE LOGO (En parfaite harmonie avec le fond) */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],       // Respiration légère du logo
            rotate: [0, 3, -3, 0]     // Micro-rotation haut de gamme
          }}
          transition={{
            repeat: Infinity,
            duration: 2.5,           // Calé exactement sur la même durée que le halo
            ease: "easeInOut"
          }}
          className="relative z-10"
        >
          <img
            src={logoUrl}
            className="w-24 h-24 rounded-3xl border border-white/20 shadow-[0_0_50px_rgba(212,175,55,0.25)] object-cover"
            alt="Loading GDP"
          />
        </motion.div>

        {/* 4. PETIT TEXTE HUD OPTIONNEL */}
        <motion.p
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="relative z-10 mt-6 text-[9px] font-black uppercase tracking-[0.5em] text-[#d4af37]/80"
        >
          Connexion au système...
        </motion.p>

      </div>
    );
  }

  return (
    // 1. On retire "bg-[#1e40af]" d'ici pour éviter qu'il ne recouvre l'image
    <div className="min-h-screen relative text-white overflow-x-hidden font-sans selection:bg-[#d4af37]/30">

      {/* Barre de progression dorée */}
      <motion.div style={{ scaleX }} className="fixed top-0 left-0 right-0 h-1 bg-[#d4af37] z-[250] origin-left" />

      {/* BACKGROUND EFFECTS - Image nette-floutée avec effet Parallaxe au scroll */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#1e40af]">

        {/* On utilise motion.img pour l'animer */}
        <motion.img
          src="/fond.jpg"
          alt="Background Texture"
          style={{ y: yBg }} // Actionne le mouvement subtil au scroll
          className="absolute top-0 left-0 w-full h-[115%] object-cover opacity-75 blur-[2px]"
        // h-[115%] : TRÈS IMPORTANT. On rend l'image un peu plus haute que l'écran (115% au lieu de 100%)
        // pour éviter qu'un espace vide ou bleu n'apparaisse en bas de l'écran quand l'image se déplace !
        // blur-[2px] : Un flou très léger qui garde la photo claire mais adoucit les contours.
        />

      </div>

      {/* NAV HEADER - VERSION PREMIUM ULTRA MODERNE & FIXE */}
      <nav className={`
  fixed top-0 inset-x-0 z-[150] 
  p-2 sm:p-3 md:p-4 lg:p-6
  ${!hidden ? 'backdrop-blur-3xl' : 'backdrop-blur-xl'}
  transition-all duration-500
`}>
        <div className="max-w-[1800px] mx-auto">
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
        h-14 sm:h-16 md:h-[4.2rem] lg:h-[4.5rem]
        px-3 sm:px-5 md:px-6 lg:px-8
        rounded-xl sm:rounded-2xl md:rounded-3xl lg:rounded-[2rem]
        transition-all duration-500
        ${hidden
                ? 'bg-black/80 backdrop-blur-xl border-white/5 shadow-lg'
                : 'bg-gradient-to-r from-black/50 via-black/40 to-black/50 backdrop-blur-2xl border-white/15 shadow-2xl shadow-black/50'
              }
        border
        hover:border-amber-400/40
        hover:shadow-2xl hover:shadow-amber-400/10
      `}
          >
            {/* Effet de brillance premium au survol */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

            {/* Effet de glow doré premium */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/8 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            {/* Bordure animée premium */}
            <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-center" />

            {/* Effet de verre dépoli supplémentaire */}
            <div className="absolute inset-0 rounded-inherit bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* LOGO - Version premium */}
            <div
              onClick={() => window.location.reload()}
              className="relative flex items-center gap-2 sm:gap-3 md:gap-4 cursor-pointer group/logo"
            >
              {/* Anneau lumineux premium */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 opacity-0 group-hover/logo:opacity-100 blur-xl transition-opacity duration-500" />

              {/* Cercle extérieur animé */}
              <div className="absolute -inset-1 rounded-xl border-2 border-amber-400/0 group-hover/logo:border-amber-400/30 transition-all duration-500" />

              <div className="relative">
                <img
                  src={logoUrl}
                  className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 rounded-xl object-cover border-2 border-white/20 group-hover/logo:border-amber-400/50 transition-all duration-300 shadow-lg group-hover/logo:shadow-amber-400/30"
                  alt="Logo"
                />
                {/* Badge premium animé */}
                <div className="absolute -top-1 -right-1 w-2 h-2 md:w-2.5 md:h-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full animate-pulse shadow-lg shadow-amber-400/50" />
              </div>

              <div className="flex flex-col leading-[0.7] sm:leading-[0.75]">
                <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black italic uppercase tracking-tighter">
                  <span className="text-white drop-shadow-lg group-hover/logo:drop-shadow-amber-400/50 transition-all">G</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 drop-shadow-lg">D</span>
                  <span className="text-white drop-shadow-lg group-hover/logo:drop-shadow-amber-400/50 transition-all">P</span>
                </span>
                <span className="text-[4px] sm:text-[5px] md:text-[6px] lg:text-[7px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] text-amber-400/70 mt-0.5 whitespace-nowrap">
                  GESTION DIGITALE
                </span>
              </div>
            </div>

            {/* DESKTOP MENU - Version ultra premium */}
            <div className="hidden lg:flex items-center gap-2 md:gap-3 lg:gap-4">

              {/* Bouton Accueil premium */}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                className="relative overflow-hidden group/btn px-4 md:px-5 lg:px-6 py-2 md:py-2.5 lg:py-3 rounded-full font-black uppercase text-[8px] md:text-[9px] lg:text-[10px] tracking-wider shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 bg-[length:200%_100%] animate-shimmer" />
                <div className="absolute inset-0 bg-black/30 group-hover/btn:bg-black/0 transition-colors duration-300" />
                <div className="absolute inset-0 rounded-full ring-2 ring-amber-400/0 group-hover/btn:ring-amber-400/50 transition-all duration-300" />
                <span className="relative flex items-center gap-1.5 text-black font-black">
                  <span className="text-xs md:text-sm">🏠</span>
                  <span className="hidden md:inline">ACCUEIL</span>
                  <span className="md:hidden">HOME</span>
                </span>
              </motion.button>

              {/* Bouton Carte premium */}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={ouvrirLaCarte}
                className="relative overflow-hidden group/btn px-4 md:px-5 lg:px-6 py-2 md:py-2.5 lg:py-3 rounded-full font-black uppercase text-[8px] md:text-[9px] lg:text-[10px] tracking-wider shadow-lg bg-gradient-to-r from-amber-400 to-yellow-500"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-amber-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center gap-1.5 text-black">
                  <MapPin size={12} className="md:w-[13px] md:h-[13px] lg:w-[14px] lg:h-[14px] group-hover/btn:rotate-12 transition-transform duration-300" />
                  <span className="hidden md:inline">🗺️ CARTE</span>
                  <span className="md:hidden">MAP</span>
                </span>
              </motion.button>

              {/* Bouton CTA premium - Effet néon amélioré */}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="relative group/cta px-5 md:px-6 lg:px-7 py-2.5 md:py-3 lg:py-3.5 rounded-full font-black uppercase text-[9px] md:text-[10px] lg:text-[11px] tracking-[0.12em] md:tracking-[0.15em] shadow-xl shadow-red-500/30 border border-red-400/40"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 rounded-full" />
                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-300 rounded-full opacity-0 group-hover/cta:opacity-100 transition-opacity duration-300" />
                <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-red-400 rounded-full opacity-0 group-hover/cta:opacity-40 blur-xl transition-opacity duration-500" />
                <div className="absolute inset-0 rounded-full ring-2 ring-red-400/0 group-hover/cta:ring-red-400/50 transition-all duration-300" />

                <span className="relative flex items-center gap-1.5 text-white">
                  <span className="text-sm md:text-base animate-bounce">✨</span>
                  <span className="hidden sm:inline">COMMANDE</span>
                  <span className="sm:hidden">CMD</span>
                  <span className="text-sm md:text-base animate-pulse">⚡</span>
                </span>
              </motion.button>

              {/* Séparateur premium */}
              <div className="h-6 md:h-7 lg:h-8 w-px bg-gradient-to-b from-transparent via-amber-400/40 to-transparent mx-1 md:mx-2" />

              {/* Bouton Menu Filtre premium - Glassmorphism avancé */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSidebarOpen(true)}
                className="group/filter relative overflow-hidden px-4 md:px-5 lg:px-6 py-2 md:py-2.5 lg:py-3 rounded-full font-black uppercase text-[8px] md:text-[9px] lg:text-[10px] tracking-wider transition-all duration-300 bg-white/5 backdrop-blur-sm border border-amber-400/30 hover:bg-amber-400 hover:text-black shadow-lg hover:shadow-amber-400/30"
              >
                {/* Effet de ripple premium */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-500 translate-y-full group-hover/filter:translate-y-0 transition-transform duration-300" />

                {/* Effet de brillance */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/filter:translate-x-full transition-transform duration-700" />

                <span className="relative flex items-center gap-1.5 z-10">
                  <Filter size={12} className="md:w-[13px] md:h-[13px] lg:w-[14px] lg:h-[14px] text-amber-400 group-hover/filter:text-black transition-colors duration-300" />
                  <span className="hidden lg:inline">MENU FILTRE</span>
                  <span className="hidden md:inline lg:hidden">FILTRES</span>
                  <span className="md:hidden">MENU</span>
                </span>
              </motion.button>
            </div>

            {/* Mobile & Tablet Menu Button - Premium */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSidebarOpen(true)}
              className="relative lg:hidden p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 hover:border-amber-400/60 hover:bg-amber-400/20 transition-all duration-300 group/mobile"
            >
              {/* Effet de vague premium */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400/20 to-yellow-500/20 opacity-0 group-active/mobile:opacity-100 transition-opacity duration-300 scale-0 group-active/mobile:scale-100" />

              <Menu size={20} className="sm:w-[22px] sm:h-[22px] md:w-[24px] md:h-[24px] text-amber-400 relative z-10" />

              {/* Indicateur de notification premium */}
              <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gradient-to-r from-red-500 to-red-400 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
              <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-ping bg-red-400/50" />
            </motion.button>

            {/* Indicateur de scroll pour desktop */}
            <div className="hidden lg:block absolute -bottom-6 left-1/2 -translate-x-1/2">
              <div className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-1 h-2 bg-amber-400 rounded-full animate-bounce" />
              </div>
            </div>
          </motion.div>
        </div>
      </nav>
      {/* SIDEBAR / MENU LATÉRAL - ULTRA RESPONSIVE SANS ERREURS */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Overlay - fond noir transparent */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-[250] cursor-pointer"
            />

            {/* Boîte de dialogue - ULTRA RESPONSIVE */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`
          fixed z-[300] flex flex-col overflow-hidden shadow-2xl shadow-black/50
          border border-white/20 rounded-3xl
          bg-black/80 backdrop-blur-sm
          
          /* TRÈS PETITS ÉCRANS (moins de 480px) */
          inset-2
          
          /* PETITS ÉCRANS (480px - 640px) */
          sm:inset-4 sm:max-w-[calc(100%-2rem)] sm:mx-auto
          
          /* MOYENS ÉCRANS (640px - 768px) */
          md:inset-6 md:max-w-md md:right-6 md:top-6 md:bottom-6 md:left-auto
          
          /* GRANDS ÉCRANS (768px - 1024px) */
          lg:inset-8 lg:max-w-lg lg:right-8 lg:top-8 lg:bottom-8
          
          /* TRÈS GRANDS ÉCRANS (1024px+) */
          xl:inset-10 xl:max-w-xl xl:right-10 xl:top-10 xl:bottom-10
          
          /* 4K+ ÉCRANS */
          2xl:inset-12 2xl:max-w-2xl 2xl:right-12 2xl:top-12 2xl:bottom-12
        `}
            >
              {/* En-tête responsive */}
              <div className="p-4 sm:p-6 md:p-8 flex justify-between items-center border-b border-white/10 bg-black/30">
                <div className="flex flex-col">
                  <span className="text-xl sm:text-2xl md:text-3xl font-black italic uppercase text-white tracking-tighter leading-none">
                    Menu <span className="text-amber-400 drop-shadow-lg">Général</span>
                  </span>
                  <span className="text-[6px] sm:text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.5em] text-white/50 mt-1">
                    Système de Supervision
                  </span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="group p-2 sm:p-2.5 md:p-3 bg-white/10 hover:bg-red-500/80 rounded-xl sm:rounded-2xl transition-all duration-300 border border-white/20 shadow-xl hover:scale-105 active:scale-95"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-[22px] md:h-[22px] text-white group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              {/* Contenu scrollable - responsive */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8 custom-scrollbar bg-black/20">

                {/* Barre de recherche responsive */}
                <div className="relative group">
                  <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-amber-400 group-focus-within:scale-110 transition-all duration-300 w-4 h-4 sm:w-[18px] sm:h-[18px] md:w-5 md:h-5" />
                  <input
                    type="text"
                    placeholder="RECHERCHER..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/50 border-2 border-white/10 rounded-xl sm:rounded-2xl py-3 sm:py-4 md:py-5 pl-10 sm:pl-12 md:pl-14 pr-3 sm:pr-4 md:pr-6 
                       text-[10px] sm:text-[11px] md:text-[12px] font-black uppercase 
                       outline-none focus:border-amber-400/50 focus:bg-black/70 
                       text-white placeholder:text-white/30 shadow-inner transition-all duration-300"
                  />
                </div>

                {/* Navigation responsive */}
                <div className="space-y-2 sm:space-y-3">
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] mb-2 sm:mb-3 md:mb-4">
                    Exploration
                  </p>
                  {[
                    { icon: <Home className="w-4 h-4 sm:w-[18px] sm:h-[18px] md:w-5 md:h-5" />, label: "Tableau de Bord", action: () => window.location.reload() },
                    { icon: <MapPin className="w-4 h-4 sm:w-[18px] sm:h-[18px] md:w-5 md:h-5" />, label: "Carte Interactive", action: ouvrirLaCarte },
                    { icon: <PlusCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px] md:w-5 md:h-5" />, label: "Réservé aux Admins", action: () => setIsLoginOpen(true) },
                  ].map((item, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        item.action();
                        setIsSidebarOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl 
                          bg-white/10 hover:bg-white/20 border border-white/15 
                          text-white font-black uppercase text-[9px] sm:text-[10px] md:text-[11px] 
                          tracking-wider transition-all duration-300 shadow-lg group"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-amber-400 group-hover:text-amber-300 transition-colors duration-300">
                          {item.icon}
                        </span>
                        <span className="hidden xs:inline">{item.label}</span>
                        <span className="xs:hidden">
                          {item.label === "Tableau de Bord" ? "Dashboard" :
                            item.label === "Carte Interactive" ? "Carte" : "Admin"}
                        </span>
                      </div>
                      <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-amber-400 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    </motion.button>
                  ))}
                </div>

                {/* Filtres responsive */}
                <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-white/10">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Filter className="w-[10px] h-[10px] sm:w-3 sm:h-3 text-amber-400" />
                    <p className="text-[8px] sm:text-[9px] font-black text-white/70 uppercase tracking-[0.15em] sm:tracking-[0.2em]">
                      Filtres Intelligents
                    </p>
                  </div>

                  <select
                    value={filters.zone}
                    onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-xl sm:rounded-2xl 
                       p-3 sm:p-4 text-[9px] sm:text-[10px] md:text-[11px] font-black 
                       text-white uppercase outline-none focus:border-amber-400 
                       cursor-pointer appearance-none shadow-md transition-all duration-300"
                  >
                    <option value="" className="bg-black">Toutes les Communes</option>
                    {Array.from(new Set(panneauxData.map(p => p.zone))).filter(Boolean).sort().map(z => (
                      <option key={z} value={z} className="bg-black">{z}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {['Libre', 'Occupé'].map(s => (
                      <motion.button
                        key={s}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFilters({ ...filters, statut: filters.statut === s ? '' : s })}
                        className={`py-2.5 sm:py-3 md:py-4 rounded-xl sm:rounded-2xl 
                           text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase 
                           border-2 transition-all duration-300
                    ${filters.statut === s
                            ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/30 scale-[1.02]'
                            : 'bg-black/30 border-white/15 text-white/90 hover:bg-black/50 hover:border-white/30'
                          }`}
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>

                  {/* Indicateur de résultats - responsive */}
                  <div className="mt-3 sm:mt-4 p-2 sm:p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[7px] sm:text-[8px] md:text-[9px] text-white/40 text-center uppercase tracking-wider">
                      {panneauxData.filter(p =>
                        (!filters.zone || p.zone === filters.zone) &&
                        (!filters.statut || p.statut === filters.statut)
                      ).length} élément(s) trouvé(s)
                    </p>
                  </div>
                </div>
              </div>

              {/* Pied de page responsive */}
              <div className="p-3 sm:p-4 border-t border-white/10 bg-black/30">
                <p className="text-[6px] sm:text-[7px] text-center text-white/30 uppercase tracking-[0.15em] sm:tracking-[0.2em]">
                  Système de Supervision v2.0
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <main className="relative z-20 max-w-[1800px] mx-auto px-6 pt-44 pb-40">
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




import { Calendar, Activity, MinusCircle } from 'lucide-react';

const FaceDetailModal = ({ isOpen, onClose, panneau, face, onSelect, isSelected, ouvrirLaCarte }: any) => {
  if (!isOpen || !face) return null;

  const isLibre = face.statut?.toLowerCase() === 'libre';
  const selectionKey = `${panneau.id}_${face.id}`;

  const reservations = (face.reservations || [])
    .sort((a: any, b: any) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime());

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          // h-full sur mobile pour utiliser tout l'écran, h-auto sur PC
          className="bg-slate-950 border-t sm:border border-white/20 w-full max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-[3rem] overflow-hidden flex flex-col md:flex-row"
        >
          {/* --- SECTION IMAGE (HAUT sur mobile / GAUCHE sur PC) --- */}
          <div className="relative w-full md:w-[42%] h-[35vh] md:h-auto shrink-0 group">
            <img
              src={face.photoCampagneUrl || "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg"}
              className="w-full h-full object-cover"
              alt="Visual"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/20" />

            {/* Close button mobile uniquement (en haut à droite de l'image) */}
            <button onClick={onClose} className="md:hidden absolute top-4 right-4 p-3 bg-black/50 backdrop-blur-lg rounded-full text-white">
              <X size={24} />
            </button>

            {/* Badge Status */}
            <div className="absolute top-4 left-4 md:top-8 md:left-8">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border ${isLibre ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/20 border-rose-500/50 text-rose-400'}`}>
                <div className={`w-2 h-2 rounded-full ${isLibre ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{isLibre ? 'Disponible' : 'Occupé'}</span>
              </div>
            </div>

            <div className="absolute bottom-6 left-6 right-6">
              <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter drop-shadow-2xl">
                {panneau.idPan}
              </h2>
              <div className="flex gap-2 mt-2">
                <span className="bg-[#d4af37] text-black text-[9px] font-black px-2 py-1 rounded-md uppercase italic">
                  {face.sens}
                </span>
              </div>
            </div>
          </div>

          {/* --- SECTION CONTENU (BAS sur mobile / DROITE sur PC) --- */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 overflow-hidden">

            {/* Header Fixe (Desktop) */}
            <div className="hidden md:flex p-8 pb-4 justify-between items-start">
              <div>
                <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-[0.4em] mb-1">Traçabilité</p>
                <h3 className="text-white text-xl font-bold uppercase">{panneau.adresse}</h3>
              </div>
              <button onClick={onClose} className="p-3 bg-white/5 hover:bg-rose-500/20 rounded-2xl transition-all border border-white/5 text-white">
                <X size={20} />
              </button>
            </div>

            {/* ZONE SCROLLABLE (Optimisée tactile) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scroll-smooth">

              {/* Adresse Mobile uniquement */}
              <div className="md:hidden space-y-1">
                <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest">Localisation</p>
                <h3 className="text-white text-lg font-bold leading-tight">{panneau.adresse}</h3>
              </div>

              {/* Grid Performance (Adaptative) */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: <Zap size={14} />, label: "Visibilité", val: face.visibilite || 90 },
                  { icon: <Activity size={14} />, label: "Trafic", val: face.mobimetrie || 85 },
                  { icon: <ShieldCheck size={14} />, label: "Score", val: 98 },
                ].map((m, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center">
                    <div className="flex justify-center text-[#d4af37] mb-1">{m.icon}</div>
                    <p className="text-[12px] md:text-[14px] font-black text-white">{m.val}%</p>
                    <p className="text-[7px] md:text-[8px] font-bold text-white/40 uppercase">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Timeline Chronologique */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-[#d4af37]/10 rounded-lg">
                      <Calendar size={18} className="text-[#d4af37]" />
                    </div>
                    <div>
                      <h4 className="text-white text-[12px] font-black uppercase tracking-widest">Chronologie</h4>
                      <p className="text-[9px] text-white/30 uppercase font-bold">Historique des campagnes</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-white/20 bg-white/5 px-3 py-1 rounded-full">
                    {reservations.length} Entrées
                  </span>
                </div>

                <div className="relative border-l-2 border-white/5 ml-4 pl-8 space-y-8">
                  {reservations.length > 0 ? (
                    reservations.map((res: any, i: number) => {
                      // --- LOGIQUE DE TEMPS ---
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      const debut = new Date(res.dateDebut);
                      const fin = new Date(res.dateFin);

                      // Calcul d'urgence (3 jours avant la fin)
                      const joursRestants = Math.ceil((fin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      const isNearEnd = joursRestants <= 3 && joursRestants >= 0;
                      const isExpired = now > fin;

                      // --- CALCUL DE PROGRESSION ---
                      const totalDuree = fin.getTime() - debut.getTime();
                      const ecoule = now.getTime() - debut.getTime();
                      const progressPercent = Math.min(Math.max((ecoule / totalDuree) * 100, 0), 100);

                      // --- COULEURS DYNAMIQUES ---
                      let statusLabel = "En attente";
                      let statusStyle = "text-blue-400 bg-blue-400/10 border-blue-400/20";

                      if (isExpired) {
                        statusLabel = "Terminée";
                        statusStyle = "text-white/40 bg-white/5 border-white/10";
                      } else if (isNearEnd) {
                        statusLabel = "Expire Bientôt";
                        statusStyle = "text-orange-500 bg-orange-500/10 border-orange-500/40 animate-pulse";
                      } else if (now >= debut && now <= fin) {
                        statusLabel = "Actuelle";
                        statusStyle = "text-green-400 bg-green-400/10 border-green-400/20";
                      }

                      return (
                        <div key={i} className="relative group">
                          {/* Point sur la ligne de temps */}
                          <div className={`absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-slate-950 border-2 flex items-center justify-center transition-all duration-500 
            ${isNearEnd ? 'border-orange-500' : (now >= debut && now <= fin ? 'border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'border-white/10')}`}>
                            <div className={`w-2 h-2 rounded-full ${isNearEnd ? 'bg-orange-500 pulse' : (now >= debut && now <= fin ? 'bg-green-400 animate-pulse' : 'bg-white/20')}`} />
                          </div>

                          <div className={`bg-gradient-to-br from-white/[0.07] to-transparent border p-5 rounded-3xl transition-all duration-300 shadow-xl 
            ${isNearEnd ? 'border-orange-500/50 shadow-orange-500/5' : 'border-white/10 hover:border-white/20'}`}>

                            <div className="flex justify-between items-start mb-3">
                              <div className="max-w-[70%]">
                                <p className="text-[#d4af37] text-[11px] font-black uppercase tracking-tight mb-1">{res.societeLocatrice}</p>
                                {isNearEnd && (
                                  <p className="text-orange-500 text-[8px] font-black uppercase flex items-center gap-1">
                                    <span className="animate-bounce">⚠️</span> Fin de campagne dans {joursRestants} jour{joursRestants > 1 ? 's' : ''}
                                  </p>
                                )}
                                <span className="text-[9px] text-white/40 font-bold uppercase italic">Agent: {res.agentNom}</span>
                              </div>

                              <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md border ${statusStyle}`}>
                                {statusLabel}
                              </span>
                            </div>

                            {/* Barre de progression intelligente */}
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-4">
                              <div
                                className={`h-full transition-all duration-1000 ${isExpired ? 'bg-white/10' : (isNearEnd ? 'bg-orange-500' : 'bg-[#d4af37]')}`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-white/5">
                              <div className="flex gap-4">
                                <div className="flex flex-col">
                                  <span className="text-[7px] text-white/30 uppercase font-black">Début</span>
                                  <span className="text-[10px] text-white font-bold tracking-tighter">{res.dateDebut}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[7px] text-white/30 uppercase font-black">Fin</span>
                                  <span className={`text-[10px] font-bold tracking-tighter ${isNearEnd ? 'text-orange-500' : 'text-white'}`}>{res.dateFin}</span>
                                </div>
                              </div>

                              <div className="flex gap-1">
                                {res.validationComptable === true && (
                                  <div className="p-1 bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/30">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                                  </div>
                                )}
                                {res.facturee === "oui" && (
                                  <div className="p-1 bg-amber-500/20 text-amber-500 rounded-md border border-amber-500/30">
                                    <span className="text-[7px] font-black leading-none">$$</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    /* --- MESSAGE FORT POUR APPEL À LA RÉSERVATION --- */
                    <div className="relative group">
                      <div className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-slate-950 border-2 border-[#d4af37] animate-pulse flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#d4af37]" />
                      </div>

                      <div className="bg-[#d4af37]/5 border-2 border-dashed border-[#d4af37]/30 p-8 rounded-3xl text-center space-y-4 hover:bg-[#d4af37]/10 transition-all cursor-pointer">
                        <div className="inline-flex p-3 bg-[#d4af37]/20 rounded-full text-[#d4af37] mb-2">
                          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
                        </div>
                        <h3 className="text-[#d4af37] text-sm font-black uppercase tracking-tighter">Opportunité Disponible !</h3>
                        <p className="text-white/60 text-[11px] leading-relaxed max-w-[200px] mx-auto">
                          Cette face n'attend que votre visibilité. <br />
                          <span className="text-white font-bold italic">Prenez l'avantage sur vos concurrents dès maintenant.</span>
                        </p>
                        <button className="bg-[#d4af37] text-black text-[10px] font-black uppercase px-6 py-2 rounded-full hover:scale-105 transition-transform">
                          Réserver cette face
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
              {/* Espace vide pour ne pas être caché par les boutons fixes sur mobile */}
              <div className="h-24 md:h-0" />
            </div>

            {/* --- ACTIONS FIXES EN BAS (Très important pour Mobile) --- */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent flex gap-3">
              <button
                onClick={() => { ouvrirLaCarte(); onClose(); }}
                className="w-14 h-14 shrink-0 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white transition-all"
              >
                <MapPin size={24} />
              </button>

              <button
                disabled={!isLibre && !isSelected}
                onClick={() => onSelect(selectionKey)}
                className={`flex-1 h-14 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] flex items-center justify-center gap-2 transition-all ${isSelected ? 'bg-rose-600 text-white' : isLibre ? 'bg-[#d4af37] text-black' : 'bg-slate-800 text-slate-500'
                  }`}
              >
                {isSelected ? <MinusCircle size={20} /> : <PlusCircle size={20} />}
                {isSelected ? 'Retirer' : isLibre ? 'Réserver la face' : 'Indisponible'}
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
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
  <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
    {/* BOUTON FERMER MODERNE */}
    <button
      onClick={onClose}
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[2100] p-3 sm:p-4 bg-white/10 backdrop-blur-xl text-white rounded-full hover:bg-red-500 hover:scale-110 transition-all duration-300 border border-white/20 group"
    >
      <X size={20} className="sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2} />
    </button>

    <motion.div
      initial={{ y: 50, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="relative w-full max-w-md sm:max-w-lg bg-black/40 backdrop-blur-2xl rounded-3xl sm:rounded-[3rem] border border-white/15 shadow-2xl overflow-hidden"
    >
      {/* Effet de glow doré en arrière-plan */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      
      {/* Effet de brillance */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

      {/* HEADER */}
      <div className="relative px-6 sm:px-10 py-8 sm:py-12 bg-gradient-to-b from-white/5 to-transparent border-b border-white/10 text-center">
        {/* Logo avec anneau animé */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
            <div className="relative p-1 bg-white/10 rounded-2xl border border-white/20">
              <img src={logoUrl} className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl object-cover" alt="Logo" />
            </div>
            {/* Badge actif */}
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
          </div>
        </div>

        {/* Titre */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
          <div className="w-1 h-3 sm:w-1.5 sm:h-4 bg-gradient-to-t from-amber-500 to-yellow-500 rounded-full" />
          <p className="text-amber-400/80 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em]">
            Authentification sécurisée
          </p>
        </div>

        <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tighter">
          ACCÈS <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">GDPS</span>
        </h2>
        <p className="text-white/30 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider mt-2">
          Système de supervision digital
        </p>
      </div>

      {/* FORMULAIRE */}
      <form onSubmit={handleLogin} className="relative z-10 p-6 sm:p-10 space-y-5 sm:space-y-6">
        {/* Champ Email */}
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-[8px] sm:text-[10px] font-black text-white/50 uppercase tracking-wider ml-2 flex items-center gap-1">
            <span className="w-1 h-1 bg-amber-400 rounded-full" />
            Identifiant
          </label>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 -z-10" />
            <Mail className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-amber-400/60 group-focus-within:text-amber-400 transition-colors" size={16} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl py-3.5 sm:py-5 pl-11 sm:pl-14 pr-4 sm:pr-6 text-white text-xs sm:text-sm focus:border-amber-400/50 outline-none transition-all font-medium placeholder:text-white/20"
              placeholder="identifiant@dispromalt.com"
            />
          </div>
        </div>

        {/* Champ Mot de passe */}
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-[8px] sm:text-[10px] font-black text-white/50 uppercase tracking-wider ml-2 flex items-center gap-1">
            <span className="w-1 h-1 bg-amber-400 rounded-full" />
            Mot de passe
          </label>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 -z-10" />
            <ShieldCheck className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-amber-400/60 group-focus-within:text-amber-400 transition-colors" size={16} />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl py-3.5 sm:py-5 pl-11 sm:pl-14 pr-4 sm:pr-6 text-white text-xs sm:text-sm focus:border-amber-400/50 outline-none transition-all font-medium placeholder:text-white/20"
              placeholder="••••••••••••"
            />
          </div>
        </div>

        {/* Lien mot de passe oublié */}
        <div className="flex justify-end">
          <button
            type="button"
            className="text-white/30 hover:text-amber-400 text-[7px] sm:text-[8px] font-black uppercase tracking-wider transition-colors"
          >
            Mot de passe oublié ?
          </button>
        </div>

        {/* Bouton Connexion */}
        <div className="pt-2 sm:pt-4">
          <button
            type="submit"
            disabled={loading}
            className="relative group w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-black py-4 sm:py-6 rounded-xl sm:rounded-2xl uppercase text-[10px] sm:text-[12px] tracking-[0.2em] sm:tracking-[0.3em] shadow-lg shadow-amber-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 sm:gap-3 overflow-hidden"
          >
            {/* Effet de brillance */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <>
                <Zap size={14} className="group-hover:animate-bounce" />
                <span>Connexion sécurisée</span>
              </>
            )}
          </button>
        </div>

        {/* Indicateur de sécurité */}
        <div className="flex items-center justify-center gap-2 opacity-60 pt-2 sm:pt-4">
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            <div className="w-1 h-1 rounded-full bg-emerald-500/60 animate-pulse delay-300" />
            <div className="w-1 h-1 rounded-full bg-emerald-500/30 animate-pulse delay-600" />
          </div>
          <p className="text-[6px] sm:text-[7px] font-black text-white/60 uppercase tracking-[0.2em] sm:tracking-[0.3em]">
            Chiffrement AES-256 • Connexion sécurisée
          </p>
        </div>
      </form>

      {/* Barre de progression animée en bas */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-500 to-transparent relative overflow-hidden">
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          className="absolute inset-0 w-32 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
        />
      </div>
    </motion.div>
  </div>
);
}