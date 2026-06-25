'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Ruler, Calendar, Users, Phone, Building, Clock, Image as ImageIcon } from 'lucide-react';

// ============================================
// IMPORTATION DEPUIS LE FICHIER DE CONFIG
// ============================================
import config from '../../../../config/db';
import { EditPanneauModal } from '@/app/dashboard/superviseurs/page';
import { useRouter } from 'next/navigation';


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
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/80 text-lg font-bold uppercase tracking-wider">Chargement de la carte...</p>
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
  const [yBg, setYBg] = useState(0);
  const [selectedPanneau, setSelectedPanneau] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFace, setSelectedFace] = useState<{ index: number; data: any } | null>(null);

  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Récupérer l'utilisateur depuis l'URL ou localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');

    if (userParam) {
      try {
        const decodedUser = JSON.parse(decodeURIComponent(userParam));
        setUser({
          uid: decodedUser.uid,
          email: decodedUser.email,
          nomComplet: decodedUser.nom,
          nom: decodedUser.nom,
          role: decodedUser.role || "commercial"
        });
      } catch (e) {
        console.error("Erreur parsing user:", e);
      }
    }

    const storedUser = localStorage.getItem('current_user');
    if (storedUser && !userParam) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser({
          uid: parsedUser.uid,
          email: parsedUser.email,
          nomComplet: parsedUser.nom,
          nom: parsedUser.nom,
          role: parsedUser.role || "commercial"
        });
      } catch (e) {
        console.error("Erreur parsing stored user:", e);
      }
    }
  }, []);

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

  const handleEditPanneau = (panneau: any, faceIndex?: number, faceData?: any) => {
    setSelectedPanneau(panneau);
    if (faceIndex !== undefined && faceData) {
      setSelectedFace({ index: faceIndex, data: faceData });
    } else {
      setSelectedFace(null);
    }
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedPanneau(null);
    setSelectedFace(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-amber-500/30 rounded-full flex items-center justify-center animate-pulse">
            <MapPin size={40} className="text-amber-500" />
          </div>
          <p className="mt-6 text-white/80 text-xl font-bold uppercase tracking-wider">
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
        {selectedPanneau && !isEditModalOpen && (
          <PanneauModal
            panneau={selectedPanneau}
            onClose={() => setSelectedPanneau(null)}
            onEdit={handleEditPanneau}
          />
        )}
      </AnimatePresence>

      {isEditModalOpen && selectedPanneau && (
        <EditPanneauModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          panneau={selectedPanneau}
          user={user}
          preselectedFaceIndex={selectedFace?.index}
          preselectedFaceData={selectedFace?.data}
        />
      )}
    </div>
  );
}

