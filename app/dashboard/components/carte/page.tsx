'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Ruler, Calendar, Users, Building, Clock, Image as ImageIcon, Edit3, Save, Camera, CheckCircle, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRouter } from 'next/navigation';
import config from '../../../../config/db';

// ============================================
// INITIALISATION FIREBASE
// ============================================
const app = !getApps().length ? initializeApp(config.firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

const CLOUDINARY_UPLOAD_PRESET = config.UPLOAD_PRESET;
const CLOUDINARY_CLOUD_NAME = "dn7wnikzp";

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
    const [selectedReservationData, setSelectedReservationData] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    const router = useRouter();


    useEffect(() => {
        // 1. D'abord essayer de récupérer depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('user');

        if (userParam) {
            try {
                const decodedUser = JSON.parse(decodeURIComponent(userParam));
                setUser({
                    uid: decodedUser.uid,
                    email: decodedUser.email,
                    nomComplet: decodedUser.nomComplet || decodedUser.nom,
                    nom: decodedUser.nom,
                    role: decodedUser.role || "superviseur"
                });
                console.log("Utilisateur chargé depuis l'URL");
                // Sauvegarder dans localStorage pour persistance
                localStorage.setItem('user', JSON.stringify(decodedUser));
                return;
            } catch (e) {
                console.error("Erreur parsing user depuis URL:", e);
            }
        }
        // Puis écouter les changements Firebase
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
                    const userData = userDoc.data();

                    const userInfo = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        nomComplet: userData?.nomComplet || userData?.nom || firebaseUser.displayName || firebaseUser.email?.split('@')[0],
                        nom: userData?.nom || userData?.nomComplet,
                        role: userData?.role || "superviseur",
                        photoURL: userData?.photoURL || firebaseUser.photoURL
                    };

                    setUser(userInfo);
                    // Sauvegarder dans localStorage
                    localStorage.setItem('user', JSON.stringify(userInfo));
                    console.log("Utilisateur chargé depuis Firebase:", userInfo);
                } catch (error) {
                    console.error("Erreur chargement user depuis Firebase:", error);
                }
            } else {
                console.log("Aucun utilisateur connecté");
            }
        });

        return () => unsubscribe();
    }, []);

    // Récupération des panneaux
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "panneaux"), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPanneaux(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Récupération de la position GPS avec haute précision
    useEffect(() => {
        const getLocation = () => {
            const options: PositionOptions = {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0
            };

            if (!navigator.geolocation) {
                setLocationError("La géolocalisation n'est pas supportée");
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    console.log(`Position GPS obtenue - Latitude: ${pos.coords.latitude}, Longitude: ${pos.coords.longitude}, Précision: ${pos.coords.accuracy}m`);
                    setUserLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                },
                (err) => {
                    console.error("Erreur GPS:", err);
                    let errorMsg = "Impossible d'obtenir votre position";
                    if (err.code === 1) errorMsg = "Accès à la localisation refusé";
                    if (err.code === 2) errorMsg = "Position indisponible";
                    if (err.code === 3) errorMsg = "Délai d'obtention dépassé";
                    setLocationError(errorMsg);
                },
                options
            );
        };

        getLocation();

        // Rafraîchir la position toutes les 30 secondes
        const interval = setInterval(getLocation, 30000);
        return () => clearInterval(interval);
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

    const handleSelectReservation = (panneauData: any, reservationItem: any) => {
        setSelectedPanneau(panneauData);
        setSelectedReservationData({
            ...reservationItem,
            panneauId: panneauData.id,
            panneauDocId: panneauData.id
        });
    };

    return (
        <div className="h-screen w-full overflow-hidden relative bg-[#0a1628]">
            {/* Image de fond */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <img
                    src="/fond.jpg"
                    alt="Background"
                    className="absolute top-0 left-0 w-full h-full object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
            </div>

            {/* Indicateur GPS */}
            {userLocation && (
                <div className="absolute bottom-4 left-4 z-[1000] bg-black/60 backdrop-blur-xl rounded-full px-3 py-1.5 border border-emerald-500/30">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75" />
                        </div>
                        <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider">
                            GPS Actif
                        </span>
                    </div>
                </div>
            )}

            {locationError && (
                <div className="absolute bottom-4 left-4 z-[1000] bg-black/60 backdrop-blur-xl rounded-full px-3 py-1.5 border border-red-500/30">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full" />
                        <span className="text-[8px] text-red-400 font-bold uppercase tracking-wider">
                            {locationError}
                        </span>
                    </div>
                </div>
            )}

            {/* Carte avec position utilisateur */}
            <div className="absolute inset-0 z-10">
                <MapComponent
                    onMarkerClick={setSelectedPanneau}
                    panneaux={panneaux}

                    userLocation={userLocation}
                />
            </div>

            {/* Modal Liste des réservations du panneau */}
            <AnimatePresence>
                {selectedPanneau && !selectedReservationData && (
                    <PanneauReservationListModal
                        panneau={selectedPanneau}
                        onClose={() => setSelectedPanneau(null)}
                        onSelectReservation={(item: any) => handleSelectReservation(selectedPanneau, item)}
                    />
                )}
            </AnimatePresence>

            {/* Modal Détail et modification d'une réservation */}
            <AnimatePresence>
                {selectedReservationData && selectedPanneau && (
                    <ReservationDetailModal
                        reservationData={selectedReservationData}
                        panneau={selectedPanneau}
                        onClose={() => {
                            setSelectedReservationData(null);
                            setSelectedPanneau(null);
                        }}
                        user={user}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// MODALE - LISTE DES RÉSERVATIONS DU PANNEAU
// ============================================
function PanneauReservationListModal({ panneau, onClose, onSelectReservation }: any) {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    if (!panneau) return null;

    // Récupérer toutes les réservations actives et futures
    const getAllActiveReservations = () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const allReservations: Array<{
            faceIndex: number;
            faceSens: string;
            reservation: any;
            reservationIndex: number;
            daysLeft: number;
            isCurrent: boolean;
        }> = [];

        const faces = panneau.faces || [];

        faces.forEach((face: any, faceIndex: number) => {
            const reservations = face.reservations || [];

            reservations.forEach((res: any, resIndex: number) => {
                if (res.dateDebut && res.dateFin) {
                    const debut = new Date(res.dateDebut);
                    const fin = new Date(res.dateFin);
                    debut.setHours(0, 0, 0, 0);
                    fin.setHours(0, 0, 0, 0);

                    if (fin >= now) {
                        const isCurrent = now >= debut && now <= fin;
                        const daysLeft = Math.ceil((fin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                        allReservations.push({
                            faceIndex: faceIndex,
                            faceSens: face.sens || `Face ${faceIndex + 1}`,
                            reservation: res,
                            reservationIndex: resIndex,
                            daysLeft: daysLeft,
                            isCurrent
                        });
                    }
                }
            });
        });

        return allReservations.sort((a, b) => a.daysLeft - b.daysLeft);
    };

    const reservations = getAllActiveReservations();
    const faces = panneau.faces || [];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
            <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full sm:w-[500px] md:w-[600px] max-h-[85vh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
                style={{
                    backgroundImage: `url('/fond.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

                <div className="relative z-10 flex flex-col h-full">
                    {/* Header */}
                    <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-black/50 to-transparent">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-black text-white">
                                    {panneau.idPan || panneau.id}
                                </h2>
                                <p className="text-[10px] text-white/40 mt-0.5 flex items-center gap-1">
                                    <MapPin size={10} className="text-amber-400" />
                                    {panneau.adresse?.split('/').slice(-3).join(' / ') || 'Adresse'}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[7px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                                        {faces.length} face(s)
                                    </span>
                                    {panneau.type && (
                                        <span className="text-[7px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                                            {panneau.type}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/10 hover:bg-red-500/80 rounded-xl transition-all"
                            >
                                <X size={18} className="text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Liste des réservations */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {reservations.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-3">
                                    <Calendar size={24} className="text-white/30" />
                                </div>
                                <p className="text-white/40 text-sm">Aucune réservation active</p>
                            </div>
                        ) : (
                            reservations.map((item, idx) => {
                                const res = item.reservation;
                                return (
                                    <motion.button
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => onSelectReservation(item)}
                                        className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/30 hover:bg-white/10 transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${item.isCurrent ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                                                <span className="font-bold text-white text-sm">
                                                    Face {item.faceIndex + 1}
                                                </span>
                                                {item.faceSens && item.faceSens !== `Face ${item.faceIndex + 1}` && (
                                                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                                                        {item.faceSens}
                                                    </span>
                                                )}
                                            </div>
                                            {item.isCurrent && (
                                                <span className="text-[8px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                                                    EN COURS
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <Building size={12} className="text-amber-400" />
                                                <span className="text-sm text-white/80">{res.societeLocatrice || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Users size={12} className="text-amber-400" />
                                                <span className="text-xs text-white/60">{res.agentNom || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock size={12} className="text-amber-400" />
                                                <span className="text-xs text-white/60">
                                                    Échéance: {res.dateFin ? new Date(res.dateFin).toLocaleDateString('fr-FR') : 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex justify-end">
                                            <ChevronRight size={16} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </motion.button>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-white/10 bg-black/30">
                        <p className="text-[7px] text-white/30 text-center">
                            {reservations.length} réservation(s) active(s)
                        </p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// MODALE - DÉTAIL ET MODIFICATION D'UNE RÉSERVATION
// ============================================
function ReservationDetailModal({ reservationData, panneau, onClose, user }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [newPhotoUrl, setNewPhotoUrl] = useState("");
    const [newStatut, setNewStatut] = useState("");
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const [modificationMessage, setModificationMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);



    // Dans ReservationDetailModal, ajoutez ces états :
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);



    if (!reservationData || !panneau) return null;

    const res = reservationData.reservation;
    const isCurrent = reservationData.isCurrent;
    const daysLeft = reservationData.daysLeft;
    const faceIndex = reservationData.faceIndex;
    const reservationIndex = reservationData.reservationIndex;

    // Upload vers Cloudinary
    const uploadPhoto = async (file: File): Promise<string | null> => {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: data
            });
            const fileData = await response.json();
            if (response.ok) {
                return fileData.secure_url;
            }
            console.error("Erreur Cloudinary:", fileData);
            return null;
        } catch (error) {
            console.error("Erreur upload:", error);
            return null;
        }
    };






    // ============================================
    // CAPTURE PHOTO AVEC WEBCAM
    // ============================================

    // Fonction pour démarrer la caméra
    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                await videoRef.current.play();
            }
            setShowCamera(true);
        } catch (error) {
            console.error("Erreur d'accès à la caméra:", error);
            alert("Impossible d'accéder à la caméra. Vérifiez les permissions.");
        }
    };

    // Fonction pour capturer la photo
    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d');
        if (!context) return;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convertir en fichier
        canvas.toBlob(async (blob) => {
            if (!blob) return;

            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });

            // Arrêter la caméra
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
            setShowCamera(false);

            // Uploader la photo
            await handlePhotoUploadFile(file);
        }, 'image/jpeg', 0.9);
    };

    // Fonction pour fermer la caméra
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setShowCamera(false);
    };

    // Fonction pour gérer l'upload de fichier (photo ou capture)
    const handlePhotoUploadFile = async (file: File) => {
        setUploading(true);
        const objectUrl = URL.createObjectURL(file);
        setLocalPreview(objectUrl);

        const uploadedUrl = await uploadPhoto(file);
        if (uploadedUrl) {
            setNewPhotoUrl(uploadedUrl);
            setNewStatut("Occupé");
            setModificationMessage("✓ Photo téléchargée - Statut automatiquement mis à jour vers 'Occupé'");
            setIsEditing(true);
        } else {
            alert("Erreur lors de l'upload de la photo");
            setLocalPreview(null);
        }
        setUploading(false);
    };

    // Modifiez handlePhotoUpload existant
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await handlePhotoUploadFile(file);
    };






















    // Sauvegarder les modifications
    // Sauvegarder les modifications - Version modifiée
    const handleSave = async () => {
        // Récupérer l'utilisateur depuis localStorage si nécessaire
        let currentUser = user;
        if (!currentUser) {
            const storedUser = localStorage.getItem('user') || localStorage.getItem('current_user');
            if (storedUser) {
                try {
                    currentUser = JSON.parse(storedUser);
                    console.log("Utilisateur récupéré depuis localStorage pour sauvegarde");
                } catch (e) {
                    console.error("Erreur parsing user:", e);
                }
            }
        }

        if (!currentUser) {
            setModificationMessage("✗ Veuillez vous reconnecter");
            return;
        }

        setSaving(true);
        setModificationMessage(null);

        try {
            const panneauRef = doc(db, "panneaux", panneau.id);
            const panneauDoc = await getDoc(panneauRef);

            if (!panneauDoc.exists()) {
                setModificationMessage("✗ Panneau introuvable");
                return;
            }

            const panneauData = panneauDoc.data();
            const facesData = [...(panneauData.faces || [])];

            if (!facesData[faceIndex]) {
                setModificationMessage("✗ Face introuvable");
                return;
            }

            const faceToUpdate = { ...facesData[faceIndex] };
            const reservationsToUpdate = [...(faceToUpdate.reservations || [])];

            if (!reservationsToUpdate[reservationIndex]) {
                setModificationMessage("✗ Réservation introuvable");
                return;
            }

            // ✅ Si une nouvelle photo a été uploadée, forcer le statut à "Occupé"
            const finalStatut = newPhotoUrl ? "Occupé" : (newStatut || reservationsToUpdate[reservationIndex].statut);

            const updatedReservation = {
                ...reservationsToUpdate[reservationIndex],
                photoCampagneUrl: newPhotoUrl || reservationsToUpdate[reservationIndex].photoCampagneUrl,
                statut: finalStatut, // ✅ Statut forcé à "Occupé" si photo changée
                dateModification: new Date().toISOString(),
                modifiedBy: {
                    nom: currentUser.nomComplet || currentUser.nom || currentUser.email,
                    email: currentUser.email,
                    date: new Date().toISOString()
                }
            };

            reservationsToUpdate[reservationIndex] = updatedReservation;
            faceToUpdate.reservations = reservationsToUpdate;
            facesData[faceIndex] = faceToUpdate;

            await updateDoc(panneauRef, {
                faces: facesData,
                updatedAt: new Date().toISOString()
            });

            setModificationMessage("✓ Modifications enregistrées avec succès !");

            setTimeout(() => {
                setModificationMessage(null);
                setIsEditing(false);
                // Recharger les données
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error("Erreur détaillée:", error);
            setModificationMessage(`✗ Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`);
        } finally {
            setSaving(false);
        }
    };
    const formatEcheance = () => {
        if (daysLeft === 0) return "Expire aujourd'hui";
        if (daysLeft === 1) return "Expire demain";
        return `${daysLeft} jours restants`;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[2100] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
                style={{
                    backgroundImage: `url('/fond.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

                <div className="relative z-10">
                    {/* Header */}
                    <div className="p-5 border-b border-white/10 bg-gradient-to-r from-black/50 to-transparent">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-black text-white">
                                        {panneau.idPan || panneau.id}
                                    </h2>
                                    {isCurrent && (
                                        <span className="text-[8px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold animate-pulse">
                                            EN COURS
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-white/60 mt-1">
                                    Face {faceIndex + 1} • {reservationData.faceSens}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/10 hover:bg-red-500/80 rounded-xl transition-all"
                            >
                                <X size={18} className="text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Contenu */}
                    <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {/* Message de confirmation/erreur */}
                        {modificationMessage && (
                            <div className={`p-3 rounded-xl text-center text-xs font-medium ${modificationMessage.includes('succès')
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}>
                                {modificationMessage}
                            </div>
                        )}

                        {/* Société locatrice */}
                        <div className="bg-white/5 rounded-xl p-3">
                            <label className="text-[9px] text-white/40 uppercase tracking-wider">Société locatrice</label>
                            <p className="text-white font-medium mt-1">{res.societeLocatrice || 'Non spécifiée'}</p>
                        </div>

                        {/* Agent commercial */}
                        <div className="bg-white/5 rounded-xl p-3">
                            <label className="text-[9px] text-white/40 uppercase tracking-wider">Agent commercial</label>
                            <p className="text-white font-medium mt-1">{res.agentNom || 'Non spécifié'}</p>
                        </div>

                        {/* Période */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 rounded-xl p-3">
                                <label className="text-[9px] text-white/40 uppercase tracking-wider">Date début</label>
                                <p className="text-white text-sm mt-1">{res.dateDebut ? new Date(res.dateDebut).toLocaleDateString('fr-FR') : 'N/A'}</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3">
                                <label className="text-[9px] text-white/40 uppercase tracking-wider">Date fin</label>
                                <p className="text-white text-sm mt-1">{res.dateFin ? new Date(res.dateFin).toLocaleDateString('fr-FR') : 'N/A'}</p>
                            </div>
                        </div>

                        {/* Échéance */}
                        <div className={`rounded-xl p-3 ${daysLeft <= 3 ? 'bg-orange-500/20' : 'bg-white/5'}`}>
                            <label className="text-[9px] text-white/40 uppercase tracking-wider">Échéance</label>
                            <p className={`font-bold text-sm mt-1 ${daysLeft <= 3 ? 'text-orange-400' : 'text-white'}`}>
                                {formatEcheance()}
                            </p>
                        </div>

                        {/* Statut - Éditable */}
                        <div className="bg-white/5 rounded-xl p-3">
                            <label className="text-[9px] text-white/40 uppercase tracking-wider">Statut</label>
                            {isEditing ? (
                                <select
                                    value={newStatut || res.statut}
                                    onChange={(e) => setNewStatut(e.target.value)}
                                    className="w-full mt-1 p-2 bg-black/60 rounded-lg border border-white/10 text-white text-sm"
                                >
                                    <option value="Occupé">Occupé</option>
                                    <option value="Libre">Libre</option>
                                </select>
                            ) : (
                                <p className="text-white mt-1">{res.statut || 'N/A'}</p>
                            )}
                        </div>

                        {/* Photo - Éditable */}
                        {/* Photo - Éditable avec options de capture */}
                        <div className="bg-white/5 rounded-xl p-3">
                            <label className="text-[9px] text-white/40 uppercase tracking-wider">Preuve d'affichage</label>
                            <div className="mt-2">
                                {/* Aperçu de la photo */}
                                {(localPreview || newPhotoUrl || res.photoCampagneUrl) && !res.photoCampagneUrl?.includes('dispromalt') ? (
                                    <div className="space-y-2">
                                        <img
                                            src={localPreview || newPhotoUrl || res.photoCampagneUrl}
                                            alt="Preuve d'affichage"
                                            className="w-full h-40 object-cover rounded-lg border border-white/10"
                                        />
                                        {isEditing && (
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/30 transition-all"
                                                >
                                                    <Camera size={14} />
                                                    Choisir une photo
                                                </button>
                                                <button
                                                    onClick={startCamera}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-all"
                                                >
                                                    <Camera size={14} />
                                                    Prendre une photo
                                                </button>
                                            </div>
                                        )}
                                        {newPhotoUrl && (
                                            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                                                <CheckCircle size={12} className="text-emerald-400" />
                                                <span className="text-[8px] text-emerald-400 font-bold">
                                                    Statut → Occupé
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-lg border-2 border-dashed border-white/20 hover:border-amber-500/50 transition-all"
                                            >
                                                <Camera size={24} className="text-white/40" />
                                                <span className="text-xs text-white/40">Choisir une photo</span>
                                            </button>
                                            <button
                                                onClick={startCamera}
                                                className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-lg border-2 border-dashed border-white/20 hover:border-emerald-500/50 transition-all"
                                            >
                                                <Camera size={24} className="text-emerald-400/60" />
                                                <span className="text-xs text-emerald-400/60">Prendre une photo</span>
                                            </button>
                                        </div>
                                        <p className="text-[7px] text-amber-400/60 text-center">
                                            📸 Le statut passera automatiquement à "Occupé"
                                        </p>
                                    </div>
                                )}

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                />

                                {uploading && (
                                    <div className="flex items-center justify-center gap-2 mt-2">
                                        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-xs text-amber-400">Téléchargement...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Dernière modification */}
                        {res.modifiedBy && (
                            <div className="bg-white/5 rounded-xl p-3">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={12} className="text-emerald-400/50" />
                                    <span className="text-[8px] text-white/30">
                                        Dernière modification par {res.modifiedBy.nom} le {new Date(res.modifiedBy.date).toLocaleDateString('fr-FR')}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MODAL CAMÉRA */}
<AnimatePresence>
  {showCamera && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-black"
      >
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-auto max-h-[70vh] object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Contrôles caméra */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex justify-center gap-4">
              <button
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 border-4 border-white transition-all active:scale-90 flex items-center justify-center"
              >
                <div className="w-12 h-12 rounded-full bg-white" />
              </button>
              <button
                onClick={stopCamera}
                className="px-6 py-3 rounded-xl bg-red-500/80 text-white font-bold text-sm hover:bg-red-600 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
          
          <button
            onClick={stopCamera}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
          >
            <X size={24} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

                    {/* Footer avec boutons */}
                    <div className="p-4 border-t border-white/10 bg-black/30 flex gap-3">
                        {!isEditing ? (
                            <>
                                <button
                                    onClick={() => {
                                        setIsEditing(true);
                                        setNewStatut(res.statut);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-bold hover:bg-amber-500/30 transition-all"
                                >
                                    <Edit3 size={16} />
                                    Modifier
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-xl bg-white/10 text-white/60 text-sm font-bold hover:bg-white/20 transition-all"
                                >
                                    Fermer
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || uploading}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-bold hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                                >
                                    {saving ? (
                                        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Save size={16} />
                                    )}
                                    Enregistrer
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setNewPhotoUrl("");
                                        setNewStatut("");
                                        setLocalPreview(null);
                                        setModificationMessage(null);
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/30 transition-all"
                                >
                                    Annuler
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Styles globaux
const styles = `
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
`;

// Injecter les styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}