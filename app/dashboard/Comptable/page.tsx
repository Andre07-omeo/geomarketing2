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
  const [numPanneaux, setNumPanneaux] = useState(1);
  // Correction : Chaque panneau a maintenant un identifiant (nom) et un montant
  const [panneauxDetails, setPanneauxDetails] = useState([{ id_panneau: "", montant: 0 }]);
  const [selectedSocieteId, setSelectedSocieteId] = useState("");
  const [nbMois, setNbMois] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const currentSociete = useMemo(() =>
    societes.find((s: any) => s.id === selectedSocieteId),
    [selectedSocieteId, societes]);

  const totalGeneral = useMemo(() => {
    const sommeBase = panneauxDetails.reduce((acc, curr) => acc + Number(curr.montant || 0), 0);
    return sommeBase * nbMois;
  }, [panneauxDetails, nbMois]);

  const handleAddPanneau = (val: number) => {
    const count = Math.max(1, val);
    setNumPanneaux(count);
    // On préserve les données existantes et on ajoute des lignes vides si nécessaire
    const newArr = Array.from({ length: count }, (_, i) =>
      panneauxDetails[i] || { id_panneau: "", montant: 0 }
    );
    setPanneauxDetails(newArr);
  };

  const submitTransaction = async () => {
    if (!selectedSocieteId) return alert("Veuillez sélectionner une société");

    // Vérification : tous les panneaux doivent avoir un identifiant
    const incomplete = panneauxDetails.some(p => p.id_panneau.trim() === "");
    if (incomplete) return alert("Veuillez saisir l'identifiant de chaque panneau");

    setIsSaving(true);
    try {
      await addDoc(collection(db, "transactions"), {
        type: "ENTRÉE",
        societe_id: selectedSocieteId,
        client_nom: currentSociete?.nom || "Inconnu",
        nombre_panneaux: numPanneaux,
        details_panneaux: panneauxDetails, // Contient maintenant {id_panneau, montant}
        mois: nbMois,
        total_usd: totalGeneral,
        valide_par: "Andre Omeonga",
        date: serverTimestamp(),
        status: "Validé"
      });

      alert("Transaction enregistrée !");
      onClose();
      setSelectedSocieteId("");
      setNumPanneaux(1);
      setPanneauxDetails([{ id_panneau: "", montant: 0 }]);
    } catch (e) {
      console.error(e);
      alert("Erreur de connexion");
    } finally {
      setIsSaving(false);
    }
  };
  {
    societes.map((s: any) => (
      <option key={s.id} value={s.id} className="bg-[#1e3a8a]">
        {s.nom || s.Nom || "Champ 'nom' introuvable"}
      </option>
    ))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />

          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed right-0 top-0 h-full w-full max-w-md bg-[#1e3a8a] border-l border-white/10 shadow-2xl z-[101] p-8 overflow-y-auto">

            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black italic uppercase text-[#f59e0b]">Encaissement</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
            </div>

            <div className="space-y-6">
              {/* SOCIÉTÉ */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40 italic">
                  Société Partenaire
                </label>
                <select 
  value={selectedSocieteId} 
  onChange={(e) => setSelectedSocieteId(e.target.value)}
  className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl text-white font-bold"
>
  <option value="">-- Sélectionner --</option>
  
  {/* TEST FORCE : Si societes est vide, on affiche des faux noms pour vérifier le design */}
  {societes && societes.length > 0 ? (
    societes.map((s: any) => (
      <option key={s.id} value={s.id} className="bg-[#1e3a8a]">
        {s.nom || "Société sans nom"}
      </option>
    ))
  ) : (
    <>
      <option disabled className="text-red-400">⚠️ Aucune société en base de données</option>
      <option value="test-1" className="bg-green-900">Société de Test A (Local)</option>
      <option value="test-2" className="bg-green-900">Société de Test B (Local)</option>
    </>
  )}
</select>

                {/* Indicateur de debug sous le champ */}
                <p className="text-[8px] opacity-30">
                  Nombre de sociétés chargées : {societes?.length || 0}
                </p>
              </div>

              {/* CONFIGURATION QUANTITÉ */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-40 italic">Nb Panneaux</label>
                  <input type="number" min="1" value={numPanneaux} onChange={(e) => handleAddPanneau(parseInt(e.target.value) || 1)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-40 italic">Durée (Mois)</label>
                  <input type="number" min="1" value={nbMois} onChange={(e) => setNbMois(parseInt(e.target.value) || 1)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none" />
                </div>
              </div>

              {/* LISTE DYNAMIQUE DES PANNEAUX (CORRIGÉE) */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <p className="text-[10px] font-black uppercase text-[#f59e0b]">Détails par Panneau</p>
                {panneauxDetails.map((p, index) => (
                  <div key={index} className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black opacity-30">UNITÉ {index + 1}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* CHAMP POUR LE NOM/ID DU PANNEAU */}
                      <input
                        type="text"
                        placeholder="Nom/ID du panneau"
                        value={p.id_panneau}
                        onChange={(e) => {
                          const newP = [...panneauxDetails];
                          newP[index].id_panneau = e.target.value;
                          setPanneauxDetails(newP);
                        }}
                        className="bg-white/5 border border-white/10 p-2 rounded-lg text-xs font-bold outline-none focus:border-amber-500"
                      />

                      {/* CHAMP POUR LE MONTANT */}
                      <input
                        type="number"
                        placeholder="Montant USD"
                        onChange={(e) => {
                          const newP = [...panneauxDetails];
                          newP[index].montant = Number(e.target.value);
                          setPanneauxDetails(newP);
                        }}
                        className="bg-transparent border-b border-white/20 outline-none text-right font-black text-lg text-amber-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* TOTAL */}
              <div className="mt-6 p-6 bg-amber-500 rounded-3xl text-[#1e3a8a]">
                <p className="text-[10px] font-black uppercase opacity-60">Total Global</p>
                <h3 className="text-3xl font-black italic">{totalGeneral.toLocaleString()} $</h3>
              </div>

              <button
                onClick={submitTransaction}
                disabled={isSaving || !selectedSocieteId || totalGeneral <= 0}
                className="w-full bg-white text-[#1e3a8a] py-5 rounded-2xl font-black uppercase hover:bg-amber-500 hover:text-white transition-all disabled:opacity-20"
              >
                {isSaving ? "Enregistrement..." : "Valider l'entrée"}
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




// --- MODULE 1: AUDIT (BI DASHBOARD) ---
function AuditModule({ data }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <section className={`${THEME.glass} p-6 md:p-8 rounded-[2rem] shadow-inner`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <FilterInput icon={Search} placeholder="Recherche..." />
          <FilterSelect icon={Calendar} label="Période" options={['Mars 2026', 'Archives']} />
          <FilterSelect icon={Tag} label="Type" options={['Global', 'Revenus', 'Charges']} />
          <FilterInput icon={CreditCard} placeholder="Min $" type="number" />
          <FilterSelect icon={RefreshCcw} label="Devise" options={['USD', 'CDF']} />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 h-auto lg:h-[400px]">
        <div className={`${THEME.glass} p-6 md:p-8 rounded-[2.5rem] min-h-[300px]`}>
          <h3 className="text-[10px] font-black uppercase mb-4 opacity-40 italic tracking-widest">Flux Transactionnels</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockBI}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={THEME.gold} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={THEME.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ background: '#1e3a8a', border: 'none', borderRadius: '10px' }} />
              <Area type="monotone" dataKey="val" stroke={THEME.gold} fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={`${THEME.glass} p-6 md:p-8 rounded-[2.5rem] min-h-[300px]`}>
          <h3 className="text-[10px] font-black uppercase mb-4 opacity-40 italic tracking-widest">Performances Géographiques</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockBI}><Bar dataKey="val" fill={THEME.white} radius={[10, 10, 0, 0]} /></BarChart>
          </ResponsiveContainer>
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