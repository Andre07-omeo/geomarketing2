'use client';

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, MapPin, Server, Menu, X, ShieldCheck, 
  Database, Settings, Cpu, HardDrive, Bell, Eye, Globe, Activity, Zap 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// IMPORTS FIREBASE CORRIGÉS
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import PannelComponent from './lib/pannel';
import Userss from './lib/users';

// CONFIGURATION FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
  authDomain: "kin-geo-market.firebaseapp.com",
  projectId: "kin-geo-market",
  storageBucket: "kin-geo-market.firebasestorage.app",
  messagingSenderId: "50335362445",
  appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
};

// INITIALISATION SERVICES (En dehors du composant pour éviter les re-réglages)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [systemStats, setSystemStats] = useState({ cpu: 12, ram: 45 });

  // 1. Gestion des statistiques système
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats({
        cpu: Math.floor(Math.random() * 20) + 5,
        ram: Math.floor(Math.random() * 20) + 40
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // 2. Sécurité : Surveillance de la session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 3. Fonction de déconnexion
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Voulez-vous vraiment vous déconnecter ?");
    if (confirmLogout) {
      try {
        await signOut(auth);
        router.push('/');
      } catch (error) {
        console.error("Erreur lors de la déconnexion:", error);
      }
    }
  };

  const menuGroups = [
    { group: 'PRINCIPAL', items: [{ name: 'Dashboard', icon: LayoutDashboard }, { name: 'Alertes', icon: Bell }, { name: 'Audit', icon: Eye }] },
    { group: 'GESTION', items: [{ name: 'Utilisateurs', icon: Users }, { name: 'Panneaux', icon: MapPin }] },
    { group: 'SYSTÈME', items: [{ name: 'Maintenance', icon: Server }, { name: 'Sécurité', icon: ShieldCheck }, { name: 'Base de données', icon: Database }, { name: 'Configuration', icon: Settings }] }
  ];

  return (
    <div className="min-h-screen bg-[#001a33] flex text-zinc-900">

      {/* Overlay mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-white/95 backdrop-blur-xl border-r border-white/20 p-6 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-black italic bg-gradient-to-r from-blue-700 via-amber-500 to-red-600 bg-clip-text text-transparent">DISPROMALT</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-zinc-500"><X size={24} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto pr-2 space-y-6">
          {menuGroups.map((group) => (
            <div key={group.group}>
              <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mb-3 px-2">{group.group}</p>
              {group.items.map((item) => (
                <button
                  key={item.name}
                  onClick={() => { setActiveTab(item.name); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === item.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-600 hover:bg-zinc-100 hover:text-blue-700'}`}>
                  <item.icon size={18} /> {item.name}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 w-full lg:pl-72 min-h-screen flex flex-col bg-[#001a33] bg-[radial-gradient(circle_at_top_right,_#002b55_0%,_transparent_40%)]">
        
        {/* Header */}
        <header className="sticky top-0 z-30 flex justify-between items-center bg-white/[0.03] backdrop-blur-xl p-4 m-4 md:m-8 rounded-[2rem] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          <button className="p-3 hover:bg-white/10 rounded-xl lg:hidden text-white transition-all active:scale-95" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={22} />
          </button>

          {/* Stats Système */}
          <div className="hidden md:flex items-center gap-6 text-[10px] font-black text-white/40 bg-black/20 px-6 py-2.5 rounded-full border border-white/5 uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <Cpu size={14} className="text-amber-500 animate-pulse" /> CPU <span className="text-white">{systemStats.cpu}%</span>
            </span>
            <div className="w-[1px] h-3 bg-white/10" />
            <span className="flex items-center gap-2">
              <HardDrive size={14} className="text-blue-400" /> RAM <span className="text-white">{systemStats.ram}%</span>
            </span>
          </div>

          {/* Profil avec fonction Logout */}
          <div 
            className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-all group"
            onClick={handleLogout}
            title="Se déconnecter"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-white uppercase tracking-tighter italic group-hover:text-red-400">Admin User</p>
              <div className="flex justify-end items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <p className="text-[9px] text-red-500 font-black uppercase tracking-widest">Déconnexion</p>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-red-600 rounded-full blur opacity-25 group-hover:opacity-60 transition duration-500"></div>
              <div className="relative w-11 h-11 rounded-full bg-[#001a33] border-2 border-white/10 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full bg-gradient-to-tr from-blue-700 to-red-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Section Dynamique */}
        <section className="px-4 md:px-8 pb-8 flex-1">
          {activeTab === 'Dashboard' ? (
            <div className="space-y-10">
              <div className="flex items-baseline gap-4">
                  <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter uppercase">Dashboard</h2>
                  <div className="h-1 flex-1 bg-gradient-to-r from-[#d4af37]/50 to-transparent rounded-full opacity-20" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: 'Total Panneaux', value: '124', color: 'from-blue-600/20', icon: <Globe className="text-blue-400" /> },
                  { label: 'En Maintenance', value: '03', color: 'from-amber-600/20', icon: <Activity className="text-amber-500" /> },
                  { label: 'Alertes Système', value: '01', color: 'from-red-600/20', icon: <Zap className="text-red-500" /> }
                ].map((stat, i) => (
                  <div key={i} className={`group relative p-8 rounded-[2.5rem] bg-gradient-to-br ${stat.color} to-transparent border border-white/5 backdrop-blur-md hover:border-white/20 transition-all duration-500 shadow-xl overflow-hidden`}>
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                    <div className="relative flex justify-between items-start">
                      <div>
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{stat.label}</p>
                          <p className="text-5xl font-black text-white mt-2 italic tracking-tighter">{stat.value}</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:scale-110 transition-transform duration-500">
                          {stat.icon}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-[3rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.2)] min-h-[65vh] relative overflow-hidden">
              <div className="relative z-10">
                  {activeTab === 'Panneaux' ? (
                    <PannelComponent />
                  ) : activeTab === 'Utilisateurs' ? (
                    <Userss />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                      <div className="w-12 h-12 border-4 border-zinc-100 border-t-blue-600 rounded-full animate-spin" />
                      <p className="text-zinc-400 font-black uppercase tracking-[0.4em] text-[10px]">Initialisation du module {activeTab}</p>
                    </div>
                  )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}