'use client';
import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, onSnapshot, collection, query, serverTimestamp } from 'firebase/firestore';
import {
    LogOut, MapPin, Bell, Globe, Zap, ShieldCheck, Award,
    ArrowUpRight, Target, Activity, LayoutGrid, Calendar, Clock,
    BarChart3, Eye, MousePointer2, TrendingUp, Search, Layers,
    ChevronRight, Box, Filter, Download, Maximize2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
    authDomain: "kin-geo-market.firebaseapp.com",
    projectId: "kin-geo-market",
    storageBucket: "kin-geo-market.firebasestorage.app",
    messagingSenderId: "50335362445",
    appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);


export default function VisiteurDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [user, setUser] = useState<any>(null);
    const [mesFaces, setMesFaces] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [panneaux, setPanneaux] = useState<any[]>([]); // L'erreur vient souvent du fait que cette ligne manque
    // Force l'affichage de TOUS les panneaux, peu importe le client

    useEffect(() => {

        const session = localStorage.getItem('userSession');
        if (!session) { router.push('/'); return; }
        const userData = JSON.parse(session);
        setUser(userData);

        const userRef = doc(db, "societes", userData.id);
        const q = query(collection(db, "panneaux"));

        const unsubUser = onSnapshot(userRef, (snap) => {
            if (snap.exists()) setUser({ id: snap.id, ...snap.data() });
        });

        const unsubPanneaux = onSnapshot(q, (snap) => {
            let tempFaces: any[] = [];
            snap.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (data.faces && Array.isArray(data.faces)) {
                    const matched = data.faces.filter((f: any) => f.clientNom === userData.nomSociete);
                    matched.forEach((f: any) => {
                        tempFaces.push({ ...f, parentAdresse: data.adresse, parentZone: data.zone, parentIdPan: data.idPan });
                    });
                }
            });
            setMesFaces(tempFaces);
            setLoading(false);
        });

        return () => { unsubUser(); unsubPanneaux(); };
    }, [router]);

    // --- LOGIQUE DE RENDU DES VUES ---
    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return <OverviewSection mesFaces={mesFaces} user={user} />;
            case 'analytics': return <AnalyticsSection mesFaces={mesFaces} />;
            case 'inventory': return <InventorySection mesFaces={mesFaces} />;
            // Dans ton switch (renderContent)
            case 'map':
    return (
        <MapSection 
            // On ne passe plus 'tousLesPanneaux' car la fonction 
            // contient son propre onSnapshot (temps réel)
            userConnecte={user} 
        />
    );
            default: return <OverviewSection mesFaces={mesFaces} user={user} />;
        }
    };

    if (loading) return <div className="min-h-screen bg-[#1e40af] flex items-center justify-center"><Zap className="text-[#d4af37] animate-pulse" size={48} /></div>;

    return (
        <div className="min-h-screen bg-[#1e40af] text-white flex flex-col md:flex-row overflow-hidden font-sans relative">

            {/* --- EFFET VISUEL : SCANLINE --- */}
            <div className="pointer-events-none absolute inset-0 z-[60] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]"></div>

            {/* --- SIDEBAR : Ruban de contrôle scrollable sur mobile --- */}
            <aside className="w-full h-20 md:h-screen md:w-24 bg-black/60 border-t md:border-t-0 md:border-r border-white/10 flex flex-row md:flex-col items-center backdrop-blur-3xl z-50 order-2 md:order-1 overflow-x-auto md:overflow-y-auto no-scrollbar">

                {/* LOGO (Caché sur mobile pour laisser place au scroll) */}
                <div className="hidden md:flex mb-12 mt-8 shrink-0">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                        <ShieldCheck className="text-[#1e40af]" size={26} />
                    </div>
                </div>

                {/* CONTENEUR DE SCROLL UNIQUE (Tout est dedans) */}
                <div className="flex flex-row md:flex-col items-center gap-6 px-6 md:px-0 w-max md:w-full h-full md:h-auto">

                    {/* MENU PRINCIPAL */}
                    <nav className="flex flex-row md:flex-col items-center gap-6 md:gap-8">
                        {[
                            { id: 'overview', icon: LayoutGrid, label: 'Tableau' },
                            { id: 'analytics', icon: BarChart3, label: 'Stats' },
                            { id: 'inventory', icon: Layers, label: 'Faces' },
                            { id: 'map', icon: Globe, label: 'Carte' },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-xl md:rounded-2xl transition-all shrink-0 ${activeTab === item.id
                                    ? 'bg-[#d4af37] text-black scale-110 shadow-[0_0_15px_#d4af37]/40'
                                    : 'text-white/40 hover:text-white bg-white/5'
                                    }`}
                            >
                                <item.icon size={22} />
                            </button>
                        ))}
                    </nav>

                    {/* SÉPARATEUR VISUEL (Visible uniquement sur mobile pour marquer la suite) */}
                    <div className="w-[1px] h-8 bg-white/10 md:hidden shrink-0"></div>

                    {/* INDICATEUR RÉSEAU (Maintenant visible et scrollable) */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0 min-w-[50px]">
                        <div className="flex gap-[2px] items-end h-3">
                            <div className="w-[3px] h-[30%] bg-emerald-500 rounded-full"></div>
                            <div className="w-[3px] h-[60%] bg-emerald-500 rounded-full"></div>
                            <div className="w-[3px] h-[100%] bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
                        </div>
                        <span className="text-[7px] font-black uppercase tracking-tighter text-emerald-500">GKM-Net</span>
                    </div>

                    {/* BOUTON DE SORTIE (À la fin du scroll) */}
                    <button
                        onClick={() => { localStorage.removeItem('userSession'); router.push('/'); }}
                        className="w-12 h-12 rounded-xl bg-red-600/10 text-red-500 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all border border-red-500/20 shrink-0"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </aside>

            {/* --- ZONE DE TRAVAIL --- */}
            <div className="flex-1 flex flex-col overflow-y-auto relative z-10 order-1 md:order-2 h-[calc(100vh-5rem)] md:h-screen">
                <header className="h-16 md:h-20 border-b border-white/5 bg-black/20 flex items-center justify-between px-4 md:px-10 backdrop-blur-xl sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <h2 className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] text-[#d4af37] italic truncate">
                            {activeTab}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-[#d4af37]/10 pl-3 pr-1 py-1 rounded-l-full border-l-2 border-[#d4af37]">
                            <p className="text-[9px] font-black uppercase text-white truncate max-w-[70px] xs:max-w-none">
                                {user?.nomSociete}
                            </p>
                            <div className="w-7 h-7 rounded-full bg-[#d4af37] flex items-center justify-center text-black">
                                <Award size={14} />
                            </div>
                        </div>
                        <div className="w-9 h-9 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center relative">
                            <Bell className="text-[#d4af37]" size={16} />
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        </div>
                    </div>
                </header>

                <main className="p-4 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {renderContent()}
                </main>
            </div>

            <style jsx global>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
        </div>
    );
}


import { Users, MessageSquare } from 'lucide-react';

function OverviewSection({ mesFaces, user }: any) {
    const totalVues = mesFaces.length * 450;

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">

            {/* --- LIGNE 1 : ANALYTICS PRINCIPAUX --- */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">

                {/* CARTE MAITRESSE (STATUT) */}
                <div className="lg:col-span-3 bg-gradient-to-br from-[#d4af37]/20 to-transparent p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border border-[#d4af37]/20 relative overflow-hidden group shadow-2xl min-h-[320px] flex flex-col justify-center">
                    <TrendingUp className="absolute -right-10 -bottom-10 opacity-10 scale-[2] text-[#d4af37] group-hover:rotate-12 transition-transform duration-1000" size={300} />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                            <p className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-[#d4af37]">Live Monitoring System</p>
                        </div>

                        <h3 className="text-5xl md:text-8xl font-black italic tracking-tighter leading-none mb-6 drop-shadow-2xl">
                            OPÉRATIONNEL
                        </h3>

                        {/* BARRE DE PROGRESSION DE CAMPAGNE (Visuel riche) */}
                        <div className="max-w-md mb-8">
                            <div className="flex justify-between text-[10px] uppercase font-bold mb-2 opacity-60">
                                <span>Progression Campagne</span>
                                <span>85%</span>
                            </div>
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5 p-[1px]">
                                <div className="h-full bg-gradient-to-r from-[#d4af37] to-emerald-400 rounded-full w-[85%] shadow-[0_0_15px_rgba(212,175,55,0.5)]"></div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-6 md:gap-12 mt-4 md:mt-10">
                            <div className="group/item">
                                <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] group-hover:text-[#d4af37] transition-colors">Actifs</p>
                                <p className="text-3xl md:text-5xl font-black flex items-baseline gap-1">
                                    {mesFaces.length} <span className="text-xs text-white/20 italic">Faces</span>
                                </p>
                            </div>
                            <div className="w-[1px] h-12 bg-white/10 hidden sm:block"></div>
                            <div className="group/item">
                                <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] group-hover:text-emerald-400 transition-colors">Portée Estimée</p>
                                <p className="text-3xl md:text-5xl font-black text-emerald-400 flex items-baseline gap-1 shadow-emerald-500/20">
                                    {totalVues}K <span className="text-xs uppercase text-emerald-400/40">Vues</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARTE PROFIL / CHEF (Adaptée mobile) */}
                <div className="bg-black/40 backdrop-blur-3xl p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border border-white/10 flex flex-col justify-between shadow-2xl hover:border-[#d4af37]/40 transition-all group">
                    <div>
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                                <Award size={28} className="text-[#d4af37]" />
                            </div>
                            <Zap size={16} className="text-[#d4af37] animate-pulse" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Message de la Direction</p>
                        <p className="text-base md:text-lg font-bold italic tracking-tight text-white/90 leading-tight">
                            "{user?.messageAdmin || "Votre impact visuel sur Kinshasa est actuellement à son apogée. Continuez l'expansion."}"
                        </p>
                    </div>

                    <button className="mt-8 group/btn relative overflow-hidden flex items-center justify-center gap-3 w-full py-4 bg-white text-[#1e40af] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#d4af37] hover:text-black transition-all active:scale-95 shadow-xl">
                        <MessageSquare size={14} />
                        <span>Contacter le Chef</span>
                    </button>
                </div>
            </div>

            {/* --- LIGNE 2 : ACTIONS RAPIDES & MINI-STATS --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[
                    { label: 'Localisation', value: 'KINSHASA', icon: MapPin, color: 'text-blue-400' },
                    { label: 'Utilisateurs', value: '1.2M', icon: Users, color: 'text-purple-400' },
                    { label: 'Performance', value: '+12.5%', icon: TrendingUp, color: 'text-emerald-400' },
                    { label: 'Rapports', value: 'PDF', icon: Download, color: 'text-[#d4af37]', action: true },
                ].map((stat, i) => (
                    <div key={i} className={`p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group flex flex-col justify-between min-h-[120px] ${stat.action ? 'border-[#d4af37]/30 border-dashed' : ''}`}>
                        <stat.icon size={20} className={`${stat.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                        <div>
                            <p className="text-[8px] font-black uppercase text-white/30 tracking-widest">{stat.label}</p>
                            <p className="text-lg md:text-xl font-black uppercase tracking-tighter">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}




// --- SOUS-COMPOSANT : ANALYTICS (Version Ultra-Riche & Responsive) ---
function AnalyticsSection({ mesFaces }: any) {
    // Simulation de calculs basés sur tes données réelles
    const totalImpact = mesFaces.length * 450;

    return (
        <div className="space-y-6 md:space-y-10 pb-20 md:pb-0">

            {/* HEADER ANALYTICS : Adaptatif */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h3 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                        Performance <span className="text-[#d4af37]">Live</span>
                    </h3>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mt-2">Analyse temps réel • Dispromalt GKM</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-[#d4af37] hover:text-black transition-all group">
                        <Download size={16} />
                        <span className="text-[10px] font-black uppercase">Exporter</span>
                    </button>
                    <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:border-[#d4af37]/50 transition-all">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            {/* GRILLE DE KPI : 2 colonnes sur mobile, 4 sur desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {[
                    { label: "Visibilité", val: "84%", trend: "+5.2%", color: "text-blue-400" },
                    { label: "Impact Global", val: `${totalImpact}K`, trend: "Live", color: "text-emerald-400" },
                    { label: "Maintenance", val: "100%", trend: "OK", color: "text-white" },
                    { label: "Score ROI", val: "x3.2", trend: "+0.4", color: "text-[#d4af37]" },
                ].map((s, i) => (
                    <div key={i} className="bg-black/30 p-4 md:p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:bg-black/50 transition-all">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-[8px] md:text-[10px] font-black uppercase text-white/40 tracking-widest">{s.label}</p>
                                <span className="text-[7px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-emerald-400">{s.trend}</span>
                            </div>
                            <p className={`text-2xl md:text-4xl font-black italic ${s.color}`}>{s.val}</p>
                        </div>
                        {/* Déco subtile en fond */}
                        <div className={`absolute -right-2 -bottom-2 w-12 h-12 rounded-full opacity-10 blur-xl bg-current ${s.color}`}></div>
                    </div>
                ))}
            </div>

            {/* SECTION CENTRALE : Graphique & Top Zones */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* GRAPHE PRINCIPAL (Prend 2 colonnes sur large écran) */}
                <div className="xl:col-span-2 bg-black/40 rounded-[2.5rem] border border-white/10 p-6 md:p-8 relative min-h-[300px] flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-[#d4af37]" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Flux d'audience hebdomadaire</p>
                        </div>
                        <div className="flex gap-1">
                            {[...Array(7)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/10"></div>)}
                        </div>
                    </div>

                    <div className="flex-1 flex items-end justify-between gap-1 md:gap-4 px-2">
                        {[40, 70, 45, 90, 65, 80, 50, 85, 60, 75, 95, 40].map((h, i) => (
                            <div key={i} className="flex-1 group relative">
                                <div
                                    className="w-full bg-gradient-to-t from-[#1e40af] to-[#d4af37] rounded-t-lg opacity-40 group-hover:opacity-100 transition-all cursor-help relative"
                                    style={{ height: `${h}%` }}
                                >
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-black text-[8px] font-black px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {h}K
                                    </div>
                                </div>
                                <p className="text-[6px] text-white/20 mt-2 text-center hidden md:block italic">0{i + 1}</p>
                            </div>
                        ))}
                    </div>
                </div>




                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {[
                        { label: "Domination Zone", val: "22%", trend: "Faible", color: "text-red-400", sub: "Prenez 2 faces de plus pour dominer" },
                        { label: "Audience Unique", val: "1.2M", trend: "+12%", color: "text-emerald-400", sub: "Personnes touchées / mois" },
                        { label: "Temps d'Exposition", val: "480h", trend: "Live", color: "text-blue-400", sub: "Cumul d'affichage quotidien" },
                        { label: "Optimisation CPM", val: "-15%", trend: "Elite", color: "text-[#d4af37]", sub: "Economie liée à votre volume" },
                    ].map((s, i) => (
                        <div key={i} className="bg-black/30 p-4 rounded-[2rem] border border-white/5 relative group">
                            <p className="text-[8px] font-black uppercase text-white/40 mb-1">{s.label}</p>
                            <p className={`text-2xl md:text-3xl font-black italic ${s.color}`}>{s.val}</p>
                            <p className="text-[7px] text-white/60 mt-2 font-medium italic">{s.sub}</p>
                            <div className={`absolute top-4 right-4 text-[7px] font-bold px-1.5 py-0.5 rounded ${s.trend === 'Faible' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                {s.trend}
                            </div>
                        </div>
                    ))}
                </div>

                {/* // NOUVELLE SECTION : OPPORTUNITÉS (Pour pousser à l'achat) ---*/}
                <div className="mt-8 bg-gradient-to-r from-[#d4af37]/20 to-transparent p-6 rounded-[2.5rem] border-l-4 border-[#d4af37]">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#d4af37] rounded-full flex items-center justify-center text-black shadow-lg shadow-[#d4af37]/20">
                                <Zap size={24} fill="currentColor" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-widest text-[#d4af37]">Boostez votre impact</h4>
                                <p className="text-[10px] text-white/60">Selon vos données, 3 faces premium sont disponibles dans vos zones de prédilection.</p>
                            </div>
                        </div>
                        <button className="w-full md:w-auto px-8 py-3 bg-white text-[#1e40af] font-black text-[10px] uppercase rounded-xl hover:scale-105 transition-transform shadow-xl">
                            Réserver ces emplacements
                        </button>
                    </div>
                </div>
                {/* TOP ZONES : La valeur ajoutée pour le client */}
                <div className="bg-gradient-to-b from-white/5 to-transparent rounded-[2.5rem] border border-white/10 p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp size={16} className="text-emerald-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Top Secteurs (Kinshasa)</p>
                    </div>

                    <div className="space-y-4">
                        {[
                            { zone: "Gombe / Blvd 30 Juin", hit: "92%", color: "bg-blue-500" },
                            { zone: "Limete / Échangeur", hit: "88%", color: "bg-[#d4af37]" },
                            { zone: "Ngaliema / UPN", hit: "75%", color: "bg-emerald-500" },
                            { zone: "Kalamu / Victoire", hit: "64%", color: "bg-purple-500" },
                        ].map((z, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-[9px] font-black uppercase">
                                    <span className="text-white/60">{z.zone}</span>
                                    <span className="text-white">{z.hit}</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full ${z.color} rounded-full transition-all duration-1000`} style={{ width: z.hit }}></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="mt-8 w-full py-3 border border-white/10 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                        Voir le rapport complet
                    </button>
                </div>
            </div>

            {/* FOOTER ANALYTICS : Status système */}
            <div className="bg-[#d4af37]/10 border border-[#d4af37]/20 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping absolute inset-0"></div>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full relative"></div>
                    </div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">Synchronisation des données en temps réel active</p>
                </div>
                <p className="text-[8px] font-medium text-white/40 italic">Dernière mise à jour : {new Date().toLocaleTimeString()}</p>
            </div>

        </div>
    );
}



// --- SOUS-COMPOSANT : INVENTAIRE (Version Ultra-Luxe & Responsive) ---
function InventorySection({ mesFaces }: any) {
    return (
        <div className="space-y-6 md:space-y-10 pb-24 md:pb-0">
            {/* Header avec compteur d'actifs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">
                        Patrimoine <span className="text-[#d4af37]">des Faces</span>
                    </h3>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mt-2">
                        {mesFaces.length} Emplacements Stratégiques sous gestion
                    </p>
                </div>

                {/* Barre de recherche rapide intégrée à l'inventaire */}
                <div className="w-full md:w-auto flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-2 focus-within:border-[#d4af37]/50 transition-all">
                    <Search size={14} className="text-white/20 mr-2" />
                    <input type="text" placeholder="Filtrer par zone ou ID..." className="bg-transparent text-[10px] outline-none w-full md:w-48 font-bold uppercase" />
                </div>
            </div>

            {/* Grille d'inventaire */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-8">
                {mesFaces.map((face: any, i: number) => {
                    // Calcul d'un statut fictif pour le design
                    const isExpiring = i === 1; // Simulation

                    return (
                        <div key={i} className="bg-black/40 border border-white/10 rounded-[2.5rem] p-4 md:p-6 flex flex-col sm:flex-row gap-6 hover:bg-black/60 hover:border-[#d4af37]/30 transition-all group relative overflow-hidden">

                            {/* --- PARTIE IMAGE : LE PRODUIT --- */}
                            <div className="w-full sm:w-48 h-48 md:h-56 rounded-[2rem] overflow-hidden shadow-2xl relative shrink-0">
                                <img
                                    src={face.photoCampagneUrl || 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0'}
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-110"
                                />
                                <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black border border-white/20 uppercase tracking-widest">
                                    #{face.faceId}
                                </div>

                                {/* Badge Statut */}
                                <div className={`absolute bottom-4 right-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter border ${isExpiring ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                    }`}>
                                    {isExpiring ? 'Expiration Proche' : 'Diffusion Active'}
                                </div>
                            </div>

                            {/* --- PARTIE INFOS : LES DATA --- */}
                            <div className="flex-1 flex flex-col py-1">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-[#d4af37]">
                                        <MapPin size={12} />
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">{face.parentZone || 'Zone Kinshasa'}</span>
                                    </div>
                                    <h4 className="text-xl md:text-2xl font-black italic uppercase leading-tight tracking-tight group-hover:text-[#d4af37] transition-colors">
                                        {face.parentAdresse}
                                    </h4>
                                </div>

                                {/* Spécifications Techniques (Nouveau) */}
                                <div className="flex gap-4 mt-4">
                                    <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                                        <p className="text-[7px] font-black uppercase text-white/30">Format</p>
                                        <p className="text-[9px] font-bold">12m² • LED</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                                        <p className="text-[7px] font-black uppercase text-white/30">Flux</p>
                                        <p className="text-[9px] font-bold">Intense</p>
                                    </div>
                                </div>

                                {/* Timeline du Contrat */}
                                <div className="mt-6 space-y-2">
                                    <div className="flex justify-between items-end">
                                        <div className="flex gap-4">
                                            <div>
                                                <p className="text-[7px] font-black uppercase text-white/30">Début</p>
                                                <p className="text-[10px] font-black">{face.dateDebut}</p>
                                            </div>
                                            <div className="h-6 w-[1px] bg-white/10"></div>
                                            <div>
                                                <p className="text-[7px] font-black uppercase text-white/30">Fin prévue</p>
                                                <p className={`text-[10px] font-black ${isExpiring ? 'text-red-400' : 'text-white'}`}>{face.dateFin}</p>
                                            </div>
                                        </div>
                                        <button className="w-10 h-10 bg-[#d4af37]/10 text-[#d4af37] rounded-xl flex items-center justify-center hover:bg-[#d4af37] hover:text-black transition-all border border-[#d4af37]/20 shadow-lg">
                                            <Maximize2 size={16} />
                                        </button>
                                    </div>

                                    {/* Barre de progression du contrat */}
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${isExpiring ? 'bg-red-500' : 'bg-emerald-500'}`}
                                            style={{ width: isExpiring ? '85%' : '30%' }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}




import React, { useMemo, } from 'react';
import { Navigation2,  } from "lucide-react";
import 'leaflet/dist/leaflet.css';

 function MapSection({ userConnecte }: { userConnecte?: any }) {
    const [tousLesPanneaux, setTousLesPanneaux] = useState<any[]>([]);
    const [MapLib, setMapLib] = useState<any>(null);
    const [isMounted, setIsMounted] = useState(false);
    
    // État pour le mode de la carte
    const [mapMode, setMapMode] = useState<'dark' | 'light' | 'satellite'>('dark');

    const tileUrls = {
        dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    };

    // 1. Récupération des données Firestore
    useEffect(() => {
        const q = query(collection(db, "panneaux"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTousLesPanneaux(docs);
        });
        return () => unsubscribe();
    }, []);

    // 2. Initialisation Leaflet
    useEffect(() => {
        setIsMounted(true);
        const loadLeaflet = async () => {
            try {
                const [L, ReactLeaflet] = await Promise.all([
                    import('leaflet').then(m => m.default || m),
                    import('react-leaflet')
                ]);
                delete (L.Icon.Default.prototype as any)._getIconUrl;
                const RadarIcon = L.divIcon({
                    className: 'custom-radar-icon',
                    html: `<div class="flex items-center justify-center">
                             <div class="absolute w-8 h-8 bg-[#d4af37]/30 rounded-full animate-ping"></div>
                             <div class="relative w-4 h-4 bg-[#d4af37] border-2 border-black rounded-full shadow-[0_0_10px_#d4af37]"></div>
                           </div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                });
                L.Marker.prototype.options.icon = RadarIcon;
                setMapLib({ ...ReactLeaflet, L });
            } catch (e) { console.error(e); }
        };
        loadLeaflet();
    }, []);

    // 3. FILTRAGE CRITIQUE : Comparaison userConnecte.nomSociete VS face.clientNom
    const mesPointsGeo = useMemo(() => {
        const nomSocieteUser = userConnecte?.nomSociete?.toString().toLowerCase().trim();

        if (!nomSocieteUser) return [];

        return tousLesPanneaux
            .filter((pan) => {
                // On garde le panneau si au moins une de ses faces appartient à la société
                return pan.faces?.some((face: any) => 
                    face.clientNom?.toString().toLowerCase().trim() === nomSocieteUser
                );
            })
            .map((pan) => {
                const lat = parseFloat(pan.coords?.[0]);
                const lng = parseFloat(pan.coords?.[1]);
                if (isNaN(lat) || isNaN(lng)) return null;
                return { ...pan, lat, lng };
            })
            .filter(p => p !== null);
    }, [tousLesPanneaux, userConnecte]);

    if (!isMounted || !MapLib) {
        return (
            <div className="h-[70vh] bg-zinc-950 rounded-[3rem] flex flex-col items-center justify-center border border-white/5 shadow-2xl">
                <Target className="text-[#d4af37] animate-spin mb-4" size={40} />
                <p className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-black italic">Connexion Satellite...</p>
            </div>
        );
    }

    const { MapContainer, TileLayer, Marker, Popup, useMap } = MapLib;

    function RecenterHelper({ points }: { points: any[] }) {
        const map = useMap();
        useEffect(() => {
            if (points.length > 0) {
                const bounds = MapLib.L.latLngBounds(points.map((p: any) => [p.lat, p.lng]));
                map.fitBounds(bounds, { padding: [70, 70], maxZoom: 15 });
            }
        }, [points, map]);
        return null;
    }

    return (
        <div className="h-[70vh] rounded-[3.5rem] border-4 border-white/10 overflow-hidden relative bg-black shadow-2xl">
            
            {/* SÉLECTEUR DE MODE DE CARTE (Noir, Clair, Satellite) */}
            <div className="absolute top-8 right-8 z-[1000] flex flex-col gap-2">
                {[
                    { id: 'dark', label: 'Noir' },
                    { id: 'light', label: 'Clair' },
                    { id: 'satellite', label: 'Satellite' }
                ].map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => setMapMode(mode.id as any)}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                            mapMode === mode.id 
                            ? 'bg-[#d4af37] text-black border-[#d4af37]' 
                            : 'bg-black/60 text-white border-white/10 backdrop-blur-md hover:bg-black/80'
                        }`}
                    >
                        {mode.label}
                    </button>
                ))}
            </div>

            <MapContainer center={[-4.32, 15.30]} zoom={12} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                <TileLayer url={tileUrls[mapMode]} />
                <RecenterHelper points={mesPointsGeo} />

                {mesPointsGeo.map((pt) => (
                    <Marker key={pt.id} position={[pt.lat, pt.lng]}>
                        <Popup minWidth={260}>
                            <div className="bg-[#0a0a0a] text-white p-2 rounded-xl">
                                <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2 font-black text-[10px] uppercase">
                                    <Navigation2 size={12} className="text-[#d4af37]" />
                                    {pt.adresse || "DISPOSITIF GKM"}
                                </div>
                                <div className="space-y-2">
                                    {/* On affiche seulement les faces de CETTE société */}
                                    {pt.faces?.filter((f: any) => f.clientNom?.toString().toLowerCase().trim() === userConnecte?.nomSociete?.toString().toLowerCase().trim()).map((face: any, idx: number) => (
                                        <div key={idx} className="bg-[#d4af37]/10 p-2 rounded-lg border border-[#d4af37]/20 flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-[#d4af37] font-bold italic">VOTRE RÉSERVATION</span>
                                                <span className="text-[10px] font-black uppercase">Face {face.id || idx + 1}</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-emerald-400">EN LIGNE</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* OVERLAY D'INFORMATION */}
            <div className="absolute top-8 left-8 z-[1000] pointer-events-none">
                <div className="bg-black/80 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 flex items-center gap-4 shadow-2xl">
                    <div className="w-3 h-3 bg-[#d4af37] rounded-full animate-pulse"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                            {userConnecte?.nomSociete || "Chargement..."}
                        </span>
                        <span className="text-[9px] font-bold text-[#d4af37] uppercase">
                            {mesPointsGeo.length} Panneaux détectés
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}