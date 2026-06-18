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

  // Obtenir la réservation active d'une face (celle qui contient la date du jour)
  const getReservationActive = (faceId: string, reservations: Reservation[]): Reservation | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = reservations.find((res: Reservation) => {
      if (!res.dateDebut || !res.dateFin) return false;

      const resFaceId = res.faceId || res.face || res.id;
      if (resFaceId && resFaceId !== faceId) return false;

      const dateDebut = new Date(res.dateDebut);
      const dateFin = new Date(res.dateFin);
      dateDebut.setHours(0, 0, 0, 0);
      dateFin.setHours(0, 0, 0, 0);

      return today >= dateDebut && today <= dateFin;
    });

    return active || null;
  };

  // Obtenir les réservations futures d'une face
  const getReservationsFutures = (faceId: string, reservations: Reservation[]): Reservation[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return reservations.filter((res: Reservation) => {
      if (!res.dateDebut) return false;

      const resFaceId = res.faceId || res.face || res.id;
      if (resFaceId && resFaceId !== faceId) return false;

      const dateDebut = new Date(res.dateDebut);
      dateDebut.setHours(0, 0, 0, 0);
      return dateDebut > today;
    });
  };

  // Déterminer le statut d'une face
  const getFaceStatus = (faceId: string, reservations: Reservation[]): string => {
    const active = getReservationActive(faceId, reservations);
    if (active) return active.statut || 'Occupé';

    const futures = getReservationsFutures(faceId, reservations);
    if (futures.length > 0) return 'Réservé';

    return 'Libre';
  };






  // ============================================
  // LOGIQUE DE FILTRAGE
  // ============================================
  const filteredPanneaux: Panneau[] = useMemo(() => {
    if (!panneaux.length) return [];

    return panneaux.filter((panneau: Panneau) => {
      const adresseParts = (panneau.adresse || '').split('/').map((s: string) => s.trim());
      const pays = adresseParts[0] || '';
      const province = adresseParts[1] || '';
      const district = adresseParts[2] || '';
      const commune = adresseParts[3] || '';

      if (geoFilter.pays !== 'Tous' && !pays.includes(geoFilter.pays)) return false;
      if (geoFilter.province !== 'Tous' && !province.includes(geoFilter.province)) return false;
      if (geoFilter.district !== 'Tous' && !district.includes(geoFilter.district)) return false;
      if (geoFilter.commune !== 'Tous' && !commune.includes(geoFilter.commune)) return false;

      if (searchFilter) {
        const searchLower = searchFilter.toLowerCase();
        const matchId = (panneau.idPan || '').toLowerCase().includes(searchLower);
        const matchAdresse = (panneau.adresse || '').toLowerCase().includes(searchLower);
        if (!matchId && !matchAdresse) return false;
      }

      if (statusFilter !== 'Tous') {
        const hasMatchingFace = (panneau.faces || []).some((face: Face) =>
          face.statut === statusFilter
        );
        if (!hasMatchingFace) return false;
      }

      if (agentFilter !== 'Tous') {
        const hasAgentReservation = (panneau.reservations || []).some((res: Reservation) =>
          res.agentNom === agentFilter
        );
        if (!hasAgentReservation) return false;
      }

      if (dateFilter.startDate || dateFilter.endDate) {
        const hasMatchingEcheance = (panneau.faces || []).some((face: Face) => {
          if (!face.dateFin) return false;
          if (dateFilter.startDate && face.dateFin < dateFilter.startDate) return false;
          if (dateFilter.endDate && face.dateFin > dateFilter.endDate) return false;
          return true;
        });
        if (!hasMatchingEcheance) return false;
      }

      return true;
    });
  }, [panneaux, geoFilter, searchFilter, statusFilter, agentFilter, dateFilter]);

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
      const reservations = panneau.reservations || [];

      faces.forEach((face: Face) => {
        totalFaces++;
        const faceId = face.id || `F${faces.indexOf(face) + 1}`;
        const status = getFaceStatus(faceId, reservations);
        const futures = getReservationsFutures(faceId, reservations);

        totalReservationsFutures += futures.length;

        if (status === 'Libre') totalLibres++;
        else if (status === 'Occupé') totalOccupes++;
        else if (status === 'Réservé') totalReserves++;
      });

      (panneau.reservations || []).forEach((res: Reservation) => {
        if (res.montant) {
          totalRevenue += parseFloat(String(res.montant)) || 0;
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
  const exportPDF = (): void => {
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');

      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text('Rapport des Panneaux Publicitaires', 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Date: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total Panneaux: ${stats.totalPanneaux} | Total Faces: ${stats.totalFaces}`, 14, 36);
      doc.text(`Libres: ${stats.totalLibres} | Occupées: ${stats.totalOccupes} | Réservées: ${stats.totalReserves}`, 14, 42);

      const tableData = filteredPanneaux.flatMap((panneau: Panneau) => {
        const faces = panneau.faces || [];
        if (faces.length === 0) {
          return [[
            panneau.idPan || 'N/A',
            (panneau.adresse || 'N/A').substring(0, 30),
            panneau.type || 'N/A',
            panneau.dimension || 'N/A',
            'Aucune face',
            '-',
            '-',
            '-',
            '-',
            '-'
          ]];
        }
        return faces.map((face: Face) => [
          panneau.idPan || 'N/A',
          (panneau.adresse || 'N/A').substring(0, 30),
          panneau.type || 'N/A',
          panneau.dimension || 'N/A',
          face.id || 'N/A',
          face.sens || 'N/A',
          face.societeLocatrice || 'N/A',
          face.statut || 'N/A',
          face.dateFin || 'N/A',
          face.reservationsFutures || 0
        ]);
      });

      if (tableData.length > 0) {
        autoTable(doc, {
          head: [['ID', 'Adresse', 'Type', 'Dim.', 'Face', 'Sens', 'Société', 'Statut', 'Échéance', 'Rés. Fut.']],
          body: tableData,
          startY: 48,
          styles: { fontSize: 6 },
          headStyles: { fillColor: [37, 99, 235] }
        });
      }

      doc.save(`rapport_panneaux_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Erreur export PDF:', err);
      alert('Erreur lors de l\'export PDF');
    }
  };

  const exportExcel = (): void => {
    try {
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
            'Prochaine Réservation': 'N/A'
          }];
        }
        return faces.map((face: Face) => ({
          'ID Panneau': panneau.idPan || 'N/A',
          'Adresse': panneau.adresse || 'N/A',
          'Type': panneau.type || 'N/A',
          'Dimension': panneau.dimension || 'N/A',
          'Face': face.id || 'N/A',
          'Sens': face.sens || 'N/A',
          'Société Locatrice': face.societeLocatrice || 'N/A',
          'Statut': face.statut || 'N/A',
          'Date Début': face.dateDebut || 'N/A',
          'Date Fin': face.dateFin || 'N/A',
          'Réservations Futures': face.reservationsFutures || 0,
          'Prochaine Réservation': face.prochaineReservation || 'N/A'
        }));
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Panneaux');
      XLSX.writeFile(wb, `rapport_panneaux_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Erreur export Excel:', err);
      alert('Erreur lors de l\'export Excel');
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
                  const activeReservation = getReservationActive(faceId, reservations);
                  const futureReservations = getReservationsFutures(faceId, reservations);
                  const status = getFaceStatus(faceId, reservations);

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
      {/* HEADER */}
      <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-lg sticky top-0 z-50">
        <div className="max-w-full px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white flex-shrink-0"
              >
                <Home className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-xl font-bold text-white truncate">📊 Rapport des Panneaux</h1>
                <p className="text-[10px] sm:text-xs text-blue-200 truncate">
                  {panneaux.length} panneaux • {stats.totalFaces} faces
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={loadData}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-[10px] sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-1.5"
                disabled={loading}
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">Rafraîchir</span>
              </button>
              <button
                onClick={exportPDF}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-[10px] sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">PDF</span>
              </button>
              <button
                onClick={exportExcel}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-[10px] sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Excel</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-[10px] sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Imprimer</span>
              </button>
            </div>
          </div>
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
                  // ✅ Version corrigée pour les filtres
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {/* PAYS */}
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Pays</label>
                      <select
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</label>
                      <select
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="Tous">📋 Tous</option>
                        <option value="Libre">🟢 Libre</option>
                        <option value="Occupé">🔵 Occupé</option>
                        <option value="Réservé">🟡 Réservé</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</label>
                      <select
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={agentFilter}
                        onChange={(e) => setAgentFilter(e.target.value)}
                      >
                        <option value="Tous">👤 Tous</option>
                        {agents.map((a: Agent) => <option key={a.id} value={a.nom}>{a.nom}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Début</label>
                      <input
                        type="date"
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={dateFilter.startDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Fin</label>
                      <input
                        type="date"
                        className="w-full mt-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={dateFilter.endDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="🔍 Rechercher par ID ou adresse..."
                        className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                        setAgentFilter('Tous');
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