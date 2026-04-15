'use client';

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, MapPin, Server, Menu, X, ShieldCheck, 
  Database, Settings, Cpu, HardDrive, Bell, Eye, Globe, Activity, Zap, TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// FIREBASE
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

import PannelComponent from './lib/pannel';
import Userss from './lib/users';

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
const auth = getAuth(app);

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [systemStats, setSystemStats] = useState({ cpu: 0, ram: 0 });
  const [dbStats, setDbStats] = useState({ totalPanneaux: 0, totalFaces: 0, totalUsers: 0 });

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const [snapP, snapU] = await Promise.all([
          getDocs(collection(db, "panneaux")),
          getDocs(collection(db, "users"))
        ]);
        let faces = 0;
        snapP.forEach(doc => faces += doc.data().nbFaces || 0);
        setDbStats({ totalPanneaux: snapP.size, totalFaces: faces, totalUsers: snapU.size });
      } catch (err) { console.error(err); }
    };
    fetchRealData();

    const interval = setInterval(() => {
      setSystemStats({
        cpu: Math.floor(Math.random() * 10) + 5,
        ram: Math.floor(Math.random() * 5) + 42
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { if (!user) router.push('/'); });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    if (window.confirm("Mettre fin à la session administrative ?")) {
      await signOut(auth);
      router.push('/');
    }
  };

  const menuGroups = [
    { group: 'PILOTAGE', items: [{ name: 'Dashboard', icon: LayoutDashboard }, { name: 'Audit', icon: Eye }] },
    { group: 'ACTIFS', items: [{ name: 'Panneaux', icon: MapPin }, { name: 'Utilisateurs', icon: Users }] },
    { group: 'INFRASTRUCTURE', items: [{ name: 'Base de données', icon: Database }, { name: 'Maintenance', icon: Server }] }
  ];

  return (
    <div className="min-h-screen bg-[#000d1a] flex text-zinc-100 font-sans selection:bg-amber-500/30">
      
      {/* Sidebar - Royal Blue & Gold Accents */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-[#001429] border-r border-amber-500/10 flex flex-col transform transition-transform duration-500 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full shadow-2xl shadow-black'}`}>
        <div className="p-10 text-center">
          <h1 className="text-3xl font-black italic tracking-tighter text-white">
            DISPRO<span className="text-amber-500">MALT</span>
          </h1>
          <div className="h-0.5 w-12 bg-gradient-to-r from-blue-600 via-amber-500 to-red-600 mx-auto mt-2" />
        </div>

        <nav className="flex-1 overflow-y-auto px-6 space-y-8">
          {menuGroups.map((group) => (
            <div key={group.group}>
              <p className="text-[9px] font-black text-amber-500/50 uppercase tracking-[0.3em] mb-5 px-4">{group.group}</p>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => { setActiveTab(item.name); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl font-bold text-xs transition-all duration-300 ${activeTab === item.name ? 'bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg shadow-blue-900/50 border border-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                    <item.icon size={18} className={activeTab === item.name ? 'text-amber-400' : ''} /> 
                    <span className="uppercase tracking-widest">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-8 border-t border-white/5">
          <button onClick={handleLogout} className="w-full py-4 rounded-xl border border-red-500/30 text-red-500 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all duration-500">
            Déconnexion sécurisée
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-72 min-h-screen bg-[#000d1a] bg-[radial-gradient(ellipse_at_top_right,_#001a33_0%,_transparent_50%)]">
        
        {/* Header - Glass Effect */}
        <header className="px-8 py-6 flex justify-between items-center sticky top-0 z-40 bg-[#000d1a]/60 backdrop-blur-2xl border-b border-white/5">
          <button className="lg:hidden p-3 text-amber-500" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>

          <div className="hidden md:flex gap-4">
            <SystemTag icon={<Cpu size={14}/>} label="CPU" value={`${systemStats.cpu}%`} color="text-amber-500" />
            <SystemTag icon={<HardDrive size={14}/>} label="RAM" value={`${systemStats.ram}%`} color="text-blue-400" />
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-white tracking-widest uppercase">Admin Principal</p>
              <p className="text-[8px] text-amber-500 font-bold uppercase">Dispromalt HQ</p>
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 p-1">
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-red-600 shadow-inner" />
            </div>
          </div>
        </header>

        {/* Dynamic Section */}
        <div className="p-8 md:p-12">
          {activeTab === 'Dashboard' ? (
            <div className="space-y-12 animate-in fade-in duration-1000">
              
              <div className="flex items-center gap-6">
                <div className="w-2 h-16 bg-gradient-to-b from-blue-600 via-amber-500 to-red-600 rounded-full" />
                <div>
                  <h2 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">Aperçu <br/><span className="text-amber-500">Global</span></h2>
                </div>
              </div>

              {/* Stats Grid - Blue Roi, Gold, Red */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <MainStatCard 
                  label="Parc de Panneaux" 
                  value={dbStats.totalPanneaux} 
                  icon={<Globe size={24}/>} 
                  sub="Dispositifs actifs"
                  gradient="from-blue-900/40 via-blue-800/10"
                  accent="border-blue-500/20"
                />
                <MainStatCard 
                  label="Volume d'Affichage" 
                  value={dbStats.totalFaces} 
                  icon={<TrendingUp size={24}/>} 
                  sub="Faces publicitaires"
                  gradient="from-amber-900/30 via-amber-800/5"
                  accent="border-amber-500/20"
                />
                <MainStatCard 
                  label="Équipe Technique" 
                  value={dbStats.totalUsers} 
                  icon={<Users size={24}/>} 
                  sub="Comptes certifiés"
                  gradient="from-red-900/30 via-red-800/5"
                  accent="border-red-500/20"
                />
              </div>

              {/* Status Section */}
              <div className="mt-16 bg-[#001429] rounded-[3rem] p-10 border border-amber-500/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Database size={200} className="text-amber-500" />
                </div>
                <div className="relative flex items-center gap-3 mb-10 text-emerald-500">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_emerald]" />
                   <span className="text-[10px] font-black uppercase tracking-[0.4em]">Système en ligne - Kinshasa Cloud</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                   <InfoBlock label="Moteur DB" value="Firestore" />
                   <InfoBlock label="Version App" value="v2.4.0-Gold" />
                   <InfoBlock label="Dernier Sync" value="Il y a 1 min" />
                   <InfoBlock label="Réseau" value="Optimal" />
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-[3.5rem] p-1 shadow-[0_40px_100px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-500 overflow-hidden">
               <div className="bg-zinc-50 rounded-[3.4rem] p-8 md:p-12 min-h-[75vh]">
                {activeTab === 'Panneaux' ? <PannelComponent /> : 
                 activeTab === 'Utilisateurs' ? <Userss /> : 
                 <div className="flex flex-col items-center justify-center h-[50vh] opacity-20">
                    <Zap size={64} className="text-blue-900 mb-6 animate-bounce" />
                    <p className="font-black text-blue-900 uppercase tracking-[0.5em] text-xs text-center">Chargement sécurisé du module {activeTab}</p>
                 </div>}
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS PRESTIGE ---

function SystemTag({ icon, label, value, color }: any) {
  return (
    <div className="bg-white/5 border border-white/5 px-4 py-2.5 rounded-xl flex items-center gap-3">
      <div className={color}>{icon}</div>
      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label} <span className="text-white ml-1">{value}</span></span>
    </div>
  );
}

function MainStatCard({ label, value, icon, sub, gradient, accent }: any) {
  return (
    <div className={`relative p-10 rounded-[3rem] bg-gradient-to-br ${gradient} to-transparent border ${accent} backdrop-blur-md hover:scale-[1.02] transition-all duration-700`}>
      <div className="flex justify-between items-start mb-6 text-white/30 italic">
        {icon}
        <span className="text-[8px] font-bold uppercase tracking-widest">Live Data</span>
      </div>
      <p className="text-7xl font-black text-white italic tracking-tighter mb-2 leading-none">
        {value < 10 && value > 0 ? `0${value}` : value}
      </p>
      <p className="text-[11px] font-black text-white/80 uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className="text-[9px] text-zinc-500 font-bold uppercase">{sub}</p>
    </div>
  );
}

function InfoBlock({ label, value }: any) {
  return (
    <div className="space-y-2">
      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-white font-mono text-lg font-bold tracking-tight">{value}</p>
    </div>
  );
}