// ============================================
// MODALE AMÉLIORÉE - TEXTES AGRANDIS
// ============================================
function PanneauModal({ panneau, onClose, onEdit }: any) {
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
      case 'libre': return { bg: 'bg-green-500/30', border: 'border-green-500/40', text: 'text-green-400', dot: 'bg-green-500' };
      case 'occupé': return { bg: 'bg-blue-500/30', border: 'border-blue-500/40', text: 'text-blue-400', dot: 'bg-blue-500' };
      case 'réservé': return { bg: 'bg-amber-500/30', border: 'border-amber-500/40', text: 'text-amber-400', dot: 'bg-amber-500' };
      default: return { bg: 'bg-gray-500/30', border: 'border-gray-500/40', text: 'text-gray-400', dot: 'bg-gray-500' };
    }
  };

  const faces = panneau.faces || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl md:max-w-3xl rounded-2xl overflow-hidden shadow-2xl bg-white"
      >
        {/* ============================================ */}
        {/* HEADER - BLEU ROI PROFOND - AGRANDI */}
        {/* ============================================ */}
        <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-900 p-5 sm:p-6 border-b border-white/15">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* ID Panneau */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tighter">
                {panneau.idPan || panneau.id}
              </h2>
              <button
                onClick={onClose}
                className="sm:hidden p-2 bg-white/15 hover:bg-red-500/80 rounded-xl transition-all duration-300 active:scale-95"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Dimension */}
            <div className="flex items-center gap-2 text-sm sm:text-base text-blue-200 font-bold">
              <Ruler size={16} className="text-amber-400 shrink-0" />
              <span>{panneau.dimension || 'N/A'}</span>
            </div>

            {/* Adresse */}
            <div className="flex items-center gap-2 text-sm sm:text-base text-blue-200 min-w-0 flex-1 font-bold">
              <MapPin size={16} className="text-amber-400 shrink-0" />
              <span className="truncate">{panneau.adresse || 'Adresse non définie'}</span>
            </div>

            {/* Bouton fermeture Desktop */}
            <button
              onClick={onClose}
              className="hidden sm:block shrink-0 p-2 bg-white/15 hover:bg-red-500/80 rounded-xl transition-all duration-300 active:scale-95"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* ============================================ */}
        {/* RÉSUMÉ DES FACES - LIGNE STATS AGRANDIE */}
        {/* ============================================ */}
        <div className="p-4 sm:p-5 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-3 flex-wrap">
            {faces.map((face: any, idx: number) => {
              const activeRes = getActiveReservation(face);
              const currentStatus = activeRes?.statut || face.statut || 'Libre';
              const colors = getStatusColor(currentStatus);
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.bg} border ${colors.border}`}
                >
                  <div className={`w-2 h-2 rounded-full ${colors.dot} ${currentStatus === 'Libre' ? 'animate-pulse' : ''}`} />
                  <span className="text-xs sm:text-sm font-bold text-gray-800">F{idx + 1}</span>
                  <span className={`text-xs sm:text-sm font-black uppercase ${colors.text}`}>
                    {currentStatus === 'Libre' ? 'L' : currentStatus === 'Occupé' ? 'O' : currentStatus === 'Réservé' ? 'R' : 'M'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============================================ */}
        {/* LISTE DES FACES - SCROLLABLE AGRANDIE */}
        {/* ============================================ */}
        <div className="max-h-[55vh] sm:max-h-[60vh] overflow-y-auto p-4 sm:p-5 bg-gray-50 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className={`p-4 rounded-xl ${colors.bg} border ${colors.border} transition-all hover:shadow-lg hover:scale-[1.02] bg-white`}
                >
                  {/* En-tête de la face */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                      <span className="text-base sm:text-lg font-black text-gray-800 shrink-0">Face {idx + 1}</span>
                      {face.sens && (
                        <span className="text-xs sm:text-sm px-2 py-0.5 bg-gray-200 rounded-full text-gray-600 truncate max-w-[100px] font-bold">
                          {face.sens}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className={`w-2 h-2 rounded-full ${colors.dot} ${currentStatus === 'Libre' ? 'animate-pulse' : ''}`} />
                      <span className={`text-xs sm:text-sm font-black uppercase ${colors.text}`}>
                        {currentStatus}
                      </span>
                    </div>

                    {/* Bouton de réservation - AGRANDI */}
                    <button
                      onClick={() => {
                        onEdit(panneau, idx, face);
                      }}
                      className="shrink-0 ml-1 px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 transition-all text-xs sm:text-sm font-bold uppercase border border-blue-500/30 hover:scale-105"
                      title="Réserver cette face"
                    >
                      Réserver
                    </button>
                  </div>

                  {/* Détails de la réservation active */}
                  {isOccupied && activeRes && (
                    <div className="mt-3 pt-3 border-t-2 border-gray-200">
                      <div className="flex gap-3">
                        {activeRes.photoCampagneUrl && (
                          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border-2 border-gray-200 shadow-md shrink-0">
                            <img
                              src={activeRes.photoCampagneUrl}
                              alt="Campagne"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div className="flex-1 min-w-0 space-y-1 text-xs sm:text-sm">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Building size={14} className="sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                            <span className="truncate font-bold">{activeRes.societeLocatrice || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Users size={14} className="sm:w-4 sm:h-4 text-blue-500 shrink-0" />
                            <span className="truncate font-bold">{activeRes.agentNom || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-500">
                            <Calendar size={14} className="sm:w-4 sm:h-4 text-blue-400 shrink-0" />
                            <span className="truncate text-xs sm:text-sm font-bold">
                              {activeRes.dateDebut} → {activeRes.dateFin}
                            </span>
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

        {/* ============================================ */}
        {/* FOOTER AVEC LÉGENDE - AGRANDI */}
        {/* ============================================ */}
        <div className="p-4 sm:p-5 border-t-2 border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-wider font-bold">
              {faces.length} face(s) • Cliquez en dehors pour fermer
            </p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs sm:text-sm font-bold text-gray-600">Libre</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs sm:text-sm font-bold text-gray-600">Occupé</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs sm:text-sm font-bold text-gray-600">Réservé</span>
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(37, 99, 235, 0.4);
          border-radius: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(37, 99, 235, 0.6);
        }
      `}</style>
    </motion.div>
  );
}