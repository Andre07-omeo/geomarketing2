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

import Footer from '@/components1/Footer';



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



// Toutes ces variables fonctionneront maintenant :
const firebaseConfig = config.firebaseConfig;
const GEOGRAPHIE = config.GEOGRAPHIE;





const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);


const logo = config.LOGO_DISPROMALT;





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
    modal.className = 'fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center';
    modal.innerHTML = `
    <div class="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 border border-white/20 shadow-2xl">
      <div class="text-center mb-4">
        <div class="w-16 h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-3">
          <svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-white mb-2">Télécharger l'image</h3>
        <p class="text-sm text-white/60">Voulez-vous enregistrer cette image sur votre appareil ?</p>
      </div>
      <div class="flex gap-3">
        <button id="cancel-download" class="flex-1 py-2 rounded-xl bg-white/10 text-white/70 text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition">Annuler</button>
        <button id="confirm-download" class="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-sm font-bold uppercase tracking-wider hover:shadow-lg transition">Télécharger</button>
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
      toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm z-50';
      toast.innerText = '📥 Téléchargement en cours...';
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

        toast.innerText = '✅ Téléchargement terminé !';
        toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg text-sm z-50';
        setTimeout(() => toast.remove(), 2000);

      } catch (err) {
        toast.innerText = '❌ Erreur lors du téléchargement';
        toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm z-50';
        setTimeout(() => toast.remove(), 3000);
      }
    });

    cancelBtn?.addEventListener('click', closeModal);

    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  };


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
            {/* IMAGE - Sans l'ombre en bas */}
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
}





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

const logoUrl = logo;

// --- 3. COMPOSANT PRINCIPAL ---
export default function UltimateSupervisor() {
  const router = useRouter();
  const { user, logout } = useAuth();

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


  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8); // 8 panneaux par page


  // Ajoutez ces states après les autres states
  const [globalPaymentMode, setGlobalPaymentMode] = useState<'total' | 'tranche'>('total');
  const [globalTranchesCount, setGlobalTranchesCount] = useState(1);
  const [totalFactureAmount, setTotalFactureAmount] = useState(0);


  const [tranchesCount, setTranchesCount] = useState<{ [key: string]: number }>({});


  const [dernierIdFacture, setDernierIdFacture] = useState(0); // <--- DOIT ÊTRE ICI
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

      alert("✅ Réservation supprimée avec succès !");

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


  const processOperations = async (type: 'unique' | 'selection' | 'delete', data?: any, index?: number) => {
    // 1. CAS PARTICULIER : SUPPRESSION
    if (type === 'delete' && data) {
      await handleDeleteReservation(data);
      return; // On s'arrête ici après suppression
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

    lancerFacturation(selection, totalFacture);
  };


  // 7. LA FONCTION QUI FAIT LA NAVIGATION (À placer juste en dessous ou au dessus)
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
      totalFacture: totalFacture
    }));

    localStorage.setItem('facture_preview_data', JSON.stringify(donneesCompletes));
    router.push('/generationpdf');
  };

  const reservationsEnAttente = useMemo(() => {

    //let compteurLocal = Number(dernierIdFacture) || 0;
    let compteurLocal = Number(dernierIdFacture) || 0;
    // 1. Sécurité de base
    if (!panneauxData || !user?.email) return [];

    // 2. Initialisation typée pour éviter l'erreur sur "list"
    const list: any[] = [];
    const emailConnecte = user.email.trim().toLowerCase();
    const annee = new Date().getFullYear();
    const maintenant = new Date();

    const mois = String(maintenant.getMonth() + 1).padStart(2, '0');

    panneauxData.forEach((panneau: any) => {
      // Vérification que "faces" existe bien
      const faces = panneau.faces || [];

      faces.forEach((face: any, faceIdx: number) => {
        // Accès sécurisé à ".reservations"
        const reservations = face.reservations || [];


        reservations.forEach((res: any, resIdx: number) => {


          // --- GÉNÉRATION DE L'ID UNIQUE ---
          compteurLocal++;

          const sequence = String(compteurLocal).padStart(3, '0');

          // PadStart transforme "1" en "000001"
          //const numeroSequence = String(compteurLocal).padStart(6, '0');
          const factureIdFormat = `${annee}.${mois}.${sequence}`;

          // 3. LOGIQUE DE FILTRAGE (selon ta structure BD)
          const emailReservation = (res.agentEmail || "").trim().toLowerCase();
          const appartientALutilisateur = emailReservation === emailConnecte;

          const estPretPourFacture =
            (res.facturee === "non" || !res.facturee) &&
            (res.statutPaiement === "en attente" || !res.statutPaiement) &&
            res.validationComptable !== true;

          if (appartientALutilisateur && estPretPourFacture) {
            // Calcul de la durée
            const debut = new Date(res.dateDebut);
            const fin = new Date(res.dateFin);
            const duree = Math.max(1, (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()));

            // 4. RÉCUPÉRATION DES ÉLÉMENTS (y compris "sens")
            const faceLabel = `${panneau.idPan}-${faceIdx + 1} (${face.sens || 'SANS SENS'})`;

            // Création de l'ID unique pour le panier
            const resUniqueId = `res-${panneau.id}-${faceIdx}-${resIdx}-${res.dateDebut}`;

            list.push({
              ...res,
              resUniqueId,
              faceLabel,
              factureIdFormat, // Ton ID : 2026.000.000001
              idPan: panneau.idPan,
              panelDocId: panneau.id,
              faceIndex: faceIdx,
              faceSens: face.sens,
              adresse: panneau.adresse,
              //type: panneau.type,
              dureeMois: duree,


              // 2. FORCE LES DATES ICI POUR LA FACTURE
              dateDebut: res.dateDebut,
              dateFin: res.dateFin,

              // 3. RÉCUPÈRE LE TYPE DEPUIS LE PANNEAU (très important !)
              type: panneau.type || "",

              //dateTri: new Date(res.createdAt).getTime(),

              dateTri: res.createdAt ? new Date(res.createdAt).getTime() : 0
            });
          }
        });
      });
    });

    // 5. TRI : LES PLUS RÉCENTS D'ABORD
    return list.sort((a, b) => b.dateTri - a.dateTri);

  }, [panneauxData, user?.email]);


  // --- ÉTATS FILTRES ---
  const [filters, setFilters] = useState({
    type: '',
    statut: '',
    format: '',
    pays: '',
    province: '',
    commune: '',
    district: '', // <--- AJOUTE CETTE LIGNE

  });

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

  const handleLogout = () => {
    if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
      logout();
      localStorage.clear();
      sessionStorage.clear();
      router.push('/');
    }
  };







  const [statsTab, setStatsTab] = useState<'perf' | 'gestion'>('perf');
  const [monthRange, setMonthRange] = useState(1);
  // Gestion de l'onglet actif (Performance ou Gestion)
  const [activeTab, setActiveTab] = useState<'stats' | 'reservations'>('stats');

  // Filtres pour la partie Gestion
  const [timeFilter, setTimeFilter] = useState<'avant' | 'present' | 'futur'>('present');
  const [monthCount, setMonthCount] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'tous' | 'en_cours' | 'en_attente' | 'expire'>('tous');

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


  const handlePhotoUpdate = async (e: React.ChangeEvent<HTMLInputElement>, resId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {

      console.log("Photo mise à jour pour :", resId);
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error);
    }
  };



  // 1. Déclare l'état tout en haut de ton composant

  // --- LOGIQUE DE FILTRAGE ---
  const getCommunes = () => {
    const { pays, province, district } = filters;

    // 1. Vérification par étapes pour éviter "Cannot read property of undefined"
    if (!pays || !GEOGRAPHIE[pays]) return [];
    if (!province || !GEOGRAPHIE[pays][province]) return [];

    const provinceData = GEOGRAPHIE[pays][province];

    // 2. Si un district est sélectionné
    if (district) {
      const communesDuDistrict = provinceData[district];
      // On vérifie que c'est bien un tableau avant de le renvoyer
      return Array.isArray(communesDuDistrict) ? communesDuDistrict : [];
    }

    // 3. Si aucun district (on aplatit tout), on s'assure de ne récupérer que des tableaux
    const allCommunes = Object.values(provinceData).flatMap(val =>
      Array.isArray(val) ? val : []
    );

    return [...new Set(allCommunes)];
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
  {/* Indicateur de chargement pendant le changement de page */ }
  {
    loading && (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    )
  }
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


      {/* NAV HEADER */}
      <nav className="fixed top-0 inset-x-0 z-[150] p-2 sm:p-3 md:p-4 lg:p-6 backdrop-blur-3xl transition-all duration-500">
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
        bg-gradient-to-r from-white/80 via-white/70 to-white/80 backdrop-blur-2xl border-white/30 shadow-2xl shadow-black/10
        border
        hover:border-amber-400/60
        hover:shadow-2xl hover:shadow-amber-400/10
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
                  src={logoUrl}
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
                  GESTION DIGITALE
                </span>
              </div>
            </div>

            {/* ========== BOUTONS DE NAVIGATION ========== */}
            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-2.5">
              {/* Accueil */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                className="group flex items-center justify-center p-2 xs:p-2.5 sm:px-3 sm:py-2.5 rounded-xl transition-all duration-300 bg-white/80 text-gray-600 shadow-sm hover:shadow-md hover:shadow-amber-400/20 border border-gray-100 active:bg-gray-100"
                aria-label="Accueil"
              >
                <Home size={16} className="xs:w-[17px] xs:h-[17px] sm:w-[18px] sm:h-[18px] text-gray-500 group-hover:text-amber-500 transition-all" />
                <span className="hidden sm:inline ml-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide group-hover:text-amber-500 transition-colors">
                  Accueil
                </span>
              </motion.button>

              {/* Carte */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={ouvrirLaCarte}
                className="group flex items-center justify-center p-2 xs:p-2.5 sm:px-3 sm:py-2.5 rounded-xl transition-all duration-300 bg-white/80 text-gray-600 shadow-sm hover:shadow-md hover:shadow-amber-400/20 border border-gray-100 active:bg-gray-100"
                aria-label="Carte"
              >
                <MapPin size={16} className="xs:w-[17px] xs:h-[17px] sm:w-[18px] sm:h-[18px] text-gray-500 group-hover:text-amber-500 transition-all group-hover:rotate-6" />
                <span className="hidden sm:inline ml-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide group-hover:text-amber-500 transition-colors">
                  Carte
                </span>
              </motion.button>

              {/* Rapport */}
              <Link href="/dashboard/superviseurs/rapport">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="group flex items-center justify-center p-2 xs:p-2.5 sm:px-3 sm:py-2.5 rounded-xl transition-all duration-300 bg-white/80 text-gray-600 shadow-sm hover:shadow-md hover:shadow-amber-400/20 border border-gray-100 cursor-pointer active:bg-gray-100"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                  <FilePieChart size={16} className="xs:w-[17px] xs:h-[17px] sm:w-[18px] sm:h-[18px] text-gray-500 group-hover:text-amber-500 transition-all group-hover:rotate-6" />
                  <span className="hidden sm:inline ml-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide group-hover:text-amber-500 transition-colors">
                    Rapports
                  </span>
                  <span className="relative hidden sm:block ml-1.5 text-[6px] bg-amber-500/20 text-amber-600 px-1 py-0.5 rounded-full font-black">
                    LIVE
                  </span>
                </motion.div>
              </Link>
            </div>


            {/* ========== USER SECTION ========== */}
            <div className="flex items-center gap-1 xs:gap-2 shrink-0 pl-1 xs:pl-2 sm:pl-3 lg:pl-4 border-l border-gray-200">
              {user ? (
                <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
                  {/* Infos utilisateur (cachées sur très petit écran) */}
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] sm:text-[11px] font-black text-gray-700 uppercase tracking-tight truncate max-w-[100px]">
                      {user.nom || user.nomComplet?.split(' ')[0] || 'Agent'}
                    </p>
                    <p className="text-[6px] sm:text-[7px] font-bold text-amber-500 uppercase tracking-wider">
                      {user.role || "Utilisateur"}
                    </p>
                  </div>

                  {/* Bouton déconnexion */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleLogout();
                    }}
                    className="group flex items-center gap-1 xs:gap-1.5 sm:gap-2 bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-500 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 rounded-full transition-all border border-red-200 active:scale-95 shadow-sm hover:shadow-md"
                    title="Déconnexion"
                  >
                    <img
                      src={logoUrl}
                      className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 rounded-full border border-amber-400 object-cover bg-white shadow-sm"
                      alt="Profil"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/default-avatar.png" }}
                    />
                    <LogOut size={12} className="xs:w-[13px] xs:h-[13px] sm:w-[14px] sm:h-[14px] flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="hidden xs:inline text-[8px] sm:text-[9px] font-bold uppercase">Déconnexion</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="group relative overflow-hidden px-3 xs:px-4 sm:px-5 py-1.5 xs:py-2 sm:py-2.5 rounded-xl font-black uppercase text-[8px] xs:text-[9px] sm:text-[10px] transition-all duration-300 bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative z-10 flex items-center gap-1">
                    <span>🔐</span>
                    <span className="hidden xs:inline">Connexion</span>
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </nav>
      {/* MAIN CONTENT */}
      <main className="relative z-20 max-w-[1800px] mx-auto px-6 pt-44 pb-40">
        <header className="mb-20 relative">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-red-600/5 blur-[100px] rounded-full pointer-events-none" />

          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10">

              {/* GAUCHE : TITRE ET STATS */}
              <div className="flex items-start gap-6 flex-1">
                <div className="w-[3px] h-24 bg-gradient-to-b from-red-600 to-transparent shadow-[0_0_15px_#ef4444] rounded-full mt-2" />
                <div className="space-y-4">
                  <h1 className="text-4xl lg:text-6xl font-[1000] text-white tracking-tighter uppercase italic leading-[0.9]">
                    GESTION <br />
                    <span className="text-[#d4af37]">DIGITALE</span> <br />
                    <span className="text-red-600 text-3xl lg:text-5xl not-italic tracking-[0.2em] font-black">PANNEAUX</span>
                  </h1>

                  <div className="flex items-center gap-4 bg-black/40 backdrop-blur-2xl px-6 py-4 rounded-3xl border border-white/10 w-fit">
                    <Globe size={16} className="text-[#d4af37]" />
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-white italic">
                        {filtered.length} <span className="text-[9px] text-red-500 not-italic ml-1 uppercase">Unités Filtrées</span>
                      </span>
                      <span className="text-lg font-black text-white italic">
                        {totalFaces} <span className="text-[9px] text-red-500 not-italic ml-1 uppercase">Faces Filtrées</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONTENEUR : Mode "Phone" forcé (étroit) même sur PC */}
              <div className="w-full lg:w-[320px] space-y-2 bg-white/5 p-3 rounded-[1.5rem] border border-white/5 backdrop-blur-xl shadow-2xl mx-auto">

                {/* Barre de Recherche : Version Mini */}
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d4af37]" size={14} />
                  <input
                    type="text"
                    placeholder="RECHERCHER..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-[9px] font-black uppercase outline-none focus:border-[#d4af37] text-white transition-all"
                  />
                </div>

                {/* Grille des Sélecteurs : 3 colonnes partout pour un gain de place vertical */}
                <div className="grid grid-cols-3 gap-1.5">
                  {/* 1. PAYS */}
                  <select
                    value={filters.pays}
                    onChange={(e) => setFilters({ ...filters, pays: e.target.value, province: '', district: '', commune: '' })}
                    className="bg-black/60 border border-white/10 rounded-lg p-1.5 text-[8px] font-black text-white uppercase outline-none"
                  >
                    <option value="">Pays</option>
                    {Object.keys(GEOGRAPHIE).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>

                  {/* 2. PROVINCE */}
                  <select
                    disabled={!filters.pays}
                    value={filters.province}
                    onChange={(e) => setFilters({ ...filters, province: e.target.value, district: '', commune: '' })}
                    className="bg-black/60 border border-white/10 rounded-lg p-1.5 text-[8px] font-black text-white uppercase outline-none disabled:opacity-20"
                  >
                    <option value="">Prov.</option>
                    {filters.pays && Object.keys(GEOGRAPHIE[filters.pays]).map(pr => (
                      <option key={pr} value={pr}>{pr}</option>
                    ))}
                  </select>

                  {/* 3. DISTRICT */}
                  <select
                    disabled={!filters.province}
                    value={filters.district}
                    onChange={(e) => setFilters({ ...filters, district: e.target.value, commune: '' })}
                    className="bg-black/60 border border-white/10 rounded-lg p-1.5 text-[8px] font-black text-white uppercase outline-none disabled:opacity-20"
                  >
                    <option value="">Dist.</option>
                    {filters.pays && filters.province && GEOGRAPHIE[filters.pays][filters.province] &&
                      Object.keys(GEOGRAPHIE[filters.pays][filters.province]).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                  </select>

                  {/* 4. COMMUNE (Prend 2 colonnes pour rester lisible) */}
                  <select
                    disabled={!filters.district}
                    value={filters.commune}
                    onChange={(e) => setFilters({ ...filters, commune: e.target.value })}
                    className="col-span-2 bg-black/60 border border-white/10 rounded-lg p-1.5 text-[8px] font-black text-white uppercase outline-none disabled:opacity-20"
                  >
                    <option value="">Commune</option>
                    {Array.isArray(getCommunes()) && getCommunes().map((c, index) => (
                      <option key={`${c}-${index}`} value={c}>{c}</option>
                    ))}
                  </select>

                  {/* 5. TYPE (Prend 1 colonne) */}
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="col-span-1 bg-black/60 border border-white/10 rounded-lg p-1.5 text-[8px] font-black text-white uppercase outline-none"
                  >
                    <option value="">Type</option>
                    {Array.from(new Set(panneauxData.map(p => p.type))).filter(Boolean).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Boutons de Statut : Version Mini-Pills */}
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {['Libre', 'Occupé', 'Maint.', 'Rés.'].map(s => {
                    // Mapping des noms courts vers les noms complets pour le filtrage
                    const statusMap: { [key: string]: string } = {
                      'Libre': 'Libre',
                      'Occupé': 'Occupé',
                      'Maintenance': 'Maintenance',
                      'Réservé': 'Réservé'
                    };
                    const fullStatus = statusMap[s];

                    const colorClass =
                      s === 'Libre' ? 'bg-green-600' :
                        s === 'Occupé' ? 'bg-blue-600' :
                          s === 'Maintenance' ? 'bg-red-600' :
                            'bg-orange-600';

                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFilters({ ...filters, statut: filters.statut === fullStatus ? '' : fullStatus })}
                        className={`py-1.5 rounded-md text-[7px] font-black uppercase border transition-all ${filters.statut === fullStatus
                          ? `${colorClass} text-white border-white`
                          : 'bg-black/40 border-white/5 text-white/60'
                          }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* BOUTONS D'OUVERTURE DANS LE HEADER */}
          <div className="flex gap-3 px-6 pb-4 mt-8">
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex-1 bg-black/50 backdrop-blur-sm border border-white/20 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#d4af37]/20 hover:border-[#d4af37]/50 transition-all duration-300 group"
            >
              <FilePieChart size={18} className="text-[#d4af37] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase text-white/90">Proformas ({reservationsEnAttente.length})</span>
            </button>

            <button
              onClick={() => setIsStatsOpen(true)}
              className="flex-1 bg-black/50 backdrop-blur-sm border border-white/20 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all duration-300 group"
            >
              <LayoutDashboard size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase text-white/90">Ma Performance</span>
            </button>
          </div>



          <AnimatePresence>
            {isCartOpen && (
              <>
                {/* OVERLAY AVEC FOND PHOTO FLOU */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsCartOpen(false)}
                  className="fixed inset-0 z-[100]"
                >
                  {/* Image de fond floutée */}
                  <div className="absolute inset-0">
                    <img
                      src="/fond.jpg"
                      alt="Background"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
                  </div>
                </motion.div>

                {/* PANEL LATÉRAL PREMIUM */}
                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-black/40 backdrop-blur-2xl border-l border-white/20 z-[101] shadow-2xl flex flex-col"
                >
                  {/* HEADER PREMIUM */}
                  <div className="relative p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                    {/* Effet de brillance */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />

                    <div className="flex justify-between items-center relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1 h-4 bg-gradient-to-b from-amber-400 to-yellow-500 rounded-full" />
                          <p className="text-[8px] font-black text-amber-400 uppercase tracking-[0.3em]">Facturation</p>
                        </div>
                        <h2 className="text-2xl font-black text-white">
                          Mes <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">Réservations</span>
                        </h2>
                        <p className="text-[9px] text-white/40 uppercase tracking-wider font-bold mt-1">
                          {reservationsEnAttente.length} réservation(s) en attente
                        </p>
                      </div>
                      <button
                        onClick={() => setIsCartOpen(false)}
                        className="group p-2 bg-white/10 hover:bg-red-500/80 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white group-hover:rotate-90 transition-transform duration-300">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* CONTENU SCROLLABLE */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                    <div className="grid grid-cols-1 gap-4">
                      {reservationsEnAttente.length === 0 ? (
                        /* ÉTAT VIDE */
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="text-center">
                            <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-4">
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/20">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                            </div>
                            <p className="text-white/50 text-base font-bold uppercase tracking-wider">Panier vide</p>
                            <p className="text-white/20 text-[10px] mt-2 max-w-[200px] mx-auto">
                              Vous n'avez aucune réservation en attente de facturation
                            </p>
                          </div>

                          {/* BOUTON FERMETURE EN BAS */}
                          <div className="absolute bottom-6 left-6 right-6">
                            <button
                              onClick={() => setIsCartOpen(false)}
                              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-lg transition-all active:scale-95"
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
                          const isTranche = paymentModes[key] === 'tranche';
                          const isSelected = selectedForPrint[key] || false;
                          const numeroOrdre = index + 1;
                          const uniqueKey = key || `temp-${index}`;

                          return (
                            <motion.div
                              key={uniqueKey}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={`group relative p-4 rounded-2xl border transition-all duration-300 ${isSelected
                                ? 'bg-gradient-to-r from-amber-500/15 to-amber-500/5 border-amber-400/50 shadow-lg shadow-amber-500/10'
                                : 'bg-white/5 border-white/10 hover:border-amber-400/30 hover:bg-white/10'
                                }`}
                            >
                              {/* HEADER CARTE */}
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-400 animate-pulse' : 'bg-white/30'}`} />
                                  <span className="text-[8px] font-black text-amber-400 uppercase tracking-wider">
                                    Réservation # {numeroOrdre}
                                  </span>
                                </div>
                                <button
                                  onClick={() => setSelectedForPrint(prev => ({ ...prev, [key]: !prev[key] }))}
                                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected
                                    ? 'bg-amber-500 border-amber-500'
                                    : 'border-white/30 hover:border-amber-400'
                                    }`}
                                >
                                  {isSelected && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </button>
                              </div>

                              {/* INFOS PRINCIPALES */}
                              <div className="mb-3">
                                <p className="text-white text-sm font-black uppercase truncate">{res.societeLocatrice}</p>
                                <p className="text-[10px] text-white/50 font-medium mt-0.5">
                                  Face: {res.faceLabel} • {res.dureeMois} mois
                                </p>
                              </div>

                              {/* SECTION PRIX */}
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="bg-black/20 rounded-xl p-2">
                                  <label className="text-[7px] text-white/40 uppercase font-bold block">Prix unitaire</label>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={unitPrice === 0 ? "" : unitPrice}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setPrices(prev => ({ ...prev, [key]: val === "" ? 0 : Number(val) }));
                                      }}
                                      placeholder="0"
                                      className="w-full bg-transparent text-sm text-white font-bold outline-none"
                                    />
                                    <span className="text-[10px] text-amber-400 font-bold">$</span>
                                  </div>
                                </div>
                                <div className="bg-black/20 rounded-xl p-2 text-right">
                                  <label className="text-[7px] text-white/40 uppercase font-bold block">Total</label>
                                  <span className="text-amber-400 text-sm font-black">
                                    {(unitPrice * res.dureeMois).toLocaleString()} $
                                  </span>
                                </div>
                              </div>

                              {/* BOUTONS D'ACTION */}
                              <div className="flex gap-2 mt-3 pt-2 border-t border-white/10">

                                <button
                                  onClick={() => processOperations('delete', res, index)}
                                  className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-black text-[8px] uppercase hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* FOOTER ACTIONS */}
                  {reservationsEnAttente.length > 0 && (
                    <div className="p-5 border-t border-white/10 bg-gradient-to-t from-black/60 to-transparent">

                      {/* SECTION MODE DE PAIEMENT GLOBAL */}
                      <div className="mb-4 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                        <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <CreditCard size={12} />
                          Mode de paiement - Global
                        </h3>

                        <div className="flex gap-2 mb-3">
                          {['total', 'tranche'].map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setGlobalPaymentMode(mode as 'total' | 'tranche')}
                              className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${globalPaymentMode === mode
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black'
                                  : 'bg-white/10 text-white/40 hover:text-white'
                                }`}
                            >
                              {mode === 'total' ? '💰 Paiement comptant' : '📅 Paiement en tranches'}
                            </button>
                          ))}
                        </div>

                        {globalPaymentMode === 'tranche' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-2 bg-black/20 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] text-white/60 uppercase font-bold">Nombre de tranches</span>
                              <input
                                type="number"
                                min="2"
                                max="12"
                                value={globalTranchesCount}
                                onChange={(e) => setGlobalTranchesCount(Math.max(2, Math.min(12, parseInt(e.target.value) || 2)))}
                                className="w-20 bg-black/40 border border-white/20 rounded-lg px-3 py-1 text-white text-center text-[10px] font-bold outline-none focus:border-amber-400"
                              />
                            </div>
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <div className="flex justify-between text-[8px] text-white/40">
                                <span>Total facture:</span>
                                <span className="text-amber-400 font-bold">{totalFactureAmount.toLocaleString()} $</span>
                              </div>
                              <div className="flex justify-between text-[8px] text-white/40 mt-1">
                                <span>Montant par tranche:</span>
                                <span className="text-amber-400 font-bold">{(totalFactureAmount / globalTranchesCount).toLocaleString()} $</span>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {globalPaymentMode === 'total' && totalFactureAmount > 0 && (
                          <div className="flex justify-between items-center pt-2 border-t border-white/10">
                            <span className="text-[8px] text-white/60 uppercase font-bold">Total à payer:</span>
                            <span className="text-amber-400 font-bold text-sm">{totalFactureAmount.toLocaleString()} $</span>
                          </div>
                        )}
                      </div>

                      {/* BOUTON PRINCIPAL */}
                      <button
                        disabled={Object.values(selectedForPrint).filter(v => v).length === 0}
                        onClick={() => processOperations('selection')}
                        className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 disabled:opacity-30 text-black py-4 rounded-xl font-black text-[11px] uppercase flex justify-between px-6 items-center hover:shadow-xl hover:shadow-amber-500/30 transition-all active:scale-[0.98]"
                      >
                        <span>📄 Facturer la sélection</span>
                        <span className="bg-black/20 px-3 py-1 rounded-full text-[10px]">
                          {Object.values(selectedForPrint).filter(v => v).length} face(s)
                        </span>
                      </button>

                      {/* BOUTONS SECONDAIRES */}
                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={() => {
                            // Sélectionner toutes les réservations
                            const allSelected: Record<string, boolean> = {};
                            reservationsEnAttente.forEach((res: any) => {
                              allSelected[res.resUniqueId] = true;
                            });
                            setSelectedForPrint(allSelected);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-white/10 border border-white/10 text-white/80 py-2.5 rounded-xl font-black text-[8px] uppercase hover:bg-white/20 transition-all"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <polyline points="9 12 11 14 15 10" />
                          </svg>
                          Tout sélectionner
                        </button>
                        <button
                          onClick={() => setIsCartOpen(false)}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 py-2.5 rounded-xl font-black text-[8px] uppercase hover:bg-red-500 hover:text-white transition-all"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                          Fermer
                        </button>
                      </div>

                      {/* INFOS UTILISATEUR */}
                      <div className="mt-4 pt-3 border-t border-white/5 text-center">
                        <p className="text-[9px] text-white/60 font-black uppercase tracking-wider">{user?.nomComplet || "Agent"}</p>
                        <p className="text-[7px] text-white/30 font-medium">{user?.email}</p>
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
                {/* OVERLAY AVEC FOND PHOTO FLOU */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsStatsOpen(false)}
                  className="fixed inset-0 z-[100]"
                >
                  <div className="absolute inset-0">
                    <img
                      src="/fond.jpg"
                      alt="Background"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                  </div>
                </motion.div>

                {/* PANEL LATÉRAL PREMIUM */}
                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-black/40 backdrop-blur-2xl border-l border-white/20 z-[101] flex flex-col shadow-2xl"
                >
                  {/* HEADER PREMIUM */}
                  <div className="relative p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />

                    <div className="flex justify-between items-center relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1 h-4 bg-gradient-to-b from-blue-400 to-blue-500 rounded-full" />
                          <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.3em]">Performance</p>
                        </div>
                        <h2 className="text-2xl font-black text-white">
                          Panel <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-500">Agent</span>
                        </h2>
                        <p className="text-[9px] text-white/40 uppercase tracking-wider font-bold mt-1">Performance & Suivi</p>
                      </div>
                      <button
                        onClick={() => setIsStatsOpen(false)}
                        className="group p-2 bg-white/10 hover:bg-red-500/80 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white group-hover:rotate-90 transition-transform duration-300">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* CONTENU SCROLLABLE */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">

                    {activeTab === 'stats' ? (
                      <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                        {/* CERCLE DE PERFORMANCE */}
                        <div className="flex flex-col items-center py-4">
                          <div className="relative w-40 h-40 flex items-center justify-center">
                            {/* Cercle de fond */}
                            <svg className="w-full h-full -rotate-90">
                              <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
                              <circle
                                cx="80" cy="80" r="70" fill="none"
                                stroke="url(#gradient)"
                                strokeWidth="8"
                                strokeDasharray="440"
                                strokeDashoffset={440 - (440 * Number(statsEfficacite().performance)) / 100}
                                className="transition-all duration-1000"
                              />
                            </svg>
                            {/* Gradient SVG */}
                            <svg width="0" height="0">
                              <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#3b82f6" />
                                  <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-3xl font-black text-white">{statsEfficacite().performance}%</span>
                              <span className="text-[8px] text-white/40 uppercase font-bold tracking-tighter">Efficacité</span>
                            </div>
                          </div>
                        </div>

                        {/* STATS RAPIDES */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:border-blue-500/30 transition-all">
                            <p className="text-2xl font-black text-white">{statsEfficacite().totalAgent}</p>
                            <p className="text-[8px] uppercase text-white/40 font-bold tracking-wider">Mes Actions</p>
                          </div>
                          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:border-blue-500/30 transition-all">
                            <p className="text-2xl font-black text-white">{statsEfficacite().totalGlobal}</p>
                            <p className="text-[8px] uppercase text-white/40 font-bold tracking-wider">Global Agence</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* FILTRES */}
                        <div className="space-y-4">
                          <div className="flex bg-white/10 p-1 rounded-xl border border-white/10 gap-1">
                            {['avant', 'present', 'futur'].map((t) => (
                              <button
                                key={t}
                                onClick={() => setTimeFilter(t as any)}
                                className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${timeFilter === t
                                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                                  : 'text-white/40 hover:text-white'
                                  }`}
                              >
                                {t === 'avant' ? 'Passé' : t === 'present' ? 'Présent' : 'Futur'}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {timeFilter !== 'present' && (
                              <div className="flex items-center justify-between bg-white/10 px-3 py-2 rounded-xl border border-white/10">
                                <span className="text-[8px] text-white/40 font-black uppercase">Mois :</span>
                                <input
                                  type="number"
                                  value={monthCount}
                                  onChange={(e) => setMonthCount(Math.max(1, parseInt(e.target.value)))}
                                  className="w-8 bg-transparent text-right font-black text-blue-400 outline-none text-xs"
                                />
                              </div>
                            )}
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value as any)}
                              className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-[9px] font-black uppercase text-white outline-none focus:border-blue-500/50 transition-all"
                            >
                              <option value="tous" className="bg-black">Tous les statuts</option>
                              <option value="Occupé" className="bg-black">Occupé (En cours)</option>
                              <option value="Reservé" className="bg-black">Réservé (En attente)</option>
                            </select>
                          </div>
                        </div>

                        {/* LISTE DES RÉSERVATIONS */}
                        <div className="space-y-2">
                          {getFilteredReservations().length === 0 ? (
                            <div className="text-center py-12">
                              <div className="w-12 h-12 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30">
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                  <line x1="16" y1="2" x2="16" y2="6" />
                                  <line x1="8" y1="2" x2="8" y2="6" />
                                  <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                              </div>
                              <p className="text-white/40 text-xs font-bold uppercase">Aucune réservation</p>
                              <p className="text-white/20 text-[8px] mt-1">Aucune réservation trouvée</p>
                            </div>
                          ) : (
                            getFilteredReservations().map((res, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:border-blue-500/40 transition-all group"
                              >
                                {/* PHOTO MINIATURE */}
                                <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-black border border-white/10">
                                  <img src={res.photoCampagneUrl} className="w-full h-full object-cover" alt="" />
                                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                    <input type="file" className="hidden" onChange={(e) => handlePhotoUpdate(e, res.id)} />
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                      <circle cx="12" cy="13" r="4" />
                                    </svg>
                                  </label>
                                </div>

                                {/* INFOS */}
                                <div className="flex-1 min-w-0 grid grid-cols-2 items-center gap-2">
                                  <div>
                                    <p className="text-[8px] font-black text-blue-400 truncate uppercase">{res.faceId}</p>
                                    <p className="text-[10px] text-white font-bold truncate uppercase leading-tight">{res.societeLocatrice}</p>
                                  </div>
                                  <div className="text-right flex flex-col items-end gap-1">
                                    <div className="flex flex-col">
                                      <p className="text-[8px] text-white/50 font-bold">{res.dateDebut}</p>
                                      <p className="text-[7px] text-white/20 uppercase">au {res.dateFin}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteReservation(res)}
                                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                  </div>

                  {/* BOTTOM PANEL */}
                  <div className="p-5 border-t border-white/10 bg-gradient-to-t from-black/60 to-transparent space-y-4">
                    {/* IDENTITÉ */}
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-black uppercase text-sm shadow-lg">
                        {user?.displayName?.[0] || "A"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white uppercase truncate">{user?.nomComplet || "Agent Kin-Geo"}</p>
                        <p className="text-[8px] text-white/40 truncate font-medium">{user?.email}</p>
                      </div>
                    </div>

                    {/* SWITCHER STATS / GESTION */}
                    <div className="flex bg-white/10 p-1 rounded-xl border border-white/10">
                      <button
                        onClick={() => setActiveTab('stats')}
                        className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'stats'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                          : 'text-white/40 hover:text-white'
                          }`}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M12 20V10M18 20V4M6 20v-4" />
                        </svg>
                        Stats
                      </button>
                      <button
                        onClick={() => setActiveTab('reservations')}
                        className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'reservations'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                          : 'text-white/40 hover:text-white'
                          }`}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                        </svg>
                        Gestion
                      </button>
                    </div>

                    {/* BOUTON FERMER */}
                    <button
                      onClick={() => setIsStatsOpen(false)}
                      className="w-full py-3 bg-white/10 border border-white/20 text-white/80 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all rounded-xl font-black uppercase text-[10px] tracking-[0.2em] active:scale-95"
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
                onEdit={handleEditPanneau}  // ← VÉRIFIE QUE CETTE LIGNE EXISTE

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







import { MinusCircle, Calendar, History, Activity, ShieldCheck, } from 'lucide-react';

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
          className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-3 md:p-4 bg-black/80 backdrop-blur-md"
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
            className="relative w-full max-w-5xl mx-auto bg-gradient-to-br from-black/95 via-black/90 to-black/95 backdrop-blur-xl border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl shadow-black/50"
          >
            {/* Effet de glow doré */}
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none" />

            {/* === INDICATEUR DE SWIPE (mobile) === */}
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </div>

            {/* === BOUTONS DE FERMETURE === */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 p-1.5 sm:p-2 bg-black/60 backdrop-blur-xl hover:bg-red-500/80 rounded-full transition-all duration-300 border border-white/10 active:scale-95"
            >
              <X size={14} className="sm:w-4 sm:h-4 text-white" />
            </button>

            {/* Bouton Fermer mobile */}
            <div className="sm:hidden absolute bottom-16 left-1/2 -translate-x-1/2 z-20">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 text-white text-[9px] font-black uppercase tracking-wider active:scale-95"
              >
                ✕ Fermer
              </button>
            </div>

            {/* Layout : photo compacte + contenu */}
            <div className="flex flex-col md:flex-row max-h-[90vh] sm:max-h-[85vh]">

              {/* --- SECTION PHOTO COMPACTE (30% de la hauteur sur mobile, 35% sur desktop) --- */}
              <div className="relative w-full md:w-[35%] lg:w-[32%] h-[28vh] sm:h-[32vh] md:h-auto shrink-0">
                <img
                  src={face.photoCampagneUrl || logo}
                  className="w-full h-full object-cover"
                  alt="Visual"
                />

                {/* Overlay léger */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

                {/* Badge Status compact */}
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full backdrop-blur-2xl border ${isLibre
                    ? 'bg-emerald-500/20 border-emerald-500/50'
                    : 'bg-rose-500/20 border-rose-500/50'}`}>
                    <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isLibre ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span className="text-[6px] sm:text-[7px] font-black uppercase">{isLibre ? 'Dispo' : 'Occ'}</span>
                  </div>
                </div>

                {/* Infos compactes sur l'image */}
                <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white italic leading-tight">
                    {panneau.idPan}
                  </h2>
                  <div className="flex gap-1 mt-0.5">
                    <span className="bg-amber-500 text-black text-[6px] sm:text-[7px] font-black px-1.5 py-0.5 rounded-md">
                      {face.sens}
                    </span>
                  </div>
                </div>
              </div>

              {/* --- SECTION CONTENU (plus d'espace) --- */}
              <div className="flex-1 flex flex-col bg-gradient-to-b from-black/50 to-black/30 overflow-hidden">

                {/* Header compact */}
                <div className="p-2 sm:p-3 md:p-4 border-b border-white/10">
                  <p className="text-amber-400 text-[7px] sm:text-[8px] font-black uppercase tracking-wider">
                    📍 {panneau.adresse?.substring(0, 50)}{panneau.adresse?.length > 50 ? '...' : ''}
                  </p>
                  {isSelected && (
                    <span className="inline-block mt-1 text-amber-400 text-[6px] sm:text-[7px] font-black bg-amber-400/20 px-1.5 py-0.5 rounded-full">
                      ✓ Sélectionné
                    </span>
                  )}
                </div>

                {/* ZONE SCROLLABLE OPTIMISÉE */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 custom-scrollbar">

                  {/* Métriques compactes - 3 cartes en ligne */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {[
                      { icon: <Zap size={10} className="sm:w-3 sm:h-3" />, label: "Visibilité", val: face.visibilite || 90 },
                      { icon: <Activity size={10} className="sm:w-3 sm:h-3" />, label: "Trafic", val: face.mobimetrie || 85 },
                      { icon: <ShieldCheck size={10} className="sm:w-3 sm:h-3" />, label: "Score", val: 98 },
                    ].map((m, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-3 text-center">
                        <div className="flex justify-center text-amber-400 mb-0.5">{m.icon}</div>
                        <p className="text-sm sm:text-base md:text-lg font-black text-white">{m.val}%</p>
                        <p className="text-[6px] sm:text-[7px] font-bold text-white/40 uppercase">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Timeline compacte */}
                  <section className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <Calendar size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-amber-400" />
                      <h4 className="text-white text-[10px] sm:text-[11px] md:text-[12px] font-black uppercase tracking-wider">Chronologie</h4>
                      <span className="text-[8px] sm:text-[9px] text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                        {reservations.length} campagne{reservations.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="relative border-l-2 border-white/15 ml-3 sm:ml-4 pl-5 sm:pl-6 space-y-4 sm:space-y-5">
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
                          let statusColor = "text-blue-400 bg-blue-400/10 border-blue-400/30";

                          if (isExpired) {
                            statusLabel = "Terminée";
                            statusColor = "text-white/40 bg-white/5 border-white/10";
                          } else if (isNearEnd) {
                            statusLabel = "Expire bientôt";
                            statusColor = "text-orange-500 bg-orange-500/10 border-orange-500/30";
                          } else if (isActive) {
                            statusLabel = "En cours";
                            statusColor = "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
                          }

                          return (
                            <div key={i} className="relative group">
                              {/* Point sur la timeline - agrandi */}
                              <div className={`absolute -left-[21px] sm:-left-[25px] top-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-[2.5px] bg-black flex items-center justify-center
              ${isNearEnd ? 'border-orange-500 shadow-orange-500/50' :
                                  isActive ? 'border-emerald-400 shadow-emerald-400/50' :
                                    'border-white/30'}`}>
                                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full 
                ${isNearEnd ? 'bg-orange-500 animate-pulse' :
                                    isActive ? 'bg-emerald-400 animate-pulse' :
                                      'bg-white/40'}`} />
                              </div>

                              {/* Carte de réservation - agrandie */}
                              <div className={`bg-gradient-to-br from-white/8 to-transparent backdrop-blur-sm border rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:shadow-lg
              ${isNearEnd ? 'border-orange-500/40 shadow-orange-500/5' :
                                  isActive ? 'border-emerald-400/30' :
                                    'border-white/10 hover:border-white/20'}`}>

                                {/* En-tête de la carte */}
                                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-amber-400 text-[10px] sm:text-[11px] md:text-[12px] font-black uppercase tracking-tight truncate">
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

                                {/* Dates - agrandies */}
                                <div className="flex justify-between items-center gap-2 pt-2 border-t border-white/10">
                                  <div className="flex gap-3 sm:gap-4">
                                    <div className="flex flex-col">
                                      <span className="text-[7px] sm:text-[8px] text-white/40 uppercase font-black">Début</span>
                                      <span className="text-[9px] sm:text-[10px] md:text-[11px] text-white font-bold">
                                        {new Date(res.dateDebut).toLocaleDateString('fr-FR')}
                                      </span>
                                    </div>
                                    <div className="flex items-end pb-1">
                                      <span className="text-white/30 text-[10px]">→</span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[7px] sm:text-[8px] text-white/40 uppercase font-black">Fin</span>
                                      <span className={`text-[9px] sm:text-[10px] md:text-[11px] font-bold ${isNearEnd ? 'text-orange-500' : 'text-white'}`}>
                                        {new Date(res.dateFin).toLocaleDateString('fr-FR')}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Badges supplémentaires */}
                                  <div className="flex gap-1">
                                    {res.validationComptable === true && (
                                      <div className="p-1 bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/30" title="Validé comptablement">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                                      </div>
                                    )}
                                    {res.facturee === "oui" && (
                                      <div className="p-1 bg-amber-500/20 text-amber-500 rounded-md border border-amber-500/30" title="Facturée">
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
                        /* Message opportunité - agrandi */
                        <div className="relative">
                          <div className="absolute -left-[21px] sm:-left-[25px] top-2 w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-black flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          </div>

                          <div className="bg-gradient-to-br from-amber-500/10 to-transparent border-2 border-dashed border-amber-500/40 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center space-y-2 hover:bg-amber-500/15 transition-all cursor-pointer">
                            <div className="inline-flex p-2 bg-amber-500/20 rounded-full text-amber-400">
                              <PlusCircle size={16} className="sm:w-5 sm:h-5" />
                            </div>
                            <h3 className="text-amber-400 text-[11px] sm:text-[12px] font-black uppercase tracking-tighter">Opportunité disponible !</h3>
                            <p className="text-white/60 text-[9px] sm:text-[10px] leading-relaxed max-w-[250px] mx-auto">
                              Cette face n'attend que votre visibilité.<br />
                              <span className="text-white font-bold italic">Réservez-la dès maintenant.</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                  {/* Espace pour boutons fixes */}
                  <div className="h-12 sm:h-14" />
                </div>

                {/* Actions fixes en bas - compactes */}
                <div className="absolute bottom-0 left-0 right-0 md:static p-2 sm:p-3 bg-gradient-to-t from-black/95 via-black/90 to-black/80 md:bg-transparent border-t border-white/10 md:border-t-0 mt-auto">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { ouvrirLaCarte(); onClose(); }}
                      className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-white transition-all active:scale-95 border border-white/10"
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
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-amber-500/30 hover:shadow-amber-500/50'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
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





import { serverTimestamp } from 'firebase/firestore';
import {
  Save,
  Camera,

} from 'lucide-react';
import { panneaux } from '@/data/panneaux';
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


const STATUTS_POSSIBLES = ["Libre", "Occupé", "En Maintenance", "Réservé"];

export const EditPanneauModal = ({ isOpen, onClose, panneau, user }: any) => {



  const [conflitMessages, setConflitMessages] = useState<Record<number, string | null>>({});
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [listeSocietes, setListeSocietes] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuth();





  useEffect(() => {
    if (panneau) {
      setFormData({ ...panneau });
    }
  }, [panneau]);

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
          // Vérifier aussi les dates
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


  if (!isOpen || !formData) return null;



  const canEditFace = (face: any) => {
    return true;
  };

  const getReservationWarning = (face: any) => {
    // Si la face est verrouillée par un autre, on retourne le message
    if ((face.statut === "Occupé" || face.statut === "Réservé") && !canEditFace(face)) {
      return `Face réservée par un autre agent. Veuillez contacter le responsable pour négocier.`;
    }
    return null;
  };


  // 3. CONDITION DE SORTIE (Après les hooks)

  // 4. LES FONCTIONS DE LOGIQUE
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {

    const file = e.target.files?.[0];
    if (!file) return;

    // Utilisation correcte du setter

    // Prévisualisation locale immédiate
    const localPreviewUrl = URL.createObjectURL(file);
    const previewFaces = [...formData.faces];
    previewFaces[index].photoCampagneUrl = localPreviewUrl;
    setFormData({ ...formData, faces: previewFaces });

    // Utilisation correcte du setter
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


  const isOwner = (face: any) => {
    return face.agentEmail === currentUser?.email;
  };




  const removePhoto = (index: number) => {
    const newFaces = [...formData.faces];
    newFaces[index].photoCampagneUrl = "";
    // Si on supprime la photo, on réinitialise souvent le statut ou on laisse l'utilisateur choisir
    setFormData({ ...formData, faces: newFaces });
  };
  const updateFace = (index: number, field: string, value: any) => {
    const newFaces = [...formData.faces];
    newFaces[index] = { ...newFaces[index], [field]: value };
    setFormData({ ...formData, faces: newFaces });

    // Vérification des dates en temps réel
    if (field === 'dateDebut' || field === 'dateFin') {
      const dateDebut = field === 'dateDebut' ? value : newFaces[index].dateDebut;
      const dateFin = field === 'dateFin' ? value : newFaces[index].dateFin;
      const reservationsExistantes = newFaces[index].reservations || [];

      // Passer l'ID de réservation si on édite une existante
      const currentResId = newFaces[index].currentReservationId;
      checkDateConflict(index, dateDebut, dateFin, reservationsExistantes, currentResId);
    }

    // Si on change le statut vers Occupé ou Réservé, vérifier les champs obligatoires
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
    currentReservationId?: string // Pour identifier la réservation en cours d'édition
  ) => {
    // 1. Vérification des champs obligatoires
    if (!dateDebut || !dateFin) {
      setConflitMessages(prev => ({
        ...prev,
        [idx]: "⚠️ Les dates de début et de fin sont obligatoires"
      }));
      return false;
    }

    const d1 = new Date(dateDebut);
    const d2 = new Date(dateFin);

    // 2. Vérifier que les dates sont valides
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      setConflitMessages(prev => ({
        ...prev,
        [idx]: "⚠️ Dates invalides"
      }));
      return false;
    }

    // 3. Vérification CRITIQUE : date début MUST BE < date fin
    if (d1 >= d2) {
      setConflitMessages(prev => ({
        ...prev,
        [idx]: `⚠️ La date de début (${dateDebut}) doit être STRICTEMENT antérieure à la date de fin (${dateFin})`
      }));
      return false;
    }

    // 4. Vérification que la date début n'est pas dans le passé (optionnel)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d1 < today) {
      setConflitMessages(prev => ({
        ...prev,
        [idx]: `⚠️ La date de début ne peut pas être dans le passé`
      }));
      return false;
    }

    // 5. Vérification des chevauchements avec les réservations existantes
    // Une réservation ne peut PAS inclure ou chevaucher une autre réservation
    const hasOverlap = reservations.some((res) => {
      // Ignorer la réservation en cours d'édition
      if (currentReservationId && res.id === currentReservationId) return false;

      if (!res.dateDebut || !res.dateFin) return false;

      const r1 = new Date(res.dateDebut);
      const r2 = new Date(res.dateFin);

      const overlap = (d1 <= r2 && d2 >= r1);

      return overlap;
    });

    if (hasOverlap) {
      setConflitMessages(prev => ({
        ...prev,
        [idx]: `⚠️ CONFLIT : Cette période chevauche une réservation existante. Les périodes ne peuvent pas se chevaucher, même partiellement.`
      }));
      return false;
    }

    // 6. Plus de conflit
    setConflitMessages(prev => ({ ...prev, [idx]: null }));
    return true;
  };




  const isButtonDisabled = isSaving || uploadingIndex !== null;

  const handleSave = async () => {
    // === 1. VALIDATION COMPLÈTE DE TOUTES LES FACES ===
    const validationErrors: string[] = [];

    for (let idx = 0; idx < formData.faces.length; idx++) {
      const face = formData.faces[idx];
      const statut = face.statut;

      // Cas 1: Statut Libre - Pas de validation supplémentaire
      if (statut === 'Libre') continue;

      // Cas 2: Statut Occupé ou Réservé - Validation stricte
      if (statut === 'Occupé' || statut === 'Réservé') {
        // Vérifier que tous les champs sont remplis
        if (!face.clientNom || face.clientNom.trim() === '') {
          validationErrors.push(`Face ${idx + 1}: Le nom du client est obligatoire`);
        }
        if (!face.dateDebut) {
          validationErrors.push(`Face ${idx + 1}: La date de début est obligatoire`);
        }
        if (!face.dateFin) {
          validationErrors.push(`Face ${idx + 1}: La date de fin est obligatoire`);
        }

        // Vérifier l'ordre des dates si elles existent
        if (face.dateDebut && face.dateFin) {
          const d1 = new Date(face.dateDebut);
          const d2 = new Date(face.dateFin);
          if (d1 >= d2) {
            validationErrors.push(`Face ${idx + 1}: La date de début doit être antérieure à la date de fin`);
          }
        }
      }
    }

    // Afficher les erreurs de validation
    if (validationErrors.length > 0) {
      alert(`❌ Erreurs de validation :\n\n${validationErrors.join('\n')}`);
      return;
    }

    // === 2. VÉRIFICATION DES CONFLITS AVEC LES RÉSERVATIONS EXISTANTES ===
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

      // Vérifier les chevauchements (exclure la réservation en cours d'édition)
      const conflict = reservationsExistantes.find((res: any) => {
        // Si c'est une nouvelle réservation, on vérifie tout
        if (!res.dateDebut || !res.dateFin) return false;

        const r1 = new Date(res.dateDebut);
        const r2 = new Date(res.dateFin);

        // Chevauchement strict
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

    // === 3. Vérification des messages de conflit existants ===
    const hasGlobalConflict = Object.values(conflitMessages).some(msg => msg !== null);
    if (hasGlobalConflict) {
      alert("Impossible de sauvegarder : Veuillez résoudre les conflits de dates avant d'enregistrer.");
      return;
    }

    // === 4. SUITE DE LA SAUVEGARDE ===
    setIsSaving(true)
    // On ne valide que les faces où l'utilisateur a commencé à saisir quelque chose
    const isInvalid = formData.faces.some((f: any) => {
      // Une face doit être validée UNIQUEMENT si elle est occupée 
      // ET qu'elle n'est pas déjà enregistrée (pour ne pas bloquer les anciennes)
      const aCommenceSaisie = f.dateDebut || f.dateFin || f.clientNom;
      const estOccupée = f.statut !== "Libre";

      if (estOccupée && aCommenceSaisie) {
        // Si on a commencé, alors TOUT doit être rempli
        return !f.dateDebut || !f.dateFin || !f.clientNom;
      }
      return false;
    });

    if (isInvalid) {
      alert("Veuillez remplir les dates et le nom du client pour la face que vous modifiez.");
      return;
    }

    if (isInvalid) {
      alert("Veuillez remplir les dates et le nom du client pour toutes les faces occupées.");
      return;
    }

    setIsSaving(true);

    try {
      const docRef = doc(db, "panneaux", panneau?.id || formData?.id);

      await runTransaction(db, async (transaction) => {
        const panneauDoc = await transaction.get(docRef);
        if (!panneauDoc.exists()) throw new Error("Panneau introuvable");

        const isoNow = new Date().toISOString();

        // --- GESTION DES SOCIÉTÉS ET VÉRIFICATION DES CONFLITS ---
        for (const [idx, f] of formData.faces.entries()) {
          if (f.statut === "Libre") continue;

          const reservationsExistantes = f.reservations || [];
          const d1 = new Date(f.dateDebut).getTime();
          const d2 = new Date(f.dateFin).getTime();

          const conflict = reservationsExistantes.find((res: any) => {
            const r1 = new Date(res.dateDebut).getTime();
            const r2 = new Date(res.dateFin).getTime();
            return d1 <= r2 && d2 >= r1 && res.agentEmail !== currentUser?.email;
          });

          if (conflict) {
            setConflitMessages(prev => ({
              ...prev,
              [idx]: `⚠️ CONFLIT : Période déjà réservée par ${conflict.agentNom || 'un autre agent'}.`
            }));
            setIsSaving(false);
            return;
          }

          // Enregistrement de la société si nouvelle
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
                ajoutePar: currentUser?.email || "Système"
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

            // 3. Logique de création de la nouvelle réservation
            let nouvellesReservations = f.reservations || [];

            if (isOccupied && aEteModifiee) {
              const finalPhotoUrl = (f.photoCampagneUrl && !f.photoCampagneUrl.startsWith('blob:'))
                ? f.photoCampagneUrl : (f.photoCampagneUrl || LOGO_DISPROMALT);

              const newRes = {
                agentEmail: user?.email || "agent@dispromalt.cd",
                agentNom: user?.nomComplet || "Agent",
                dateDebut: f.dateDebut || "",
                dateFin: f.dateFin || "",
                validationComptable: false,
                facturee: "non",
                statutPaiement: "en attente",
                modePaiement: "globale",
                createdAt: isoNow,
                dateModification: isoNow,
                photoCampagneUrl: finalPhotoUrl || "",
                societeLocatrice: f.clientNom || "Inconnu",
                statut: f.statut || "Occupé"
              };

              // ON AJOUTE la nouvelle réservation seulement si elle est nouvelle
              nouvellesReservations = [...nouvellesReservations, newRes];
            }

            return {
              sens: f.sens || faceOriginale?.sens || `Face ${i + 1}`,
              // On rend le tableau mis à jour (avec la nouvelle res) ou l'ancien (si pas de modif)
              reservations: nouvellesReservations,
              historique: f.historique || []
            };
          }),
          updatedAt: serverTimestamp()
        };
        transaction.update(docRef, dataToUpdate);
      });

      alert("Mise à jour réussie !");
      onClose();
    } catch (error: any) {
      console.error("Erreur détaillée:", error);
      alert("Erreur: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };


  // Surveiller les changements de statut pour valider les champs

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-2 sm:p-3 md:p-4">
      {/* IMAGE DE FOND AVEC EFFET FLOU */}
      <div className="absolute inset-0 z-0">
        <img
          src="/fond.jpg"
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
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
        className="relative z-10 bg-black/40 backdrop-blur-xl border border-white/20 w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
      >

        {/* HEADER ÉLÉGANT */}
        <div className="p-4 sm:p-5 md:p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-white/5 to-transparent">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl sm:rounded-2xl text-black shadow-lg">
              <Layout size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[8px] sm:text-[9px] text-amber-400 font-black uppercase tracking-wider">Détails du support</p>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black italic text-white">
                Support <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">{formData.idPan}</span>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 sm:space-y-8 custom-scrollbar">

          {/* CARTES INFORMATIVES ÉLÉGANTES */}
          {(formData.adresse || formData.type || formData.dimension) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {formData.adresse && (
                <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:border-amber-400/50 transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={12} className="text-amber-400" />
                    <label className="text-[8px] sm:text-[9px] font-black text-amber-400 uppercase tracking-wider">Adresse</label>
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/90 font-medium break-words">{formData.adresse}</p>
                </div>
              )}

              {formData.type && (
                <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:border-amber-400/50 transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers size={12} className="text-amber-400" />
                    <label className="text-[8px] sm:text-[9px] font-black text-amber-400 uppercase tracking-wider">Type</label>
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/90 font-medium">{formData.type}</p>
                </div>
              )}

              {formData.dimension && (
                <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:border-amber-400/50 transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Maximize size={12} className="text-amber-400" />
                    <label className="text-[8px] sm:text-[9px] font-black text-amber-400 uppercase tracking-wider">Dimensions</label>
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/90 font-medium">{formData.dimension}</p>
                </div>
              )}
            </div>
          )}

          {/* SECTION GESTION DES FACES */}
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-amber-400 to-yellow-500 rounded-full" />
              <div>
                <h3 className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-[0.2em]">Gestion des faces</h3>
                <p className="text-[7px] sm:text-[8px] text-white/40 uppercase">Configuration des faces du panneau</p>
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
                    className={`bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm border rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col gap-3 sm:gap-4 md:gap-5 group hover:border-amber-400/40 transition-all duration-300 ${isLocked ? "opacity-75" : ""}`}
                  >
                    {/* ========== EN-TÊTE AVEC NUMÉRO DE FACE ========== */}
                    <div className="flex flex-row items-center justify-between gap-2 pb-2 sm:pb-3 border-b border-white/10">
                      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-1 min-w-0">
                        <div className="w-0.5 h-4 sm:h-5 md:h-6 bg-gradient-to-b from-amber-400 to-yellow-500 rounded-full" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[6px] sm:text-[7px] md:text-[8px] text-amber-400 font-black uppercase tracking-wider">Face</p>
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <h3 className="text-white text-sm sm:text-base md:text-lg font-black uppercase leading-tight truncate max-w-[120px] sm:max-w-none">
                              {formData?.idPan}{idx + 1}
                            </h3>
                            {face.sens && (
                              <span className="bg-amber-500/20 border border-amber-500/30 rounded-md px-1.5 py-0.5 sm:px-2 sm:py-0.5">
                                <span className="text-amber-400 text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase">
                                  {face.sens}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {warning && (
                        <div className="flex items-center gap-1 text-red-400 bg-red-500/10 px-1.5 py-1 rounded-md shrink-0">
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
                            <label className="text-[6px] sm:text-[7px] md:text-[8px] font-black text-white/50 uppercase tracking-wider flex items-center gap-1">
                              <div className="w-0.5 h-0.5 bg-amber-400 rounded-full" /> Statut
                            </label>
                            <select
                              value={face.statut || ''}
                              onChange={(e) => updateFace(idx, 'statut', e.target.value)}
                              disabled={isLocked}
                              className="w-full bg-black/40 border border-white/10 rounded-lg text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs font-bold text-amber-400 p-1.5 sm:p-2 md:p-2.5 outline-none focus:border-amber-400 transition-all truncate"
                            >
                              {STATUTS_POSSIBLES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>

                          {/* Champs conditionnels */}
                          {(face.statut === "Occupé" || face.statut === "Réservé") && (
                            <>
                              {/* Société */}
                              <div className="space-y-0.5 sm:space-y-1">
                                <label className="text-[6px] sm:text-[7px] md:text-[8px] font-black text-white/50 uppercase tracking-wider flex items-center gap-1">
                                  <div className="w-0.5 h-0.5 bg-amber-400 rounded-full" /> Société
                                </label>
                                <input
                                  list={`list-societes-${idx}`}
                                  value={face.clientNom || ''}
                                  disabled={isLocked}
                                  placeholder="Sélectionner..."
                                  onChange={(e) => updateFace(idx, 'clientNom', e.target.value)}
                                  className="w-full bg-black/40 border border-white/10 rounded-lg text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs text-white p-1.5 sm:p-2 md:p-2.5 outline-none focus:border-amber-400 transition-all placeholder:text-white/30 truncate"
                                />
                                <datalist id={`list-societes-${idx}`}>
                                  {Array.from(new Set(listeSocietes || [])).filter(nom => nom?.trim()).map((nom, i) => (
                                    <option key={i} value={nom} />
                                  ))}
                                </datalist>
                              </div>

                              {/* Dates */}
                              <div className="space-y-0.5 sm:space-y-1 lg:col-span-2">
                                <label className="text-[6px] sm:text-[7px] md:text-[8px] font-black text-white/50 uppercase tracking-wider flex items-center gap-1">
                                  <div className="w-0.5 h-0.5 bg-amber-400 rounded-full" /> Période
                                </label>
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                                  <input
                                    type="date"
                                    value={face.dateDebut || ''}
                                    onChange={(e) => updateFace(idx, 'dateDebut', e.target.value)}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs text-white p-1.5 sm:p-2 md:p-2.5 outline-none focus:border-amber-400"
                                  />
                                  <span className="text-white/30 self-center text-center hidden sm:inline">→</span>
                                  <input
                                    type="date"
                                    value={face.dateFin || ''}
                                    onChange={(e) => updateFace(idx, 'dateFin', e.target.value)}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs text-white p-1.5 sm:p-2 md:p-2.5 outline-none focus:border-amber-400"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Message d'avertissement */}
                        {warning && !(face.statut === "Occupé" || face.statut === "Réservé") && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-1.5 sm:p-2 mt-0.5 sm:mt-1">
                            <p className="text-[6px] sm:text-[7px] md:text-[8px] text-red-400 font-medium truncate">⚠️ {warning}</p>
                          </div>
                        )}

                        {/* Message de conflit de dates */}
                        {conflitMessages[idx] && (face.statut === "Occupé" || face.statut === "Réservé") && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-1.5 sm:p-2 mt-0.5 sm:mt-1">
                            <p className="text-[6px] sm:text-[7px] md:text-[8px] text-red-400 font-medium">{conflitMessages[idx]}</p>
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

        {/* FOOTER ÉLÉGANT */}
        <div className="p-4 sm:p-5 md:p-6 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm border-t border-white/10 flex justify-end items-center gap-3 sm:gap-4">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-black uppercase text-white/50 hover:text-white transition-all rounded-xl hover:bg-white/10"
          >
            Annuler
          </button>

          <button
            onClick={handleSave}
            disabled={isButtonDisabled}
            className={`relative overflow-hidden flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-full font-black uppercase text-[9px] sm:text-[10px] transition-all duration-300 shadow-lg
              ${isSaving
                ? "bg-white/10 text-white/20 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-95 group"
              }`}
          >
            {!isSaving && (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
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

import Link from 'next/link';
// Ajoute AlertTriangle ici
import { AlertTriangle } from 'lucide-react';