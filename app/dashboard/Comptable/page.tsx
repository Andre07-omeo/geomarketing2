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
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // ✅ AJOUTER CET IMPORT


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
  // RÉCUPÉRATION DES FACTURES
  // ============================================
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "factures"), (snap) => {
      setFactures(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        dateFormatted: d.data().createdAt?.seconds ? new Date(d.data().createdAt.seconds * 1000).toLocaleDateString() : 'N/A'
      })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ============================================
  // AUTHENTIFICATION
  // ============================================
  // ✅ Utilisation du contexte AuthContext
  const { user: authUser, loading: authLoading } = useAuth();

  // ✅ Transformation des données utilisateur
  const currentUser = useMemo(() => {
    if (!authUser) return null;
    return {
      name: authUser.nomComplet || authUser.nom || authUser.displayName || authUser.email?.split('@')[0] || "Agent",
      email: authUser.email,
      uid: authUser.uid || authUser.id,
      logoUrl: authUser.photoURL || LOGO_DISPROMALT
    };
  }, [authUser]);
  // ============================================
  // DÉCONNEXION
  // ============================================
  const handleLogout = async () => {
    if (!confirm("Voulez-vous vraiment vous déconnecter ?")) return;
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  // ============================================
  // VALIDATION DE FACTURE
  // ============================================
  const handleValidation = async (f: any) => {
    if (!currentUser) {
      alert("Erreur d'authentification. Veuillez vous reconnecter.");
      return;
    }

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
        valideParNom: currentUser.name || "Anonyme",
        valideParEmail: currentUser.email || "Non renseigné",
        statutPaiement: isDone ? "Payé" : "Acompte",
        valideParUID: currentUser?.uid || "UID_INCONNU",
      });

      await batch.commit();
      alert(`✅ Transaction enregistrée avec succès !`);
    } catch (e) {
      console.error(e);
      alert("❌ Erreur technique lors de la mise à jour");
    }
  };

  // ============================================
  // LOGIQUE DE FILTRAGE - CORRIGÉE
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

  if (authLoading || loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-blue-600 text-xs font-bold uppercase tracking-wider">Chargement...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============================================ */}
      {/* HEADER - BLEU ROI PROFOND */}
      {/* ============================================ */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-900 shadow-lg border-b border-white/10">
        <div className="max-w-[1700px] mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <BarChart3 size={18} className="text-amber-400" />
            </div>
            <div>
              <h1 className="font-black text-base md:text-lg text-white tracking-tight">Ledger<span className="text-amber-400">Pro</span></h1>
              <p className="text-[6px] font-bold tracking-[0.3em] text-blue-200 uppercase">Secure Finance</p>
            </div>
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
                {/* ✅ AJOUT DU NOM COMPLET */}
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

        {/* ============================================ */}
        {/* FILTRES */}
        {/* ============================================ */}
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
                <div className="p-4 border-t border-gray-100 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date début</label>
                      <input
                        type="date"
                        className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                        value={dateFilter.startDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date fin</label>
                      <input
                        type="date"
                        className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                        value={dateFilter.endDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Statut</label>
                      <select
                        className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="Tous">Tous</option>
                        <option value="Validée">Validée</option>
                        <option value="Acompte">Acompte</option>
                        <option value="En attente">En attente</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Province</label>
                      <select
                        className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                        value={provinceFilter}
                        onChange={(e) => setProvinceFilter(e.target.value)}
                      >
                        <option value="Tous">Toutes</option>
                        {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Commune</label>
                      <select
                        className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                        value={communeFilter}
                        onChange={(e) => setCommuneFilter(e.target.value)}
                        disabled={provinceFilter === 'Tous'}
                      >
                        <option value="Tous">Toutes</option>
                        {communes.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 flex items-end">
                      <button
                        onClick={() => {
                          setDateFilter({ startDate: '', endDate: '' });
                          setStatusFilter('Tous');
                          setProvinceFilter('Tous');
                          setCommuneFilter('Tous');
                          setSearch('');
                        }}
                        className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition border border-red-200"
                      >
                        <XCircle size={14} className="inline mr-1" />
                        Réinitialiser
                      </button>
                    </div>
                  </div>
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
                        {isComplet ? 'Validée' : isPartial ? 'Acompte' : 'Attente'}
                      </span>
                      <span className="text-[7px] text-gray-400 font-mono">{f.factureIdFormat}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-800 truncate">{f.clientNom || 'Sans Nom'}</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">${Number(f.totalHT).toLocaleString()}</p>
                    {f.montantPaye > 0 && (
                      <p className="text-[7px] text-emerald-600">Payé: ${f.montantPaye.toLocaleString()}</p>
                    )}
                    {reste > 0 && (
                      <p className="text-[7px] text-amber-600">Reste: ${reste.toLocaleString()}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-gray-400">
                      <MapPin size={10} />
                      <p className="text-[7px] truncate">{f.province || 'N/A'} • {f.commune || 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 mt-0.5">
                      <Calendar size={9} />
                      <p className="text-[6px]">{f.dateFormatted}</p>
                    </div>
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
          <div className="space-y-3">
            {filtered.map((f) => {
              const reste = Number(f.totalHT) - (Number(f.montantPaye) || 0);
              const isComplet = reste <= 0;
              const isPartial = !isComplet && (Number(f.montantPaye) || 0) > 0;

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
                          <h3 className="text-sm font-bold text-gray-800 truncate">{f.clientNom || 'Sans Nom'}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] font-mono text-blue-600">{f.factureIdFormat}</span>
                            <span className="text-[7px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{f.nombreFaces || 0} faces</span>
                          </div>
                        </div>
                      </div>

                      {/* Localisation & Date */}
                      <div className="flex flex-wrap items-center gap-3 md:w-[25%]">
                        <div className="flex items-center gap-1 text-gray-500">
                          <MapPin size={12} className="text-gray-400" />
                          <p className="text-[9px] font-medium truncate">{f.province || 'N/A'} • {f.commune || 'N/A'}</p>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <Calendar size={11} />
                          <p className="text-[8px]">{f.dateFormatted}</p>
                        </div>
                      </div>

                      {/* Montant */}
                      <div className="flex flex-col md:w-[20%]">
                        <p className="text-sm md:text-base font-bold text-gray-800">${Number(f.totalHT).toLocaleString()}</p>
                        {f.montantPaye > 0 && (
                          <p className="text-[8px] text-emerald-600 font-medium">Payé: ${f.montantPaye.toLocaleString()}</p>
                        )}
                        {reste > 0 && (
                          <p className="text-[8px] text-amber-600 font-medium">Reste: ${reste.toLocaleString()}</p>
                        )}
                      </div>

                      {/* Statut & Action */}
                      <div className="flex items-center gap-3 md:w-[25%] md:justify-end">
                        <span className={`text-[7px] font-bold px-2.5 py-1 rounded-full border uppercase ${isComplet ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                            isPartial ? 'border-amber-200 bg-amber-50 text-amber-700' :
                              'border-gray-200 bg-gray-50 text-gray-600'
                          }`}>
                          {isComplet ? 'Validée' : isPartial ? 'Acompte' : 'En attente'}
                        </span>

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