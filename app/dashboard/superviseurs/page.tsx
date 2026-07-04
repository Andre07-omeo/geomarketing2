"use client";

import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, } from 'firebase/firestore';
import { getAuth, } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useSpring, useMotionValueEvent } from 'framer-motion';
import {
  Search, MapPin, Filter, PlusCircle, CheckCircle2,
  Menu, X, Home, Zap, Globe, Loader2, Clock, UserCheck, FileText, Send
} from 'lucide-react';
import {
  // ... vos autres imports
  Plus,           // ✅ Pour le bouton flottant
  ChevronRight,   // ✅ Pour la flèche
} from 'lucide-react';

import Footer from '@/components1/Footer';
import Link from 'next/link';
// Ajoute AlertTriangle ici
import { AlertTriangle } from 'lucide-react';

// ============================================
// IMPORTS À AJOUTER EN HAUT DU FICHIER
// ============================================
import { where, addDoc } from 'firebase/firestore';


import {
  Settings,
} from 'lucide-react';

import {

  query,
  orderBy,

  // Ajoutez 'doc' si vous l'utilisez ailleurs, 
  // mais dans ce useEffect précis, c'est le 'doc' du snapshot (pas l'import)
} from 'firebase/firestore';

import { deleteDoc } from "firebase/firestore";


import { getDoc } from "firebase/firestore";

// ✅ Version require avec chemin correct
const config = require('../../../config/db');
import {
  // ... vos autres imports
  BookOpen,  // ✅ AJOUTER CETTE LIGNE
} from 'lucide-react';

// Toutes ces variables fonctionneront maintenant :
const firebaseConfig = config.firebaseConfig;
const GEOGRAPHIE = config.GEOGRAPHIE;





const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);


const logo = config.LOGO_DISPROMALT;





const ElegantCard = ({ panneau, selectedIds = [], onSelect, index, onEdit, user, ouvrirLaCarte, onReserver,  // ✅ AJOUTER CETTE PROP
}: any) => {
  const [selectedFaceDetails, setSelectedFaceDetails] = useState<any>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isFloatingMenuOpen, setIsFloatingMenuOpen] = useState(false);

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

  // ✅ LOGIQUE MÉTIER CORRIGÉE
  const isValidReservation = (res: any) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 1️⃣ Vérifier si la réservation est en cours (date du jour entre dateDebut et dateFin)
    const debut = new Date(res.dateDebut);
    const fin = new Date(res.dateFin);
    debut.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);

    const isCurrentlyActive = now >= debut && now <= fin;

    // 2️⃣ Vérifier si la réservation est payée ou validée comptablement
    const isPaidOrValidated =
      res.statutPaiement === 'payé' ||
      res.statutPaiement === 'validé' ||
      res.validationComptable === true;

    // 3️⃣ Vérifier si le délai de paiement est expiré
    const joursAvantExpiration = res.joursAvantExpiration ?? 0;
    const isPaymentDeadlineExpired = joursAvantExpiration === 0;

    // 4️⃣ RÈGLES D'AFFICHAGE :
    // ✅ Si la réservation est en cours → on l'affiche
    if (isCurrentlyActive) {
      return true;
    }

    // ✅ Si le délai de paiement est expiré MAIS que le paiement a été effectué → on l'affiche
    if (isPaymentDeadlineExpired && isPaidOrValidated) {
      return true;
    }

    // ✅ Si le délai de paiement n'est pas expiré → on l'affiche (même si non payée)
    if (!isPaymentDeadlineExpired) {
      return true;
    }

    // ❌ Sinon → on n'affiche pas
    return false;
  };

  const getActiveData = (face: any) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // ✅ Trouver la réservation valide selon les règles métier
    const currentRes = face.reservations?.find((res: any) => {
      return isValidReservation(res);
    });

    if (currentRes) {
      const fin = new Date(currentRes.dateFin);
      fin.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((fin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Vérifier le statut de paiement
      const isPaidOrValidated =
        currentRes.statutPaiement === 'payé' ||
        currentRes.statutPaiement === 'validé' ||
        currentRes.validationComptable === true;

      // Vérifier le délai d'expiration
      const joursAvantExpiration = currentRes.joursAvantExpiration ?? 0;
      const isPaymentDeadlineExpired = joursAvantExpiration === 0;

      // Déterminer le label approprié
      let label = currentRes.statut || "Occupé";

      if (isPaidOrValidated) {
        label = currentRes.validationComptable ? '✅ Validé' : '✅ Payé';
      } else if (isPaymentDeadlineExpired) {
        // Ce cas ne devrait pas arriver car on ne l'affiche pas
        label = '⚠️ Délai dépassé';
      }

      return {
        hasReservation: true,
        label: label,
        photo: currentRes.photoCampagneUrl || face.photoCampagneUrl || LOGO_DISPROMALT,
        client: currentRes.societeLocatrice,
        agent: currentRes.agentNom || "Non spécifié",
        dates: `${new Date(currentRes.dateDebut).toLocaleDateString()} - ${new Date(currentRes.dateFin).toLocaleDateString()}`,
        daysLeft: daysLeft >= 0 ? daysLeft : 0,
        isPaidOrValidated: isPaidOrValidated,
        isPaymentDeadlineExpired: isPaymentDeadlineExpired,
        joursAvantExpiration: joursAvantExpiration
      };
    }

    // Aucune réservation valide → Libre
    return {
      hasReservation: false,
      label: "Libre",
      photo: face.photoParDefaut || LOGO_DISPROMALT,
      client: null,
      agent: null,
      dates: null,
      daysLeft: null,
      isPaidOrValidated: false,
      isPaymentDeadlineExpired: false,
      joursAvantExpiration: 0
    };
  };

  return (
    <>
      <AnimatePresence>
        {selectedFaceDetails && (
          <FaceDetailModal
            isOpen={true}
            onClose={() => setSelectedFaceDetails(null)}
            panneau={panneau}
            face={selectedFaceDetails}
            onSelect={onSelect}
            isSelected={selectedIds.includes(`${panneau.id}_${selectedFaceDetails?.id}`)}
            ouvrirLaCarte={ouvrirLaCarte}
            user={user}
          />
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
            {/* IMAGE */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={data.photo}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                alt="Face"
              />
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
              />
            </div>

            {/* BADGE STATUT */}
            <div className="absolute top-2 right-2 xs:top-3 xs:right-3 sm:top-4 sm:right-4">
              <span className={`px-2 py-0.5 xs:px-3 xs:py-1 sm:px-4 sm:py-1.5 rounded-full text-[7px] xs:text-[8px] sm:text-[9px] font-black uppercase tracking-wider border backdrop-blur-md ${getStatusStyles(data.label)}`}>
                {data.label}
              </span>
            </div>

            {/* INFOS */}
            <div className="absolute bottom-0 left-0 right-0 p-3 xs:p-4 sm:p-5 md:p-6 text-white bg-gradient-to-t from-black/80 via-black/50 to-transparent">
              <div className="mb-2 xs:mb-3 sm:mb-4">
                <h3 className="text-base xs:text-lg sm:text-xl md:text-2xl font-black italic uppercase">
                  Face : {displayId}
                </h3>
                <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-white/90 font-bold uppercase truncate max-w-[90%]">
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
                  {!data.isPaidOrValidated && data.joursAvantExpiration > 0 && (
                    <p className="text-[6px] xs:text-[7px] sm:text-[8px] uppercase text-amber-400 font-bold truncate">
                      ⏳ {data.joursAvantExpiration} jour{data.joursAvantExpiration > 1 ? 's' : ''} pour payer
                    </p>
                  )}
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

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(panneau);
                  }}
                  className="relative z-20 px-3 xs:px-4 sm:px-5 md:px-6 py-1.5 xs:py-2 sm:py-2.5 md:py-3 bg-[#d4af37] rounded-lg xs:rounded-xl text-black font-black text-[8px] xs:text-[9px] sm:text-[10px] uppercase hover:bg-white transition-all active:scale-95"
                >
                  <Settings size={12} className="xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}

    </>
  );
};




import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  FilePieChart,
  LogOut,
  User,
} from "lucide-react";

// --- 1. INTERFACES & TYPES ---
interface Face {
  statut?: string;
  // ajoute d'autres champs si nécessaire
}

interface Panneau {
  id: string;
  idPan?: string;
  adresse?: string;
  type?: string;
  format?: string;
  faces?: Face[];
  createdAt?: any;
}
// Interface pour les RDV
interface RdvData {
  id: string;
  clientNom: string;
  clientContact?: string;
  dateVisite: string;
  heureVisite?: string;
  objet: string;
  description?: string;
  resultat?: string;
  prochainRdv?: string;
  statut: 'en_attente' | 'valide' | 'rejete' | 'realise' | 'annule' | 'reporte';
  agentEmail: string;
  agentNom: string;
  createdAt: any;
  dateModification: any;
  userId: string;
  luParResponsable?: boolean;
  commentaireResponsable?: string;
}
import {
  // ... autres imports
  CreditCard  // ← Ajoutez ceci
} from 'lucide-react';

import { useMemo } from 'react'; // Ajoute useMemo ici

import { useTransform } from 'framer-motion';

// Ajoute 'limit' ici
import {
  limit,
} from "firebase/firestore";


