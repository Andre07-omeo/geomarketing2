'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Ruler, Calendar, Users, Phone, Building, Clock, Image as ImageIcon } from 'lucide-react';

// ============================================
// IMPORTATION DEPUIS LE FICHIER DE CONFIG
// ============================================
import config from '../../../../config/db';

// ============================================
// INITIALISATION FIREBASE
// ============================================
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const app = !getApps().length ? initializeApp(config.firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// ============================================
// COMPOSANT MAP DYNAMIQUE
// ============================================
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Chargement de la carte...</p>
      </div>
    </div>
  ),
});

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export default function FullscreenMap() {
  const [panneaux, setPanneaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPanneau, setSelectedPanneau] = useState<any>(null);
  const [yBg, setYBg] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "panneaux"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPanneaux(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setYBg(window.scrollY * 0.2);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center animate-pulse">
            <MapPin size={32} className="text-amber-500" />
          </div>
          <p className="mt-4 text-white/60 text-sm font-bold uppercase tracking-wider">
            Chargement des panneaux...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden relative bg-[#0a1628]">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.img
          src="/fond.jpg"
          alt="Background"
          style={{ y: yBg }}
          className="absolute top-0 left-0 w-full h-[115%] object-cover opacity-20 blur-[1px]"
        />
      </div>

      <div className="absolute inset-0 z-10">
        <MapComponent
          onMarkerClick={setSelectedPanneau}
          panneaux={panneaux}
        />
      </div>

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
// MODALE AMÉLIORÉE - ULTRA COMPACTE
// ============================================
function PanneauModal({ panneau, onClose }: any) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  if (!panneau) return null;

  const getActiveReservation = (face: any) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const reservations = face.reservations || [];
    return reservations.find((res: any) => {
      const debut = new Date(res.dateDebut);
      const fin = new Date(res.dateFin);
      debut.setHours(0, 0, 0, 0);
      fin.setHours(0, 0, 0, 0);
      return now >= debut && now <= fin;
    });
  };

  const getStatusColor = (statut: string) => {
    switch (statut?.toLowerCase()) {
      case 'libre': return { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400', dot: 'bg-green-500' };
      case 'occupé': return { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-500' };
      case 'réservé': return { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-500' };
      default: return { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400', dot: 'bg-gray-500' };
    }
  };

  const faces = panneau.faces || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md sm:max-w-lg md:max-w-2xl rounded-xl overflow-hidden shadow-2xl"
        style={{
          backgroundImage: `url('/fond.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay semi-transparent pour lisibilité */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* CONTENU */}
        <div className="relative z-10">
          {/* HEADER ULTRA COMPACT */}
          <div className="p-3 sm:p-4 border-b border-white/10">
            {/* Mobile: colonne, Desktop: ligne avec 3 colonnes */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              {/* ID Panneau */}
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tighter">
                  {panneau.idPan || panneau.id}
                </h2>
                <button
                  onClick={onClose}
                  className="sm:hidden p-1.5 bg-white/10 hover:bg-red-500/80 rounded-lg transition-all duration-300 active:scale-95"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>

              {/* Dimension */}
              <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-white/60">
                <Ruler size={10} className="text-amber-400 shrink-0" />
                <span>{panneau.dimension || 'N/A'}</span>
              </div>

              {/* Adresse */}
              <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-white/60 min-w-0 flex-1">
                <MapPin size={10} className="text-amber-400 shrink-0" />
                <span className="truncate">{panneau.adresse || 'Adresse non définie'}</span>
              </div>

              {/* Bouton fermeture Desktop */}
              <button
                onClick={onClose}
                className="hidden sm:block shrink-0 p-1.5 bg-white/10 hover:bg-red-500/80 rounded-lg transition-all duration-300 active:scale-95"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          </div>

          {/* RÉSUMÉ DES FACES - LIGNE STATS */}
          <div className="p-3 sm:p-4 border-b border-white/10">
            <div className="flex gap-2 flex-wrap">
              {faces.map((face: any, idx: number) => {
                const activeRes = getActiveReservation(face);
                const currentStatus = activeRes?.statut || face.statut || 'Libre';
                const colors = getStatusColor(currentStatus);
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${colors.bg} border ${colors.border}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${currentStatus === 'Libre' ? 'animate-pulse' : ''}`} />
                    <span className="text-[8px] font-bold text-white">F{idx + 1}</span>
                    <span className={`text-[7px] font-black uppercase ${colors.text}`}>
                      {currentStatus === 'Libre' ? 'L' : currentStatus === 'Occupé' ? 'O' : currentStatus === 'Réservé' ? 'R' : 'M'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LISTE DES FACES - SCROLLABLE */}
          <div className="max-h-[50vh] sm:max-h-[55vh] overflow-y-auto p-3 sm:p-4 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {faces.map((face: any, idx: number) => {
                const activeRes = getActiveReservation(face);
                const currentStatus = activeRes?.statut || face.statut || 'Libre';
                const colors = getStatusColor(currentStatus);
                const isOccupied = currentStatus === 'Occupé' || currentStatus === 'Réservé';

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-2 rounded-lg ${colors.bg} border ${colors.border} transition-all hover:scale-[1.02]`}
                  >
                    {/* En-tête de la face */}
                    <div className="flex justify-between items-start gap-1">
                      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-[11px] sm:text-xs font-black text-white shrink-0">Face {idx + 1}</span>
                        {face.sens && (
                          <span className="text-[6px] sm:text-[7px] px-1 py-0.5 bg-white/10 rounded-full text-white/60 truncate max-w-[80px]">
                            {face.sens}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${currentStatus === 'Libre' ? 'animate-pulse' : ''}`} />
                        <span className={`text-[7px] sm:text-[8px] font-black uppercase ${colors.text}`}>{currentStatus}</span>
                      </div>
                    </div>

                    {/* Détails de la réservation active */}
                    {isOccupied && activeRes && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        {/* Photo miniature + Infos en ligne */}
                        <div className="flex gap-2">
                          {activeRes.photoCampagneUrl && (
                            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-md overflow-hidden border border-white/20 shadow-sm shrink-0">
                              <img
                                src={activeRes.photoCampagneUrl}
                                alt="Campagne"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {/* Infos compactes en colonne */}
                          <div className="flex-1 min-w-0 space-y-0.5 text-[7px] sm:text-[8px]">
                            <div className="flex items-center gap-1 text-white/70">
                              <Building size={6} className="sm:w-[7px] sm:h-[7px] text-amber-400 shrink-0" />
                              <span className="truncate">{activeRes.societeLocatrice || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-white/70">
                              <Users size={6} className="sm:w-[7px] sm:h-[7px] text-amber-400 shrink-0" />
                              <span className="truncate">{activeRes.agentNom || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-white/70">
                              <Calendar size={6} className="sm:w-[7px] sm:h-[7px] text-amber-400 shrink-0" />
                              <span className="truncate">{activeRes.dateDebut} → {activeRes.dateFin}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
          {/* FOOTER */}
          <div className="p-2 border-t border-white/10 bg-black/30">
            <p className="text-[6px] text-white/30 text-center uppercase tracking-wider">
              {faces.length} face(s) • Cliquez en dehors pour fermer
            </p>
          </div>
        </div>
      </motion.div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.4);
          border-radius: 3px;
        }
      `}</style>
    </motion.div>
  );
}