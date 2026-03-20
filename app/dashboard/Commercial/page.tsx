'use client';
import { useState, useMemo } from 'react';

// 1. Les ICÔNES viennent uniquement de 'lucide-react'
import {
  BarChart3, LayoutDashboard, FileText, Users,
  Bell, Map as MapIcon, TrendingUp, DollarSign,
  PieChart, ArrowUpRight, Calendar, Download,
  Mail, Calculator, MapPin, ChevronDown, FileJson,
  FileSpreadsheet, FileText as FileDoc
} from 'lucide-react';

// 2. Les COMPOSANTS DE GRAPHIQUES viennent uniquement de 'recharts'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
  Cell, ReferenceLine
} from 'recharts';



const dashboardData = [
  { id: 1, client: 'Vodacom', commune: 'Gombe', status: 'Occupé', endContract: '2026-03-15', revenue: 50000, expenses: 10000 },
  { id: 2, client: 'Orange', commune: 'Kalamu', status: 'Occupé', endContract: '2026-03-20', revenue: 45000, expenses: 38000 },
  { id: 3, client: 'Airtel', commune: 'Ngaliema', status: 'Occupé', endContract: '2026-04-10', revenue: 60000, expenses: 15000 }
];
// --- DONNÉES ---
const RAW_DATA = {
  panels: [
    { id: 1, commune: 'Gombe', status: 'Occupé', client: 'Vodacom', price: 1500, endContract: '2026-03-15' },
    { id: 2, commune: 'Limete', status: 'Libre', price: 800 },
    { id: 1, commune: 'Gombe', status: 'En panne', client: 'Vodacom', endContract: '2026-03-15' },

    { id: 1, commune: 'Limete', status: 'En panne', client: 'Vodacom', endContract: '2026-03-15' },

    { id: 1, commune: 'Limete', status: 'Réservé', client: 'Vodacom', endContract: '2026-03-15' },

    { id: 1, commune: 'Kitambo', status: 'Réservé', client: 'Vodacom', endContract: '2026-03-15' },

    { id: 3, commune: 'Ngaliema', status: 'Occupé', client: 'Airtel', price: 1200, endContract: '2026-04-10' },
    { id: 4, commune: 'Gombe', status: 'Libre', price: 1800 },
    { id: 5, commune: 'Kalamu', status: 'Occupé', client: 'Orange', price: 600, endContract: '2026-03-20' },
  ],

teamPerformance: [
    { name: 'Patrick M.', sales: 125000, target: 150000, prospectsInPipeline: 45000, winRate: 85 },
    { name: 'Sarah K.', sales: 98000, target: 100000, prospectsInPipeline: 30000, winRate: 72 },
    { name: 'Jean L.', sales: 75000, target: 120000, prospectsInPipeline: 15000, winRate: 45 },
  ],


  monthlyPerformance: [
    { month: 'Jan', revenue: 45000, occupation: 65, expenses: 12000 },
    { month: 'Feb', revenue: 52000, occupation: 70, expenses: 15000 },
    { month: 'Mar', revenue: 48000, occupation: 68, expenses: 11000 },
    { month: 'Apr', revenue: 61000, occupation: 82, expenses: 18000 },
    { month: 'May', revenue: 55000, occupation: 75, expenses: 14000 },
    { month: 'Jun', revenue: 67000, occupation: 88, expenses: 19000 },
    
  ],
  commercials: [
    { name: 'Patrick M.', sales: 125000, target: 150000 },
    { name: 'Sarah K.', sales: 98000, target: 100000 },
    { name: 'Jean L.', sales: 75000, target: 120000 },
  ]
};


// Exemple de fonction d'analyse pour le Directeur
const getRecommendations = (tab: string) => {
  if (tab === 'overview') {
    return "Tendance positive : La zone de Gombe sature. Suggestion : Augmenter les tarifs de 15% sur les nouveaux contrats Gombe.";
  }
  if (tab === 'team') {
    return "Patrick M. est à 83% de son objectif. Suggestion : Proposer un bonus de fin de mois pour booster les 17% restants.";
  }
  return "Aucune alerte critique pour le moment.";
};



