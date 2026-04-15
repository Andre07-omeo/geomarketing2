"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Download, Search, Calendar,
  Tag, CreditCard, RefreshCcw,
  Clock, TrendingUp, PieChart, ArrowDownCircle, ArrowUpCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

// --- CONFIGURATION FIREBASE ---
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, query, orderBy } from "firebase/firestore";


import {
  Monitor, XCircle // <--- AJOUTE CES DEUX-LÀ
} from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
  authDomain: "kin-geo-market.firebaseapp.com",
  projectId: "kin-geo-market",
  storageBucket: "kin-geo-market.firebasestorage.app",
  messagingSenderId: "50335362445",
  appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- CONFIGURATION THÈME ---
const THEME = {
  blue: "#1e3a8a",
  gold: "#f59e0b",
  red: "#dc2626",
  white: "#ffffff",
  glass: "bg-white/5 backdrop-blur-xl border border-blue-400/20"
};

export default function AdvancedAccountingSystem() {// --- CONFIGURATION ET STATES DU COMPOSANT PARENT ---

  const [activeTab, setActiveTab] = useState<'Audit' | 'Factures' | 'Paiements' | 'Rapports'>('Audit');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // États pour le tiroir (Drawer)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [societes, setSocietes] = useState<any[]>([]);
  const [operationType, setOperationType] = useState('');

  // 1. UNIQUE LOGIQUE POUR LES TRANSACTIONS
  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. UNIQUE LOGIQUE POUR LES SOCIÉTÉS (Indispensable pour CashInDrawer)
  // Dans ton fichier principal (AdvancedAccountingSystem.tsx)
  useEffect(() => {
    // 1. On cible la collection "societes"
    const colRef = collection(db, "societes");

    // 2. On écoute en temps réel
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const listeRecuperee = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // LOG DE DEBUG : Ouvre ta console (F12) pour voir si ça s'affiche ici
      console.log("SOCIETES DANS LE PARENT :", listeRecuperee);

      setSocietes(listeRecuperee);
    }, (error) => {
      console.error("Erreur Firestore :", error);
    });

    return () => unsubscribe();
  }, []);




  // Gestionnaire d'actions
  const handleAction = (type: string) => {
    setOperationType(type);
    if (type === 'cash_in') {
      setIsDrawerOpen(true);
    }
  };

  // 3. RENDER MODULE CORRIGÉ (Sécurisé)
  const renderModule = () => {
    if (loading) {
      return (
        <div className="p-20 text-center animate-pulse text-[#f59e0b] uppercase font-black tracking-widest">
          Initialisation BI Hub...
        </div>
      );
    }

    // On s'assure que les composants existent avant de les appeler
    switch (activeTab) {
      case 'Factures':
        return typeof FacturesModule !== 'undefined' ? <FacturesModule data={transactions} /> : null;
      case 'Paiements':
        return typeof PaiementsModule !== 'undefined' ? <PaiementsModule data={transactions} /> : null;
      case 'Rapports':
        return typeof RapportsModule !== 'undefined' ? <RapportsModule data={transactions} /> : null;
      case 'Audit':
      default:
        return typeof AuditModule !== 'undefined' ? <AuditModule data={transactions} /> : null;
    }
  };

  return (
    <div className="min-h-screen bg-[#1e3a8a] text-white p-4 md:p-8 lg:p-12 font-sans selection:bg-amber-500 overflow-x-hidden">

      {/* 1. HEADER DYNAMIQUE */}
      <header className={`${THEME.glass} p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] mb-6 md:mb-8 shadow-2xl`}>
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter">
              BI <span className="text-[#f59e0b]">Accounting</span>
            </h1>
            <p className="text-[9px] md:text-[10px] opacity-50 font-bold uppercase tracking-[0.3em]">
              Kin-Geo-Market • Andre Omeonga • 2026
            </p>
          </div>

          {/* ACTIONS RAPIDES */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 w-full xl:w-auto">
            <ActionButton
              icon={ArrowDownCircle}
              label="Entrée Cash"
              color="bg-green-600 text-white"
              onClick={() => handleAction('cash_in')}
            />

            <div className="hidden sm:block w-[2px] h-10 bg-white/10 mx-2 self-center"></div>

            <ActionButton
              icon={ArrowUpCircle}
              label="Sortie Cash"
              color="bg-red-600 text-white"
              onClick={() => handleAction('cash_out')}
            />
          </div>
        </div>

        {/* NAVIGATION */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-white/10 pt-6">
          <nav className="flex overflow-x-auto no-scrollbar gap-2 md:gap-4 w-full md:w-auto">
            {['Audit', 'Factures', 'Paiements', 'Rapports'].map((tab: any) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap px-6 md:px-8 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-[#1e3a8a] shadow-lg scale-105' : 'bg-white/5 hover:bg-white/10'
                  }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex gap-2 w-full md:w-auto">
            <ExportButton icon={FileText} label="PDF" color="bg-red-600/20 text-red-500 border border-red-500/30" className="flex-1" />
            <ExportButton icon={Download} label="Excel" color="bg-green-600/20 text-green-500 border border-green-500/30" className="flex-1" />
          </div>
        </div>
      </header>

      {/* 2. CONTENU PRINCIPAL ET TIROIR */}
      <main className="w-full max-w-[1600px] mx-auto">
        {renderModule()}

        {/* Le tiroir reçoit les sociétés et la base de données */}
        <CashInDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          societes={societes} // <--- CETTE LIGNE EST CRUCIALE
          db={db}
        />
      </main>
    </div>
  );
}






















import { addDoc, serverTimestamp } from "firebase/firestore";

function CashInDrawer({ isOpen, onClose, societes, db }: any) {
  const [selectedSocieteId, setSelectedSocieteId] = useState("");
  const [numPanneaux, setNumPanneaux] = useState(1);
  const [panneauxDetails, setPanneauxDetails] = useState([{ id_panneau: "", montant: 0 }]);
  const [nbMois, setNbMois] = useState(1);
  const [tvaActive, setTvaActive] = useState(true); // Nouvelle fonctionnalité : TVA
  const [isSaving, setIsSaving] = useState(false);

  const currentSociete = useMemo(() =>
    societes.find((s: any) => s.id === selectedSocieteId),
    [selectedSocieteId, societes]);

  // --- LOGIQUE DE CALCUL SÉCURISÉE ---
  const calculs = useMemo(() => {
    const sousTotal = panneauxDetails.reduce((acc, curr) => acc + (Number(curr.montant) || 0), 0);
    const baseMensuelle = sousTotal * (Number(nbMois) || 1);
    const tva = tvaActive ? baseMensuelle * 0.16 : 0; // 16% de TVA (RDC)
    const totalFinal = baseMensuelle + tva;

    return { baseMensuelle, tva, totalFinal };
  }, [panneauxDetails, nbMois, tvaActive]);

  const handleAddPanneau = (val: number) => {
    const count = Math.max(1, val);
    setNumPanneaux(count);
    const newArr = Array.from({ length: count }, (_, i) =>
      panneauxDetails[i] || { id_panneau: "", montant: 0 }
    );
    setPanneauxDetails(newArr);
  };

  const submitTransaction = async () => {
    if (!selectedSocieteId) return alert("Sélectionnez une société");

    setIsSaving(true);
    try {
      await addDoc(collection(db, "transactions"), {
        type: "ENTRÉE",
        client_nom: currentSociete?.nom || "Inconnu",
        societe_id: selectedSocieteId,
        details_panneaux: panneauxDetails,
        duree_mois: nbMois,
        montant_ht: calculs.baseMensuelle,
        montant_tva: calculs.tva,
        total_usd: calculs.totalFinal,
        devise: "USD",
        valide_par: "Andre Omeonga", // Signature automatique
        date: serverTimestamp(),
        status: "Validé"
      });

      alert("Transaction comptabilisée avec succès !");
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed right-0 top-0 h-full w-full max-w-md bg-[#1e3a8a] border-l border-white/10 shadow-2xl z-[101] p-8 overflow-y-auto custom-scrollbar">

            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black italic uppercase text-[#f59e0b]">Nouveau Revenu</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white"><X size={24} /></button>
            </div>

            <div className="space-y-6">
              {/* SÉLECTEUR SOCIÉTÉ */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40 italic text-white">
                  Partenaire
                </label>

                <select
                  value={selectedSocieteId}
                  onChange={(e) => setSelectedSocieteId(e.target.value)}
                  className="w-full bg-white/10 border border-white/10 p-4 rounded-2xl text-white font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-white">
                    -- Choisir --
                  </option>

                  {/* Sécurisation : on vérifie que societes existe et est un tableau */}
                  {Array.isArray(societes) && societes.length > 0 ? (
                    societes.map((s: any) => (
                      <option
                        key={s.id}
                        value={s.id}
                        className="bg-[#1e3a8a] text-white"
                      >
                        {s.nom}
                      </option>
                    ))
                  ) : (
                    <option disabled className="bg-slate-900 text-white/50">
                      Chargement des partenaires...
                    </option>
                  )}
                </select>

                {/* Optionnel : Petit indicateur si aucune société n'est trouvée */}
                {(!societes || societes.length === 0) && (
                  <p className="text-[9px] text-amber-500/60 font-medium">
                    Aucune donnée partenaire disponible.
                  </p>
                )}
              </div>

              {/* DURÉE ET OPTIONS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-40 text-white">Mois</label>
                  <input type="number" min="1" value={nbMois} onChange={(e) => setNbMois(parseInt(e.target.value) || 1)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-amber-500" />
                </div>
                <div className="flex items-end pb-2">
                  <button
                    onClick={() => setTvaActive(!tvaActive)}
                    className={`w-full py-4 rounded-2xl text-[10px] font-black transition-all border ${tvaActive ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-white/5 border-white/10 text-white/40'}`}
                  >
                    {tvaActive ? "TVA 16% INCLUSE" : "SANS TVA"}
                  </button>
                </div>
              </div>

              {/* LISTE DES PANNEAUX */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Détails Supports</p>
                  <input type="number" min="1" max="10" value={numPanneaux} onChange={(e) => handleAddPanneau(parseInt(e.target.value) || 1)} className="w-16 bg-white/10 border-none rounded-lg p-1 text-center text-xs text-amber-500 font-bold" />
                </div>

                {panneauxDetails.map((p, index) => (
                  <div key={index} className="grid grid-cols-2 gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 group-hover:border-amber-500/30 transition-all">
                    <input
                      type="text" placeholder="ID Panneau"
                      value={p.id_panneau}
                      onChange={(e) => {
                        const newP = [...panneauxDetails];
                        newP[index].id_panneau = e.target.value.toUpperCase();
                        setPanneauxDetails(newP);
                      }}
                      className="bg-transparent border-b border-white/10 text-xs text-white p-2 outline-none focus:border-amber-500"
                    />
                    <input
                      type="number" placeholder="Montant/Mois"
                      onChange={(e) => {
                        const newP = [...panneauxDetails];
                        newP[index].montant = Number(e.target.value);
                        setPanneauxDetails(newP);
                      }}
                      className="bg-transparent border-b border-white/10 text-right font-black text-amber-500 outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* RÉSUMÉ FINANCIER BI */}
              <div className="mt-8 p-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2rem] text-[#1e3a8a] shadow-xl">
                <div className="flex justify-between text-[9px] font-black uppercase opacity-60 mb-1">
                  <span>Sous-total HT</span>
                  <span>{calculs.baseMensuelle.toLocaleString()} $</span>
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase opacity-60 mb-3 pb-3 border-b border-black/10">
                  <span>TVA (16%)</span>
                  <span>{calculs.tva.toLocaleString()} $</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase">Total à Encaisser</span>
                  <span className="text-3xl font-black italic">{calculs.totalFinal.toLocaleString()} $</span>
                </div>
              </div>

              <button
                onClick={submitTransaction}
                disabled={isSaving || !selectedSocieteId || calculs.totalFinal <= 0}
                className="w-full bg-white text-[#1e3a8a] py-5 rounded-2xl font-black uppercase hover:bg-amber-500 hover:text-white transition-all disabled:opacity-20 shadow-2xl"
              >
                {isSaving ? "Synchronisation..." : "Confirmer l'encaissement"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}











// --- NOUVEAU SOUS-COMPOSANT : ACTION BUTTON ---
function ActionButton({ icon: Icon, label, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`${color} px-5 py-3 rounded-xl flex items-center justify-center gap-3 text-[9px] font-black uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-xl flex-1 sm:flex-none`}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}




import {
  Users, AlertTriangle, Send, MapPin,
  Layers, CheckCircle,
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  Pie, Cell,
} from 'recharts';

// ==========================================
// 1. DONNÉES DE RÉFÉRENCE (PRÉDÉFINIES)
// ==========================================

const RAW_AUDIT_DATA = [
  { type: "ENTRÉE", client_nom: "VODACOM", nombre_panneaux: 12, total_usd: 15000 },
  { type: "ENTRÉE", client_nom: "AIRTEL", nombre_panneaux: 8, total_usd: 9600 },
  { type: "ENTRÉE", client_nom: "ORANGE", nombre_panneaux: 15, total_usd: 18000 },
  { type: "ENTRÉE", client_nom: "BRACINGO", nombre_panneaux: 5, total_usd: 5000 },
  { type: "ENTRÉE", client_nom: "CANAL+", nombre_panneaux: 10, total_usd: 12000 },
];

const REVENUE_CHART_DATA = [
  { month: 'Jan', val: 4000 },
  { month: 'Fév', val: 7500 },
  { month: 'Mar', val: 5000 },
  { month: 'Avr', val: 9000 },
  { month: 'Mai', val: 12000 },
  { month: 'Juin', val: 15000 },
];

const AUDIT_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

// ==========================================
// 2. COMPOSANT PRINCIPAL
// ==========================================

function AuditModule({
  data = RAW_AUDIT_DATA,
  THEME,
  chartData = REVENUE_CHART_DATA
}: any) {

  // --- LOGIQUE BI : TRAITEMENT SÉCURISÉ ---
  const auditAnalytics = useMemo(() => {
    if (!data) return { marketLeader: { nom: "N/A" }, occupancyTotal: 0, clientList: [] };
    const clientMap: any = {};
    const districtStats: any = { "Gombe": 0, "Limete": 0, "Ngaliema": 0, "Ndjili": 0 };

    const supportTypes = [
      { name: 'Bâche', value: 45 },
      { name: 'Vinyle', value: 30 },
      { name: 'Trivision', value: 25 }
    ];

    if (!data || !Array.isArray(data)) {
      return {
        clientList: [],
        marketLeader: { nom: "N/A", faces: 0 },
        geoMetrics: [],
        mediaMetrics: supportTypes,
        occupancyTotal: 0
      };
    }

    data.forEach((entry: any) => {
      if (entry.type === "ENTRÉE") {
        const name = entry.client_nom || "Inconnu";
        if (!clientMap[name]) {
          clientMap[name] = {
            nom: name,
            faces: 0,
            revenue: 0,
            daysLeft: Math.floor(Math.random() * 40) + 5
          };
        }
        const count = Number(entry.nombre_panneaux) || 0;
        clientMap[name].faces += count;
        clientMap[name].revenue += Number(entry.total_usd) || 0;

        // Répartition par district (Simulation)
        if (name.length % 2 === 0) districtStats["Gombe"] += count;
        else districtStats["Limete"] += count;
      }
    });

    const sortedList = Object.values(clientMap).sort((a: any, b: any) => b.faces - a.faces);

    return {
      clientList: sortedList,
      marketLeader: sortedList[0] || { nom: "N/A", faces: 0 },
      geoMetrics: Object.entries(districtStats).map(([name, value]) => ({ name, value })),
      mediaMetrics: supportTypes,
      occupancyTotal: sortedList.reduce((acc, curr: any) => acc + curr.faces, 0)
    };
  }, [data]);

  // --- ACTIONS ---
  const handleAlert = (name: string) => {
    alert(`ALERTE : Notification envoyée à ${name} pour renouvellement.`);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-8 pb-24">

      {/* SECTION 1: INDICATEURS CLÉS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-white">
        <div className={`${THEME?.glass || 'bg-white/10'} p-6 rounded-[2rem] border border-white/5`}>
          <p className="text-[10px] font-black opacity-40 uppercase mb-2">Leader Actuel</p>


          <div className="text-xl font-black">
  {auditAnalytics?.mediaMetrics?.map((item, idx) => (
    <div key={idx} className="flex items-center gap-2">
       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AUDIT_COLORS[idx % AUDIT_COLORS.length] }} />
       <span className="text-sm">{item.name}</span>
    </div>
  ))}
</div>
        </div>

        <div className={`${THEME?.glass || 'bg-white/10'} p-6 rounded-[2rem] border border-white/5`}>
          <p className="text-[10px] font-black opacity-40 uppercase mb-2">Occupation Réseau</p>
          <p className="text-xl font-black text-white">
            {typeof auditAnalytics?.occupancyTotal === 'number'
              ? ((auditAnalytics.occupancyTotal / 203) * 100).toFixed(1)
              : "0.0"}%
          </p>
        </div>

        <div className={`${THEME?.glass || 'bg-white/10'} p-6 rounded-[2rem] border border-white/5`}>
          <p className="text-[10px] font-black opacity-40 uppercase mb-2">Contrats à Risque</p>
          <p className="text-xl font-black text-red-500 flex items-center gap-2">
            <AlertTriangle size={18} /> Urgent
          </p>
        </div>

        <button className="bg-amber-500 rounded-[2rem] p-6 flex flex-col items-center justify-center hover:brightness-110 transition-all group shadow-lg shadow-amber-500/20">
          <Send className="text-[#1e3a8a] mb-1" size={20} />
          <span className="text-[10px] font-black uppercase text-[#1e3a8a]">Relancer Ventes</span>
        </button>
      </div>

      {/* SECTION 2: GRAPHIQUES DE PERFORMANCE */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Graphique Radar Districts */}
        <div className={`${THEME?.glass || 'bg-white/10'} p-8 rounded-[2.5rem]`}>
          <h3 className="text-[10px] font-black uppercase mb-6 opacity-40 text-white tracking-tighter">Répartition Districts</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={auditAnalytics.geoMetrics}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="name" tick={{ fill: 'white', fontSize: 10 }} />
                <Radar dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique Flux Financier */}
        <div className={`${THEME?.glass || 'bg-white/10'} p-8 rounded-[2.5rem] lg:col-span-2`}>
          <h3 className="text-[10px] font-black uppercase mb-6 opacity-40 text-white tracking-tighter">Flux Financier (Mensuel)</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="auditGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ background: '#1e3a8a', border: 'none', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="val" stroke="#f59e0b" fill="url(#auditGrad)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 3: TYPES DE MEDIA (PIE) */}
      <div className={`${THEME?.glass || 'bg-white/10'} p-8 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-2 items-center`}>
        <div>
          <h3 className="text-[10px] font-black uppercase mb-6 opacity-40 text-white">Inventaire par Type de Support</h3>
          {/* REMPLACE LE <p> PAR UNE <div> ICI */}
          <div className="space-y-4">
            {auditAnalytics?.mediaMetrics?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: AUDIT_COLORS[idx % AUDIT_COLORS.length] }}
                />
                <span className="text-white text-[10px] font-bold uppercase">
                  {item.name} — {item.value}%
                </span>
              </div>
            ))}
          </div>s
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={auditAnalytics?.mediaMetrics || []} innerRadius={60} outerRadius={80} dataKey="value">
                {auditAnalytics?.mediaMetrics?.map((_: any, i: number) => (
                  <Cell key={i} fill={AUDIT_COLORS[i % AUDIT_COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 4: TABLEAU DE GESTION */}
      <div className={`${THEME?.glass || 'bg-white/10'} rounded-[2.5rem] overflow-hidden`}>
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h3 className="text-[11px] font-black uppercase text-white tracking-widest flex items-center gap-2">
            {/* Vérifiez bien que CheckCircle est importé de 'lucide-react' */}
            <CheckCircle className="text-green-500" size={16} />
            Locations Actives
          </h3>

          <span className="text-[10px] font-bold px-4 py-2 bg-amber-500/20 text-amber-500 rounded-full border border-amber-500/20">
            FACES TOTALES
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-[9px] uppercase font-black text-white/40">
              <tr>
                <th className="p-6">Partenaire</th>
                <th className="p-6">Panneaux</th>
                <th className="p-6">Échéance</th>
                <th className="p-6">Volume CA</th>
                <th className="p-6 text-right">Gestion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white">
              {auditAnalytics.clientList.map((client: any, i: number) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="p-6 font-bold text-sm">{client.nom}</td>
                  <td className="p-6"><span className="text-amber-500 font-black">{client.faces} FACES</span></td>
                  <td className="p-6">
                    <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full ${client.daysLeft < 15 ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${(client.daysLeft / 45) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-[9px] font-bold opacity-40">{client.daysLeft} JOURS RESTANTS</span>
                  </td>
                  <td className="p-6 font-black">{client.revenue.toLocaleString()} $</td>
                  <td className="p-6 text-right">
                    <button
                      onClick={() => handleAlert(client.nom)}
                      className="bg-white/10 hover:bg-white hover:text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all"
                    >
                      Relancer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// --- MODULE 2: FACTURES (TABLEAU ULTRA-RESPONSIVE) ---
function FacturesModule({ data }: any) {
  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <StatMini label="Encours" val="142.000 $" icon={FileText} />
        <StatMini label="Retards" val="12.500 $" icon={Clock} color="text-red-500" />
        <StatMini label="KPI Recouvrement" val="94%" icon={TrendingUp} />
      </div>

      <div className={`${THEME.glass} rounded-[2rem] overflow-hidden`}>
        <div className="overflow-x-auto shadow-2xl">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-white/5 text-[9px] uppercase font-black tracking-widest text-blue-200/40">
              <tr><th className="p-6">Référence</th><th className="p-6">Entité</th><th className="p-6">Date</th><th className="p-6 text-right">Montant</th><th className="p-6 text-center">Statut</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((item: any) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-6 font-bold text-sm">FAC-{item.id.slice(0, 5)}</td>
                  <td className="p-6 text-xs uppercase opacity-70">Dispromalt RDC</td>
                  <td className="p-6 text-xs opacity-50">26/03/2026</td>
                  <td className="p-6 text-right font-black text-[#f59e0b] text-lg">{item.amount || '0'} $</td>
                  <td className="p-6 text-center">
                    <span className="bg-green-500/10 text-green-500 px-4 py-1.5 rounded-full text-[8px] font-black">VALIDÉ</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}




// --- MODULE 3: PAIEMENTS (TRACABILITÉ) ---
function PaiementsModule({ data }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className={`${THEME.glass} p-6 md:p-10 rounded-[2.5rem]`}>
        <h3 className="text-[11px] font-black uppercase mb-8 flex items-center gap-3"><ArrowDownCircle className="text-green-500" /> Journal d'Entrée</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border-l-4 border-green-500 group hover:bg-white/10 transition-all">
              <div className="space-y-1">
                <p className="font-black text-xs md:text-sm">Revenue Publicitaire Kinshasa</p>
                <p className="text-[9px] opacity-40 uppercase tracking-widest">Via Mobile Money • 14:20</p>
              </div>
              <p className="font-black text-green-400 text-lg md:text-xl">+ 850 $</p>
            </div>
          ))}
        </div>
      </div>
      <div className={`${THEME.glass} p-6 md:p-10 rounded-[2.5rem]`}>
        <h3 className="text-[11px] font-black uppercase mb-8 flex items-center gap-3"><ArrowUpCircle className="text-red-400" /> Sorties Opérationnelles</h3>
        <div className="space-y-4 text-center py-20 opacity-20 italic text-sm">
          Trassage des flux en attente de synchronisation...
        </div>
      </div>
    </div>
  );
}




// --- MODULE 4: RAPPORTS (DEEP BI) ---
function RapportsModule({ data }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className={`${THEME.glass} p-8 rounded-[2.5rem] lg:col-span-2`}>
        <h3 className="text-xs font-black uppercase mb-8 opacity-40 italic">Croissance Mensuelle Analytique</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockBI}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" hide />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1e3a8a', border: 'none' }} />
              <Line type="stepAfter" dataKey="val" stroke={THEME.red} strokeWidth={4} dot={{ r: 6, fill: THEME.red }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className={`${THEME.glass} p-10 rounded-[2.5rem] bg-gradient-to-b from-white/5 to-red-900/20 flex flex-col justify-center items-center text-center`}>
        <PieChart size={30} className="text-[#f59e0b] mb-6" />
        <h2 className="text-5xl font-black italic tracking-tighter mb-2">64%</h2>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-8">Marge Opérationnelle</p>
        <button className="w-full bg-white text-[#1e3a8a] py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#f59e0b] hover:text-white transition-all shadow-2xl">
          Générer Rapport ONIP
        </button>
      </div>
    </div>
  );
}




// --- HELPERS (RESPONSIVE) ---
function StatMini({ label, val, icon: Icon, color = "text-[#f59e0b]" }: any) {
  return (
    <div className={`${THEME.glass} p-5 md:p-7 rounded-[2rem] flex items-center gap-4 hover:scale-[1.02] transition-transform`}>
      <div className="p-4 bg-white/5 rounded-2xl"><Icon size={24} className={color} /></div>
      <div className="overflow-hidden">
        <p className="text-[8px] md:text-[9px] font-black uppercase opacity-40 tracking-widest truncate">{label}</p>
        <p className="text-lg md:text-2xl font-black italic truncate">{val}</p>
      </div>
    </div>
  );
}




function FilterSelect({ icon: Icon, label, options }: any) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[8px] font-black uppercase opacity-30 flex items-center gap-2"><Icon size={12} /> {label}</label>
      <select className="bg-white/10 border border-white/5 rounded-xl p-3.5 text-[10px] font-bold outline-none cursor-pointer focus:border-[#f59e0b]/50 transition-colors">
        {options.map((opt: string) => <option key={opt} value={opt} className="bg-[#1e3a8a]">{opt}</option>)}
      </select>
    </div>
  );
}



function FilterInput({ icon: Icon, placeholder, type = "text" }: any) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[8px] font-black uppercase opacity-30 flex items-center gap-2"><Icon size={12} /> {placeholder}</label>
      <input type={type} placeholder={placeholder} className="bg-white/10 border border-white/5 rounded-xl p-3.5 text-[10px] font-bold outline-none focus:border-[#f59e0b]/50 transition-colors placeholder:opacity-20 w-full" />
    </div>
  );
}

function ExportButton({ icon: Icon, label, color, className = "" }: any) {
  return (
    <button className={`${color} ${className} px-6 py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg`}>
      <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// Structure correcte pour Recharts ou tes graphiques BI
const mockBI = [
  { name: 'Semaine 1', val: 4000 },
  { name: 'Semaine 2', val: 9500 },
  { name: 'Semaine 3', val: 6200 },
  { name: 'Semaine 4', val: 12800 },
];