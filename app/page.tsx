"use client";

import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useSpring, useMotionValueEvent } from 'framer-motion';

import Footer from '@/components1/Footer';

// Ajoutez ces imports spécifiques à Firestore
import {
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import {
  MapPin, Filter, PlusCircle,
  Menu, X, Home, Zap, Globe,
  Mail, Loader2, FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ✅ Version require avec chemin correct
const config = require('../config/db');



// Toutes ces variables fonctionneront maintenant :
const firebaseConfig = config.firebaseConfig;

const logo = config.LOGO_DISPROMALT;





const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);



const auth = getAuth(app);

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
    // Créer une boîte de dialogue personnalisée
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-sm w-full mx-4 shadow-2xl overflow-hidden">
            <!-- HEADER - BLEU ROI PROFOND -->
            <div class="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-900 px-6 py-4 border-b border-white/10">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                        <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-white">Télécharger l'image</h3>
                        <p class="text-[8px] text-blue-200 uppercase tracking-wider">Enregistrement sur l'appareil</p>
                    </div>
                </div>
            </div>

            <!-- CORPS -->
            <div class="p-6">
                <div class="text-center mb-6">
                    <div class="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4 border border-blue-200">
                        <svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                    <p class="text-sm text-gray-600 font-medium">Voulez-vous enregistrer cette image sur votre appareil ?</p>
                    <p class="text-[8px] text-gray-400 mt-1">Format: JPG • Qualité: Haute</p>
                </div>

                <!-- BOUTONS -->
                <div class="flex gap-3">
                    <button id="cancel-download" class="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-[9px] font-bold uppercase tracking-wider hover:bg-gray-200 transition">
                        Annuler
                    </button>
                    <button id="confirm-download" class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[9px] font-bold uppercase tracking-wider hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Télécharger
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Gérer la confirmation
    const confirmBtn = modal.querySelector('#confirm-download');
    const cancelBtn = modal.querySelector('#cancel-download');

    const closeModal = () => modal.remove();

    confirmBtn?.addEventListener('click', async () => {
        closeModal();

        // Afficher un toast de chargement
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-xl px-4 py-2 text-sm z-50 border border-blue-200 flex items-center gap-2';
        toast.innerHTML = `
            <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-gray-700 font-medium">Téléchargement en cours...</span>
        `;
        document.body.appendChild(toast);

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
            URL.revokeObjectURL(blobUrl);

            toast.innerHTML = `
                <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-emerald-700 font-medium">✅ Téléchargement terminé !</span>
            `;
            toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-emerald-50 rounded-xl shadow-xl px-4 py-2 text-sm z-50 border border-emerald-200 flex items-center gap-2';
            setTimeout(() => toast.remove(), 2000);

        } catch (err) {
            toast.innerHTML = `
                <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span class="text-red-700 font-medium">❌ Erreur lors du téléchargement</span>
            `;
            toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-red-50 rounded-xl shadow-xl px-4 py-2 text-sm z-50 border border-red-200 flex items-center gap-2';
            setTimeout(() => toast.remove(), 3000);
        }
    });

    cancelBtn?.addEventListener('click', closeModal);

    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Fermer avec la touche Echap
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleEsc);

    // Nettoyer l'écouteur d'événements lorsque le modal est fermé
    const originalClose = closeModal;
    const newCloseModal = () => {
        document.removeEventListener('keydown', handleEsc);
        originalClose();
    };

    // Remplacer la fonction closeModal
    const closeModalWithCleanup = () => {
        document.removeEventListener('keydown', handleEsc);
        modal.remove();
    };

    // Mettre à jour les références
    const closeModalFinal = closeModalWithCleanup;
    modal.querySelector('#cancel-download')?.addEventListener('click', closeModalFinal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModalFinal();
    });
};

  const LOGO_DISPROMALT = config.LOGO_DISPROMALT;
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
          <motion.div
            key={fIdx}
            className="relative w-full h-[280px] xs:h-[320px] sm:h-[380px] md:h-[420px] lg:h-[450px] rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-lg sm:shadow-2xl border border-white/10 group"
          >
            {/* ============================================ */}
            {/* IMAGE AVEC DESIGN MODERNE */}
            {/* ============================================ */}
            <div className="relative w-full h-full min-h-[200px] bg-gray-100 overflow-hidden rounded-t-xl group">
              {/* Image avec transition fluide */}
              <img
                src={data.photo}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                alt="Face"
              />

              {/* Overlay de protection - Empêche le téléchargement direct */}
              <div
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={() => setZoomedImage(data.photo)}
                onMouseDown={() => {
                  const timer = setTimeout(() => {
                    downloadImage(data.photo);
                  }, 3000);
                  setPressTimer(timer);
                }}
                onMouseUp={() => pressTimer && clearTimeout(pressTimer)}
                onMouseLeave={() => pressTimer && clearTimeout(pressTimer)}
                onTouchStart={() => {
                  const timer = setTimeout(() => {
                    downloadImage(data.photo);
                  }, 3000);
                  setPressTimer(timer);
                }}
                onTouchEnd={() => pressTimer && clearTimeout(pressTimer)}
                onContextMenu={(e) => e.preventDefault()}
              >
                {/* ✅ Indicateur visuel - Fond semi-transparent au survol */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* ✅ Icône d'action au centre */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-blue-600"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                </div>

                {/* ✅ Indicateur de téléchargement en bas */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span className="text-[8px] text-white font-medium">Télécharger</span>
                  <span className="text-[6px] text-white/50">(appui long)</span>
                </div>
              </div>

              {/* ✅ Badge d'information en haut */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[8px] text-white font-medium">Image</span>
              </div>

              {/* ✅ Indicateur de zoom en haut à droite */}
              <div className="absolute top-3 right-3 z-20 bg-black/50 backdrop-blur-sm p-1.5 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
            </div>

            {/* BADGE STATUT - Responsive */}
            <div className="absolute top-2 right-2 xs:top-3 xs:right-3 sm:top-4 sm:right-4">
              <span className={`px-2 py-0.5 xs:px-3 xs:py-1 sm:px-4 sm:py-1.5 rounded-full text-[7px] xs:text-[8px] sm:text-[9px] font-black uppercase tracking-wider border backdrop-blur-md ${getStatusStyles(data.label)}`}>
                {data.label}
              </span>
            </div>

            {/* INFOS - Responsives et sans superposition excessive */}
            <div className="absolute bottom-0 left-0 right-0 p-3 xs:p-4 sm:p-5 md:p-6 text-white bg-gradient-to-t from-black/80 via-black/50 to-transparent">
              <div className="mb-2 xs:mb-3 sm:mb-4">
                <h3 className="text-base xs:text-lg sm:text-xl md:text-2xl font-black italic uppercase">
                  Face : {displayId}
                </h3>
                <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-black/90 font-bold uppercase truncate max-w-[90%]">
                  {panneau.adresse}
                </p>
              </div>

              {data.hasReservation && (
                <div className="bg-white/10 p-2 xs:p-2.5 sm:p-3 rounded-lg xs:rounded-xl backdrop-blur-md mb-2 xs:mb-3 sm:mb-4 border border-white/10">
                  <p className="text-[6px] xs:text-[7px] sm:text-[8px] uppercase text-white/50 font-bold truncate">
                    Client: <span className="text-white">{data.client}</span>
                  </p>
                  <p className="text-[6px] xs:text-[7px] sm:text-[8px] uppercase text-white/50 font-bold truncate">
                    Agent: <span className="text-white">{data.agent}</span>
                  </p>
                  <p className="text-[6px] xs:text-[7px] sm:text-[8px] uppercase text-white/50 font-bold truncate">
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
                  className="relative z-20 flex-1 py-1.5 xs:py-2 sm:py-2.5 md:py-3 bg-white/10 backdrop-blur-md rounded-lg xs:rounded-xl text-[8px] xs:text-[9px] sm:text-[10px] font-black uppercase hover:bg-white hover:text-black transition-all active:scale-95"
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
}

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



  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8); // 8 panneaux par page




  const { scrollYProgress, scrollY } = useScroll();

  // Maintenant qu'elle existe, on peut l'utiliser pour yBg et scaleX !
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  // 3. ACTIONS
  const ouvrirLaCarte = () => {
    router.push('/dashboard/carte');

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

  // Pagination - Calcul des indices
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);



  const logoUrl = config.LOGO_DISPROMALT;

  // --- RENDU : LOADING PREMIUM ---
  if (loading) {
    return (
      <div className="h-screen relative flex flex-col items-center justify-center overflow-hidden bg-[#1e40af]">

        {/* 1. LA TEXTURE DE FOND : Présente dès le départ pour éliminer le flash bleu brut */}
        <img
          src='icon-512x512.png'
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
            src='icon-512x512.png'
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

  {/* Indicateur de chargement pendant le changement de page */ }
  {
    loading && (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    )
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
        // pour éviter qu'un esspace vide ou bleu n'apparaisse en bas de l'écran quand l'image se déplace !
        // blur-[2px] : Un flou très léger qui garde la photo claire mais adoucit les contours.
        />

      </div>

      {/* ============================================ */}
{/* NAV HEADER - VERSION BLEUE PREMIUM */}
{/* ============================================ */}
<nav className="fixed top-0 inset-x-0 z-[150] px-2 sm:px-3 md:px-4 py-2 sm:py-3 backdrop-blur-3xl transition-all duration-500">
  <div className="max-w-[1800px] mx-auto">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`
        relative group overflow-visible
        flex items-center justify-between 
        h-14 sm:h-16 md:h-[4.2rem] lg:h-[4.5rem]
        px-3 sm:px-5 md:px-6 lg:px-8
        rounded-xl sm:rounded-2xl md:rounded-3xl lg:rounded-[2rem]
        transition-all duration-500
        bg-gradient-to-r from-blue-50/95 via-white/95 to-blue-50/95 backdrop-blur-2xl 
        border border-blue-200/50 shadow-xl shadow-blue-500/10
        hover:border-blue-400/60
        hover:shadow-2xl hover:shadow-blue-400/20
      `}
    >
      {/* Effet de brillance au survol */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

      {/* Effet de glow bleu */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {/* Bordure animée */}
      <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-center" />

      {/* ============================================ */}
      {/* LOGO - Version Bleue */}
      {/* ============================================ */}
      <div
        onClick={() => window.location.reload()}
        className="relative flex items-center gap-2 sm:gap-3 md:gap-4 cursor-pointer group/logo"
      >
        {/* Anneau lumineux */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 opacity-0 group-hover/logo:opacity-100 blur-xl transition-opacity duration-500" />

        {/* Cercle extérieur animé */}
        <div className="absolute -inset-1 rounded-xl border-2 border-blue-400/0 group-hover/logo:border-blue-400/30 transition-all duration-500" />

        <div className="relative">
          <div className="absolute inset-0 bg-white rounded-xl shadow-sm" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-xl" />

          <img
            src='icon-512x512.png'
            className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 rounded-xl object-cover border-2 border-blue-400/30 group-hover/logo:border-blue-400/70 transition-all duration-300 shadow-md group-hover/logo:shadow-blue-400/30"
            alt="Logo"
          />
          <div className="absolute -top-1 -right-1 w-2 h-2 md:w-2.5 md:h-2.5 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-pulse shadow-lg shadow-blue-400/50" />
        </div>

        <div className="flex flex-col leading-[0.7] sm:leading-[0.75]">
          <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black italic uppercase tracking-tighter">
            <span className="text-gray-900 group-hover/logo:text-blue-600 transition-all">G</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">D</span>
            <span className="text-gray-900 group-hover/logo:text-blue-600 transition-all">P</span>
          </span>
          <span className="text-[4px] sm:text-[5px] md:text-[6px] lg:text-[7px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] text-blue-600/80 mt-0.5 whitespace-nowrap">
            GESTION DIGITALE
          </span>
        </div>
      </div>

      {/* ============================================ */}
      {/* DESKTOP MENU - Version Bleue */}
      {/* ============================================ */}
      <div className="hidden lg:flex items-center gap-2 md:gap-3 lg:gap-4">

        {/* Bouton Accueil - Bleu */}
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.reload()}
          className="relative overflow-hidden group/btn px-4 md:px-5 lg:px-6 py-2 md:py-2.5 lg:py-3 rounded-full font-black uppercase text-[8px] md:text-[9px] lg:text-[10px] tracking-wider shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-0 rounded-full ring-2 ring-blue-400/0 group-hover/btn:ring-blue-400/50 transition-all duration-300" />
          <span className="relative flex items-center gap-1.5 z-10">
            <span className="text-xs md:text-sm">🏠</span>
            <span className="hidden md:inline">ACCUEIL</span>
            <span className="md:hidden">HOME</span>
          </span>
        </motion.button>

        {/* Bouton Carte - Bleu */}
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={ouvrirLaCarte}
          className="relative overflow-hidden group/btn px-4 md:px-5 lg:px-6 py-2 md:py-2.5 lg:py-3 rounded-full font-black uppercase text-[8px] md:text-[9px] lg:text-[10px] tracking-wider shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
          <span className="relative flex items-center gap-1.5 z-10">
            <MapPin size={12} className="md:w-[13px] md:h-[13px] lg:w-[14px] lg:h-[14px] group-hover/btn:rotate-12 transition-transform duration-300" />
            <span className="hidden md:inline">🗺️ CARTE</span>
            <span className="md:hidden">MAP</span>
          </span>
        </motion.button>

        {/* Bouton CTA - Rouge (conserve la distinction) */}
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

        {/* Séparateur */}
        <div className="h-6 md:h-7 lg:h-8 w-px bg-gradient-to-b from-transparent via-blue-400/40 to-transparent mx-1 md:mx-2" />

        {/* Bouton Menu Filtre - Bleu */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsSidebarOpen(true)}
          className="group/filter relative overflow-hidden px-4 md:px-5 lg:px-6 py-2 md:py-2.5 lg:py-3 rounded-full font-black uppercase text-[8px] md:text-[9px] lg:text-[10px] tracking-wider transition-all duration-300 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white shadow-md hover:shadow-blue-500/30"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 translate-y-full group-hover/filter:translate-y-0 transition-transform duration-300" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/filter:translate-x-full transition-transform duration-700" />
          <span className="relative flex items-center gap-1.5 z-10">
            <Filter size={12} className="md:w-[13px] md:h-[13px] lg:w-[14px] lg:h-[14px] text-gray-700 group-hover/filter:text-white transition-colors duration-300" />
            <span className="hidden lg:inline text-gray-800 group-hover/filter:text-white transition-colors">MENU PRINCIPAL</span>
            <span className="md:hidden text-gray-800 group-hover/filter:text-white transition-colors">MENU</span>
          </span>
        </motion.button>
      </div>

      {/* ============================================ */}
      {/* Mobile & Tablet Menu Button - Bleu */}
      {/* ============================================ */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsSidebarOpen(true)}
        className="relative lg:hidden p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl bg-blue-50/50 backdrop-blur-sm border border-blue-200/50 hover:border-blue-400/60 hover:bg-blue-100/50 transition-all duration-300 group/mobile"
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/20 to-indigo-500/20 opacity-0 group-active/mobile:opacity-100 transition-opacity duration-300 scale-0 group-active/mobile:scale-100" />
        <Menu size={20} className="sm:w-[22px] sm:h-[22px] md:w-[24px] md:h-[24px] text-blue-600 relative z-10" />
        
        {/* Indicateur de notification */}
        <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gradient-to-r from-red-500 to-red-400 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
        <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-ping bg-red-400/50" />
      </motion.button>

      {/* Indicateur de scroll */}
      <div className="hidden lg:block absolute -bottom-6 left-1/2 -translate-x-1/2">
        <div className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-1 h-2 bg-blue-400 rounded-full animate-bounce" />
        </div>
      </div>
    </motion.div>
  </div>
</nav>

{/* SIDEBAR / MENU LATÉRAL - ULTRA RESPONSIVE SANS ERREURS */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Overlay - fond noir transparent léger */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[250] cursor-pointer"
            />

            {/* Boîte de dialogue - FOND BLANC ÉLÉGANT */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`
          fixed z-[300] flex flex-col overflow-hidden
          shadow-2xl shadow-black/10
          border border-gray-200 rounded-3xl
          bg-white
          
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
              {/* En-tête - Logo + titre centrés */}
              <div className="p-4 sm:p-6 md:p-8 flex flex-col items-center border-b border-gray-200 bg-white">
                {/* Logo centré */}
                <div className="flex justify-center mb-3">
                  <div className="relative">
                    <img
                      src='icon-512x512.png'
                      alt="Logo"
                      className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl object-cover shadow-md border border-gray-200"
                    />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-md animate-pulse" />
                  </div>
                </div>

                {/* Titre centré */}
                <div className="text-center">
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold italic uppercase text-gray-800 tracking-tighter">
                    Menu <span className="text-blue-600 drop-shadow-sm">Général</span>
                  </span>
                  <span className="block text-[6px] sm:text-[7px] md:text-[8px] font-medium uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.5em] text-gray-400 mt-1">
                    Système de Supervision
                  </span>
                </div>

                {/* Bouton fermer en haut à droite */}
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="absolute top-4 right-4 group p-2 sm:p-2.5 md:p-3 bg-gray-100 hover:bg-red-100 rounded-xl sm:rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-[22px] md:h-[22px] text-gray-600 group-hover:text-red-600 group-hover:rotate-90 transition-all duration-300" />
                </button>
              </div>

              {/* Contenu - Navigation simplifiée (3 éléments) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-gray-50/50">
                <div className="space-y-3 sm:space-y-4">
                  {/* Titre de section */}
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] mb-2 sm:mb-3">
                    Navigation
                  </p>

                  {/* 3 éléments seulement */}
                  {[
                    {
                      icon: <Home className="w-5 h-5 sm:w-[22px] sm:h-[22px] md:w-6 md:h-6" />,
                      label: "Accueil",
                      description: "Tableau de bord principal",
                      action: () => window.location.reload()
                    },
                    {
                      icon: <MapPin className="w-5 h-5 sm:w-[22px] sm:h-[22px] md:w-6 md:h-6" />,
                      label: "Carte Interactive",
                      description: "Visualisation géographique",
                      action: ouvrirLaCarte
                    },
                    {
                      icon: <PlusCircle className="w-5 h-5 sm:w-[22px] sm:h-[22px] md:w-6 md:h-6" />,
                      label: "Accès Admin",
                      description: "Zone réservée aux administrateurs",
                      action: () => setIsLoginOpen(true)
                    },
                  ].map((item, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ x: 4, scale: 1.01 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        item.action();
                        setIsSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl 
                  bg-white hover:bg-gray-100 border-2 border-gray-200 hover:border-blue-400
                  text-gray-700 hover:text-gray-900 transition-all duration-300 shadow-sm group"
                    >
                      {/* Icône */}
                      <div className="p-2 sm:p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                        <span className="text-blue-500 group-hover:text-blue-600 transition-colors">
                          {item.icon}
                        </span>
                      </div>

                      {/* Texte */}
                      <div className="flex-1 text-left">
                        <p className="font-bold text-sm sm:text-base text-gray-800">
                          {item.label}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-400 font-medium">
                          {item.description}
                        </p>
                      </div>

                      {/* Flèche indicative */}
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <span className="text-gray-400 group-hover:text-blue-600 transition-colors text-sm">
                          →
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Pied de page - compact */}
              <div className="p-3 sm:p-4 border-t border-gray-200 bg-white">
                <p className="text-[6px] sm:text-[7px] text-center text-gray-400 uppercase tracking-[0.15em] sm:tracking-[0.2em]">
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
            {currentItems.map((p, idx) => (
              <ElegantCard
                key={p.id}
                panneau={p}
                index={idx}
                selectedIds={selected}
                onSelect={(selectionKey: string) => {
                  setSelected((prev) =>
                    prev.includes(selectionKey)
                      ? prev.filter((id) => id !== selectionKey)
                      : [...prev, selectionKey]
                  );
                }}
                ouvrirLaCarte={ouvrirLaCarte}
              />
            ))}
          </AnimatePresence>
        </motion.div>



        {/* PAGINATION - ULTRA RESPONSIVE */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-12 pt-6 border-t border-white/10">
            {/* Informations */}
            <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
              Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filtered.length)} sur {filtered.length} panneaux
            </div>

            {/* Boutons de pagination */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {/* Bouton Première page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-[10px] font-bold uppercase hover:bg-amber-500 hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                «
              </button>

              {/* Bouton Précédent */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-[10px] font-bold uppercase hover:bg-amber-500 hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Précédent
              </button>

              {/* Numéros de page (responsive) */}
              <div className="flex gap-1">
                {(() => {
                  let pages = [];
                  let startPage = Math.max(1, currentPage - 2);
                  let endPage = Math.min(totalPages, startPage + 4);

                  if (endPage - startPage < 4) {
                    startPage = Math.max(1, endPage - 4);
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                  }

                  return pages.map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-black text-[10px] sm:text-[11px] transition-all ${currentPage === pageNum
                        ? 'bg-amber-500 text-black shadow-lg'
                        : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/20'
                        }`}
                    >
                      {pageNum}
                    </button>
                  ));
                })()}
              </div>

              {/* Bouton Suivant */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-[10px] font-bold uppercase hover:bg-amber-500 hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Suivant
              </button>

              {/* Bouton Dernière page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-[10px] font-bold uppercase hover:bg-amber-500 hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>

            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-[10px] font-bold uppercase outline-none cursor-pointer"
            >
              <option value={4}>4 par page</option>
              <option value={8}>8 par page</option>
              <option value={16}>16 par page</option>
              <option value={32}>32 par page</option>
              <option value={64}>64 par page</option>
              <option value={128}>128 par page</option>

            </select>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="py-40 text-center">
            <p className="text-zinc-200/50 font-black uppercase tracking-[0.5em] italic">Aucun panneau trouvé</p>
          </div>
        )}
      </main>
      <Footer />
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
  const [startY, setStartY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const reservations = (face.reservations || [])
    .sort((a: any, b: any) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime());

  // Gestion du swipe vers le bas pour fermer sur mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 50) {
      onClose();
      setIsSwiping(false);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-3 md:p-4 bg-blue-900/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative w-full max-w-5xl mx-auto bg-white/95 backdrop-blur-xl border-t sm:border border-blue-200/50 rounded-t-2xl sm:rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/20"
          >
            {/* Effet de glow bleu élégant */}
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse pointer-events-none" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none" />

            {/* === INDICATEUR DE SWIPE (mobile) === */}
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-blue-300/50 rounded-full" />
            </div>

            {/* === BOUTONS DE FERMETURE === */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 p-1.5 sm:p-2 bg-white/80 backdrop-blur-xl hover:bg-red-500 hover:text-white rounded-full transition-all duration-300 border border-blue-200/50 active:scale-95 text-blue-900"
            >
              <X size={14} className="sm:w-4 sm:h-4" />
            </button>

            {/* Bouton Fermer mobile */}
            <div className="sm:hidden absolute bottom-16 left-1/2 -translate-x-1/2 z-20">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 backdrop-blur-xl rounded-full border border-blue-400/30 text-white text-[9px] font-black uppercase tracking-wider active:scale-95 shadow-lg shadow-blue-600/20"
              >
                ✕ Fermer
              </button>
            </div>

            {/* Layout : photo compacte + contenu */}
            <div className="flex flex-col md:flex-row max-h-[90vh] sm:max-h-[85vh]">

              {/* --- SECTION PHOTO COMPACTE --- */}
              <div className="relative w-full md:w-[35%] lg:w-[32%] h-[28vh] sm:h-[32vh] md:h-auto shrink-0">
                <img
                  src={face.photoCampagneUrl || logo}
                  className="w-full h-full object-cover"
                  alt="Visual"
                />

                {/* Overlay élégant */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 via-blue-900/20 to-blue-900/30" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-transparent to-transparent" />

                {/* Badge Status compact */}
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full backdrop-blur-2xl border ${isLibre
                    ? 'bg-emerald-500/20 border-emerald-500/50'
                    : 'bg-rose-500/20 border-rose-500/50'}`}>
                    <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isLibre ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span className="text-[6px] sm:text-[7px] font-black text-white uppercase">{isLibre ? 'Dispo' : 'Occ'}</span>
                  </div>
                </div>

                {/* Infos compactes sur l'image */}
                <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white italic leading-tight">
                    {panneau.idPan}
                  </h2>
                  <div className="flex gap-1 mt-0.5">
                    <span className="bg-blue-500 text-white text-[6px] sm:text-[7px] font-black px-1.5 py-0.5 rounded-md">
                      {face.sens}
                    </span>
                  </div>
                </div>
              </div>

              {/* --- SECTION CONTENU --- */}
              <div className="flex-1 flex flex-col bg-gradient-to-b from-blue-50/80 to-white overflow-hidden">

                {/* Header compact */}
                <div className="p-2 sm:p-3 md:p-4 border-b border-blue-200/50 bg-white/50">
                  <p className="text-blue-700 text-[7px] sm:text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                    <MapPin size={10} className="sm:w-3 sm:h-3" />
                    📍 {panneau.adresse?.substring(0, 50)}{panneau.adresse?.length > 50 ? '...' : ''}
                  </p>
                  {isSelected && (
                    <span className="inline-block mt-1 text-blue-600 text-[6px] sm:text-[7px] font-black bg-blue-100 px-1.5 py-0.5 rounded-full">
                      ✓ Sélectionné
                    </span>
                  )}
                </div>

                {/* ZONE SCROLLABLE OPTIMISÉE */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 custom-scrollbar bg-white/30">

                  {/* Métriques compactes - 3 cartes en ligne */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {[
                      { icon: <Zap size={10} className="sm:w-3 sm:h-3" />, label: "Visibilité", val: face.visibilite || 90 },
                      { icon: <Activity size={10} className="sm:w-3 sm:h-3" />, label: "Trafic", val: face.mobimetrie || 85 },
                      { icon: <ShieldCheck size={10} className="sm:w-3 sm:h-3" />, label: "Score", val: 98 },
                    ].map((m, i) => (
                      <div key={i} className="bg-blue-50/80 border border-blue-200/60 rounded-xl p-2 sm:p-3 text-center hover:border-blue-400/80 transition-all">
                        <div className="flex justify-center text-blue-600 mb-0.5">{m.icon}</div>
                        <p className="text-sm sm:text-base md:text-lg font-black text-blue-900">{m.val}%</p>
                        <p className="text-[6px] sm:text-[7px] font-bold text-blue-400 uppercase">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Timeline compacte */}
                  <section className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <Calendar size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-600" />
                      <h4 className="text-blue-900 text-[10px] sm:text-[11px] md:text-[12px] font-black uppercase tracking-wider">Chronologie</h4>
                      <span className="text-[8px] sm:text-[9px] text-blue-400 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/50">
                        {reservations.length} campagne{reservations.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="relative border-l-2 border-blue-200 ml-3 sm:ml-4 pl-5 sm:pl-6 space-y-4 sm:space-y-5">
                      {reservations.length > 0 ? (
                        reservations.map((res: any, i: number) => {
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          const debut = new Date(res.dateDebut);
                          const fin = new Date(res.dateFin);
                          const joursRestants = Math.ceil((fin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          const isNearEnd = joursRestants <= 3 && joursRestants >= 0;
                          const isExpired = now > fin;
                          const isActive = now >= debut && now <= fin;

                          let statusLabel = "En attente";
                          let statusColor = "text-blue-600 bg-blue-50 border-blue-200";

                          if (isExpired) {
                            statusLabel = "Terminée";
                            statusColor = "text-gray-400 bg-gray-50 border-gray-200";
                          } else if (isNearEnd) {
                            statusLabel = "Expire bientôt";
                            statusColor = "text-orange-600 bg-orange-50 border-orange-200";
                          } else if (isActive) {
                            statusLabel = "En cours";
                            statusColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
                          }

                          return (
                            <div key={i} className="relative group">
                              {/* Point sur la timeline */}
                              <div className={`absolute -left-[21px] sm:-left-[25px] top-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-[2.5px] bg-white flex items-center justify-center
                                ${isNearEnd ? 'border-orange-500 shadow-orange-500/50' :
                                  isActive ? 'border-emerald-500 shadow-emerald-500/50' :
                                    'border-blue-300'}`}>
                                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full 
                                  ${isNearEnd ? 'bg-orange-500 animate-pulse' :
                                    isActive ? 'bg-emerald-500 animate-pulse' :
                                      'bg-blue-400'}`} />
                              </div>

                              {/* Carte de réservation */}
                              <div className={`bg-white border rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:shadow-lg hover:border-blue-400/60
                                ${isNearEnd ? 'border-orange-300 shadow-orange-100' :
                                  isActive ? 'border-emerald-300' :
                                    'border-blue-200/60'}`}>

                                {/* En-tête de la carte */}
                                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-blue-900 text-[10px] sm:text-[11px] md:text-[12px] font-black uppercase tracking-tight truncate">
                                      {res.societeLocatrice}
                                    </p>
                                    {isNearEnd && (
                                      <p className="text-orange-500 text-[8px] sm:text-[9px] font-black uppercase flex items-center gap-1 mt-1">
                                        <span className="animate-pulse">⚠️</span>
                                        Fin dans {joursRestants} jour{joursRestants > 1 ? 's' : ''}
                                      </p>
                                    )}
                                  </div>

                                  {/* Badge de statut */}
                                  <span className={`shrink-0 text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase px-2 py-1 rounded-md border ${statusColor}`}>
                                    {statusLabel}
                                  </span>
                                </div>

                                {/* Dates */}
                                <div className="flex justify-between items-center gap-2 pt-2 border-t border-blue-100">
                                  <div className="flex gap-3 sm:gap-4">
                                    <div className="flex flex-col">
                                      <span className="text-[7px] sm:text-[8px] text-blue-400 uppercase font-black">Début</span>
                                      <span className="text-[9px] sm:text-[10px] md:text-[11px] text-blue-900 font-bold">
                                        {new Date(res.dateDebut).toLocaleDateString('fr-FR')}
                                      </span>
                                    </div>
                                    <div className="flex items-end pb-1">
                                      <span className="text-blue-300 text-[10px]">→</span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[7px] sm:text-[8px] text-blue-400 uppercase font-black">Fin</span>
                                      <span className={`text-[9px] sm:text-[10px] md:text-[11px] font-bold ${isNearEnd ? 'text-orange-500' : 'text-blue-900'}`}>
                                        {new Date(res.dateFin).toLocaleDateString('fr-FR')}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Badges supplémentaires */}
                                  <div className="flex gap-1">
                                    {res.validationComptable === true && (
                                      <div className="p-1 bg-blue-100 text-blue-600 rounded-md border border-blue-200" title="Validé comptablement">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                                      </div>
                                    )}
                                    {res.facturee === "oui" && (
                                      <div className="p-1 bg-amber-100 text-amber-600 rounded-md border border-amber-200" title="Facturée">
                                        <span className="text-[9px] font-black">€</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        /* Message opportunité */
                        <div className="relative">
                          <div className="absolute -left-[21px] sm:-left-[25px] top-2 w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          </div>

                          <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center space-y-2 hover:bg-blue-100/50 transition-all cursor-pointer">
                            <div className="inline-flex p-2 bg-blue-100 rounded-full text-blue-600">
                              <PlusCircle size={16} className="sm:w-5 sm:h-5" />
                            </div>
                            <h3 className="text-blue-700 text-[11px] sm:text-[12px] font-black uppercase tracking-tighter">Opportunité disponible !</h3>
                            <p className="text-blue-500/80 text-[9px] sm:text-[10px] leading-relaxed max-w-[250px] mx-auto">
                              Cette face n'attend que votre visibilité.<br />
                              <span className="text-blue-900 font-bold italic">Réservez-la dès maintenant.</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                  {/* Espace pour boutons fixes */}
                  <div className="h-12 sm:h-14" />
                </div>

                {/* Actions fixes en bas */}
                <div className="absolute bottom-0 left-0 right-0 md:static p-2 sm:p-3 bg-gradient-to-t from-white via-white/95 to-white/80 md:bg-transparent border-t border-blue-200/50 md:border-t-0 mt-auto">
                  <div className="flex gap-2">
                    <button
                      //onClick={() => { ouvrirLaCarte(); onClose(); }}
                      className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-700 transition-all active:scale-95 border border-blue-200"
                    >
                      <MapPin size={14} className="sm:w-4 sm:h-4" />
                    </button>

                    <button
                      disabled={!isLibre && !isSelected}
                      onClick={() => onSelect(selectionKey)}
                      className={`flex-1 h-8 sm:h-9 rounded-lg font-black text-[8px] sm:text-[9px] uppercase flex items-center justify-center gap-1 transition-all active:scale-95 shadow-lg
                        ${isSelected
                          ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-red-500/30'
                          : isLibre
                            ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-blue-500/30 hover:shadow-blue-500/50'
                            : 'bg-blue-100 text-blue-400 cursor-not-allowed'}`}
                    >
                      {isSelected ? (
                        <><MinusCircle size={10} className="sm:w-3 sm:h-3" /> <span className="hidden xs:inline">RETIRER</span><span className="xs:hidden">RETIRER</span></>
                      ) : isLibre ? (
                        <><PlusCircle size={10} className="sm:w-3 sm:h-3" /> <span className="hidden xs:inline">RÉSERVER</span><span className="xs:hidden">RÉSERV</span></>
                      ) : (
                        <span className="hidden xs:inline">INDISPONIBLE</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
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

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // 2. APPELLE LE HOOK ICI (tout en haut du composant, pas dans handleLogin)
  const { login } = useAuth();
  if (!isOpen) return null;

  const [showPassword, setShowPassword] = useState(false); // ICI !
  const logoUrl = config.LOGO_DISPROMALT;
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
        client: '/dashboard/visiteurs'
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
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm"
      onClick={handleClose} // ← Ajoutez cette ligne
    >
      {/* Conteneur principal – empêche la propagation du clic */}
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()} // ← Empêche la fermeture si on clique sur le formulaire
      >
        {/* HEADER – Logo + titre */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <img
                src='icon-512x512.png'
                alt="Logo"
                className="w-16 h-16 rounded-2xl object-cover shadow-md border border-gray-200"
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-md" />
            </div>
          </div>
          {/* Titre */}
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
            Connexion
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Accédez à votre espace sécurisé
          </p>
        </div>
        {/* FORMULAIRE */}
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {/* Champ Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Adresse email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                placeholder=".....@dispromalt.cd" 
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                placeholder="••••••••••"
              />
            </div>
          </div>
          {/* Bouton Connexion */}
          <button
            type="submit"
            disabled={loading}
            className="relative w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 rounded-xl text-sm tracking-wide shadow-md shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <Zap size={16} />
                <span>Se connecter</span>
              </>
            )}
          </button>
          {/* Pied de sécurité */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
              Connexion sécurisée
            </span>
          </div>
        </form>
      </motion.div>
    </div>
  );
}