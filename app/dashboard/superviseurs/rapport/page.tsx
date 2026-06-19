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
  Printer, RefreshCw, AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { collection, getDocs, DocumentData } from 'firebase/firestore';
import { getApps, getApp, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ============================================
// IMPORT DE LA CONFIGURATION
// ============================================
const config = require('../../../../config/db');

// Extraction des variables
const firebaseConfig = config.firebaseConfig;
const GEOGRAPHIE = config.GEOGRAPHIE;
const TYPES_SUPPORTS = config.TYPES_SUPPORTS; // ✅ Ajout


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
  // ✅ Ajouter ces propriétés optionnelles
  faceId?: string;    // ID de la face concernée
  face?: string;      // Alternative pour l'ID de la face
  id?: string;        // ID de la réservation
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
  // États des données
  const [panneaux, setPanneaux] = useState<Panneau[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // États UI
  const [activeTab, setActiveTab] = useState<string>('panneaux');
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

  // Détection mobile
  useEffect(() => {
    const handleResize = (): void => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================
  // CHARGEMENT DES DONNÉES DEPUIS FIREBASE
  // ============================================

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

      const panneauxRef = collection(db, 'panneaux');
      const panneauxSnapshot = await getDocs(panneauxRef);

      const panneauxData: Panneau[] = [];
      const agentsMap = new Map<string, Agent>();

      panneauxSnapshot.forEach((doc) => {
        const data = doc.data() as DocumentData;

        // ✅ S'assurer que chaque face a un ID unique
        const faces = Array.isArray(data.faces) ? data.faces.map((f: any, idx: number) => ({
          ...f,
          id: f.id || `${data.idPan || 'F'}${idx + 1}`
        })) : [];

        // ✅ S'assurer que les réservations ont un faceId
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

        // Extraction des agents
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
                  revenue: 0
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

      setPanneaux(panneauxData);
      setAgents(Array.from(agentsMap.values()));
      setLastUpdate(new Date());

    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Impossible de charger les données. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, []);


  // Chargement initial
  useEffect(() => {
    loadData();
  }, [loadData]);


  // ============================================
  // FONCTIONS POUR LES RÉSERVATIONS - CORRIGÉES
  // ============================================

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
  // ============================================
  // LOGIQUE DE FILTRAGE - CORRIGÉE
  // ============================================
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

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================
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
  // EXPORT EXCEL - VERSION AVANCÉE
  // ============================================
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
          <table className="w-full border-collapse min-w-[1100px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-700">
                <th className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500/30 w-[80px] sticky left-0 z-30 bg-gradient-to-r from-blue-600 to-indigo-700">
                  IdPan / Adresse
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500/30 w-[100px]">
                  Type
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500/30 w-[100px]">
                  Dimension
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500/30 w-[80px]">
                  Nb Faces
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500/30 w-[70px]">
                  Face
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500/30 w-[100px]">
                  Sens
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500/30 w-[140px]">
                  Société Locatrice
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500/30 w-[180px]">
                  Date début - fin
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500/30 w-[100px]">
                  Nb Rés. Fut.
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase tracking-wider w-[100px]">
                  Statut
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredPanneaux.map((panneau: Panneau) => {
                const faces = panneau.faces || [];
                const reservations = panneau.reservations || [];

                if (faces.length === 0) {
                  return (
                    <tr key={`${panneau.id}-empty`} className="hover:bg-blue-50/50 transition-colors border-b border-gray-200">
                      <td className="px-3 py-3 text-sm font-bold text-blue-600 border-r border-gray-200 sticky left-0 z-10 bg-white">
                        <div>
                          <div>{panneau.idPan || 'N/A'}</div>
                          <div className="text-[10px] font-normal text-gray-500 mt-0.5">{panneau.adresse || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 border-r border-gray-200">{panneau.type || 'N/A'}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 border-r border-gray-200">{panneau.dimension || 'N/A'}</td>
                      <td className="px-3 py-3 text-center text-sm font-bold text-blue-600 border-r border-gray-200">0</td>
                      <td className="px-3 py-3 text-xs text-gray-400 border-r border-gray-200 text-center" colSpan={6}>Aucune face</td>
                    </tr>
                  );
                }

                return faces.map((face: Face, idx: number) => {
                  // ✅ Récupérer les données de réservation pour cette face
                  const faceId = face.id || `F${idx + 1}`;

                  // ✅ Les fonctions prennent maintenant face directement
                  const activeReservation = getReservationActive(face);
                  const futureReservations = getReservationsFutures(face);
                  const status = getFaceStatus(face);

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

                  const uniqueKey = `${panneau.id}-face-${idx}-${faceId}`;
                  const isFirstFace = idx === 0;

                  return (
                    <tr key={uniqueKey} className="hover:bg-blue-50/50 transition-colors border-b border-gray-200">
                      {/* IdPan + Adresse - Fusion sur la première face */}
                      <td className={`px-3 py-3 border-r border-gray-200 sticky left-0 z-10 bg-white ${isFirstFace ? '' : 'text-center text-gray-300'}`}>
                        {isFirstFace ? (
                          <div>
                            <div className="text-sm font-bold text-blue-600">{panneau.idPan || 'N/A'}</div>
                            <div className="text-[10px] font-normal text-gray-500 mt-0.5 truncate max-w-[150px]">{panneau.adresse || 'N/A'}</div>
                          </div>
                        ) : ''}
                      </td>

                      <td className={`px-3 py-3 text-xs font-medium border-r border-gray-200 ${isFirstFace ? 'text-gray-700' : 'text-center text-gray-300'}`}>
                        {isFirstFace ? (panneau.type || 'N/A') : ''}
                      </td>

                      <td className={`px-3 py-3 text-xs border-r border-gray-200 ${isFirstFace ? 'text-gray-600' : 'text-center text-gray-300'}`}>
                        {isFirstFace ? (panneau.dimension || 'N/A') : ''}
                      </td>

                      <td className={`px-3 py-3 text-center text-sm font-bold border-r border-gray-200 ${isFirstFace ? 'text-blue-600' : 'text-center text-gray-300'}`}>
                        {isFirstFace ? faces.length : ''}
                      </td>

                      {/* Face ID */}
                      <td className="px-3 py-3 text-sm font-bold text-indigo-600 border-r border-gray-200">
                        {faceId}
                      </td>

                      {/* Sens */}
                      <td className="px-3 py-3 text-xs text-gray-700 border-r border-gray-200">
                        {face.sens || 'N/A'}
                      </td>

                      {/* ✅ Société Locatrice - Depuis la réservation active */}
                      <td className="px-3 py-3 text-xs text-gray-600 border-r border-gray-200">
                        {activeReservation?.societeLocatrice || 'S/N'}
                      </td>

                      {/* ✅ Date début - fin - Depuis la réservation active */}
                      <td className="px-3 py-3 text-xs text-gray-500 border-r border-gray-200">
                        {activeReservation?.dateDebut && activeReservation?.dateFin ? (
                          <span>{activeReservation.dateDebut} – {activeReservation.dateFin}</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* ✅ Nb Réservations Futures */}
                      <td className="px-3 py-3 text-center text-sm font-bold text-amber-600 border-r border-gray-200">
                        {futureReservations.length || 0}
                      </td>

                      {/* ✅ Statut - Calculé dynamiquement */}
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(status)} flex items-center gap-1.5 justify-center whitespace-nowrap`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(status)}`} />
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>

        {/* Pied de tableau */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span>📊 {filteredPanneaux.length} panneau(x)</span>
            <span className="hidden xs:inline">•</span>
            <span>🎯 {stats.totalFaces} face(s)</span>
            <span className="hidden xs:inline">•</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {stats.totalLibres} libres
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {stats.totalOccupes} occupées
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {stats.totalReserves} réservées
              </span>
            </div>
          </div>
          <div className="text-[10px] text-gray-400 flex items-center gap-2">
            <RefreshCw
              className="w-3 h-3 cursor-pointer hover:text-blue-500 transition"
              onClick={loadData}
            />
            {lastUpdate && (
              <span className="hidden sm:inline">
                Mis à jour: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <span className="text-[8px] sm:hidden">
              ← Glissez →
            </span>
          </div>
        </div>
      </div>
    );
  };


  // ============================================
  // RENDU PRINCIPAL
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER - VERSION ULTRA RESPONSIVE */}
<header className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-2xl sticky top-0 z-50 border-b border-white/10">
  <div className="w-full px-2 xs:px-3 sm:px-4 md:px-6 py-1.5 xs:py-2 sm:py-2.5 md:py-3">
    <div className="flex items-center justify-between gap-1 xs:gap-2 sm:gap-3 md:gap-4">
      
      {/* ==================== PARTIE GAUCHE ==================== */}
      <div className="flex items-center gap-1 xs:gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
        
        {/* Bouton Retour - Masqué sur très petit écran */}
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="hidden xs:flex p-1.5 xs:p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 text-white flex-shrink-0 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 group"
          aria-label="Retour au tableau de bord"
        >
          <Home className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 group-hover:rotate-[-10deg] transition-transform" />
        </button>

        {/* LOGO + TITRE */}
        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 flex-shrink-0 min-w-0">
          
          {/* Logo - Taille variable selon écran */}
          <div className="relative w-6 h-6 xs:w-7 xs:h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 flex-shrink-0">
            <div className="absolute inset-0 rounded-lg xs:rounded-xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-white/20 shadow-lg shadow-blue-500/20" />
            
            <img
              src="/icon-192x192.png"
              alt="Dispromalt Logo"
              className="relative w-full h-full object-contain p-0.5 xs:p-1 rounded-lg xs:rounded-xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = parent.querySelector('.logo-fallback');
                  if (fallback) fallback.classList.remove('hidden');
                }
              }}
            />
            
            <div className="logo-fallback absolute inset-0 flex items-center justify-center text-white font-bold text-[8px] xs:text-[10px] sm:text-xs md:text-sm hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg xs:rounded-xl">
              D
            </div>
            
            {/* Point d'activité - Plus petit sur mobile */}
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 xs:w-2 xs:h-2 sm:w-2.5 sm:h-2.5 bg-emerald-400 rounded-full animate-pulse ring-1 xs:ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-400/30" />
          </div>
          
          {/* Titre - Version adaptative */}
          <div className="min-w-0">
            <h1 className="text-[10px] xs:text-xs sm:text-sm md:text-lg lg:text-xl font-bold text-white truncate flex items-center gap-1 xs:gap-1.5 sm:gap-2">
              {/* Nom de la société - Toujours visible */}
              <span className="bg-gradient-to-r from-amber-200 to-yellow-300 bg-clip-text text-transparent whitespace-nowrap">
                Dispromalt
              </span>
              
              {/* Séparateur - Caché sur mobile */}
              <span className="text-white/30 font-light hidden xs:inline">|</span>
              
              {/* Sous-titre - Caché sur mobile */}
              <span className="text-white/80 hidden xs:inline text-[8px] xs:text-[10px] sm:text-xs md:text-sm font-medium whitespace-nowrap">
                Rapport Panneaux
              </span>
            </h1>
            
            {/* Statistiques - Cachées sur très petit écran */}
            <div className="hidden xs:flex items-center gap-1 sm:gap-2 text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] text-blue-200">
              <span className="flex items-center gap-0.5 sm:gap-1">
                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden 2xs:inline">{panneaux.length}</span>
                <span className="2xs:hidden">{panneaux.length}</span>
              </span>
              <span className="text-white/30 hidden xs:inline">•</span>
              <span className="flex items-center gap-0.5 sm:gap-1 hidden xs:inline">
                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-400" />
                {stats.totalFaces} faces
              </span>
              <span className="text-white/30 hidden sm:inline">•</span>
              <span className="hidden sm:inline text-blue-300/60 text-[6px] xs:text-[7px]">
                {lastUpdate ? new Date(lastUpdate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== PARTIE DROITE ==================== */}
      <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
        
        {/* Rafraîchir - Icône uniquement sur mobile */}
        <button
          onClick={loadData}
          className="p-1.5 xs:p-2 sm:px-2.5 sm:py-1.5 bg-white/10 hover:bg-white/20 rounded-lg xs:rounded-xl text-white text-[8px] xs:text-[10px] sm:text-xs md:text-sm font-medium transition-all duration-300 flex items-center justify-center hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 hover:border-white/30 min-w-[28px] xs:min-w-[32px] sm:min-w-[36px]"
          disabled={loading}
          aria-label="Rafraîchir"
        >
          <RefreshCw className={`w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline ml-1">Rafraîchir</span>
        </button>

        {/* Séparateur - Caché sur mobile */}
        <div className="w-px h-4 xs:h-5 sm:h-6 bg-white/20 hidden xs:block" />

        {/* PDF - Icône uniquement sur mobile */}
        <button
          onClick={exportPDF}
          className="p-1.5 xs:p-2 sm:px-2.5 sm:py-1.5 bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 rounded-lg xs:rounded-xl text-white text-[8px] xs:text-[10px] sm:text-xs md:text-sm font-medium transition-all duration-300 flex items-center justify-center border border-red-500/30 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/20 hover:scale-105 min-w-[28px] xs:min-w-[32px] sm:min-w-[36px]"
          aria-label="Exporter en PDF"
        >
          <FileText className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-red-400" />
          <span className="hidden sm:inline ml-1 text-white/90">PDF</span>
        </button>

        {/* Excel - Icône uniquement sur mobile */}
        <button
          onClick={exportExcel}
          className="p-1.5 xs:p-2 sm:px-2.5 sm:py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-600/20 hover:from-green-500/30 hover:to-emerald-600/30 rounded-lg xs:rounded-xl text-white text-[8px] xs:text-[10px] sm:text-xs md:text-sm font-medium transition-all duration-300 flex items-center justify-center border border-green-500/30 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20 hover:scale-105 min-w-[28px] xs:min-w-[32px] sm:min-w-[36px]"
          aria-label="Exporter en Excel"
        >
          <FileSpreadsheet className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-green-400" />
          <span className="hidden sm:inline ml-1 text-white/90">Excel</span>
        </button>

        {/* Imprimer - Caché sur très petit écran */}
        <button
          onClick={() => window.print()}
          className="hidden xs:flex p-1.5 xs:p-2 sm:px-2.5 sm:py-1.5 bg-white/10 hover:bg-white/20 rounded-lg xs:rounded-xl text-white text-[8px] xs:text-[10px] sm:text-xs md:text-sm font-medium transition-all duration-300 items-center justify-center border border-white/10 hover:border-white/30 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-105 min-w-[28px] xs:min-w-[32px] sm:min-w-[36px]"
          aria-label="Imprimer"
        >
          <Printer className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline ml-1 text-white/90">Imprimer</span>
        </button>
      </div>
    </div>
  </div>

  {/* Barre de progression animée */}
  <div className="h-0.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
  </div>
</header>
      <div className="max-w-full px-3 sm:px-4 py-3 sm:py-6">
        {/* STATISTIQUES */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <StatCard
            label="Panneaux"
            value={stats.totalPanneaux}
            icon={<LayoutGrid />}
            color="blue"
            loading={loading}
          />
          <StatCard
            label="Faces"
            value={stats.totalFaces}
            icon={<Layers />}
            color="indigo"
            loading={loading}
          />
          <StatCard
            label="Libres"
            value={stats.totalLibres}
            icon={<CheckCircle2 />}
            color="emerald"
            loading={loading}
          />
          <StatCard
            label="Occupées"
            value={stats.totalOccupes}
            icon={<Activity />}
            color="blue"
            loading={loading}
          />
          <StatCard
            label="Réservées"
            value={stats.totalReserves}
            icon={<Clock />}
            color="amber"
            loading={loading}
          />
          <StatCard
            label="Rés. Futures"
            value={stats.totalReservationsFutures}
            icon={<Calendar />}
            color="purple"
            loading={loading}
          />
        </div>

        {/* FILTRES */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-4 sm:mb-6 overflow-hidden">
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700">
              <Filter className="w-4 h-4 text-blue-500" />
              <span className="hidden xs:inline">Filtres Avancés</span>
              <span className="inline xs:hidden">Filtres</span>
              <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px] sm:text-xs">
                {filteredPanneaux.length}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-gray-400 hidden sm:inline">
                {filtersExpanded ? 'Masquer' : 'Afficher'}
              </span>
              {filtersExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </button>

          <AnimatePresence>
            {filtersExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-3 sm:p-4 border-t border-gray-100 space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {/* PAYS */}
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Pays</label>
                      <select
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
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
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Province</label>
                      <select
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
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
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">District</label>
                      <select
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
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
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Commune</label>
                      <select
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                        value={geoFilter.commune}
                        onChange={(e) => setGeoFilter({ ...geoFilter, commune: e.target.value })}
                        disabled={geoFilter.district === 'Tous' || geoFilter.province === 'Tous' || geoFilter.pays === 'Tous' || !GEOGRAPHIE}
                      >
                        <option value="Tous">📍 Toutes</option>
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

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {/* STATUT */}
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</label>
                      <select
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="Tous">📋 Tous</option>
                        <option value="Libre">🟢 Libre</option>
                        <option value="Occupé">🔵 Occupé</option>
                        <option value="Réservé">🟡 Réservé</option>
                      </select>
                    </div>

                    {/* ✅ TYPE DE PANNEAU - Dynamique depuis db.js */}
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Type de panneau</label>
                      <select
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
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
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Début</label>
                      <input
                        type="date"
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                        value={dateFilter.startDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                      />
                    </div>

                    {/* DATE FIN */}
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Fin</label>
                      <input
                        type="date"
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                        value={dateFilter.endDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* RECHERCHE - Texte en noir */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="🔍 Rechercher par ID ou adresse..."
                        className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder-gray-400"
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
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-50 text-red-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-100 transition-all border border-red-200 whitespace-nowrap"
                    >
                      <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                      Réinitialiser
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* TABLEAU PRINCIPAL */}
        {renderTableauPanneaux()}

        {/* FOOTER */}
        <div className="mt-4 sm:mt-6 text-center text-[10px] sm:text-xs text-gray-400 border-t border-gray-100 pt-3 sm:pt-4">
          <p>© 2026 - Rapport généré le {currentDate || 'Chargement...'}</p>
          <p className="mt-0.5 text-[8px] sm:text-[10px]">
            Panneaux: {stats.totalPanneaux} | Faces: {stats.totalFaces} | Réservations Futures: {stats.totalReservationsFutures}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RapportPanneaux;