// --- 3. COMPOSANT PRINCIPAL ---
export default function UltimateSupervisor() {


  // Constantes pour les statuts
  const STATUTS_RDV = {
    en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: '⏳' },
    valide: { label: 'Validé', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: '✅' },
    rejete: { label: 'Rejeté', color: 'bg-red-100 text-red-700 border-red-300', icon: '❌' },
    realise: { label: 'Réalisé', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: '📋' },
    annule: { label: 'Annulé', color: 'bg-gray-100 text-gray-600 border-gray-300', icon: '🚫' },
    reporte: { label: 'Reporté', color: 'bg-purple-100 text-purple-700 border-purple-300', icon: '🔄' }
  };

  // Email de l'admin responsable
  const ADMIN_RESPONSABLE = 'admincommerciaux@dispromalt.cd';



  // --- ÉTATS DES DONNÉES ---
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [panneauToEdit, setPanneauToEdit] = useState<Panneau | null>(null);

  // --- ÉTATS UI (MODALES / SIDEBAR) ---
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [paymentModes, setPaymentModes] = useState<{ [key: string]: 'total' | 'tranche' }>({});
  const [selectedForPrint, setSelectedForPrint] = useState<{ [key: string]: boolean }>({});
  const [panneauxData, setPanneauxData] = useState<Panneau[]>([]);



  const router = useRouter();
  const { user, logout } = useAuth();

  // ✅ ÉTATS POUR LES DONNÉES UTILISATEUR
  const [userData, setUserData] = useState<any>(null);
  const [displayName, setDisplayName] = useState('Agent');
  const [userEmail, setUserEmail] = useState('');
  const [userInitial, setUserInitial] = useState('A');





  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8); // 8 panneaux par page


  // Ajoutez ces states après les autres states
  const [globalPaymentMode, setGlobalPaymentMode] = useState<'total' | 'tranche'>('total');
  const [globalTranchesCount, setGlobalTranchesCount] = useState(1);
  const [totalFactureAmount, setTotalFactureAmount] = useState(0);


  const [tranchesCount, setTranchesCount] = useState<{ [key: string]: number }>({});


  const [dernierIdFacture, setDernierIdFacture] = useState(0); // <--- DOIT ÊTRE ICI







  // États pour le module RDV (complétés)
  const [rdvForm, setRdvForm] = useState({
    clientNom: '',
    clientContact: '',
    dateVisite: new Date().toISOString().split('T')[0],
    heureVisite: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    objet: '',
    description: '',
    resultat: '',
    prochainRdv: '',
    statut: 'en_attente' as 'en_attente' | 'valide' | 'rejete' | 'realise' | 'annule' | 'reporte'
  });

  const [isSubmittingRdv, setIsSubmittingRdv] = useState(false);
  const [rdvHistory, setRdvHistory] = useState<RdvData[]>([]);
  const [showRdvForm, setShowRdvForm] = useState(false);
  const [rdvFilter, setRdvFilter] = useState<'tous' | 'en_attente' | 'valide' | 'rejete' | 'realise' | 'annule' | 'reporte'>('tous');
  const [expandedRdvId, setExpandedRdvId] = useState<string | null>(null);
  const [editingRdvId, setEditingRdvId] = useState<string | null>(null);
  const [commentaireResponsable, setCommentaireResponsable] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedRdvForAction, setSelectedRdvForAction] = useState<RdvData | null>(null);

  // ============================================
  // ÉTATS EXISTANTS
  // ============================================
  const [filters, setFilters] = useState({
    pays: '',
    province: '',
    district: '',
    commune: '',
    type: '',
    statut: ''
  });

  // ✅ AJOUTER CE CI



  useEffect(() => {
    if (user) {
      // Empêcher le retour arrière
      const preventBack = () => {
        window.history.pushState(null, '', window.location.href);
      };

      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', preventBack);

      return () => {
        window.removeEventListener('popstate', preventBack);
      };
    }
  }, [user]);

  // 2. Place le code ici (il s'exécute une seule fois au chargement)
  useEffect(() => {
    const fetchLastId = async () => {
      try {
        // On cherche la facture avec l'ID le plus élevé
        const q = query(
          collection(db, "factures"),
          orderBy("factureIdFormat", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const lastIdStr = querySnapshot.docs[0].data().factureIdFormat;
          if (lastIdStr && lastIdStr.includes('.')) {
            const parts = lastIdStr.split('.');
            const lastNumber = parseInt(parts[parts.length - 1], 10);
            setDernierIdFacture(isNaN(lastNumber) ? 0 : lastNumber);
          }
        } else {
          setDernierIdFacture(0);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du dernier ID:", error);
        setDernierIdFacture(0);
      }
    };

    fetchLastId();
  }, [db]); // Se déclenche une fois au montage




  useEffect(() => {
    if (user) {
      // Empêcher le retour arrière
      const preventBack = () => {
        window.history.pushState(null, '', window.location.href);
      };

      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', preventBack);

      return () => {
        window.removeEventListener('popstate', preventBack);
      };
    }
  }, [user]);


  // --- EFFECT : RÉCUPÉRATION FIRESTORE ---
  useEffect(() => {
    if (!db) return;

    const panelsRef = collection(db, "panneaux");
    const q = query(panelsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Panneau, "id">)
      }));

      setPanneauxData(data);
      setLoading(false);
    }, (error) => {
      console.error("Erreur Firestore :", error);
      setLoading(false);
    }
    );

    return () => unsubscribe();
  }, []);


  // Fonction pour supprimer complètement une réservation
  const handleDeleteReservation = async (res: any) => {
    if (!window.confirm(`Supprimer définitivement la réservation de ${res.societeLocatrice} ?`)) {
      return;
    }

    try {
      // 1. Récupérer le panneau
      const panneauRef = doc(db, "panneaux", res.panelDocId);
      const panneauSnap = await getDoc(panneauRef);

      if (!panneauSnap.exists()) {
        alert("Panneau introuvable");
        return;
      }

      const data = panneauSnap.data();
      const currentFaces = [...(data.faces || [])];
      const faceIndex = res.faceIndex;

      // 2. Vérifier que la face existe
      if (!currentFaces[faceIndex]) {
        alert("Face introuvable");
        return;
      }

      // 3. Récupérer les réservations de la face
      const faceReservations = currentFaces[faceIndex].reservations || [];

      // 4. Filtrer pour supprimer la réservation spécifique
      // Comparer par dateDebut, societeLocatrice et createdAt pour être précis
      const updatedReservations = faceReservations.filter((r: any) => {
        // Ne pas supprimer si c'est une autre réservation
        return !(
          r.dateDebut === res.dateDebut &&
          r.societeLocatrice === res.societeLocatrice &&
          r.createdAt === res.createdAt
        );
      });

      // 5. Mettre à jour la face avec le nouveau tableau de réservations
      currentFaces[faceIndex].reservations = updatedReservations;

      // 6. Si plus aucune réservation, remettre le statut à "Libre"
      if (updatedReservations.length === 0) {
        currentFaces[faceIndex].statut = "Libre";
      }

      // 7. Sauvegarder dans Firestore
      await updateDoc(panneauRef, {
        faces: currentFaces
      });

      // 8. Supprimer l'image Cloudinary si elle existe
      if (res.photoCampagneUrl && res.photoCampagneUrl.includes('cloudinary')) {
        try {
          await fetch('/api/delete-cloudinary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: res.photoCampagneUrl })
          });
        } catch (cloudinaryError) {
          console.error("Erreur suppression image Cloudinary:", cloudinaryError);
          // Ne pas bloquer la suppression de la réservation si l'image ne se supprime pas
        }
      }

      alert("✅ dsee  Réservation supprimée avec succès !");

      // 9. Mettre à jour l'état local (optionnel, Firestore le fera via onSnapshot)
      // Rafraîchir les données pour que la réservation disparaisse de la liste
      setSelectedForPrint(prev => {
        const newState = { ...prev };
        delete newState[res.resUniqueId];
        return newState;
      });

    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("❌ Erreur lors de la suppression de la réservation");
    }
  };


  // Fonction pour soumettre un rapport de rendez-vous
  const submitRdvReport = async () => {
    // Validation des champs obligatoires
    if (!rdvForm.clientNom.trim()) {
      alert("⚠️ Veuillez saisir le nom du client");
      return;
    }
    if (!rdvForm.dateVisite) {
      alert("⚠️ Veuillez sélectionner une date de visite");
      return;
    }
    if (!rdvForm.objet.trim()) {
      alert("⚠️ Veuillez décrire l'objet du rendez-vous");
      return;
    }

    setIsSubmittingRdv(true);

    try {
      const rdvData = {
        ...rdvForm,
        agentEmail: user?.email || "agent@dispromalt.cd",
        agentNom: user?.nomComplet || user?.nom || "Agent",
        createdAt: serverTimestamp(),
        dateModification: serverTimestamp(),
        userId: user?.uid || "anonymous",
        luParResponsable: false,
        commentaireResponsable: null
      };

      await addDoc(collection(db, "rapports_visite"), rdvData);

      // Réinitialiser le formulaire
      setRdvForm({
        clientNom: '',
        clientContact: '',
        dateVisite: new Date().toISOString().split('T')[0],
        heureVisite: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        objet: '',
        description: '',
        resultat: '',
        prochainRdv: '',
        statut: 'en_attente'
      });
      setShowRdvForm(false);

      alert("✅ Rapport de visite envoyé avec succès !");
    } catch (error) {
      console.error("Erreur lors de l'envoi du rapport:", error);
      alert("❌ Erreur lors de l'envoi du rapport");
    } finally {
      setIsSubmittingRdv(false);
    }
  };


  // Fonction pour valider un RDV (admin)
  const validerRdv = async (rdv: RdvData) => {
    if (!window.confirm(`Valider le rapport de ${rdv.clientNom} ?`)) return;

    try {
      const docRef = doc(db, "rapports_visite", rdv.id);
      await updateDoc(docRef, {
        statut: 'valide',
        luParResponsable: true,
        dateModification: serverTimestamp()
      });
      alert("✅ Rapport validé avec succès !");
    } catch (error) {
      console.error("Erreur:", error);
      alert("❌ Erreur lors de la validation");
    }
  };
  useEffect(() => {
    const loadUserData = async () => {
      console.log('🔍 Chargement des données utilisateur...');

      // 1. D'abord, essayer de récupérer depuis le localStorage
      const localData = localStorage.getItem('geomarketing_user_data');

      if (localData) {
        try {
          const parsedData = JSON.parse(localData);
          console.log('📥 Données utilisateur récupérées du localStorage:', parsedData);

          setUserData(parsedData);

          // Extraire les informations d'affichage
          const nom = parsedData.nom ||
            parsedData.nomComplet ||
            parsedData.displayName ||
            parsedData.email?.split('@')[0] ||
            'Agent';
          setDisplayName(nom);
          setUserEmail(parsedData.email || '');
          setUserInitial(nom.charAt(0).toUpperCase() || 'A');

          console.log('✅ Données utilisateur chargées depuis localStorage');
          return; // Sortir si les données locales sont trouvées
        } catch (error) {
          console.error('❌ Erreur lors du parsing des données locales:', error);
        }
      }

      // 2. Si pas de données locales, utiliser l'utilisateur du contexte
      if (user) {
        console.log('📥 Utilisation des données du contexte auth:', user);

        const nom = user.nomComplet ||
          user.nom ||
          user.displayName ||
          user.email?.split('@')[0] ||
          'Agent';

        setDisplayName(nom);
        setUserEmail(user.email || '');
        setUserInitial(nom.charAt(0).toUpperCase() || 'A');
        setUserData(user);

        // Sauvegarder dans localStorage pour la prochaine fois
        try {
          const userToSave = {
            ...user,
            nom: user.nom || user.nomComplet || user.displayName || 'Agent',
            nomComplet: user.nomComplet || user.nom || user.displayName || 'Agent',
            lastSync: new Date().toISOString()
          };
          localStorage.setItem('geomarketing_user_data', JSON.stringify(userToSave));
          console.log('💾 Données utilisateur sauvegardées dans localStorage');
        } catch (error) {
          console.error('❌ Erreur sauvegarde localStorage:', error);
        }
      } else {
        console.warn('⚠️ Aucune donnée utilisateur trouvée');
        // Rediriger vers login si pas d'utilisateur
        router.push('/auth/login');
      }
    };

    loadUserData();
  }, [user, router]);

  // Fonction pour rejeter un RDV (admin)
  const rejeterRdv = async (rdv: RdvData, commentaire: string) => {
    if (!commentaire.trim()) {
      alert("⚠️ Veuillez saisir un commentaire de rejet");
      return;
    }

    try {
      const docRef = doc(db, "rapports_visite", rdv.id);
      await updateDoc(docRef, {
        statut: 'rejete',
        luParResponsable: true,
        commentaireResponsable: commentaire,
        dateModification: serverTimestamp()
      });
      alert("✅ Rapport rejeté avec commentaire");
      setShowCommentModal(false);
      setCommentaireResponsable('');
    } catch (error) {
      console.error("Erreur:", error);
      alert("❌ Erreur lors du rejet");
    }
  };

  // Fonction pour modifier un RDV (agent)
  const modifierRdv = async (rdv: RdvData) => {
    // Vérifier si le responsable a déjà lu
    if (rdv.luParResponsable) {
      alert("⚠️ Ce rapport a déjà été lu par le responsable. Modification non autorisée.");
      return;
    }

    try {
      // Mettre à jour avec les nouvelles valeurs du formulaire
      const docRef = doc(db, "rapports_visite", rdv.id);
      await updateDoc(docRef, {
        clientNom: rdvForm.clientNom || rdv.clientNom,
        clientContact: rdvForm.clientContact || rdv.clientContact,
        dateVisite: rdvForm.dateVisite || rdv.dateVisite,
        heureVisite: rdvForm.heureVisite || rdv.heureVisite,
        objet: rdvForm.objet || rdv.objet,
        description: rdvForm.description || rdv.description,
        resultat: rdvForm.resultat || rdv.resultat,
        prochainRdv: rdvForm.prochainRdv || rdv.prochainRdv,
        dateModification: serverTimestamp()
      });

      setEditingRdvId(null);
      alert("✅ Rapport modifié avec succès !");
    } catch (error) {
      console.error("Erreur:", error);
      alert("❌ Erreur lors de la modification");
    }
  };

  // Fonction pour supprimer un RDV (admin)
  const supprimerRdv = async (rdv: RdvData) => {
    if (!window.confirm(`Supprimer définitivement le rapport de ${rdv.clientNom} ?`)) return;

    try {
      const docRef = doc(db, "rapports_visite", rdv.id);
      await deleteDoc(docRef);
      alert("✅ Rapport supprimé avec succès !");
    } catch (error) {
      console.error("Erreur:", error);
      alert("❌ Erreur lors de la suppression");
    }
  };

  // Fonction pour basculer l'expansion d'un RDV
  const toggleExpandRdv = (rdvId: string) => {
    setExpandedRdvId(expandedRdvId === rdvId ? null : rdvId);
  };

  // Fonction pour préparer l'édition d'un RDV
  const prepareEditRdv = (rdv: RdvData) => {
    if (rdv.luParResponsable) {
      alert("⚠️ Ce rapport a déjà été lu par le responsable. Modification non autorisée.");
      return;
    }

    setRdvForm({
      clientNom: rdv.clientNom || '',
      clientContact: rdv.clientContact || '',
      dateVisite: rdv.dateVisite || '',
      heureVisite: rdv.heureVisite || '',
      objet: rdv.objet || '',
      description: rdv.description || '',
      resultat: rdv.resultat || '',
      prochainRdv: rdv.prochainRdv || '',
      statut: rdv.statut || 'en_attente'
    });
    setEditingRdvId(rdv.id);
    setShowRdvForm(true);
  };



  // Charger l'historique des RDV
  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, "rapports_visite")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.docs.forEach(doc => {
        data.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Filtrer selon le rôle de l'utilisateur
      const isAdmin = user.email === ADMIN_RESPONSABLE;
      let filteredData = data;

      if (!isAdmin) {
        // Agent : ne voit que ses propres RDV
        filteredData = data.filter(rdv => rdv.agentEmail === user.email);
      }

      // Trier du plus récent au plus ancien
      const sortedData = filteredData.sort((a, b) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val === 'object' && val.toDate) return val.toDate().getTime();
          return new Date(val).getTime();
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
      });

      setRdvHistory(sortedData);
    }, (error) => {
      console.error("Erreur chargement RDV:", error);
    });

    return () => unsubscribe();
  }, [user?.email]);






  // ============================================
  // PROCESSUS DES OPÉRATIONS DU PANIER - CORRIGÉ
  // ============================================

  // ============================================
  // PROCESSUS DES OPÉRATIONS DU PANIER - CORRIGÉ
  // ============================================

  const processOperations = async (type: 'unique' | 'selection' | 'delete', data?: any, index?: number) => {
    // 1. CAS PARTICULIER : SUPPRESSION
    if (type === 'delete' && data) {
      await handleDeleteReservation(data);
      return;
    }

    // 2. RÉCUPÉRATION DE LA SÉLECTION
    const selection = type === 'unique'
      ? [data]
      : reservationsEnAttente.filter(r => selectedForPrint[r.resUniqueId]);

    if (selection.length === 0) {
      alert("⚠️ Action impossible : Aucune réservation n'est sélectionnée.");
      return;
    }

    // 3. VÉRIFICATION SOCIÉTÉ UNIQUE
    const premiereSociete = selection[0].societeLocatrice?.trim().toLowerCase();
    if (!premiereSociete) {
      alert("⚠️ Erreur : La société locatrice n'est pas renseignée.");
      return;
    }

    const erreursSociete = selection.filter(r =>
      r.societeLocatrice?.trim().toLowerCase() !== premiereSociete
    );

    if (erreursSociete.length > 0) {
      alert(`❌ Conflit : Vous ne pouvez pas mélanger plusieurs sociétés sur une facture.`);
      return;
    }

    // 4. VÉRIFICATION DES PRIX
    const erreursTechniques: string[] = [];
    let totalFacture = 0;

    selection.forEach(res => {
      const key = res.resUniqueId;
      if (!prices[key] || prices[key] <= 0) {
        erreursTechniques.push(`- ${res.faceLabel} : Prix manquant`);
      }
      totalFacture += (prices[key] || 0) * res.dureeMois;
    });

    if (erreursTechniques.length > 0) {
      alert(`❌ Données incomplètes :\n\n${erreursTechniques.join('\n')}`);
      return;
    }

    // 5. VÉRIFICATION DU MODE DE PAIEMENT GLOBAL
    if (globalPaymentMode === 'tranche' && globalTranchesCount < 2) {
      alert("❌ Pour un paiement en tranches, veuillez préciser le nombre de tranches (minimum 2).");
      return;
    }

    setTotalFactureAmount(totalFacture);

    // Afficher un résumé avant validation
    const modeTexte = globalPaymentMode === 'total' ? 'Paiement comptant' : `Paiement en ${globalTranchesCount} tranches`;
    const montantParTranche = globalPaymentMode === 'tranche' ? totalFacture / globalTranchesCount : totalFacture;

    const confirmation = confirm(
      `📊 RÉSUMÉ DE LA FACTURE\n\n` +
      `Société: ${premiereSociete}\n` +
      `Nombre de faces: ${selection.length}\n` +
      `Total HT: ${totalFacture.toLocaleString()} $\n` +
      `Mode: ${modeTexte}\n` +
      `${globalPaymentMode === 'tranche' ? `Montant par tranche: ${montantParTranche.toLocaleString()} $\n` : ''}` +
      `\nConfirmez-vous la facturation ?`
    );

    if (!confirmation) return;

    // ✅ APPEL À LA FONCTION DE FACTURATION
    lancerFacturation(selection, totalFacture);
  };

  // ============================================
  // LANCER LA FACTURATION - REDIRECTION VERS /generationpdf
  // ============================================
  const lancerFacturation = (donneesAEnvoyer: any[], totalFacture: number) => {
    if (!donneesAEnvoyer || donneesAEnvoyer.length === 0) {
      alert("⚠️ Erreur : Aucune donnée à facturer.");
      return;
    }

    // Appliquer le mode de paiement global à toutes les réservations
    const donneesCompletes = donneesAEnvoyer.map(res => ({
      ...res,
      prixSaisi: prices[res.resUniqueId] || 0,
      modePaiement: globalPaymentMode,
      nombreTranches: globalPaymentMode === 'tranche' ? globalTranchesCount : 1,
      montantParTranche: globalPaymentMode === 'tranche' ? totalFacture / globalTranchesCount : 0,
      totalFacture: totalFacture,
      idFace: res.faceLabel || res.faceId || 'N/A',
      adresse: res.panneauAdresse || res.adresse || '',
      dateDebut: res.dateDebut || '',
      dateFin: res.dateFin || '',
      type: res.type || res.panneauType || 'N/A',
      societeLocatrice: res.societeLocatrice,
      agentNom: res.agentNom || user?.nomComplet || 'Agent',
      agentEmail: res.agentEmail || user?.email || '',
      factureIdFormat: res.factureIdFormat || 'N/A'
    }));

    // ✅ Stocker dans localStorage pour la page de génération PDF
    localStorage.setItem('facture_preview_data', JSON.stringify(donneesCompletes));

    // ✅ Rediriger vers la page de génération PDF
    router.push('/generationpdf');
  };


  // Dans UltimateSupervisor, la fonction reservationsEnAttente
  const reservationsEnAttente = useMemo(() => {
    let compteurLocal = Number(dernierIdFacture) || 0;

    if (!panneauxData || !user?.email) return [];

    const list: any[] = [];
    const emailConnecte = user.email.trim().toLowerCase();
    const annee = new Date().getFullYear();
    const maintenant = new Date();
    const mois = String(maintenant.getMonth() + 1).padStart(2, '0');

    panneauxData.forEach((panneau: any) => {
      const faces = panneau.faces || [];

      faces.forEach((face: any, faceIdx: number) => {
        const reservations = face.reservations || [];

        reservations.forEach((res: any, resIdx: number) => {
          compteurLocal++;
          const sequence = String(compteurLocal).padStart(3, '0');
          // ✅ FORMAT: ANNEE.MOIS.SEQUENCE (par exemple: 2026.07.001)
          const factureIdFormat = `${annee}.${mois}.${sequence}`;

          const emailReservation = (res.agentEmail || "").trim().toLowerCase();
          const appartientALutilisateur = emailReservation === emailConnecte;

          const estPretPourFacture =
            (res.facturee === "non" || !res.facturee) &&
            (res.statutPaiement === "en attente" || !res.statutPaiement) &&
            res.validationComptable !== true;

          if (appartientALutilisateur && estPretPourFacture) {
            const debut = new Date(res.dateDebut);
            const fin = new Date(res.dateFin);
            const duree = Math.max(1, (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()));

            const faceLabel = `${panneau.idPan}-${faceIdx + 1} (${face.sens || 'SANS SENS'})`;
            const resUniqueId = `res-${panneau.id}-${faceIdx}-${resIdx}-${res.dateDebut}`;

            list.push({
              ...res,
              resUniqueId,
              faceLabel,
              factureIdFormat, // ✅ INCLUS POUR LA FACTURE
              idPan: panneau.idPan,
              panelDocId: panneau.id,
              faceIndex: faceIdx,
              faceSens: face.sens,
              adresse: panneau.adresse,
              panneauAdresse: panneau.adresse,
              panneauType: panneau.type,
              dureeMois: duree,
              dateDebut: res.dateDebut,
              dateFin: res.dateFin,
              type: panneau.type || "",
              dateTri: res.createdAt ? new Date(res.createdAt).getTime() : 0
            });
          }
        });
      });
    });

    return list.sort((a, b) => b.dateTri - a.dateTri);
  }, [panneauxData, user?.email, dernierIdFacture]);




  // --- HOOKS D'ANIMATION ---
  const { scrollYProgress, scrollY } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(latest > previous && latest > 150);
  });

  // --- ACTIONS ---

  // Ajoutez ce useEffect après vos states
  useEffect(() => {
    const selectedReservations = reservationsEnAttente.filter(r => selectedForPrint[r.resUniqueId]);
    let total = 0;
    selectedReservations.forEach(res => {
      const key = res.resUniqueId;
      total += (prices[key] || 0) * res.dureeMois;
    });
    setTotalFactureAmount(total);
  }, [selectedForPrint, prices, reservationsEnAttente]);


  // Dans UltimateSupervisor, remplacez la fonction existante par :
  const ouvrirLaCarte = () => {
    // S'assurer que user a la bonne structure
    const userData = {
      uid: user?.uid,
      email: user?.email,
      nom: user?.nomComplet || user?.nom || user?.displayName || "Agent",
      nomComplet: user?.nomComplet || user?.nom || user?.displayName || "Agent",
      role: user?.role || "commercial"
    };

    localStorage.setItem('current_user', JSON.stringify(userData));
    router.push('/dashboard/superviseurs/carte');
  };





  useEffect(() => {
    // Exposer les outils de debug dans la console
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.__debug = {
        getUserData: () => {
          const data = localStorage.getItem('geomarketing_user_data');
          if (data) {
            const parsed = JSON.parse(data);
            console.log('👤 Données utilisateur:', parsed);
            return parsed;
          }
          console.log('❌ Aucune donnée dans localStorage');
          return null;
        },
        getUser: () => {
          console.log('👤 Utilisateur actuel:', user);
          return user;
        },
        refreshUser: () => {
          // Forcer le rechargement des données
          const data = localStorage.getItem('geomarketing_user_data');
          if (data) {
            const parsed = JSON.parse(data);
            setUserData(parsed);
            const nom = parsed.nom || parsed.nomComplet || 'Agent';
            setDisplayName(nom);
            setUserEmail(parsed.email || '');
            setUserInitial(nom.charAt(0).toUpperCase());
            console.log('✅ Données rafraîchies');
          }
        }
      };
      console.log('🛠️ Debug disponible - Tapez window.__debug.getUserData()');
    }
  }, [user]);

  // Ajoutez ce useEffect dans votre composant, juste après la déclaration des states
  useEffect(() => {
    // Fonction pour empêcher le retour en arrière
    const preventBack = () => {
      window.history.pushState(null, "", window.location.href);
    };

    // Bloquer le retour en arrière
    window.history.pushState(null, "", window.location.href);
    window.addEventListener('popstate', preventBack);

    return () => {
      window.removeEventListener('popstate', preventBack);
    };
  }, []);






  const [statsTab, setStatsTab] = useState<'perf' | 'gestion'>('perf');
  const [monthRange, setMonthRange] = useState(1);
  // Gestion de l'onglet actif (Performance ou Gestion)
  const [activeTab, setActiveTab] = useState<'stats' | 'reservations' | 'rdv'>('stats');
  // Dans votre composant
  const [isFloatingMenuOpen, setIsFloatingMenuOpen] = useState(false);

  // Filtres pour la partie Gestion
  const [timeFilter, setTimeFilter] = useState<'avant' | 'present' | 'futur'>('present');
  const [monthCount, setMonthCount] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'tous' | 'en_cours' | 'en_attente' | 'expire'>('tous');

  // Ajouter ces états après les autres états
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [panneauForReservation, setPanneauForReservation] = useState<any>(null);
  const [faceForReservation, setFaceForReservation] = useState<any>(null);

  // Ajouter cette fonction
  const handleReservation = (panneau: any, face: any) => {
    setPanneauForReservation(panneau);
    setFaceForReservation(face);
    setIsReservationModalOpen(true);
  };


  // 2. Calculer l'efficacité
  const statsEfficacite = () => {
    const totalAgent = reservationsEnAttente.length;

    const totalGlobal = (panneauxData || []).reduce((acc: number, p: any) => {
      const currentFaces = p.faces || [];
      const countReservations = currentFaces.reduce((a: number, f: any) => {
        // On ne compte que les réservations actives (non supprimées)
        return a + (f.reservations ? f.reservations.length : 0);
      }, 0);
      return acc + countReservations;
    }, 0);

    // Éviter la division par zéro et NaN
    const rawPerformance = totalGlobal > 0 ? (totalAgent / totalGlobal) * 100 : 0;

    return {
      totalAgent,
      totalGlobal,
      performance: rawPerformance.toFixed(1)
    };
  };


  const getFilteredReservations = () => {
    const allRes: any[] = [];

    panneauxData?.forEach((panneau: any) => {
      // On récupère l'identifiant du panneau (ex: "B")
      const idPan = panneau.idPan || "N/A";

      panneau.faces?.forEach((face: any, index: number) => {
        if (Array.isArray(face.reservations)) {
          face.reservations.forEach((res: any) => {

            const isMine = res.agentEmail === user?.email;
            const isFacturee = res.facturee === "oui" || res.facturee === true;
            const isValide = res.validationComptable === "oui" || res.validationComptable === true;

            if (isMine && isFacturee && isValide) {
              allRes.push({
                ...res,
                // Construction dynamique : idPan + "-" + index (ex: B-0, B-1...)
                // Si vous voulez commencer à 1 au lieu de 0, utilisez (index + 1)
                faceId: `${idPan}-${index}`,
                societe: res.societeLocatrice
              });
            }
          });
        }
      });
    });

    return allRes.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  };

  const [filtersOpen, setFiltersOpen] = useState(false);

  const handlePhotoUpdate = async (e: React.ChangeEvent<HTMLInputElement>, resId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {

      console.log("Photo mise à jour pour :", resId);
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error);
    }
  };



  const filtered = panneauxData.filter(p => {
    // 1. RECHERCHE UNIQUEMENT PAR IDPAN
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || p.idPan?.toLowerCase().includes(term);

    // 2. LOGIQUE DE STATUT DYNAMIQUE (DATE DU JOUR)
    const now = new Date();
    now.setHours(0, 0, 0, 0); // On se base sur le jour J à minuit

    // On vérifie le statut réel pour le filtre "matchesStatut"
    const hasActiveReservation = p.faces?.some((f: any) =>
      f.reservations?.some((r: any) => {
        const debut = new Date(r.dateDebut);
        const fin = new Date(r.dateFin);
        // Une réservation est active si aujourd'hui est entre début et fin
        return now >= debut && now <= fin;
      })
    );

    // Détermination du statut textuel pour la comparaison
    const currentRealStatut = hasActiveReservation ? "occupé" : "libre";

    const filterStatut = filters.statut?.toLowerCase();
    const matchesStatut = !filters.statut || filterStatut === "tous" || currentRealStatut === filterStatut;

    // 3. AUTRES FILTRES (Type, Commune, etc.)
    const matchesType = !filters.type || p.type === filters.type;
    const adr = p.adresse?.toUpperCase() || "";
    const matchesCommune = !filters.commune || adr.includes(filters.commune.toUpperCase());

    return matchesSearch && matchesStatut && matchesType && matchesCommune;
  });



  // Pagination - Calcul des indices
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);


  const totalFaces = filtered.reduce((acc, p) => acc + (p.faces?.length || 0), 0);

  // 2. HOOKS (Framer Motion & Scroll)

  // On crée d'abord scrollYProgress grâce à useScroll()

  // Maintenant qu'elle existe, on peut l'utiliser pour yBg et scaleX !
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  // Dans UltimateSupervisor, ajoute cette fonction (si elle n'existe pas)
  const handleEditPanneau = (panneau: any) => {
    console.log("Édition du panneau:", panneau);
    // Ta logique d'édition ici
    setPanneauToEdit(panneau);
  };

  const stats = {
    total: 0,
    libres: 0,
    occupees: 0,
    reservees: 0,
    maintenance: 0
  };
  // Accès :
  stats.libres
  stats.occupees
  stats.reservees
  stats.maintenance


  // --- RENDU : LOADING PREMIUM ---
  // --- RENDU : LOADING PREMIUM ---
  if (loading) {
    return (
      <div className="h-screen relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-amber-50 via-amber-100/30 to-stone-50">
        {/* Texture extrêmement légère pour casser l'uniformité sans agresser */}
        <img
          src="/fond.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.03] mix-blend-soft-light pointer-events-none"
        />

        {/* Halo doré très discret */}
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.06, 0.12, 0.06]
          }}
          transition={{
            repeat: Infinity,
            duration: 2.5,
            ease: "easeInOut"
          }}
          className="absolute w-[350px] h-[350px] bg-amber-400/20 rounded-full blur-[100px]"
        />

        {/* Logo responsive */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 3, -3, 0]
          }}
          transition={{
            repeat: Infinity,
            duration: 2.5,
            ease: "easeInOut"
          }}
          className="relative z-10"
        >
          <img
            src="/icon-192x192.png"
            alt="Loading GDP"
            className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 object-contain"
          />
        </motion.div>

        {/* Texte de chargement, plus doux */}
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="relative z-10 mt-6 text-[9px] font-black uppercase tracking-[0.5em] text-amber-700/60"
        >
          Connexion au système...
        </motion.p>
      </div>
    );
  }
  loading && (
    <div className="flex justify-center py-12">
      <Loader2 className="animate-spin text-amber-500" size={32} />
    </div>
  )

  return (
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

      {/* NAVIGATION FIXE - Couleur uniforme */}
      <nav className="fixed top-0 inset-x-0 z-[150] px-2 sm:px-3 md:px-4 lg:px-6 py-1 xs:py-1.5 sm:py-2 md:py-2.5 backdrop-blur-3xl transition-all duration-500 bg-[#0d47a1] shadow-2xl border-b border-white/10">
        <div className="w-full max-w-[2000px] mx-auto">
          <div
            className="
        relative group overflow-visible
        flex items-center justify-between 
        w-full
        min-h-[40px] xs:min-h-[44px] sm:min-h-[48px] md:min-h-[52px] lg:min-h-[56px]
        px-2 xs:px-3 sm:px-4 md:px-5 lg:px-6
        rounded-lg xs:rounded-xl sm:rounded-2xl
        transition-all duration-500
        bg-[#0d47a1]
        border border-white/10 shadow-xl shadow-blue-500/20
        hover:border-white/20
        hover:shadow-2xl hover:shadow-blue-500/30
      "
          >
            {/* Effets visuels */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="absolute bottom-0 left-4 right-4 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-center" />

            {/* ============================================================ */}
            {/* ========== PARTIE GAUCHE - LOGO ========== */}
            {/* ============================================================ */}

            <div
              onClick={() => window.location.reload()}
              className="flex flex-col items-center gap-0 cursor-pointer group/logo flex-shrink-0"
            >
              <div className="relative w-12 h-8 xs:w-14 xs:h-9 sm:w-16 sm:h-10 md:w-20 md:h-13 lg:w-24 lg:h-16 flex-shrink-0 overflow-visible">
                <img
                  src="/Dispromalt_logo.png"
                  className="relative w-full h-full object-contain group-hover/logo:scale-105 transition-all duration-300 drop-shadow-md group-hover/logo:drop-shadow-amber-400/30 
      scale-150 xs:scale-160 sm:scale-170 md:scale-180 lg:scale-200 origin-center"
                  alt="Dispromalt Logo"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>

              {/* Texte sous le logo */}
              <span className="text-[5px] xs:text-[6px] sm:text-[7px] md:text-[8px] lg:text-[9px] font-bold uppercase tracking-[0.12em] text-amber-300/90 whitespace-nowrap drop-shadow-sm text-center leading-none">
                Gestion Digitale des panneaux
              </span>
            </div>

            {/* ============================================================ */}
            {/* ========== PARTIE CENTRALE - BOUTONS DE NAVIGATION + STATS ========== */}
            {/* ============================================================ */}
            <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2 lg:gap-2.5 flex-1 justify-center px-1 xs:px-2 sm:px-3 overflow-x-auto scrollbar-hide">

              {/* --- BOUTON ACCUEIL --- */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = '/dashboard/superviseurs/rapport'}
                className="group flex items-center justify-center p-1.5 xs:p-2 sm:px-2.5 sm:py-2 rounded-lg xs:rounded-xl transition-all duration-300 bg-white/5 hover:bg-white/15 text-white shadow-sm hover:shadow-md hover:shadow-white/10 border border-white/5 hover:border-white/20 active:bg-white/20 min-w-[32px] xs:min-w-[36px] sm:min-w-[40px] whitespace-nowrap"
                aria-label="Accueil"
              >
                <Home size={14} className="xs:w-[15px] xs:h-[15px] sm:w-[16px] sm:h-[16px] text-white/70 group-hover:text-white transition-all" />
                <span className="hidden sm:inline ml-1 text-[9px] xs:text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-white/70 group-hover:text-white transition-colors">
                  Accueil
                </span>
              </motion.button>

              {/* --- BOUTON CATALOGUE --- */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = '/dashboard/superviseurs'}
                className="group flex items-center justify-center p-1.5 xs:p-2 sm:px-2.5 sm:py-2 rounded-lg xs:rounded-xl transition-all duration-300 bg-white/5 hover:bg-white/15 text-white shadow-sm hover:shadow-md hover:shadow-white/10 border border-white/5 hover:border-white/20 active:bg-white/20 min-w-[32px] xs:min-w-[36px] sm:min-w-[40px] whitespace-nowrap"
                aria-label="Catalogue"
              >
                <BookOpen size={14} className="xs:w-[15px] xs:h-[15px] sm:w-[16px] sm:h-[16px] text-white/70 group-hover:text-white transition-all group-hover:rotate-[-10deg]" />
                <span className="hidden sm:inline ml-1 text-[9px] xs:text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-white/70 group-hover:text-white transition-colors">
                  Catalogue
                </span>
              </motion.button>

              {/* --- BOUTON CARTE --- */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={ouvrirLaCarte}
                className="group flex items-center justify-center p-1.5 xs:p-2 sm:px-2.5 sm:py-2 rounded-lg xs:rounded-xl transition-all duration-300 bg-white/5 hover:bg-white/15 text-white shadow-sm hover:shadow-md hover:shadow-white/10 border border-white/5 hover:border-white/20 active:bg-white/20 min-w-[32px] xs:min-w-[36px] sm:min-w-[40px] whitespace-nowrap"
                aria-label="Carte"
              >
                <MapPin size={14} className="xs:w-[15px] xs:h-[15px] sm:w-[16px] sm:h-[16px] text-white/70 group-hover:text-white transition-all group-hover:rotate-6" />
                <span className="hidden sm:inline ml-1 text-[9px] xs:text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-white/70 group-hover:text-white transition-colors">
                  Carte
                </span>
              </motion.button>

              {/* --- SÉPARATEUR --- */}
              <div className="hidden sm:block w-px h-6 md:h-7 bg-white/10 mx-0.5 xs:mx-1" />

              {/* ============================================================ */}
              {/* STATISTIQUES - VERSION ULTRA RESPONSIVE */}
              {/* ============================================================ */}
              <div className="flex items-center gap-1 xs:gap-2 sm:gap-3 md:gap-4 min-w-0">

                {/* === UNITÉS FILTRÉES === */}
                <div className="flex items-center gap-0.5 xs:gap-1 bg-white/5 px-1.5 xs:px-2 sm:px-2.5 md:px-3 py-0.5 xs:py-1 rounded-lg border border-white/10 hover:border-amber-400/30 transition-all duration-300">
                  <span className="text-[9px] xs:text-[10px] sm:text-[11px] md:text-[12px] font-black text-amber-400">
                    {filtered.length}
                  </span>
                  <span className="hidden 2xs:inline text-[6px] xs:text-[7px] sm:text-[8px] text-white/50 font-bold uppercase tracking-wider">
                    Unités
                  </span>
                  <span className="2xs:hidden text-[6px] text-white/50 font-bold">U</span>
                  <span className="hidden sm:inline text-[6px] xs:text-[7px] text-white/30 font-bold uppercase tracking-wider ml-0.5">
                    Filtrées
                  </span>
                </div>

                {/* === SÉPARATEUR === */}
                <span className="text-white/20 text-[10px] xs:text-[12px] hidden xs:inline">|</span>

                {/* === FACES FILTRÉES === */}
                <div className="flex items-center gap-0.5 xs:gap-1 bg-white/5 px-1.5 xs:px-2 sm:px-2.5 md:px-3 py-0.5 xs:py-1 rounded-lg border border-white/10 hover:border-blue-400/30 transition-all duration-300">
                  <span className="text-[9px] xs:text-[10px] sm:text-[11px] md:text-[12px] font-black text-blue-400">
                    {totalFaces}
                  </span>
                  <span className="hidden 2xs:inline text-[6px] xs:text-[7px] sm:text-[8px] text-white/50 font-bold uppercase tracking-wider">
                    Faces
                  </span>
                  <span className="2xs:hidden text-[6px] text-white/50 font-bold">F</span>
                  <span className="hidden sm:inline text-[6px] xs:text-[7px] text-white/30 font-bold uppercase tracking-wider ml-0.5">
                    Filtrées
                  </span>
                </div>

                {/* === SÉPARATEUR - Caché sur mobile === */}
                <span className="hidden lg:inline text-white/20 text-[10px] xs:text-[12px]">|</span>

                {/* === DÉTAIL DES STATUTS - Caché sur petit écran === */}

              </div>
              {/* ===== FIN STATISTIQUES ===== */}

            </div>



            <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0 pl-1 xs:pl-2 border-l border-white/10">

              {/* === BLOC PROFIL UTILISATEUR + QUITTER - UNIFIÉ === */}
              <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2 px-1 xs:px-1.5 sm:px-2 md:px-2.5 py-0.5 xs:py-1 sm:py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/5 hover:border-white/15">

                {/* --- AVATAR --- */}
                <div className="relative w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white/20">
                  {logo ? (
                    <img src={logo} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs font-bold text-white">
                      {userInitial}
                    </span>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 xs:w-2 xs:h-2 bg-emerald-500 rounded-full border border-white/50 animate-pulse" />
                </div>

                {/* --- INFOS UTILISATEUR --- */}
                <div className="hidden xs:block min-w-0">
                  <p className="text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs font-bold text-white truncate max-w-[50px] xs:max-w-[70px] sm:max-w-[90px] md:max-w-[110px]">
                    {displayName}
                  </p>
                  <p className="text-[6px] xs:text-[7px] sm:text-[8px] text-blue-200/80 truncate max-w-[50px] xs:max-w-[70px] sm:max-w-[90px] md:max-w-[110px]">
                    {userEmail}
                  </p>
                </div>

                {/* --- SÉPARATEUR --- */}
                <div className="w-px h-4 xs:h-5 sm:h-6 bg-white/10 hidden xs:block" />

                {/* --- BOUTON QUITTER --- */}
                <button
                  onClick={() => {
                    if (confirm("🔐 Voulez-vous vraiment vous déconnecter ?")) {
                      if (logout) logout();
                      localStorage.clear();
                      sessionStorage.clear();
                      window.history.pushState(null, "", window.location.href);
                      window.onpopstate = function () {
                        window.history.pushState(null, "", window.location.href);
                      };
                      window.location.replace('/');
                    }
                  }}
                  className="flex items-center gap-0.5 xs:gap-1 px-1 xs:px-1.5 sm:px-2 py-0.5 xs:py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 transition-all duration-300 border border-red-500/20 hover:border-red-500/40 hover:scale-105 active:scale-95 group"
                  aria-label="Déconnexion"
                >
                  <LogOut size={12} className="xs:w-[13px] xs:h-[13px] sm:w-[14px] sm:h-[14px] text-red-400 group-hover:rotate-12 transition-transform" />
                  <span className="hidden xs:inline text-[7px] xs:text-[8px] sm:text-[9px] font-bold text-white/80 group-hover:text-white transition-colors">
                    Quitter
                  </span>
                </button>

              </div>
            </div>
          </div>
        </div>
      </nav>



      {/* MAIN CONTENT */}
      <main className="relative z-20 max-w-[1800px] mx-auto px-6 pt-44 pb-40">
        <header className="mb-20 relative">


          {/* Bouton d'ouverture des filtres */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="fixed bottom-6 left-6 z-[100] flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 shadow-2xl shadow-blue-500/40 text-white hover:shadow-blue-500/60 transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-white/20"
            aria-label="Filtres"
          >
            <Filter size={18} className="xs:w-[20px] xs:h-[20px]" />
            <span className="text-[10px] xs:text-[11px] sm:text-[12px] font-bold uppercase">Filtres</span>
            {filters.statut || filters.pays || filters.province || filters.commune || filters.type ? (
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            ) : null}
          </motion.button>

          <AnimatePresence>
            {filtersOpen && (
              <>
                {/* Overlay pour fermer en cliquant ailleurs */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[99] bg-black/30 backdrop-blur-sm"
                  onClick={() => setFiltersOpen(false)}
                />

                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed bottom-20 left-4 z-[100] w-full max-w-[340px] xs:max-w-[380px] sm:max-w-[420px]"
                >
                  <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-blue-200/50 overflow-hidden">

                    {/* En-tête */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <Filter size={16} />
                        Filtres avancés
                      </h3>
                      <button
                        onClick={() => setFiltersOpen(false)}
                        className="p-1 rounded-lg hover:bg-white/20 transition text-white"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Contenu des filtres */}
                    <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">

                      {/* Barre de Recherche */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
                        <input
                          type="text"
                          placeholder="Rechercher..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-blue-50/50 border border-blue-200 rounded-xl py-2 pl-9 pr-3 text-[11px] font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all placeholder:text-gray-400"
                        />
                      </div>

                      {/* Grille des sélecteurs */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* PAYS */}
                        <div>
                          <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Pays</label>
                          <select
                            value={filters.pays}
                            onChange={(e) => setFilters({ ...filters, pays: e.target.value, province: '', district: '', commune: '' })}
                            className="w-full mt-0.5 bg-blue-50/50 border border-blue-200 rounded-lg p-1.5 text-[10px] font-medium text-gray-700 outline-none focus:border-blue-500"
                          >
                            <option value="">Tous</option>
                            {Object.keys(GEOGRAPHIE).map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>

                        {/* PROVINCE */}
                        <div>
                          <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Province</label>
                          <select
                            disabled={!filters.pays}
                            value={filters.province}
                            onChange={(e) => setFilters({ ...filters, province: e.target.value, district: '', commune: '' })}
                            className="w-full mt-0.5 bg-blue-50/50 border border-blue-200 rounded-lg p-1.5 text-[10px] font-medium text-gray-700 outline-none focus:border-blue-500 disabled:opacity-40"
                          >
                            <option value="">Toutes</option>
                            {filters.pays && Object.keys(GEOGRAPHIE[filters.pays]).map(pr => (
                              <option key={pr} value={pr}>{pr}</option>
                            ))}
                          </select>
                        </div>

                        {/* DISTRICT */}
                        <div>
                          <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">District</label>
                          <select
                            disabled={!filters.province}
                            value={filters.district}
                            onChange={(e) => setFilters({ ...filters, district: e.target.value, commune: '' })}
                            className="w-full mt-0.5 bg-blue-50/50 border border-blue-200 rounded-lg p-1.5 text-[10px] font-medium text-gray-700 outline-none focus:border-blue-500 disabled:opacity-40"
                          >
                            <option value="">Tous</option>
                            {filters.pays && filters.province && GEOGRAPHIE[filters.pays][filters.province] &&
                              Object.keys(GEOGRAPHIE[filters.pays][filters.province]).map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                          </select>
                        </div>

                        {/* COMMUNE */}
                        <div>
                          <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Commune</label>
                          <select
                            disabled={!filters.district}
                            value={filters.commune}
                            onChange={(e) => setFilters({ ...filters, commune: e.target.value })}
                            className="w-full mt-0.5 bg-blue-50/50 border border-blue-200 rounded-lg p-1.5 text-[10px] font-medium text-gray-700 outline-none focus:border-blue-500 disabled:opacity-40"
                          >
                            <option value="">Toutes</option>
                            {filters.pays && filters.province && filters.district &&
                              GEOGRAPHIE[filters.pays]?.[filters.province]?.[filters.district]?.map((c: string) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                          </select>
                        </div>
                      </div>

                      {/* TYPE DE PANNEAU */}
                      <div>
                        <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Type de panneau</label>
                        <select
                          value={filters.type}
                          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                          className="w-full mt-0.5 bg-blue-50/50 border border-blue-200 rounded-lg p-1.5 text-[10px] font-medium text-gray-700 outline-none focus:border-blue-500"
                        >
                          <option value="">Tous</option>
                          {Array.from(new Set(panneauxData.map(p => p.type))).filter(Boolean).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* STATUT */}
                      <div>
                        <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Statut</label>
                        <div className="grid grid-cols-4 gap-1 mt-1">
                          {['Libre', 'Occupé', 'Maintenance', 'Réservé'].map(s => {
                            const colorClass = s === 'Libre' ? 'bg-emerald-500' :
                              s === 'Occupé' ? 'bg-blue-500' :
                                s === 'Maintenance' ? 'bg-red-500' :
                                  'bg-amber-500';
                            const isActive = filters.statut === s;

                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setFilters({ ...filters, statut: isActive ? '' : s })}
                                className={`py-1.5 rounded-lg text-[8px] font-bold uppercase transition-all ${isActive
                                  ? `${colorClass} text-white shadow-md shadow-${s === 'Libre' ? 'emerald' : s === 'Occupé' ? 'blue' : s === 'Maintenance' ? 'red' : 'amber'}-500/30`
                                  : 'bg-blue-50/50 text-gray-500 hover:bg-blue-100'
                                  }`}
                              >
                                {s === 'Maintenance' ? 'Maint.' : s}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Boutons d'action */}
                      <div className="flex gap-2 pt-2 border-t border-blue-100">
                        <button
                          onClick={() => {
                            setFilters({ pays: '', province: '', district: '', commune: '', type: '', statut: '' });
                            setSearchTerm('');
                            setFiltersOpen(false);
                          }}
                          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-bold text-gray-600 uppercase transition"
                        >
                          Réinitialiser
                        </button>
                        <button
                          onClick={() => setFiltersOpen(false)}
                          className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-lg text-[10px] font-bold text-white uppercase transition shadow-md shadow-blue-500/20"
                        >
                          Appliquer
                        </button>
                      </div>

                      {/* Nombre de résultats */}
                      <div className="text-center text-[8px] text-gray-400 pt-1 border-t border-blue-100">
                        {panneauxData.length} panneaux disponibles
                      </div>

                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ============================================================ */}
          {/* ========== BOUTON FLOTTANT PRINCIPAL (En bas à droite) ========== */}
          {/* ============================================================ */}

          {/* Bouton flottant principal */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsFloatingMenuOpen(!isFloatingMenuOpen)}
            className="fixed bottom-6 right-6 z-[100] flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 shadow-2xl shadow-blue-500/40 text-white hover:shadow-blue-500/60 transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-white/20 group"
            aria-label="Menu actions"
          >
            <motion.div
              animate={{ rotate: isFloatingMenuOpen ? 45 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <Plus size={24} className="sm:w-[28px] sm:h-[28px] group-hover:rotate-90 transition-transform duration-300" />
            </motion.div>

            {/* Indicateur de notification */}
            {reservationsEnAttente.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center border-2 border-white animate-pulse">
                {reservationsEnAttente.length}
              </span>
            )}
          </motion.button>

          {/* ========== OVERLAY POUR FERMER LE MENU PRINCIPAL ========== */}
          <AnimatePresence>
            {isFloatingMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[99] bg-black/30 backdrop-blur-sm"
                onClick={() => setIsFloatingMenuOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* ========== MENU FLOTTANT AVEC DEUX OPTIONS ========== */}
          <AnimatePresence>
            {isFloatingMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-28 right-6 z-[100] flex flex-col gap-3"
              >

                {/* Option 1 : Proformas */}
                <motion.button
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsCartOpen(true);
                    setIsFloatingMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-200/50 hover:border-amber-400/70 transition-all duration-300 group min-w-[180px] sm:min-w-[200px]"
                >
                  <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-200/30 group-hover:scale-110 transition-transform">
                    <FilePieChart size={18} className="text-amber-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[11px] sm:text-[12px] font-bold text-gray-800 group-hover:text-amber-600 transition-colors">
                      Proformas
                    </p>
                    <p className="text-[8px] sm:text-[9px] text-gray-400 font-medium">
                      {reservationsEnAttente.length} réservation(s) en attente
                    </p>
                  </div>
                  {reservationsEnAttente.length > 0 && (
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  )}
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-amber-500 transition-colors" />
                </motion.button>

                {/* Option 2 : Ma Performance */}
                <motion.button
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsStatsOpen(true);
                    setIsFloatingMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-blue-200/50 hover:border-blue-400/70 transition-all duration-300 group min-w-[180px] sm:min-w-[200px]"
                >
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-200/30 group-hover:scale-110 transition-transform">
                    <LayoutDashboard size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[11px] sm:text-[12px] font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                      Ma Performance
                    </p>
                    <p className="text-[8px] sm:text-[9px] text-gray-400 font-medium">
                      Voir mes statistiques
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                </motion.button>

              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isCartOpen && (
              <>
                {/* OVERLAY TRÈS TRANSPARENT */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsCartOpen(false)}
                  className="fixed inset-0 z-[100]"
                >
                  {/* Fond très transparent avec effet de flou */}
                  <div className="absolute inset-0 bg-black/5 backdrop-blur-[2px]">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-300/5 rounded-full blur-3xl" />
                  </div>
                </motion.div>

                {/* PANEL LATÉRAL PREMIUM - TRANSPARENT */}
                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white/90 backdrop-blur-xl border-l border-white/20 z-[101] shadow-2xl shadow-black/5 flex flex-col"
                >
                  {/* HEADER PREMIUM - TRANSPARENT */}
                  <div className="relative p-4 sm:p-5 border-b border-white/10 bg-white/40 backdrop-blur-sm flex-shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl" />

                    <div className="flex justify-between items-center relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full" />
                          <p className="text-[8px] font-black text-blue-600 uppercase tracking-[0.3em]">Facturation</p>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-800">
                          Mes <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">Réservations</span>
                        </h2>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mt-1">
                          {reservationsEnAttente.length} réservation(s) en attente
                        </p>
                      </div>
                      <button
                        onClick={() => setIsCartOpen(false)}
                        className="group p-2 bg-white/50 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 text-gray-600 backdrop-blur-sm border border-white/20"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:rotate-90 transition-transform duration-300">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* CONTENU SCROLLABLE - ESPACE OPTIMISÉ */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-transparent">
                    <div className="grid grid-cols-1 gap-3">
                      {reservationsEnAttente.length === 0 ? (
                        /* ÉTAT VIDE */
                        <div className="flex flex-col items-center justify-center h-full py-8">
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mb-3 border border-white/20">
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                            </div>
                            <p className="text-gray-700 text-base font-bold uppercase tracking-wider">Panier vide</p>
                            <p className="text-gray-400/60 text-[10px] mt-2 max-w-[200px] mx-auto">
                              Vous n'avez aucune réservation en attente de facturation
                            </p>
                          </div>

                          {/* BOUTON FERMETURE EN BAS */}
                          <div className="absolute bottom-6 left-6 right-6">
                            <button
                              onClick={() => setIsCartOpen(false)}
                              className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                              Fermer
                            </button>
                          </div>
                        </div>
                      ) : (
                        reservationsEnAttente.map((res: any, index: number) => {
                          const key = res.resUniqueId;
                          const unitPrice = prices[key] || 0;
                          const isSelected = selectedForPrint[key] || false;
                          const numeroOrdre = index + 1;
                          const uniqueKey = key || `temp-${index}`;

                          return (
                            <motion.div
                              key={uniqueKey}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={`group relative p-3 rounded-xl border transition-all duration-300 backdrop-blur-sm ${isSelected
                                ? 'bg-blue-50/60 border-blue-400/60 shadow-lg shadow-blue-200/30'
                                : 'bg-white/40 border-white/30 hover:border-blue-400/40 hover:shadow-md hover:shadow-blue-100/20'
                                }`}
                            >
                              {/* HEADER CARTE - COMPACT */}
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-600 animate-pulse' : 'bg-gray-400'}`} />
                                  <span className="text-[7px] font-black text-blue-600 uppercase tracking-wider">
                                    Réservation # {numeroOrdre}
                                  </span>
                                </div>
                                <button
                                  onClick={() => setSelectedForPrint(prev => ({ ...prev, [key]: !prev[key] }))}
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${isSelected
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'border-gray-300 hover:border-blue-500'
                                    }`}
                                >
                                  {isSelected && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </button>
                              </div>

                              {/* INFOS PRINCIPALES - COMPACT */}
                              <div className="mb-2">
                                <p className="text-gray-800 text-xs font-black uppercase truncate">{res.societeLocatrice}</p>
                                <p className="text-[8px] text-gray-500 font-medium mt-0.5">
                                  Face: {res.faceLabel} • {res.dureeMois} mois
                                </p>
                              </div>

                              {/* SECTION PRIX - COMPACT */}
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <div className="bg-white/40 backdrop-blur-sm rounded-lg p-1.5 border border-white/30">
                                  <label className="text-[6px] text-gray-400 uppercase font-bold block">Prix unitaire</label>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={unitPrice === 0 ? "" : unitPrice}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setPrices(prev => ({ ...prev, [key]: val === "" ? 0 : Number(val) }));
                                      }}
                                      placeholder="0"
                                      className="w-full bg-transparent text-xs text-gray-800 font-bold outline-none"
                                    />
                                    <span className="text-[8px] text-blue-600 font-bold">$</span>
                                  </div>
                                </div>
                                <div className="bg-white/40 backdrop-blur-sm rounded-lg p-1.5 text-right border border-white/30">
                                  <label className="text-[6px] text-gray-400 uppercase font-bold block">Total</label>
                                  <span className="text-blue-600 text-xs font-black">
                                    {(unitPrice * res.dureeMois).toLocaleString()} $
                                  </span>
                                </div>
                              </div>

                              {/* BOUTON SUPPRIMER - PLUS COMPACT */}
                              <div className="flex justify-end pt-1.5 border-t border-white/20">
                                <button
                                  onClick={() => processOperations('delete', res, index)}
                                  className="px-2.5 py-1 bg-red-50/60 backdrop-blur-sm border border-red-200/50 text-red-600 rounded-lg font-black text-[7px] uppercase hover:bg-red-600 hover:text-white transition-all active:scale-95 flex items-center gap-1"
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                  </svg>
                                  Supprimer
                                </button>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* FOOTER ACTIONS - COMPACT */}
                  {reservationsEnAttente.length > 0 && (
                    <div className="p-3 border-t border-white/20 bg-white/30 backdrop-blur-sm flex-shrink-0">
                      {/* SECTION MODE DE PAIEMENT GLOBAL - COMPACT */}
                      <div className="mb-2 p-2 bg-white/30 backdrop-blur-sm rounded-lg border border-white/20">
                        <h3 className="text-[8px] font-black text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <CreditCard size={10} />
                          Mode de paiement - Global
                        </h3>

                        <div className="flex gap-1.5 mb-2">
                          {['total', 'tranche'].map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setGlobalPaymentMode(mode as 'total' | 'tranche')}
                              className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all ${globalPaymentMode === mode
                                ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                                : 'bg-white/30 text-gray-500 hover:text-gray-700 border border-white/20'
                                }`}
                            >
                              {mode === 'total' ? '💰 Comptant' : '📅 Tranches'}
                            </button>
                          ))}
                        </div>

                        {globalPaymentMode === 'tranche' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-2 bg-white/30 backdrop-blur-sm rounded-lg border border-white/20"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[7px] text-gray-600 uppercase font-bold">Nombre de tranches</span>
                              <input
                                type="number"
                                min="2"
                                max="12"
                                value={globalTranchesCount}
                                onChange={(e) => setGlobalTranchesCount(Math.max(2, Math.min(12, parseInt(e.target.value) || 2)))}
                                className="w-16 bg-white/50 border border-white/30 rounded-lg px-2 py-0.5 text-gray-800 text-center text-[9px] font-bold outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                              />
                            </div>
                            <div className="mt-1.5 pt-1.5 border-t border-white/20">
                              <div className="flex justify-between text-[7px] text-gray-500">
                                <span>Total facture:</span>
                                <span className="text-blue-700 font-bold">{totalFactureAmount.toLocaleString()} $</span>
                              </div>
                              <div className="flex justify-between text-[7px] text-gray-500 mt-0.5">
                                <span>Montant par tranche:</span>
                                <span className="text-blue-700 font-bold">{(totalFactureAmount / globalTranchesCount).toLocaleString()} $</span>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {globalPaymentMode === 'total' && totalFactureAmount > 0 && (
                          <div className="flex justify-between items-center pt-1.5 border-t border-white/20">
                            <span className="text-[7px] text-gray-600 uppercase font-bold">Total à payer:</span>
                            <span className="text-blue-700 font-bold text-sm">{totalFactureAmount.toLocaleString()} $</span>
                          </div>
                        )}
                      </div>

                      {/* BOUTON PRINCIPAL - COMPACT */}
                      <button
                        disabled={Object.values(selectedForPrint).filter(v => v).length === 0}
                        onClick={() => processOperations('selection')}  // ← ICI
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-700 disabled:opacity-40 text-white py-2.5 rounded-lg font-black text-[9px] uppercase flex justify-between px-4 items-center hover:shadow-xl hover:shadow-blue-500/20 transition-all active:scale-[0.98]"
                      >
                        <span>📄 Facturer la sélection</span>
                        <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[8px]">
                          {Object.values(selectedForPrint).filter(v => v).length} face(s)
                        </span>
                      </button>

                      {/* BOUTONS SECONDAIRES - COMPACT */}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            const allSelected: Record<string, boolean> = {};
                            reservationsEnAttente.forEach((res: any) => {
                              allSelected[res.resUniqueId] = true;
                            });
                            setSelectedForPrint(allSelected);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-white/30 backdrop-blur-sm border border-white/20 text-gray-700 py-1.5 rounded-lg font-black text-[7px] uppercase hover:bg-white/50 transition-all"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <polyline points="9 12 11 14 15 10" />
                          </svg>
                          Tout sélectionner
                        </button>
                        <button
                          onClick={() => setIsCartOpen(false)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-red-50/30 backdrop-blur-sm border border-red-200/30 text-red-600 py-1.5 rounded-lg font-black text-[7px] uppercase hover:bg-red-600 hover:text-white transition-all"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                          Fermer
                        </button>
                      </div>

                      {/* INFOS UTILISATEUR - COMPACT */}
                      <div className="mt-2 pt-1.5 border-t border-white/20 text-center">
                        <p className="text-[8px] text-gray-700 font-black uppercase tracking-wider">{user?.nomComplet || "Agent"}</p>
                        <p className="text-[6px] text-gray-400 font-medium">{user?.email}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isStatsOpen && (
              <>
                {/* OVERLAY TRÈS TRANSPARENT */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsStatsOpen(false)}
                  className="fixed inset-0 z-[100]"
                >
                  <div className="absolute inset-0 bg-black/5 backdrop-blur-[2px]">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200/5 rounded-full blur-3xl" />
                  </div>
                </motion.div>

                {/* PANEL LATÉRAL PREMIUM - TRANSPARENT */}
                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white/90 backdrop-blur-xl border-l border-white/20 z-[101] flex flex-col shadow-2xl shadow-black/5"
                >
                  {/* HEADER PREMIUM - TRANSPARENT */}
                  <div className="relative p-4 sm:p-5 border-b border-white/10 bg-white/40 backdrop-blur-sm flex-shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl" />

                    <div className="flex justify-between items-center relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
                          <p className="text-[8px] font-black text-blue-600 uppercase tracking-[0.3em]">Performance</p>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-800">
                          Panel <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Agent</span>
                        </h2>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mt-1">Performance & Suivi</p>
                      </div>
                      <button
                        onClick={() => setIsStatsOpen(false)}
                        className="group p-2 bg-white/50 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 text-gray-600 backdrop-blur-sm border border-white/20"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:rotate-90 transition-transform duration-300">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* CONTENU SCROLLABLE - OPTIMISÉ */}
                  {/* CONTENU SCROLLABLE - OPTIMISÉ */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-transparent">

                    {/* ========== ONGLET STATS ========== */}
                    {activeTab === 'stats' && (
                      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        {/* CERCLE DE PERFORMANCE - COMPACT */}
                        <div className="flex flex-col items-center py-2">
                          <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90">
                              <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-200" />
                              <circle
                                cx="64" cy="64" r="56" fill="none"
                                stroke="url(#gradientStats)"
                                strokeWidth="6"
                                strokeDasharray="352"
                                strokeDashoffset={352 - (352 * Number(statsEfficacite().performance)) / 100}
                                className="transition-all duration-1000"
                              />
                            </svg>
                            <svg width="0" height="0">
                              <defs>
                                <linearGradient id="gradientStats" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#3b82f6" />
                                  <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-black text-gray-800">{statsEfficacite().performance}%</span>
                              <span className="text-[7px] text-gray-400 uppercase font-bold tracking-tighter">Efficacité</span>
                            </div>
                          </div>
                        </div>

                        {/* STATS RAPIDES - COMPACT */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 border border-white/30 hover:border-blue-400/40 transition-all">
                            <p className="text-xl font-black text-gray-800">{statsEfficacite().totalAgent}</p>
                            <p className="text-[7px] uppercase text-gray-400 font-bold tracking-wider">Mes Actions</p>
                          </div>
                          <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 border border-white/30 hover:border-blue-400/40 transition-all">
                            <p className="text-xl font-black text-gray-800">{statsEfficacite().totalGlobal}</p>
                            <p className="text-[7px] uppercase text-gray-400 font-bold tracking-wider">Global Agence</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ========== ONGLET GESTION ========== */}
                    {activeTab === 'reservations' && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* FILTRES - COMPACT */}
                        <div className="space-y-3">
                          <div className="flex bg-white/30 p-1 rounded-lg border border-white/20 gap-1">
                            {['avant', 'present', 'futur'].map((t) => (
                              <button
                                key={t}
                                onClick={() => setTimeFilter(t as any)}
                                className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${timeFilter === t
                                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                                  : 'text-gray-400 hover:text-gray-700'
                                  }`}
                              >
                                {t === 'avant' ? 'Passé' : t === 'present' ? 'Présent' : 'Futur'}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {timeFilter !== 'present' && (
                              <div className="flex items-center justify-between bg-white/30 px-2.5 py-1.5 rounded-lg border border-white/20">
                                <span className="text-[7px] text-gray-400 font-black uppercase">Mois :</span>
                                <input
                                  type="number"
                                  value={monthCount}
                                  onChange={(e) => setMonthCount(Math.max(1, parseInt(e.target.value)))}
                                  className="w-8 bg-transparent text-right font-black text-blue-600 outline-none text-xs"
                                />
                              </div>
                            )}
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value as any)}
                              className="flex-1 bg-white/30 border border-white/20 rounded-lg px-2.5 py-1.5 text-[8px] font-black uppercase text-gray-700 outline-none focus:border-blue-400 transition-all"
                            >
                              <option value="tous" className="bg-white">Tous les statuts</option>
                              <option value="Occupé" className="bg-white">Occupé (En cours)</option>
                              <option value="Reservé" className="bg-white">Réservé (En attente)</option>
                            </select>
                          </div>
                        </div>

                        {/* LISTE DES RÉSERVATIONS - COMPACT */}
                        <div className="space-y-2">
                          {getFilteredReservations().length === 0 ? (
                            <div className="text-center py-8">
                              <div className="w-12 h-12 mx-auto bg-white/30 rounded-full flex items-center justify-center mb-2 border border-white/20">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                  <line x1="16" y1="2" x2="16" y2="6" />
                                  <line x1="8" y1="2" x2="8" y2="6" />
                                  <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                              </div>
                              <p className="text-gray-500 text-xs font-bold uppercase">Aucune réservation</p>
                              <p className="text-gray-400/60 text-[7px] mt-1">Aucune réservation trouvée</p>
                            </div>
                          ) : (
                            getFilteredReservations().map((res, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-2.5 p-2.5 bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl hover:border-blue-400/50 hover:shadow-md hover:shadow-blue-100/20 transition-all group"
                              >
                                <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-white/30">
                                  <img src={res.photoCampagneUrl} className="w-full h-full object-cover" alt="" />
                                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                    <input type="file" className="hidden" onChange={(e) => handlePhotoUpdate(e, res.id)} />
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                      <circle cx="12" cy="13" r="4" />
                                    </svg>
                                  </label>
                                </div>
                                <div className="flex-1 min-w-0 grid grid-cols-2 items-center gap-1.5">
                                  <div>
                                    <p className="text-[7px] font-black text-blue-600 truncate uppercase">{res.faceId}</p>
                                    <p className="text-[9px] text-gray-800 font-bold truncate uppercase leading-tight">{res.societeLocatrice}</p>
                                  </div>
                                  <div className="text-right flex items-center justify-end gap-1.5">
                                    <div className="flex flex-col">
                                      <p className="text-[7px] text-gray-500 font-bold">{res.dateDebut}</p>
                                      <p className="text-[6px] text-gray-400 uppercase">au {res.dateFin}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteReservation(res)}
                                      className="p-1 bg-red-50/60 hover:bg-red-100 text-red-500 rounded-lg transition-colors border border-red-200/30"
                                    >
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* ========== ONGLET RDV (NOUVEAU) ========== */}
                    {/* ========== ONGLET RDV ========== */}
                    {activeTab === 'rdv' && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">

                        {/* VÉRIFICATION SI C'EST L'ADMIN OU UN AGENT */}
                        {user?.email === ADMIN_RESPONSABLE ? (
                          // ========== VUE ADMIN ==========
                          <>
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 text-white">
                              <p className="text-sm sm:text-base font-black uppercase flex items-center gap-3">
                                <ShieldCheck size={18} className="sm:w-5 sm:h-5" />
                                Panneau d'administration - Tous les rapports
                              </p>
                              <p className="text-xs sm:text-sm text-white/70 mt-1 font-medium">
                                {rdvHistory.length} rapport(s) en attente de traitement
                              </p>
                            </div>

                            {/* FILTRES ADMIN */}
                            <div className="flex gap-2 bg-white/30 p-2 rounded-xl border border-white/20 overflow-x-auto flex-wrap">
                              {['tous', 'en_attente', 'valide', 'rejete', 'realise', 'annule', 'reporte'].map((f) => (
                                <button
                                  key={f}
                                  onClick={() => setRdvFilter(f as any)}
                                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase whitespace-nowrap transition-all ${rdvFilter === f
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                                    : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                  {STATUTS_RDV[f as keyof typeof STATUTS_RDV]?.icon || '📋'} {f === 'tous' ? 'Tous' : STATUTS_RDV[f as keyof typeof STATUTS_RDV]?.label || f}
                                </button>
                              ))}
                            </div>

                            {/* LISTE DES RDV - ADMIN */}
                            <div className="space-y-3">
                              {rdvHistory.filter(r => rdvFilter === 'tous' || r.statut === rdvFilter).length === 0 ? (
                                <div className="text-center py-12">
                                  <div className="w-16 h-16 mx-auto bg-white/30 rounded-full flex items-center justify-center mb-3 border-2 border-white/20">
                                    <Calendar size={24} className="text-gray-400" />
                                  </div>
                                  <p className="text-gray-600 text-base font-black uppercase">Aucun rapport</p>
                                  <p className="text-gray-400/70 text-xs mt-1">Aucun rapport trouvé</p>
                                </div>
                              ) : (
                                rdvHistory
                                  .filter(r => rdvFilter === 'tous' || r.statut === rdvFilter)
                                  .map((rdv, idx) => {
                                    const statusInfo = STATUTS_RDV[rdv.statut as keyof typeof STATUTS_RDV] || STATUTS_RDV.en_attente;
                                    const isExpanded = expandedRdvId === rdv.id;

                                    return (
                                      <motion.div
                                        key={rdv.id || idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-white/40 backdrop-blur-sm border-2 border-white/30 rounded-2xl hover:border-blue-400/60 transition-all overflow-hidden"
                                      >
                                        {/* EN-TÊTE CARTE (toujours visible) */}
                                        <div
                                          className="p-4 cursor-pointer hover:bg-white/20 transition-colors"
                                          onClick={() => toggleExpandRdv(rdv.id)}
                                        >
                                          <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-3 flex-wrap">
                                                <p className="text-base sm:text-lg font-black text-gray-800 truncate">{rdv.clientNom}</p>
                                                <span className="text-xs text-gray-400 font-bold">•</span>
                                                <p className="text-sm sm:text-base text-gray-600 font-bold truncate">{rdv.agentNom}</p>
                                              </div>
                                              <p className="text-sm sm:text-base text-gray-600 font-bold truncate">{rdv.objet}</p>
                                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                <span className="text-xs sm:text-sm text-gray-500 font-bold">{rdv.dateVisite}</span>
                                                {rdv.heureVisite && (
                                                  <span className="text-xs sm:text-sm text-gray-500 font-bold">• {rdv.heureVisite}</span>
                                                )}
                                                {rdv.luParResponsable && (
                                                  <span className="text-xs sm:text-sm text-blue-600 font-bold">• 👁️ Lu</span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                              <span className={`text-xs sm:text-sm font-black uppercase px-2.5 py-1 rounded-xl border-2 ${statusInfo.color}`}>
                                                {statusInfo.icon} {statusInfo.label}
                                              </span>
                                              <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                  <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        </div>

                                        {/* DÉTAILS DÉROULANTS */}
                                        {isExpanded && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="px-5 pb-5 pt-3 border-t-2 border-white/20"
                                          >
                                            <div className="space-y-4">
                                              {/* Informations détaillées */}
                                              <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                  <p className="text-gray-500 font-black uppercase text-xs sm:text-sm tracking-wider">Client</p>
                                                  <p className="text-gray-900 font-black text-base sm:text-lg">{rdv.clientNom}</p>
                                                </div>
                                                {rdv.clientContact && (
                                                  <div>
                                                    <p className="text-gray-500 font-black uppercase text-xs sm:text-sm tracking-wider">Contact</p>
                                                    <p className="text-gray-900 font-bold text-sm sm:text-base">{rdv.clientContact}</p>
                                                  </div>
                                                )}
                                                <div>
                                                  <p className="text-gray-500 font-black uppercase text-xs sm:text-sm tracking-wider">Date</p>
                                                  <p className="text-gray-900 font-black text-base sm:text-lg">{rdv.dateVisite}</p>
                                                </div>
                                                {rdv.heureVisite && (
                                                  <div>
                                                    <p className="text-gray-500 font-black uppercase text-xs sm:text-sm tracking-wider">Heure</p>
                                                    <p className="text-gray-900 font-black text-base sm:text-lg">{rdv.heureVisite}</p>
                                                  </div>
                                                )}
                                              </div>

                                              {rdv.description && (
                                                <div>
                                                  <p className="text-gray-500 font-black uppercase text-xs sm:text-sm tracking-wider">Description</p>
                                                  <p className="text-gray-800 text-sm sm:text-base leading-relaxed font-medium">{rdv.description}</p>
                                                </div>
                                              )}

                                              {rdv.resultat && (
                                                <div>
                                                  <p className="text-gray-500 font-black uppercase text-xs sm:text-sm tracking-wider">Résultat</p>
                                                  <p className="text-gray-800 text-sm sm:text-base leading-relaxed font-medium">{rdv.resultat}</p>
                                                </div>
                                              )}

                                              {rdv.prochainRdv && (
                                                <div>
                                                  <p className="text-gray-500 font-black uppercase text-xs sm:text-sm tracking-wider">Prochain rendez-vous</p>
                                                  <p className="text-gray-900 font-black text-base sm:text-lg">{rdv.prochainRdv}</p>
                                                </div>
                                              )}

                                              {rdv.commentaireResponsable && (
                                                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                                                  <p className="text-gray-500 font-black uppercase text-xs sm:text-sm tracking-wider">Commentaire responsable</p>
                                                  <p className="text-blue-700 text-sm sm:text-base font-bold leading-relaxed">{rdv.commentaireResponsable}</p>
                                                </div>
                                              )}

                                              {/* ACTIONS ADMIN */}
                                              {rdv.statut === 'en_attente' && (
                                                <div className="flex gap-3 pt-3 border-t-2 border-white/20">
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); validerRdv(rdv); }}
                                                    className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all active:scale-95"
                                                  >
                                                    ✅ Valider
                                                  </button>
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedRdvForAction(rdv); setShowCommentModal(true); }}
                                                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 hover:bg-red-600 transition-all active:scale-95"
                                                  >
                                                    ❌ Rejeter
                                                  </button>
                                                </div>
                                              )}

                                              {/* Actions pour tous les RDV */}
                                              <div className="flex gap-3 pt-2 items-center">
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); supprimerRdv(rdv); }}
                                                  className="px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-black text-xs uppercase transition-all border-2 border-red-200"
                                                >
                                                  🗑️ Supprimer
                                                </button>
                                                <span className="text-xs text-gray-400 font-bold ml-auto">
                                                  {rdv.agentEmail}
                                                </span>
                                              </div>
                                            </div>
                                          </motion.div>
                                        )}
                                      </motion.div>
                                    );
                                  })
                              )}
                            </div>
                          </>
                        ) : (
                          // ========== VUE AGENT ==========
                          <>
                            {/* BOUTON NOUVEAU RDV */}
                            {!showRdvForm ? (
                              <button
                                onClick={() => { setShowRdvForm(true); setEditingRdvId(null); }}
                                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95"
                              >
                                <Calendar size={18} />
                                Nouveau rapport de visite
                              </button>
                            ) : (
                              /* FORMULAIRE RDV */
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-white/40 backdrop-blur-sm rounded-xl border-2 border-white/30 p-4 space-y-4"
                              >
                                <div className="flex justify-between items-center">
                                  <h3 className="text-sm font-black text-blue-700 uppercase flex items-center gap-2">
                                    <FileText size={16} />
                                    {editingRdvId ? 'Modifier le rapport' : 'Nouveau rapport'}
                                  </h3>
                                  <button
                                    onClick={() => { setShowRdvForm(false); setEditingRdvId(null); }}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <X size={18} />
                                  </button>
                                </div>

                                {/* Client */}
                                <div>
                                  <label className="text-xs font-black text-gray-500 uppercase flex items-center gap-2">
                                    <UserCheck size={14} /> Client *
                                  </label>
                                  <input
                                    type="text"
                                    value={rdvForm.clientNom}
                                    onChange={(e) => setRdvForm({ ...rdvForm, clientNom: e.target.value })}
                                    placeholder="Nom du client"
                                    className="w-full bg-white/50 border-2 border-white/30 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition-all font-medium"
                                  />
                                </div>

                                {/* Contact */}
                                <div>
                                  <label className="text-xs font-black text-gray-500 uppercase flex items-center gap-2">
                                    📞 Contact
                                  </label>
                                  <input
                                    type="text"
                                    value={rdvForm.clientContact}
                                    onChange={(e) => setRdvForm({ ...rdvForm, clientContact: e.target.value })}
                                    placeholder="Téléphone / Email"
                                    className="w-full bg-white/50 border-2 border-white/30 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition-all font-medium"
                                  />
                                </div>

                                {/* Date et Heure */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs font-black text-gray-500 uppercase">Date *</label>
                                    <input
                                      type="date"
                                      value={rdvForm.dateVisite}
                                      onChange={(e) => setRdvForm({ ...rdvForm, dateVisite: e.target.value })}
                                      className="w-full bg-white/50 border-2 border-white/30 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition-all font-medium"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-black text-gray-500 uppercase flex items-center gap-2">
                                      <Clock size={14} /> Heure
                                    </label>
                                    <input
                                      type="time"
                                      value={rdvForm.heureVisite}
                                      onChange={(e) => setRdvForm({ ...rdvForm, heureVisite: e.target.value })}
                                      className="w-full bg-white/50 border-2 border-white/30 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition-all font-medium"
                                    />
                                  </div>
                                </div>

                                {/* Objet */}
                                <div>
                                  <label className="text-xs font-black text-gray-500 uppercase">Objet du rendez-vous *</label>
                                  <input
                                    type="text"
                                    value={rdvForm.objet}
                                    onChange={(e) => setRdvForm({ ...rdvForm, objet: e.target.value })}
                                    placeholder="Ex: Présentation de l'offre, Signature contrat..."
                                    className="w-full bg-white/50 border-2 border-white/30 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition-all font-medium"
                                  />
                                </div>

                                {/* Description */}
                                <div>
                                  <label className="text-xs font-black text-gray-500 uppercase">Description</label>
                                  <textarea
                                    value={rdvForm.description}
                                    onChange={(e) => setRdvForm({ ...rdvForm, description: e.target.value })}
                                    placeholder="Détails du rendez-vous..."
                                    rows={3}
                                    className="w-full bg-white/50 border-2 border-white/30 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition-all resize-none font-medium"
                                  />
                                </div>

                                {/* Résultat */}
                                <div>
                                  <label className="text-xs font-black text-gray-500 uppercase">Résultat / Retour</label>
                                  <textarea
                                    value={rdvForm.resultat}
                                    onChange={(e) => setRdvForm({ ...rdvForm, resultat: e.target.value })}
                                    placeholder="Résumé de l'entretien, conclusion..."
                                    rows={3}
                                    className="w-full bg-white/50 border-2 border-white/30 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition-all resize-none font-medium"
                                  />
                                </div>

                                {/* Prochain RDV */}
                                <div>
                                  <label className="text-xs font-black text-gray-500 uppercase">Prochain rendez-vous</label>
                                  <input
                                    type="date"
                                    value={rdvForm.prochainRdv}
                                    onChange={(e) => setRdvForm({ ...rdvForm, prochainRdv: e.target.value })}
                                    className="w-full bg-white/50 border-2 border-white/30 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition-all font-medium"
                                  />
                                </div>

                                {/* Statut (visible seulement pour l'édition) */}
                                {editingRdvId && (
                                  <div>
                                    <label className="text-xs font-black text-gray-500 uppercase">Statut</label>
                                    <select
                                      value={rdvForm.statut}
                                      onChange={(e) => setRdvForm({ ...rdvForm, statut: e.target.value as any })}
                                      className="w-full bg-white/50 border-2 border-white/30 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition-all font-medium"
                                    >
                                      <option value="en_attente">En attente</option>
                                      <option value="realise">Réalisé</option>
                                      <option value="annule">Annulé</option>
                                      <option value="reporte">Reporté</option>
                                    </select>
                                  </div>
                                )}

                                {/* Boutons */}
                                <div className="flex gap-3 pt-3 border-t-2 border-white/20">
                                  <button
                                    onClick={() => { setShowRdvForm(false); setEditingRdvId(null); }}
                                    className="flex-1 py-2 bg-white/40 border-2 border-white/20 text-gray-600 rounded-xl font-black text-sm uppercase transition-all hover:bg-red-500 hover:text-white"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (editingRdvId) {
                                        const rdv = rdvHistory.find(r => r.id === editingRdvId);
                                        if (rdv) modifierRdv(rdv);
                                      } else {
                                        submitRdvReport();
                                      }
                                    }}
                                    disabled={isSubmittingRdv}
                                    className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                                  >
                                    {isSubmittingRdv ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <>
                                        <Send size={14} />
                                        {editingRdvId ? 'Modifier' : 'Envoyer'}
                                      </>
                                    )}
                                  </button>
                                </div>
                              </motion.div>
                            )}

                            {/* FILTRES AGENT */}
                            <div className="flex gap-2 bg-white/30 p-2 rounded-xl border-2 border-white/20 overflow-x-auto flex-wrap">
                              {['tous', 'en_attente', 'valide', 'rejete', 'realise', 'annule', 'reporte'].map((f) => (
                                <button
                                  key={f}
                                  onClick={() => setRdvFilter(f as any)}
                                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase whitespace-nowrap transition-all ${rdvFilter === f
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                                    : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                  {STATUTS_RDV[f as keyof typeof STATUTS_RDV]?.icon || '📋'} {f === 'tous' ? 'Tous' : STATUTS_RDV[f as keyof typeof STATUTS_RDV]?.label || f}
                                </button>
                              ))}
                            </div>

                            {/* LISTE DES RDV - AGENT */}
                            <div className="space-y-3">
                              {rdvHistory.filter(r => rdvFilter === 'tous' || r.statut === rdvFilter).length === 0 ? (
                                <div className="text-center py-12">
                                  <div className="w-16 h-16 mx-auto bg-white/30 rounded-full flex items-center justify-center mb-3 border-2 border-white/20">
                                    <Calendar size={24} className="text-gray-400" />
                                  </div>
                                  <p className="text-gray-600 text-base font-black uppercase">Aucun rapport</p>
                                  <p className="text-gray-400/70 text-xs mt-1">
                                    {rdvFilter === 'tous' ? 'Aucun rapport de visite' : `Aucun rapport ${STATUTS_RDV[rdvFilter as keyof typeof STATUTS_RDV]?.label || rdvFilter}`}
                                  </p>
                                </div>
                              ) : (
                                rdvHistory
                                  .filter(r => rdvFilter === 'tous' || r.statut === rdvFilter)
                                  .map((rdv, idx) => {
                                    const statusInfo = STATUTS_RDV[rdv.statut as keyof typeof STATUTS_RDV] || STATUTS_RDV.en_attente;
                                    const isExpanded = expandedRdvId === rdv.id;
                                    const peutModifier = rdv.statut === 'en_attente' && !rdv.luParResponsable;

                                    return (
                                      <motion.div
                                        key={rdv.id || idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-white/40 backdrop-blur-sm border-2 border-white/30 rounded-2xl hover:border-blue-400/60 transition-all overflow-hidden"
                                      >
                                        {/* EN-TÊTE CARTE */}
                                        <div
                                          className="p-4 cursor-pointer hover:bg-white/20 transition-colors"
                                          onClick={() => toggleExpandRdv(rdv.id)}
                                        >
                                          <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                              <p className="text-base sm:text-lg font-black text-gray-800 truncate">{rdv.clientNom}</p>
                                              <p className="text-sm sm:text-base text-gray-600 font-bold truncate">{rdv.objet}</p>
                                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                <span className="text-xs sm:text-sm text-gray-500 font-bold">{rdv.dateVisite}</span>
                                                {rdv.heureVisite && (
                                                  <span className="text-xs sm:text-sm text-gray-500 font-bold">• {rdv.heureVisite}</span>
                                                )}
                                                {rdv.luParResponsable && (
                                                  <span className="text-xs sm:text-sm text-blue-600 font-bold">• 👁️ Lu</span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                              <span className={`text-xs sm:text-sm font-black uppercase px-2.5 py-1 rounded-xl border-2 ${statusInfo.color}`}>
                                                {statusInfo.icon} {statusInfo.label}
                                              </span>
                                              <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                  <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        </div>

                                        {/* DÉTAILS DÉROULANTS */}
                                        {isExpanded && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="px-4 pb-4 pt-2 border-t-2 border-white/20"
                                          >
                                            <div className="space-y-3">
                                              <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                  <p className="text-gray-400 font-black uppercase text-xs">Client</p>
                                                  <p className="text-gray-800 font-bold text-sm">{rdv.clientNom}</p>
                                                </div>
                                                {rdv.clientContact && (
                                                  <div>
                                                    <p className="text-gray-400 font-black uppercase text-xs">Contact</p>
                                                    <p className="text-gray-800 font-bold text-sm">{rdv.clientContact}</p>
                                                  </div>
                                                )}
                                                <div>
                                                  <p className="text-gray-400 font-black uppercase text-xs">Date</p>
                                                  <p className="text-gray-800 font-bold text-sm">{rdv.dateVisite}</p>
                                                </div>
                                                {rdv.heureVisite && (
                                                  <div>
                                                    <p className="text-gray-400 font-black uppercase text-xs">Heure</p>
                                                    <p className="text-gray-800 font-bold text-sm">{rdv.heureVisite}</p>
                                                  </div>
                                                )}
                                              </div>

                                              {rdv.description && (
                                                <div>
                                                  <p className="text-gray-400 font-black uppercase text-xs">Description</p>
                                                  <p className="text-gray-700 text-sm font-medium">{rdv.description}</p>
                                                </div>
                                              )}

                                              {rdv.resultat && (
                                                <div>
                                                  <p className="text-gray-400 font-black uppercase text-xs">Résultat</p>
                                                  <p className="text-gray-700 text-sm font-medium">{rdv.resultat}</p>
                                                </div>
                                              )}

                                              {rdv.prochainRdv && (
                                                <div>
                                                  <p className="text-gray-400 font-black uppercase text-xs">Prochain rendez-vous</p>
                                                  <p className="text-gray-800 font-bold text-sm">{rdv.prochainRdv}</p>
                                                </div>
                                              )}

                                              {rdv.commentaireResponsable && (
                                                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
                                                  <p className="text-gray-400 font-black uppercase text-xs">Commentaire responsable</p>
                                                  <p className="text-blue-700 text-sm font-bold">{rdv.commentaireResponsable}</p>
                                                </div>
                                              )}

                                              {/* ACTIONS AGENT */}
                                              {peutModifier && (
                                                <div className="flex gap-3 pt-2 border-t-2 border-white/20">
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); prepareEditRdv(rdv); }}
                                                    className="flex-1 py-2 bg-blue-500 text-white rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-95"
                                                  >
                                                    ✏️ Modifier
                                                  </button>
                                                </div>
                                              )}

                                              {!peutModifier && rdv.statut === 'en_attente' && rdv.luParResponsable && (
                                                <p className="text-xs text-blue-600 bg-blue-50 p-3 rounded-xl text-center font-bold border-2 border-blue-200">
                                                  📌 Rapport en cours d'évaluation par le responsable
                                                </p>
                                              )}
                                            </div>
                                          </motion.div>
                                        )}
                                      </motion.div>
                                    );
                                  })
                              )}
                            </div>
                          </>
                        )}

                        {/* MODAL DE COMMENTAIRE POUR REJET */}
                        {showCommentModal && selectedRdvForAction && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                            onClick={() => { setShowCommentModal(false); setSelectedRdvForAction(null); }}
                          >
                            <div
                              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <h3 className="text-xl font-black text-gray-800 mb-2">Motif du rejet</h3>
                              <p className="text-sm text-gray-500 mb-4 font-medium">
                                Veuillez expliquer pourquoi vous rejetez le rapport de <span className="font-black text-gray-700">{selectedRdvForAction.clientNom}</span>
                              </p>
                              <textarea
                                value={commentaireResponsable}
                                onChange={(e) => setCommentaireResponsable(e.target.value)}
                                placeholder="Saisissez votre commentaire..."
                                rows={4}
                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-red-400 transition-all resize-none font-medium"
                              />
                              <div className="flex gap-3 mt-4">
                                <button
                                  onClick={() => { setShowCommentModal(false); setSelectedRdvForAction(null); setCommentaireResponsable(''); }}
                                  className="flex-1 py-2.5 bg-gray-100 rounded-xl font-black text-sm uppercase text-gray-600 hover:bg-gray-200 transition-all"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={() => { if (selectedRdvForAction) rejeterRdv(selectedRdvForAction, commentaireResponsable); }}
                                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-black text-sm uppercase hover:bg-red-600 transition-all"
                                >
                                  Confirmer le rejet
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}



                  </div>
                  {/* BOTTOM PANEL - COMPACT */}
                  <div className="p-3 border-t border-white/20 bg-white/30 backdrop-blur-sm flex-shrink-0 space-y-3">
                    {/* IDENTITÉ - COMPACT */}
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-black uppercase text-xs shadow-lg">
                        {user?.displayName?.[0] || "A"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-gray-800 uppercase truncate">{user?.nomComplet || "Agent Kin-Geo"}</p>
                        <p className="text-[7px] text-gray-400 truncate font-medium">{user?.email}</p>
                      </div>
                    </div>

                    {/* SWITCHER STATS / GESTION - COMPACT */}
                    {/* SWITCHER STATS / GESTION / RDV - COMPACT */}
                    <div className="flex bg-white/30 p-0.5 rounded-lg border border-white/20">
                      <button
                        onClick={() => setActiveTab('stats')}
                        className={`flex-1 py-1.5 rounded-lg text-[7px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${activeTab === 'stats'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-400 hover:text-gray-700'
                          }`}
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M12 20V10M18 20V4M6 20v-4" />
                        </svg>
                        Stats
                      </button>
                      <button
                        onClick={() => setActiveTab('reservations')}
                        className={`flex-1 py-1.5 rounded-lg text-[7px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${activeTab === 'reservations'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-400 hover:text-gray-700'
                          }`}
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                        </svg>
                        Gestion
                      </button>
                      <button
                        onClick={() => setActiveTab('rdv')}
                        className={`flex-1 py-1.5 rounded-lg text-[7px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${activeTab === 'rdv'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-400 hover:text-gray-700'
                          }`}
                      >
                        <Calendar size={9} />
                        RDV
                      </button>
                    </div>
                    {/* BOUTON FERMER - COMPACT */}
                    <button
                      onClick={() => setIsStatsOpen(false)}
                      className="w-full py-2 bg-white/40 border border-white/20 text-gray-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all rounded-lg font-black uppercase text-[8px] tracking-[0.15em] active:scale-95"
                    >
                      Fermer le panel
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>


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
                onEdit={handleEditPanneau}
                onReserver={handleReservation}  // ✅ AJOUTER CETTE LIGNE
                ouvrirLaCarte={ouvrirLaCarte}
                user={user}
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

            {/* Sélecteur d'éléments par page */}
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
        {isReservationModalOpen && panneauForReservation && (
          <EditPanneauModal
            isOpen={isReservationModalOpen}
            onClose={() => {
              setIsReservationModalOpen(false);
              setPanneauForReservation(null);
              setFaceForReservation(null);
            }}
            panneau={panneauForReservation}
            face={faceForReservation}
            user={user}
          />
        )}
        {filtered.length === 0 && (
          <div className="py-40 text-center">
            <p className="text-zinc-200/50 font-black uppercase tracking-[0.5em] italic">Aucun panneau trouvé</p>
          </div>
        )}
      </main>
      <Footer />


      <EditPanneauModal
        isOpen={!!panneauToEdit}
        onClose={() => setPanneauToEdit(null)}
        panneau={panneauToEdit}
        user={user} // On passe l'utilisateur connecté ici
      />
    </div>
  );
}


// Dans le composant FaceDetailModal, ajoutez ces imports en haut
import { Calendar, Activity, ShieldCheck, MinusCircle } from 'lucide-react';


// Ajoutez cette ligne avec les autres imports en haut du fichier

export const FaceDetailModal = ({
  isOpen,
  onClose,
  panneau,
  face,
  onSelect,
  isSelected,
  ouvrirLaCarte,
  onEdit, // ✅ Ajouter cette prop

}: any) => {
  const { user } = useAuth();

  if (!isOpen || !face) return null;



  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [panneauForReservation, setPanneauForReservation] = useState<any>(null);
  const [faceForReservation, setFaceForReservation] = useState<any>(null);

  // ============================================
  // ✅ RÉSERVATION ACTIVE POUR LA PHOTO
  // ============================================

  const getActiveReservationForPhoto = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const reservations = face.reservations || [];
    return reservations.find((res: any) => {
      if (!res.dateDebut || !res.dateFin) return false;
      const debut = new Date(res.dateDebut);
      const fin = new Date(res.dateFin);
      debut.setHours(0, 0, 0, 0);
      fin.setHours(0, 0, 0, 0);
      return now >= debut && now <= fin;
    }) || null;
  };

  // ✅ Fonction pour ouvrir le modal de réservation
  const openReservationModal = (panneau: Panneau, face: Face) => {
    //console.log('🔵 Réservation pour:', panneau.idPan, 'Face:', face.id);

    // Stocker le panneau et la face sélectionnés
    setPanneauForReservation(panneau);
    setFaceForReservation(face);

    // Ouvrir le modal d'édition
    setIsReservationModalOpen(true);
  };

  // ✅ Réservation active pour la photo
  const activeReservation = getActiveReservationForPhoto();
  const photoToShow = activeReservation?.photoCampagneUrl || face.photoCampagneUrl || logo;

  // ✅ Déterminer si la face est libre
  const isLibre = !activeReservation && (face.reservations || []).length === 0;

  // ============================================
  // ✅ STATUT DE LA FACE (badge)
  // ============================================

  const getFaceStatus = () => {
    // ✅ Si une réservation est active
    if (activeReservation) {
      const isPaidOrValidated =
        activeReservation.statutPaiement === 'payé' ||
        activeReservation.statutPaiement === 'validé' ||
        activeReservation.validationComptable === true;

      if (isPaidOrValidated) {
        return {
          label: activeReservation.validationComptable ? '✅ Validé' : '✅ Payé',
          isLibre: false,
          isActive: true
        };
      }
      return {
        label: '📌 En cours',
        isLibre: false,
        isActive: true
      };
    }

    // ✅ Vérifier s'il y a des réservations à venir
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const hasFutureReservation = (face.reservations || []).some((res: any) => {
      if (!res.dateDebut) return false;
      const debut = new Date(res.dateDebut);
      debut.setHours(0, 0, 0, 0);
      return debut > now;
    });

    if (hasFutureReservation) {
      return {
        label: '⏳ À venir',
        isLibre: false,
        isActive: false
      };
    }

    // ❌ Aucune réservation → Libre
    return {
      label: 'Libre',
      isLibre: true,
      isActive: false
    };
  };

  const faceStatus = getFaceStatus();
  const isLibreFinal = faceStatus.isLibre;

  // ============================================
  // ✅ DÉFINITION DES TYPES
  // ============================================

  interface ReservationStatus {
    label: string;
    color: string;
    showDays: boolean;
    isActive: boolean;
    isCurrent: boolean;
    daysText: string;
    statutReservation: string; // "Réservé" ou "Occupé"
    joursAvantExpiration?: number;
    expirationDateFormatted?: string;
    statutPaiement?: string;
  }

  // ============================================
  // ✅ STATUT D'UNE RÉSERVATION DANS LA LISTE
  // ============================================

  const getReservationDisplayStatus = (res: any): ReservationStatus | null => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const debut = new Date(res.dateDebut);
    const fin = new Date(res.dateFin);
    debut.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);

    const isActive = now >= debut && now <= fin;
    const isFuture = now < debut;
    const isPaidOrValidated =
      res.statutPaiement === 'payé' ||
      res.statutPaiement === 'validé' ||
      res.validationComptable === true;

    // ✅ Déterminer le statut de la réservation
    const statutReservation = res.statut || 'Réservé';

    // ✅ Réservation en cours
    if (isActive) {
      if (isPaidOrValidated) {
        return {
          label: '✅ ' + (res.validationComptable ? 'Validé' : 'Payé'),
          color: 'text-purple-600 bg-purple-50 border-purple-200',
          showDays: false,
          isActive: true,
          isCurrent: true,
          daysText: '',
          statutReservation: statutReservation
        };
      }
      return {
        label: '📌 En cours',
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        showDays: true,
        isActive: true,
        isCurrent: true,
        daysText: `${Math.ceil((fin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} jours restants`,
        statutReservation: statutReservation
      };
    }

    // ✅ Réservation à venir (future)
    if (isFuture) {
      const daysBeforeStart = Math.ceil((debut.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const joursAvantExpiration = res.joursAvantExpiration ?? 0;
      const isPaymentDeadlineExpired = joursAvantExpiration === 0;

      // Si délai expiré ET non payé → ne pas afficher
      if (isPaymentDeadlineExpired && !isPaidOrValidated) {
        return null;
      }

      // Si payé/validé mais à venir
      if (isPaidOrValidated) {
        return {
          label: '✅ ' + (res.validationComptable ? 'Validé' : 'Payé'),
          color: 'text-purple-600 bg-purple-50 border-purple-200',
          showDays: true,
          isActive: false,
          isCurrent: false,
          daysText: `Début dans ${daysBeforeStart} jour${daysBeforeStart > 1 ? 's' : ''}`,
          statutReservation: statutReservation,
          joursAvantExpiration: joursAvantExpiration,
          expirationDateFormatted: res.expirationDateFormatted
        };
      }

      // À venir, délai de paiement valide
      return {
        label: '⏳ À venir',
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        showDays: true,
        isActive: false,
        isCurrent: false,
        daysText: `Début dans ${daysBeforeStart} jour${daysBeforeStart > 1 ? 's' : ''}`,
        statutReservation: statutReservation,
        joursAvantExpiration: joursAvantExpiration,
        expirationDateFormatted: res.expirationDateFormatted,
        statutPaiement: res.statutPaiement
      };
    }

    // ❌ Passé → ne pas afficher
    return null;
  };

  // ============================================
  // ✅ FILTRER ET TRIER LES RÉSERVATIONS
  // ============================================

  const displayReservations = (face.reservations || [])
    .map((res: any) => {
      const status: ReservationStatus | null = getReservationDisplayStatus(res);
      return { res, status };
    })
    .filter(({ status }: { status: ReservationStatus | null }) => status !== null)
    .sort((a: { res: any; status: ReservationStatus }, b: { res: any; status: ReservationStatus }) => {
      if (a.status.isActive && !b.status.isActive) return -1;
      if (!a.status.isActive && b.status.isActive) return 1;
      return new Date(a.res.dateDebut).getTime() - new Date(b.res.dateDebut).getTime();
    });

  // ============================================
  // COULEURS DES BADGES
  // ============================================

  const getBadgeColor = () => {
    if (isLibreFinal) {
      return 'bg-emerald-500/20 border-emerald-500/50';
    }
    if (activeReservation) {
      const isPaidOrValidated =
        activeReservation.statutPaiement === 'payé' ||
        activeReservation.statutPaiement === 'validé' ||
        activeReservation.validationComptable === true;
      if (isPaidOrValidated) {
        return 'bg-purple-500/20 border-purple-500/50';
      }
      return 'bg-amber-500/20 border-amber-500/50';
    }
    return 'bg-blue-500/20 border-blue-500/50';
  };

  const getBadgeDotColor = () => {
    if (isLibreFinal) {
      return 'bg-emerald-500 animate-pulse';
    }
    if (activeReservation) {
      const isPaidOrValidated =
        activeReservation.statutPaiement === 'payé' ||
        activeReservation.statutPaiement === 'validé' ||
        activeReservation.validationComptable === true;
      if (isPaidOrValidated) {
        return 'bg-purple-500';
      }
      return 'bg-amber-500';
    }
    return 'bg-blue-500';
  };

  // ============================================
  // ÉTATS ET GESTIONNAIRES
  // ============================================

  const selectionKey = `${panneau.id}_${face.id}`;
  const [startY, setStartY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [panneauToEdit, setPanneauToEdit] = useState(null);

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

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  // ============================================
  // RENDU
  // ============================================

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-2 md:p-4 bg-blue-900/70 backdrop-blur-md"
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
              className="relative w-full max-w-4xl mx-auto bg-white/95 backdrop-blur-xl border-t sm:border border-blue-200/50 rounded-t-2xl sm:rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/20"
              style={{ maxHeight: '90vh' }}
            >
              {/* Effet de glow */}
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse pointer-events-none" />
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none" />

              {/* INDICATEUR DE SWIPE */}
              <div className="sm:hidden flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 bg-blue-300/50 rounded-full" />
              </div>

              {/* BOUTON FERMETURE */}
              <button
                onClick={onClose}
                className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 p-1.5 sm:p-2 bg-white/80 backdrop-blur-xl hover:bg-red-500 hover:text-white rounded-full transition-all duration-300 border border-blue-200/50 active:scale-95 text-blue-900"
              >
                <X size={16} className="sm:w-5 sm:h-5" />
              </button>

              <div className="sm:hidden absolute bottom-16 left-1/2 -translate-x-1/2 z-20">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 backdrop-blur-xl rounded-full border border-blue-400/30 text-white text-[9px] font-black uppercase tracking-wider active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  ✕ Fermer
                </button>
              </div>

              {/* LAYOUT - HAUTEUR FIXE */}
              <div className="flex flex-col md:flex-row" style={{ height: '80vh', maxHeight: '80vh' }}>

                {/* --- SECTION PHOTO --- */}
                <div className="relative w-full md:w-[35%] lg:w-[30%] h-[30vh] md:h-auto shrink-0">
                  <img
                    src={photoToShow}
                    className="w-full h-full object-cover md:object-contain bg-blue-900/10"
                    alt="Visual"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 via-blue-900/20 to-blue-900/30" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-transparent to-transparent" />

                  {/* BADGE STATUT */}
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full backdrop-blur-2xl border ${getBadgeColor()}`}>
                      <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${getBadgeDotColor()}`} />
                      <span className="text-[8px] sm:text-[10px] font-black text-white uppercase">
                        {faceStatus.label}
                      </span>
                    </div>
                  </div>

                  {/* INFOS SUR L'IMAGE */}
                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3">
                    <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-white italic leading-tight break-words">
                      {panneau.idPan}
                    </h2>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      <span className="bg-blue-500 text-white text-[10px] sm:text-[12px] md:text-[13px] font-black px-2 py-0.5 sm:px-3 sm:py-1 rounded-md truncate max-w-[120px] sm:max-w-[160px]">
                        {face.sens}
                      </span>
                      {activeReservation && (
                        <span className="bg-amber-500 text-white text-[10px] sm:text-[12px] md:text-[13px] font-black px-2 py-0.5 sm:px-3 sm:py-1 rounded-md truncate max-w-[120px] sm:max-w-[160px]">
                          {activeReservation.societeLocatrice?.substring(0, 15)}
                          {activeReservation.societeLocatrice?.length > 15 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* --- SECTION CONTENU --- */}
                <div className="flex-1 flex flex-col bg-gradient-to-b from-blue-50/80 to-white overflow-hidden min-h-0">

                  {/* HEADER - ID PANNEAU EN GRAND (14px) + INFOS SECONDAIRES (10px) */}
                  <div className="shrink-0 p-2 sm:p-3 md:p-4 border-b border-blue-200/50 bg-white/50">
                    {/* ID PANNEAU - TAILLE 14px */}
                    <p className="text-[14px] sm:text-[16px] md:text-[18px] font-black text-blue-900 uppercase tracking-wider break-words">
                      {panneau.idPan}
                    </p>

                    {/* ADRESSE - TAILLE 10px */}
                    <p className="text-[10px] sm:text-[11px] md:text-[12px] text-blue-700 font-medium mt-0.5 flex items-start gap-1.5 break-words">
                      <MapPin size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
                      <span className="break-words flex-1 min-w-[60px]">{panneau.adresse || 'Adresse non définie'}</span>
                    </p>

                    {/* DIMENSION - TAILLE 10px */}
                    {panneau.dimension && (
                      <p className="text-[10px] sm:text-[11px] text-gray-600 font-medium flex items-center gap-1.5 mt-0.5">
                        <span className="text-blue-400">📐</span>
                        <span>Dimension: {panneau.dimension}</span>
                      </p>
                    )}

                    {/* COORDONNÉES GÉOGRAPHIQUES - TAILLE 10px */}
                    {panneau.coords && (
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                        <div className="flex items-center gap-1 sm:gap-1.5 bg-blue-50/80 backdrop-blur-sm px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full border border-blue-200/50">
                          <Globe size={10} className="sm:w-3 sm:h-3 text-blue-500 flex-shrink-0" />
                          <span className="text-[10px] sm:text-[10px] font-mono font-medium text-blue-700 truncate max-w-[120px] sm:max-w-[180px] md:max-w-[220px]">
                            {typeof panneau.coords === 'object' && panneau.coords.lat !== undefined ? (
                              `${panneau.coords.lat.toFixed(6)}, ${panneau.coords.lng.toFixed(6)}`
                            ) : Array.isArray(panneau.coords) ? (
                              `${panneau.coords[0].toFixed(6)}, ${panneau.coords[1].toFixed(6)}`
                            ) : (
                              panneau.gps_raw ? `${panneau.gps_raw.lat.toFixed(6)}, ${panneau.gps_raw.lng.toFixed(6)}` : 'Coordonnées non disponibles'
                            )}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (ouvrirLaCarte) ouvrirLaCarte();
                            onClose();
                          }}
                          className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 hover:bg-emerald-100 transition flex-shrink-0"
                        >
                          <MapPin size={10} />
                          <span className="hidden xs:inline">Carte</span>
                          <span className="xs:hidden">📍</span>
                        </button>
                      </div>
                    )}

                    {/* STATUTS SUPPLÉMENTAIRES */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {isSelected && (
                        <span className="inline-block text-blue-600 text-[9px] font-black bg-blue-100 px-1.5 py-0.5 rounded-full">
                          ✓ Sélectionné
                        </span>
                      )}

                      {activeReservation && (
                        <>
                          <span className="inline-block text-amber-600 text-[9px] font-black bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 truncate max-w-[100px] sm:max-w-[160px]">
                            📅 {activeReservation.dateDebut} → {activeReservation.dateFin}
                          </span>
                          <span className="inline-block text-blue-600 text-[9px] font-black bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200 truncate max-w-[100px] sm:max-w-[160px]">
                            👤 {activeReservation.societeLocatrice}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ZONE SCROLLABLE - TIMELINE */}
                  <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4 custom-scrollbar bg-white/30 min-h-0">

                    {/* TIMELINE */}
                    <section className="space-y-3 sm:space-y-4">
                      <div className="flex items-center gap-2 sm:gap-2.5 sticky top-0 bg-white/80 py-1 z-10">
                        <Calendar size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                        <h4 className="text-blue-900 text-[11px] sm:text-[13px] md:text-[14px] font-black uppercase tracking-wider">Chronologie</h4>
                        <span className="text-[8px] sm:text-[9px] md:text-[10px] text-blue-400 bg-blue-50 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full border border-blue-200/50 flex-shrink-0">
                          {displayReservations.length} campagne{displayReservations.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="relative border-l-2 border-blue-200 ml-2 sm:ml-3 md:ml-4 pl-4 sm:pl-5 md:pl-6 space-y-3 sm:space-y-4 md:space-y-5">
                        {displayReservations.length > 0 ? (
                          displayReservations.map(({ res, status }: any, i: number) => {
                            return (
                              <div key={i} className="relative group">
                                {/* Point sur la timeline */}
                                <div className={`absolute -left-[17px] sm:-left-[21px] md:-left-[25px] top-1 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 rounded-full border-[2.5px] bg-white flex items-center justify-center
                                ${status.isCurrent ? 'border-emerald-500 shadow-emerald-500/50' :
                                    status.label.includes('✅') ? 'border-purple-500 shadow-purple-500/50' :
                                      'border-blue-300'}`}>
                                  <div className={`w-1.5 h-1.5 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 rounded-full 
                                  ${status.isCurrent ? 'bg-emerald-500 animate-pulse' :
                                      status.label.includes('✅') ? 'bg-purple-500' :
                                        'bg-blue-400'}`} />
                                </div>

                                {/* Carte de réservation */}
                                <div className={`bg-white border rounded-xl sm:rounded-2xl p-2.5 sm:p-3 md:p-4 transition-all duration-300 hover:shadow-lg hover:border-blue-400/60
                                ${status.isCurrent ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-500/20' :
                                    status.label.includes('✅') ? 'border-purple-300' :
                                      'border-blue-200/60'}`}>

                                  {/* En-tête */}
                                  <div className="flex flex-wrap justify-between items-start gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-blue-900 text-[11px] sm:text-[13px] md:text-[14px] font-black uppercase tracking-tight truncate">
                                        {res.societeLocatrice}
                                      </p>

                                      <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1 flex-wrap">
                                        <span className={`text-[7px] sm:text-[8px] md:text-[10px] font-black px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full border
                                        ${status.statutReservation === 'Occupé'
                                            ? 'text-red-600 bg-red-50 border-red-200'
                                            : 'text-amber-600 bg-amber-50 border-amber-200'}`}>
                                          {status.statutReservation}
                                        </span>
                                        {res.agentNom && (
                                          <span className="text-[7px] sm:text-[8px] md:text-[9px] text-gray-500 font-medium truncate max-w-[80px] sm:max-w-[120px]">
                                            👤 {res.agentNom}
                                          </span>
                                        )}
                                      </div>

                                      {status.showDays && res.joursAvantExpiration > 0 && (
                                        <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1 flex-wrap">
                                          <span className="text-[7px] sm:text-[8px] md:text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full border border-blue-200">
                                            📅 {res.joursAvantExpiration}j
                                          </span>
                                          {res.expirationDateFormatted && (
                                            <span className="text-[6px] sm:text-[7px] md:text-[8px] text-gray-400 font-medium truncate max-w-[70px] sm:max-w-[120px]">
                                              Expire: {res.expirationDateFormatted}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {!res.validationComptable && res.statutPaiement !== 'payé' && res.joursAvantExpiration > 0 && (
                                        <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
                                          <span className="text-[7px] sm:text-[8px] md:text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full border border-amber-200">
                                            ⏳ {res.joursAvantExpiration}j
                                          </span>
                                        </div>
                                      )}

                                      {(res.validationComptable === true || res.statutPaiement === 'payé') && (
                                        <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
                                          <span className="text-[7px] sm:text-[8px] md:text-[10px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full border border-purple-200">
                                            ✅ {res.validationComptable ? 'Validé' : 'Payé'}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    <span className={`shrink-0 text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md border ${status.color}`}>
                                      {status.label}
                                    </span>
                                  </div>

                                  {/* Dates */}
                                  <div className="flex flex-wrap justify-between items-center gap-1.5 pt-1.5 border-t border-blue-100">
                                    <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4">
                                      <div className="flex flex-col">
                                        <span className="text-[6px] sm:text-[7px] md:text-[8px] text-blue-400 uppercase font-black">Début</span>
                                        <span className="text-[9px] sm:text-[10px] md:text-[12px] text-blue-900 font-bold">
                                          {new Date(res.dateDebut).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                          })}
                                        </span>
                                        {res.heureDebut && (
                                          <span className="text-[7px] sm:text-[8px] md:text-[9px] text-blue-500 font-medium flex items-center gap-0.5">
                                            <Clock size={8} className="sm:w-3 sm:h-3" />
                                            {res.heureDebut}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-end pb-1">
                                        <span className="text-blue-300 text-[8px] sm:text-[10px] md:text-[12px]">→</span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[6px] sm:text-[7px] md:text-[8px] text-blue-400 uppercase font-black">Fin</span>
                                        <span className="text-[9px] sm:text-[10px] md:text-[12px] font-bold text-blue-900">
                                          {new Date(res.dateFin).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                          })}
                                        </span>
                                        {res.heureFin && (
                                          <span className="text-[7px] sm:text-[8px] md:text-[9px] text-red-500 font-medium flex items-center gap-0.5">
                                            <Clock size={8} className="sm:w-3 sm:h-3" />
                                            {res.heureFin}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex gap-0.5 sm:gap-1">
                                      {res.validationComptable === true && (
                                        <div className="p-0.5 sm:p-1 bg-blue-100 text-blue-600 rounded-md border border-blue-200" title="Validé comptablement">
                                          <svg width="10" height="10" className="sm:w-3 sm:h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                                        </div>
                                      )}
                                      {res.facturee === "oui" && (
                                        <div className="p-0.5 sm:p-1 bg-amber-100 text-amber-600 rounded-md border border-amber-200" title="Facturée">
                                          <span className="text-[9px] sm:text-[11px] font-black">€</span>
                                        </div>
                                      )}
                                      {res.statutPaiement === "payé" && (
                                        <div className="p-0.5 sm:p-1 bg-emerald-100 text-emerald-600 rounded-md border border-emerald-200" title="Payée">
                                          <span className="text-[9px] sm:text-[11px] font-black">✓</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Heure d'affichage */}
                                  {res.statut === 'Occupé' && res.heureAffichage && (
                                    <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-amber-200/50 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                      <div className="flex items-center gap-1 sm:gap-1.5 bg-amber-50 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-amber-200">
                                        <Clock size={10} className="sm:w-3 sm:h-3 text-amber-600" />
                                        <span className="text-[7px] sm:text-[8px] md:text-[9px] font-bold text-amber-700">
                                          📺 {res.heureAffichage}
                                        </span>
                                      </div>
                                      {res.dateAffichage && (
                                        <span className="text-[6px] sm:text-[7px] md:text-[8px] text-amber-500 font-medium">
                                          {new Date(res.dateAffichage).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'short'
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="relative">
                            <div className="absolute -left-[17px] sm:-left-[21px] md:-left-[25px] top-2 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            </div>

                            <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 text-center space-y-1.5 sm:space-y-2 hover:bg-blue-100/50 transition-all cursor-pointer">
                              <div className="inline-flex p-1.5 sm:p-2 bg-blue-100 rounded-full text-blue-600">
                                <PlusCircle size={14} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
                              </div>
                              <h3 className="text-blue-700 text-[11px] sm:text-[13px] md:text-[15px] font-black uppercase tracking-tighter">Opportunité disponible !</h3>
                              <p className="text-blue-500/80 text-[10px] sm:text-[11px] md:text-[13px] leading-relaxed max-w-[200px] sm:max-w-[250px] mx-auto">
                                Cette face n'attend que votre visibilité.<br />
                                <span className="text-blue-900 font-bold italic">Réservez-la dès maintenant.</span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                    <div className="h-2 sm:h-4" />
                  </div>

                  {/* ACTIONS FIXES EN BAS */}
                  <div className="shrink-0 p-2 sm:p-3 bg-gradient-to-t from-white via-white/95 to-white/80 md:bg-transparent border-t border-blue-200/50 md:border-t-0">
                    <div className="flex gap-1.5 sm:gap-2">
                      <button
                        onClick={() => {
                          if (ouvrirLaCarte) ouvrirLaCarte();
                          onClose();
                        }}
                        className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 rounded-lg text-emerald-700 transition-all active:scale-95 border border-emerald-200"
                      >
                        <MapPin size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
                      </button>

                      <button
                        className={`flex-1 h-8 sm:h-9 md:h-10 rounded-lg font-black text-[8px] sm:text-[10px] md:text-[11px] uppercase flex items-center justify-center gap-1 transition-all active:scale-95 shadow-lg
                        ${isSelected
                            ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-red-500/30 hover:shadow-red-500/50'
                            : isLibreFinal
                              ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02]'
                              : 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02]'
                          }`}
                        onClick={() => {
                          if (isSelected) {
                            onSelect(selectionKey);
                            return;
                          }
                          onClose();
                          setTimeout(() => {
                            if (onEdit) {
                              onEdit(panneau, face);
                            }
                          }, 300);
                        }}
                      >
                        {isSelected ? (
                          <>
                            <MinusCircle size={10} className="sm:w-3 sm:h-3 md:w-4 md:h-4" />
                            <span className="hidden xs:inline">RETIRER</span>
                            <span className="xs:hidden">RETIRER</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle size={10} className="sm:w-3 sm:h-3 md:w-4 md:h-4" />
                            <span className="hidden xs:inline">RÉSERVER</span>
                            <span className="xs:hidden">RÉSERV</span>
                          </>
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
      {isReservationModalOpen && panneauForReservation && (
        <EditPanneauModal
          isOpen={isReservationModalOpen}
          onClose={() => {
            setIsReservationModalOpen(false);
            setPanneauForReservation(null);
            setFaceForReservation(null);
          }}
          panneau={panneauForReservation}
          face={faceForReservation}
          user={user}
        />
      )}

      <EditPanneauModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        panneau={panneau}
      />
    </>
  );
};


interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  panneauxData: any[];
}

import { serverTimestamp } from 'firebase/firestore';
import {
  Save,
  Camera,

} from 'lucide-react';
import {
  // Pour l'adresse
  Layers,      // Pour le type
  Maximize,    // Pour les dimensions
  // Pour le chargement
} from 'lucide-react';


import { useRef } from 'react';
import { doc, updateDoc, runTransaction, getDocs, } from 'firebase/firestore';
import { Layout, Upload, } from 'lucide-react';

// --- CONFIGURATION ---
const CLOUDINARY_URL = config.CLOUDINARY_URL;
const UPLOAD_PRESET = config.UPLOAD_PRESET;
const LOGO_DISPROMALT = logo;


const STATUTS_POSSIBLES = ["Libre", "Réservé"];

export const EditPanneauModal = ({ isOpen, onClose, panneau, user }: any) => {

  // ============================================
  // 1. TOUS LES HOOKS (useState, useRef, useContext)
  // ============================================
  const [localUser, setLocalUser] = useState<any>(null);
  const [conflitMessages, setConflitMessages] = useState<Record<number, string | null>>({});
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [listeSocietes, setListeSocietes] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuth();

  // ============================================
  // 2. TOUS LES useEffect
  // ============================================

  // Charger les données du panneau
  useEffect(() => {
    if (panneau) {
      setFormData({ ...panneau });
    }
  }, [panneau]);

  // Charger la liste des sociétés
  useEffect(() => {
    const fetchSocietes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "societes"));
        const noms = querySnapshot.docs.map(doc => doc.data().nomSociete);
        setListeSocietes(noms);
      } catch (err) {
        console.error("Erreur lors de la récupération des sociétés:", err);
      }
    };
    fetchSocietes();
  }, []);

  // Charger l'utilisateur depuis localStorage
  useEffect(() => {
    try {
      const rawData = localStorage.getItem('geomarketing_user_data');
      if (rawData) {
        const parsedData = JSON.parse(rawData);
        console.log('👤 EditPanneauModal - Utilisateur depuis localStorage:', parsedData);
        setLocalUser(parsedData);
      }
    } catch (error) {
      console.error('❌ EditPanneauModal - Erreur:', error);
    }
  }, []);

  // Vérifier les conflits de dates
  useEffect(() => {
    if (!formData?.faces) return;

    formData.faces.forEach((face: any, idx: number) => {
      if (face.statut === 'Occupé' || face.statut === 'Réservé') {
        if (!face.clientNom || !face.dateDebut || !face.dateFin) {
          setConflitMessages(prev => ({
            ...prev,
            [idx]: "⚠️ Complétez : Société, Date début et Date fin pour ce statut"
          }));
        } else {
          const d1 = new Date(face.dateDebut);
          const d2 = new Date(face.dateFin);
          if (d1 >= d2) {
            setConflitMessages(prev => ({
              ...prev,
              [idx]: "⚠️ La date de début doit être antérieure à la date de fin"
            }));
          } else {
            setConflitMessages(prev => ({ ...prev, [idx]: null }));
          }
        }
      }
    });
  }, [formData?.faces]);

  // ============================================
  // 3. RETURN CONDITIONNEL (après tous les hooks)
  // ============================================
  if (!isOpen || !formData) return null;

  // ============================================
  // 4. FONCTIONS DE GESTION DE DATE
  // ============================================

  const getCurrentUTCDate = () => {
    const now = new Date();
    const utcNow = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
      )
    );

    const joursSemaine = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    return {
      date: utcNow.toISOString().split('T')[0],
      time: utcNow.toISOString().split('T')[1].split('.')[0],
      dayOfWeek: joursSemaine[utcNow.getUTCDay()],
      dayNumber: utcNow.getUTCDay(),
      timestamp: utcNow.getTime(),
      isoString: utcNow.toISOString(),
      fullDate: utcNow.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
      })
    };
  };

  const isWorkingDay = (dayNumber: number): boolean => {
    return dayNumber >= 1 && dayNumber <= 5;
  };

  const addWorkingDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    let addedDays = 0;

    while (addedDays < days) {
      result.setUTCDate(result.getUTCDate() + 1);
      if (isWorkingDay(result.getUTCDay())) {
        addedDays++;
      }
    }

    return result;
  };

  const calculateExpirationDays = (dateFin: string, dateDebut?: string): number => {
    const now = new Date();
    const utcNow = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
      )
    );

    const startDate = dateDebut ? new Date(dateDebut) : utcNow;
    const endDate = new Date(dateFin);

    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(0, 0, 0, 0);

    if (endDate < startDate) return 0;

    // ✅ Calculer la différence en jours calendaires (et non ouvrables)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };


  const calculateExpirationDate = (createdAt: string) => {
    const DELAI_EXPIRATION_JOURS = 3;

    const creationDate = new Date(createdAt);
    creationDate.setUTCHours(0, 0, 0, 0);

    const expirationDate = addWorkingDays(creationDate, DELAI_EXPIRATION_JOURS);
    expirationDate.setUTCHours(23, 59, 59, 999);

    const joursSemaine = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    return {
      date: expirationDate.toISOString().split('T')[0],
      dateFormatted: expirationDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
      }),
      dayOfWeek: joursSemaine[expirationDate.getUTCDay()],
      isWorkingDay: isWorkingDay(expirationDate.getUTCDay()),
      timestamp: expirationDate.getTime(),
      isoString: expirationDate.toISOString(),
      joursRestants: calculateWorkingDaysRemaining(expirationDate)
    };
  };

  const calculateWorkingDaysRemaining = (expirationDate: Date): number => {
    const now = new Date();
    const utcNow = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
      )
    );

    const expDate = new Date(expirationDate);
    expDate.setUTCHours(0, 0, 0, 0);

    if (expDate < utcNow) return 0;

    // ✅ Compter en jours calendaires
    const diffTime = Math.abs(expDate.getTime() - utcNow.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  // ============================================
  // 5. FONCTION DE CONFIRMATION
  // ============================================

  const showReservationConfirmationModal = (
    reservation: any,
    faceLabel: string,
    user: any
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const currentUTC = getCurrentUTCDate();
      const isoNow = new Date().toISOString();

      const dateDebutFormatted = formatDateForDisplay(reservation.dateDebut);
      const dateFinFormatted = formatDateForDisplay(reservation.dateFin);
      const joursReservation = calculateExpirationDays(reservation.dateFin, reservation.dateDebut);

      const expirationInfo = calculateExpirationDate(isoNow);
      const joursRestants = expirationInfo.joursRestants;
      const dateExpirationFormatted = expirationInfo.dateFormatted;
      const heureExpiration = '23:59:59';
      const estOuvrable = isWorkingDay(currentUTC.dayNumber);

      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(10px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease;
      `;

      modal.innerHTML = `
  <div style="
    background: white;
    border-radius: 24px;
    max-width: 550px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    padding: 32px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease;
    position: relative;
  ">
    <div style="
  background: linear-gradient(135deg, #1e3a8a, #1e40af, #1e4fd9);
  margin: -32px -32px 24px -32px;
  padding: 24px 32px;
  border-radius: 24px 24px 0 0;
  position: sticky;
  top: -32px;
  z-index: 10;
  border-bottom: 2px solid rgba(255,255,255,0.1);
  box-shadow: 0 4px 20px rgba(30, 58, 138, 0.4);
">
  <div style="display: flex; align-items: center; justify-content: space-between;">
    <div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">📋</span>
        <span style="color: #bfdbfe; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.95;">
          Confirmation de réservation
        </span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px; margin-top: 6px;">
        <span style="
          font-size: 22px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 0.5px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          ${panneau.idPan || 'Panneau'}
        </span>
        <span style="
          background: rgba(255, 255, 255, 0.12);
          color: #bfdbfe;
          padding: 3px 16px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(4px);
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        ">
          Face ${faceLabel}
        </span>
      </div>
    </div>
    <button id="close-modal" style="
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      color: #bfdbfe;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    " 
    onmouseover="this.style.background='rgba(255,255,255,0.25)'; this.style.transform='rotate(90deg)'; this.style.color='white'"
    onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.transform='rotate(0deg)'; this.style.color='#bfdbfe'"
    >✕</button>
  </div>
</div>

    <!-- 📋 INSTRUCTIONS IMPORTANTES -->
    <div style="
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      border-left: 4px solid #f59e0b;
    ">
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 18px;">📌</span>
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">
            Instructions importantes
          </div>
          <ul style="
            margin: 6px 0 0 0;
            padding-left: 18px;
            font-size: 11px;
            color: #78350f;
            line-height: 1.6;
          ">
            <li>⚠️ Cette réservation doit être <strong>payée sous 3 jours ouvrables</strong></li>
            <li>⏰ Passé ce délai, la réservation sera <strong>automatiquement annulée</strong></li>
            <li>📧 Une confirmation sera envoyée à l'agent responsable</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 📊 INFORMATIONS DE LA RÉSERVATION -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
      <div style="background: #f8fafc; padding: 14px; border-radius: 12px;">
        <div style="font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Face</div>
        <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 2px;">${faceLabel}</div>
      </div>
      <div style="background: #f8fafc; padding: 14px; border-radius: 12px;">
        <div style="font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Client</div>
        <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 2px;">${reservation.societeLocatrice || 'N/A'}</div>
      </div>
    </div>

    <!-- 📅 PÉRIODE DE RÉSERVATION -->
    <div style="
      background: #eff6ff;
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 16px;
      border: 1px solid #bfdbfe;
    ">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
        <span style="font-size: 14px;">📅</span>
        <span style="font-size: 11px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">
          Période de réservation
        </span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Début</div>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${dateDebutFormatted}</div>
        </div>
        <div style="color: #94a3b8; font-size: 20px;">→</div>
        <div>
          <div style="font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Fin</div>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${dateFinFormatted}</div>
        </div>
      </div>
      <div style="margin-top: 6px; font-size: 10px; color: #64748b;">
        📆 ${joursReservation} jour(s) ouvrable(s) de location
      </div>
    </div>

    <!-- ⏱️ DÉLAI D'EXPIRATION -->
    <div style="
      background: ${joursRestants === 0 ? '#fef2f2' : '#f0fdf4'};
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 16px;
      border: 1px solid ${joursRestants === 0 ? '#fecaca' : '#bbf7d0'};
    ">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
        <span style="font-size: 14px;">⏱️</span>
        <span style="font-size: 11px; font-weight: 700; color: ${joursRestants === 0 ? '#dc2626' : '#16a34a'}; text-transform: uppercase; letter-spacing: 0.5px;">
          ${joursRestants === 0 ? '⚠️ Expiration immédiate' : 'Délai d\'expiration'}
        </span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${dateExpirationFormatted}</div>
          <div style="font-size: 10px; color: #64748b;">Heure : ${heureExpiration} (UTC)</div>
        </div>
        <div style="
          background: ${joursRestants === 0 ? '#ef4444' : '#22c55e'};
          color: white;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
        ">
          ${joursRestants === 0 ? '🔥 Expiré' : `${joursRestants}j restants`}
        </div>
      </div>
      <div style="margin-top: 6px; font-size: 10px; color: ${joursRestants === 0 ? '#dc2626' : '#64748b'};">
        ${joursRestants === 0 ? '🚨 Délai dépassé - Réservation annulée automatiquement' : `${joursRestants} jour(s) restant(s) pour effectuer le paiement`}
      </div>
    </div>

    <!-- 📍 DATE ET HEURE ACTUELLES -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
      <div style="background: #f8fafc; padding: 12px; border-radius: 12px;">
        <div style="font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Jour actuel</div>
        <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${currentUTC.dayOfWeek}</div>
        <div style="font-size: 10px; color: #64748b;">${currentUTC.date}</div>
      </div>
      <div style="background: #f8fafc; padding: 12px; border-radius: 12px;">
        <div style="font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Heure UTC</div>
        <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${currentUTC.time}</div>
        <div style="font-size: 10px; color: ${estOuvrable ? '#16a34a' : '#ef4444'};">
          ${estOuvrable ? '✅ Jour ouvrable' : '❌ Week-end'}
        </div>
      </div>
    </div>

    <!-- 👤 AGENT RESPONSABLE -->
    <div style="
      background: #f1f5f9;
      padding: 14px 16px;
      border-radius: 12px;
      margin-bottom: 20px;
    ">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span style="font-size: 12px;">👤</span>
        <span style="font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Agent responsable</span>
      </div>
      <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
        ${user?.nom || user?.nomComplet || user?.prenom || 'Agent non identifié'}
      </div>
      <div style="font-size: 11px; color: #64748b;">${user?.email || 'Email non disponible'}</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">ID: ${user?.id || user?.uid || 'N/A'}</div>
    </div>

    <!-- ✅ BOUTONS D'ACTION -->
    <div style="display: flex; gap: 12px; margin-top: 8px;">
      <button id="confirm-cancel" style="
        flex: 1;
        padding: 14px;
        background: #f1f5f9;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 700;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s;
      ">
        ✕ Annuler
      </button>
      <button id="confirm-ok" style="
        flex: 2;
        padding: 14px;
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        border: none;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 700;
        color: white;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        <span>✅</span>
        Confirmer la réservation
      </button>
    </div>

    <!-- 📌 NOTE DE BAS DE PAGE -->
    <div style="
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      letter-spacing: 0.3px;
    ">
      En confirmant, vous acceptez les conditions générales de réservation
    </div>

    <style>
      @keyframes fadeIn { 
        from { opacity: 0; } 
        to { opacity: 1; } 
      }
      @keyframes slideUp { 
        from { 
          opacity: 0; 
          transform: translateY(30px) scale(0.95); 
        } 
        to { 
          opacity: 1; 
          transform: translateY(0) scale(1); 
        } 
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      #confirm-ok:hover {
        transform: scale(1.02);
        box-shadow: 0 6px 24px rgba(37, 99, 235, 0.45);
      }
      #confirm-cancel:hover {
        background: #e2e8f0;
        border-color: #cbd5e1;
      }
      #close-modal:hover {
        background: rgba(255,255,255,0.2);
        transform: rotate(90deg);
      }
    </style>
  </div>
`;

      document.body.appendChild(modal);

      const cancelBtn = modal.querySelector('#confirm-cancel');
      const confirmBtn = modal.querySelector('#confirm-ok');

      const closeModal = (result: boolean) => {
        modal.style.transition = 'all 0.3s ease';
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        setTimeout(() => {
          modal.remove();
          resolve(result);
        }, 300);
      };

      cancelBtn?.addEventListener('click', () => closeModal(false));
      confirmBtn?.addEventListener('click', () => closeModal(true));
      modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(false); });

      const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(false); };
      document.addEventListener('keydown', handleEsc);

      const cleanup = () => document.removeEventListener('keydown', handleEsc);

      const newCloseModal = (result: boolean) => { cleanup(); closeModal(result); };
      cancelBtn?.addEventListener('click', () => newCloseModal(false));
      confirmBtn?.addEventListener('click', () => newCloseModal(true));
    });
  };

  // ============================================
  // 6. FONCTIONS DE LOGIQUE
  // ============================================

  const canEditFace = (face: any) => {
    return true;
  };

  const getReservationWarning = (face: any) => {
    if ((face.statut === "Occupé" || face.statut === "Réservé") && !canEditFace(face)) {
      return `Face réservée par un autre agent. Veuillez contacter le responsable pour négocier.`;
    }
    return null;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreviewUrl = URL.createObjectURL(file);
    const previewFaces = [...formData.faces];
    previewFaces[index].photoCampagneUrl = localPreviewUrl;
    setFormData({ ...formData, faces: previewFaces });

    setUploadingIndex(index);
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", UPLOAD_PRESET);

    try {
      const response = await fetch(CLOUDINARY_URL, { method: "POST", body: data });
      const result = await response.json();

      if (result.secure_url) {
        const finalFaces = [...formData.faces];
        finalFaces[index].photoCampagneUrl = result.secure_url;
        setFormData({ ...formData, faces: finalFaces });
      }
    } catch (error) {
      console.error("Erreur Cloudinary:", error);
      alert("Échec de l'upload.");
    } finally {
      setUploadingIndex(null);
    }
  };

  const updateFace = (index: number, field: string, value: any) => {
    const newFaces = [...formData.faces];
    newFaces[index] = { ...newFaces[index], [field]: value };
    setFormData({ ...formData, faces: newFaces });

    if (field === 'dateDebut' || field === 'dateFin') {
      const dateDebut = field === 'dateDebut' ? value : newFaces[index].dateDebut;
      const dateFin = field === 'dateFin' ? value : newFaces[index].dateFin;
      const reservationsExistantes = newFaces[index].reservations || [];
      const currentResId = newFaces[index].currentReservationId;
      checkDateConflict(index, dateDebut, dateFin, reservationsExistantes, currentResId);
    }

    if (field === 'statut' && (value === 'Occupé' || value === 'Réservé')) {
      const face = newFaces[index];
      if (!face.clientNom || !face.dateDebut || !face.dateFin) {
        setConflitMessages(prev => ({
          ...prev,
          [index]: "⚠️ Pour un statut Occupé/Réservé, veuillez remplir : Société, Date début et Date fin"
        }));
      }
    }
  };

  const checkDateConflict = (
    idx: number,
    dateDebut: string,
    dateFin: string,
    reservations: any[],
    currentReservationId?: string
  ) => {
    if (!dateDebut || !dateFin) {
      setConflitMessages(prev => ({
        ...prev,
        [idx]: "⚠️ Les dates de début et de fin sont obligatoires"
      }));
      return false;
    }

    const d1 = new Date(dateDebut);
    const d2 = new Date(dateFin);

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      setConflitMessages(prev => ({
        ...prev,
        [idx]: "⚠️ Dates invalides"
      }));
      return false;
    }

    if (d1 >= d2) {
      setConflitMessages(prev => ({
        ...prev,
        [idx]: `⚠️ La date de début (${dateDebut}) doit être STRICTEMENT antérieure à la date de fin (${dateFin})`
      }));
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d1 < today) {
      setConflitMessages(prev => ({
        ...prev,
        [idx]: `⚠️ La date de début ne peut pas être dans le passé`
      }));
      return false;
    }

    const hasOverlap = reservations.some((res) => {
      if (currentReservationId && res.id === currentReservationId) return false;
      if (!res.dateDebut || !res.dateFin) return false;

      const r1 = new Date(res.dateDebut);
      const r2 = new Date(res.dateFin);
      return (d1 <= r2 && d2 >= r1);
    });

    if (hasOverlap) {
      setConflitMessages(prev => ({
        ...prev,
        [idx]: `⚠️ CONFLIT : Cette période chevauche une réservation existante.`
      }));
      return false;
    }

    setConflitMessages(prev => ({ ...prev, [idx]: null }));
    return true;
  };

  const isButtonDisabled = isSaving || uploadingIndex !== null;

  // ============================================
  // 7. CRÉATION AUTOMATIQUE DE SOCIÉTÉ
  // ============================================

  const createSocieteIfNotExists = async (nomSociete: string) => {
    if (!nomSociete || nomSociete.trim() === '') return null;

    const nomPropre = nomSociete.trim().toUpperCase();

    const q = query(
      collection(db, "societes"),
      where("nomSociete", "==", nomPropre)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      try {
        const email = `${nomPropre.toLowerCase().replace(/\s/g, '')}@visiteur.com`;
        const password = Math.floor(100000 + Math.random() * 900000).toString();

        await addDoc(collection(db, "societes"), {
          nomSociete: nomPropre,
          email: email,
          password: password,
          role: "visiteur",
          telephone: "",
          actif: true,
          isOnline: false,
          createdAt: serverTimestamp(),
          lastSeen: null,
          derniereConnexion: null,
          createdBy: currentUser?.email || user?.email || "Système"
        });

        console.log(`✅ Société "${nomPropre}" créée avec succès`);
        await fetchSocietes();
        return true;
      } catch (error) {
        console.error("❌ Erreur création société:", error);
        return false;
      }
    }
    return true;
  };

  const fetchSocietes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "societes"));
      const noms = querySnapshot.docs.map(doc => doc.data().nomSociete);
      setListeSocietes([...new Set(noms)]);
    } catch (err) {
      console.error("Erreur lors de la récupération des sociétés:", err);
    }
  };

  // ============================================
  // 8. SAUVEGARDE
  // ============================================

  const handleSave = async () => {
    if (!localUser) {
      console.error('❌ Aucun utilisateur trouvé');
      alert('⚠️ Veuillez vous reconnecter pour effectuer cette action.');
      return;
    }

    console.log('👤 Sauvegarde avec utilisateur:', {
      id: localUser.id,
      email: localUser.email,
      nom: localUser.nom || localUser.nomComplet
    });

    const currentUTC = getCurrentUTCDate();
    console.log('📅 Date UTC actuelle:', currentUTC);

    // Validation complète
    const validationErrors: string[] = [];

    for (let idx = 0; idx < formData.faces.length; idx++) {
      const face = formData.faces[idx];
      const statut = face.statut;

      if (statut === 'Libre') continue;

      if (statut === 'Occupé' || statut === 'Réservé') {
        if (!face.clientNom || face.clientNom.trim() === '') {
          validationErrors.push(`Face ${idx + 1}: Le nom du client est obligatoire`);
        }
        if (!face.dateDebut) {
          validationErrors.push(`Face ${idx + 1}: La date de début est obligatoire`);
        }
        if (!face.dateFin) {
          validationErrors.push(`Face ${idx + 1}: La date de fin est obligatoire`);
        }

        if (face.dateDebut && face.dateFin) {
          const d1 = new Date(face.dateDebut);
          const d2 = new Date(face.dateFin);
          if (d1 >= d2) {
            validationErrors.push(`Face ${idx + 1}: La date de début doit être antérieure à la date de fin`);
          }
        }
      }
    }

    if (validationErrors.length > 0) {
      alert(`❌ Erreurs de validation :\n\n${validationErrors.join('\n')}`);
      return;
    }

    // Confirmation pour chaque face
    for (let i = 0; i < formData.faces.length; i++) {
      const face = formData.faces[i];
      if (face.statut !== 'Libre' && face.clientNom) {
        const reservationData = {
          dateDebut: face.dateDebut,
          dateFin: face.dateFin,
          societeLocatrice: face.clientNom
        };

        const faceLabel = `${formData.idPan} - Face ${i + 1}`;

        const confirmed = await showReservationConfirmationModal(
          reservationData,
          faceLabel,
          localUser || user
        );

        if (!confirmed) {
          alert('❌ Réservation annulée par l\'utilisateur.');
          return;
        }
      }
    }

    // Vérification des conflits
    const conflictErrors: string[] = [];

    for (let idx = 0; idx < formData.faces.length; idx++) {
      const face = formData.faces[idx];
      if (face.statut === 'Libre') continue;

      const dateDebut = face.dateDebut;
      const dateFin = face.dateFin;

      if (!dateDebut || !dateFin) continue;

      const d1 = new Date(dateDebut);
      const d2 = new Date(dateFin);
      const reservationsExistantes = face.reservations || [];

      const conflict = reservationsExistantes.find((res: any) => {
        if (!res.dateDebut || !res.dateFin) return false;
        const r1 = new Date(res.dateDebut);
        const r2 = new Date(res.dateFin);
        return (d1 <= r2 && d2 >= r1);
      });

      if (conflict) {
        conflictErrors.push(
          `Face ${idx + 1}: Conflit avec une réservation existante (${conflict.societeLocatrice || 'Autre client'}) du ${conflict.dateDebut} au ${conflict.dateFin}`
        );
      }
    }

    if (conflictErrors.length > 0) {
      alert(`❌ CONFLITS DE RÉSERVATION :\n\n${conflictErrors.join('\n')}\n\nUne réservation ne peut pas chevaucher une autre réservation, même partiellement.`);
      return;
    }

    const hasGlobalConflict = Object.values(conflitMessages).some(msg => msg !== null);
    if (hasGlobalConflict) {
      alert("Impossible de sauvegarder : Veuillez résoudre les conflits de dates avant d'enregistrer.");
      return;
    }

    setIsSaving(true);

    try {
      const societesACreer: string[] = [];
      for (const face of formData.faces) {
        if (face.statut !== 'Libre' && face.clientNom && face.clientNom.trim() !== '') {
          const nomClient = face.clientNom.trim().toUpperCase();
          const existeDeja = listeSocietes.some(s =>
            s && typeof s === 'string' && s.toUpperCase() === nomClient
          );
          if (!existeDeja && !societesACreer.includes(nomClient)) {
            societesACreer.push(nomClient);
          }
        }
      }

      for (const nomSociete of societesACreer) {
        await createSocieteIfNotExists(nomSociete);
      }

      await fetchSocietes();

      const docRef = doc(db, "panneaux", panneau?.id || formData?.id);

      await runTransaction(db, async (transaction) => {
        const panneauDoc = await transaction.get(docRef);
        if (!panneauDoc.exists()) throw new Error("Panneau introuvable");

        const isoNow = new Date().toISOString();
        const expirationInfo = calculateExpirationDate(isoNow);

        for (const [idx, f] of formData.faces.entries()) {
          if (f.statut === "Libre") continue;

          const reservationsExistantes = f.reservations || [];
          const d1 = new Date(f.dateDebut).getTime();
          const d2 = new Date(f.dateFin).getTime();

          const conflict = reservationsExistantes.find((res: any) => {
            const r1 = new Date(res.dateDebut).getTime();
            const r2 = new Date(res.dateFin).getTime();
            return d1 <= r2 && d2 >= r1 && res.agentEmail !== localUser?.email;
          });

          if (conflict) {
            setConflitMessages(prev => ({
              ...prev,
              [idx]: `⚠️ CONFLIT : Période déjà réservée par ${conflict.agentNom || 'un autre agent'}.`
            }));
            setIsSaving(false);
            return;
          }

          const nomClientSaisi = f.clientNom?.trim();
          if (nomClientSaisi) {
            const existeDeja = listeSocietes.some(s =>
              s && typeof s === 'string' && s.toLowerCase() === nomClientSaisi.toLowerCase()
            );

            if (!existeDeja) {
              const societeRef = doc(collection(db, "societes"));
              transaction.set(societeRef, {
                nom: nomClientSaisi,
                createdAt: serverTimestamp(),
                ajoutePar: localUser?.email || "Système"
              });
              listeSocietes.push(nomClientSaisi);
            }
          }
        }

        const dataToUpdate = {
          faces: formData.faces.map((f: any, i: number) => {
            const faceOriginale = panneau.faces[i];

            const aEteModifiee =
              f.dateDebut !== faceOriginale?.dateDebut ||
              f.clientNom !== faceOriginale?.societeLocatrice ||
              f.dateFin !== faceOriginale?.dateFin;

            const isOccupied = f.statut !== "Libre";

            let nouvellesReservations = f.reservations || [];

            if (isOccupied && aEteModifiee) {
              const finalPhotoUrl = (f.photoCampagneUrl && !f.photoCampagneUrl.startsWith('blob:'))
                ? f.photoCampagneUrl : (f.photoCampagneUrl || LOGO_DISPROMALT);

              const joursRestants = calculateExpirationDays(f.dateFin, f.dateDebut);
              const statutReservation = joursRestants === 0 ? 'Expiré' : (f.statut || 'Occupé');

              console.log(`📊 Réservation face ${i + 1}:`, {
                dateDebut: f.dateDebut,
                dateFin: f.dateFin,
                joursRestants,
                statut: statutReservation,
                jourActuel: currentUTC.dayOfWeek,
                estOuvrable: isWorkingDay(currentUTC.dayNumber)
              });

              const newRes = {
                // === INFORMATIONS AGENT ===
                agentId: localUser?.id || localUser?.uid || "unknown",
                agentEmail: localUser?.email || "agent@dispromalt.cd",
                agentNom: localUser?.nom || localUser?.nomComplet || localUser?.prenom || "Agent",

                // === DATES DE RÉSERVATION (location du panneau) ===
                dateDebut: f.dateDebut || "",
                dateFin: f.dateFin || "",

                // === DATE DE CRÉATION ===
                createdAt: isoNow,
                dateModification: isoNow,

                // === DATE D'EXPIRATION (10 jours ouvrables après création) ===
                expirationDate: expirationInfo.date,
                expirationDateFormatted: expirationInfo.dateFormatted,
                expirationDayOfWeek: expirationInfo.dayOfWeek,
                expirationIsWorkingDay: expirationInfo.isWorkingDay,
                delaiExpirationJours: 10,
                joursAvantExpiration: expirationInfo.joursRestants,

                // === STATUT DE LA RÉSERVATION ===
                statut: statutReservation,
                statutPaiement: "en attente",
                validationComptable: false,
                facturee: "non",
                modePaiement: "globale",

                // === INFORMATIONS DE LA RÉSERVATION ===
                societeLocatrice: f.clientNom || "Inconnu",
                photoCampagneUrl: finalPhotoUrl || "",

                // === MÉTADONNÉES ===
                createdBy: localUser?.id || localUser?.uid || "system",
                createdByEmail: localUser?.email || "system",
                dayOfWeek: currentUTC.dayOfWeek,
                isWorkingDay: isWorkingDay(currentUTC.dayNumber)
              };

              console.log('✅ Nouvelle réservation créée:', {
                agentId: newRes.agentId,
                agentNom: newRes.agentNom,
                statut: newRes.statut,
                joursRestants: newRes.joursAvantExpiration,
                isExpired: newRes.joursAvantExpiration === 0
              });

              nouvellesReservations = [...nouvellesReservations, newRes];
            }

            return {
              sens: f.sens || faceOriginale?.sens || `Face ${i + 1}`,
              reservations: nouvellesReservations,
              historique: f.historique || []
            };
          }),
          updatedAt: serverTimestamp()
        };

        transaction.update(docRef, dataToUpdate);
      });

      alert("✅ Mise à jour réussie !");
      onClose();
    } catch (error: any) {
      console.error("❌ Erreur détaillée:", error);
      alert("Erreur: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };





  // Surveiller les changements de statut pour valider les champs

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-2 sm:p-3 md:p-4">
      {/* FOND BLANC AVEC OMBRE ET EFFET DE PROFONDEUR */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        {/* Motif décoratif subtil */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-800 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>
        {/* Ligne décorative supérieure */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700" />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => handleImageUpload(e, parseInt(fileInputRef.current?.dataset.idx || "0"))}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative z-10 bg-white/95 backdrop-blur-xl border border-blue-200/50 w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl shadow-blue-900/10"
      >

        {/* HEADER ÉLÉGANT - BLEU ROI */}
        <div className="p-4 sm:p-5 md:p-6 border-b border-blue-200/50 flex justify-between items-center bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xl sm:rounded-2xl text-white shadow-lg shadow-blue-500/30">
              <Layout size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[8px] sm:text-[9px] text-blue-300 font-black uppercase tracking-wider">Détails du support</p>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black italic text-white">
                Support <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-200">{formData.idPan}</span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-red-500/80 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <X size={16} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
          </button>
        </div>

        {/* BODY SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 sm:space-y-8 custom-scrollbar bg-white">

          {/* CARTES INFORMATIVES ÉLÉGANTES - BLEU CLAIR */}
          {(formData.adresse || formData.type || formData.dimension) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {formData.adresse && (
                <div className="group bg-blue-50/80 backdrop-blur-sm border border-blue-200/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:border-blue-400/80 hover:shadow-lg hover:shadow-blue-200/50 transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={12} className="text-blue-600" />
                    <label className="text-[8px] sm:text-[9px] font-black text-blue-700 uppercase tracking-wider">Adresse</label>
                  </div>
                  <p className="text-[11px] sm:text-xs text-blue-900 font-medium break-words">{formData.adresse}</p>
                </div>
              )}

              {formData.type && (
                <div className="group bg-blue-50/80 backdrop-blur-sm border border-blue-200/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:border-blue-400/80 hover:shadow-lg hover:shadow-blue-200/50 transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers size={12} className="text-blue-600" />
                    <label className="text-[8px] sm:text-[9px] font-black text-blue-700 uppercase tracking-wider">Type</label>
                  </div>
                  <p className="text-[11px] sm:text-xs text-blue-900 font-medium">{formData.type}</p>
                </div>
              )}

              {formData.dimension && (
                <div className="group bg-blue-50/80 backdrop-blur-sm border border-blue-200/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:border-blue-400/80 hover:shadow-lg hover:shadow-blue-200/50 transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Maximize size={12} className="text-blue-600" />
                    <label className="text-[8px] sm:text-[9px] font-black text-blue-700 uppercase tracking-wider">Dimensions</label>
                  </div>
                  <p className="text-[11px] sm:text-xs text-blue-900 font-medium">{formData.dimension}</p>
                </div>
              )}
            </div>
          )}

          {/* SECTION GESTION DES FACES */}
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full" />
              <div>
                <h3 className="text-[10px] sm:text-[11px] font-black text-blue-900 uppercase tracking-[0.2em]">Gestion des faces</h3>
                <p className="text-[7px] sm:text-[8px] text-blue-400 uppercase">Configuration des faces du panneau</p>
              </div>
            </div>

            <div className="grid gap-4 sm:gap-5">
              {formData.faces?.map((face: any, idx: number) => {
                const warning = getReservationWarning(face);
                const isLocked = !canEditFace(face);

                return (
                  <motion.div
                    key={face.faceId || idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`bg-gradient-to-br from-blue-50/80 to-white border border-blue-200/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col gap-3 sm:gap-4 md:gap-5 group hover:border-blue-400/80 hover:shadow-lg hover:shadow-blue-200/50 transition-all duration-300 ${isLocked ? "opacity-75" : ""}`}
                  >
                    {/* ========== EN-TÊTE AVEC NUMÉRO DE FACE ========== */}
                    <div className="flex flex-row items-center justify-between gap-2 pb-2 sm:pb-3 border-b border-blue-200/40">
                      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-1 min-w-0">
                        <div className="w-0.5 h-4 sm:h-5 md:h-6 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[6px] sm:text-[7px] md:text-[8px] text-blue-600 font-black uppercase tracking-wider">Face</p>
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <h3 className="text-blue-900 text-sm sm:text-base md:text-lg font-black uppercase leading-tight truncate max-w-[120px] sm:max-w-none">
                              {formData?.idPan}{idx + 1}
                            </h3>
                            {face.sens && (
                              <span className="bg-blue-100 border border-blue-300 rounded-md px-1.5 py-0.5 sm:px-2 sm:py-0.5">
                                <span className="text-blue-700 text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase">
                                  {face.sens}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {warning && (
                        <div className="flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-1 rounded-md shrink-0 border border-red-200">
                          <AlertTriangle size={10} className="sm:w-3 sm:h-3" />
                          <span className="text-[6px] sm:text-[7px] font-medium uppercase hidden xs:inline">Alerte</span>
                        </div>
                      )}
                    </div>

                    {/* ========== CONTENU PRINCIPAL ========== */}
                    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-5 lg:gap-6 w-full">

                      {/* ========== CHAMPS DE SAISIE ========== */}
                      <div className="flex-1 grid grid-cols-1 gap-2 sm:gap-3 md:gap-4">
                        {/* Sur mobile: 1 colonne, sur desktop: 4 colonnes */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">

                          {/* Statut */}
                          <div className="space-y-0.5 sm:space-y-1">
                            <label className="text-[6px] sm:text-[7px] md:text-[8px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1">
                              <div className="w-0.5 h-0.5 bg-blue-600 rounded-full" /> Statut
                            </label>
                            <select
                              value={face.statut || ''}
                              onChange={(e) => updateFace(idx, 'statut', e.target.value)}
                              disabled={isLocked}
                              className="w-full bg-blue-50/50 border border-blue-200 rounded-lg text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs font-bold text-blue-800 p-1.5 sm:p-2 md:p-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all truncate"
                            >
                              {STATUTS_POSSIBLES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>

                          {/* Champs conditionnels */}
                          {(face.statut === "Occupé" || face.statut === "Réservé") && (
                            <>
                              {/* Société */}
                              <div className="space-y-0.5 sm:space-y-1">
                                <label className="text-[6px] sm:text-[7px] md:text-[8px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1">
                                  <div className="w-0.5 h-0.5 bg-blue-600 rounded-full" /> Société
                                </label>
                                <input
                                  list={`list-societes-${idx}`}
                                  value={face.clientNom || ''}
                                  disabled={isLocked}
                                  placeholder="Sélectionner..."
                                  onChange={(e) => updateFace(idx, 'clientNom', e.target.value)}
                                  className="w-full bg-blue-50/50 border border-blue-200 rounded-lg text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs text-blue-900 p-1.5 sm:p-2 md:p-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all placeholder:text-blue-400/50 truncate"
                                />
                                <datalist id={`list-societes-${idx}`}>
                                  {Array.from(new Set(listeSocietes || [])).filter(nom => nom?.trim()).map((nom, i) => (
                                    <option key={i} value={nom} />
                                  ))}
                                </datalist>
                              </div>

                              {/* Dates */}
                              <div className="space-y-0.5 sm:space-y-1 lg:col-span-2">
                                <label className="text-[6px] sm:text-[7px] md:text-[8px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1">
                                  <div className="w-0.5 h-0.5 bg-blue-600 rounded-full" /> Période
                                </label>
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                                  <input
                                    type="date"
                                    value={face.dateDebut || ''}
                                    onChange={(e) => updateFace(idx, 'dateDebut', e.target.value)}
                                    className="flex-1 bg-blue-50/50 border border-blue-200 rounded-lg text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs text-blue-900 p-1.5 sm:p-2 md:p-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                  />
                                  <span className="text-blue-400 self-center text-center hidden sm:inline">→</span>
                                  <input
                                    type="date"
                                    value={face.dateFin || ''}
                                    onChange={(e) => updateFace(idx, 'dateFin', e.target.value)}
                                    className="flex-1 bg-blue-50/50 border border-blue-200 rounded-lg text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs text-blue-900 p-1.5 sm:p-2 md:p-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Message d'avertissement */}
                        {warning && !(face.statut === "Occupé" || face.statut === "Réservé") && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-1.5 sm:p-2 mt-0.5 sm:mt-1">
                            <p className="text-[6px] sm:text-[7px] md:text-[8px] text-red-700 font-medium truncate">⚠️ {warning}</p>
                          </div>
                        )}

                        {/* Message de conflit de dates */}
                        {conflitMessages[idx] && (face.statut === "Occupé" || face.statut === "Réservé") && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-1.5 sm:p-2 mt-0.5 sm:mt-1">
                            <p className="text-[6px] sm:text-[7px] md:text-[8px] text-red-700 font-medium">{conflitMessages[idx]}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FOOTER ÉLÉGANT - BLEU ROI */}
        <div className="p-4 sm:p-5 md:p-6 bg-gradient-to-t from-blue-50/80 to-white backdrop-blur-sm border-t border-blue-200/50 flex justify-end items-center gap-3 sm:gap-4">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 transition-all rounded-xl hover:bg-blue-50"
          >
            Annuler
          </button>

          <button
            onClick={handleSave}
            disabled={isButtonDisabled}
            className={`relative overflow-hidden flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-full font-black uppercase text-[9px] sm:text-[10px] transition-all duration-300 shadow-lg
            ${isSaving
                ? "bg-blue-100 text-blue-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-95 group"
              }`}
          >
            {!isSaving && (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            )}

            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span className="hidden xs:inline">Enregistrement...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span className="hidden xs:inline">Enregistrer</span>
                <span className="xs:hidden">OK</span>
              </>
            )}
          </button>
        </div>

      </motion.div>
    </div>
  );
};