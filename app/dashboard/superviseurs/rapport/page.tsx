"use client";

// ============================================
// IMPORTS
// ============================================
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, ChevronDown, ChevronUp, Calendar,
  Building2, MapPin, LayoutGrid, Users, TrendingUp,
  Clock, CheckCircle2, XCircle, AlertCircle,
  FileText, FileSpreadsheet, Home, Database,
  DollarSign, Activity, UserCheck, Layers,
  Printer, RefreshCw, AlertTriangle,
  LogOut,           // ✅ AJOUTER
  User,   // ✅ AJOUTER
  BookOpen,  // ✅ AJOUTER POUR LE BOUTON CATALOGUE

  X,              // ✅ AJOUTER X
  ChevronRight,   // ✅ AJOUTER ChevronRight
  Trash2,         // ✅ AJOUTER Trash2
  LayoutDashboard,  // ✅ AJOUTER CETTE LIGNE

  Loader2,

} from 'lucide-react';
import { collection, getDocs, DocumentData, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from "@/context/AuthContext";
import { cleanupExpiredReservations, initAutoCleanup, stopAutoCleanup } from '@/utils/reservationCleanup';

import {
  // ... vos imports existants
  Eye, // ✅ Ajouter Eye pour le bouton Détails
} from 'lucide-react';
import { useRouter } from 'next/navigation';


import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getApps, getApp, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
// ============================================
// IMPORT DE LA CONFIGURATION
// ============================================
const config = require('../../../../config/db');


import { FaceDetailModal, EditPanneauModal } from '@/app/dashboard/superviseurs/page';

// Extraction des variables
const firebaseConfig = config.firebaseConfig;
const GEOGRAPHIE = config.GEOGRAPHIE;
const TYPES_SUPPORTS = config.TYPES_SUPPORTS; // ✅ Ajout

// ============================================
// CONSTANTES ADMIN
// ============================================
const ADMIN_EMAIL = 'admincommerciaux@dispromalt.cd';

// ✅ Initialisation sécurisée de Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ============================================
// TYPES
// ============================================
interface Face {
  id: string;
  sens: string;
  societeLocatrice: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  statut: 'Libre' | 'Occupé' | 'Réservé';
  reservationsFutures?: number;
  prochaineReservation?: string | null;
  statutPaiement?: string;
  // ✅ Ajouter les réservations dans la face
  reservations?: Reservation[];


}




interface Facture {
  id: string;
  agentEmail: string;           // "admincommerciaux@dispromalt.cd"
  agentNom: string;              // "Commercial1"
  clientNom: string;             // "HOTEL DE VILLE"
  dateCreation: string;          // timestamp
  dateValidation: string;        // timestamp
  derniereTransaction: number;   // 2560
  factureIdFormat: string;       // "F-1783199657772"
  lignes: Array<{
    adresse: string;
    dateDebut: string;
    dateFin: string;
    idFace: string;
    label: string;
    modePaiement: string;        // "total" ou "tranche"
    montantParTranche: number;
    nombreTranches: number;
    pu: number;
    qte: number;
    total: number;
    type: string;
    montantPaye: number;
    totalHT: number;
  }>;
  montantPaye: number;           // 2560
  statut: string;                // "Validée"
  statutPaiement: string;        // "Payé"
  totalHT: number;               // 2560
  validationComptable: boolean;  // true
  valideParEmail: string;        // "comptable@dispromalt.cd"
  valideParNom: string;          // "comptable"
  valideParUID: string;          // "OUDdWuA0MtwSFv0trf6b"
}

// ============================================
// TYPES - MISE À JOUR
// ============================================
interface Agent {
  id: string;
  nom: string;
  email: string;
  reservations: number;
  actives: number;
  validees: number;
  revenue: number;
  // ✅ Ajouter ces champs pour l'admin
  nomComplet?: string;
  prenom?: string;
  postNom?: string;
  telephone?: string;
  fonction?: string;
  role?: string;
  isOnline?: boolean;
  lastLogin?: string;
  logoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}
interface AdminReservation {
  id: string;
  agentNom: string;
  agentEmail: string;
  societeLocatrice: string;
  faceId: string;
  panneauId: string;
  panneauIdPan: string;
  adresse: string;
  dateDebut: string;
  dateFin: string;
  montant: number;
  statut: string;
  statutPaiement: string;
  validationComptable: boolean;
  createdAt: string;
  dateModification?: string;
}

interface AdminRendezVous {
  id: string;
  agentNom: string;
  agentEmail: string;
  clientNom: string;
  clientEmail: string;
  clientTelephone: string;
  date: string;
  heure: string;
  objet: string;
  statut: 'planifié' | 'confirmé' | 'annulé' | 'terminé';
  notes?: string;
  createdAt: string;
}

type PeriodeFiltre = 'mois' | 'trimestre' | 'semestre' | 'annee' | 'deuxAns' | 'personnalise';
type StatutReservation = 'tous' | 'actif' | 'expire' | 'futur' | 'valide' | 'en_attente';


// ============================================
// TYPES - MISE À JOUR
// ============================================

interface Reservation {
  agentEmail: string;
  agentNom: string;
  comptableValidateur?: string;
  createdAt: string;
  dateDebut: string;
  dateFin: string;
  dateModification: string;
  dateValidationComptable?: string;
  facturee: string;
  modePaiement: string;
  montant?: number;
  nombreTranches?: number;
  photoCampagneUrl?: string;
  societeLocatrice: string;
  statut: string;
  statutPaiement: string;
  validationComptable: boolean;
  // ✅ Ajouter ces propriétés pour le panier
  faceId?: string;          // ID de la face concernée
  face?: string;            // Alternative pour l'ID de la face
  id?: string;              // ID de la réservation
  resUniqueId?: string;     // ID unique pour la réservation
  dureeMois?: number;       // Durée en mois
  faceLabel?: string;       // Label de la face
  panneauId?: string;       // ID du panneau
  panneauIdPan?: string;    // ID Pan du panneau
  panneauAdresse?: string;  // Adresse du panneau
  panneauType?: string;     // Type du panneau
}

interface Panneau {
  id: string;
  idPan: string;
  adresse: string;
  coords?: { lat: number; lng: number };
  createdAt: string;
  dimension: string;
  faces: Face[];
  historique: any[];
  nbFaces: number;
  reservations: Reservation[];
  type: string;
  updatedAt: string;
  gps_raw?: { lat: number; lng: number };
}

interface Agent {
  id: string;
  nom: string;
  email: string;
  reservations: number;
  actives: number;
  validees: number;
  revenue: number;
}

interface GeoFilter {
  pays: string;
  province: string;
  district: string;
  commune: string;
}

interface DateFilter {
  startDate: string;
  endDate: string;
}

interface Stats {
  totalPanneaux: number;
  totalFaces: number;
  totalLibres: number;
  totalOccupes: number;
  totalReserves: number;
  totalReservationsFutures: number;
  totalRevenue: number;
}

// ============================================
// PROPS TYPES
// ============================================
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'indigo' | 'purple' | 'pink' | 'emerald' | 'amber' | 'red' | 'cyan' | 'rose';
  subtitle?: string;
  loading?: boolean;
}

