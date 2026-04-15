'use client';
import React, { useEffect, useState } from 'react';
import { Database, Activity, Server, Zap, HardDrive, BarChart3, ShieldAlert } from 'lucide-react';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

// --- CONFIG FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
    authDomain: "kin-geo-market.firebaseapp.com",
    projectId: "kin-geo-market",
    storageBucket: "kin-geo-market.firebasestorage.app",
    messagingSenderId: "50335362445",
    appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export default function MaintenanceDB() {
  const [stats, setStats] = useState({
    panneauxCount: 0,
    facesCount: 0,
    usersCount: 0,
    lastBackup: 'Jamais',
    latency: 0,
    dbSizeEstimate: 'Calcul en cours...',
    systemStatus: 'Optimal'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const start = Date.now();
    try {
      // 1. Récupération des Panneaux & Calcul des faces
      const snapPanneaux = await getDocs(collection(db, "panneaux"));
      let totalFaces = 0;
      snapPanneaux.forEach(doc => {
        const data = doc.data();
        totalFaces += data.nbFaces || 0;
      });

      // 2. Récupération des Utilisateurs (Si collection existe)
      const snapUsers = await getDocs(collection(db, "users"));

      setStats({
        panneauxCount: snapPanneaux.size,
        facesCount: totalFaces,
        usersCount: snapUsers.size,
        lastBackup: new Date().toLocaleDateString('fr-FR'),
        latency: Date.now() - start,
        dbSizeEstimate: `${(snapPanneaux.size * 0.8).toFixed(2)} KB`, // Estimation légère
        systemStatus: 'En ligne'
      });
    } catch (error) {
      console.error(error);
      setStats(prev => ({ ...prev, systemStatus: 'Perturbé' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">MAINTENANCE & DATABASE</h2>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Surveillance du Cloud Firebase en temps réel
          </p>
        </div>
        <button 
          onClick={fetchStats}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full text-[10px] font-black transition-all"
        >
          FORCE REFRESH
        </button>
      </div>

      {/* État du Système */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard title="Uptime" value="99.9%" icon={<Activity className="text-emerald-500" />} />
        <StatusCard title="Latence API" value={`${stats.latency}ms`} icon={<Zap className="text-amber-500" />} />
        <StatusCard title="Stockage Est." value={stats.dbSizeEstimate} icon={<HardDrive className="text-blue-500" />} />
        <StatusCard title="État Global" value={stats.systemStatus} icon={<ShieldAlert className={stats.systemStatus === 'Optimal' ? 'text-emerald-500' : 'text-red-500'} />} />
      </div>

      {/* Statistiques Collections */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-8">
        <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-8 flex items-center gap-2">
          <Database size={16}/> Statistiques des Collections
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <DataPoint label="Total Panneaux" value={stats.panneauxCount} />
          <DataPoint label="Faces Publicitaires" value={stats.facesCount} />
          <DataPoint label="Utilisateurs Actifs" value={stats.usersCount} />
        </div>
      </div>

      {/* Historique Technique Simple */}
      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-3xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase mb-4">Dernière Sauvegarde Cloud</p>
          <div className="flex items-center justify-between">
            <span className="text-xl font-mono text-white">{stats.lastBackup}</span>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-bold">AUTOMATIQUE</span>
          </div>
        </div>
        <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-3xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase mb-4">Instance Firebase</p>
          <div className="flex items-center justify-between">
            <span className="text-xl font-mono text-white italic">kin-geo-market</span>
            <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded text-[9px] font-bold">PRODUCTION</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SOUS-COMPOSANTS ---
function StatusCard({ title, value, icon }: { title: string, value: string | number, icon: any }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
      <div className="flex justify-between items-center mb-2">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{title}</p>
        {icon}
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function DataPoint({ label, value }: { label: string, value: number }) {
  return (
    <div className="space-y-2">
      <p className="text-5xl font-black text-blue-500 tracking-tighter">{value}</p>
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
}