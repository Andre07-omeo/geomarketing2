'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ============================================
// CONFIGURATION FIREBASE
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
  authDomain: "kin-geo-market.firebaseapp.com",
  projectId: "kin-geo-market",
  storageBucket: "kin-geo-market.firebasestorage.app",
  messagingSenderId: "50335362445",
  appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// ============================================
// COMPOSANT MAP DYNAMIQUE
// ============================================
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
 
});

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export default function FullscreenMap() {
  const [panneaux, setPanneaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPanneau, setSelectedPanneau] = useState<any>(null);
  const [yBg, setYBg] = useState(0);

  // Chargement des données Firebase
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "panneaux"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPanneaux(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Effet parallaxe léger
  useEffect(() => {
    const handleScroll = () => {
      setYBg(window.scrollY * 0.2);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  return (
    <div className="h-screen w-full overflow-hidden relative bg-[#0a1628]">
      
      {/* BACKGROUND PARALLAXE */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.img
          src="/fond.jpg"
          alt="Background"
          style={{ y: yBg }}
          className="absolute top-0 left-0 w-full h-[115%] object-cover opacity-20 blur-[1px]"
        />
      </div>

      {/* CARTE PLEIN ÉCRAN */}
      <div className="absolute inset-0 z-10">
        <MapComponent
          onMarkerClick={setSelectedPanneau}
          panneaux={panneaux}
        />
      </div>

      {/* MODALE DÉTAIL PANNAU */}
      <AnimatePresence>
        {selectedPanneau && (
          <PanneauModal
            panneau={selectedPanneau}
            onClose={() => setSelectedPanneau(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// MODALE DÉTAIL PANNAU
// ============================================
function PanneauModal({ panneau, onClose }: any) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  if (!panneau) return null;

  // Vérifier si au moins une face est libre
  const hasLibre = panneau.faces?.some((f: any) => f.statut === 'Libre');
  const globalStatus = hasLibre ? 'Disponible' : 'Occupé';
  const statusColor = hasLibre ? 'emerald' : 'red';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 50 }}
        transition={{ type: "spring", damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-gradient-to-br from-[#0d1f3c] to-[#0a1628] rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
      >
        {/* HEADER */}
        <div className="relative p-5 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-red-500/80 rounded-xl transition-all"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full bg-${statusColor}-500 animate-pulse`} />
            <span className={`text-${statusColor}-400 text-[9px] font-black uppercase tracking-wider`}>
              {globalStatus}
            </span>
          </div>

          <h2 className="text-2xl font-black text-white">{panneau.idPan || panneau.id}</h2>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {panneau.zone && (
              <span className="px-2 py-0.5 bg-white/10 rounded-md text-[8px] font-bold">
                📍 {panneau.zone}
              </span>
            )}
            {panneau.type && (
              <span className="px-2 py-0.5 bg-white/10 rounded-md text-[8px] font-bold">
                🔧 {panneau.type}
              </span>
            )}
            {panneau.dimension && (
              <span className="px-2 py-0.5 bg-white/10 rounded-md text-[8px] font-bold">
                📐 {panneau.dimension}
              </span>
            )}
          </div>
        </div>

        {/* CORPS : FACES */}
        <div className="p-5 max-h-[50vh] overflow-y-auto">
          <h3 className="text-[9px] font-black text-amber-400 uppercase tracking-wider mb-3">
            Faces du panneau ({panneau.faces?.length || 0})
          </h3>
          
          <div className="space-y-3">
            {(panneau.faces || []).map((face: any, idx: number) => (
              <FaceCard key={idx} face={face} />
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t border-white/10 bg-black/20">
          <p className="text-[7px] text-white/30 text-center uppercase tracking-wider">
            Cliquez en dehors pour fermer
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// CARTE FACE INDIVIDUELLE
// ============================================
function FaceCard({ face }: any) {
  const status = face.statut || 'Inconnu';
  
  const getStatusStyle = () => {
    switch(status) {
      case 'Libre': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' };
      case 'Occupé': return { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500' };
      case 'Réservé': return { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-500' };
      default: return { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-500' };
    }
  };
  
  const style = getStatusStyle();

  return (
    <div className={`${style.bg} rounded-xl p-3 border border-white/10`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[7px] text-white/40 uppercase tracking-wider">Face</p>
          <p className="font-bold text-white text-sm">{face.sens || 'Standard'}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />
          <span className={`${style.text} text-[7px] font-black uppercase`}>{status}</span>
        </div>
      </div>
      
      
    </div>
  );
}