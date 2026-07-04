'use client';
import React, { useState, useEffect } from 'react';
import { MapPin, X, Camera, Loader2, Save, Building2, Layers, } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

// Assurez-vous que le chemin est correct selon votre structure
import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react"; // Vérifiez que vous avez bien installé lucide-react
import { GeoPoint, serverTimestamp } from 'firebase/firestore';

import { useRouter } from 'next/navigation';
const config = require('../../../config/db');

import { motion } from 'framer-motion';

import { doc, updateDoc } from 'firebase/firestore';



const CLOUDINARY_UPLOAD_PRESET = config.UPLOAD_PRESET;
const CLOUDINARY_CLOUD_NAME = "dn7wnikzp"; // À garder car Cloudinary a besoin du cloud name
const LOGO_DISPROMALT = config.LOGO_DISPROMALT;
const TYPES_PANNEAUX: string[] = config.TYPES_SUPPORTS;
const GEOGRAPHIE = config.GEOGRAPHIE;


// --- CONFIGURATION FIREBASE ---

const firebaseConfig = config.firebaseConfig;



const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
// Interface pour les faces avec les propriétés de dates
// Définir l'interface une fois pour toute
interface FaceData {
    statut: string;
    sens: string;
    prix?: string;
    clientNom?: string;
    agentNom?: string;
    agentEmail?: string;
    dateDebut: string;
    dateFin: string;
    estAujourdhui?: boolean;
    photoCampagneUrl?: string;
    dateDebutOriginale?: string;
    dateFinOriginale?: string;
    joursRetard?: number;
    aEteDecale?: boolean;
}

// Interface pour la réservation
interface ReservationData {
    agentEmail: string;
    agentNom: string;
    dateDebut: string;
    dateFin: string;
    dateDebutOriginale?: string;
    dateFinOriginale?: string;
    joursRetard?: number;
    dateModification: string;
    photoCampagneUrl: string;
    societeLocatrice: string;
    statut: string;
}
interface PanneauData {
    id: string;
    idPan?: string;
    adresse?: string;
    dimension?: string;
    type?: string;
    nbFaces?: number;
    faces?: any[];
    etatPanneau?: string;
    coords?: any;
    gps_raw?: any;
    createdAt?: any;
    updatedAt?: any;
    dateModification?: any;
}
// Interface pour une face complète dans Firestore
interface FaceFirestore {
    sens: string;
    historique: any[];
    reservations: ReservationData[];
}