export default function CommercialDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('6m');
  const [showExportMenu, setShowExportMenu] = useState(false);


  const [sidePanel, setSidePanel] = useState<{ isOpen: boolean, type: string }>({ isOpen: false, type: '' });
  const openMaintenance = () => setSidePanel({ isOpen: true, type: 'maintenance' });

  // --- LOGIQUE DE CALCUL ---
  const stats = useMemo(() => {
    const totalPanels = RAW_DATA.panels.length;
    const occupied = RAW_DATA.panels.filter(p => p.status === 'Occupé').length;
    const revenue = RAW_DATA.monthlyPerformance.reduce((acc, curr) => acc + curr.revenue, 0);
    const multiplier = period === '7d' ? 0.1 : period === '30d' ? 0.3 : 1;

    return {
      total: totalPanels,
      occupied: occupied,
      rate: ((occupied / totalPanels) * 100).toFixed(1),
      revenue: Math.floor(revenue * multiplier),
      profit: Math.floor((revenue - 89000) * multiplier)
    };
  }, [period]);

  const handleExport = (type: string) => {
    alert(`Exportation du rapport (${activeTab}) au format ${type} en cours...`);
    setShowExportMenu(false);
  };

  return (
    <div className="flex min-h-screen bg-[#050505] text-zinc-300 font-sans">

      {/* SIDEBAR */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col p-6 sticky top-0 h-screen z-20">
        <div className="mb-10 px-2">
          <h1 className="text-2xl font-black italic text-white tracking-tighter">DISPROMALT</h1>
          <div className="h-1 w-12 bg-blue-600 mt-1" />
        </div>

        <nav className="space-y-1 flex-1">
          <NavItem icon={<LayoutDashboard size={18} />} label="Vue d'ensemble" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavItem icon={<DollarSign size={18} />} label="Reporting Financier" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
          <NavItem icon={<Bell size={18} />} label="Alertes Contrats" active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} />
          <NavItem icon={<Users size={18} />} label="Performance Équipe" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
          <NavItem icon={<Calculator size={18} />} label="Estimateur Facture" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
        </nav>

        <div className="mt-auto p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[10px]">MN</div>
            <div>
              <p className="text-[11px] font-black text-white">Monsieur Ndaka</p>
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Commercial Senior</p>
            </div>
          </div>
        </div>
      </aside>


      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto bg-[#050505]">

        {/* HEADER & INSIGHTS BAR */}
        <header className="flex flex-col gap-6 mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase">
                {activeTab === 'overview' ? "Tableau de Bord" :
                  activeTab === 'finance' ? "Reporting Financier" :
                    activeTab === 'alerts' ? "Alertes & Contrats" :
                      activeTab === 'team' ? "Suivi d'Équipe" : "Outil de Cotation"}
              </h2>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
                {activeTab} • Gestion commerciale Kinshasa
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Sélecteur de Période élégant */}
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                {['7d', '30d', '6m'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${period === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-zinc-600 hover:text-zinc-300'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Bouton Export */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-6 py-2.5 bg-white text-black rounded-xl text-[10px] font-black uppercase hover:bg-zinc-200 transition flex items-center gap-2 shadow-xl"
                >
                  <Download size={12} /> Export
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-3 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <ExportOption icon={<FileSpreadsheet size={14} />} label="Excel (.xlsx)" onClick={() => handleExport('Excel')} />
                    <ExportOption icon={<FileDoc size={14} />} label="Word (.docx)" onClick={() => handleExport('Word')} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CARTE DE SUGGESTION IA (Propositions de Direction) */}
          <div className="bg-gradient-to-r from-blue-900/20 to-zinc-950 border border-blue-500/20 p-6 rounded-3xl flex items-center gap-6">
            <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400">
              <TrendingUp size={24} />
            </div>
            <div>
              <h4 className="text-white font-black text-sm uppercase italic">Suggestion de la Direction</h4>
              <p className="text-zinc-400 text-[11px] mt-1 max-w-2xl leading-relaxed">
                {activeTab === 'overview' ? "La zone de Gombe atteint 85% d'occupation. Nous recommandons d'ajuster les tarifs publicitaires de +12% pour le prochain trimestre." :
                  activeTab === 'finance' ? "Votre marge brute augmente. Conseil : Réinvestir les excédents dans la maintenance des panneaux de Ngaliema." :
                    "Analyse effectuée : Votre équipe atteint 88% de ses objectifs. Un encouragement collectif est suggéré pour motiver la fin de période."}
              </p>
            </div>
          </div>
        </header>

        {/* VUES DÉTAILLÉES */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {activeTab === 'overview' && <OverviewView stats={stats} />}
          {activeTab === 'finance' && <FinanceView data={RAW_DATA.monthlyPerformance} />}
          {activeTab === 'alerts' && <AlertsView data={RAW_DATA.panels} />}
          {activeTab === 'team' && <TeamView data={RAW_DATA.commercials} />}
          {activeTab === 'billing' && <BillingView />}
        </div>
      </main>

      {sidePanel.isOpen && (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 p-8 animate-in slide-in-from-right-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-white font-black italic uppercase">Maintenance Requise</h3>
            <button onClick={() => setSidePanel({ isOpen: false, type: '' })} className="text-zinc-500 hover:text-white">✕</button>
          </div>
          <div className="space-y-4">
            <MaintenanceItem title="Panneau Gombe #14" date="07/03/2026" status="Urgent" />
            <MaintenanceItem title="Panneau Limete #09" date="05/03/2026" status="Préventif" />
          </div>
        </div>
      )}
    </div>
  );
}

// --- SOUS-COMPOSANTS DE VUES ---
function OverviewView({ stats }: any) {
  return (
    <>
      {/* LIGNE DES KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <KPICard title="Total Panneaux" value={stats.total} subValue="Parc Kinshasa" icon={<MapIcon className="text-blue-500" size={20} />} />
        <KPICard title="Taux d'Occupation" value={`${stats.rate}%`} subValue={`${stats.occupied} actifs`} icon={<TrendingUp className="text-emerald-500" size={20} />} />
        <KPICard title="Chiffre d'Affaires" value={`${stats.revenue.toLocaleString()} $`} subValue="Brut période" icon={<DollarSign className="text-amber-500" size={20} />} />

        {/* CARTE RISQUES (NOUVELLE) */}
        <div className="bg-zinc-950 border border-rose-900/30 p-7 rounded-[2.5rem] relative overflow-hidden group hover:border-rose-600 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-rose-950/20 rounded-2xl">
              <Bell className="text-rose-500" size={20} />
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </div>
          <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.2em]">Risques Opérationnels</p>
          <h4 className="text-2xl font-black text-white mt-1">2 Panneaux</h4>
          <p className="text-[10px] text-rose-500 mt-1 font-bold italic">Nécessitent maintenance</p>
        </div>
      </div>

      {/* GRILLE GRAPHIQUES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 p-8 rounded-[2.5rem]">
          <h3 className="text-white font-bold mb-6 italic">Activité Mensuelle</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={RAW_DATA.monthlyPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis dataKey="month" stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={0.1} fill="#3b82f6" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2.5rem]">
          <h3 className="text-white font-bold mb-6">Top Zones (Kinshasa)</h3>
          <div className="space-y-6">
            <ZoneProgress name="Gombe" color="bg-blue-500" val={85} />
            <ZoneProgress name="Limete" color="bg-emerald-500" val={62} />
            <ZoneProgress name="Ngaliema" color="bg-amber-500" val={45} />
            <ZoneProgress name="Bandal" color="bg-rose-500" val={30} />
          </div>
        </div>
      </div>
    </>
  );
}

function FinanceView({ data }: any) {
  // Calculs financiers
  const totalRevenue = data.reduce((acc: number, curr: any) => acc + (curr.revenue || 0), 0);
  const totalExpenses = data.reduce((acc: number, curr: any) => acc + (curr.expenses || 0), 0);
  const profit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-8">
      {/* Grille des Cartes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FinanceCard label="Revenu Total" val={`$${totalRevenue.toLocaleString()}`} color="text-blue-500 font-black" />
        <FinanceCard label="Dépenses" val={`$${totalExpenses.toLocaleString()}`} color="text-rose-500 font-black" />
        <FinanceCard label="Marge Brute" val={`${margin}%`} color={Number(margin) >= 50 ? "text-emerald-500 font-black" : "text-amber-500 font-black"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* L'Histogramme (BarChart) avec ligne de seuil */}
        <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2.5rem]">
          <h3 className="text-white font-bold mb-6 italic">Évolution Financière</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '1rem' }} />

                {/* Ligne de seuil de rentabilité fixe (ex: 50k) */}
                <ReferenceLine y={50000} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Seuil', fill: '#ef4444', fontSize: 10, position: 'right' }} />

                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenu" />
                <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Dépenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Détail des transactions avec Tendance MoM */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8">
          <h3 className="text-white font-bold mb-6 italic">Performance Mensuelle</h3>
          <div className="space-y-6">
            {data.map((item: any, i: number) => {
              const prev = i > 0 ? data[i - 1].revenue : item.revenue;
              const growth = ((item.revenue - prev) / prev) * 100;
              const percentage = Math.min((item.revenue / 70000) * 100, 100);

              return (
                <div key={i} className="group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-zinc-400 font-bold uppercase text-xs">{item.month}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] font-black ${growth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {growth >= 0 ? '▲' : '▼'} {Math.abs(growth).toFixed(0)}%
                      </span>
                      <span className="text-white font-black text-sm">{item.revenue.toLocaleString()} $</span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}



function AlertsView({ data }: any) {
  // --- DONNÉES DE DÉMONSTRATION (Utilisées si 'data' est vide ou absent) ---
  const demoData = [
    { id: 'P-101', client: 'Vodacom', commune: 'Gombe', status: 'Occupé', endContract: '2026-03-15', revenue: 50000, expenses: 10000 },
    { id: 'P-202', client: 'Orange', commune: 'Kalamu', status: 'Occupé', endContract: '2026-03-20', revenue: 45000, expenses: 42000 }, // Ratio > 80% (Alerte Dépense)
    { id: 'P-303', client: 'Airtel', commune: 'Ngaliema', status: 'Occupé', endContract: '2026-04-10', revenue: 60000, expenses: 15000 },
    { id: 'P-404', client: 'Bralima', commune: 'Limete', status: 'En panne', endContract: '2026-06-01' }, // Alerte Maintenance
    { id: 'P-505', client: 'Rawbank', commune: 'Gombe', status: 'Réservé', endContract: '2026-07-01' }  // Alerte Réservation
  ];

  // Si data n'existe pas, on utilise demoData pour la démonstration
  const displayData = (data && data.length > 0) ? data : demoData;

  // 1. Filtrage des différents types d'alertes
  const expiringContracts = displayData.filter((p: any) => p.status === 'Occupé')
    .sort((a: any, b: any) => new Date(a.endContract).getTime() - new Date(b.endContract).getTime());

  const maintenanceAlerts = displayData.filter((p: any) => p.status === 'En panne' || p.status === 'Maintenance');
  const expenseAlerts = displayData.filter((item: any) => item.revenue > 0 && (item.expenses / item.revenue) > 0.8);
  const reservationAlerts = displayData.filter((p: any) => p.status === 'Réservé');

  return (
    <div className="space-y-6">
      {/* Zone des Alertes d'anomalies groupées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {expenseAlerts.map((item: any, i: number) => (
          <AlertBanner key={`exp-${i}`} title="Dépense élevée" description={`Le mois présente un ratio critique (> 80%).`} type="danger" />
        ))}
        {maintenanceAlerts.map((p: any, i: number) => (
          <AlertBanner key={`main-${i}`} title={`Panneau en ${p.status}`} description={`Le panneau ${p.id} à ${p.commune} nécessite une intervention.`} type="danger" />
        ))}
        {reservationAlerts.map((p: any, i: number) => (
          <AlertBanner key={`res-${i}`} title="Nouvelle Réservation" description={`Le panneau ${p.id} a une demande de réservation.`} type="warning" />
        ))}
      </div>

      {/* Zone Alerte Contrats */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-white font-bold text-xl italic">Alerte Contrats</h3>
            <p className="text-zinc-500 text-xs mt-1">Gestion des renouvellements en cours</p>
          </div>
          <div className="bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 text-[10px] font-black uppercase text-zinc-400">
            {expiringContracts.length} actifs
          </div>
        </div>

        <div className="space-y-3">
          {expiringContracts.map((p: any, i: number) => {
            const daysLeft = Math.ceil((new Date(p.endContract).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const urgencyColor = daysLeft < 15 ? 'text-rose-500' : daysLeft < 45 ? 'text-amber-500' : 'text-emerald-500';

            return (
              <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/30 hover:bg-zinc-900 transition rounded-2xl border border-zinc-800/50" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${urgencyColor.replace('text', 'bg')}`} />
                  <div>
                    <p className="text-white font-bold">{p.client}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-black">{p.commune}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={`text-sm font-black ${urgencyColor}`}>{daysLeft} jours restants</p>
                    <p className="text-[10px] text-zinc-600">Fin le {new Date(p.endContract).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => alert(`Relance : ${p.client}`)} className="p-3 bg-zinc-800 hover:bg-blue-600 rounded-xl transition text-zinc-400 hover:text-white">
                    <Mail size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// Composant AlertBanner inchangé
function AlertBanner({ title, description, type }: { title: string, description: string, type: 'danger' | 'warning' }) {
  const isDanger = type === 'danger';
  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border ${isDanger ? 'bg-rose-950/30 border-rose-900/50' : 'bg-amber-950/30 border-amber-900/50'} animate-fade-in`}>
      <div className={`p-2 rounded-full ${isDanger ? 'bg-rose-500/20' : 'bg-amber-500/20'}`}>
        <Bell size={18} className={isDanger ? 'text-rose-500' : 'text-amber-500'} />
      </div>
      <div>
        <p className="text-white font-bold text-sm">{title}</p>
        <p className="text-zinc-400 text-[10px]">{description}</p>
      </div>
    </div>
  );
}
function TeamView({ data }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {data.map((c: any, i: number) => {
        // Calculs de sécurité pour éviter les NaN ou erreurs
        const progress = Math.min(Math.floor(((c.sales || 0) / (c.target || 1)) * 100), 100);
        const isUpward = progress > 70;

        return (
          <div key={i} className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2.5rem] group hover:border-blue-600 transition-all">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center text-blue-500 font-black">
                {c.name?.charAt(0) || '?'}
              </div>
              <div className={`px-2 py-1 rounded-lg text-[9px] font-black ${isUpward ? 'bg-emerald-950 text-emerald-500' : 'bg-rose-950 text-rose-500'}`}>
                {isUpward ? '▲ TENDANCE POSITIVE' : '▼ À SURVEILLER'}
              </div>
            </div>

            <h4 className="text-white font-bold">{c.name || 'Commercial'}</h4>
            <p className="text-2xl font-black text-white mt-1">{(c.sales || 0).toLocaleString()} $</p>

            {/* PROGRESSION */}
            <div className="mt-6 mb-8">
              <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase mb-2">
                <span>Progression Objectif</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div className={`h-full ${isUpward ? 'bg-blue-600' : 'bg-amber-600'}`} style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* INDICATEURS PRO (Sécurisés) */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-900">
              <div>
                <p className="text-[9px] text-zinc-600 font-bold uppercase">Pipeline</p>
                <p className="text-sm font-black text-white">
                  {(c.prospectsInPipeline || 0).toLocaleString()} $
                </p>
              </div>
              <div>
                <p className="text-[9px] text-zinc-600 font-bold uppercase">Win Rate</p>
                <p className="text-sm font-black text-white">
                  {c.winRate || 0}%
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}



import { jsPDF } from 'jspdf'; // N'oublie pas d'installer : npm install jspdf

function BillingView() {
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [months, setMonths] = useState(0);

  const total = price * quantity * months;

  // Fonction utilitaire pour formater les nombres sans caractères spéciaux
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };
  const generatePDF = () => {
    if (total === 0) return;

    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    // 1. Bande latérale gauche (Design épuré)
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, 10, 297, 'F');

    // 2. En-tête
    doc.setTextColor(0, 102, 204);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('DISPROMALT', 20, 25);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text('RÉGIE PUBLICITAIRE & COMMUNICATION', 20, 32);

    // 3. Infos Commercial
    doc.setFillColor(248, 248, 248);
    doc.rect(20, 45, 170, 25, 'F');
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date : ${date} | Commercial : Monsieur Ndaka`, 25, 53);
    doc.text(`Objet : Devis Proformat - Location espaces publicitaires`, 25, 60);

    // 4. Tableau
    const startY = 85;
    doc.setFillColor(0, 102, 204);
    doc.rect(20, startY, 170, 10, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', 25, startY + 7);
    doc.text('DÉTAILS', 100, startY + 7);
    doc.text('TOTAL', 160, startY + 7);

    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Location Panneaux (${quantity} unités)`, 25, startY + 20);
    doc.text(`${formatNumber(price)} $ x ${months} mois`, 100, startY + 20);
    doc.text(`${formatNumber(total)} $`, 160, startY + 20);

    // 5. Total
    doc.setFillColor(240, 245, 250);
    doc.rect(130, startY + 35, 60, 15, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL : ${formatNumber(total)} USD`, 135, startY + 45);

    // 6. Message chaleureux (Juste après le total)
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(50);
    const msg = "Nous vous remercions de la confiance que vous accordez à DISPROMALT.\nCe devis est valable 15 jours.\nsDISPROMALT s'engage à booster votre visibilité avec des solutions publicitaires adaptées à vos besoins.";
    doc.text(doc.splitTextToSize(msg, 160), 20, startY + 65);

    // 7. Bas de page officiel : Gauche | Milieu | Droite sur la même ligne
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 275, 190, 275); // Ligne de séparation

    doc.setFontSize(8);
    doc.setTextColor(100);

    // Gauche : Adresse
    doc.text("Kinshasa, RDC", 20, 282, { align: 'left' });

    // Milieu : Téléphone
    doc.text("+243 XXX XXX XXX", 105, 282, { align: 'center' });

    // Droite : Email
    doc.text("contact@dispromalt.com", 190, 282, { align: 'right' });


    doc.save(`Devis_Dispromalt_${date.replace(/\//g, '-')}.pdf`);
  };


  return (
    <div className="max-w-xl mx-auto bg-zinc-950 border border-zinc-800 p-12 rounded-[3.5rem]">
      <h3 className="text-white font-black text-xl mb-8 flex items-center gap-4 italic uppercase tracking-tighter">
        <Calculator className="text-blue-500" /> Estimation Facture
      </h3>
      <div className="space-y-6">
        <InputGroup label="Prix / Mois ($)" value={price} onChange={(e: any) => setPrice(Number(e.target.value))} />
        <InputGroup label="Quantité" value={quantity} onChange={(e: any) => setQuantity(Number(e.target.value))} />
        <InputGroup label="Nombre de Mois" value={months} onChange={(e: any) => setMonths(Number(e.target.value))} />

        <div className="pt-8 border-t border-zinc-900 mt-8 flex justify-between items-center">
          <span className="text-zinc-500 font-bold uppercase text-xs">Total Facturé</span>
          <span className="text-4xl font-black text-white">{formatNumber(total)} $</span>
        </div>

        <button onClick={generatePDF} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] mt-6">
          Générer Devis Proformat
        </button>
      </div>
    </div>
  );
}
// --- COMPOSANTS DE BASE CORRIGÉS ---

// Cette version est la SEULE qui doit rester pour InputGroup
function InputGroup({ label, placeholder, value, onChange }: any) {
  return (
    <div className="w-full">
      <label className="block text-[9px] font-black text-zinc-500 uppercase mb-2 ml-1 tracking-widest">
        {label}
      </label>
      <input
        type="number"
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-[#090909] border border-zinc-800 p-4 rounded-xl outline-none focus:border-blue-600 transition text-white font-bold"
      />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-tight transition-all ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/30' : 'text-zinc-500 hover:bg-zinc-900'
      }`}>
      {icon} {label}
    </button>
  );
}

function KPICard({ title, value, subValue, icon }: any) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 p-7 rounded-[2.5rem] hover:border-zinc-600 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-zinc-900 rounded-2xl">{icon}</div>
        <ArrowUpRight size={14} className="text-zinc-700" />
      </div>
      <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.2em]">{title}</p>
      <h4 className="text-2xl font-black text-white mt-1">{value}</h4>
      <p className="text-[10px] text-zinc-500 mt-1 font-bold italic">{subValue}</p>
    </div>
  );
}

function ExportOption({ icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-zinc-800 transition-all border-b border-zinc-800/50 last:border-0">
      {icon} <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tight">{label}</span>
    </button>
  );
}

function ZoneProgress({ name, color, val }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest italic">
        <span className="text-zinc-400">{name}</span>
        <span className="text-white">{val}%</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${val}%` }} />
      </div>
    </div>
  );
}

function FinanceCard({ label, val, color }: any) {
  return (
    <div className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800 text-center">
      <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl ${color}`}>{val}</p>
    </div>
  );
}

function MaintenanceItem({ title, date, status }: any) {
  return (
    <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 hover:border-blue-600 transition">
      <div className="flex justify-between mb-3">
        <span className="text-[10px] font-black uppercase text-zinc-500">{date}</span>
        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${status === 'Urgent' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>{status}</span>
      </div>
      <h4 className="text-white font-bold">{title}</h4>
      <button className="text-[10px] text-blue-500 mt-4 underline italic">Voir localisation</button>
    </div>
  );
}