// ============================================
// COMPOSANT STATISTIQUES
// ============================================
const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color = 'blue',
  subtitle,
  loading = false
}) => {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    indigo: 'from-indigo-500 to-indigo-600',
    purple: 'from-purple-500 to-purple-600',
    pink: 'from-pink-500 to-pink-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    cyan: 'from-cyan-500 to-cyan-600',
    rose: 'from-rose-500 to-rose-600'
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-gray-100 animate-pulse">
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 p-3 sm:p-4 border border-gray-100 hover:border-blue-200 group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">
            {label}
          </p>
          <p className="text-lg sm:text-2xl font-bold text-gray-800 mt-1 truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-2 sm:p-2.5 rounded-lg bg-gradient-to-br ${colors[color] || colors.blue} shadow-lg shadow-${color}-500/20 flex-shrink-0 ml-2`}>
          <div className="text-white w-3.5 h-3.5 sm:w-4 sm:h-4">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
const RapportPanneaux: React.FC = () => {



  const router = useRouter();


  const { user, logout } = useAuth();

  // ✅ États pour les infos utilisateur
  const [displayName, setDisplayName] = useState<string>('agent');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userInitial, setUserInitial] = useState<string>('A');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [globalTranchesCount, setGlobalTranchesCount] = useState<number>(2);

  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [panneauForReservation, setPanneauForReservation] = useState<any>(null);
  const [faceForReservation, setFaceForReservation] = useState<any>(null);

  // États des données
  const [panneaux, setPanneaux] = useState<Panneau[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  // Ajouter cette ligne avec les autres states (vers la ligne 115)



  // États UI
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false; // Valeur par défaut pour le SSR
  });
  // États des filtres
  const [geoFilter, setGeoFilter] = useState<GeoFilter>({
    pays: 'Tous',
    province: 'Tous',
    district: 'Tous',
    commune: 'Tous'
  });
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    startDate: '',
    endDate: ''
  });
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [agentFilter, setAgentFilter] = useState<string>('Tous');
  // Dans la déclaration des états
  const [typeFilter, setTypeFilter] = useState<string>('Tous');

  // ✅ Correction useRef
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState<string>('');

  const [factures, setFactures] = useState<any[]>([]);


  // États pour le menu flottant
  const [isFloatingMenuOpen, setIsFloatingMenuOpen] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [selectedForPrint, setSelectedForPrint] = useState<Record<string, boolean>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [globalPaymentMode, setGlobalPaymentMode] = useState<'total' | 'tranche'>('total');
  const [activeTab, setActiveTab] = useState<'stats' | 'reservations' | 'rdv'>('stats');

  // États pour les réservations de l'utilisateur
  const [userReservations, setUserReservations] = useState<Reservation[]>([]);
  const [timeFilter, setTimeFilter] = useState<'avant' | 'present' | 'futur'>('present');
  const [monthCount, setMonthCount] = useState<number>(1);




  // États pour le modal Admin
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [adminActiveTab, setAdminActiveTab] = useState<'agents' | 'reservations' | 'rdv'>('agents');

  // États pour la gestion des agents
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [isAddingAgent, setIsAddingAgent] = useState<boolean>(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // États pour les réservations admin
  const [adminReservations, setAdminReservations] = useState<any[]>([]);
  const [rdvList, setRdvList] = useState<any[]>([]);

  const [adminAgents, setAdminAgents] = useState<any[]>([]);
  const [adminRdv, setAdminRdv] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);





  // ============================================
  // VÉRIFICATION ADMIN - AVEC DÉBOGAGE (CORRIGÉ)
  // ============================================
  const isAdmin = useMemo(() => {
    const userEmailLower = user?.email?.toLowerCase().trim() || '';
    const adminEmailLower = ADMIN_EMAIL.toLowerCase().trim();
    return userEmailLower === adminEmailLower;
  }, [user?.email]);

  // ✅ AJOUTEZ AUSSI CETTE VARIABLE DE SECOURS - CORRIGÉ
  const isUserAdmin = useMemo(() => {
    // Vérifier aussi dans les données locales UNIQUEMENT CÔTÉ CLIENT
    if (typeof window !== 'undefined') {
      try {
        const localData = localStorage.getItem('geomarketing_user_data');
        if (localData) {
          const parsed = JSON.parse(localData);
          const localEmail = parsed?.email?.toLowerCase().trim() || '';
          if (localEmail === ADMIN_EMAIL.toLowerCase().trim()) {
            console.log('✅ Admin détecté via localStorage');
            return true;
          }
        }
      } catch (e) {
        console.error('Erreur parsing localStorage:', e);
      }
    }
    return false;
  }, []);

  // ✅ COMBINER LES DEUX VÉRIFICATIONS
  const isAdminFinal = isAdmin || isUserAdmin;








  // Détection mobile
  useEffect(() => {
    const handleResize = (): void => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const closeEditPanneau = () => {
    setPanneauToEdit(null);
  };

  // ============================================
  // DANS LE COMPOSANT RapportPanneaux
  // ============================================

  // ✅ État pour le panneau à éditer
  const [panneauToEdit, setPanneauToEdit] = useState<any>(null);

  // ============================================
  // DANS LE COMPOSANT RapportPanneaux
  // ============================================

  // ✅ Fonction pour ouvrir l'édition du panneau
  const openEditPanneau = (panneau: any) => {

    if (!panneau) {
      alert('⚠️ Aucun panneau sélectionné');
      return;
    }

    // Stocker le panneau dans localStorage
    localStorage.setItem('panneau_to_edit', JSON.stringify(panneau));

    // Rediriger vers la page superviseurs avec le paramètre edit
    router.push('/dashboard/superviseurs?edit=true');
  };
  // ============================================
  // DANS LE COMPOSANT PRINCIPAL RapportPanneaux
  // ============================================

  // ✅ États pour le modal
  const [selectedFace, setSelectedFace] = useState<any>(null);
  const [selectedPanneau, setSelectedPanneau] = useState<any>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);

  // ✅ GARDEZ CETTE FONCTION (dans le composant principal)
  const openFaceDetails = (panneau: any, face: any) => {

    if (!face) {
      return;
    }

    setSelectedPanneau(panneau);
    setSelectedFace(face);
    setIsFaceModalOpen(true);


  };
  // ✅ Fonction pour fermer le modal
  const closeFaceModal = () => {
    setIsFaceModalOpen(false);
    setSelectedFace(null);
    setSelectedPanneau(null);
  };

  const [localUser, setLocalUser] = useState<any>(null);





  const cleanupRefs = useRef<{ timeoutId: NodeJS.Timeout, intervalId: NodeJS.Timeout, handleBeforeUnload: () => void } | null>(null);
  const [isCleanupRunning, setIsCleanupRunning] = useState(false);

  useEffect(() => {
    if (panneaux.length > 0 && !isCleanupRunning) {
      setIsCleanupRunning(true);
      cleanupRefs.current = initAutoCleanup(panneaux, setPanneaux);
    }

    return () => {
      if (cleanupRefs.current) {
        stopAutoCleanup(cleanupRefs.current);
        setIsCleanupRunning(false);
      }
    };
  }, [panneaux]);

  // ✅ Nettoyage forcé après le chargement des données
  useEffect(() => {
    if (panneaux.length > 0) {
      const timer = setTimeout(() => {
        cleanupExpiredReservations(panneaux, setPanneaux);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [panneaux.length]);


  // ✅ Nettoyage manuel (optionnel)
  const handleManualCleanup = async () => {
    await cleanupExpiredReservations(panneaux, setPanneaux);
  };





  // ✅ AJOUTER CET USEFFECT POUR CHARGER LES DONNÉES LOCALES
  useEffect(() => {
    // Charger les données utilisateur depuis localStorage
    const loadLocalUserData = () => {
      try {
        const rawData = localStorage.getItem('geomarketing_user_data');
        console.log('📦 Chargement des données locales dans RapportPanneaux:', rawData);

        if (rawData) {
          const parsedData = JSON.parse(rawData);

          setLocalUser(parsedData);

          // Mettre à jour les infos d'affichage
          const nom = parsedData.nom ||
            parsedData.nomComplet ||
            parsedData.prenom ||
            parsedData.email?.split('@')[0] ||
            'agent';
          setDisplayName(nom);
          setUserEmail(parsedData.email || '');
          setUserInitial(nom.charAt(0).toUpperCase() || 'A');
          setUserPhoto(parsedData.logoUrl || parsedData.photoURL || null);
        } else {
          console.warn('⚠️ Aucune donnée locale trouvée');
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement des données locales:', error);
      }
    };

    loadLocalUserData();
  }, [user]);

  // ============================================
// CHARGEMENT DES DONNÉES DEPUIS FIREBASE
// ============================================
const loadData = useCallback(async (): Promise<void> => {
  setLoading(true);
  setError(null);

  try {
    if (!db) {
      throw new Error('Base de données non initialisée');
    }

    // 1. CHARGER LES PANNEAUX
    const panneauxRef = collection(db, 'panneaux');
    const panneauxSnapshot = await getDocs(panneauxRef);

    const panneauxData: Panneau[] = [];
    const agentsMap = new Map<string, Agent>();

    panneauxSnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;

      const faces = Array.isArray(data.faces) ? data.faces.map((f: any, idx: number) => ({
        ...f,
        id: f.id || `${data.idPan || 'F'}${idx + 1}`
      })) : [];

      const reservations = Array.isArray(data.reservations) ? data.reservations.map((r: any) => ({
        ...r,
        faceId: r.faceId || r.face || null
      })) : [];

      const panneau: Panneau = {
        id: doc.id,
        idPan: data.idPan || 'N/A',
        adresse: data.adresse || '',
        coords: data.coords || undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        dimension: data.dimension || '',
        faces: faces,
        historique: Array.isArray(data.historique) ? data.historique : [],
        nbFaces: data.nbFaces || faces.length,
        reservations: reservations,
        type: data.type || '',
        updatedAt: data.updatedAt || new Date().toISOString(),
        gps_raw: data.gps_raw || undefined
      };

      panneauxData.push(panneau);

      // Extraction des agents depuis les réservations
      if (Array.isArray(data.reservations)) {
        data.reservations.forEach((res: Reservation) => {
          if (res.agentNom && res.agentEmail) {
            if (!agentsMap.has(res.agentEmail)) {
              agentsMap.set(res.agentEmail, {
                id: res.agentEmail,
                nom: res.agentNom,
                email: res.agentEmail,
                reservations: 0,
                actives: 0,
                validees: 0,
                revenue: 0,
                nomComplet: res.agentNom,
                fonction: 'commercial'
              });
            }

            const agent = agentsMap.get(res.agentEmail);
            if (agent) {
              agent.reservations += 1;
              if (res.validationComptable) agent.validees += 1;
              if (res.montant) {
                agent.revenue += parseFloat(String(res.montant)) || 0;
              }
            }
          }
        });
      }
    });

    // 2. CHARGER LES FACTURES
    try {
      const facturesRef = collection(db, 'factures');
      const facturesSnapshot = await getDocs(facturesRef);
      const facturesData: any[] = [];
      
      facturesSnapshot.forEach((doc) => {
        const data = doc.data();
        facturesData.push({
          id: doc.id,
          ...data,
          totalHT: data.totalHT || data.total || data.montant || 0,
          montant: data.montant || data.totalHT || data.total || 0,
          dateCreation: data.dateCreation || data.createdAt || new Date().toISOString(),
          dateValidation: data.dateValidation || data.updatedAt || new Date().toISOString(),
          statut: data.statut || 'En attente',
          statutPaiement: data.statutPaiement || 'en attente',
          validationComptable: data.validationComptable || false,
          agentEmail: data.agentEmail || data.agentId || 'inconnu',
          agentNom: data.agentNom || 'Inconnu',
        });
      });
      
      setFactures(facturesData);
      console.log(`📄 ${facturesData.length} factures chargées`);
      
    } catch (err) {
      console.error('Erreur lors du chargement des factures:', err);
      setFactures([]);
    }

    // 3. CHARGER LES AGENTS DEPUIS LA COLLECTION "societe"
    try {
      const societeRef = collection(db, 'societes');
      const societeSnapshot = await getDocs(societeRef);

      societeSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role === 'commercial' || data.role === 'agent') {
          const email = data.email || data.id;
          if (!agentsMap.has(email)) {
            agentsMap.set(email, {
              id: email,
              nom: data.nom || data.nomComplet || email.split('@')[0] || 'Agent',
              email: email,
              reservations: 0,
              actives: 0,
              validees: 0,
              revenue: 0,
              nomComplet: data.nomComplet || data.nom,
              prenom: data.prenom,
              postNom: data.postNom,
              telephone: data.telephone,
              fonction: data.fonction || 'commercial',
              role: data.role,
              isOnline: data.isOnline || false,
              lastLogin: data.lastLogin,
              logoUrl: data.logoUrl,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          }
        }
      });
      console.log(`👥 ${agentsMap.size} agents commerciaux chargés`);
      
    } catch (err) {
      console.error('Erreur lors du chargement des agents:', err);
    }

    setPanneaux(panneauxData);
    setAgents(Array.from(agentsMap.values()));
    setLastUpdate(new Date());

  } catch (err) {
    console.error('Erreur lors du chargement des données:', err);
    setError('Impossible de charger les données. Veuillez réessayer.');
  } finally {
    setLoading(false);
  }
}, []); // ✅ Le tableau de dépendances est vide car la fonction ne dépend d'aucune variable externe

// Chargement initial
useEffect(() => {
  loadData();
}, [loadData]); // ✅ Dépend de loadData qui est stable


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

    // ✅ Récupérer le panneau sélectionné depuis le localStorage
    const panneauData = localStorage.getItem('map_single_panneau');
    if (panneauData) {
      // Garder les données du panneau sélectionné
      localStorage.setItem('map_filter_type', 'single');
    } else {
      localStorage.setItem('map_filter_type', 'all');
    }

    router.push('/dashboard/superviseurs/carte');
  };








  const getUserReservations = useCallback((): Reservation[] => {
    const allReservations: Reservation[] = [];

    // Parcourir tous les panneaux
    panneaux.forEach((panneau: Panneau) => {
      const faces = panneau.faces || [];
      faces.forEach((face: Face) => {
        const faceReservations = (face as any).reservations || [];
        if (Array.isArray(faceReservations)) {
          faceReservations.forEach((res: Reservation, index: number) => {
            // Filtrer par email de l'utilisateur
            if (res.agentEmail === userEmail || res.agentEmail === user?.email) {
              // Calculer la durée en mois si non définie
              let dureeMois = res.dureeMois || 1;
              if (!res.dureeMois && res.dateDebut && res.dateFin) {
                const start = new Date(res.dateDebut);
                const end = new Date(res.dateFin);
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                dureeMois = diffDays <= 30 ? 1 : Math.floor(diffDays / 30);
              }

              allReservations.push({
                ...res,
                faceId: face.id,
                face: face.id,
                faceLabel: face.id || `Face ${index + 1}`,
                panneauId: panneau.id,
                panneauIdPan: panneau.idPan,
                panneauAdresse: panneau.adresse,
                panneauType: panneau.type,
                resUniqueId: res.id || res.faceId || `${panneau.id}-${face.id}-${index}`,
                dureeMois: dureeMois
              });
            }
          });
        }
      });
    });

    return allReservations;
  }, [panneaux, userEmail, user]);



  // ============================================
  // FONCTIONS DE FILTRAGE POUR LES RÉSERVATIONS
  // ============================================

  const getFilteredUserReservations = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reservations = getUserReservations();

    return reservations.filter((res: Reservation) => {
      if (!res.dateDebut) return false;

      const dateDebut = new Date(res.dateDebut);
      dateDebut.setHours(0, 0, 0, 0);
      const dateFin = res.dateFin ? new Date(res.dateFin) : null;
      if (dateFin) dateFin.setHours(0, 0, 0, 0);

      // Filtrer par période
      if (timeFilter === 'present') {
        // Réservations en cours (dateDebut <= aujourd'hui <= dateFin)
        if (!dateFin) return false;
        return dateDebut <= today && dateFin >= today;
      } else if (timeFilter === 'futur') {
        // Réservations futures (dateDebut > aujourd'hui)
        const diffMonths = (dateDebut.getFullYear() - today.getFullYear()) * 12 +
          (dateDebut.getMonth() - today.getMonth());
        return dateDebut > today && diffMonths <= monthCount;
      } else if (timeFilter === 'avant') {
        // Réservations passées (dateFin < aujourd'hui)
        if (!dateFin) return false;
        const diffMonths = (today.getFullYear() - dateFin.getFullYear()) * 12 +
          (today.getMonth() - dateFin.getMonth());
        return dateFin < today && diffMonths <= monthCount;
      }

      return true;
    });
  }, [getUserReservations, timeFilter, monthCount]);

  // ============================================
  // STATISTIQUES DE PERFORMANCE DE L'UTILISATEUR
  // ============================================

  const statsEfficacite = useCallback(() => {
    const userRes = getUserReservations();
    const totalAgent = userRes.length;
    const totalGlobal = panneaux.reduce((acc, p) => {
      const faces = p.faces || [];
      return acc + faces.reduce((sum, f) => {
        const res = (f as any).reservations || [];
        return sum + (Array.isArray(res) ? res.length : 0);
      }, 0);
    }, 0);

    const performance = totalGlobal > 0 ? Math.round((totalAgent / totalGlobal) * 100) : 0;

    return { totalAgent, totalGlobal, performance };
  }, [getUserReservations, panneaux]);

  // ============================================
  // METTRE À JOUR LES RÉSERVATIONS DE L'UTILISATEUR
  // ============================================

  useEffect(() => {
    if (userEmail || user?.email) {
      setUserReservations(getUserReservations());
    }
  }, [panneaux, userEmail, user, getUserReservations]);

  // ============================================
  // RÉCUPÉRER LES RÉSERVATIONS EN ATTENTE POUR LE PANIER
  // ============================================

  const reservationsEnAttente = useMemo(() => {
    const allRes = getUserReservations();
    return allRes.filter((res: Reservation) =>
      res.validationComptable === false ||
      res.statut === 'en_attente'
      //res.statut === 'Réservé'
    );
  }, [getUserReservations]);

  // ============================================
  // CALCUL DU TOTAL DE LA FACTURE
  // ============================================

  const totalFactureAmount = useMemo(() => {
    let total = 0;
    Object.keys(selectedForPrint).forEach((key) => {
      if (selectedForPrint[key]) {
        const unitPrice = prices[key] || 0;
        // Trouver la réservation correspondante
        const res = reservationsEnAttente.find(r => r.resUniqueId === key);
        if (res) {
          total += unitPrice * (res.dureeMois || 1);
        }
      }
    });
    return total;
  }, [selectedForPrint, prices, reservationsEnAttente]);

  // ============================================
  // LANCER LA FACTURATION - REDIRECTION VERS /generationpdf
  // ============================================
  const lancerFacturation = (donneesAEnvoyer: any[], totalFacture: number) => {
    if (!donneesAEnvoyer || donneesAEnvoyer.length === 0) {
      alert("⚠️ Erreur : Aucune donnée à facturer.");
      return;
    }

    console.log('🔵 Données à facturer:', donneesAEnvoyer);
    console.log('🔵 Total facture:', totalFacture);

    // Appliquer le mode de paiement global à toutes les réservations
    const donneesCompletes = donneesAEnvoyer.map(res => {
      // S'assurer que chaque réservation a un prix
      const prixSaisi = prices[res.resUniqueId] || 0;
      const dureeMois = res.dureeMois || 1;
      const total = prixSaisi * dureeMois;

      return {
        ...res,
        prixSaisi: prixSaisi,
        modePaiement: globalPaymentMode,
        nombreTranches: globalPaymentMode === 'tranche' ? globalTranchesCount : 1,
        montantParTranche: globalPaymentMode === 'tranche' ? total / globalTranchesCount : 0,
        totalFacture: totalFacture,
        // Champs pour la page de génération PDF
        idFace: res.faceLabel || res.faceId || 'N/A',
        adresse: res.panneauAdresse || res.adresse || '',
        dateDebut: res.dateDebut || '',
        dateFin: res.dateFin || '',
        type: res.type || res.panneauType || 'N/A',
        societeLocatrice: res.societeLocatrice,
        agentNom: res.agentNom || user?.nomComplet || 'Agent',
        agentEmail: res.agentEmail || user?.email || '',
        factureIdFormat: res.factureIdFormat || `F-${Date.now()}`
      };
    });

    console.log('📦 Données complètes pour la facture:', donneesCompletes);

    // ✅ Stocker dans localStorage pour la page de génération PDF
    localStorage.setItem('facture_preview_data', JSON.stringify(donneesCompletes));

    // Vérifier que les données sont bien stockées
    const storedData = localStorage.getItem('facture_preview_data');
    console.log('💾 Données stockées dans localStorage:', storedData ? '✅ OK' : '❌ ERREUR');

    // ✅ Rediriger vers la page de génération PDF
    router.push('/generationpdf');
  };

  const processOperations = async (type: 'unique' | 'selection' | 'delete', data?: any, index?: number) => {
    console.log('🔵 processOperations appelé avec type:', type);

    // 1. CAS PARTICULIER : SUPPRESSION
    if (type === 'delete' && data) {
      await handleDeleteReservation(data);
      return;
    }

    // 2. RÉCUPÉRATION DE LA SÉLECTION
    const selection = type === 'unique'
      ? [data]
      : reservationsEnAttente.filter((r: any) => selectedForPrint[r.resUniqueId]);

    console.log('📋 Réservations sélectionnées:', selection.length);

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

    const erreursSociete = selection.filter((r: any) =>
      r.societeLocatrice?.trim().toLowerCase() !== premiereSociete
    );

    if (erreursSociete.length > 0) {
      alert(`❌ Conflit : Vous ne pouvez pas mélanger plusieurs sociétés sur une facture.`);
      return;
    }

    // 4. VÉRIFICATION DES PRIX
    const erreursTechniques: string[] = [];
    let totalFacture = 0;

    selection.forEach((res: any) => {
      const key = res.resUniqueId;
      const prix = prices[key] || 0;

      if (!prices[key] || prices[key] <= 0) {
        erreursTechniques.push(`- ${res.faceLabel} : Prix manquant`);
      }
      totalFacture += (prices[key] || 0) * (res.dureeMois || 1);
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

    console.log('💰 Total facture calculé:', totalFacture);

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

    if (!confirmation) {
      console.log('❌ Facturation annulée par l\'utilisateur');
      return;
    }

    console.log('✅ Facturation confirmée, redirection vers /generationpdf');

    // ✅ APPEL À LA FONCTION DE FACTURATION
    lancerFacturation(selection, totalFacture);
  };

  // ============================================
  // SUPPRESSION D'UNE RÉSERVATION
  // ============================================
  const handleDeleteReservation = async (res: any) => {
    if (!window.confirm(`Supprimer définitivement la réservation de ${res.societeLocatrice} ?`)) {
      return;
    }

    try {
      const panneauRef = doc(db, "panneaux", res.panelDocId);
      const panneauSnap = await getDoc(panneauRef);

      if (!panneauSnap.exists()) {
        alert("Panneau introuvable");
        return;
      }

      const data = panneauSnap.data();
      const currentFaces = [...(data.faces || [])];
      const faceIndex = res.faceIndex;

      if (!currentFaces[faceIndex]) {
        alert("Face introuvable");
        return;
      }

      const faceReservations = currentFaces[faceIndex].reservations || [];
      const updatedReservations = faceReservations.filter((r: any) => {
        return !(
          r.dateDebut === res.dateDebut &&
          r.societeLocatrice === res.societeLocatrice &&
          r.createdAt === res.createdAt
        );
      });

      currentFaces[faceIndex].reservations = updatedReservations;

      if (updatedReservations.length === 0) {
        currentFaces[faceIndex].statut = "Libre";
      }

      await updateDoc(panneauRef, {
        faces: currentFaces
      });

      if (res.photoCampagneUrl && res.photoCampagneUrl.includes('cloudinary')) {
        try {
          await fetch('/api/delete-cloudinary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: res.photoCampagneUrl })
          });
        } catch (cloudinaryError) {
          console.error("Erreur suppression image Cloudinary:", cloudinaryError);
        }
      }

      alert("✅ Réservation supprimée avec succès !");

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











  // ============================================
  // FONCTIONS POUR LES RÉSERVATIONS - CORRIGÉES
  // ============================================

  // Obtenir la réservation active d'une face (celle qui contient la date du jour)
  const getReservationActive = (face: Face): Reservation | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ✅ Les réservations sont dans la face elle-même
    const faceReservations = (face as any).reservations || [];

    if (!Array.isArray(faceReservations) || faceReservations.length === 0) {
      return null;
    }

    const active = faceReservations.find((res: Reservation) => {
      if (!res.dateDebut || !res.dateFin) return false;

      const dateDebut = new Date(res.dateDebut);
      const dateFin = new Date(res.dateFin);
      dateDebut.setHours(0, 0, 0, 0);
      dateFin.setHours(0, 0, 0, 0);

      // ✅ La date du jour doit être >= dateDebut ET <= dateFin
      return today >= dateDebut && today <= dateFin;
    });

    return active || null;
  };

  // Obtenir les réservations futures d'une face
  const getReservationsFutures = (face: Face): Reservation[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ✅ Les réservations sont dans la face elle-même
    const faceReservations = (face as any).reservations || [];

    if (!Array.isArray(faceReservations) || faceReservations.length === 0) {
      return [];
    }

    return faceReservations.filter((res: Reservation) => {
      if (!res.dateDebut) return false;

      const dateDebut = new Date(res.dateDebut);
      dateDebut.setHours(0, 0, 0, 0);

      // ✅ La date de début doit être > date du jour (strictement supérieur)
      return dateDebut > today;
    });
  };

  // Déterminer le statut d'une face
  const getFaceStatus = (face: Face): string => {
    // ✅ Vérifier d'abord si une réservation est active
    const active = getReservationActive(face);
    if (active) {
      // Utiliser le statut de la réservation active
      return active.statut || 'Occupé';
    }

    // ✅ Vérifier s'il y a des réservations futures
    const futures = getReservationsFutures(face);
    if (futures.length > 0) {
      return 'Réservé';
    }

    // ✅ Si aucune réservation active ni future, la face est libre
    return 'Libre';
  };


  // ============================================
  // LOGIQUE DE FILTRAGE - CORRIGÉE
  // ============================================
  const filteredPanneaux: Panneau[] = useMemo(() => {
    if (!panneaux.length) return [];

    return panneaux.filter((panneau: Panneau) => {
      // ✅ 1. FILTRE GÉOGRAPHIQUE - Comparaison partielle (commence par)
      if (geoFilter.pays !== 'Tous') {
        const paysMatch = panneau.adresse?.toLowerCase().startsWith(geoFilter.pays.toLowerCase());
        if (!paysMatch) return false;
      }

      if (geoFilter.province !== 'Tous') {
        const adresseParts = (panneau.adresse || '').split('/').map((s: string) => s.trim());
        const province = adresseParts[1] || '';
        if (!province.toLowerCase().includes(geoFilter.province.toLowerCase())) return false;
      }

      if (geoFilter.district !== 'Tous') {
        const adresseParts = (panneau.adresse || '').split('/').map((s: string) => s.trim());
        const district = adresseParts[2] || '';
        if (!district.toLowerCase().includes(geoFilter.district.toLowerCase())) return false;
      }

      if (geoFilter.commune !== 'Tous') {
        const adresseParts = (panneau.adresse || '').split('/').map((s: string) => s.trim());
        const commune = adresseParts[3] || '';
        if (!commune.toLowerCase().includes(geoFilter.commune.toLowerCase())) return false;
      }

      // ✅ 2. FILTRE DE RECHERCHE - Par ID du panneau
      if (searchFilter) {
        const searchLower = searchFilter.toLowerCase();
        const matchId = (panneau.idPan || '').toLowerCase().includes(searchLower);
        if (!matchId) return false;
      }

      // ✅ 3. FILTRE PAR TYPE DE PANNEAU
      if (typeFilter !== 'Tous') {
        const panneauType = (panneau.type || '').toLowerCase().trim();
        const filterType = typeFilter.toLowerCase().trim();
        if (panneauType !== filterType) return false;
      }

      // ✅ 4. FILTRE PAR DATE - Échéance
      // On garde le panneau s'il a au moins une face avec une réservation active dans l'intervalle
      if (dateFilter.startDate || dateFilter.endDate) {
        const hasMatchingReservation = (panneau.faces || []).some((face: Face) => {
          const faceReservations = (face as any).reservations || [];
          if (!Array.isArray(faceReservations) || faceReservations.length === 0) return false;

          return faceReservations.some((res: Reservation) => {
            if (!res.dateDebut || !res.dateFin) return false;

            // ✅ Vérifier si la réservation est active dans l'intervalle
            const resStart = new Date(res.dateDebut);
            const resEnd = new Date(res.dateFin);

            // Si dateFilter.startDate est défini, la réservation doit commencer après ou à cette date
            if (dateFilter.startDate) {
              const filterStart = new Date(dateFilter.startDate);
              if (resEnd < filterStart) return false;
            }

            // Si dateFilter.endDate est défini, la réservation doit finir avant ou à cette date
            if (dateFilter.endDate) {
              const filterEnd = new Date(dateFilter.endDate);
              if (resStart > filterEnd) return false;
            }

            return true;
          });
        });

        if (!hasMatchingReservation) return false;
      }

      // ✅ 5. FILTRE PAR STATUT
      if (statusFilter !== 'Tous') {
        const hasMatchingFace = (panneau.faces || []).some((face: Face) => {
          const faceStatus = getFaceStatus(face);
          return faceStatus === statusFilter;
        });
        if (!hasMatchingFace) return false;
      }

      return true;
    });
  }, [panneaux, geoFilter, searchFilter, statusFilter, typeFilter, dateFilter]);


  const stats: Stats = useMemo(() => {
    let totalPanneaux = filteredPanneaux.length;
    let totalFaces = 0;
    let totalLibres = 0;
    let totalOccupes = 0;
    let totalReserves = 0;
    let totalReservationsFutures = 0;
    let totalRevenue = 0;

    filteredPanneaux.forEach((panneau: Panneau) => {
      const faces = panneau.faces || [];

      faces.forEach((face: Face) => {
        totalFaces++;

        // ✅ Les réservations sont dans la face
        const activeReservation = getReservationActive(face);
        const futureReservations = getReservationsFutures(face);

        // ✅ Compter les réservations futures
        totalReservationsFutures += futureReservations.length;

        // ✅ Déterminer le statut
        let status = 'Libre';
        if (activeReservation) {
          status = activeReservation.statut || 'Occupé';
        } else if (futureReservations.length > 0) {
          status = 'Réservé';
        }

        // ✅ Incrémenter les compteurs
        if (status === 'Libre') totalLibres++;
        else if (status === 'Occupé') totalOccupes++;
        else if (status === 'Réservé') totalReserves++;

        // ✅ Calculer le revenu à partir des réservations de la face
        const faceReservations = (face as any).reservations || [];
        if (Array.isArray(faceReservations)) {
          faceReservations.forEach((res: Reservation) => {
            if (res.montant) {
              totalRevenue += parseFloat(String(res.montant)) || 0;
            }
          });
        }
      });
    });

    return {
      totalPanneaux,
      totalFaces,
      totalLibres,
      totalOccupes,
      totalReserves,
      totalReservationsFutures,
      totalRevenue
    };
  }, [filteredPanneaux]);


  // États pour la réservation
  const [faceModalDefaultTab, setFaceModalDefaultTab] = useState<'details' | 'reservation'>('details');

  // ✅ Fonction pour ouvrir le modal de réservation (à placer dans le composant parent)
  const openReservationModal = (panneau: Panneau, face: Face) => {

    // Stocker le panneau et la face sélectionnés
    setPanneauForReservation(panneau);
    setFaceForReservation(face);

    // Ouvrir le modal d'édition
    setIsReservationModalOpen(true);
  };

  // ✅ Fonction pour fermer le modal de réservation


  // ============================================
  // EXPORT PDF - VERSION PREMIUM
  // ============================================
  const exportPDF = (): void => {
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // ============================================
      // 1. EN-TÊTE AVEC LOGO ET BANDEAU
      // ============================================

      // Bandeau supérieur bleu
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 45, 'F');

      // Dégradé visuel (bande plus claire)
      doc.setFillColor(59, 130, 246, 0.3);
      doc.rect(0, 45, pageWidth, 3, 'F');

      // Titre principal
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPPORT DES PANNEAUX PUBLICITAIRES', pageWidth / 2, 28, { align: 'center' });

      // Sous-titre
      doc.setFontSize(11);
      doc.setTextColor(191, 219, 254);
      doc.setFont('helvetica', 'normal');
      doc.text('GESTION DES FACES ET LOCATIONS', pageWidth / 2, 38, { align: 'center' });

      // ============================================
      // 2. INFORMATIONS DE RAPPORT
      // ============================================

      let yPos = 56;

      // Date et heure de génération
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'italic');
      doc.text(`Généré le: ${new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, 14, yPos);

      // Nombre de panneaux
      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${stats.totalPanneaux} Panneaux`, pageWidth - 40, yPos, { align: 'right' });

      yPos += 8;

      // ============================================
      // 3. STATISTIQUES EN CARTES
      // ============================================

      const statsY = yPos + 2;
      const cardWidth = (pageWidth - 40) / 6;
      const cardHeight = 22;
      const colors = [
        { bg: [219, 234, 254], border: [37, 99, 235], text: [30, 58, 138], label: 'Total Faces', value: stats.totalFaces },
        { bg: [209, 250, 229], border: [16, 185, 129], text: [6, 78, 59], label: '🟢 Libres', value: stats.totalLibres },
        { bg: [219, 234, 254], border: [59, 130, 246], text: [30, 58, 138], label: '🔵 Occupées', value: stats.totalOccupes },
        { bg: [253, 230, 138], border: [245, 158, 11], text: [120, 53, 15], label: '🟡 Réservées', value: stats.totalReserves },
        { bg: [243, 232, 255], border: [168, 85, 247], text: [91, 33, 182], label: '📅 Rés. Futures', value: stats.totalReservationsFutures },
        { bg: [209, 250, 229], border: [16, 185, 129], text: [6, 78, 59], label: '💰 Revenu Total', value: `${stats.totalRevenue.toLocaleString()} $` }
      ];

      colors.forEach((card, index) => {
        const x = 14 + (index * cardWidth) + (index * 2);

        // Fond de la carte
        doc.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
        doc.roundedRect(x, statsY, cardWidth, cardHeight, 2, 2, 'F');

        // Bordure
        doc.setDrawColor(card.border[0], card.border[1], card.border[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, statsY, cardWidth, cardHeight, 2, 2, 'S');

        // Label
        doc.setFontSize(7);
        doc.setTextColor(card.text[0], card.text[1], card.text[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(card.label, x + 3, statsY + 6);

        // Valeur
        doc.setFontSize(12);
        doc.setTextColor(card.text[0], card.text[1], card.text[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(String(card.value), x + 3, statsY + 17);
      });

      yPos = statsY + cardHeight + 10;

      // ============================================
      // 4. TABLEAU DES PANNEAUX
      // ============================================

      // Ligne de séparation
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.3);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 4;

      // Titre du tableau
      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      doc.text('DÉTAIL DES PANNEAUX', 14, yPos);
      yPos += 6;

      // Préparation des données du tableau
      const tableData = filteredPanneaux.flatMap((panneau: Panneau) => {
        const faces = panneau.faces || [];
        if (faces.length === 0) {
          return [[
            panneau.idPan || 'N/A',
            (panneau.adresse || 'N/A').substring(0, 35),
            panneau.type || 'N/A',
            panneau.dimension || 'N/A',
            'Aucune',
            '-',
            '-',
            '-',
            '-',
            '-'
          ]];
        }
        return faces.map((face: Face) => {
          const activeReservation = getReservationActive(face);
          const futureCount = getReservationsFutures(face).length;
          const status = getFaceStatus(face);

          // Déterminer la couleur du statut
          let statusColor = [100, 116, 139];
          if (status === 'Libre') statusColor = [16, 185, 129];
          else if (status === 'Occupé') statusColor = [59, 130, 246];
          else if (status === 'Réservé') statusColor = [245, 158, 11];

          return [
            panneau.idPan || 'N/A',
            (panneau.adresse || 'N/A').substring(0, 35),
            panneau.type || 'N/A',
            panneau.dimension || 'N/A',
            face.id || 'N/A',
            face.sens || 'N/A',
            activeReservation?.societeLocatrice || 'S/N',
            status,
            activeReservation?.dateFin || 'N/A',
            futureCount
          ];
        });
      });

      if (tableData.length > 0) {
        autoTable(doc, {
          head: [[
            { content: 'ID', styles: { halign: 'center' } },
            { content: 'Adresse', styles: { halign: 'left' } },
            { content: 'Type', styles: { halign: 'center' } },
            { content: 'Dim.', styles: { halign: 'center' } },
            { content: 'Face', styles: { halign: 'center' } },
            { content: 'Sens', styles: { halign: 'left' } },
            { content: 'Société', styles: { halign: 'left' } },
            { content: 'Statut', styles: { halign: 'center' } },
            { content: 'Échéance', styles: { halign: 'center' } },
            { content: 'Rés. Fut.', styles: { halign: 'center' } }
          ]],
          body: tableData,
          startY: yPos + 2,
          margin: { left: 14, right: 14 },
          styles: {
            fontSize: 7,
            cellPadding: 2,
            lineColor: [200, 200, 200],
            lineWidth: 0.1
          },
          headStyles: {
            fillColor: [37, 99, 235],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center'
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251]
          },
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 50 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 15, halign: 'center' },
            5: { cellWidth: 25 },
            6: { cellWidth: 30 },
            7: { cellWidth: 22, halign: 'center' },
            8: { cellWidth: 25, halign: 'center' },
            9: { cellWidth: 20, halign: 'center' }
          },
          didDrawCell: (data: any) => {
            // Colorer les cellules de statut
            if (data.section === 'body' && data.column.index === 7) {
              const status = data.cell.raw;
              let color = [100, 116, 139];
              let bgColor = [241, 245, 249];

              if (status === 'Libre') {
                color = [16, 185, 129];
                bgColor = [209, 250, 229];
              } else if (status === 'Occupé') {
                color = [59, 130, 246];
                bgColor = [219, 234, 254];
              } else if (status === 'Réservé') {
                color = [245, 158, 11];
                bgColor = [253, 230, 138];
              }

              // Fond coloré
              data.cell.styles.fillColor = bgColor;
              data.cell.styles.textColor = color;
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });
      }

      // ============================================
      // 5. PIED DE PAGE
      // ============================================

      const finalY = doc.internal.pageSize.getHeight() - 12;

      // Ligne de séparation
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(14, finalY - 5, pageWidth - 14, finalY - 5);

      // Pied de page
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      doc.text(`© ${new Date().getFullYear()} - Rapport généré le ${new Date().toLocaleString('fr-FR')}`, 14, finalY);

      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      doc.text(`Page 1/1`, pageWidth - 14, finalY, { align: 'right' });

      // ============================================
      // 6. SAUVEGARDE
      // ============================================

      doc.save(`Rapport_Panneaux_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
      console.error('Erreur export PDF:', err);
      alert('Erreur lors de l\'export du PDF. Veuillez réessayer.');
    }
  };


  // ============================================
  // FONCTIONS DE GESTION ADMIN
  // ============================================

  // Gestion des agents
  const handleAgentAction = (action: string, agent: any) => {
    console.log(`Action ${action} sur agent:`, agent);
    switch (action) {
      case 'view':
        // Ouvrir les détails de l'agent
        alert(`👤 Agent: ${agent.nom}\n📧 Email: ${agent.email}\n📊 Réservations: ${agent.reservations}\n💰 CA: ${agent.revenue} $`);
        break;
      case 'edit':
        // Modifier l'agent
        alert(`✏️ Modification de l'agent: ${agent.nom}`);
        break;
      default:
        console.log('Action non reconnue:', action);
    }
  };

  // Gestion des réservations
  const handleReservationAction = (action: string, reservation: any) => {
    console.log(`Action ${action} sur réservation:`, reservation);
    switch (action) {
      case 'view':
        // Voir les détails
        alert(`📋 Réservation: ${reservation.societeLocatrice}\n👤 Agent: ${reservation.agentNom}\n📅 ${reservation.dateDebut} → ${reservation.dateFin}\n💰 ${reservation.montant} $`);
        break;
      case 'update':
        // Mettre à jour
        console.log('Mise à jour de la réservation:', reservation);
        // Ici, vous devriez mettre à jour dans Firestore
        alert(`✅ Réservation mise à jour: ${reservation.societeLocatrice}`);
        break;
      case 'print':
        // Imprimer la facture
        console.log('Impression de la facture:', reservation);
        // Rediriger vers la page de génération PDF
        localStorage.setItem('facture_preview_data', JSON.stringify([reservation]));
        router.push('/generationpdf');
        break;
      default:
        console.log('Action non reconnue:', action);
    }
  };

  // Gestion des rendez-vous
  const handleRdvAction = (action: string, rdv: any) => {
    console.log(`Action ${action} sur RDV:`, rdv);
    switch (action) {
      case 'add':
        alert('📅 Nouveau rendez-vous à créer');
        break;
      case 'view':
        alert(`📅 RDV: ${rdv.clientNom}\n👤 Agent: ${rdv.agentNom}\n📅 ${rdv.date} à ${rdv.heure}\n📋 ${rdv.objet}`);
        break;
      case 'edit':
        alert(`✏️ Modification du RDV: ${rdv.clientNom}`);
        break;
      case 'delete':
        if (confirm(`Supprimer le RDV avec ${rdv.clientNom} ?`)) {
          console.log('RDV supprimé:', rdv);
          alert('✅ RDV supprimé');
        }
        break;
      default:
        console.log('Action non reconnue:', action);
    }
  };

  // Export du rapport admin
  const exportAdminReport = (type: string) => {
    console.log(`📄 Export du rapport ${type}`);
    // Utiliser la même logique que exportPDF mais avec les données admin
    const data = {
      type,
      agents: agents,
      reservations: adminReservations,
      rdv: rdvList,
      date: new Date().toISOString()
    };

    // Générer un rapport PDF
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();

      // En-tête
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(`RAPPORT ADMIN - ${type.toUpperCase()}`, pageWidth / 2, 25, { align: 'center' });

      // Date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 14, 55);

      // Contenu selon le type
      let yPos = 65;
      if (type === 'agents') {
        autoTable(doc, {
          head: [['Agent', 'Email', 'Réservations', 'Actives', 'Validées', 'CA']],
          body: agents.map(a => [
            a.nom,
            a.email,
            a.reservations,
            a.actives,
            a.validees,
            `${a.revenue.toLocaleString()} $`
          ]),
          startY: yPos,
          margin: { left: 14, right: 14 },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] }
        });
      }

      doc.save(`Rapport_Admin_${type}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export du rapport');
    }
  };

  // ============================================
  // EXPORT EXCEL - VERSION AVANCÉE
  // ============================================
  const exportExcel = (): void => {
    try {
      // ============================================
      // 1. PRÉPARATION DES DONNÉES
      // ============================================

      const data = filteredPanneaux.flatMap((panneau: Panneau) => {
        const faces = panneau.faces || [];
        if (faces.length === 0) {
          return [{
            'ID Panneau': panneau.idPan || 'N/A',
            'Adresse': panneau.adresse || 'N/A',
            'Type': panneau.type || 'N/A',
            'Dimension': panneau.dimension || 'N/A',
            'Face': 'Aucune',
            'Sens': 'N/A',
            'Société Locatrice': 'N/A',
            'Statut': 'N/A',
            'Date Début': 'N/A',
            'Date Fin': 'N/A',
            'Réservations Futures': 0,
            'Prochaine Réservation': 'N/A',
            'Statut Paiement': 'N/A',
            'Agent': 'N/A'
          }];
        }

        return faces.map((face: Face) => {
          const activeReservation = getReservationActive(face);
          const futureCount = getReservationsFutures(face).length;
          const status = getFaceStatus(face);

          return {
            'ID Panneau': panneau.idPan || 'N/A',
            'Adresse': panneau.adresse || 'N/A',
            'Type': panneau.type || 'N/A',
            'Dimension': panneau.dimension || 'N/A',
            'Face': face.id || 'N/A',
            'Sens': face.sens || 'N/A',
            'Société Locatrice': activeReservation?.societeLocatrice || face.societeLocatrice || 'S/N',
            'Statut': status,
            'Date Début': activeReservation?.dateDebut || face.dateDebut || 'N/A',
            'Date Fin': activeReservation?.dateFin || face.dateFin || 'N/A',
            'Réservations Futures': futureCount,
            'Prochaine Réservation': futureCount > 0 ? getReservationsFutures(face)[0]?.dateDebut || 'N/A' : 'N/A',
            'Statut Paiement': activeReservation?.statutPaiement || face.statutPaiement || 'N/A',
            'Agent': activeReservation?.agentNom || 'N/A'
          };
        });
      });

      // ============================================
      // 2. CRÉATION DU CLASSEUR
      // ============================================

      const wb = XLSX.utils.book_new();

      // ============================================
      // 3. FEUILLE PRINCIPALE
      // ============================================

      const ws = XLSX.utils.json_to_sheet(data);

      // Définir la largeur des colonnes
      ws['!cols'] = [
        { wch: 15 },  // ID Panneau
        { wch: 40 },  // Adresse
        { wch: 15 },  // Type
        { wch: 12 },  // Dimension
        { wch: 10 },  // Face
        { wch: 15 },  // Sens
        { wch: 25 },  // Société Locatrice
        { wch: 12 },  // Statut
        { wch: 14 },  // Date Début
        { wch: 14 },  // Date Fin
        { wch: 18 },  // Réservations Futures
        { wch: 18 },  // Prochaine Réservation
        { wch: 16 },  // Statut Paiement
        { wch: 25 }   // Agent
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Panneaux');

      // ============================================
      // 4. FEUILLE DE STATISTIQUES
      // ============================================

      const statsData = [
        { 'Indicateur': '📊 Total Panneaux', 'Valeur': stats.totalPanneaux },
        { 'Indicateur': '🎯 Total Faces', 'Valeur': stats.totalFaces },
        { 'Indicateur': '🟢 Faces Libres', 'Valeur': stats.totalLibres },
        { 'Indicateur': '🔵 Faces Occupées', 'Valeur': stats.totalOccupes },
        { 'Indicateur': '🟡 Faces Réservées', 'Valeur': stats.totalReserves },
        { 'Indicateur': '📅 Réservations Futures', 'Valeur': stats.totalReservationsFutures },
        { 'Indicateur': '💰 Revenu Total', 'Valeur': `${stats.totalRevenue.toLocaleString()} $` }
      ];

      const wsStats = XLSX.utils.json_to_sheet(statsData);
      wsStats['!cols'] = [
        { wch: 30 },
        { wch: 20 }
      ];

      XLSX.utils.book_append_sheet(wb, wsStats, 'Statistiques');

      // ============================================
      // 5. FEUILLE DE RÉSUMÉ PAR STATUT
      // ============================================

      const statusSummary = [
        { 'Statut': 'Libre', 'Nombre': stats.totalLibres, 'Pourcentage': `${((stats.totalLibres / stats.totalFaces) * 100 || 0).toFixed(1)}%` },
        { 'Statut': 'Occupé', 'Nombre': stats.totalOccupes, 'Pourcentage': `${((stats.totalOccupes / stats.totalFaces) * 100 || 0).toFixed(1)}%` },
        { 'Statut': 'Réservé', 'Nombre': stats.totalReserves, 'Pourcentage': `${((stats.totalReserves / stats.totalFaces) * 100 || 0).toFixed(1)}%` }
      ];

      const wsSummary = XLSX.utils.json_to_sheet(statusSummary);
      wsSummary['!cols'] = [
        { wch: 20 },
        { wch: 15 },
        { wch: 15 }
      ];

      XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé Statuts');

      // ============================================
      // 6. APPLICATION DU STYLE AVANCÉ
      // ============================================

      // Appliquer le style à la première feuille (Panneaux)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

      // Style pour l'en-tête
      for (let C = range.s.c; C <= range.e.c; C++) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[address]) continue;

        // Ajouter une propriété de style personnalisée
        ws[address].s = {
          font: {
            bold: true,
            sz: 11,
            color: { rgb: "FFFFFF" }
          },
          fill: {
            fgColor: { rgb: "1D4ED8" } // Bleu foncé
          },
          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true
          },
          border: {
            top: { style: "thin", color: { rgb: "2563EB" } },
            bottom: { style: "thin", color: { rgb: "2563EB" } },
            left: { style: "thin", color: { rgb: "2563EB" } },
            right: { style: "thin", color: { rgb: "2563EB" } }
          }
        };
      }

      // Style pour les données
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[address]) continue;

          const cellValue = ws[address].v;
          const isEven = R % 2 === 0;

          // Style de base
          ws[address].s = {
            font: { sz: 10 },
            fill: {
              fgColor: { rgb: isEven ? "F8FAFC" : "FFFFFF" }
            },
            alignment: {
              vertical: "center",
              wrapText: true
            },
            border: {
              top: { style: "thin", color: { rgb: "E5E7EB" } },
              bottom: { style: "thin", color: { rgb: "E5E7EB" } },
              left: { style: "thin", color: { rgb: "E5E7EB" } },
              right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
          };

          // Colorer les cellules de statut
          const isStatus = C === 7; // Colonne Statut (index 7)
          if (isStatus && cellValue) {
            let bgColor = "F8FAFC";
            let textColor = "1F2937";

            if (cellValue === 'Libre') {
              bgColor = "D1FAE5";
              textColor = "065F46";
            } else if (cellValue === 'Occupé') {
              bgColor = "DBEAFE";
              textColor = "1E40AF";
            } else if (cellValue === 'Réservé') {
              bgColor = "FDE68A";
              textColor = "78350F";
            }

            ws[address].s.fill.fgColor = { rgb: bgColor };
            ws[address].s.font.color = { rgb: textColor };
            ws[address].s.font.bold = true;
          }

          // Colorer les cellules de paiement
          const isPaiement = C === 12; // Colonne Statut Paiement (index 12)
          if (isPaiement && cellValue) {
            let bgColor = "F8FAFC";
            let textColor = "1F2937";

            if (cellValue === 'Payé') {
              bgColor = "D1FAE5";
              textColor = "065F46";
            } else if (cellValue === 'en attente') {
              bgColor = "FDE68A";
              textColor = "78350F";
            }

            ws[address].s.fill.fgColor = { rgb: bgColor };
            ws[address].s.font.color = { rgb: textColor };
          }
        }
      }

      // ============================================
      // 7. FILTRES ET GROUPES
      // ============================================

      // Appliquer des filtres à l'en-tête
      ws['!autofilter'] = {
        ref: XLSX.utils.encode_range(range)
      };

      // Figer la première ligne
      ws['!freeze'] = {
        xSplit: 0,
        ySplit: 1
      };

      // ============================================
      // 8. STYLE DES FEUILLES STATISTIQUES
      // ============================================

      // Style pour la feuille Statistiques
      const rangeStats = XLSX.utils.decode_range(wsStats['!ref'] || 'A1');
      for (let C = rangeStats.s.c; C <= rangeStats.e.c; C++) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (wsStats[address]) {
          wsStats[address].s = {
            font: { bold: true, sz: 12, color: { rgb: "1D4ED8" } },
            fill: { fgColor: { rgb: "EFF6FF" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      }

      // ============================================
      // 9. AJOUT D'UNE FEUILLE DE FILTRES
      // ============================================

      const filtersData = [
        { 'Filtre': 'Pays', 'Valeur': geoFilter.pays || 'Tous' },
        { 'Filtre': 'Province', 'Valeur': geoFilter.province || 'Tous' },
        { 'Filtre': 'District', 'Valeur': geoFilter.district || 'Tous' },
        { 'Filtre': 'Commune', 'Valeur': geoFilter.commune || 'Tous' },
        { 'Filtre': 'Statut', 'Valeur': statusFilter || 'Tous' },
        { 'Filtre': 'Type de Panneau', 'Valeur': typeFilter || 'Tous' },
        {
          'Filtre': 'Période', 'Valeur': dateFilter.startDate && dateFilter.endDate ?
            `${dateFilter.startDate} → ${dateFilter.endDate}` : 'Toute la période'
        },
        { 'Filtre': 'Recherche', 'Valeur': searchFilter || 'Aucune' }
      ];

      const wsFilters = XLSX.utils.json_to_sheet(filtersData);
      wsFilters['!cols'] = [
        { wch: 25 },
        { wch: 40 }
      ];

      XLSX.utils.book_append_sheet(wb, wsFilters, 'Filtres Appliqués');

      // ============================================
      // 10. SAUVEGARDE
      // ============================================

      const fileName = `Rapport_Panneaux_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (err) {
      console.error('Erreur export Excel:', err);
      alert('Erreur lors de l\'export Excel. Veuillez réessayer.');
    }
  };

  // ============================================
  // RENDU DU TABLEAU - VERSION CORRIGÉE
  // ============================================
  const renderTableauPanneaux = (): React.ReactNode => {
    // État local pour gérer l'expansion des panneaux
    const [expandedPanneaux, setExpandedPanneaux] = useState<Set<string>>(new Set());

    const togglePanneau = (panneauId: string) => {
      const newExpanded = new Set(expandedPanneaux);
      if (newExpanded.has(panneauId)) {
        newExpanded.delete(panneauId);
      } else {
        newExpanded.add(panneauId);
      }
      setExpandedPanneaux(newExpanded);
    };

    // ✅ Fonction pour calculer le nombre de mois entre deux dates (base 30 jours)
    const calculateMonths = (dateDebut: string | undefined, dateFin: string | undefined): number => {
      if (!dateDebut || !dateFin) return 0;

      const start = new Date(dateDebut);
      const end = new Date(dateFin);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Si le nombre de jours est inférieur ou égal à 30, retourner 1 mois
      if (diffDays <= 30) return 1;

      // Sinon, arrondir à l'inférieur (floor) pour avoir le nombre de mois complets
      return Math.floor(diffDays / 30);
    };

    // ✅ Fonction pour extraire et calculer le produit des dimensions avec unité
    // ✅ Fonction pour extraire et calculer le produit des dimensions avec unité
    const calculateDimensionSum = (dimension: string | undefined): { value: number; unit: string } => {
      if (!dimension) return { value: 0, unit: 'm²' };

      // Extrait les nombres
      const numbers = dimension.match(/[\d.]+/g)?.map(Number).filter(num => num > 0) || [];

      if (numbers.length === 0) return { value: 0, unit: 'm²' };

      // Calcule le produit
      const product = numbers.reduce((acc, val) => acc * val, 1);
      const roundedProduct = Math.round(product * 100) / 100;

      return { value: roundedProduct, unit: 'm²' };
    };

    // ✅ Fonction pour formater l'adresse (affiche la commune si pas assez de place)
    const formatAddress = (address: string | undefined, maxLength?: number): string => {
      if (!address) return 'N/A';

      // Si pas de limite ou adresse courte, retourner l'adresse complète
      if (!maxLength || address.length <= maxLength) return address;

      // Essayer d'extraire la commune (dernière partie après la virgule)
      const parts = address.split(',').map(p => p.trim());
      if (parts.length > 1) {
        // Retourner les 2 derniers éléments (souvent quartier et commune)
        const lastParts = parts.slice(-2).join(', ');
        if (lastParts.length <= maxLength) return lastParts;
        // Sinon retourner juste la dernière partie
        return parts[parts.length - 1] || address;
      }

      // Si pas de virgule, tronquer avec "..." 
      return address.substring(0, maxLength) + '...';
    };

    const openOnMap = (panneau: Panneau) => {
      const coords = panneau?.coords || panneau?.gps_raw;
      if (coords && coords.lat && coords.lng) {
        localStorage.setItem('map_single_panneau', JSON.stringify({
          id: panneau.id,
          idPan: panneau.idPan,
          adresse: panneau.adresse || 'Adresse non définie',
          lat: coords.lat,
          lng: coords.lng,
          type: panneau.type || 'Standard'
        }));
        window.location.href = '/dashboard/superviseurs/carte';
      } else {
        alert('⚠️ Ce panneau n\'a pas de coordonnées GPS enregistrées.');
      }
    };

    if (loading) {
      return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Réessayer
          </button>
        </div>
      );
    }

    // ✅ Fonction pour ouvrir EditPanneauModal
    const openEditPanneau = (panneau: any) => {
      if (!panneau) {
        alert('⚠️ Aucun panneau sélectionné');
        return;
      }
      setPanneauToEdit(panneau);
    };

    // ✅ Fonction pour fermer EditPanneauModal
    const closeEditPanneau = () => {
      setPanneauToEdit(null);
    };

    if (filteredPanneaux.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-600">Aucun panneau trouvé</h3>
          <p className="text-sm text-gray-400 mt-1">Ajustez vos filtres pour voir plus de résultats</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div
          ref={tableContainerRef}
          className="overflow-auto"
          style={{ maxHeight: 'calc(100vh - 400px)' }}
        >
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px] sm:min-w-[1200px]">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[#00539B] from-blue-900 to-indigo-900">
                  <th className="bg-[#00539B] px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider border-r border-blue-700/30 min-w-[70px] sm:min-w-[100px] sticky left-0 z-30">
                    IdPan / Adresse
                  </th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider border-r border-blue-700/30 min-w-[60px] sm:min-w-[80px]">
                    Type
                  </th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider border-r border-blue-700/30 min-w-[60px] sm:min-w-[80px]">
                    Dimension
                  </th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider border-r border-blue-700/30 min-w-[60px] sm:min-w-[80px]">
                    Total Dim
                  </th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider border-r border-blue-700/30 min-w-[50px] sm:min-w-[70px]">
                    Nb Faces
                  </th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider border-r border-blue-700/30 min-w-[90px] sm:min-w-[130px]">
                    Actions
                  </th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider border-r border-blue-700/30 min-w-[50px] sm:min-w-[60px]">
                    Face
                  </th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider border-r border-blue-700/30 min-w-[55px] sm:min-w-[70px]">
                    Sens
                  </th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider border-r border-blue-700/30 min-w-[80px] sm:min-w-[110px]">
                    Société Locatrice
                  </th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider border-r border-blue-700/30 min-w-[100px] sm:min-w-[140px]">
                    Date début - fin
                  </th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider border-r border-blue-700/30 min-w-[55px] sm:min-w-[80px]">
                    Nb Mois
                  </th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider border-r border-blue-700/30 min-w-[60px] sm:min-w-[80px]">
                    Nb Rés. Fut.
                  </th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider min-w-[70px] sm:min-w-[90px]">
                    Statut
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredPanneaux.map((panneau: Panneau) => {
                  const faces = panneau.faces || [];
                  const isExpanded = expandedPanneaux.has(panneau.id);
                  const dimensionResult = calculateDimensionSum(panneau.dimension);

                  if (faces.length === 0) {
                    return (
                      <tr key={`${panneau.id}-empty`} className="hover:bg-amber-50/50 transition-colors border-b border-gray-200">
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-sm md:text-base font-black text-blue-700 border-r border-gray-200 sticky left-0 z-10 bg-white min-w-[70px] sm:min-w-[100px]">
                          <div>
                            <div className="text-blue-700 text-[10px] sm:text-xs md:text-sm">{panneau.idPan || 'N/A'}</div>
                            <div className="text-[9px] sm:text-xs md:text-sm font-medium text-gray-600 mt-1 break-words max-w-[120px] sm:max-w-[200px]">
                              {formatAddress(panneau.adresse, 20)}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-[10px] sm:text-xs md:text-sm font-semibold text-gray-700 border-r border-gray-200">{panneau.type || 'N/A'}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-[10px] sm:text-xs md:text-sm font-semibold text-gray-700 border-r border-gray-200">{panneau.dimension || 'N/A'}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs md:text-sm font-bold text-purple-600 border-r border-gray-200">
                          {dimensionResult.value > 0 ? `${dimensionResult.value} ${dimensionResult.unit}` : '-'}
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs md:text-sm font-black text-blue-600 border-r border-gray-200">0</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-center border-r border-gray-200">
                          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                            <button
                              onClick={() => openOnMap(panneau)}
                              className="px-1.5 sm:px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[8px] sm:text-[10px] md:text-xs font-bold hover:bg-emerald-200 transition flex items-center gap-0.5"
                            >
                              <MapPin size={10} className="sm:w-3 sm:h-3" />
                              <span className="hidden xs:inline">Carte</span>
                            </button>
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-[10px] sm:text-xs text-gray-400 border-r border-gray-200 text-center" colSpan={6}>Aucune face</td>
                      </tr>
                    );
                  }

                  return (
                    <React.Fragment key={panneau.id}>
                      {/* Ligne principale du panneau - Cliquable pour dérouler */}
                      <tr
                        className="hover:bg-amber-50/60 transition-colors border-b border-gray-200 cursor-pointer"
                        onClick={() => togglePanneau(panneau.id)}
                      >
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-sm md:text-base font-black text-blue-700 border-r border-gray-200 sticky left-0 z-10 bg-white min-w-[70px] sm:min-w-[100px]">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <span className="truncate text-blue-700 text-[10px] sm:text-xs md:text-sm">{panneau.idPan || 'N/A'}</span>
                            <span className="text-[8px] sm:text-[10px] text-gray-400">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </div>
                          <div className="text-[9px] sm:text-xs md:text-sm font-medium text-gray-600 mt-1 break-words max-w-[120px] sm:max-w-[200px]">
                            {formatAddress(panneau.adresse, 20)}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-[10px] sm:text-xs md:text-sm font-semibold text-gray-700 border-r border-gray-200">
                          {panneau.type || 'N/A'}
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-[10px] sm:text-xs md:text-sm font-semibold text-gray-700 border-r border-gray-200">
                          {panneau.dimension || 'N/A'}
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs md:text-sm font-bold text-purple-600 border-r border-gray-200">
                          {dimensionResult.value > 0 ? `${dimensionResult.value} ${dimensionResult.unit}` : '-'}
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs md:text-sm font-black text-blue-600 border-r border-gray-200">
                          {faces.length}
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-center border-r border-gray-200">
                          <div className="flex items-center justify-center gap-0.5 sm:gap-1 flex-wrap">
                            {/* Bouton Détails */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (faces.length > 0) {
                                  openFaceDetails(panneau, faces[0]);
                                }
                              }}
                              className="px-1.5 sm:px-2 py-1 bg-blue-100 text-blue-700 rounded text-[8px] sm:text-[10px] md:text-xs font-bold hover:bg-blue-200 transition flex items-center gap-0.5"
                              title="Voir les détails du panneau"
                            >
                              <Eye size={10} className="sm:w-3 sm:h-3" />
                              <span className="hidden xs:inline">Détails</span>
                            </button>
                            {/* Bouton Carte */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                ouvrirLaCarte();
                              }}
                              className="px-1.5 sm:px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[8px] sm:text-[10px] md:text-xs font-bold hover:bg-emerald-200 transition flex items-center gap-0.5"
                              title="Voir sur la carte"
                            >
                              <MapPin size={10} className="sm:w-3 sm:h-3" />
                              <span className="hidden xs:inline">Carte</span>
                            </button>
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[9px] sm:text-[10px] text-gray-400 border-r border-gray-200" colSpan={6}>
                          <span className="text-[8px] sm:text-[10px] text-blue-400 font-medium">Cliquez pour voir les faces</span>
                        </td>
                      </tr>

                      {/* Lignes des faces - Affichées si le panneau est déroulé */}
                      {isExpanded && faces.map((face: Face, idx: number) => {
                        const activeReservation = getReservationActive(face);
                        const futureReservations = getReservationsFutures(face);
                        const status = getFaceStatus(face);
                        const faceId = face.id || `F${idx + 1}`;

                        // Calcul du nombre de mois
                        const nbMois = calculateMonths(
                          activeReservation?.dateDebut,
                          activeReservation?.dateFin
                        );

                        const getStatusColor = (statut: string): string => {
                          switch (statut) {
                            case 'Libre': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
                            case 'Occupé': return 'bg-blue-100 text-blue-700 border-blue-200';
                            case 'Réservé': return 'bg-amber-100 text-amber-700 border-amber-200';
                            default: return 'bg-gray-100 text-gray-700 border-gray-200';
                          }
                        };

                        const getStatusDot = (statut: string): string => {
                          switch (statut) {
                            case 'Libre': return 'bg-emerald-500';
                            case 'Occupé': return 'bg-blue-500';
                            case 'Réservé': return 'bg-amber-500';
                            default: return 'bg-gray-500';
                          }
                        };

                        return (
                          <tr
                            key={`${panneau.id}-face-${idx}`}
                            className="hover:bg-amber-50/40 transition-colors border-b border-gray-100 bg-blue-50/20"
                          >
                            {/* Colonne IdPan/Adresse - alignée avec la ligne parent */}
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[8px] sm:text-[10px] text-gray-400 border-r border-gray-200 sticky left-0 z-10 bg-blue-50/20 min-w-[70px] sm:min-w-[100px]">
                              <span className="ml-2 sm:ml-4 text-[8px] sm:text-[10px] text-blue-400">└── Face #{idx + 1}</span>
                            </td>

                            {/* Colonne Type - vide mais alignée */}
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 border-r border-gray-200"></td>

                            {/* Colonne Dimension - vide mais alignée */}
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 border-r border-gray-200"></td>

                            {/* Colonne Total Dim - vide mais alignée */}
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 border-r border-gray-200"></td>

                            {/* Colonne Nb Faces - vide mais alignée */}
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 border-r border-gray-200"></td>

                            {/* Colonne Actions - Boutons pour chaque face */}
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-center border-r border-gray-200">
                              <div className="flex items-center justify-center gap-0.5 sm:gap-1 flex-wrap">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openFaceDetails(panneau, face);
                                  }}
                                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-700 rounded text-[8px] sm:text-[10px] font-bold hover:bg-blue-200 transition flex items-center gap-0.5"
                                >
                                  <Eye size={9} className="sm:w-2.5 sm:h-2.5" />
                                  <span className="hidden xs:inline">Voir</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    openReservationModal(panneau, face);
                                  }}
                                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-amber-100 text-amber-700 rounded text-[8px] sm:text-[10px] font-bold hover:bg-amber-200 transition flex items-center gap-0.5"
                                  title="Réserver cette face"
                                >
                                  <Calendar size={9} className="sm:w-2.5 sm:h-2.5" />
                                  <span className="hidden xs:inline">Réserver</span>
                                </button>
                              </div>
                            </td>

                            {/* Colonne Face */}
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm font-bold text-indigo-600 border-r border-gray-200">
                              {faceId}
                            </td>

                            {/* Colonne Sens */}
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm font-semibold text-gray-700 border-r border-gray-200">
                              {face.sens || 'N/A'}
                            </td>

                            {/* Colonne Société Locatrice */}
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm font-semibold text-gray-700 border-r border-gray-200">
                              {activeReservation?.societeLocatrice || 'S/N'}
                            </td>

                            {/* Colonne Date début - fin */}
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm font-medium text-gray-600 border-r border-gray-200">
                              {activeReservation?.dateDebut && activeReservation?.dateFin ? (
                                <span className="text-gray-700 text-[9px] sm:text-[10px] md:text-xs">{activeReservation.dateDebut} – {activeReservation.dateFin}</span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>

                            {/* Colonne Nb Mois */}
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-center text-[10px] sm:text-xs md:text-sm font-bold text-purple-600 border-r border-gray-200">
                              {nbMois > 0 ? `${nbMois} mois` : '-'}
                            </td>

                            {/* Colonne Nb Rés. Fut. */}
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-center text-[10px] sm:text-xs md:text-sm font-bold text-amber-600 border-r border-gray-200">
                              {futureReservations.length || 0}
                            </td>

                            {/* Colonne Statut */}
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-center">
                              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] md:text-xs font-bold border ${getStatusColor(status)} flex items-center gap-1 justify-center whitespace-nowrap`}>
                                <span className={`w-1 h-1 rounded-full ${getStatusDot(status)}`} />
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pied de tableau */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-500">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="font-semibold text-gray-600">📊 {filteredPanneaux.length} panneau(x)</span>
            <span className="hidden xs:inline text-gray-300">•</span>
            <span className="font-semibold text-gray-600">🎯 {stats.totalFaces} face(s)</span>
            <span className="hidden xs:inline text-gray-300">•</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 font-medium text-gray-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {stats.totalLibres} libres
              </span>
              <span className="flex items-center gap-1 font-medium text-gray-600">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {stats.totalOccupes} occupées
              </span>
              <span className="flex items-center gap-1 font-medium text-gray-600">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {stats.totalReserves} réservées
              </span>
            </div>
          </div>
          <div className="text-[9px] text-gray-400 flex items-center gap-2">
            <RefreshCw
              className="w-3 h-3 cursor-pointer hover:text-blue-500 transition"
              onClick={loadData}
            />
            {lastUpdate && (
              <span className="hidden sm:inline font-medium text-gray-400">
                Mis à jour: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <span className="text-[7px] sm:hidden text-gray-400">
              ← Glissez →
            </span>
          </div>
        </div>

        <AnimatePresence>
          {isFaceModalOpen && selectedFace && selectedPanneau && (
            <FaceDetailModal
              isOpen={isFaceModalOpen}
              onClose={closeFaceModal}
              panneau={{
                ...selectedPanneau,
                onEdit: openEditPanneau
              }}
              face={selectedFace}
              onSelect={(selectionKey: string) => {
                console.log('Face sélectionnée:', selectionKey);
              }}
              isSelected={false}
              ouvrirLaCarte={ouvrirLaCarte}
              user={user}
            />
          )}
        </AnimatePresence>

        {/* ✅ RENDU DE EDITPANNEAUMODAL */}
        {panneauToEdit && (
          <EditPanneauModal
            isOpen={true}
            onClose={closeEditPanneau}
            panneau={openReservationModal}
            user={user}
          />
        )}
      </div>
    );
  };

















  // ============================================
  // COMPOSANT ADMIN AGENTS TAB - CORRIGÉ
  // ============================================
  const AdminAgentsTab = ({ agents, panneaux, factures, onAgentAction, onExport }: {
    agents: Agent[];
    panneaux: Panneau[];
    factures: any[];
    onAgentAction: (action: string, agent: any) => void;
    onExport: () => void;
  }) => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [periodeFilter, setPeriodeFilter] = useState<PeriodeFiltre>('mois');
    const [dateRange, setDateRange] = useState<{ debut: string; fin: string }>({ debut: '', fin: '' });
    const [sortBy, setSortBy] = useState<'reservations' | 'revenue' | 'nom'>('reservations');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Fonction pour filtrer par période
    const filterByPeriode = useCallback((items: any[], dateField: string) => {
      const now = new Date();
      let filtered = items;

      if (periodeFilter === 'mois') {
        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = items.filter((item: any) => {
          const date = new Date(item[dateField]);
          return date >= debutMois && date <= now;
        });
      } else if (periodeFilter === 'trimestre') {
        const trimestre = Math.floor(now.getMonth() / 3);
        const debutTrimestre = new Date(now.getFullYear(), trimestre * 3, 1);
        filtered = items.filter((item: any) => {
          const date = new Date(item[dateField]);
          return date >= debutTrimestre && date <= now;
        });
      } else if (periodeFilter === 'semestre') {
        const semestre = Math.floor(now.getMonth() / 6);
        const debutSemestre = new Date(now.getFullYear(), semestre * 6, 1);
        filtered = items.filter((item: any) => {
          const date = new Date(item[dateField]);
          return date >= debutSemestre && date <= now;
        });
      } else if (periodeFilter === 'annee') {
        const debutAnnee = new Date(now.getFullYear(), 0, 1);
        filtered = items.filter((item: any) => {
          const date = new Date(item[dateField]);
          return date >= debutAnnee && date <= now;
        });
      } else if (periodeFilter === 'deuxAns') {
        const debutDeuxAns = new Date(now.getFullYear() - 2, 0, 1);
        filtered = items.filter((item: any) => {
          const date = new Date(item[dateField]);
          return date >= debutDeuxAns && date <= now;
        });
      } else if (periodeFilter === 'personnalise' && dateRange.debut && dateRange.fin) {
        const debut = new Date(dateRange.debut);
        const fin = new Date(dateRange.fin);
        filtered = items.filter((item: any) => {
          const date = new Date(item[dateField]);
          return date >= debut && date <= fin;
        });
      }

      return filtered;
    }, [periodeFilter, dateRange]);

    // Calcul des statistiques par agent - CORRIGÉ
    // Calcul des statistiques par agent - CORRIGÉ
    const getAgentStats = useCallback((agent: Agent) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // 1. RÉCUPÉRER TOUTES LES RÉSERVATIONS DE L'AGENT DEPUIS LES PANNEAUX
      const allReservations = panneaux.flatMap((p: Panneau) =>
        p.faces.flatMap((f: Face) =>
          (f.reservations || []).filter((r: Reservation) => r.agentEmail === agent.email)
        )
      );

      // 2. RÉCUPÉRER LES FACTURES DE L'AGENT
      const agentFactures = factures.filter((f: any) => f.agentEmail === agent.email);

      // 3. FILTRER LES RÉSERVATIONS PAR PÉRIODE
      const filteredReservations = filterByPeriode(allReservations, 'createdAt');

      // 4. FILTRER LES FACTURES PAR PÉRIODE (dateCreation)
      const filteredFactures = filterByPeriode(agentFactures, 'dateCreation');

      // 5. CALCUL DES STATISTIQUES

      // 📊 TOTAL = Nombre total de réservations
      const total = filteredReservations.length;

      // ✅ ACTIVES = dateDebut <= aujourd'hui <= dateFin
      const actives = filteredReservations.filter((r: Reservation) => {
        if (!r.dateDebut || !r.dateFin) return false;
        const dateDebut = new Date(r.dateDebut);
        dateDebut.setHours(0, 0, 0, 0);
        const dateFin = new Date(r.dateFin);
        dateFin.setHours(0, 0, 0, 0);
        return dateDebut <= now && dateFin >= now;
      }).length;

      // ✔️ VALIDÉES = dateFin < aujourd'hui ET validationComptable === true
      const validees = filteredReservations.filter((r: Reservation) => {
        if (!r.dateFin) return false;
        const dateFin = new Date(r.dateFin);
        dateFin.setHours(0, 0, 0, 0);
        return dateFin < now && r.validationComptable === true;
      }).length;

      // 📄 FACTURES = Nombre de factures validées par la comptabilité (payées)
      // ✅ FILTRER UNIQUEMENT LES FACTURES VALIDÉES
      const facturesValidees = filteredFactures.filter((f: any) =>
        f.validationComptable === true ||
        f.statut === 'Validée' ||
        f.statutPaiement === 'Payé'
      ).length;

      // 💰 CA = Somme totale de l'argent encaissé par l'agent
      // ✅ SOMME UNIQUEMENT DES FACTURES VALIDÉES
      const revenue = filteredFactures
        .filter((f: any) =>
          f.validationComptable === true ||
          f.statut === 'Validée' ||
          f.statutPaiement === 'Payé'
        )
        .reduce((sum: number, f: any) => {
          // Utiliser totalHT ou total ou montant selon la structure
          const montant = f.totalHT || f.total || f.montant || 0;
          return sum + montant;
        }, 0);

      // Réservations expirées (pour information)
      const expirees = filteredReservations.filter((r: Reservation) => {
        if (!r.dateFin) return false;
        const dateFin = new Date(r.dateFin);
        dateFin.setHours(0, 0, 0, 0);
        return dateFin < now && r.validationComptable === false;
      }).length;

      // 🔍 DÉBOGAGE - Afficher les factures trouvées
      console.log(`📊 Statistiques pour ${agent.email}:`);
      console.log(`  📄 Factures totales: ${agentFactures.length}`);
      console.log(`  📄 Factures filtrées: ${filteredFactures.length}`);
      console.log(`  ✅ Factures validées: ${facturesValidees}`);
      console.log(`  💰 CA total: ${revenue} $`);
      console.log(`  📋 Réservations: ${total}`);

      return {
        total,           // 📊 Total des réservations
        actives,         // ✅ Réservations actives (en cours)
        validees,        // ✔️ Réservations terminées et validées
        revenue,         // 💰 CA total encaissé
        facturesValidees,// 📄 Nombre de factures payées
        expirees,        // Réservations expirées (info supplémentaire)
        reservations: filteredReservations,
        factures: filteredFactures
      };
    }, [panneaux, factures, filterByPeriode]);

    // Agents avec stats
    const agentsWithStats = useMemo(() => {
      return agents.map((agent: Agent) => ({
        ...agent,
        stats: getAgentStats(agent)
      }));
    }, [agents, getAgentStats]);

    // Filtrage et tri
    const filteredAgents = useMemo(() => {
      let result = agentsWithStats;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter((a: any) =>
          a.nom.toLowerCase().includes(term) ||
          a.email.toLowerCase().includes(term) ||
          (a.nomComplet && a.nomComplet.toLowerCase().includes(term))
        );
      }

      result = [...result].sort((a: any, b: any) => {
        let compare = 0;
        if (sortBy === 'nom') {
          compare = (a.nom || '').localeCompare(b.nom || '');
        } else if (sortBy === 'reservations') {
          compare = a.stats.total - b.stats.total;
        } else if (sortBy === 'revenue') {
          compare = a.stats.revenue - b.stats.revenue;
        }
        return sortOrder === 'desc' ? -compare : compare;
      });

      return result;
    }, [agentsWithStats, searchTerm, sortBy, sortOrder]);

    // Meilleur agent (proclamation)
    const topAgent = useMemo(() => {
      if (filteredAgents.length === 0) return null;
      return filteredAgents.reduce((a: any, b: any) =>
        a.stats.revenue > b.stats.revenue ? a : b
      );
    }, [filteredAgents]);

    // Totaux
    const totals = useMemo(() => {
      return filteredAgents.reduce((acc: any, a: any) => ({
        reservations: acc.reservations + a.stats.total,
        actives: acc.actives + a.stats.actives,
        validees: acc.validees + a.stats.validees,
        revenue: acc.revenue + a.stats.revenue,
        factures: acc.factures + a.stats.facturesValidees
      }), { reservations: 0, actives: 0, validees: 0, revenue: 0, factures: 0 });
    }, [filteredAgents]);

    return (
      <div className="space-y-3 sm:space-y-4">
        {/* En-tête avec filtres */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <h3 className="text-base sm:text-lg font-black text-gray-800">Agents Commerciaux</h3>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
              {filteredAgents.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 sm:flex-none px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button
              onClick={onExport}
              className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200 transition"
            >
              📄 Exporter
            </button>
          </div>
        </div>

        {/* Filtres de période */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 bg-white p-2 sm:p-3 rounded-xl border border-gray-200">
          <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase mr-1">Période:</span>
          {['mois', 'trimestre', 'semestre', 'annee', 'deuxAns'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodeFilter(p as PeriodeFiltre)}
              className={`px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[8px] sm:text-[10px] font-bold uppercase transition ${periodeFilter === p
                ? 'bg-[#00539B] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {p === 'mois' ? 'Mois' : p === 'trimestre' ? 'Trim.' : p === 'semestre' ? 'Sem.' : p === 'annee' ? 'Année' : '2 Ans'}
            </button>
          ))}
          <button
            onClick={() => setPeriodeFilter('personnalise')}
            className={`px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[8px] sm:text-[10px] font-bold uppercase transition ${periodeFilter === 'personnalise'
              ? 'bg-[#00539B] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            📅 Perso
          </button>
          {periodeFilter === 'personnalise' && (
            <div className="flex items-center gap-1 sm:gap-2">
              <input
                type="date"
                value={dateRange.debut}
                onChange={(e) => setDateRange({ ...dateRange, debut: e.target.value })}
                className="px-1 sm:px-2 py-0.5 sm:py-1 bg-white border border-gray-200 rounded text-[8px] sm:text-xs"
              />
              <span className="text-[8px] sm:text-xs text-gray-400">→</span>
              <input
                type="date"
                value={dateRange.fin}
                onChange={(e) => setDateRange({ ...dateRange, fin: e.target.value })}
                className="px-1 sm:px-2 py-0.5 sm:py-1 bg-white border border-gray-200 rounded text-[8px] sm:text-xs"
              />
            </div>
          )}
        </div>

        {/* Proclamation - Meilleur agent */}
        {/* Proclamation - Meilleur agent */}
        {topAgent && topAgent.stats && topAgent.stats.revenue > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200/50 rounded-xl p-2 sm:p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-black text-sm sm:text-lg shadow-lg">
                👑
              </div>
              <div>
                <p className="text-[10px] sm:text-sm font-black text-gray-800">
                  {topAgent.nomComplet || topAgent.nom || 'Agent'}
                </p>
                <p className="text-[8px] sm:text-[10px] text-amber-600 font-bold">
                  🏆 Meilleur agent - {topAgent.stats.revenue.toLocaleString()} $ de CA
                </p>
              </div>
            </div>
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-amber-200/50 text-amber-800 rounded-full text-[8px] sm:text-[10px] font-bold">
              #{filteredAgents.indexOf(topAgent) + 1}
            </span>
          </div>
        )}
        {/* Tableau des agents */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider">Agent</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider">Téléphone</th>
                  <th
                    className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider cursor-pointer hover:text-[#00539B]"
                    onClick={() => {
                      if (sortBy === 'reservations') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('reservations');
                        setSortOrder('desc');
                      }
                    }}
                  >
                    📊 Réserv.
                    {sortBy === 'reservations' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider">✅ Actives</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider">✔️ Validées</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider">📄 Factures</th>
                  <th
                    className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider cursor-pointer hover:text-[#00539B]"
                    onClick={() => {
                      if (sortBy === 'revenue') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('revenue');
                        setSortOrder('desc');
                      }
                    }}
                  >
                    💰 CA
                    {sortBy === 'revenue' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAgents.length > 0 ? (
                  filteredAgents.map((agent: any, idx: number) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition">
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-[10px] sm:text-xs flex-shrink-0">
                            {(agent.nomComplet || agent.nom || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs sm:text-sm font-bold text-gray-800 truncate max-w-[80px] sm:max-w-none">
                              {agent.nomComplet || agent.nom}
                            </span>
                            <span className="text-[8px] sm:text-[10px] text-gray-400">
                              {agent.fonction || 'Commercial'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-gray-600 truncate max-w-[100px] sm:max-w-none">
                        {agent.email}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-gray-600">
                        {agent.telephone || '-'}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-bold text-blue-600">
                        {agent.stats.total}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-bold text-emerald-600">
                        {agent.stats.actives}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-bold text-purple-600">
                        {agent.stats.validees}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-bold text-indigo-600">
                        {agent.stats.facturesValidees || 0}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-bold text-[#00539B]">
                        {agent.stats.revenue.toLocaleString()} $
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                          <button
                            onClick={() => onAgentAction('view', agent)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                            title="Voir détails"
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => onAgentAction('edit', agent)}
                            className="p-1 text-amber-600 hover:bg-amber-100 rounded transition"
                            title="Modifier"
                          >
                            <UserCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => onAgentAction('history', agent)}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded transition"
                            title="Historique"
                          >
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                      <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-2" />
                      <p className="font-bold text-sm">Aucun agent trouvé</p>
                      <p className="text-xs">Ajustez vos filtres ou vérifiez la base de données</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totaux */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-2 sm:p-3 text-center border border-blue-200/50">
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase">Total Réserv.</p>
            <p className="text-lg sm:text-2xl font-black text-blue-700">{totals.reservations}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-2 sm:p-3 text-center border border-emerald-200/50">
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase">Actives</p>
            <p className="text-lg sm:text-2xl font-black text-emerald-700">{totals.actives}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-2 sm:p-3 text-center border border-purple-200/50">
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase">Validées</p>
            <p className="text-lg sm:text-2xl font-black text-purple-700">{totals.validees}</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-2 sm:p-3 text-center border border-indigo-200/50">
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase">Factures</p>
            <p className="text-lg sm:text-2xl font-black text-indigo-700">{totals.factures}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-2 sm:p-3 text-center border border-amber-200/50">
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase">CA Total</p>
            <p className="text-lg sm:text-2xl font-black text-amber-700">{totals.revenue.toLocaleString()} $</p>
          </div>
        </div>
      </div>
    );
  };



  // ============================================
  // COMPOSANT ADMIN RESERVATIONS TAB
  // ============================================
  const AdminReservationsTab = ({ panneaux, agents, onReservationAction, onExport }: {
    panneaux: Panneau[];
    agents: Agent[];
    onReservationAction: (action: string, reservation: any) => void;
    onExport: () => void;
  }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statutFilter, setStatutFilter] = useState<StatutReservation>('tous');
    const [periodeFilter, setPeriodeFilter] = useState<PeriodeFiltre>('mois');
    const [dateRange, setDateRange] = useState({ debut: '', fin: '' });
    const [selectedAgent, setSelectedAgent] = useState<string>('tous');
    const [selectedReservation, setSelectedReservation] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Récupérer toutes les réservations
    const getAllReservations = useCallback(() => {
      const allRes: AdminReservation[] = [];

      panneaux.forEach((panneau: any) => {
        (panneau.faces || []).forEach((face: any) => {
          (face.reservations || []).forEach((res: any) => {
            allRes.push({
              id: res.id || `${panneau.id}-${face.id}-${Date.now()}`,
              agentNom: res.agentNom || 'N/A',
              agentEmail: res.agentEmail || 'N/A',
              societeLocatrice: res.societeLocatrice || 'N/A',
              faceId: face.id || 'N/A',
              panneauId: panneau.id,
              panneauIdPan: panneau.idPan || 'N/A',
              adresse: panneau.adresse || 'N/A',
              dateDebut: res.dateDebut || '',
              dateFin: res.dateFin || '',
              montant: res.montant || 0,
              statut: res.statut || 'Réservé',
              statutPaiement: res.statutPaiement || 'en attente',
              validationComptable: res.validationComptable || false,
              createdAt: res.createdAt || new Date().toISOString(),
              dateModification: res.dateModification || ''
            });
          });
        });
      });

      return allRes;
    }, [panneaux]);

    // Filtrer les réservations
    const filteredReservations = useMemo(() => {
      let result = getAllReservations();
      const now = new Date();

      // Filtre par statut
      if (statutFilter === 'actif') {
        result = result.filter(r => new Date(r.dateFin) >= now);
      } else if (statutFilter === 'expire') {
        result = result.filter(r => new Date(r.dateFin) < now);
      } else if (statutFilter === 'futur') {
        result = result.filter(r => new Date(r.dateDebut) > now);
      } else if (statutFilter === 'valide') {
        result = result.filter(r => r.validationComptable === true);
      } else if (statutFilter === 'en_attente') {
        result = result.filter(r => r.validationComptable === false);
      }

      // Filtre par agent
      if (selectedAgent !== 'tous') {
        result = result.filter(r => r.agentEmail === selectedAgent);
      }

      // Filtre par période
      if (periodeFilter === 'mois') {
        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
        result = result.filter(r => {
          const date = new Date(r.createdAt);
          return date >= debutMois && date <= now;
        });
      } else if (periodeFilter === 'trimestre') {
        const trimestre = Math.floor(now.getMonth() / 3);
        const debutTrimestre = new Date(now.getFullYear(), trimestre * 3, 1);
        result = result.filter(r => {
          const date = new Date(r.createdAt);
          return date >= debutTrimestre && date <= now;
        });
      } else if (periodeFilter === 'semestre') {
        const semestre = Math.floor(now.getMonth() / 6);
        const debutSemestre = new Date(now.getFullYear(), semestre * 6, 1);
        result = result.filter(r => {
          const date = new Date(r.createdAt);
          return date >= debutSemestre && date <= now;
        });
      } else if (periodeFilter === 'annee') {
        const debutAnnee = new Date(now.getFullYear(), 0, 1);
        result = result.filter(r => {
          const date = new Date(r.createdAt);
          return date >= debutAnnee && date <= now;
        });
      } else if (periodeFilter === 'deuxAns') {
        const debutDeuxAns = new Date(now.getFullYear() - 2, 0, 1);
        result = result.filter(r => {
          const date = new Date(r.createdAt);
          return date >= debutDeuxAns && date <= now;
        });
      } else if (periodeFilter === 'personnalise' && dateRange.debut && dateRange.fin) {
        const debut = new Date(dateRange.debut);
        const fin = new Date(dateRange.fin);
        result = result.filter(r => {
          const date = new Date(r.createdAt);
          return date >= debut && date <= fin;
        });
      }

      // Recherche textuelle
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(r =>
          r.societeLocatrice.toLowerCase().includes(term) ||
          r.agentNom.toLowerCase().includes(term) ||
          r.panneauIdPan.toLowerCase().includes(term)
        );
      }

      return result.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }, [getAllReservations, statutFilter, periodeFilter, dateRange, searchTerm, selectedAgent]);

    // Statistiques
    const stats = useMemo(() => {
      const total = filteredReservations.length;
      const validees = filteredReservations.filter(r => r.validationComptable).length;
      const enAttente = total - validees;
      const revenue = filteredReservations
        .filter(r => r.validationComptable)
        .reduce((sum, r) => sum + r.montant, 0);
      return { total, validees, enAttente, revenue };
    }, [filteredReservations]);

    // Ouvrir l'édition
    const openEditReservation = (reservation: any) => {
      if (!reservation.validationComptable) {
        setSelectedReservation(reservation);
        setIsEditing(true);
      } else {
        alert('⚠️ Cette réservation est déjà validée par la comptabilité, modification impossible.');
      }
    };

    return (
      <div className="space-y-3 sm:space-y-4">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <h3 className="text-base sm:text-lg font-black text-gray-800">Réservations</h3>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
              {filteredReservations.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 sm:flex-none px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="tous">👥 Tous les agents</option>
              {agents.map((agent: any) => (
                <option key={agent.email} value={agent.email}>{agent.nom}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 bg-white p-2 sm:p-3 rounded-xl border border-gray-200">
          <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase mr-1">Statut:</span>
          {[
            { id: 'tous', label: 'Tous' },
            { id: 'actif', label: 'Actifs' },
            { id: 'expire', label: 'Expirés' },
            { id: 'futur', label: 'Futurs' },
            { id: 'valide', label: '✅ Validés' },
            { id: 'en_attente', label: '⏳ En attente' }
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatutFilter(s.id as StatutReservation)}
              className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[7px] sm:text-[9px] font-bold uppercase transition ${statutFilter === s.id
                ? 'bg-[#00539B] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Filtres de période */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 bg-white p-2 sm:p-3 rounded-xl border border-gray-200">
          <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase mr-1">Période:</span>
          {['mois', 'trimestre', 'semestre', 'annee', 'deuxAns'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodeFilter(p as PeriodeFiltre)}
              className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[7px] sm:text-[9px] font-bold uppercase transition ${periodeFilter === p
                ? 'bg-[#00539B] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {p === 'mois' ? 'Mois' : p === 'trimestre' ? 'Trim.' : p === 'semestre' ? 'Sem.' : p === 'annee' ? 'Année' : '2 Ans'}
            </button>
          ))}
          <button
            onClick={() => setPeriodeFilter('personnalise')}
            className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[7px] sm:text-[9px] font-bold uppercase transition ${periodeFilter === 'personnalise'
              ? 'bg-[#00539B] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            📅 Perso
          </button>
          {periodeFilter === 'personnalise' && (
            <div className="flex items-center gap-1 sm:gap-2">
              <input
                type="date"
                value={dateRange.debut}
                onChange={(e) => setDateRange({ ...dateRange, debut: e.target.value })}
                className="px-1 sm:px-2 py-0.5 sm:py-1 bg-white border border-gray-200 rounded text-[8px] sm:text-xs"
              />
              <span className="text-[8px] sm:text-xs text-gray-400">→</span>
              <input
                type="date"
                value={dateRange.fin}
                onChange={(e) => setDateRange({ ...dateRange, fin: e.target.value })}
                className="px-1 sm:px-2 py-0.5 sm:py-1 bg-white border border-gray-200 rounded text-[8px] sm:text-xs"
              />
            </div>
          )}
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-white rounded-xl p-2 sm:p-3 text-center border border-gray-200">
            <p className="text-[8px] sm:text-xs text-gray-500 font-bold uppercase">Total</p>
            <p className="text-lg sm:text-2xl font-black text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-2 sm:p-3 text-center border border-emerald-200">
            <p className="text-[8px] sm:text-xs text-gray-500 font-bold uppercase">✅ Validées</p>
            <p className="text-lg sm:text-2xl font-black text-emerald-700">{stats.validees}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-2 sm:p-3 text-center border border-amber-200">
            <p className="text-[8px] sm:text-xs text-gray-500 font-bold uppercase">⏳ En attente</p>
            <p className="text-lg sm:text-2xl font-black text-amber-700">{stats.enAttente}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-2 sm:p-3 text-center border border-blue-200">
            <p className="text-[8px] sm:text-xs text-gray-500 font-bold uppercase">💰 CA Validé</p>
            <p className="text-lg sm:text-2xl font-black text-blue-700">{stats.revenue.toLocaleString()} $</p>
          </div>
        </div>

        {/* Liste des réservations */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider">Société</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider">Agent</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider">Panneau</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider">Période</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider">Montant</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider">Statut</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[8px] sm:text-xs font-black text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReservations.length > 0 ? (
                  filteredReservations.map((res, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition">
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-gray-800 truncate max-w-[100px] sm:max-w-none">
                        {res.societeLocatrice}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-gray-600">{res.agentNom}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-gray-600">
                        <span className="font-bold text-[#00539B]">{res.panneauIdPan}</span>
                        <span className="text-gray-400 text-[8px] sm:text-[10px]"> | {res.faceId}</span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[8px] sm:text-[10px] text-gray-500">
                        {res.dateDebut} → {res.dateFin}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-bold text-[#00539B]">
                        {res.montant.toLocaleString()} $
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[10px] font-bold ${res.validationComptable
                          ? 'bg-emerald-100 text-emerald-700'
                          : new Date(res.dateFin) < new Date()
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                          }`}>
                          {res.validationComptable ? '✅ Validée' :
                            new Date(res.dateFin) < new Date() ? '❌ Expirée' : '⏳ En attente'}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                          <button
                            onClick={() => onReservationAction('view', res)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                            title="Voir détails"
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => openEditReservation(res)}
                            className={`p-1 rounded transition ${res.validationComptable
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-amber-600 hover:bg-amber-100'
                              }`}
                            title={res.validationComptable ? 'Modification impossible' : 'Modifier'}
                            disabled={res.validationComptable}
                          >
                            <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => onReservationAction('print', res)}
                            className="p-1 text-purple-600 hover:bg-purple-100 rounded transition"
                            title="Imprimer la facture"
                          >
                            <Printer className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-2" />
                      <p className="font-bold text-sm">Aucune réservation trouvée</p>
                      <p className="text-xs">Ajustez vos filtres pour voir plus de résultats</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal d'édition */}
        <AnimatePresence>
          {isEditing && selectedReservation && (
            <EditReservationModal
              isOpen={isEditing}
              onClose={() => {
                setIsEditing(false);
                setSelectedReservation(null);
              }}
              reservation={selectedReservation}
              agents={agents}
              onSave={(updatedRes) => {
                // Mettre à jour la réservation
                onReservationAction('update', updatedRes);
                setIsEditing(false);
                setSelectedReservation(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  };


  // ============================================
  // MODAL D'ÉDITION DE RÉSERVATION
  // ============================================
  const EditReservationModal = ({ isOpen, onClose, reservation, agents, onSave }: {
    isOpen: boolean;
    onClose: () => void;
    reservation: any;
    agents: Agent[];
    onSave: (reservation: any) => void;
  }) => {
    const [formData, setFormData] = useState({
      agentEmail: reservation?.agentEmail || '',
      societeLocatrice: reservation?.societeLocatrice || '',
      dateDebut: reservation?.dateDebut || '',
      dateFin: reservation?.dateFin || '',
      montant: reservation?.montant || 0
    });

    useEffect(() => {
      if (reservation) {
        setFormData({
          agentEmail: reservation.agentEmail || '',
          societeLocatrice: reservation.societeLocatrice || '',
          dateDebut: reservation.dateDebut || '',
          dateFin: reservation.dateFin || '',
          montant: reservation.montant || 0
        });
      }
    }, [reservation]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const agent = agents.find((a: any) => a.email === formData.agentEmail);
      onSave({
        ...reservation,
        ...formData,
        agentNom: agent?.nom || 'N/A',
        dateModification: new Date().toISOString()
      });
    };

    if (!isOpen) return null;

    return (
      <>
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[300]"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        </motion.div>

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-4 sm:inset-8 md:inset-12 lg:inset-20 z-[301] bg-white rounded-2xl shadow-2xl flex flex-col max-w-2xl mx-auto border border-gray-200"
        >
          <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-[#00539B] to-[#003A6B] rounded-t-2xl flex-shrink-0">
            <div className="flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-black text-white">Modifier la réservation</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-blue-200 font-medium mt-1">Modifiez les informations de la réservation</p>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-gray-600 uppercase tracking-wider">Agent Commercial</label>
                <select
                  value={formData.agentEmail}
                  onChange={(e) => setFormData({ ...formData, agentEmail: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                >
                  {agents.map((agent: any) => (
                    <option key={agent.email} value={agent.email}>{agent.nom} ({agent.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 uppercase tracking-wider">Société Locatrice</label>
                <input
                  type="text"
                  value={formData.societeLocatrice}
                  onChange={(e) => setFormData({ ...formData, societeLocatrice: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-gray-600 uppercase tracking-wider">Date Début</label>
                <input
                  type="date"
                  value={formData.dateDebut}
                  onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 uppercase tracking-wider">Date Fin</label>
                <input
                  type="date"
                  value={formData.dateFin}
                  onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-gray-600 uppercase tracking-wider">Montant ($)</label>
              <input
                type="number"
                value={formData.montant}
                onChange={(e) => setFormData({ ...formData, montant: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              ⚠️ La validation comptable est <strong>désactivée</strong> pour cette réservation. Vous pouvez la modifier.
            </div>
          </form>

          <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex flex-col sm:flex-row justify-between items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300 transition"
            >
              Annuler
            </button>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto px-6 py-2 bg-purple-100 text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-200 transition flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="w-full sm:w-auto px-6 py-2 bg-[#00539B] text-white rounded-xl font-bold text-sm hover:bg-[#003A6B] transition"
              >
                💾 Enregistrer
              </button>
            </div>
          </div>
        </motion.div>
      </>
    );
  };

  // ============================================
  // COMPOSANT ADMIN RDV TAB (CORRIGÉ)
  // ============================================
  const AdminRdvTab = ({ rdvList, onRdvAction, onExport }: {
    rdvList: AdminRendezVous[];
    onRdvAction: (action: string, rdv: any) => void;
    onExport: () => void;
  }) => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statutFilter, setStatutFilter] = useState<'tous' | 'planifié' | 'confirmé' | 'annulé' | 'terminé'>('tous');
    const [dateFilter, setDateFilter] = useState<string>('');

    // RDV filtrés - Correction du type des données par défaut
    const filteredRdv = useMemo(() => {
      // Données par défaut avec le bon type
      const defaultRdv: AdminRendezVous[] = [
        {
          id: '1',
          agentNom: 'Jean Dupont',
          agentEmail: 'jean.dupont@dispromalt.cd',
          clientNom: 'Société ABC',
          clientEmail: 'contact@abc.com',
          clientTelephone: '+243 812 345 678',
          date: '2026-01-15',
          heure: '14:30',
          objet: 'Présentation offre publicitaire',
          statut: 'confirmé',
          notes: 'Client intéressé par les panneaux de la route de Matadi',
          createdAt: '2026-01-10T10:00:00Z'
        },
        {
          id: '2',
          agentNom: 'Marie Kabuya',
          agentEmail: 'marie.kabuya@dispromalt.cd',
          clientNom: 'Entreprise XYZ',
          clientEmail: 'contact@xyz.com',
          clientTelephone: '+243 998 765 432',
          date: '2026-01-16',
          heure: '10:00',
          objet: 'Signature contrat',
          statut: 'planifié',
          notes: 'Préparer les documents contractuels',
          createdAt: '2026-01-12T09:00:00Z'
        },
        {
          id: '3',
          agentNom: 'Jean Dupont',
          agentEmail: 'jean.dupont@dispromalt.cd',
          clientNom: 'Super Marché',
          clientEmail: 'info@supermarche.com',
          clientTelephone: '+243 815 123 456',
          date: '2026-01-14',
          heure: '11:00',
          objet: 'Renouvellement contrat',
          statut: 'terminé',
          notes: 'Contrat renouvelé pour 2 ans',
          createdAt: '2026-01-05T14:00:00Z'
        }
      ];

      let result: AdminRendezVous[] = rdvList.length > 0 ? rdvList : defaultRdv;

      // Filtre par statut
      if (statutFilter !== 'tous') {
        result = result.filter((r: AdminRendezVous) => r.statut === statutFilter);
      }

      // Filtre par date
      if (dateFilter) {
        result = result.filter((r: AdminRendezVous) => r.date === dateFilter);
      }

      // Recherche
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter((r: AdminRendezVous) =>
          r.clientNom.toLowerCase().includes(term) ||
          r.agentNom.toLowerCase().includes(term) ||
          r.objet.toLowerCase().includes(term)
        );
      }

      // Tri par date
      return result.sort((a: AdminRendezVous, b: AdminRendezVous) =>
        a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure)
      );
    }, [rdvList, statutFilter, dateFilter, searchTerm]);

    const getStatutColor = (statut: string): string => {
      switch (statut) {
        case 'planifié': return 'bg-blue-100 text-blue-700';
        case 'confirmé': return 'bg-emerald-100 text-emerald-700';
        case 'annulé': return 'bg-red-100 text-red-700';
        case 'terminé': return 'bg-gray-100 text-gray-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    };

    const getStatutIcon = (statut: string): string => {
      switch (statut) {
        case 'planifié': return '📅';
        case 'confirmé': return '✅';
        case 'annulé': return '❌';
        case 'terminé': return '✔️';
        default: return '📌';
      }
    };

    return (
      <div className="space-y-3 sm:space-y-4">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <h3 className="text-base sm:text-lg font-black text-gray-800">Rendez-vous</h3>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
              {filteredRdv.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="flex-1 sm:flex-none px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <input
              type="date"
              value={dateFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(e.target.value)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={() => onRdvAction('add', null)}
              className="px-2 sm:px-4 py-1 sm:py-1.5 bg-[#00539B] text-white rounded-lg font-bold text-[10px] sm:text-xs hover:bg-[#003A6B] transition flex items-center gap-1"
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Nouveau RDV</span>
            </button>
          </div>
        </div>

        {/* Filtres statut */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 bg-white p-2 sm:p-3 rounded-xl border border-gray-200">
          <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase mr-1">Statut:</span>
          {[
            { id: 'tous', label: 'Tous' },
            { id: 'planifié', label: '📅 Planifié' },
            { id: 'confirmé', label: '✅ Confirmé' },
            { id: 'annulé', label: '❌ Annulé' },
            { id: 'terminé', label: '✔️ Terminé' }
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatutFilter(s.id as any)}
              className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[7px] sm:text-[9px] font-bold uppercase transition ${statutFilter === s.id
                ? 'bg-[#00539B] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Liste des RDV */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredRdv.length > 0 ? (
            filteredRdv.map((rdv: AdminRendezVous, idx: number) => (
              <motion.div
                key={rdv.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 hover:shadow-lg hover:border-blue-300 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                      {rdv.clientNom.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-black text-gray-800">{rdv.clientNom}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">{rdv.clientEmail}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold ${getStatutColor(rdv.statut)}`}>
                    {getStatutIcon(rdv.statut)} {rdv.statut}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-600 mt-1">
                  <span className="font-medium">👤 {rdv.agentNom}</span>
                  <span className="text-gray-300">•</span>
                  <span>📅 {rdv.date}</span>
                  <span>🕐 {rdv.heure}</span>
                </div>

                <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-[10px] sm:text-xs font-bold text-gray-700">📋 {rdv.objet}</p>
                  {rdv.notes && (
                    <p className="text-[8px] sm:text-[10px] text-gray-500 mt-1 italic">{rdv.notes}</p>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end gap-1 sm:gap-2">
                  <button
                    onClick={() => onRdvAction('view', rdv)}
                    className="px-2 sm:px-3 py-1 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] sm:text-xs font-bold transition"
                  >
                    Détails
                  </button>
                  <button
                    onClick={() => onRdvAction('edit', rdv)}
                    className="px-2 sm:px-3 py-1 text-amber-600 hover:bg-amber-100 rounded-lg text-[10px] sm:text-xs font-bold transition"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => onRdvAction('delete', rdv)}
                    className="px-2 sm:px-3 py-1 text-red-600 hover:bg-red-100 rounded-lg text-[10px] sm:text-xs font-bold transition"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-2 text-center py-8 text-gray-400 bg-white rounded-xl border border-gray-200">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-2" />
              <p className="font-bold text-sm">Aucun rendez-vous</p>
              <p className="text-xs">Aucun rendez-vous trouvé pour cette période</p>
            </div>
          )}
        </div>
      </div>
    );
  };








































































  // ============================================
  // RENDU PRINCIPAL
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER - VERSION ULTRA RESPONSIVE AVEC LOGO */}
      <header className="bg-[#00539B] shadow-2xl sticky top-0 z-50 border-b border-white/10">
        <div className="w-full px-1 xs:px-1.5 sm:px-2 md:px-3 py-0.5 xs:py-1 sm:py-1 md:py-1.5">
          <div className="flex items-center justify-between gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2">

            {/* ==================== PARTIE GAUCHE ==================== */}
            <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2 min-w-0 flex-1">

              {/* Bouton Retour - Masqué sur très petit écran */}
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="hidden xs:flex p-1 xs:p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white flex-shrink-0 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 group"
                aria-label="Retour au tableau de bord"
              >
                <Home className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 group-hover:rotate-[-10deg] transition-transform" />
              </button>

              {/* ============================================================ */}
              {/* ✅ LOGO AVEC TITRE - Cliquable pour refresh */}
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

            </div>

            {/* ==================== PARTIE DROITE ==================== */}
            <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1 md:gap-1.5 flex-shrink-0">

              {/* --- SÉPARATEUR --- */}
              <div className="w-px h-4 xs:h-5 sm:h-6 bg-white/20 hidden xs:block" />

              {/* ============================================================ */}
              {/* ✅ BOUTON CATALOGUE - Bleu */}
              {/* ============================================================ */}
              <button
                onClick={() => window.location.href = '/dashboard/superviseurs'}
                className="p-1 xs:p-1.5 sm:px-2 sm:py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-white text-[7px] xs:text-[8px] sm:text-[10px] md:text-xs font-medium transition-all duration-300 flex items-center justify-center border border-blue-500/30 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-105 min-w-[24px] xs:min-w-[28px] sm:min-w-[32px] group"
                aria-label="Catalogue"
              >
                <BookOpen className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-blue-400 group-hover:rotate-[-10deg] transition-transform" />
                <span className="hidden sm:inline ml-0.5 text-white/90">Catalogue</span>
              </button>

              {/* --- SÉPARATEUR --- */}
              <div className="w-px h-4 xs:h-5 sm:h-6 bg-white/20 hidden xs:block" />

              {/* ============================================================ */}
              {/* ✅ BOUTON MAP - Vert émeraude */}
              {/* ============================================================ */}
              <button
                onClick={() => {
                  const allPanneaux = panneaux.map(p => ({
                    ...p,
                    faces: p.faces || []
                  }));
                  localStorage.setItem('map_panneaux_data', JSON.stringify(allPanneaux));
                  localStorage.setItem('map_filter_type', 'all');
                  window.location.href = '/dashboard/superviseurs/carte';
                }}
                className="p-1 xs:p-1.5 sm:px-2 sm:py-1 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-white text-[7px] xs:text-[8px] sm:text-[10px] md:text-xs font-medium transition-all duration-300 flex items-center justify-center border border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-105 min-w-[24px] xs:min-w-[28px] sm:min-w-[32px] group"
                aria-label="Voir la carte"
              >
                <MapPin className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 group-hover:rotate-[-10deg] transition-transform" />
                <span className="hidden sm:inline ml-0.5 text-white/90">Carte</span>
              </button>

              {/* --- SÉPARATEUR --- */}
              <div className="w-px h-4 xs:h-5 sm:h-6 bg-white/20 hidden xs:block" />

              {/* ============================================================ */}
              {/* ✅ BOUTON EXPORT - Violet */}
              {/* ============================================================ */}

              {/* Version Desktop : Menu déroulant Export */}
              <div className="hidden sm:flex relative group">
                <button
                  className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-white text-[7px] xs:text-[8px] sm:text-[10px] md:text-xs font-medium transition-all duration-300 border border-purple-500/30 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 group"
                  onClick={(e) => {
                    const dropdown = e.currentTarget.parentElement?.querySelector('.export-dropdown');
                    if (dropdown) dropdown.classList.toggle('hidden');
                  }}
                >
                  <FileText className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-purple-400" />
                  <span>Exporter</span>
                  <ChevronDown className="w-2 h-2 xs:w-2.5 xs:h-2.5 text-purple-400" />
                </button>

                {/* Dropdown */}
                <div className="export-dropdown hidden absolute top-full right-0 mt-1 min-w-[120px] bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 overflow-hidden z-50">
                  <button
                    onClick={() => { exportPDF(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors border-b border-gray-100"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-500" />
                    PDF
                  </button>
                  <button
                    onClick={() => { exportExcel(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-semibold text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />
                    Excel
                  </button>

                </div>
              </div>

              {/* Version Mobile : Icône export */}
              <button
                onClick={() => {
                  const action = confirm(
                    "📄 Exporter\n\n• OK → PDF\n• Annuler → Excel"
                  );
                  if (action) {
                    exportPDF();
                  } else {
                    exportExcel();
                  }
                }}
                className="sm:hidden p-1 xs:p-1.5 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-white transition-all duration-300 flex items-center justify-center border border-purple-500/30 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 min-w-[24px] xs:min-w-[28px] group"
                aria-label="Exporter"
              >
                <Printer className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-purple-400 group-hover:rotate-12 transition-transform" />
              </button>


              {/* ============================================================ */}
              {/* ✅ BOUTON ADMIN - UNIQUEMENT POUR LES ADMINISTRATEURS */}
              {/* ============================================================ */}
              {(isAdmin || isUserAdmin) && (
                <>
                  <div className="w-px h-4 xs:h-5 sm:h-6 bg-white/20 hidden xs:block" />
                  <button
                    onClick={() => setIsAdminModalOpen(true)}
                    className="p-1 xs:p-1.5 sm:px-2 sm:py-1 bg-gradient-to-r from-purple-500/30 to-indigo-500/30 hover:from-purple-500/40 hover:to-indigo-500/40 rounded-lg text-white text-[7px] xs:text-[8px] sm:text-[10px] md:text-xs font-medium transition-all duration-300 flex items-center justify-center border border-purple-500/30 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 min-w-[24px] xs:min-w-[28px] sm:min-w-[32px] group"
                    aria-label="Administration"
                  >
                    <Users className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-purple-400 group-hover:rotate-[-10deg] transition-transform" />
                    <span className="hidden sm:inline ml-0.5 text-white/90">Admin</span>
                  </button>
                </>
              )}
              {/* --- SÉPARATEUR --- */}
              <div className="w-px h-4 xs:h-5 sm:h-6 bg-white/20 hidden xs:block" />

              {/* ============================================================ */}
              {/* ✅ RAFRAÎCHIR - Bleu clair */}
              {/* ============================================================ */}
              <button
                onClick={() => {
                  loadData();
                }}
                className="p-1 xs:p-1.5 sm:px-2 sm:py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white text-[7px] xs:text-[8px] sm:text-[10px] md:text-xs font-medium transition-all duration-300 flex items-center justify-center hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 hover:border-white/30 min-w-[24px] xs:min-w-[28px] sm:min-w-[32px]"
                disabled={loading}
                aria-label="Rafraîchir"
              >
                <RefreshCw className={`w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-0.5">Rafraîchir</span>
              </button>

              {/* --- SÉPARATEUR --- */}
              <div className="w-px h-4 xs:h-5 sm:h-6 bg-white/20 hidden xs:block" />

              {/* ============================================================ */}
              {/* ✅ IMPRIMER - Bleu nuit */}
              {/* ============================================================ */}
              <button
                onClick={() => window.print()}
                className="hidden xs:flex p-1 xs:p-1.5 sm:px-2 sm:py-1 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg text-white text-[7px] xs:text-[8px] sm:text-[10px] md:text-xs font-medium transition-all duration-300 items-center justify-center border border-indigo-500/30 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/20 hover:scale-105 min-w-[24px] xs:min-w-[28px] sm:min-w-[32px]"
                aria-label="Imprimer"
              >
                <Printer className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline ml-0.5 text-white/90">Imprimer</span>
              </button>

              {/* --- SÉPARATEUR --- */}
              <div className="w-px h-4 xs:h-5 sm:h-6 bg-white/20 hidden xs:block" />

              {/* ============================================================ */}
              {/* ✅ BLOC PROFIL UTILISATEUR + QUITTER - UNIFIÉ */}
              {/* ============================================================ */}
              <div className="flex items-center gap-0.5 xs:gap-1 px-0.5 xs:px-1 sm:px-1.5 py-0.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300">

                {/* --- AVATAR avec première lettre --- */}
                <div className="relative w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white/30">
                  {userPhoto ? (
                    <img src={userPhoto} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] font-bold text-white">
                      {userInitial}
                    </span>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-1 h-1 xs:w-1.5 xs:h-1.5 bg-emerald-500 rounded-full border border-white/50" />
                </div>

                {/* --- INFOS UTILISATEUR - Cachées sur mobile, visibles sur tablette et desktop --- */}
                <div className="hidden lg:block min-w-0">
                  <p className="text-[7px] xs:text-[8px] sm:text-[9px] font-bold text-white truncate max-w-[50px] xs:max-w-[60px] sm:max-w-[80px]">
                    {displayName}
                  </p>
                  <p className="text-[5px] xs:text-[6px] sm:text-[7px] text-blue-200 truncate max-w-[50px] xs:max-w-[60px] sm:max-w-[80px]">
                    {userEmail}
                  </p>
                  <span className="text-[4px] xs:text-[5px] sm:text-[6px] text-amber-400 font-bold uppercase tracking-wider">
                    {user?.role || "Utilisateur"}
                  </span>
                </div>

                {/* --- SÉPARATEUR - Caché sur mobile --- */}
                <div className="w-px h-4 xs:h-5 sm:h-6 bg-white/20 hidden lg:block" />

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
                  className="flex items-center gap-0.5 xs:gap-1 px-1 xs:px-1.5 py-0.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-all duration-300 border border-red-500/30 hover:border-red-500/50 hover:scale-105 active:scale-95 group"
                  aria-label="Déconnexion"
                >
                  <LogOut className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-red-400 group-hover:rotate-12 transition-transform" />
                  <span className="hidden xs:inline text-[6px] xs:text-[7px] sm:text-[8px] font-bold text-white/90 group-hover:text-white transition-colors">
                    Quitter
                  </span>
                </button>

              </div>
            </div>
          </div>
        </div>
        {/* Barre de progression animée */}
        <div className="h-0.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
        </div>
      </header>
      <div className="max-w-full px-2 xs:px-3 sm:px-4 md:px-6 py-2 xs:py-3 sm:py-4 md:py-6">

        {/* ============================================================ */}
        {/* STATISTIQUES - VERSION ULTRA COMPACTE */}
        {/* ============================================================ */}
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-1 xs:gap-1.5 sm:gap-2 mb-2 xs:mb-3 sm:mb-4">

          {/* Panneaux */}
          <div className="bg-white rounded-lg xs:rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-1 xs:p-1.5 sm:p-2 lg:p-2.5 border border-gray-100 hover:border-blue-200 group text-center">
            <div className="flex flex-col items-center justify-center">
              <p className="text-[5px] xs:text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-gray-400 uppercase tracking-wider">Panneaux</p>
              <p className="text-[9px] xs:text-[10px] sm:text-[11px] lg:text-[13px] xl:text-[15px] font-black text-gray-800 mt-0.5 leading-none">
                {loading ? <Loader2 className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 animate-spin text-blue-500 mx-auto" /> : stats.totalPanneaux}
              </p>
              <div className="p-0.5 xs:p-1 sm:p-1.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/30 mt-0.5">
                <LayoutGrid className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Faces */}
          <div className="bg-white rounded-lg xs:rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-1 xs:p-1.5 sm:p-2 lg:p-2.5 border border-gray-100 hover:border-indigo-200 group text-center">
            <div className="flex flex-col items-center justify-center">
              <p className="text-[5px] xs:text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-gray-400 uppercase tracking-wider">Faces</p>
              <p className="text-[9px] xs:text-[10px] sm:text-[11px] lg:text-[13px] xl:text-[15px] font-black text-gray-800 mt-0.5 leading-none">
                {loading ? <Loader2 className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 animate-spin text-indigo-500 mx-auto" /> : stats.totalFaces}
              </p>
              <div className="p-0.5 xs:p-1 sm:p-1.5 rounded-lg bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 border border-indigo-200/30 mt-0.5">
                <Layers className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-indigo-600" />
              </div>
            </div>
          </div>

          {/* Occupées */}
          <div className="bg-white rounded-lg xs:rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-1 xs:p-1.5 sm:p-2 lg:p-2.5 border border-gray-100 hover:border-blue-200 group text-center">
            <div className="flex flex-col items-center justify-center">
              <p className="text-[5px] xs:text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-gray-400 uppercase tracking-wider">Occupées</p>
              <p className="text-[9px] xs:text-[10px] sm:text-[11px] lg:text-[13px] xl:text-[15px] font-black text-gray-800 mt-0.5 leading-none">
                {loading ? <Loader2 className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 animate-spin text-blue-500 mx-auto" /> : stats.totalOccupes}
              </p>
              <div className="p-0.5 xs:p-1 sm:p-1.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/30 mt-0.5">
                <Activity className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Libres */}
          <div className="bg-white rounded-lg xs:rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-1 xs:p-1.5 sm:p-2 lg:p-2.5 border border-gray-100 hover:border-emerald-200 group text-center">
            <div className="flex flex-col items-center justify-center">
              <p className="text-[5px] xs:text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-gray-400 uppercase tracking-wider">Libres</p>
              <p className="text-[9px] xs:text-[10px] sm:text-[11px] lg:text-[13px] xl:text-[15px] font-black text-gray-800 mt-0.5 leading-none">
                {loading ? <Loader2 className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 animate-spin text-emerald-500 mx-auto" /> : stats.totalLibres}
              </p>
              <div className="p-0.5 xs:p-1 sm:p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-200/30 mt-0.5">
                <CheckCircle2 className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Réservées */}
          <div className="bg-white rounded-lg xs:rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-1 xs:p-1.5 sm:p-2 lg:p-2.5 border border-gray-100 hover:border-amber-200 group text-center">
            <div className="flex flex-col items-center justify-center">
              <p className="text-[5px] xs:text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-gray-400 uppercase tracking-wider">Réservées</p>
              <p className="text-[9px] xs:text-[10px] sm:text-[11px] lg:text-[13px] xl:text-[15px] font-black text-gray-800 mt-0.5 leading-none">
                {loading ? <Loader2 className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 animate-spin text-amber-500 mx-auto" /> : stats.totalReserves}
              </p>
              <div className="p-0.5 xs:p-1 sm:p-1.5 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/10 border border-amber-200/30 mt-0.5">
                <Clock className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
              </div>
            </div>
          </div>

          {/* Rés. Futures */}
          <div className="bg-white rounded-lg xs:rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-1 xs:p-1.5 sm:p-2 lg:p-2.5 border border-gray-100 hover:border-purple-200 group text-center">
            <div className="flex flex-col items-center justify-center">
              <p className="text-[5px] xs:text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-gray-400 uppercase tracking-wider">Rés. Futures</p>
              <p className="text-[9px] xs:text-[10px] sm:text-[11px] lg:text-[13px] xl:text-[15px] font-black text-gray-800 mt-0.5 leading-none">
                {loading ? <Loader2 className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 animate-spin text-purple-500 mx-auto" /> : stats.totalReservationsFutures}
              </p>
              <div className="p-0.5 xs:p-1 sm:p-1.5 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-200/30 mt-0.5">
                <Calendar className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-purple-600" />
              </div>
            </div>
          </div>

        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-3 xs:mb-4 sm:mb-6 overflow-hidden">

          {/* Bouton d'ouverture */}
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="w-full flex items-center justify-between p-3 xs:p-3.5 sm:p-4 hover:bg-gray-50/80 transition-colors"
          >
            <span className="flex items-center gap-2 text-[11px] xs:text-xs sm:text-sm font-bold text-gray-700">
              <Filter className="w-4 h-4 text-blue-600" />
              <span className="hidden xs:inline font-black">Filtres Avancés</span>
              <span className="inline xs:hidden font-black">Filtres</span>
              <span className="ml-1 xs:ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[9px] xs:text-[10px] font-black">
                {filteredPanneaux.length}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] xs:text-[10px] text-gray-400 font-medium hidden sm:inline">
                {filtersExpanded ? 'Masquer' : 'Afficher'}
              </span>
              {filtersExpanded ?
                <ChevronUp className="w-4 h-4 text-gray-500" /> :
                <ChevronDown className="w-4 h-4 text-gray-500" />
              }
            </div>
          </button>

          {/* Contenu des filtres */}
          <AnimatePresence>
            {filtersExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-3 xs:p-4 sm:p-5 border-t border-gray-200 bg-gray-50/50 space-y-3 xs:space-y-4">

                  {/* Ligne 1 : Géographie */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 xs:gap-3">

                    {/* PAYS */}
                    <div>
                      <label className="text-[9px] xs:text-[10px] font-black text-gray-600 uppercase tracking-wider">Pays</label>
                      <select
                        className="w-full mt-1 px-2 xs:px-3 py-1.5 xs:py-2 bg-white border-2 border-gray-200 rounded-lg text-xs xs:text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        value={geoFilter.pays}
                        onChange={(e) => setGeoFilter({ pays: e.target.value, province: 'Tous', district: 'Tous', commune: 'Tous' })}
                      >
                        <option value="Tous">🌍 Tous</option>
                        {GEOGRAPHIE && Object.keys(GEOGRAPHIE).map((pays) => (
                          <option key={pays} value={pays}>{pays}</option>
                        ))}
                      </select>
                    </div>

                    {/* PROVINCE */}
                    <div>
                      <label className="text-[9px] xs:text-[10px] font-black text-gray-600 uppercase tracking-wider">Province</label>
                      <select
                        className="w-full mt-1 px-2 xs:px-3 py-1.5 xs:py-2 bg-white border-2 border-gray-200 rounded-lg text-xs xs:text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-40"
                        value={geoFilter.province}
                        onChange={(e) => setGeoFilter({ ...geoFilter, province: e.target.value, district: 'Tous', commune: 'Tous' })}
                        disabled={geoFilter.pays === 'Tous' || !GEOGRAPHIE}
                      >
                        <option value="Tous">🏛️ Toutes</option>
                        {geoFilter.pays !== 'Tous' && GEOGRAPHIE && GEOGRAPHIE[geoFilter.pays] &&
                          Object.keys(GEOGRAPHIE[geoFilter.pays]).map((province) => (
                            <option key={province} value={province}>{province}</option>
                          ))
                        }
                      </select>
                    </div>

                    {/* DISTRICT */}
                    <div>
                      <label className="text-[9px] xs:text-[10px] font-black text-gray-600 uppercase tracking-wider">District</label>
                      <select
                        className="w-full mt-1 px-2 xs:px-3 py-1.5 xs:py-2 bg-white border-2 border-gray-200 rounded-lg text-xs xs:text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-40"
                        value={geoFilter.district}
                        onChange={(e) => setGeoFilter({ ...geoFilter, district: e.target.value, commune: 'Tous' })}
                        disabled={geoFilter.province === 'Tous' || geoFilter.pays === 'Tous' || !GEOGRAPHIE}
                      >
                        <option value="Tous">📌 Tous</option>
                        {geoFilter.pays !== 'Tous' && geoFilter.province !== 'Tous' && GEOGRAPHIE &&
                          GEOGRAPHIE[geoFilter.pays] && GEOGRAPHIE[geoFilter.pays][geoFilter.province] &&
                          Object.keys(GEOGRAPHIE[geoFilter.pays][geoFilter.province]).map((district) => (
                            <option key={district} value={district}>{district}</option>
                          ))
                        }
                      </select>
                    </div>

                    {/* COMMUNE */}
                    <div>
                      <label className="text-[9px] xs:text-[10px] font-black text-gray-600 uppercase tracking-wider">Tronçon</label>
                      <select
                        className="w-full mt-1 px-2 xs:px-3 py-1.5 xs:py-2 bg-white border-2 border-gray-200 rounded-lg text-xs xs:text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-40"
                        value={geoFilter.commune}
                        onChange={(e) => setGeoFilter({ ...geoFilter, commune: e.target.value })}
                        disabled={geoFilter.district === 'Tous' || geoFilter.province === 'Tous' || geoFilter.pays === 'Tous' || !GEOGRAPHIE}
                      >
                        <option value="Tous">📍 Tous</option>
                        {geoFilter.pays !== 'Tous' && geoFilter.province !== 'Tous' && geoFilter.district !== 'Tous' &&
                          GEOGRAPHIE && GEOGRAPHIE[geoFilter.pays] &&
                          GEOGRAPHIE[geoFilter.pays][geoFilter.province] &&
                          GEOGRAPHIE[geoFilter.pays][geoFilter.province][geoFilter.district] &&
                          GEOGRAPHIE[geoFilter.pays][geoFilter.province][geoFilter.district].map((commune: string) => (
                            <option key={commune} value={commune}>{commune}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>

                  {/* Ligne 2 : Statut, Type, Dates */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 xs:gap-3">

                    {/* STATUT */}
                    <div>
                      <label className="text-[9px] xs:text-[10px] font-black text-gray-600 uppercase tracking-wider">Statut</label>
                      <select
                        className="w-full mt-1 px-2 xs:px-3 py-1.5 xs:py-2 bg-white border-2 border-gray-200 rounded-lg text-xs xs:text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="Tous">📋 Tous</option>
                        <option value="Libre">🟢 Libre</option>
                        <option value="Occupé">🔵 Occupé</option>
                        <option value="Réservé">🟡 Réservé</option>
                      </select>
                    </div>

                    {/* TYPE DE PANNEAU */}
                    <div>
                      <label className="text-[9px] xs:text-[10px] font-black text-gray-600 uppercase tracking-wider">Type</label>
                      <select
                        className="w-full mt-1 px-2 xs:px-3 py-1.5 xs:py-2 bg-white border-2 border-gray-200 rounded-lg text-xs xs:text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                      >
                        <option value="Tous">📦 Tous</option>
                        {TYPES_SUPPORTS && Array.isArray(TYPES_SUPPORTS) && TYPES_SUPPORTS.map((type: string) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    {/* DATE DÉBUT */}
                    <div>
                      <label className="text-[9px] xs:text-[10px] font-black text-gray-600 uppercase tracking-wider">Date Début</label>
                      <input
                        type="date"
                        className="w-full mt-1 px-2 xs:px-3 py-1.5 xs:py-2 bg-white border-2 border-gray-200 rounded-lg text-xs xs:text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        value={dateFilter.startDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                      />
                    </div>

                    {/* DATE FIN */}
                    <div>
                      <label className="text-[9px] xs:text-[10px] font-black text-gray-600 uppercase tracking-wider">Date Fin</label>
                      <input
                        type="date"
                        className="w-full mt-1 px-2 xs:px-3 py-1.5 xs:py-2 bg-white border-2 border-gray-200 rounded-lg text-xs xs:text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        value={dateFilter.endDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Ligne 3 : Recherche + Réinitialiser */}
                  <div className="flex flex-col xs:flex-row gap-2 xs:gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 xs:w-4 xs:h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="🔍 Rechercher par ID ou adresse..."
                        className="w-full pl-8 xs:pl-9 pr-3 py-1.5 xs:py-2 bg-white border-2 border-gray-200 rounded-lg text-xs xs:text-sm font-medium text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => {
                        setGeoFilter({ pays: 'Tous', province: 'Tous', district: 'Tous', commune: 'Tous' });
                        setDateFilter({ startDate: '', endDate: '' });
                        setSearchFilter('');
                        setStatusFilter('Tous');
                        setTypeFilter('Tous');
                      }}
                      className="px-3 xs:px-4 py-1.5 xs:py-2 bg-red-50 text-red-600 rounded-lg text-[10px] xs:text-xs font-bold hover:bg-red-100 transition-all border-2 border-red-200 hover:border-red-400 whitespace-nowrap flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                      <span className="hidden xs:inline">Réinitialiser</span>
                      <span className="inline xs:hidden">Effacer</span>
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Modal des détails de la face */}

        </div>



        {/* ============================================================ */}
        {/* TABLEAU PRINCIPAL */}
        {/* ============================================================ */}
        {renderTableauPanneaux()}

        {/* ============================================================ */}
        {/* BOUTON FLOTTANT */}
        {/* ============================================================ */}
        <div className="fixed bottom-6 right-6 z-[100]">
          <button
            onClick={() => setIsFloatingMenuOpen(!isFloatingMenuOpen)}
            className="relative group"
          >
            {/* Badge de notification */}
            {reservationsEnAttente.length > 0 && (
              <span className="absolute -top-1 -right-1 z-10 w-5 h-5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-pulse border-2 border-white">
                {reservationsEnAttente.length}
              </span>
            )}

            {/* Bouton principal avec animation */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isFloatingMenuOpen
                ? 'bg-gradient-to-r from-red-500 to-red-600 rotate-90'
                : 'bg-gradient-to-r from-blue-500 to-blue-700'
                }`}
            >
              {isFloatingMenuOpen ? (
                <X className="w-7 h-7 text-white" />
              ) : (
                <FileText className="w-7 h-7 text-white" />
              )}
            </motion.div>
          </button>

          {/* MENU FLOTTANT */}
          <AnimatePresence>
            {isFloatingMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute bottom-16 right-0 flex flex-col gap-3"
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
                    <FileText className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-amber-600" />
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
                  <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-300 group-hover:text-amber-500 transition-colors" />
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
                    <LayoutDashboard className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[11px] sm:text-[12px] font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                      Ma Performance
                    </p>
                    <p className="text-[8px] sm:text-[9px] text-gray-400 font-medium">
                      Voir mes statistiques
                    </p>
                  </div>
                  <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ============================================================ */}
        {/* PANIER DES PROFORMAS - VERSION BLEUE ROI PROFOND */}
        {/* ============================================================ */}
        <AnimatePresence>
          {isCartOpen && (
            <>
              {/* OVERLAY */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCartOpen(false)}
                className="fixed inset-0 z-[100]"
              >
                <div className="absolute inset-0 bg-black/5 backdrop-blur-[2px]" />
              </motion.div>

              {/* PANEL LATÉRAL */}
              <motion.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white/95 backdrop-blur-xl border-l border-white/20 z-[101] flex flex-col shadow-2xl shadow-black/10"
              >
                {/* HEADER - BLEU ROI PROFOND */}
                <div className="relative p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-[#00539B] to-[#003A6B] backdrop-blur-sm flex-shrink-0">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl" />

                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-blue-300 rounded-full" />
                        <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em]">Facturation</p>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white">
                        Mes <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-200">Réservations</span>
                      </h2>
                      <p className="text-xs text-blue-200 font-bold mt-1">
                        {reservationsEnAttente.length} réservation(s) en attente de paiement
                      </p>
                    </div>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="group p-2.5 bg-white/20 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 text-white backdrop-blur-sm border border-white/20 hover:border-red-500"
                    >
                      <X className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>
                </div>

                {/* CONTENU - TAILLES DE TEXTE AGRANDIES */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar bg-gray-50/50">
                  {reservationsEnAttente.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 border-2 border-[#00539B]/20">
                          <FileText className="w-10 h-10 text-[#00539B]/40" />
                        </div>
                        <p className="text-gray-700 text-xl font-black uppercase tracking-wider">Panier vide</p>
                        <p className="text-gray-400 text-sm mt-2 max-w-[250px] mx-auto font-medium">
                          Vous n'avez aucune réservation en attente de facturation
                        </p>
                      </div>
                    </div>
                  ) : (
                    reservationsEnAttente.map((res: any, index: number) => {
                      const key = res.resUniqueId || `res-${index}`;
                      const unitPrice = prices[key] || 0;
                      const isSelected = selectedForPrint[key] || false;
                      const dureeMois = res.dureeMois || 1;

                      return (
                        <motion.div
                          key={key}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`group relative p-4 rounded-xl border-2 transition-all duration-300 backdrop-blur-sm ${isSelected
                            ? 'bg-blue-50/80 border-[#00539B] shadow-lg shadow-[#00539B]/20'
                            : 'bg-white/80 border-gray-200/60 hover:border-[#00539B]/40 hover:shadow-md hover:shadow-[#00539B]/10'
                            }`}
                        >
                          {/* HEADER */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#00539B] animate-pulse' : 'bg-gray-300'}`} />
                              <span className="text-xs font-black text-[#00539B] uppercase tracking-wider">
                                Réservation #{index + 1}
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedForPrint(prev => ({ ...prev, [key]: !prev[key] }))}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${isSelected
                                ? 'bg-[#00539B] border-[#00539B]'
                                : 'border-gray-300 hover:border-[#00539B]'
                                }`}
                            >
                              {isSelected && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              )}
                            </button>
                          </div>

                          {/* INFOS - TEXTES PLUS GRANDS */}
                          <div className="mb-3">
                            <p className="text-gray-800 text-base font-black uppercase truncate">{res.societeLocatrice}</p>
                            <p className="text-sm text-gray-600 font-bold mt-1">
                              Face: <span className="text-[#00539B]">{res.faceLabel || 'N/A'}</span>
                              <span className="text-gray-300 mx-2">•</span>
                              Panneau: <span className="text-[#00539B]">{res.panneauIdPan || 'N/A'}</span>
                            </p>
                            <p className="text-xs text-gray-500 font-medium mt-1">
                              📅 {res.dateDebut} → {res.dateFin || 'En cours'}
                            </p>
                            <p className="text-xs text-gray-500 font-medium">
                              ⏱️ Durée: <span className="font-bold text-[#00539B]">{dureeMois} mois</span>
                            </p>
                          </div>

                          {/* PRIX - DESIGN AMÉLIORÉ */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2.5 border border-gray-200/60">
                              <label className="text-[10px] text-gray-500 uppercase font-bold block">Prix unitaire</label>
                              <div className="flex items-center gap-1 mt-0.5">
                                <input
                                  type="number"
                                  value={unitPrice === 0 ? "" : unitPrice}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPrices(prev => ({ ...prev, [key]: val === "" ? 0 : Number(val) }));
                                  }}
                                  placeholder="0"
                                  className="w-full bg-transparent text-base text-gray-800 font-bold outline-none"
                                />
                                <span className="text-sm text-[#00539B] font-black">$</span>
                              </div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/40 backdrop-blur-sm rounded-xl p-2.5 text-right border border-[#00539B]/20">
                              <label className="text-[10px] text-gray-500 uppercase font-bold block">Total</label>
                              <span className="text-[#00539B] text-lg font-black">
                                {(unitPrice * dureeMois).toLocaleString()} $
                              </span>
                            </div>
                          </div>

                          {/* BOUTON SUPPRIMER - TEXTE PLUS GRAND */}
                          <div className="flex justify-end pt-2 border-t border-gray-200/50">
                            <button
                              onClick={() => processOperations('delete', res, index)}
                              className="px-4 py-1.5 bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-600 rounded-xl font-black text-xs uppercase hover:bg-red-600 hover:text-white transition-all active:scale-95 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Supprimer
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                {/* FOOTER - AVEC GESTION DES TRANCHES - BLEU ROI */}
                {reservationsEnAttente.length > 0 && (
                  <div className="p-4 sm:p-5 border-t border-gray-200/50 bg-white/90 backdrop-blur-sm flex-shrink-0 space-y-4">
                    {/* SECTION MODE DE PAIEMENT GLOBAL - TRANCHES */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-[#00539B]/20 shadow-sm">
                      <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-[#00539B]" />
                        Mode de paiement
                      </h3>

                      <div className="flex gap-2 mb-3">
                        {['total', 'tranche'].map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setGlobalPaymentMode(mode as 'total' | 'tranche')}
                            className={`flex-1 py-2.5 text-sm font-black uppercase rounded-xl transition-all ${globalPaymentMode === mode
                              ? 'bg-[#00539B] text-white shadow-lg shadow-[#00539B]/30'
                              : 'bg-white/50 text-gray-500 hover:text-gray-700 border-2 border-gray-200/50'
                              }`}
                          >
                            {mode === 'total' ? '💰 Comptant' : '📅 Tranches'}
                          </button>
                        ))}
                      </div>

                      {/* Configuration des tranches */}
                      {globalPaymentMode === 'tranche' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border-2 border-[#00539B]/20"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 font-black uppercase">Nombre de tranches</span>
                            <input
                              type="number"
                              min="2"
                              max="12"
                              value={globalTranchesCount}
                              onChange={(e) => setGlobalTranchesCount(Math.max(2, Math.min(12, parseInt(e.target.value) || 2)))}
                              className="w-20 bg-white/80 border-2 border-gray-200 rounded-xl px-3 py-2 text-center text-gray-800 text-base font-black outline-none focus:border-[#00539B] focus:ring-2 focus:ring-[#00539B]/20"
                            />
                          </div>
                          <div className="mt-3 pt-3 border-t-2 border-gray-200/50">
                            <div className="flex justify-between text-sm text-gray-600">
                              <span className="font-bold">Total facture:</span>
                              <span className="text-[#00539B] font-black text-base">{totalFactureAmount.toLocaleString()} $</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 mt-1">
                              <span className="font-bold">Montant par tranche:</span>
                              <span className="text-[#00539B] font-black text-base">
                                {(totalFactureAmount / globalTranchesCount).toLocaleString()} $
                              </span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 mt-1">
                              <span className="font-bold">Nombre de tranches:</span>
                              <span className="text-[#00539B] font-black text-base">{globalTranchesCount}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {globalPaymentMode === 'total' && totalFactureAmount > 0 && (
                        <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200/50 mt-2">
                          <span className="text-sm text-gray-700 font-black uppercase">Total à payer:</span>
                          <span className="text-[#00539B] font-black text-xl">{totalFactureAmount.toLocaleString()} $</span>
                        </div>
                      )}
                    </div>

                    {/* BOUTON PRINCIPAL - BLEU ROI */}
                    <button
                      disabled={Object.values(selectedForPrint).filter(v => v).length === 0}
                      onClick={() => processOperations('selection')}
                      className="w-full bg-[#00539B] disabled:opacity-40 text-white py-3.5 rounded-xl font-black text-base uppercase flex justify-between px-5 items-center hover:bg-[#003A6B] hover:shadow-xl hover:shadow-[#00539B]/30 transition-all active:scale-[0.98]"
                    >
                      <span>📄 Facturer la sélection</span>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                        {Object.values(selectedForPrint).filter(v => v).length} face(s)
                      </span>
                    </button>

                    {/* BOUTON FERMER */}
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="w-full py-3 bg-white/80 border-2 border-gray-200/60 text-gray-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all rounded-xl font-black uppercase text-sm tracking-[0.15em] active:scale-95"
                    >
                      Fermer le panier
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>




        <AnimatePresence>
          {isStatsOpen && (
            <>
              {/* OVERLAY */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsStatsOpen(false)}
                className="fixed inset-0 z-[100]"
              >
                <div className="absolute inset-0 bg-black/5 backdrop-blur-[2px]" />
              </motion.div>

              {/* PANEL LATÉRAL */}
              <motion.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white/90 backdrop-blur-xl border-l border-white/20 z-[101] flex flex-col shadow-2xl shadow-black/5"
              >
                {/* HEADER */}
                <div className="relative p-4 sm:p-5 border-b border-white/10 bg-white/40 backdrop-blur-sm flex-shrink-0">
                  <div className="flex justify-between items-center">
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
                      <X className="w-4 h-4 sm:w-[18px] sm:h-[18px] group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>
                </div>

                {/* CONTENU */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-transparent">
                  {/* CERCLE DE PERFORMANCE */}
                  <div className="flex flex-col items-center py-2">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-200" />
                        <circle
                          cx="64" cy="64" r="56"
                          fill="none"
                          stroke="url(#gradientStats)"
                          strokeWidth="6"
                          strokeDasharray="352"
                          strokeDashoffset={352 - (352 * statsEfficacite().performance) / 100}
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

                  {/* STATS RAPIDES */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 border border-white/30 hover:border-blue-400/40 transition-all">
                      <p className="text-xl font-black text-gray-800">{statsEfficacite().totalAgent}</p>
                      <p className="text-[7px] uppercase text-gray-400 font-bold tracking-wider">Mes Réservations</p>
                    </div>
                    <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 border border-white/30 hover:border-blue-400/40 transition-all">
                      <p className="text-xl font-black text-gray-800">{statsEfficacite().totalGlobal}</p>
                      <p className="text-[7px] uppercase text-gray-400 font-bold tracking-wider">Total Réservations</p>
                    </div>
                  </div>

                  {/* FILTRES */}
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

                    {timeFilter !== 'present' && (
                      <div className="flex items-center justify-between bg-white/30 px-2.5 py-1.5 rounded-lg border border-white/20">
                        <span className="text-[7px] text-gray-400 font-black uppercase">Mois :</span>
                        <input
                          type="number"
                          value={monthCount}
                          onChange={(e) => setMonthCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-8 bg-transparent text-right font-black text-blue-600 outline-none text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* LISTE DES RÉSERVATIONS */}
                  <div className="space-y-2">
                    {getFilteredUserReservations().length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto bg-white/30 rounded-full flex items-center justify-center mb-2 border border-white/20">
                          <Calendar className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-xs font-bold uppercase">Aucune réservation</p>
                        <p className="text-gray-400/60 text-[7px] mt-1">Aucune réservation trouvée pour cette période</p>
                      </div>
                    ) : (
                      getFilteredUserReservations().map((res: any, idx: number) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-2.5 p-2.5 bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl hover:border-blue-400/50 hover:shadow-md hover:shadow-blue-100/20 transition-all group"
                        >
                          <div className="w-9 h-9 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-white/30 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[7px] font-black text-blue-600 truncate uppercase">
                              {res.societeLocatrice || 'S/N'}
                            </p>
                            <p className="text-[9px] text-gray-800 font-bold truncate uppercase leading-tight">
                              Face: {res.faceLabel || res.faceId || 'N/A'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[6px] text-gray-400 font-bold">{res.dateDebut}</span>
                              <span className="text-[4px] text-gray-300">→</span>
                              <span className="text-[6px] text-gray-400 font-bold">{res.dateFin || 'En cours'}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-[6px] font-black uppercase px-1.5 py-0.5 rounded-full ${res.statut === 'Occupé' || res.statut === 'validé'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                              }`}>
                              {res.statut || 'Réservé'}
                            </span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* FOOTER */}
                <div className="p-3 border-t border-white/20 bg-white/30 backdrop-blur-sm flex-shrink-0">
                  <button
                    onClick={() => setIsStatsOpen(false)}
                    className="w-full py-2 bg-white/40 border border-white/20 text-gray-600 hover:bg-red-500 hover:text-white transition-all rounded-lg font-black uppercase text-[8px] tracking-[0.15em] active:scale-95"
                  >
                    Fermer le panel
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>{/* CONTENU */}
        {/* ============================================================ */}
        {/* ✅ MODAL ADMIN - DOIT ÊTRE ICI ! */}
        {/* ============================================================ */}
        <AnimatePresence>
          {isAdminModalOpen && (
            <>
              {/* OVERLAY */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAdminModalOpen(false)}
                className="fixed inset-0 z-[200]"
              >
                <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
              </motion.div>

              {/* MODAL */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed inset-4 sm:inset-8 md:inset-12 lg:inset-20 z-[201] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col border border-white/20 overflow-hidden"
              >
                {/* HEADER */}
                <div className="relative p-4 sm:p-6 border-b border-gray-200/50 bg-gradient-to-r from-[#00539B] to-[#003A6B] flex-shrink-0">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl" />

                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-purple-300 rounded-full" />
                        <p className="text-[10px] font-black text-purple-300 uppercase tracking-[0.3em]">Administration</p>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white">
                        Panel <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-blue-300">Admin</span>
                      </h2>
                      <p className="text-xs text-blue-200 font-bold mt-1">
                        Gestion des agents commerciaux, réservations et rendez-vous
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAdminModalOpen(false)}
                      className="group p-2.5 bg-white/20 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 text-white backdrop-blur-sm border border-white/20 hover:border-red-500"
                    >
                      <X className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>
                </div>

                {/* TABS NAVIGATION */}
                <div className="flex border-b border-gray-200/50 bg-gray-50/50 px-4 sm:px-6 gap-1 sm:gap-2 flex-shrink-0">
                  {[
                    { id: 'agents', label: '👥 Agents Commerciaux' },
                    { id: 'reservations', label: '📋 Réservations' },
                    { id: 'rdv', label: '📅 Rendez-vous' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setAdminActiveTab(tab.id as any)}
                      className={`px-3 sm:px-5 py-2.5 sm:py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all relative ${adminActiveTab === tab.id
                        ? 'text-[#00539B]'
                        : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                      {tab.label}
                      {adminActiveTab === tab.id && (
                        <motion.div
                          layoutId="adminTabIndicator"
                          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* CONTENU */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-gray-50/30">
                  {adminLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 text-[#00539B] animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Onglet Agents */}
                      {adminActiveTab === 'agents' && (
                        <AdminAgentsTab
                          agents={agents}
                          panneaux={panneaux}
                          factures={factures}
                          onAgentAction={handleAgentAction}
                          onExport={() => exportAdminReport('agents')}
                        />
                      )}

                      {/* Onglet Réservations */}
                      {adminActiveTab === 'reservations' && (
                        <AdminReservationsTab
                          panneaux={panneaux}
                          agents={agents}
                          onReservationAction={handleReservationAction}
                          onExport={() => exportAdminReport('reservations')}
                        />
                      )}

                      {/* Onglet Rendez-vous */}
                      {adminActiveTab === 'rdv' && (
                        <AdminRdvTab
                          rdvList={rdvList}
                          onRdvAction={handleRdvAction}
                          onExport={() => exportAdminReport('rdv')}
                        />
                      )}
                    </>
                  )}
                </div>

                {/* FOOTER MODAL */}
                <div className="p-4 border-t border-gray-200/50 bg-gray-50/50 flex-shrink-0 flex justify-between items-center">
                  <p className="text-xs text-gray-400 font-medium">
                    {adminActiveTab === 'agents' && `${agents.length} agent(s) commerciaux`}
                    {adminActiveTab === 'reservations' && `${panneaux.length} panneau(x) enregistré(s)`}
                    {adminActiveTab === 'rdv' && `${rdvList.length} rendez-vous programmé(s)`}
                  </p>
                  <button
                    onClick={() => setIsAdminModalOpen(false)}
                    className="px-6 py-2 bg-[#00539B] text-white rounded-xl font-bold text-sm hover:bg-[#003A6B] transition active:scale-95"
                  >
                    Fermer
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>





        {/* ============================================================ */}
        {/* FOOTER */}
        {/* ============================================================ */}
        <div className="mt-4 xs:mt-5 sm:mt-6 text-center border-t border-gray-200 pt-3 xs:pt-4">
          {/* ✅ FOOTER AVEC 3 COLONNES - STRUCTURE FIXE SUR TOUS LES APPAREILS */}
          <div className="flex flex-row items-center justify-between gap-1 xs:gap-2 sm:gap-4">

            {/* 🔹 GAUCHE - Informations de la société */}
            <div className="flex flex-col items-center xs:items-start gap-0.5 flex-1 min-w-0">
              <p className="text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] font-bold text-blue-700 truncate w-full">
                Dispromalt
              </p>
              <p className="text-[5px] xs:text-[6px] sm:text-[7px] md:text-[8px] text-gray-400 truncate w-full">
                Gestion Digitale des Panneaux
              </p>
              <p className="text-[4px] xs:text-[5px] sm:text-[6px] md:text-[7px] text-gray-400 truncate w-full">
                © 2026 - Tous droits réservés
              </p>
            </div>

            {/* 🔹 CENTRE - Application */}
            <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-0.5 xs:gap-1">
                <span className="text-[8px] xs:text-[9px] sm:text-[10px] md:text-[11px] font-black text-blue-700">GDP</span>
                <span className="text-[4px] xs:text-[5px] sm:text-[6px] md:text-[7px] text-gray-400 bg-gray-100 px-1 xs:px-1.5 py-0.5 rounded-full">
                  v1.0.0
                </span>
              </div>
              <div className="flex items-center gap-0.5 xs:gap-1">
                <span className="w-1 xs:w-1.5 h-1 xs:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[4px] xs:text-[5px] sm:text-[6px] md:text-[7px] text-gray-400 uppercase tracking-wider">
                  En ligne
                </span>
              </div>
            </div>

            {/* 🔹 DROITE - Informations du développeur */}
            <div className="flex flex-col items-center xs:items-end gap-0.5 flex-1 min-w-0">
              <p className="text-[6px] xs:text-[7px] sm:text-[8px] md:text-[9px] font-semibold text-gray-600 truncate w-full text-center xs:text-right">
                <span className="text-blue-700 font-bold">Andre Omeonga</span>
              </p>
              <div className="flex flex-col items-center xs:items-end gap-0.5 w-full">
                <a href="mailto:omeongaandre2@dispromalt.cd" className="text-[5px] xs:text-[6px] sm:text-[7px] md:text-[8px] text-blue-500 hover:underline hover:text-blue-700 transition-colors truncate w-full text-center xs:text-right">
                  📧 omeongaandre2@dispromalt.cd
                </a>
                <div className="flex items-center gap-0.5 xs:gap-1">
                  <span className="text-[5px] xs:text-[6px] sm:text-[7px] md:text-[8px] text-gray-400">📱</span>
                  <a href="tel:+243851553869" className="text-[5px] xs:text-[6px] sm:text-[7px] md:text-[8px] text-blue-500 hover:underline hover:text-blue-700 transition-colors whitespace-nowrap">
                    0851553869
                  </a>
                  <span className="text-gray-300 text-[4px] xs:text-[5px]">•</span>
                  <a href="tel:+243815023699" className="text-[5px] xs:text-[6px] sm:text-[7px] md:text-[8px] text-blue-500 hover:underline hover:text-blue-700 transition-colors whitespace-nowrap">
                    0815023699
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
        {/* Modal des détails de la face */}
        {/* ✅ MODAL D'ÉDITION DU PANNEAU */}
        {panneauToEdit && (
          <EditPanneauModal
            isOpen={true}
            onClose={closeEditPanneau}
            panneau={panneauToEdit}
            user={localUser}
          />
        )}

        {/* ✅ MODAL DES DÉTAILS DE LA FACE */}
        <AnimatePresence>
          {isFaceModalOpen && selectedFace && selectedPanneau && (
            <FaceDetailModal
              isOpen={isFaceModalOpen}
              onClose={closeFaceModal}
              panneau={{
                ...selectedPanneau,
                onEdit: openEditPanneau  // ✅ Passer la fonction au modal
              }}
              face={selectedFace}
              onSelect={(selectionKey: string) => {
                console.log('Face sélectionnée:', selectionKey);
              }}
              isSelected={false}
              ouvrirLaCarte={ouvrirLaCarte}
            //user={localUser}
            />
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
              face={faceForReservation} // ✅ Passer la face pour pré-remplir
              user={localUser || user}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );


};

export default RapportPanneaux;