export default function PageEnregistrement({
    isOpen,
    onClose,
    // handleLogout,
    setIsLoginOpen = () => { }  // ✅ Valeur par défaut
}: {
    isOpen: boolean,
    onClose: () => void,
    handleLogout: () => void,
    setIsLoginOpen?: (val: boolean) => void  // ✅ Rendre optionnel
}) {



    const router = useRouter();
    const { user, logout } = useAuth();
    const [showPanneauxModal, setShowPanneauxModal] = useState(false);



    // Ajoutez ce useEffect pour debug
    useEffect(() => {
        console.log("Utilisateur dans PageEnregistrement:", user);
    }, [user]);


    const goToMap = () => {
        // ✅ Utiliser localUser au lieu de user
        if (localUser) {
            // Encoder les données utilisateur dans l'URL
            const userEncoded = encodeURIComponent(JSON.stringify({
                uid: localUser.uid,
                email: localUser.email,
                nomComplet: localUser.nomComplet || localUser.nom,
                nom: localUser.nom,
                role: localUser.role || localUser.fonction || "superviseurs"
            }));
            router.push(`/dashboard/components/carte?user=${userEncoded}`);
        } else {
            // Si pas d'utilisateur, rediriger vers la connexion
            if (typeof setIsLoginOpen === 'function') {
                setIsLoginOpen(true);
            } else {
                router.push('/dashboard/components/');
            }
        }
    };

    const [localUser, setLocalUser] = useState<any>(null);

    // Lire les données du localStorage au montage
    useEffect(() => {
        const storedData = localStorage.getItem('geomarketing_user_data');
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                setLocalUser(parsed);
                console.log('📥 Utilisateur chargé depuis localStorage:', parsed);
            } catch (e) {
                console.error('Erreur de parsing localStorage:', e);
            }
        }


    }, []);
    useEffect(() => {
        console.log("👤 Utilisateur connecté:", user);
        console.log("📧 Email:", user?.email);
        console.log("📛 Nom:", user?.displayName || user?.nom || user?.nomComplet);
        console.log("🎭 Rôle:", user?.role || user?.fonction);
    }, [user]);


    // --- TU DOIS DÉCLARER CETTE FONCTION ICI ---
    const handleLogout = () => {
        if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
            logout(); // Appelle la fonction de ton AuthContext
            localStorage.clear();
            sessionStorage.clear();
            router.push('/');
        }
    };
    const [localPreviews, setLocalPreviews] = useState<{ [key: number]: string }>({});
    const [loading, setLoading] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
    const [coords, setCoords] = useState<{ lat: string, lng: string } | null>(null);
    const [listeSocietes, setListeSocietes] = useState<string[]>([]);
    const [missingFields, setMissingFields] = useState<string[]>([]);
    // Dans votre composant :





    const [listeAgents, setListeAgents] = useState<{ nom: string, email: string }[]>([]);

    const [formData, setFormData] = useState<{
        idPan: string;
        adresse: string;
        dimension: string;
        type: string;
        nbFaces: number;
        faces: FaceData[];
    }>({
        idPan: '',
        adresse: '',
        dimension: '',
        type: '',
        nbFaces: 1,
        faces: [{
            statut: 'Libre',
            sens: '',
            prix: '',
            clientNom: '',
            agentNom: '',
            agentEmail: '',
            dateDebut: '',
            dateFin: '',
            estAujourdhui: false,
            photoCampagneUrl: '',
            dateDebutOriginale: '',
            dateFinOriginale: '',
            joursRetard: 0,
            aEteDecale: false
        }]
    });


    const [geo, setGeo] = useState({
        pays: "",
        province: "",
        villeOuDistrict: "",
        communeOuZone: "",

    });


    // ============================================
    // FONCTION DE CRÉATION AUTOMATIQUE DE SOCIÉTÉ
    // ============================================
    const createSocieteIfNotExists = async (nomSociete: string) => {
        if (!nomSociete || nomSociete.trim() === '') return;

        // Vérifier si la société existe déjà
        const q = query(
            collection(db, "societes"),
            where("nomSociete", "==", nomSociete.toUpperCase())
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            // Créer la société
            try {
                const email = `${nomSociete.toLowerCase().replace(/\s/g, '')}@visiteur.com`;
                const password = Math.floor(100000 + Math.random() * 900000).toString();

                await addDoc(collection(db, "societes"), {
                    nomSociete: nomSociete.toUpperCase(),
                    email: email,
                    password: password,
                    role: "visiteur",
                    telephone: "",
                    actif: true,
                    isOnline: false,
                    createdAt: serverTimestamp(),
                    lastSeen: null,
                    derniereConnexion: null
                });

                console.log(`✅ Société "${nomSociete}" créée avec succès`);
                // Rafraîchir la liste
                await fetchDonnees();
            } catch (error) {
                console.error("❌ Erreur création société:", error);
            }
        }
    };


    const [isLocating, setIsLocating] = useState(false);

    const handleGetLocation = () => {
        setIsLocating(true);

        // Configuration pour forcer l'usage du GPS matériel
        const highPrecisionOptions: PositionOptions = {
            enableHighAccuracy: true, // COMMANDE CRITIQUE : Force l'activation de la puce GPS
            timeout: 30000,           // Laisse 30s (max) pour que la puce accroche les satellites
            maximumAge: 0             // Interdiction absolue d'utiliser une position en cache
        };

        if (!navigator.geolocation) {
            alert("La géolocalisation n'est pas supportée par ce navigateur.");
            setIsLocating(false);
            return;
        }

        // Lancement du prélèvement
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                // Extraction avec une précision maximale (ex: 15 décimales)
                setCoords({
                    lat: pos.coords.latitude.toString(),
                    lng: pos.coords.longitude.toString()
                });

                // Feedback de qualité du signal
                const precisionMètres = pos.coords.accuracy;
                console.log(`Précision matérielle : ${precisionMètres} mètres`);

                if (precisionMètres > 20) {
                    alert(`Attention : Signal faible (${Math.round(precisionMètres)}m). Sortez pour un meilleur fix.`);
                }

                setIsLocating(false);
            },
            (err) => {
                console.error("Erreur GPS détaillée:", err);
                let errorMsg = "Erreur GPS : ";
                if (err.code === 1) errorMsg += "Accès refusé. Activez le GPS dans vos réglages.";
                if (err.code === 2) errorMsg += "Position impossible (Vérifiez que vous n'êtes pas en sous-sol).";
                if (err.code === 3) errorMsg += "Délai dépassé (Le GPS met trop de temps à répondre).";

                alert(errorMsg);
                setIsLocating(false);
            },
            highPrecisionOptions
        );
    };


    const [isCustom, setIsCustom] = useState({
        province: false,
        ville: false,
        commune: false
    });

    // Ajoutez cet état en haut de votre composant
    const [listeCommerciaux, setListeCommerciaux] = useState<{ nom: string, email: string }[]>([]);

    // Calcul si tout est rempli pour verrouiller l'interface
    const isAdresseComplete = geo.pays && geo.province && geo.villeOuDistrict && geo.communeOuZone;

    // Mise à jour de l'adresse formatée dans formData
    useEffect(() => {
        const { pays, province, villeOuDistrict, communeOuZone, } = geo;
        // On ne garde que les éléments définis pour construire la chaîne
        const chaine = [pays, province, villeOuDistrict, communeOuZone]
            .filter(val => val && val.trim() !== "")
            .join(" / ");

        setFormData(prev => ({ ...prev, adresse: chaine }));
        if (isAdresseComplete) {
            const adresseFormattee = `${geo.pays} / ${geo.province} / ${geo.villeOuDistrict} / ${geo.communeOuZone}`;
            setFormData((prev: any) => ({ ...prev, adresse: adresseFormattee, geographie: geo }));
        }
    }, [geo, isAdresseComplete, setFormData]);

    // Fonction de validation de l'ID Panneau
    const validateIdPan = (idPan: string) => {
        // 1. Supprimer les espaces au début et à la fin
        const trimmed = idPan.trim();

        // 2. Vérifier que l'ID n'est pas vide
        if (!trimmed) {
            return { valid: false, error: "L'ID du panneau est obligatoire" };
        }

        // 3. Vérifier qu'il n'y a pas d'espaces à la fin (déjà fait par trim)
        if (trimmed !== idPan) {
            return { valid: false, error: "L'ID ne doit pas contenir d'espaces à la fin" };
        }

        // 4. Vérifier qu'il n'y a pas d'espaces multiples
        if (/\s{2,}/.test(trimmed)) {
            return { valid: false, error: "L'ID ne doit pas contenir d'espaces multiples" };
        }

        // 5. Vérifier que l'ID est en majuscules
        if (trimmed !== trimmed.toUpperCase()) {
            return { valid: false, error: "L'ID doit être en MAJUSCULES" };
        }

        return { valid: true, error: null };
    };

    // À ajouter après les autres useState
    const [dimensions, setDimensions] = useState({
        hauteur: '',
        largeur: '',
        unite: ''
    });
    // ✅ Remplacer l'ancien useEffect par celui-ci
    useEffect(() => {
        fetchDonnees();
    }, []);

    const handleNbFacesChange = (n: number) => {
        const val = n < 1 ? 1 : n;
        const newFaces = Array.from({ length: val }, (_, i) =>
            formData.faces[i] || {
                statut: 'Libre', sens: '', clientNom: '',
                dateDebut: '', dateFin: '', estAujourdhui: false, photoCampagneUrl: ''
            }
        );
        setFormData({ ...formData, nbFaces: val, faces: newFaces });
    };

    const handlePhotoUpload = async (index: number, file: File | null) => {
        if (!file) return;

        // 1. Prévisualisation locale immédiate
        const objectUrl = URL.createObjectURL(file);
        setLocalPreviews(prev => ({ ...prev, [index]: objectUrl }));
        setUploadingIndex(index);

        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        try {
            console.log("Tentative d'upload vers Cloudinary...");
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: data
            });

            const fileData = await res.json();

            // --- PARTIE GESTION DES ERREURS ---
            if (!res.ok) {
                console.error("Détails Erreur Cloudinary:", fileData);

                if (fileData.error?.message.includes("Unknown API key")) {
                    alert("ERREUR : Le Cloud Name 'dn7wnikzp' est incorrect.");
                } else if (fileData.error?.message.includes("Upload preset")) {
                    alert(`ERREUR : Le preset '${CLOUDINARY_UPLOAD_PRESET}' n'existe pas ou n'est pas en mode 'Unsigned'.`);
                } else {
                    alert("ERREUR CLOUDINARY : " + (fileData.error?.message || "Erreur inconnue"));
                }
                return;
            }

            // Si tout est OK
            console.log("Upload réussi ! URL :", fileData.secure_url);
            const nf = [...formData.faces];
            nf[index].photoCampagneUrl = fileData.secure_url;
            setFormData({ ...formData, faces: nf });

        } catch (error) {
            console.error("Erreur réseau ou code :", error);
            alert("ERREUR RÉSEAU : Impossible de contacter Cloudinary. Vérifiez votre connexion internet.");
        } finally {
            setUploadingIndex(null);
        }
    };


    // 2. Ta fonction originale

    const logoUrl = "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg";

    const resetForm = () => {
        // Réinitialiser tous les états
        setFormData({
            idPan: '', // ✅ AJOUTÉ
            adresse: '',
            dimension: '',
            type: '',
            nbFaces: 1,
            faces: [{
                statut: 'Libre',
                sens: '',
                prix: '',
                clientNom: '',
                agentNom: '',
                dateDebut: '',
                dateFin: '',
                estAujourdhui: false,
                photoCampagneUrl: ''
            }]
        });
        setGeo({
            pays: "",
            province: "",
            villeOuDistrict: "",
            communeOuZone: "",

        });
        setDimensions({
            hauteur: '',
            largeur: '',
            unite: ''
        });
        setCoords(null);
        setLocalPreviews({});
        setValidationErrors({});
    };


    // À ajouter après les useState
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

    const validateForm = () => {
        const errors: { [key: string]: string } = {};
        const missing: string[] = [];

        // ✅ Validation ID Panneau
        if (!formData.idPan || formData.idPan.trim() === '') {
            errors.idPan = "L'ID du panneau est obligatoire";
            missing.push("ID Panneau");
        } else {
            const idValidation = validateIdPan(formData.idPan);
            if (!idValidation.valid) {
                errors.idPan = idValidation.error || '';
                missing.push("ID Panneau (format)");
            }
        }

        // Validation GPS
        if (!coords || !coords.lat || !coords.lng) {
            errors.gps = "La position GPS est obligatoire";
            missing.push("Position GPS");
        }

        // Validation adresse complète
        if (!geo.pays || !geo.province || !geo.villeOuDistrict || !geo.communeOuZone) {
            errors.adresse = "Tous les champs d'adresse sont obligatoires";
            missing.push("Adresse complète");
        }

        // Validation dimension
        if (!dimensions.hauteur || !dimensions.largeur || !dimensions.unite) {
            errors.dimension = "La dimension est obligatoire";
            missing.push("Dimensions");
        }

        // Validation type
        if (!formData.type) {
            errors.type = "Le type de panneau est obligatoire";
            missing.push("Type de panneau");
        }

        // Validation des faces
        for (let i = 0; i < formData.faces.length; i++) {
            const face = formData.faces[i];

            if (!face.sens.trim()) {
                errors[`face_${i}_sens`] = `Face ${i + 1}: Le sens est obligatoire`;
                missing.push(`Face ${i + 1} - Sens`);
            }

            if (face.statut !== 'Libre') {
                if (!face.clientNom?.trim()) {
                    errors[`face_${i}_client`] = `Face ${i + 1}: Le client est obligatoire`;
                    missing.push(`Face ${i + 1} - Client`);
                }
                if (!face.agentNom) {
                    errors[`face_${i}_agent`] = `Face ${i + 1}: L'agent commercial est obligatoire`;
                    missing.push(`Face ${i + 1} - Agent`);
                }
                if (!face.dateDebut) {
                    errors[`face_${i}_dateDebut`] = `Face ${i + 1}: La date de début est obligatoire`;
                    missing.push(`Face ${i + 1} - Date début`);
                }
                if (!face.dateFin) {
                    errors[`face_${i}_dateFin`] = `Face ${i + 1}: La date de fin est obligatoire`;
                    missing.push(`Face ${i + 1} - Date fin`);
                }
                if (face.dateDebut && face.dateFin && new Date(face.dateDebut) >= new Date(face.dateFin)) {
                    errors[`face_${i}_dates`] = `Face ${i + 1}: La date de début doit être antérieure à la date de fin`;
                    missing.push(`Face ${i + 1} - Dates invalides`);
                }
            }
        }

        setValidationErrors(errors);
        setMissingFields(missing);
        return {
            isValid: Object.keys(errors).length === 0,
            missingFields: missing
        };
    };







    // Composant : GestionPanneauxModal - Version corrigée (uniquement etatPanneau)
    const GestionPanneauxModal = ({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user: any }) => {
        const [panneaux, setPanneaux] = useState<any[]>([]);
        const [panneauxFiltres, setPanneauxFiltres] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);
        const [updating, setUpdating] = useState<string | null>(null);
        const [searchTerm, setSearchTerm] = useState('');

        useEffect(() => {
            if (isOpen) {
                fetchPanneaux();
            }
        }, [isOpen]);

        useEffect(() => {
            if (searchTerm.trim() === '') {
                setPanneauxFiltres(panneaux);
            } else {
                const term = searchTerm.trim().toUpperCase();
                const filtres = panneaux.filter(p =>
                    p.idPan?.toUpperCase().includes(term) ||
                    p.adresse?.toUpperCase().includes(term) ||
                    p.type?.toUpperCase().includes(term)
                );
                setPanneauxFiltres(filtres);
            }
        }, [searchTerm, panneaux]);

        const fetchPanneaux = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, "panneaux"));
                const snapshot = await getDocs(q);
                const data: any[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                const sorted = data.sort((a, b) => (a.idPan || '').localeCompare(b.idPan || ''));
                setPanneaux(sorted);
                setPanneauxFiltres(sorted);
            } catch (error) {
                console.error("Erreur lors du chargement des panneaux:", error);
                alert("❌ Erreur de chargement des panneaux");
            } finally {
                setLoading(false);
            }
        };

        // ✅ Fonction corrigée - Ne modifie QUE etatPanneau
        const toggleEtatPanneau = async (panneauId: string, estEnPanne: boolean) => {
            const action = estEnPanne ? 'remettre en service' : 'mettre en maintenance';
            if (!confirm(`Voulez-vous ${action} ce panneau ?`)) return;

            setUpdating(panneauId);
            try {
                const nouveauStatut = estEnPanne ? 'Libre' : 'En panne';
                const panneauRef = doc(db, "panneaux", panneauId);

                // ✅ UNIQUEMENT mettre à jour etatPanneau
                await updateDoc(panneauRef, {
                    etatPanneau: nouveauStatut,
                    dateModification: serverTimestamp()
                });

                alert(`✅ Panneau ${estEnPanne ? 'remis en service' : 'mis en maintenance'} avec succès`);
                await fetchPanneaux();
            } catch (error) {
                console.error("Erreur:", error);
                alert("❌ Erreur lors de la mise à jour");
            } finally {
                setUpdating(null);
            }
        };

        // Composant de carte panneau
        const PanneauCard = ({ panneau }: { panneau: any }) => {
            // ✅ L'état est déterminé UNIQUEMENT par etatPanneau
            const estEnPanne = panneau.etatPanneau === 'En panne';

            // Compter les faces occupées (pour l'affichage)
            const facesOccupees = panneau.faces?.filter((f: any) => f.statut === 'Occupé' || f.statut === 'Réservé').length || 0;
            const facesLibres = panneau.faces?.filter((f: any) => f.statut === 'Libre').length || 0;
            const facesMaintenance = panneau.faces?.filter((f: any) => f.statut === 'Maintenance').length || 0;

            const formattedAdresse = panneau.adresse?.length > 50
                ? panneau.adresse.substring(0, 47) + '...'
                : panneau.adresse || 'Adresse non renseignée';

            return (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`bg-white rounded-xl border-2 p-4 hover:shadow-lg transition-all duration-300 ${estEnPanne
                            ? 'border-red-200 hover:border-red-400 bg-red-50/50'
                            : 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/50'
                        }`}
                >
                    {/* En-tête avec ID et statut */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800 text-sm truncate" title={panneau.idPan || 'Sans ID'}>
                                #{panneau.idPan || 'Sans ID'}
                            </h3>
                            <p className="text-[10px] text-gray-500 truncate" title={panneau.type || ''}>
                                {panneau.type || 'Type non spécifié'} • {panneau.nbFaces || 0} face(s)
                            </p>
                        </div>
                        <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[8px] font-bold uppercase border ${estEnPanne
                                ? 'bg-red-100 text-red-700 border-red-300'
                                : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            }`}>
                            {estEnPanne ? '🔧 En panne' : '✅ Opérationnel'}
                        </span>
                    </div>

                    {/* Adresse */}
                    <div className="mb-3 p-2 bg-white/60 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-700 leading-relaxed" title={panneau.adresse || ''}>
                            📍 {formattedAdresse}
                        </p>
                    </div>

                    {/* Statistiques des faces */}
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                        <div className="text-center p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                            <span className="block text-[10px] font-bold text-emerald-700">{facesLibres}</span>
                            <span className="text-[6px] text-emerald-600 uppercase font-medium">Libres</span>
                        </div>
                        <div className="text-center p-1.5 bg-amber-50 rounded-lg border border-amber-100">
                            <span className="block text-[10px] font-bold text-amber-700">{facesOccupees}</span>
                            <span className="text-[6px] text-amber-600 uppercase font-medium">Occupées</span>
                        </div>
                        <div className="text-center p-1.5 bg-red-50 rounded-lg border border-red-100">
                            <span className="block text-[10px] font-bold text-red-700">{facesMaintenance}</span>
                            <span className="text-[6px] text-red-600 uppercase font-medium">Maintenance</span>
                        </div>
                    </div>

                    {/* ✅ Bouton d'action corrigé */}
                    <button
                        onClick={() => toggleEtatPanneau(panneau.id, estEnPanne)}
                        disabled={updating === panneau.id}
                        className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${estEnPanne
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm hover:shadow'
                                : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm hover:shadow'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {updating === panneau.id ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Traitement...</span>
                            </>
                        ) : estEnPanne ? (
                            <>
                                <span>🔄</span>
                                <span>Remettre en service</span>
                            </>
                        ) : (
                            <>
                                <span>🔧</span>
                                <span>Mettre en maintenance</span>
                            </>
                        )}
                    </button>

                    {panneau.dateModification && (
                        <p className="mt-2 text-[6px] text-gray-400 text-center">
                            Dernière modification: {new Date(panneau.dateModification.seconds * 1000).toLocaleDateString('fr-FR')}
                        </p>
                    )}
                </motion.div>
            );
        };

        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                    {/* Header avec recherche */}
                    <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-800 to-blue-900 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">📋</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">Gestion des Panneaux</h2>
                                <p className="text-xs text-blue-300">
                                    {panneauxFiltres.length} panneau(x) • Supervision et maintenance
                                </p>
                            </div>
                        </div>

                        {/* Barre de recherche */}
                        <div className="w-full sm:w-72">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="🔍 Rechercher par ID, adresse..."
                                    className="w-full px-4 py-2 bg-white/10 text-white placeholder-blue-300 rounded-lg border border-white/20 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition flex-shrink-0"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Corps avec liste des panneaux */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64">
                                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                                <p className="text-sm text-gray-500">Chargement des panneaux...</p>
                            </div>
                        ) : panneauxFiltres.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64">
                                <span className="text-4xl mb-4">🔍</span>
                                <p className="text-lg font-medium text-gray-600">Aucun panneau trouvé</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    {searchTerm ? 'Essayez un autre terme de recherche' : 'Aucun panneau enregistré'}
                                </p>
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                                    >
                                        Effacer la recherche
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {panneauxFiltres.map((panneau) => (
                                    <PanneauCard key={panneau.id} panneau={panneau} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer avec statistiques */}
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-4">
                            <span>Total: <strong className="text-gray-700">{panneaux.length}</strong></span>
                            <span>Affichés: <strong className="text-gray-700">{panneauxFiltres.length}</strong></span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Opérationnels: {panneaux.filter(p => p.etatPanneau !== 'En panne').length}
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                En panne: {panneaux.filter(p => p.etatPanneau === 'En panne').length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    // Fonction pour gérer les dates avec retards et chevauchements
    const traiterDatesReservation = async (faceData: any, panneauId: string) => {
        const { dateDebut, dateFin } = faceData;

        if (!dateDebut || !dateFin) return faceData;

        // 1. Récupérer toutes les réservations futures de cette face
        const q = query(
            collection(db, "panneaux"),
            where("id", "==", panneauId)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) return faceData;

        const panneauData = snapshot.docs[0].data();
        const reservationsExistantes = panneauData.faces?.flatMap((f: any) =>
            f.reservations?.filter((r: any) =>
                new Date(r.dateDebut) > new Date() &&
                new Date(r.dateFin) > new Date()
            ) || []
        ) || [];

        // 2. Calculer le nombre de jours de retard
        const debutReservation = new Date(dateDebut);
        const aujourdhui = new Date();
        aujourdhui.setHours(0, 0, 0, 0);

        let joursRetard = 0;
        if (debutReservation < aujourdhui) {
            joursRetard = Math.ceil((aujourdhui.getTime() - debutReservation.getTime()) / (1000 * 60 * 60 * 24));
        }

        // 3. Si pas de retard, on retourne les dates inchangées
        if (joursRetard <= 0) return faceData;

        // 4. Décaler la date de début et de fin du nombre de jours de retard
        const nouvelleDateDebut = new Date(dateDebut);
        nouvelleDateDebut.setDate(nouvelleDateDebut.getDate() + joursRetard);

        const nouvelleDateFin = new Date(dateFin);
        nouvelleDateFin.setDate(nouvelleDateFin.getDate() + joursRetard);

        // 5. Vérifier les chevauchements avec les réservations existantes
        let dateDebutFinale = nouvelleDateDebut;
        let dateFinFinale = nouvelleDateFin;

        for (const reservation of reservationsExistantes) {
            const debutExistant = new Date(reservation.dateDebut);
            const finExistant = new Date(reservation.dateFin);

            // Vérifier si les périodes se chevauchent
            if (dateDebutFinale < finExistant && dateFinFinale > debutExistant) {
                // Calculer le nombre de jours de chevauchement
                const chevauchementDebut = dateDebutFinale < debutExistant ? debutExistant : dateDebutFinale;
                const chevauchementFin = dateFinFinale < finExistant ? dateFinFinale : finExistant;
                const joursChevauchement = Math.ceil(
                    (chevauchementFin.getTime() - chevauchementDebut.getTime()) / (1000 * 60 * 60 * 24)
                ) + 1;

                // Décaler les dates pour éviter le chevauchement
                dateDebutFinale.setDate(dateDebutFinale.getDate() + joursChevauchement);
                dateFinFinale.setDate(dateFinFinale.getDate() + joursChevauchement);
            }
        }

        // 6. Retourner les nouvelles dates
        return {
            ...faceData,
            dateDebut: dateDebutFinale.toISOString().split('T')[0],
            dateFin: dateFinFinale.toISOString().split('T')[0],
            joursRetard: joursRetard,
            dateDebutOriginale: dateDebut,
            dateFinOriginale: dateFin,
            aEteDecale: joursRetard > 0
        };
    };





























    const enregistrerPanneau = async () => {
        // 1. Validation du formulaire
        const { isValid, missingFields } = validateForm();

        if (!isValid) {
            // Afficher un message avec les champs manquants
            const missingList = missingFields.join(', ');
            alert(`❌ Veuillez remplir tous les champs obligatoires :\n\n${missingList}`);
            return;
        }

        // 2. Validations renforcées
        if (!coords || !coords.lat || !coords.lng) {
            return alert("ERREUR : La position GPS n'a pas été capturée avec précision.");
        }

        if (!formData.adresse.trim()) return alert("ERREUR : L'adresse est obligatoire.");

        // ✅ 3. Vérifier la redondance de l'ID Panneau
        try {
            const idPanUpper = formData.idPan.trim().toUpperCase();

            // Requête pour vérifier si l'ID existe déjà
            const q = query(
                collection(db, "panneaux"),
                where("idPan", "==", idPanUpper)
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                alert(`❌ ERREUR : L'ID panneau "${idPanUpper}" existe déjà dans la base de données.`);
                return;
            }
        } catch (error) {
            console.error("Erreur lors de la vérification de redondance:", error);
            alert("❌ Erreur lors de la vérification de l'ID. Veuillez réessayer.");
            return;
        }

        setLoading(true);
        try {
            // --- LOGIQUE IDPAN SÉCURISÉE ---

            for (const face of formData.faces) {
                if (face.clientNom && face.clientNom.trim() !== '') {
                    await createSocieteIfNotExists(face.clientNom);
                }
            }

            const dimensionFormatee = dimensions.hauteur && dimensions.largeur && dimensions.unite
                ? `${dimensions.hauteur} x ${dimensions.largeur} ${dimensions.unite}`
                : formData.dimension || '';

            // ✅ Utiliser l'ID saisi par l'utilisateur au lieu de le générer automatiquement
            const idPanFinal = formData.idPan.trim().toUpperCase();

            const now = new Date();
            const isoNow = now.toISOString();

            // 2. Conversion sécurisée des coordonnées
            const latitude = parseFloat(coords.lat);
            const longitude = parseFloat(coords.lng);

            if (isNaN(latitude) || isNaN(longitude)) {
                throw new Error("Coordonnées GPS invalides.");
            }




            const facesTraitees = await Promise.all(
                formData.faces.map(async (face: FaceData, index: number) => {
                    // Si la face est occupée ou réservée, traiter les dates
                    if (face.statut !== 'Libre' && face.dateDebut && face.dateFin) {
                        // Générer un ID temporaire pour le panneau
                        const idPanTemp = formData.idPan.trim().toUpperCase();

                        // Vérifier si le panneau existe déjà
                        const q = query(
                            collection(db, "panneaux"),
                            where("idPan", "==", idPanTemp)
                        );
                        const snapshot = await getDocs(q);

                        if (!snapshot.empty) {
                            const panneauDoc = snapshot.docs[0];
                            // Traiter les dates avec les réservations existantes
                            const faceAvecDates = await traiterDatesReservation(face, panneauDoc.id);

                            // Retourner la face avec toutes les propriétés
                            return {
                                ...face,
                                dateDebut: faceAvecDates.dateDebut,
                                dateFin: faceAvecDates.dateFin,
                                joursRetard: faceAvecDates.joursRetard || 0,
                                dateDebutOriginale: faceAvecDates.dateDebutOriginale || face.dateDebut,
                                dateFinOriginale: faceAvecDates.dateFinOriginale || face.dateFin,
                                aEteDecale: faceAvecDates.aEteDecale || false
                            };
                        }
                    }
                    return face;
                })
            );

            // 3. Construction des faces selon ta structure exacte
            const formattedFaces: FaceFirestore[] = facesTraitees.map((f: FaceData, i: number) => {
                const isOccupied = f.statut !== "Libre";
                const reservationData: ReservationData | null = isOccupied ? {
                    agentEmail: f.agentEmail || "non-specifie@mail.com",
                    agentNom: f.agentNom || "Agent inconnu",
                    dateDebut: f.dateDebut || "",
                    dateFin: f.dateFin || "",
                    dateDebutOriginale: f.dateDebutOriginale || f.dateDebut || "",
                    dateFinOriginale: f.dateFinOriginale || f.dateFin || "",
                    joursRetard: f.joursRetard || 0,
                    dateModification: isoNow,
                    photoCampagneUrl: f.photoCampagneUrl || LOGO_DISPROMALT,
                    societeLocatrice: f.clientNom || "Inconnu",
                    statut: f.statut
                } : null;

                return {
                    sens: f.sens || `Face ${String.fromCharCode(65 + i)}`,
                    historique: [],
                    reservations: reservationData ? [reservationData] : []
                };
            });
            // 4. Envoi à Firestore avec l'organisation demandée
            await addDoc(collection(db, "panneaux"), {
                idPan: idPanFinal, // ✅ Utilisation de l'ID saisi
                adresse: formData.adresse.trim().toUpperCase(),
                coords: new GeoPoint(latitude, longitude),
                gps_raw: { lat: latitude, lng: longitude },
                dimension: dimensionFormatee,
                nbFaces: formData.nbFaces,
                type: formData.type,
                faces: formattedFaces,
                etatPanneau: 'Libre', // ✅ AJOUT : état global du panneau
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            alert(`✅ SUCCÈS : Panneau ${idPanFinal} enregistré.`);
            resetForm();

            if (onClose) onClose();

        } catch (e: any) {
            console.error("Erreur d'enregistrement:", e);
            alert(`❌ Erreur : ${e.message || "Problème de connexion base de données"}`);
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // FONCTION FETCH DONNÉES - RENDUE RÉUTILISABLE
    // ============================================
    const fetchDonnees = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "societes"));
            const donneesBrutes = querySnapshot.docs.map(doc => doc.data());

            // Extraction des Sociétés (role: visiteur)
            const nomsSocietes = donneesBrutes
                .filter(d => d.role === "visiteur" && d.nomSociete)
                .map(d => d.nomSociete);

            // Extraction des Agents Commerciaux (role: commercial)
            const agentsBruts = donneesBrutes
                .filter(d => d.role === "commercial" && d.fonction === "agent")
                .map(d => ({
                    nom: d.nomComplet || d.nom || "Sans nom",
                    email: d.email || ""
                }))
                .filter(a => a.nom !== "Sans nom");

            const nomsAgents = Array.from(
                new Map(agentsBruts.map(agent => [agent.nom, agent])).values()
            );

            setListeCommerciaux(nomsAgents);
            setListeSocietes([...new Set(nomsSocietes)]);

        } catch (err) {
            console.error("Erreur de récupération :", err);
        }
    };
    // Fonction pour obtenir les unités selon le type de panneau
    const getUnitesForType = (type: string) => {
        const unitesParType: Record<string, string[]> = {
            'LED': ['pixels', 'mm', 'cm', 'pouces'],
            'Bache': ['m', 'cm', 'pieds'],
            'Vinyle': ['m', 'cm', 'rouleau']
        };
        return unitesParType[type] || ['m', 'cm', 'mm'];
    };


    return (

        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
            <GestionPanneauxModal
                isOpen={showPanneauxModal}
                onClose={() => setShowPanneauxModal(false)}
                user={localUser}
            />
            {/* ============================================ */}
            {/* MODAL PRINCIPAL - FOND BLANC */}
            {/* ============================================ */}
            <div className="relative w-full max-w-4xl max-h-[95vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">

                {/* ============================================ */}
                {/* HEADER - BLEU ROI PROFOND */}
                {/* ============================================ */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-900 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                            <MapPin size={16} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base md:text-lg font-bold text-white">
                                <span className="text-amber-400">Nouveau</span> Panneau
                            </h2>
                            <p className="text-[6px] sm:text-[7px] text-blue-200 uppercase tracking-[0.2em]">
                                Enregistrement • Gestion Digitale Panneaux
                            </p>
                        </div>
                    </div>

                    {/* Actions header */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowPanneauxModal(true)}
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 transition-all"
                        >
                            <span className="text-amber-400">🔧</span>
                            <span className="hidden xs:inline text-[7px] sm:text-[8px] font-bold text-amber-400 uppercase">
                                Panneaux
                            </span>
                        </button>
                        <button
                            onClick={goToMap}
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 transition-all"
                        >
                            <MapPin size={14} className="text-emerald-400" />
                            <span className="hidden xs:inline text-[7px] sm:text-[8px] font-bold text-emerald-400 uppercase">Carte</span>
                        </button>
                        {localUser ? (
                            <div className="flex items-center gap-1.5 sm:gap-3">
                                {/* Avatar - visible sur tous les appareils */}
                                <div className="w-6 h-6 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-[8px] sm:text-sm md:text-base shadow-lg shadow-amber-500/20 border border-white/20 flex-shrink-0">
                                    {localUser.nom?.charAt(0) || localUser.nomComplet?.charAt(0) || localUser.email?.charAt(0) || "U"}
                                </div>

                                {/* Infos - UNIQUEMENT sur tablette et desktop */}
                                <div className="hidden sm:block text-right">
                                    <p className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-white truncate max-w-[100px] sm:max-w-[120px] md:max-w-[150px]">
                                        {localUser.nomComplet || localUser.nom || localUser.email?.split('@')[0] || "Utilisateur"}
                                    </p>
                                    <p className="text-[6px] sm:text-[6px] md:text-[7px] text-amber-300 font-bold uppercase tracking-wider">
                                        {localUser.role || localUser.fonction || "Commercial"}
                                    </p>
                                </div>

                                {/* Bouton déconnexion - icône sur mobile, icône + texte sur tablette et desktop */}
                                <button
                                    onClick={handleLogout}
                                    className="p-1.5 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-lg bg-white/10 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 transition-all flex items-center gap-1 sm:gap-2"
                                >
                                    <LogOut size={14} className="text-red-400" />
                                    <span className="hidden sm:inline text-[7px] sm:text-[8px] md:text-[9px] font-bold text-red-400 uppercase">
                                        Quitter
                                    </span>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    if (typeof setIsLoginOpen === 'function') {
                                        setIsLoginOpen(true);
                                    } else {
                                        router.push('/dashboard');
                                    }
                                }}
                                className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-black transition-all flex items-center gap-1 sm:gap-2"
                            >
                                <span className="text-[10px] sm:text-[9px] md:text-[10px] font-bold">
                                    🔐
                                </span>
                                <span className="hidden sm:inline text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase whitespace-nowrap">
                                    Connexion
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ============================================ */}
                {/* CORPS - SCROLLABLE */}
                {/* ============================================ */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50">

                    {/* ============================================ */}
                    {/* SECTION LOCALISATION */}
                    {/* ============================================ */}
                    <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
                        <button
                            type="button"
                            disabled={isLocating}
                            onClick={handleGetLocation}
                            className={`w-full p-4 text-left transition-all hover:bg-blue-50 ${coords ? 'border-l-4 border-emerald-500' : 'border-l-4 border-amber-500'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${coords ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                                        {isLocating ? (
                                            <Loader2 size={18} className="animate-spin text-amber-600" />
                                        ) : (
                                            <MapPin size={18} className={coords ? 'text-emerald-600' : 'text-amber-600'} />
                                        )}
                                    </div>
                                    <div>
                                        <p className={`text-xs font-bold ${coords ? 'text-emerald-700' : 'text-amber-700'}`}>
                                            {isLocating ? '🔍 Synchronisation GPS...' : coords ? '📍 Position capturée' : '📍 Géolocalisation requise'}
                                        </p>
                                        <p className="text-[7px] text-gray-500">
                                            {isLocating ? 'Recherche en cours...' : coords ? 'Cliquez pour actualiser' : 'Cliquez pour activer la localisation'}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[7px] font-bold uppercase ${coords ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {coords ? '✓ ACTIF' : '● REQUIS'}
                                </span>
                            </div>

                            {coords && !isLocating && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-3 pt-3 border-t border-gray-200"
                                >
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[7px] text-gray-500 font-mono uppercase">Latitude</span>
                                            <code className="text-[9px] font-mono text-emerald-700 font-bold">{coords.lat.substring(0, 12)}</code>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[7px] text-gray-500 font-mono uppercase">Longitude</span>
                                            <code className="text-[9px] font-mono text-emerald-700 font-bold">{coords.lng.substring(0, 12)}</code>
                                        </div>
                                        <div className="flex items-center gap-1 text-[7px] text-emerald-600 font-bold">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Précision élevée
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </button>
                    </div>
                    {/* ============================================ */}
                    {/* SECTION ID PAN (NOUVEAU) */}
                    {/* ============================================ */}
                    <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                            <span className="text-blue-600 font-bold text-sm">#</span>
                            <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Identifiant du panneau</h3>
                            <span className="text-[6px] text-red-500 font-bold ml-auto">* OBLIGATOIRE</span>
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Ex: P001, P-1ERE-RUE, P001A"
                                className={`w-full px-4 py-3 bg-gray-50 rounded-lg border-2 text-gray-800 text-sm font-mono font-bold uppercase outline-none transition-all focus:ring-2 ${validationErrors.idPan
                                    ? 'border-red-400 focus:ring-red-200 bg-red-50'
                                    : 'border-gray-200 focus:ring-blue-200 focus:border-blue-400'
                                    }`}
                                value={formData.idPan || ''}
                                onChange={(e) => {
                                    const rawValue = e.target.value;
                                    // Appliquer la transformation immédiate : 
                                    // - Supprimer les espaces à la fin
                                    // - Convertir en majuscules
                                    const transformed = rawValue.trimEnd().toUpperCase();

                                    setFormData({ ...formData, idPan: transformed });

                                    // Validation en temps réel
                                    const result = validateIdPan(transformed);
                                    setValidationErrors(prev => ({
                                        ...prev,
                                        idPan: result.valid ? '' : result.error || ''
                                    }));
                                }}
                                onBlur={(e) => {
                                    // Nettoyer les espaces à la fin au moment de quitter le champ
                                    const trimmed = e.target.value.trimEnd().toUpperCase();
                                    setFormData({ ...formData, idPan: trimmed });
                                }}
                            />

                            {validationErrors.idPan && (
                                <p className="mt-1 text-[8px] text-red-500 font-medium flex items-center gap-1">
                                    <span>⚠️</span> {validationErrors.idPan}
                                </p>
                            )}

                            <div className="mt-1 flex items-center gap-4 text-[6px] text-gray-400">
                                <span className="flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${formData.idPan && !validationErrors.idPan ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                    {formData.idPan && !validationErrors.idPan ? '✓ Valide' : 'Attend saisie'}
                                </span>
                                <span>•</span>
                                <span>MAJUSCULES automatiques</span>
                                <span>•</span>
                                <span>Pas d'espaces à la fin</span>
                            </div>
                        </div>
                    </div>

                    {/* ============================================ */}
                    {/* SECTION ADRESSE */}
                    {/* ============================================ */}
                    <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                            <Building2 size={16} className="text-blue-600" />
                            <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Adresse du panneau</h3>
                        </div>

                        {!isAdresseComplete ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                                <select
                                    className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[11px] outline-none focus:ring-2 focus:ring-blue-500"
                                    value={geo.pays}
                                    onChange={e => setGeo({ ...geo, pays: e.target.value, province: "", villeOuDistrict: "", communeOuZone: "" })}
                                >
                                    <option value="">Pays</option>
                                    {Object.keys(GEOGRAPHIE).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                {geo.pays && (
                                    <select
                                        className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[11px] outline-none focus:ring-2 focus:ring-blue-500"
                                        value={geo.province}
                                        onChange={e => setGeo({ ...geo, province: e.target.value, villeOuDistrict: "", communeOuZone: "" })}
                                    >
                                        <option value="">Province / Région</option>
                                        {Object.keys(GEOGRAPHIE[geo.pays as keyof typeof GEOGRAPHIE] || {}).map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                )}
                                {geo.pays && geo.province && (
                                    <select
                                        className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[11px] outline-none focus:ring-2 focus:ring-blue-500"
                                        value={geo.villeOuDistrict}
                                        onChange={e => setGeo({ ...geo, villeOuDistrict: e.target.value, communeOuZone: "" })}
                                    >
                                        <option value="">Ville / District</option>
                                        {Object.keys((GEOGRAPHIE[geo.pays as keyof typeof GEOGRAPHIE] as any)?.[geo.province] || {}).map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                )}
                                {geo.pays && geo.province && geo.villeOuDistrict && (
                                    <select
                                        className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[11px] outline-none focus:ring-2 focus:ring-blue-500"
                                        value={geo.communeOuZone}
                                        onChange={e => setGeo({ ...geo, communeOuZone: e.target.value })}
                                    >
                                        <option value="">Tronçon / Commune</option>
                                        {((GEOGRAPHIE[geo.pays as keyof typeof GEOGRAPHIE] as any)?.[geo.province]?.[geo.villeOuDistrict] as string[] || []).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div>
                                    <p className="text-[8px] text-blue-600 font-bold uppercase">Adresse finalisée</p>
                                    <p className="text-sm font-medium text-gray-800">{formData.adresse}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setGeo({ pays: "", province: "", villeOuDistrict: "", communeOuZone: "" })}
                                    className="text-[10px] text-red-500 hover:text-red-700 font-medium underline"
                                >
                                    Modifier
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ============================================ */}
                    {/* SECTION CARACTÉRISTIQUES TECHNIQUES */}
                    {/* ============================================ */}
                    <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                            <Layers size={16} className="text-blue-600" />
                            <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Caractéristiques techniques</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Type de support *</label>
                                <select
                                    className="w-full mt-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[11px] outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.type}
                                    onChange={e => {
                                        setFormData({ ...formData, type: e.target.value });
                                        setDimensions({ hauteur: '', largeur: '', unite: '' });
                                    }}
                                >
                                    <option value="">Sélectionner un type</option>
                                    {TYPES_PANNEAUX.map((t: string) => (
                                        <option key={t} value={t}>{t.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Dimensions *</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="H"
                                        className="w-1/3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[11px] text-center outline-none focus:ring-2 focus:ring-blue-500"
                                        value={dimensions.hauteur}
                                        onChange={e => setDimensions({ ...dimensions, hauteur: e.target.value })}
                                    />
                                    <span className="text-blue-600 font-bold">×</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="L"
                                        className="w-1/3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[11px] text-center outline-none focus:ring-2 focus:ring-blue-500"
                                        value={dimensions.largeur}
                                        onChange={e => setDimensions({ ...dimensions, largeur: e.target.value })}
                                    />
                                    <select
                                        className="w-1/3 px-2 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[10px] outline-none focus:ring-2 focus:ring-blue-500"
                                        value={dimensions.unite}
                                        onChange={e => setDimensions({ ...dimensions, unite: e.target.value })}
                                        disabled={!formData.type}
                                    >
                                        <option value="">Unité</option>
                                        {getUnitesForType(formData.type).map((unite: string) => (
                                            <option key={unite} value={unite}>{unite}</option>
                                        ))}
                                    </select>
                                </div>
                                {dimensions.hauteur && dimensions.largeur && dimensions.unite && (
                                    <p className="mt-1 text-[8px] text-blue-600 font-mono">
                                        Dimension: {dimensions.hauteur} × {dimensions.largeur} {dimensions.unite}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ============================================ */}
                    {/* SECTION FACES */}
                    {/* ============================================ */}
                    <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <Layers size={16} className="text-blue-600" />
                                <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Configuration des faces</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleNbFacesChange(Math.max(1, (formData.nbFaces || 1) - 1))}
                                    className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition"
                                >
                                    −
                                </button>
                                <span className="text-lg font-bold text-blue-600 w-8 text-center">{formData.nbFaces}</span>
                                <button
                                    type="button"
                                    onClick={() => handleNbFacesChange((formData.nbFaces || 1) + 1)}
                                    className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600 transition"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Liste des faces */}
                        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                            {formData.faces.map((face, i) => (
                                <div key={i} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-blue-700">FACE {String.fromCharCode(65 + i)}</span>
                                        <select
                                            className={`text-[8px] font-bold px-3 py-1 rounded-lg border outline-none ${face.statut === 'Occupé'
                                                ? 'bg-amber-100 text-amber-700 border-amber-300'
                                                : face.statut === 'Réservé'
                                                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                                                    : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                                }`}
                                            value={face.statut}
                                            onChange={e => {
                                                const nf = [...formData.faces];
                                                nf[i].statut = e.target.value;
                                                setFormData({ ...formData, faces: nf });
                                            }}
                                        >
                                            <option value="Libre">LIBRE</option>
                                            <option value="Occupé">OCCUPÉ</option>
                                            <option value="Réservé">RÉSERVÉ</option>
                                        </select>
                                    </div>

                                    <input
                                        placeholder="Sens trafic (ex: DIRECTION CENTRE VILLE) *"
                                        className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-gray-700 text-[10px] outline-none focus:ring-2 focus:ring-blue-500"
                                        value={face.sens}
                                        onChange={e => {
                                            const nf = [...formData.faces];
                                            nf[i].sens = e.target.value.toUpperCase();
                                            setFormData({ ...formData, faces: nf });
                                        }}
                                    />

                                    {(face.statut === 'Occupé' || face.statut === 'Réservé') && (
                                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {/* ============================================ */}
                                                {/* CLIENT / SOCIÉTÉ - AVEC DATALIST ET SAISIE LIBRE */}
                                                {/* ============================================ */}
                                                <div className="space-y-1">
                                                    <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">
                                                        Client / Société *
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            list={`clients-list-${i}`}
                                                            placeholder="Rechercher ou saisir un client..."
                                                            className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[10px] outline-none focus:ring-2 focus:ring-blue-500"
                                                            value={face.clientNom || ''}
                                                            onChange={e => {
                                                                const nf = [...formData.faces];
                                                                nf[i].clientNom = e.target.value.toUpperCase();
                                                                setFormData({ ...formData, faces: nf });
                                                            }}
                                                        />
                                                        <datalist id={`clients-list-${i}`}>
                                                            {listeSocietes.map((nom: string, idx: number) => (
                                                                <option key={idx} value={nom} />
                                                            ))}
                                                        </datalist>
                                                        {listeSocietes.length === 0 && (
                                                            <p className="text-[6px] text-amber-500 mt-1">⚠️ Aucun client disponible, vous pouvez en saisir un</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* ============================================ */}
                                                {/* AGENT COMMERCIAL - AVEC DATALIST ET RECHERCHE */}
                                                {/* ============================================ */}
                                                <div className="space-y-1">
                                                    <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">
                                                        Agent commercial *
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            list={`agents-list-${i}`}
                                                            placeholder="Rechercher un agent..."
                                                            className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[10px] outline-none focus:ring-2 focus:ring-blue-500"
                                                            value={(face as any).agentNom || ''}
                                                            onChange={(e) => {
                                                                const valeur = e.target.value;
                                                                const nf = [...formData.faces];
                                                                const faceActuelle = nf[i] as any;
                                                                faceActuelle.agentNom = valeur;
                                                                // Chercher l'email correspondant
                                                                const found = listeCommerciaux.find((c: any) =>
                                                                    c.nom.toLowerCase() === valeur.toLowerCase()
                                                                );
                                                                faceActuelle.agentEmail = found?.email || "";
                                                                setFormData({ ...formData, faces: nf });
                                                            }}
                                                        />
                                                        <datalist id={`agents-list-${i}`}>
                                                            {listeCommerciaux.map((agent: any, idx: number) => (
                                                                <option key={idx} value={agent.nom} />
                                                            ))}
                                                        </datalist>
                                                        {listeCommerciaux.length === 0 && (
                                                            <p className="text-[6px] text-amber-500 mt-1">⚠️ Aucun agent disponible, veuillez en créer un</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="date"
                                                    className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[10px] outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={face.dateDebut}
                                                    onChange={e => {
                                                        const nf = [...formData.faces];
                                                        nf[i].dateDebut = e.target.value;
                                                        setFormData({ ...formData, faces: nf });
                                                    }}
                                                />
                                                <input
                                                    type="date"
                                                    className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[10px] outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={face.dateFin}
                                                    onChange={e => {
                                                        const nf = [...formData.faces];
                                                        nf[i].dateFin = e.target.value;
                                                        setFormData({ ...formData, faces: nf });
                                                    }}
                                                />
                                            </div>

                                            {/* ============================================ */}
                                            {/* SECTION PHOTO - DISPOSITION ADAPTATIVE */}
                                            {/* ============================================ */}
                                            <div className="mt-2">
                                                {/* En-tête compact */}
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Camera size={12} className="text-blue-500 flex-shrink-0" />
                                                    <span className="text-[7px] font-bold text-gray-600">Preuve d'affichage</span>
                                                    {(localPreviews[i] || face.photoCampagneUrl) && (
                                                        <span className="text-[6px] text-emerald-600 font-bold">✓ Photo</span>
                                                    )}
                                                </div>

                                                {/* Conteneur principal - Flex row avec photo et boutons côte à côte */}
                                                <div className={`flex gap-2 ${(localPreviews[i] || face.photoCampagneUrl) ? 'items-start' : 'flex-col'}`}>

                                                    {/* Aperçu - visible seulement si photo existe */}
                                                    {(localPreviews[i] || face.photoCampagneUrl) && (
                                                        <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer group">
                                                            <img
                                                                src={localPreviews[i] || face.photoCampagneUrl}
                                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                                alt="Aperçu"
                                                                onClick={() => {
                                                                    // ✅ Zoom sur la photo quand on clique
                                                                    const url = localPreviews[i] || face.photoCampagneUrl;
                                                                    if (url) {
                                                                        // Créer un modal de zoom
                                                                        const modal = document.createElement('div');
                                                                        modal.className = 'fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer';
                                                                        modal.onclick = () => modal.remove();
                                                                        modal.innerHTML = `
                                <div class="relative max-w-3xl max-h-[90vh]">
                                    <img src="${url}" class="w-full h-full object-contain rounded-lg shadow-2xl" alt="Zoom" />
                                    <button class="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white text-sm">✕</button>
                                </div>
                            `;
                                                                        document.body.appendChild(modal);
                                                                        // Fermer avec Echap
                                                                        const handleEsc = (e: KeyboardEvent) => {
                                                                            if (e.key === 'Escape') modal.remove();
                                                                        };
                                                                        document.addEventListener('keydown', handleEsc);
                                                                        modal.onclick = () => {
                                                                            document.removeEventListener('keydown', handleEsc);
                                                                            modal.remove();
                                                                        };
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const nf = [...formData.faces];
                                                                    nf[i].photoCampagneUrl = '';
                                                                    setFormData({ ...formData, faces: nf });
                                                                    setLocalPreviews(prev => {
                                                                        const newPreviews = { ...prev };
                                                                        delete newPreviews[i];
                                                                        return newPreviews;
                                                                    });
                                                                }}
                                                                className="absolute top-0.5 right-0.5 p-0.5 bg-red-500/80 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <X size={8} />
                                                            </button>
                                                            {/* Indicateur de clic pour zoom */}
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                                <span className="text-[6px] text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-1.5 py-0.5 rounded-full">
                                                                    🔍 Zoom
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Boutons - S'adaptent à la présence de la photo */}
                                                    <div className={`flex gap-2 ${(localPreviews[i] || face.photoCampagneUrl) ? 'flex-1 flex-col' : 'flex-row'}`}>
                                                        {/* Galerie */}
                                                        <div className={`relative ${(localPreviews[i] || face.photoCampagneUrl) ? 'w-full' : 'flex-1'}`}>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                id={`file-${i}`}
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        const objectUrl = URL.createObjectURL(file);
                                                                        setLocalPreviews(prev => ({ ...prev, [i]: objectUrl }));
                                                                        handlePhotoUpload(i, file);
                                                                    }
                                                                    e.target.value = '';
                                                                }}
                                                            />
                                                            <div className={`flex items-center justify-center gap-1 py-2 rounded-lg border transition-all duration-300 ${(localPreviews[i] || face.photoCampagneUrl)
                                                                ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 w-full'
                                                                : 'border-blue-200 bg-blue-50 hover:bg-blue-100 flex-1'
                                                                } cursor-pointer`}>
                                                                <Camera size={11} className={(localPreviews[i] || face.photoCampagneUrl) ? 'text-emerald-500' : 'text-blue-500'} />
                                                                <span className="text-[6px] font-medium text-gray-700">
                                                                    {(localPreviews[i] || face.photoCampagneUrl) ? 'Changer' : 'Galerie'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Caméra */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const input = document.createElement('input');
                                                                input.type = 'file';
                                                                input.accept = 'image/*';
                                                                input.capture = 'environment';
                                                                input.onchange = (e) => {
                                                                    const file = (e.target as HTMLInputElement).files?.[0];
                                                                    if (file) {
                                                                        const objectUrl = URL.createObjectURL(file);
                                                                        setLocalPreviews(prev => ({ ...prev, [i]: objectUrl }));
                                                                        handlePhotoUpload(i, file);
                                                                    }
                                                                };
                                                                input.click();
                                                            }}
                                                            className={`flex items-center justify-center gap-1 py-2 rounded-lg border transition-all duration-300 ${(localPreviews[i] || face.photoCampagneUrl)
                                                                ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 w-full'
                                                                : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex-1'
                                                                }`}
                                                        >
                                                            <Camera size={11} className="text-emerald-500" />
                                                            <span className="text-[6px] font-medium text-gray-700">
                                                                {(localPreviews[i] || face.photoCampagneUrl) ? 'Reprendre' : 'Caméra'}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Indicateurs de statut */}
                                                {uploadingIndex === i && (
                                                    <div className="mt-1 flex items-center gap-1.5 py-0.5 bg-blue-50 rounded-lg">
                                                        <div className="w-2 h-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                        <span className="text-[5px] text-blue-600 font-medium">Téléchargement...</span>
                                                    </div>
                                                )}

                                                {(localPreviews[i] || face.photoCampagneUrl) && !uploadingIndex && (
                                                    <div className="mt-1 flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded-lg">
                                                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                                        <span className="text-[5px] font-medium text-emerald-700">Prête</span>
                                                        {face.photoCampagneUrl && <span className="text-[5px] text-emerald-500 ml-auto">✅</span>}
                                                        {!face.photoCampagneUrl && <span className="text-[5px] text-amber-500 ml-auto">⏳</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>




                    {/* ============================================ */}
                    {/* MESSAGE CHAMPS MANQUANTS */}
                    {/* ============================================ */}
                    {missingFields.length > 0 && !loading && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-[8px] sm:text-[9px] text-amber-700 font-medium flex items-center gap-2">
                                <span>⚠️</span>
                                <span>Champs obligatoires manquants :</span>
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {missingFields.map((field, index) => (
                                    <span key={index} className="text-[7px] sm:text-[8px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                        {field}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ============================================ */}
                    {/* BOUTON DE SOUMISSION */}
                    {/* ============================================ */}
                    <button
                        onClick={enregistrerPanneau}
                        disabled={loading || uploadingIndex !== null}
                        className={`w-full py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-3 ${loading || uploadingIndex !== null
                            ? 'bg-gray-400 cursor-not-allowed opacity-70'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                    >
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <Save size={20} />
                        )}
                        {loading ? "TRAITEMENT EN COURS..." : "FINALISER L'ENREGISTREMENT"}
                    </button>
                </div>
            </div>
        </div>
    );
}