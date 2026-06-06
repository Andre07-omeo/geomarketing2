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

import { deleteDoc } from "firebase/firestore";


import { getDoc } from "firebase/firestore";


// Assurez-vous d'avoir importé useState

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
        //const displayId = `${idPan}-${face.id || fIdx + 1}`;
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

                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Empêche le clic de se propager vers la div d'interaction
                    onEdit(panneau);
                  }}
                  className="relative z-20 py-3 px-6 bg-[#d4af37] rounded-xl text-black font-black text-[10px] uppercase hover:bg-white transition-all"
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </>
  );
};






import { addDoc } from "firebase/firestore";
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

type Province = Record<string, string[] | Record<string, string[]>>;

// --- 2. CONSTANTES DE RÉFÉRENCE ---
const GEOGRAPHIE: Record<string, Record<string, Province>> = {
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









import { useMemo } from 'react'; // Ajoute useMemo ici

import { useTransform } from 'framer-motion';

// Ajoute 'limit' ici
import {
  limit,
} from "firebase/firestore";

const logoUrl = "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false); // Pour l'Efficacité
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [paymentModes, setPaymentModes] = useState<{ [key: string]: 'total' | 'tranche' }>({});
  const [selectedForPrint, setSelectedForPrint] = useState<{ [key: string]: boolean }>({});
  const [panneauxData, setPanneauxData] = useState<Panneau[]>([]);






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



  const processOperations = async (type: 'unique' | 'selection' | 'delete', data?: any, index?: number) => {

    // 1. CAS PARTICULIER : SUPPRESSION
    if (type === 'delete' && data) {
      if (window.confirm(`Retirer ${data.societeLocatrice} ?`)) {
        // Ta logique pour retirer l'élément de la liste visuelle
        alert("Élément retiré.");
      }
      return; // On s'arrête ici pour la suppression
    }

    // 2. RÉCUPÉRATION DE LA SÉLECTION (Unique ou Groupée)
    const selection = type === 'unique'
      ? [data]
      : reservationsEnAttente.filter(r => selectedForPrint[r.resUniqueId]);

    // 3. --- VÉRIFICATION NOMBRE (Pas 0) ---
    if (selection.length === 0) {
      alert("⚠️ Action impossible : Aucune réservation n'est sélectionnée.");
      return;
    }

    // 4. --- VÉRIFICATION SOCIÉTÉ UNIQUE ---
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

    // 5. --- VÉRIFICATIONS TECHNIQUES (Prix, Paiement) ---
    const erreursTechniques: string[] = [];
    selection.forEach(res => {
      const key = res.resUniqueId;

      // Vérification du prix
      if (!prices[key] || prices[key] <= 0) {
        erreursTechniques.push(`- ${res.faceLabel} : Prix manquant`);
      }

      // CORRECTION ICI : On considère 'total' par défaut si paymentModes[key] est vide
      const modeActuel = paymentModes[key] || 'total';

      // Si c'est en tranche, on vérifie que le nombre de tranches est saisi
      if (modeActuel === 'tranche' && (!tranchesCount[key] || tranchesCount[key] <= 1)) {
        erreursTechniques.push(`- ${res.faceLabel} : Précisez le nombre de tranches (min. 2)`);
      }
    });

    if (erreursTechniques.length > 0) {
      alert(`❌ Données incomplètes :\n\n${erreursTechniques.join('\n')}`);
      return;
    }

    // 6. --- TOUT EST OK -> ON LANCE LA MACHINE ---
    // On récupère les IDs et on appelle la fonction de navigation
    const idsAEnvoyer = selection.map(r => r.resUniqueId);
    lancerFacturation(selection);
  };



  // 7. LA FONCTION QUI FAIT LA NAVIGATION (À placer juste en dessous ou au dessus)
  const lancerFacturation = (donneesAEnvoyer: any[]) => {
    if (!donneesAEnvoyer || donneesAEnvoyer.length === 0) {
      alert("⚠️ Erreur : Aucune donnée à facturer.");
      return;
    }

    // A. On ajoute les prix et modes de paiement saisis à l'objet pour ne rien perdre
    const donneesCompletes = donneesAEnvoyer.map(res => ({
      ...res,
      prixSaisi: prices[res.resUniqueId] || 0,
      modePaiement: paymentModes[res.resUniqueId] || 'total',
      nombreTranches: tranchesCount[res.resUniqueId] || 1
    }));

    // B. Utilisation du LocalStorage (plus fiable que l'URL pour les gros objets)
    localStorage.setItem('facture_preview_data', JSON.stringify(donneesCompletes));

    // C. Navigation vers la page PDF
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
  const ouvrirLaCarte = () => {
    router.push('/dashboard/superviseurs/superviseur');
  };

  const handleLogout = () => {
    if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
      logout();
      localStorage.clear();
      sessionStorage.clear();
      router.push('/');
    }
  };









  const handleDeleteReservation = async (res: any, panneauId: string): Promise<void> => {
    // 1. Vérification critique
    if (!panneauId) {
      console.error("Erreur : panneauId est vide !");
      alert("Impossible de supprimer : ID du panneau manquant.");
      return;
    }

    if (!window.confirm("Confirmer la suppression de cette réservation ?")) return;

    try {
      // 2. Suppression image Cloudinary
      if (res.photoCampagneUrl) {
        await fetch('/api/delete-cloudinary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: res.photoCampagneUrl })
        });
      }

      // 3. Mise à jour Firestore (Structure imbriquée : faces -> reservations)
      const panneauRef = doc(db, "panneaux", panneauId);
      const panneauSnap = await getDoc(panneauRef);

      if (!panneauSnap.exists()) throw new Error("Document introuvable.");

      const data = panneauSnap.data();
      const currentFaces = [...(data.faces || [])];

      // On cible la face spécifique grâce à faceIndex qu'on a ajouté dans le filtrage
      if (currentFaces[res.faceIndex]) {
        const faceReservations = currentFaces[res.faceIndex].reservations || [];

        // Filtrage par date de création (plus précis que dateModification)
        currentFaces[res.faceIndex].reservations = faceReservations.filter(
          (r: any) => r.createdAt !== res.createdAt
        );

        // Mise à jour du document avec le nouveau tableau de faces
        await updateDoc(panneauRef, {
          faces: currentFaces
        });

        alert("Suppression effectuée avec succès.");
      } else {
        throw new Error("Index de face invalide.");
      }

    } catch (err) {
      console.error("Erreur critique :", err);
      alert(`Erreur : ${err instanceof Error ? err.message : "Problème de connexion"}`);
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


  const totalFaces = filtered.reduce((acc, p) => acc + (p.faces?.length || 0), 0);

  // 2. HOOKS (Framer Motion & Scroll)

  // On crée d'abord scrollYProgress grâce à useScroll()

  // Maintenant qu'elle existe, on peut l'utiliser pour yBg et scaleX !
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);



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
      <nav className="fixed top-0 inset-x-0 z-[150] p-4 lg:p-6">
        <div className="max-w-[1800px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: hidden ? -120 : 0 }}
            className="flex items-center justify-between h-20 px-4 lg:px-8 rounded-[2.5rem] bg-black/40 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            {/* --- LOGO SECTION --- */}
            <div
              onClick={() => window.location.reload()}
              className="flex items-center gap-3 cursor-pointer group shrink-0"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-[#d4af37] blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                <img src={logoUrl} className="relative w-10 h-10 lg:w-12 lg:h-12 rounded-2xl object-cover border border-white/20 shadow-2xl" alt="Logo" />
              </div>
              <div className="flex flex-col leading-none hidden sm:flex">
                <span className="text-xl lg:text-2xl font-black uppercase tracking-tighter text-white">
                  G<span className="text-[#d4af37]">D</span>P
                </span>
                <span className="text-[7px] font-bold uppercase tracking-[0.4em] text-[#d4af37]">Finance</span>
              </div>
            </div>

            {/* --- BOUTONS DE NAVIGATION ÉLÉGANTS (ADAPTATIFS) --- */}
            <div className="flex items-center gap-1 md:gap-4">
              {/* Accueil */}
              <button
                onClick={() => window.location.reload()}
                className="group relative flex items-center gap-2 px-3 py-2.5 lg:px-6 lg:py-3 rounded-2xl transition-all duration-300 hover:bg-white/10 overflow-hidden"
              >
                <div className="absolute inset-0 w-0 bg-gradient-to-r from-[#d4af37]/20 to-transparent group-hover:w-full transition-all duration-500" />
                <Home size={20} className="text-[#d4af37]" />
                {/* Texte affiché uniquement à partir de 'lg' (PC) pour laisser la place aux icônes sur tablette/mobile */}
                <span className="hidden lg:block text-[11px] font-black uppercase tracking-widest text-white/90">Accueil</span>
              </button>

              {/* Carte Interactive */}
              <button
                onClick={ouvrirLaCarte}
                className="group relative flex items-center gap-2 px-3 py-2.5 lg:px-6 lg:py-3 rounded-2xl transition-all duration-300 hover:bg-white/10 overflow-hidden"
              >
                <div className="absolute inset-0 w-0 bg-gradient-to-r from-[#d4af37]/20 to-transparent group-hover:w-full transition-all duration-500" />
                <MapPin size={20} className="text-[#d4af37]" />
                <span className="hidden lg:block text-[11px] font-black uppercase tracking-widest text-white/90">Carte</span>
              </button>

              {/* Rapport (Le bouton distinctif) */}
              <Link href="/dashboard/superviseurs/rapport">
                <div className="relative group px-3 py-2.5 lg:px-6 lg:py-3 rounded-2xl bg-[#d4af37] hover:bg-white transition-all duration-300 shadow-[0_10px_20px_rgba(212,175,55,0.2)] active:scale-95 flex items-center gap-3">
                  <FilePieChart size={20} className="text-black" />
                  {/* Masqué sur mobile/tablette, affiché sur Desktop */}
                  <div className="hidden lg:flex flex-col items-start leading-none">
                    <span className="text-[10px] font-black uppercase text-black">Rapports</span>
                    <span className="text-[7px] font-bold uppercase text-black/60">Analyse Live</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* --- USER SECTION (ULTRA COMPACTE) --- */}
            <div className="flex items-center gap-2 lg:gap-6 shrink-0 pl-2 lg:pl-6 border-l border-white/10">
              {user ? (
                <div className="flex items-center gap-2 md:gap-3">

                  <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10">
                    {/* Logout masqué sur petit mobile, visible sur tablette et + */}
                    <div className="text-right hidden xl:block">
                      <p className="text-[10px] font-black text-white uppercase tracking-tight">{user.nom}</p>
                      <p className="text-[8px] font-bold text-[#d4af37] uppercase opacity-80">{user.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Évite que le clic ne déclenche d'autres événements parents
                        handleLogout();
                      }}
                      className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-full transition-all border border-red-500/20 cursor-pointer pointer-events-auto active:scale-95"
                      title="Déconnexion"
                    >
                      <img
                        src={logoUrl}
                        className="w-8 h-8 rounded-full border border-[#d4af37] object-cover bg-black"
                        alt="Profil"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/default-avatar.png" }}
                      />
                      <LogOut size={14} className="flex-shrink-0" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="px-4 md:px-6 py-2.5 rounded-xl border border-[#d4af37] text-[#d4af37] text-[10px] font-black uppercase hover:bg-[#d4af37] hover:text-black transition-all"
                >
                  <span className="md:hidden">Connexion</span> {/* Texte court mobile */}
                  <span className="hidden md:inline">Se Connecter</span>
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
                      'Maint.': 'Maintenance',
                      'Rés.': 'Réservé'
                    };
                    const fullStatus = statusMap[s];

                    const colorClass =
                      s === 'Libre' ? 'bg-green-600' :
                        s === 'Occupé' ? 'bg-blue-600' :
                          s === 'Maint.' ? 'bg-red-600' :
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
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setIsCartOpen(false)}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
                />
                <motion.div
                  initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                  className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-[#0f0f0f] border-l border-white/10 z-[101] p-6 shadow-2xl flex flex-col"
                >
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-xl font-black uppercase text-white">Mes <span className="text-[#d4af37]">Réservations</span></h2>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">En attente de facturation</p>
                    </div>
                    <button onClick={() => setIsCartOpen(false)} className="p-2 bg-white/5 rounded-full text-white hover:bg-red-500 transition-colors">✕</button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 md:space-y-4 pr-2 custom-scrollbar">
                    {/* AJOUT D'UNE GRILLE : 1 colonne sur phone, 2 sur tablette, 1 sur desktop (si dans une sidebar) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
                      {reservationsEnAttente.map((res: any, index: number) => {
                        const key = res.resUniqueId;
                        const unitPrice = prices[key] || 0;
                        const isTranche = paymentModes[key] === 'tranche';
                        const isSelected = selectedForPrint[key] || false;
                        const numeroOrdre = index + 1;
                        const uniqueKey = key || `temp-${index}`;

                        return (
                          <motion.div
                            key={uniqueKey}
                            className={`p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] border transition-all ${isSelected ? 'bg-[#d4af37]/10 border-[#d4af37]' : 'bg-white/5 border-white/10'
                              }`}
                          >
                            {/* HEADER RÉDUIT */}
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-[8px] md:text-[10px] font-black text-[#d4af37] block uppercase">
                                  Rés. N° {numeroOrdre}
                                </span>
                                <span className="text-[10px] md:text-[11px] text-white font-bold block truncate max-w-[120px]">
                                  Face : {res.faceLabel}
                                </span>
                              </div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => setSelectedForPrint(prev => ({ ...prev, [key]: !prev[key] }))}
                                className="w-4 h-4 md:w-5 md:h-5 accent-[#d4af37] cursor-pointer"
                              />
                            </div>

                            {/* NOM SOCIÉTÉ RÉDUIT */}
                            <h4 className="text-white text-xs md:text-sm font-black uppercase mb-3 truncate">
                              {res.societeLocatrice}
                            </h4>

                            {/* SECTION PRIX COMPACTE */}
                            <div className="grid grid-cols-2 gap-2 md:gap-4 mb-3">
                              <div>
                                <label className="text-[7px] md:text-[8px] text-white/40 uppercase font-bold block mb-0.5">Prix/Mois</label>
                                <div className="flex items-center gap-1 border-b border-white/20 focus-within:border-[#d4af37]">
                                  <input
                                    type="number"
                                    value={unitPrice === 0 ? "" : unitPrice}
                                    onFocus={(e) => e.target.select()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const numericVal = val === "" ? 0 : Number(val);
                                      setPrices(prev => ({ ...prev, [key]: numericVal }));
                                    }}
                                    placeholder="0"
                                    className="w-full bg-transparent text-[11px] md:text-sm text-white font-bold outline-none"
                                  />
                                  <span className="text-[10px] text-white/40">$</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <label className="text-[7px] md:text-[8px] text-white/40 uppercase font-bold block mb-0.5">
                                  Total ({res.dureeMois}m)
                                </label>
                                <span className="text-[#d4af37] text-[11px] md:text-sm font-black whitespace-nowrap">
                                  {(unitPrice * res.dureeMois).toLocaleString()} $
                                </span>
                              </div>
                            </div>

                            {/* TRANCHES VERSION MINI */}
                            {isTranche && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mb-3 p-2 bg-[#d4af37]/5 border border-[#d4af37]/20 rounded-xl"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <label className="text-[7px] md:text-[8px] text-white/40 uppercase font-bold">Tranches</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max={res.dureeMois}
                                    value={tranchesCount[key] || ""}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      const limitedVal = isNaN(val) ? "" : Math.max(1, Math.min(res.dureeMois, val));
                                      setTranchesCount(prev => ({ ...prev, [key]: limitedVal }));
                                    }}
                                    className="w-10 md:w-12 bg-white/10 border border-white/20 rounded px-1 py-0.5 text-white text-[10px] font-black outline-none"
                                  />
                                </div>
                                <p className="text-[8px] md:text-[9px] text-[#d4af37] font-bold mt-1 text-center border-t border-white/5 pt-1">
                                  {tranchesCount[key] > 0 ? ((unitPrice * res.dureeMois) / Number(tranchesCount[key])).toLocaleString() : 0} $/tranche
                                </p>
                              </motion.div>
                            )}

                            {/* SÉLECTEUR DE MODE MINI */}
                            <div className="flex bg-black/40 p-1 rounded-lg mb-3 border border-white/5">
                              {['total', 'tranche'].map((m) => (
                                <button
                                  key={m}
                                  onClick={() => setPaymentModes(prev => ({ ...prev, [key]: m }))}
                                  className={`flex-1 py-1 text-[8px] md:text-[9px] font-black uppercase rounded-md transition-all ${paymentModes[key] === m || (!isTranche && m === 'total') ? 'bg-[#d4af37] text-black' : 'text-white/40'
                                    }`}
                                >
                                  {m === 'total' ? 'Globale' : 'Tranche'}
                                </button>
                              ))}
                            </div>

                            {/* BOUTONS D'ACTION PLUS COMPACTS */}
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => processOperations('unique', res, index)}
                                className="flex-[3] py-2 bg-white text-black text-[8px] md:text-[9px] font-black uppercase rounded-lg hover:bg-[#d4af37] transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                                Valider
                              </button>

                              <button
                                onClick={() => processOperations('delete', res, index)}
                                className="flex-1 py-2 bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center rounded-lg hover:bg-red-500 hover:text-white transition-all active:scale-95"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                  {/* ACTIONS CENTRALISÉES EN BAS */}
                  <div className="pt-6 space-y-3 mt-auto border-t border-white/10">

                    {/* Bouton de sélection (Action principale) */}
                    <button
                      disabled={Object.values(selectedForPrint).filter(v => v).length === 0}
                      onClick={() => processOperations('selection')}
                      className="w-full bg-[#d4af37] disabled:opacity-30 text-black py-4 rounded-2xl font-black uppercase text-xs flex justify-between px-6 items-center hover:scale-[1.01] transition-transform shadow-lg shadow-[#d4af37]/10"
                    >
                      <span>Facturer la sélection</span>
                      <span className="bg-black/10 px-2 py-1 rounded">
                        {Object.values(selectedForPrint).filter(v => v).length} Face(s)
                      </span>
                    </button>

                    {/* LIGNE DES DEUX BOUTONS (Impression Globale & Fermer) */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => processOperations('selection')} // Ici on peut adapter pour tout imprimer
                        className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white py-3 rounded-xl font-black uppercase text-[9px] hover:bg-white hover:text-black transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Global
                      </button>

                      <button
                        onClick={() => setIsCartOpen(false)}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 py-3 rounded-xl font-black uppercase text-[9px] hover:bg-red-500 hover:text-white transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                        Fermer
                      </button>
                    </div>

                    {/* INFOS AGENT EN BAS */}
                    <div className="pt-2 border-t border-white/5 text-center">
                      <p className="text-[9px] text-white font-black uppercase tracking-widest">{user?.nomComplet || "Agent Kin-Geo"}</p>
                      <p className="text-[8px] text-white/30 font-medium">{user?.email}</p>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>



          <AnimatePresence>
            {isStatsOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setIsStatsOpen(false)}
                  className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100]"
                />
                <motion.div
                  initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                  className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-[#0a0a0a] border-l border-white/10 z-[101] flex flex-col shadow-2xl"
                >
                  {/* HEADER */}
                  <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-black uppercase text-white leading-none">
                        Panel <span className="text-blue-500">Agent</span>
                      </h2>
                      <p className="text-[10px] text-white/30 uppercase mt-1 font-bold">Performance & Suivi</p>
                    </div>
                    <button onClick={() => setIsStatsOpen(false)} className="p-2 bg-white/5 rounded-full text-white hover:bg-red-500 transition-colors">✕</button>
                  </div>

                  {/* CONTENU SCROLLABLE */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">

                    {activeTab === 'stats' ? (
                      <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                        {/* CERCLE DE PERFORMANCE EXISTANT */}
                        <div className="flex flex-col items-center py-4">
                          <div className="relative w-40 h-40 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90">
                              <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                              <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="440"
                                strokeDashoffset={440 - (440 * Number(statsEfficacite().performance)) / 100}
                                className="text-blue-500 transition-all duration-1000"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-3xl font-black text-white">{statsEfficacite().performance}%</span>
                              <span className="text-[8px] text-white/40 uppercase font-bold tracking-tighter">Efficacité</span>
                            </div>
                          </div>
                        </div>

                        {/* STATS RAPIDES */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/5 p-4 rounded-[2rem] border border-white/5">
                            <p className="text-xl font-black text-white">{statsEfficacite().totalAgent}</p>
                            <p className="text-[8px] uppercase text-white/30 font-bold">Mes Actions</p>
                          </div>
                          <div className="bg-white/5 p-4 rounded-[2rem] border border-white/5">
                            <p className="text-xl font-black text-white">{statsEfficacite().totalGlobal}</p>
                            <p className="text-[8px] uppercase text-white/30 font-bold">Global Agence</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* FILTRES TEMPORELS & STATUT */}
                        <div className="space-y-4">
                          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1">
                            {['avant', 'present', 'futur'].map((t) => (
                              <button
                                key={t}
                                onClick={() => setTimeFilter(t as any)}
                                className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${timeFilter === t ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {timeFilter !== 'present' && (
                              <div className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                                <span className="text-[8px] text-white/40 font-black uppercase">Mois :</span>
                                <input type="number" value={monthCount} onChange={(e) => setMonthCount(Math.max(1, parseInt(e.target.value)))} className="w-8 bg-transparent text-right font-black text-blue-500 outline-none text-xs" />
                              </div>
                            )}
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value as any)}
                              className="flex-1 bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-[9px] font-black uppercase text-white outline-none focus:border-blue-500/50 transition-all"
                            >
                              <option value="tous" className="bg-[#0a0a0a]">Tous les statuts</option>
                              <option value="Occupé" className="bg-[#0a0a0a]">Occupé (En cours)</option>
                              <option value="Reservé" className="bg-[#0a0a0a]">Réservé (En attente)</option>
                            </select>
                          </div>
                        </div>

                        {/* LISTE COMPACTE DES RÉSERVATIONS */}
                        <div className="space-y-2">
                          {getFilteredReservations().map((res, idx) => (
                            <motion.div
                              key={idx}
                              className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all group"
                            >
                              {/* PHOTO MINIATURE AVEC INPUT OVERLAY */}
                              <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-black border border-white/10 group">
                                <img src={res.photoCampagneUrl} className="w-full h-full object-cover" alt="" />

                                {/* Overlay Update (existant) */}
                                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                  <input type="file" className="hidden" onChange={(e) => handlePhotoUpdate(e, res.id)} />
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                  </svg>
                                </label>

                                {/* Bouton Suppression Direct */}

                              </div>

                              {/* INFOS GRID COMPACT */}
                              {/* INFOS GRID COMPACT */}
                              <div className="flex-1 min-w-0 grid grid-cols-2 items-center gap-2">
                                <div>
                                  <p className="text-[8px] font-black text-blue-500 truncate uppercase">{res.faceId}</p>
                                  <p className="text-[10px] text-white font-bold truncate uppercase leading-tight">{res.societeLocatrice}</p>
                                </div>

                                {/* COLONNE DE DROITE : Dates + Corbeille */}
                                <div className="text-right flex flex-col items-end gap-1">
                                  <div className="flex flex-col">
                                    <p className="text-[8px] text-white/50 font-bold">{res.dateDebut}</p>
                                    <p className="text-[7px] text-white/20 uppercase">au {res.dateFin}</p>
                                  </div>

                                  {/* BOUTON CORBEILLE */}
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => handleDeleteReservation(res, res.panelDocId)}
                                    className="p-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg transition-colors"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BOTTOM PANEL (FIXED) */}
                  <div className="p-6 bg-black border-t border-white/10 space-y-6">
                    {/* IDENTITÉ + SWITCHER */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-black font-black uppercase text-sm shadow-lg">
                          {user?.displayName?.[0] || "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-white uppercase truncate">{user?.nomComplet || "Agent Kin-Geo"}</p>
                          <p className="text-[9px] text-white/30 truncate font-medium">{user?.email}</p>
                        </div>
                      </div>

                      {/* LE COMMUTATEUR (SWITCH) JUSTE APRÈS L'IDENTITÉ */}
                      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                        <button
                          onClick={() => setActiveTab('stats')}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'stats' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40'}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 20V10M18 20V4M6 20v-4" /></svg>
                          Stats
                        </button>
                        <button
                          onClick={() => setActiveTab('reservations')}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'reservations' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40'}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                          Gestion
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsStatsOpen(false)}
                      className="w-full py-4 bg-white/5 border border-white/10 text-white hover:bg-red-500 hover:text-white transition-all rounded-2xl font-black uppercase text-[10px] tracking-[0.2em]"
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





import { serverTimestamp } from 'firebase/firestore';
import {
  Save,
  Camera,

} from 'lucide-react';
import { panneaux } from '@/data/panneaux';


import { useRef } from 'react';
import { doc, updateDoc, runTransaction, getDocs, } from 'firebase/firestore';
import { Layout, Upload, } from 'lucide-react';

// --- CONFIGURATION ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dn7wnikzp/image/upload";
const UPLOAD_PRESET = "panneaux"; // Assurez-vous que ce preset est "Unsigned" dans Cloudinary
const LOGO_DISPROMALT = "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg";

const TYPES_SUPPORTS = ["LED", "Bache", "Vinyle",];

const STATUTS_POSSIBLES = ["Libre", "Occupé", "En Maintenance", "Réservé"];

export const EditPanneauModal = ({ isOpen, onClose, panneau, user }: any) => {


  // Remplacez votre déclaration actuelle par celle-ci :
  const [conflitMessages, setConflitMessages] = useState<Record<number, string | null>>({});
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [listeSocietes, setListeSocietes] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuth();


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

  // 3. CONDITION DE SORTIE (Après les hooks)
  if (!isOpen || !formData) return null;

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
  };



  const checkDateConflict = (
    idx: number,
    dateDebut: string,
    dateFin: string,
    reservations: any[]
  ) => {
    // Si les dates sont vides, on enlève l'erreur pour cette face
    if (!dateDebut || !dateFin) {
      setConflitMessages(prev => ({ ...prev, [idx]: null }));
      return;
    }

    const d1 = new Date(dateDebut).getTime();
    const d2 = new Date(dateFin).getTime();

    // 1. Validation de base (Ordre des dates)
    if (d1 >= d2) {
      setConflitMessages(prev => ({
        ...prev,
        [idx]: `⚠️ La date de début doit être antérieure à la date de fin.`
      }));
      return;
    }

    // 2. Vérification des conflits avec la base de données
    // On cherche un conflit uniquement si la réservation n'appartient pas à l'utilisateur actuel
    const conflict = reservations?.find((res: any) => {
      const r1 = new Date(res.dateDebut).getTime();
      const r2 = new Date(res.dateFin).getTime();

      // Formule de chevauchement de périodes
      const overlap = d1 <= r2 && d2 >= r1;
      return overlap && res.agentEmail !== currentUser?.email;
    });

    if (conflict) {
      setConflitMessages(prev => ({
        ...prev,
        [idx]: `⚠️ Face déjà réservée par : ${conflict.agentNom}. Veuillez négocier avec lui.`
      }));
    } else {
      // Crucial : On remet à null si le conflit est résolu ou inexistant
      setConflitMessages(prev => ({ ...prev, [idx]: null }));
    }
  };


  const isButtonDisabled = isSaving || uploadingIndex !== null;

  const handleSave = async () => {
    // 1. Vérification globale des conflits (UI)
    const hasGlobalConflict = Object.values(conflitMessages).some(msg => msg !== null);
    if (hasGlobalConflict) {
      alert("Impossible de sauvegarder : Une ou plusieurs faces ont des conflits de dates.");
      return;
    }





    // --- CORRECTION DU BLOC 2 ---

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

        // 4. Construction des données de mise à jour (STRUCTURE EXACTE)
        // --- DANS TON handleSave, AU NIVEAU DU MAP ---

        const dataToUpdate = {
          faces: formData.faces.map((f: any, i: number) => {
            // 1. On récupère la face d'origine (avant modification) pour comparer
            const faceOriginale = panneau.faces[i];

            // 2. CONDITION CRUCIALE : On ne crée une réservation QUE SI :
            // - Le statut n'est pas Libre
            // - ET que les dates ou le client ont changé par rapport à l'original
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
              {formData.faces?.map((face: any, idx: number) => {
                // Calcul des états avant le rendu pour alléger le JSX
                const warning = getReservationWarning(face);
                const isLocked = !canEditFace(face);

                return (
                  <div
                    key={face.faceId || idx}
                    className={`bg-white/5 border border-white/10 rounded-[2rem] p-6 flex flex-col gap-6 group hover:border-[#d4af37] transition-all ${isLocked ? "opacity-75" : ""}`}
                  >
                    <div className="flex flex-col lg:flex-row items-center gap-6 w-full">

                      {/* 1. Zone Photo */}
                      {(face.statut === "Occupé" || face.statut === "Réservé") && (
                        <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-black border border-white/10 shadow-xl flex-shrink-0">
                          {face.photoCampagneUrl ? (
                            <>
                              <img src={face.photoCampagneUrl} className="w-full h-full object-cover" alt="Face" />
                              {!isLocked || isOwner(face) ? (
                                <button
                                  onClick={() => removePhoto(idx)}
                                  className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:scale-110"
                                >
                                  <X size={14} />
                                </button>
                              ) : (
                                <div className="absolute top-1 right-1 p-1 bg-gray-500 rounded-full text-white cursor-not-allowed">
                                  <X size={14} />
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-[8px] text-white/40">
                              <Camera size={20} className="mb-1" /> PHOTO OBLIGATOIRE
                            </div>
                          )}

                          {(!isLocked || isOwner(face)) && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  fileInputRef.current!.dataset.idx = idx.toString();
                                  fileInputRef.current?.click();
                                }}
                                className="p-3 bg-[#d4af37] rounded-full text-black"
                              >
                                <Upload size={20} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. Champs de saisie */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-white/30 uppercase italic">Statut</p>
                          <select
                            value={face.statut || ''}
                            onChange={(e) => updateFace(idx, 'statut', e.target.value)}
                            disabled={isLocked}
                            className="w-full bg-white/5 border-b border-white/10 text-xs font-bold text-[#d4af37] p-2 outline-none"
                          >
                            {STATUTS_POSSIBLES.map(s => <option key={s} value={s} className="bg-[#1e40af]">{s}</option>)}
                          </select>
                        </div>

                        {(face.statut === "Occupé" || face.statut === "Réservé") && (
                          <>
                            <div className="space-y-1">
                              <p className="text-[8px] font-black text-[#d4af37] uppercase italic">Société (Locataire)</p>

                              <input
                                list={`list-societes-${idx}`} // ID unique par face
                                value={face.clientNom || ''}
                                disabled={isLocked}
                                placeholder="Sélectionner ou saisir une société..."
                                onChange={(e) => updateFace(idx, 'clientNom', e.target.value)}
                                className={`w-full bg-white/5 border border-white/10 p-2 rounded-lg text-white text-xs outline-none ${isLocked ? "cursor-not-allowed opacity-50" : "focus:border-[#d4af37]"
                                  }`}
                              />

                              {/* La liste de suggestions qui apparaît quand on clique ou tape */}
                              <datalist id={`list-societes-${idx}`}>
                                {Array.from(new Set(listeSocietes || []))
                                  .filter(nom => nom && nom.trim() !== "")
                                  .map((nom, i) => (
                                    <option key={`${nom}-${i}`} value={nom} />
                                  ))}
                              </datalist>
                            </div>

                            <div className="flex gap-2">
                              {['dateDebut', 'dateFin'].map((dField) => (
                                <div key={dField} className="space-y-1 flex-1">
                                  <p className="text-[8px] font-black text-[#d4af37] uppercase italic">
                                    {dField === 'dateDebut' ? "Début" : "Fin"}
                                  </p>

                                  <input
                                    type="date"
                                    // Si face[dField] est undefined ou null, on passe une chaîne vide
                                    value={face[dField] || ''}
                                    onChange={(e) => {
                                      const newValue = e.target.value;

                                      // Met à jour dynamiquement le bon champ
                                      updateFace(idx, dField, newValue);

                                      // Appelle la vérification avec les valeurs à jour
                                      const newDebut = dField === 'dateDebut' ? newValue : face.dateDebut;
                                      const newFin = dField === 'dateFin' ? newValue : face.dateFin;

                                      checkDateConflict(idx, newDebut, newFin, face.reservations || []);
                                    }}
                                  />

                                  {/* Affiche le message de conflit spécifique à CETTE face (idx) */}
                                  {conflitMessages[idx] && (
                                    <div style={{ color: 'red', fontWeight: 'bold', marginTop: '10px', fontSize: '10px' }}>
                                      {conflitMessages[idx]}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Message d'avertissement */}
                        {warning && (
                          <div className="col-span-full bg-red-500/10 border border-red-500/50 p-3 rounded-lg">
                            <p className="text-[10px] text-red-400 font-medium">⚠️ {warning}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FOOTER ULTRA-COMPACT & PREMIUM */}
        <div className="p-4 md:p-8 bg-black/60 backdrop-blur-xl border-t border-white/10 flex justify-end items-center gap-2 md:gap-4">

          {/* Bouton Annuler : Plus discret sur mobile */}
          <button
            onClick={onClose}
            className="px-4 md:px-8 py-2 md:py-3 text-[9px] md:text-[10px] font-black uppercase text-white/30 hover:text-white transition-all tracking-tighter md:tracking-widest"
          >
            Annuler
          </button>

          {/* Bouton Enregistrer : Style "Golden Glass" */}
          <button
            onClick={handleSave}
            disabled={isButtonDisabled}
            className={`
      relative overflow-hidden flex items-center gap-2 md:gap-3 px-6 md:px-12 py-3 md:py-4 rounded-xl md:rounded-full 
      font-black uppercase text-[9px] md:text-[10px] transition-all duration-300 shadow-2xl
      ${isSaving
                ? "bg-white/10 text-white/20 cursor-not-allowed"
                : "bg-[#d4af37] text-black hover:shadow-[#d4af37]/20 hover:scale-[1.02] active:scale-95 group"
              }
    `}
          >
            {/* Effet de reflet brillant (Glint) au survol */}
            {!isSaving && (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
            )}

            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span className="hidden md:inline">Enregistrement...</span>
                <span className="md:hidden">Patientez...</span>
              </>
            ) : (
              <>
                <Save size={14} className="md:w-4 md:h-4" />
                <span>
                  <span className="md:hidden">Enregistrer</span>
                  <span className="hidden md:inline">Enregistrer les modifications</span>
                </span>
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