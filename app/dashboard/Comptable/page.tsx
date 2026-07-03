'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, CheckCircle2, Clock, ArrowUpRight,
  MapPin, ShieldCheck, LogOut, User,
  ArrowDownLeft, BarChart3, Layers,
  Calendar, Building2, Tag, Info, Menu, X,
  Home, LayoutDashboard, TrendingUp, Wallet, CreditCard, FileText,
  Filter, ChevronDown, ChevronUp, XCircle, Grid3x3, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONFIG FIREBASE ---
import { getDocs, query, where, writeBatch } from "firebase/firestore";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, updateDoc, Timestamp } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from 'next/navigation';

// ============================================
// IMPORT DE LA CONFIGURATION
// ============================================
const config = require('../../../config/db');

const firebaseConfig = config.firebaseConfig;
const GEOGRAPHIE = config.GEOGRAPHIE;
const LOGO_DISPROMALT = config.LOGO_DISPROMALT;

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const AccountingMaster = () => {
  const router = useRouter();
  const [factures, setFactures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ============================================
  // ÉTATS DES FILTRES
  // ============================================
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [provinceFilter, setProvinceFilter] = useState('Tous');
  const [communeFilter, setCommuneFilter] = useState('Tous');

  // ============================================
  // ✅ AUTHENTIFICATION UNIQUEMENT LOCALSTORAGE
  // ============================================
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);




  // ============================================
  // ÉTATS DES FILTRES GÉOGRAPHIQUES
  // ============================================
  const [countryFilter, setCountryFilter] = useState('Tous');
  const [cityFilter, setCityFilter] = useState('Tous');
  const [districtFilter, setDistrictFilter] = useState('Tous');
  const [tronconFilter, setTronconFilter] = useState('Tous');

  // ✅ Chargement des données utilisateur depuis localStorage
  const loadUserFromLocalStorage = () => {
    try {
      // Essayer plusieurs clés possibles
      const keys = ['geomarketing_user_data', 'user_data', 'auth_user'];
      for (const key of keys) {
        const rawData = localStorage.getItem(key);
        if (rawData) {
          const parsedData = JSON.parse(rawData);
          // Vérifier que les données sont valides
          if (parsedData && (parsedData.email || parsedData.uid || parsedData.id)) {
            return parsedData;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Erreur lors du chargement des données locales:', error);
      return null;
    }
  };

  // ✅ Vérification de l'authentification au chargement
  useEffect(() => {
    const userData = loadUserFromLocalStorage();
    if (userData) {
      setCurrentUser({
        name: userData.nom || userData.nomComplet || userData.displayName || userData.fullName || userData.email?.split('@')[0] || "Agent",
        email: userData.email || "Non renseigné",
        uid: userData.uid || userData.id || "UID_INCONNU",
        logoUrl: userData.logoUrl || userData.photoURL || LOGO_DISPROMALT,
        // Conserver toutes les données originales
        ...userData
      });
      setAuthChecked(true);
    } else {
      // Pas d'utilisateur dans localStorage
      setCurrentUser(null);
      setAuthChecked(true);
      // Rediriger vers login
      router.push('/auth/login');
    }
  }, []);

  // ✅ Fonction pour vérifier l'authentification avant une action
  const checkAuth = () => {
    const userData = loadUserFromLocalStorage();
    if (!userData) {
      alert("⚠️ Session expirée. Veuillez vous reconnecter.");
      router.push('/auth/login');
      return false;
    }

    // Mettre à jour currentUser si les données ont changé
    if (!currentUser || currentUser.uid !== (userData.uid || userData.id)) {
      setCurrentUser({
        name: userData.nom || userData.nomComplet || userData.displayName || userData.fullName || userData.email?.split('@')[0] || "Agent",
        email: userData.email || "Non renseigné",
        uid: userData.uid || userData.id || "UID_INCONNU",
        logoUrl: userData.logoUrl || userData.photoURL || LOGO_DISPROMALT,
        ...userData
      });
    }
    return true;
  };

  // ============================================
  // RÉCUPÉRATION DES FACTURES
  // ============================================
  useEffect(() => {
    // Ne charger les factures que si authentifié
    if (!authChecked || !currentUser) return;

    const unsub = onSnapshot(collection(db, "factures"), (snap) => {
      setFactures(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        dateFormatted: d.data().createdAt?.seconds ? new Date(d.data().createdAt.seconds * 1000).toLocaleDateString() : 'N/A'
      })));
      setLoading(false);
    }, (error) => {
      console.error("Erreur Firestore:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [authChecked, currentUser]);

  // ============================================
  // DÉCONNEXION
  // ============================================
  const handleLogout = async () => {
    if (!confirm("Voulez-vous vraiment vous déconnecter ?")) return;
    try {
      // Déconnexion Firebase
      await signOut(auth);
      // Nettoyer localStorage et sessionStorage (uniquement les clés spécifiques)
      const keysToRemove = ['geomarketing_user_data', 'user_data', 'auth_user', 'user_session'];
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      // Rediriger vers la page de login
      router.push('/');
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      // En cas d'erreur, forcer la redirection
      const keysToRemove = ['geomarketing_user_data', 'user_data', 'auth_user', 'user_session'];
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      router.push('/');
    }
  };

  // ============================================
  // VALIDATION DE FACTURE
  // ============================================
  const handleValidation = async (f: any) => {
    // ✅ Vérifier l'authentification avant l'action
    if (!checkAuth()) return;

    // ✅ Recharger les données utilisateur fraîches
    const freshUserData = loadUserFromLocalStorage();
    if (!freshUserData) {
      alert("⚠️ Session expirée. Veuillez vous reconnecter.");
      router.push('/auth/login');
      return;
    }

    const userInfo = {
      name: freshUserData.nom || freshUserData.nomComplet || freshUserData.displayName || freshUserData.fullName || freshUserData.email?.split('@')[0] || "Agent",
      email: freshUserData.email || "Non renseigné",
      uid: freshUserData.uid || freshUserData.id || "UID_INCONNU"
    };

    const du = Number(f.totalHT) - (Number(f.montantPaye) || 0);
    const mnt = prompt(`ENCAISSEMENT : ${f.clientNom}\nSomme due : $${du}`, du.toString());

    if (!mnt || isNaN(Number(mnt))) return;

    const v = Number(mnt);
    const nCumul = (Number(f.montantPaye) || 0) + v;
    const isDone = nCumul >= Number(f.totalHT);

    try {
      const batch = writeBatch(db);
      const docRef = doc(db, "factures", f.id);

      batch.update(docRef, {
        validationComptable: isDone,
        montantPaye: nCumul,
        statut: isDone ? "Validée" : "Acompte",
        dateValidation: Timestamp.now(),
        derniereTransaction: v,
        valideParNom: userInfo.name,
        valideParEmail: userInfo.email,
        statutPaiement: isDone ? "Payé" : "Acompte",
        valideParUID: userInfo.uid,
      });

      await batch.commit();
      alert(`✅ Transaction enregistrée avec succès !`);
    } catch (e) {
      console.error(e);
      alert("❌ Erreur technique lors de la mise à jour");
    }
  };

  // ============================================
  // LOGIQUE DE FILTRAGE
  // ============================================
  const filtered = useMemo(() => {
    return factures.filter(f => {
      // ✅ Recherche
      const searchMatch = f.clientNom?.toLowerCase().includes(search.toLowerCase()) ||
        f.factureIdFormat?.toLowerCase().includes(search.toLowerCase());

      // ✅ Filtre date
      let dateMatch = true;
      if (dateFilter.startDate && f.createdAt?.seconds) {
        const factureDate = new Date(f.createdAt.seconds * 1000);
        const startDate = new Date(dateFilter.startDate);
        startDate.setHours(0, 0, 0, 0);
        if (factureDate < startDate) dateMatch = false;
      }
      if (dateFilter.endDate && f.createdAt?.seconds) {
        const factureDate = new Date(f.createdAt.seconds * 1000);
        const endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (factureDate > endDate) dateMatch = false;
      }

      // ✅ Filtre statut
      let statusMatch = true;
      if (statusFilter !== 'Tous') {
        if (statusFilter === 'Validée') statusMatch = f.validationComptable === true;
        else if (statusFilter === 'En attente') statusMatch = f.validationComptable === false && (Number(f.montantPaye) || 0) === 0;
        else if (statusFilter === 'Acompte') statusMatch = f.validationComptable === false && (Number(f.montantPaye) || 0) > 0;
      }

      // ✅ Filtre province
      let provinceMatch = true;
      if (provinceFilter !== 'Tous') {
        provinceMatch = f.province === provinceFilter;
      }

      // ✅ Filtre commune
      let communeMatch = true;
      if (communeFilter !== 'Tous') {
        communeMatch = f.commune === communeFilter;
      }

      return searchMatch && dateMatch && statusMatch && provinceMatch && communeMatch;
    }).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [factures, search, dateFilter, statusFilter, provinceFilter, communeFilter]);

  // ============================================
  // STATISTIQUES
  // ============================================
  const stats = useMemo(() => {
    const totalValidees = filtered.filter(f => f.validationComptable);
    const totalEnAttente = filtered.filter(f => !f.validationComptable && (Number(f.montantPaye) || 0) === 0);
    const totalAcompte = filtered.filter(f => !f.validationComptable && (Number(f.montantPaye) || 0) > 0);
    const recettesValidees = totalValidees.reduce((acc, f) => acc + (Number(f.montantPaye) || 0), 0);
    const aRecouvrer = filtered.filter(f => !f.validationComptable).reduce((acc, f) => acc + (Number(f.totalHT) - (Number(f.montantPaye) || 0)), 0);
    const volumeTotal = filtered.reduce((acc, f) => acc + Number(f.totalHT || 0), 0);
    return {
      totalValidees: totalValidees.length,
      totalEnAttente: totalEnAttente.length,
      totalAcompte: totalAcompte.length,
      recettesValidees,
      aRecouvrer,
      volumeTotal,
      totalFactures: filtered.length
    };
  }, [filtered]);

  // ============================================
  // PROVINCES UNIQUES
  // ============================================
  const provinces = useMemo(() => {
    const p = new Set<string>();
    factures.forEach(f => {
      if (f.province) p.add(f.province);
    });
    return Array.from(p).sort();
  }, [factures]);

  const communes = useMemo(() => {
    const c = new Set<string>();
    factures.forEach(f => {
      if (f.commune) c.add(f.commune);
    });
    return Array.from(c).sort();
  }, [factures]);

  // ✅ AFFICHAGE DU CHARGEMENT
  if (!authChecked || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-blue-600 text-xs font-bold uppercase tracking-wider">Chargement...</p>
        </div>
      </div>
    );
  }

  // ✅ REDIRECTION SI NON AUTHENTIFIÉ
  if (!currentUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-200">
            <ShieldCheck size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-black text-gray-800 mb-2">Session expirée</h2>
          <p className="text-sm text-gray-500 mb-6">Veuillez vous reconnecter pour accéder à cette page.</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg"
          >
            Se reconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============================================ */}
      {/* HEADER - BLEU ROI PROFOND */}
      {/* ============================================ */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-900 shadow-lg border-b border-white/10">
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
          ><div
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


          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
              <input
                type="text"
                placeholder="Rechercher par client ou référence..."
                className="w-full bg-white/10 border border-white/20 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-amber-400 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Bouton vue grille/liste */}
            <div className="hidden sm:flex gap-1 bg-white/10 p-1 rounded-lg border border-white/20">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-white text-blue-800' : 'text-white/60 hover:text-white'}`}
              >
                <Grid3x3 size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-white text-blue-800' : 'text-white/60 hover:text-white'}`}
              >
                <List size={16} />
              </button>
            </div>

            <button
              className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl border border-white/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[8px] text-white/80 font-bold uppercase tracking-wider">Online</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
                  <span className="text-white text-[10px] font-bold">
                    {currentUser?.name?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                {/* ✅ AFFICHAGE DU NOM COMPLET */}
                <div className="hidden sm:block">
                  <p className="text-[10px] font-bold text-white truncate max-w-[80px]">
                    {currentUser?.name || 'Admin'}
                  </p>
                  <p className="text-[6px] text-blue-200 truncate max-w-[80px]">
                    {currentUser?.email || ''}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
                  title="Déconnexion"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Mobile */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-blue-900/95 border-t border-white/10 px-4 py-3 space-y-3"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-amber-400 transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${viewMode === 'grid' ? 'bg-white text-blue-800' : 'bg-white/10 text-white'}`}
                >
                  Grille
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${viewMode === 'list' ? 'bg-white text-blue-800' : 'bg-white/10 text-white'}`}
                >
                  Liste
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ============================================ */}
      {/* MAIN CONTENT */}
      {/* ============================================ */}
      <main className="max-w-[1700px] mx-auto p-4 md:p-6">

        // ============================================
        // FILTRES AVEC TRONÇONS (FACES)
        // ============================================
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm mb-6 overflow-hidden">
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Filter size={16} className="text-blue-600" />
              Filtres avancés
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px]">
                {stats.totalFactures} résultats
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 hidden sm:inline">
                {filtersExpanded ? 'Masquer' : 'Afficher'}
              </span>
              {filtersExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
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
                <div className="p-4 md:p-6 border-t border-gray-100 space-y-4">
                  {/* Ligne 1: Date, Statut, Pays */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Calendar size={12} />
                        Date début
                      </label>
                      <input
                        type="date"
                        className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 transition-all"
                        value={dateFilter.startDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Calendar size={12} />
                        Date fin
                      </label>
                      <input
                        type="date"
                        className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 transition-all"
                        value={dateFilter.endDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Statut
                      </label>
                      <select
                        className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 transition-all"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="Tous">📋 Tous</option>
                        <option value="Validée">✅ Validée</option>
                        <option value="Acompte">💰 Acompte</option>
                        <option value="En attente">⏳ En attente</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <MapPin size={12} />
                        Pays
                      </label>
                      <select
                        className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 transition-all"
                        value={countryFilter}
                        onChange={(e) => {
                          setCountryFilter(e.target.value);
                          setCityFilter('Tous');
                          setDistrictFilter('Tous');
                          setTronconFilter('Tous');
                        }}
                      >
                        <option value="Tous">🌍 Tous</option>
                        {Object.keys(GEOGRAPHIE).map(pays => (
                          <option key={pays} value={pays}>{pays}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Ligne 2: Ville, District, Tronçon */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Building2 size={12} />
                        Ville
                      </label>
                      <select
                        className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 transition-all"
                        value={cityFilter}
                        onChange={(e) => {
                          setCityFilter(e.target.value);
                          setDistrictFilter('Tous');
                          setTronconFilter('Tous');
                        }}
                        disabled={countryFilter === 'Tous'}
                      >
                        <option value="Tous">🏙️ Toutes</option>
                        {countryFilter !== 'Tous' && GEOGRAPHIE[countryFilter] &&
                          Object.keys(GEOGRAPHIE[countryFilter]).map(ville => (
                            <option key={ville} value={ville}>{ville}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Layers size={12} />
                        District
                      </label>
                      <select
                        className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 transition-all"
                        value={districtFilter}
                        onChange={(e) => {
                          setDistrictFilter(e.target.value);
                          setTronconFilter('Tous');
                        }}
                        disabled={countryFilter === 'Tous' || cityFilter === 'Tous'}
                      >
                        <option value="Tous">📂 Tous</option>
                        {countryFilter !== 'Tous' && cityFilter !== 'Tous' &&
                          GEOGRAPHIE[countryFilter]?.[cityFilter] &&
                          Object.keys(GEOGRAPHIE[countryFilter][cityFilter]).map(district => (
                            <option key={district} value={district}>{district}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Tag size={12} />
                        Tronçon / Face
                      </label>
                      <select
                        className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 transition-all"
                        value={tronconFilter}
                        onChange={(e) => setTronconFilter(e.target.value)}
                        disabled={countryFilter === 'Tous' || cityFilter === 'Tous' || districtFilter === 'Tous'}
                      >
                        <option value="Tous">🪧 Tous</option>
                        {countryFilter !== 'Tous' && cityFilter !== 'Tous' && districtFilter !== 'Tous' &&
                          GEOGRAPHIE[countryFilter]?.[cityFilter]?.[districtFilter] &&
                          GEOGRAPHIE[countryFilter][cityFilter][districtFilter].map((troncon: string) => (
                            <option key={troncon} value={troncon}>{troncon}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      {/* Nombre de filtres actifs */}
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-1 mt-1">
                          {countryFilter !== 'Tous' && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[8px] font-medium">
                              {countryFilter}
                              <button
                                onClick={() => setCountryFilter('Tous')}
                                className="ml-1 hover:text-blue-900"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          )}
                          {cityFilter !== 'Tous' && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[8px] font-medium">
                              {cityFilter}
                              <button
                                onClick={() => setCityFilter('Tous')}
                                className="ml-1 hover:text-indigo-900"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          )}
                          {districtFilter !== 'Tous' && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[8px] font-medium">
                              {districtFilter}
                              <button
                                onClick={() => setDistrictFilter('Tous')}
                                className="ml-1 hover:text-purple-900"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          )}
                          {tronconFilter !== 'Tous' && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[8px] font-medium">
                              {tronconFilter.length > 20 ? tronconFilter.substring(0, 20) + '...' : tronconFilter}
                              <button
                                onClick={() => setTronconFilter('Tous')}
                                className="ml-1 hover:text-amber-900"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setDateFilter({ startDate: '', endDate: '' });
                          setStatusFilter('Tous');
                          setCountryFilter('Tous');
                          setCityFilter('Tous');
                          setDistrictFilter('Tous');
                          setTronconFilter('Tous');
                          setSearch('');
                        }}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition border border-red-200 whitespace-nowrap flex items-center gap-1"
                      >
                        <XCircle size={14} />
                        Réinitialiser
                      </button>
                    </div>
                  </div>

                  {/* Barre de recherche rapide */}
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
                    <div className="flex-1 relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher un client, une référence ou un tronçon..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400 whitespace-nowrap">
                      {stats.totalFactures} résultat{stats.totalFactures > 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Résumé des filtres actifs */}
                  {(statusFilter !== 'Tous' || dateFilter.startDate || dateFilter.endDate) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Filtres actifs :</span>
                      {dateFilter.startDate && (
                        <span className="text-[8px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                          Du {new Date(dateFilter.startDate).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {dateFilter.endDate && (
                        <span className="text-[8px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                          Au {new Date(dateFilter.endDate).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {statusFilter !== 'Tous' && (
                        <span className="text-[8px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                          Statut: {statusFilter}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ============================================ */}
        {/* STATISTIQUES - 4 colonnes PC, 2 mobile */}
        {/* ============================================ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Validées</p>
            </div>
            <p className="text-lg md:text-2xl font-black text-emerald-600">{stats.totalValidees}</p>
            <p className="text-[7px] text-gray-400">${stats.recettesValidees.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight size={14} className="text-amber-500" />
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Acomptes</p>
            </div>
            <p className="text-lg md:text-2xl font-black text-amber-600">{stats.totalAcompte}</p>
            <p className="text-[7px] text-gray-400">en cours de paiement</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-gray-500" />
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">En attente</p>
            </div>
            <p className="text-lg md:text-2xl font-black text-gray-600">{stats.totalEnAttente}</p>
            <p className="text-[7px] text-gray-400">${stats.aRecouvrer.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Layers size={14} className="text-blue-500" />
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Volume HT</p>
            </div>
            <p className="text-lg md:text-2xl font-black text-blue-600">${stats.volumeTotal.toLocaleString()}</p>
            <p className="text-[7px] text-gray-400">{stats.totalFactures} facture(s)</p>
          </div>
        </div>

        {/* ============================================ */}
        {/* AFFICHAGE - VUE GRILLE OU LISTE */}
        {/* ============================================ */}
        {viewMode === 'grid' ? (
          // === VUE GRILLE - 6 colonnes PC, 4 tablette, 2 mobile ===
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
            {filtered.map((f) => {
              const reste = Number(f.totalHT) - (Number(f.montantPaye) || 0);
              const isComplet = reste <= 0;
              const isPartial = !isComplet && (Number(f.montantPaye) || 0) > 0;

              // ✅ Extraire la localisation depuis l'adresse si province/commune sont vides
              const getLocation = (facture: any) => {
                // Si province et commune existent, les utiliser
                if (facture.province && facture.commune) {
                  return `${facture.province} • ${facture.commune}`;
                }

                // Sinon, essayer d'extraire de l'adresse
                if (facture.adresse) {
                  // Essayer de parser l'adresse: "RDC / KINSHASA / MONT-AMBA / TRONÇON BLVD LUMUMBA"
                  const parts = facture.adresse.split('/').map((p: string) => p.trim());
                  if (parts.length >= 3) {
                    // Prendre la ville et la commune
                    const ville = parts[1] || '';
                    const commune = parts[2] || '';
                    if (ville && commune) {
                      return `${ville} • ${commune}`;
                    }
                    if (ville) {
                      return ville;
                    }
                  }
                  // Si pas de parsing, prendre les 2 premiers mots significatifs
                  const words = facture.adresse.split(' ').filter((w: string) => w.length > 2);
                  if (words.length >= 2) {
                    return `${words[0]} ${words[1]}`;
                  }
                  return facture.adresse.substring(0, 20);
                }

                // Si rien n'est trouvé
                return 'Localisation non définie';
              };

              // ✅ Formater la date de création
              const formatDate = (timestamp: any) => {
                if (timestamp?.seconds) {
                  return new Date(timestamp.seconds * 1000).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });
                }
                return f.dateFormatted || 'N/A';
              };

              // ✅ Obtenir l'agent qui a validé
              const getAgentInfo = (facture: any) => {
                if (facture.valideParNom && facture.valideParNom !== 'N/A') {
                  return facture.valideParNom;
                }
                if (facture.agentNom) {
                  return facture.agentNom;
                }
                if (facture.commercialNom) {
                  return facture.commercialNom;
                }
                return 'En attente';
              };

              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="p-3 md:p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[6px] font-bold px-2 py-0.5 rounded-full uppercase ${isComplet ? 'bg-emerald-100 text-emerald-700' :
                        isPartial ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                        {isComplet ? '✅ Validée' : isPartial ? '💰 Acompte' : '⏳ Attente'}
                      </span>
                      <span className="text-[7px] text-gray-400 font-mono">{f.factureIdFormat || 'N/A'}</span>
                    </div>

                    {/* Nom du client */}
                    <p className="text-xs font-bold text-gray-800 truncate">{f.clientNom || 'Client inconnu'}</p>

                    {/* Montant */}
                    <p className="text-sm font-bold text-gray-900 mt-1">${Number(f.totalHT).toLocaleString()}</p>

                    {/* Paiement */}
                    {f.montantPaye > 0 && (
                      <p className="text-[7px] text-emerald-600">Payé: ${f.montantPaye.toLocaleString()}</p>
                    )}
                    {reste > 0 && (
                      <p className="text-[7px] text-amber-600">Reste: ${reste.toLocaleString()}</p>
                    )}

                    {/* ✅ Localisation améliorée */}
                    <div className="flex items-center gap-1 mt-1 text-gray-400">
                      <MapPin size={10} className="flex-shrink-0" />
                      <p className="text-[7px] truncate" title={getLocation(f)}>
                        {getLocation(f)}
                      </p>
                    </div>

                    {/* ✅ Agent qui a validé */}
                    <div className="flex items-center gap-1 mt-0.5 text-gray-400">
                      <User size={9} className="flex-shrink-0" />
                      <p className="text-[6px] truncate" title={f.valideParEmail || f.agentEmail || ''}>
                        {getAgentInfo(f)}
                        {f.valideParEmail && (
                          <span className="text-[5px] text-gray-300 ml-1">({f.valideParEmail})</span>
                        )}
                      </p>
                    </div>

                    {/* ✅ Date de création */}
                    <div className="flex items-center gap-1 text-gray-400 mt-0.5">
                      <Calendar size={9} className="flex-shrink-0" />
                      <p className="text-[6px]">
                        {formatDate(f.createdAt || f.dateCreation)}
                      </p>
                    </div>

                    {/* ✅ Date de validation si validée */}
                    {isComplet && f.dateValidation && (
                      <div className="flex items-center gap-1 text-emerald-500 mt-0.5">
                        <CheckCircle2 size={8} className="flex-shrink-0" />
                        <p className="text-[5px]">
                          Validée le {new Date(f.dateValidation.seconds * 1000).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}

                    {/* Bouton d'action */}
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      {!isComplet ? (
                        <button
                          onClick={() => handleValidation(f)}
                          className="w-full py-1.5 rounded-lg bg-blue-600 text-white text-[8px] font-bold hover:bg-blue-700 transition shadow-sm hover:shadow-md flex items-center justify-center gap-1"
                        >
                          <ArrowDownLeft size={12} />
                          Encaisser
                        </button>
                      ) : (
                        <div className="w-full py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[8px] font-bold flex items-center justify-center gap-1 border border-emerald-200">
                          <ShieldCheck size={12} />
                          Sécurisé
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          // === VUE LISTE - Lignes ===
          // === VUE LISTE - Lignes ===
          <div className="space-y-3">
            {filtered.map((f) => {
              const reste = Number(f.totalHT) - (Number(f.montantPaye) || 0);
              const isComplet = reste <= 0;
              const isPartial = !isComplet && (Number(f.montantPaye) || 0) > 0;

              // ✅ Extraire la localisation depuis l'adresse si province/commune sont vides
              const getLocation = (facture: any) => {
                if (facture.province && facture.commune) {
                  return `${facture.province} • ${facture.commune}`;
                }
                if (facture.adresse) {
                  const parts = facture.adresse.split('/').map((p: string) => p.trim());
                  if (parts.length >= 3) {
                    const ville = parts[1] || '';
                    const commune = parts[2] || '';
                    if (ville && commune) return `${ville} • ${commune}`;
                    if (ville) return ville;
                  }
                  return facture.adresse.substring(0, 30);
                }
                return '📍 Non définie';
              };

              // ✅ Formater la date
              const formatDate = (timestamp: any) => {
                if (timestamp?.seconds) {
                  return new Date(timestamp.seconds * 1000).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });
                }
                return f.dateFormatted || 'N/A';
              };

              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="p-4 md:p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Client & Référence */}
                      <div className="flex items-center gap-3 md:w-[25%]">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isComplet ? 'bg-emerald-100 text-emerald-600' :
                          isPartial ? 'bg-amber-100 text-amber-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                          <Building2 size={18} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-gray-800 truncate">{f.clientNom || 'Client inconnu'}</h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[8px] font-mono text-blue-600">{f.factureIdFormat || 'N/A'}</span>
                            <span className="text-[7px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                              {f.lignes?.length || 0} face(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ✅ Localisation & Agent */}
                      <div className="flex flex-wrap items-center gap-3 md:w-[30%]">
                        <div className="flex items-center gap-1 text-gray-500 min-w-[100px]">
                          <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                          <p className="text-[9px] font-medium truncate">{getLocation(f)}</p>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <User size={10} className="flex-shrink-0" />
                          <p className="text-[8px] truncate" title={f.valideParEmail || f.agentEmail || ''}>
                            {f.valideParNom || f.agentNom || 'En attente'}
                            {f.valideParEmail && (
                              <span className="text-[6px] text-gray-300 ml-1">({f.valideParEmail})</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Montant & Paiement */}
                      <div className="flex flex-col md:w-[20%]">
                        <p className="text-sm md:text-base font-bold text-gray-800">${Number(f.totalHT).toLocaleString()}</p>
                        {f.montantPaye > 0 && (
                          <p className="text-[8px] text-emerald-600 font-medium">Payé: ${f.montantPaye.toLocaleString()}</p>
                        )}
                        {reste > 0 && (
                          <p className="text-[8px] text-amber-600 font-medium">Reste: ${reste.toLocaleString()}</p>
                        )}
                      </div>

                      {/* Statut & Date */}
                      <div className="flex items-center gap-3 md:w-[25%] md:justify-end flex-wrap">
                        <span className={`text-[7px] font-bold px-2.5 py-1 rounded-full border uppercase ${isComplet ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                          isPartial ? 'border-amber-200 bg-amber-50 text-amber-700' :
                            'border-gray-200 bg-gray-50 text-gray-600'
                          }`}>
                          {isComplet ? '✅ Validée' : isPartial ? '💰 Acompte' : '⏳ Attente'}
                        </span>

                        {/* ✅ Date de création */}
                        <span className="text-[7px] text-gray-400 flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(f.createdAt || f.dateCreation)}
                        </span>

                        {/* Bouton d'action */}
                        {!isComplet ? (
                          <button
                            onClick={() => handleValidation(f)}
                            className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition shadow-md hover:shadow-lg"
                          >
                            <ArrowDownLeft size={16} />
                          </button>
                        ) : (
                          <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600">
                            <ShieldCheck size={16} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Message si aucun résultat */}
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-blue-200 mt-6">
            <FileText size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">Aucune facture trouvée</p>
            <p className="text-gray-400 text-xs">Ajustez vos critères de recherche</p>
          </div>
        )}
      </main>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="mt-8 px-4 md:px-6 py-4 border-t border-gray-200 bg-white">
        <div className="max-w-[1700px] mx-auto flex flex-wrap justify-between items-center gap-2 text-[7px] md:text-[8px] text-gray-400">
          <div className="flex items-center gap-4">
            <span className="font-medium">Kin-Geo-Market</span>
            <span className="text-gray-300">|</span>
            <span className="font-medium text-blue-600">Secure Session</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400">{filtered.length} facture(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-gray-500">Encrypted</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AccountingMaster;