'use client';
import React, { useState, useEffect } from 'react';
import { MapPin, X, Camera, Loader2, Save ,Building2,Layers,} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

import { getAuth } from 'firebase/auth'; // Importez ceci
// Assurez-vous que le chemin est correct selon votre structure
import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react"; // Vérifiez que vous avez bien installé lucide-react
import { GeoPoint, serverTimestamp } from 'firebase/firestore';

import { useRouter } from 'next/navigation';
const config = require('../../../config/db');

import { motion } from 'framer-motion';




const CLOUDINARY_UPLOAD_PRESET = config.UPLOAD_PRESET;
const CLOUDINARY_CLOUD_NAME = "dn7wnikzp"; // À garder car Cloudinary a besoin du cloud name
const LOGO_DISPROMALT = config.LOGO_DISPROMALT;
const TYPES_PANNEAUX: string[] = config.TYPES_SUPPORTS;
const GEOGRAPHIE = config.GEOGRAPHIE;


// --- CONFIGURATION FIREBASE ---

const firebaseConfig = config.firebaseConfig;



const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);




export default function PageEnregistrement({
    isOpen,
    onClose,
    // handleLogout,
    setIsLoginOpen
}: {
    isOpen: boolean,
    onClose: () => void,
    handleLogout: () => void,
    setIsLoginOpen: (val: boolean) => void
}) {




    const { logout } = useAuth(); // On récupère 'logout' ici
    const router = useRouter();
    const { user } = useAuth();

    // Ajoutez ce useEffect pour debug
    useEffect(() => {
        console.log("Utilisateur dans PageEnregistrement:", user);
    }, [user]);


    const goToMap = () => {
        if (user) {
            // Encoder les données utilisateur dans l'URL
            const userEncoded = encodeURIComponent(JSON.stringify({
                uid: user.uid,
                email: user.email,
                nomComplet: user.nomComplet || user.nom,
                nom: user.nom,
                role: user.role || "superviseurs"
            }));
            router.push(`/dashboard/components/carte?user=${userEncoded}`);
        } else {
            // Si pas d'utilisateur, rediriger vers la connexion
            setIsLoginOpen(true);
        }
    };

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

    // Dans votre composant :
    const auth = getAuth();




    const currentUser = auth.currentUser; // Récupération de l'utilisateur connecté

    const [listeAgents, setListeAgents] = useState<{ nom: string, email: string }[]>([]);

    const [formData, setFormData] = useState({
        adresse: '',
        dimension: '',
        type: '', // Initialisé vide pour forcer le choix
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


    const [geo, setGeo] = useState({
        pays: "",
        province: "",
        villeOuDistrict: "",
        communeOuZone: "",
        avenue: "",
        numero: ""
    });





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
    const isAdresseComplete = geo.pays && geo.province && geo.villeOuDistrict && geo.communeOuZone && geo.avenue && geo.numero;

    // Mise à jour de l'adresse formatée dans formData
    useEffect(() => {
        const { pays, province, villeOuDistrict, communeOuZone, avenue, numero } = geo;
        // On ne garde que les éléments définis pour construire la chaîne
        const chaine = [pays, province, villeOuDistrict, communeOuZone, avenue, numero]
            .filter(val => val && val.trim() !== "")
            .join(" / ");

        setFormData(prev => ({ ...prev, adresse: chaine }));
        if (isAdresseComplete) {
            const adresseFormattee = `${geo.pays} / ${geo.province} / ${geo.villeOuDistrict} / ${geo.communeOuZone} / ${geo.avenue} / ${geo.numero}`;
            setFormData((prev: any) => ({ ...prev, adresse: adresseFormattee, geographie: geo }));
        }
    }, [geo, isAdresseComplete, setFormData]);





    // À ajouter après les autres useState
    const [dimensions, setDimensions] = useState({
        hauteur: '',
        largeur: '',
        unite: ''
    });








    useEffect(() => {
        const fetchDonnees = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "societes"));

                // On récupère toutes les données brutes
                const donneesBrutes = querySnapshot.docs.map(doc => doc.data());

                // 1. Extraction propre des Sociétés
                const nomsSocietes = donneesBrutes
                    .filter(d => d.role === "visiteur" && d.nomSociete)
                    .map(d => d.nomSociete);

                // 2. Extraction propre des Agents Commerciaux
                // On vérifie le rôle ou la fonction, et on construit le nom
                // 1. Filtrage et formatage initial
                const agentsBruts = donneesBrutes
                    .filter(d => d.role === "commercial" && d.fonction === "agent")
                    .map(d => ({
                        nom: d.nomComplet || d.nom || "Sans nom",
                        email: d.email || ""
                    }))
                    .filter(a => a.nom !== "Sans nom");

                // 2. Suppression des doublons (La méthode Map est plus sûre)
                // On utilise le 'nom' comme clé unique
                const nomsAgents = Array.from(
                    new Map(agentsBruts.map(agent => [agent.nom, agent])).values()
                );

                setListeCommerciaux(nomsAgents);

                // On met à jour les états avec des listes uniques (sans doublons)
                setListeSocietes([...new Set(nomsSocietes)]);
                //setListeCommerciaux([...new Set(nomsAgents)]);

            } catch (err) {
                console.error("Erreur de récupération :", err);
            }
        };
        fetchDonnees();
    }, []);
    const [recherche, setRecherche] = useState("");




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
    // 1. Transforme "A" en 1, "B" en 2, "AA" en 27, etc.
    const alphabetToNumber = (s: string): number => {
        let n = 0;
        for (let i = 0; i < s.length; i++) {
            n = n * 26 + (s.charCodeAt(i) - 64);
        }
        return n;
    };

    // 2. Ta fonction originale
    const getAlphabetId = (n: number): string => {
        let s = "";
        while (n > 0) {
            let m = (n - 1) % 26;
            s = String.fromCharCode(65 + m) + s;
            n = Math.floor((n - m) / 26);
        }
        return s || "A";
    };
    const logoUrl = "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg";

    const resetForm = () => {
        // Réinitialiser tous les états
        setFormData({
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
            avenue: "",
            numero: ""
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

    // Fonction de validation à ajouter avant enregistrerPanneau
    const validateForm = () => {
        const errors: { [key: string]: string } = {};

        // Validation GPS
        if (!coords || !coords.lat || !coords.lng) {
            errors.gps = "La position GPS est obligatoire";
        }

        // Validation adresse complète
        if (!geo.pays || !geo.province || !geo.villeOuDistrict || !geo.communeOuZone || !geo.avenue || !geo.numero) {
            errors.adresse = "Tous les champs d'adresse sont obligatoires";
        }

        // Validation dimension
        if (!formData.dimension.trim()) {
            errors.dimension = "La dimension est obligatoire";
        }

        // Validation type
        if (!formData.type) {
            errors.type = "Le type de panneau est obligatoire";
        }

        // Validation des faces
        for (let i = 0; i < formData.faces.length; i++) {
            const face = formData.faces[i];

            if (!face.sens.trim()) {
                errors[`face_${i}_sens`] = `Face ${i + 1}: Le sens est obligatoire`;
            }

            if (face.statut !== 'Libre') {
                if (!face.clientNom?.trim()) {
                    errors[`face_${i}_client`] = `Face ${i + 1}: Le client est obligatoire`;
                }
                if (!face.agentNom) {
                    errors[`face_${i}_agent`] = `Face ${i + 1}: L'agent commercial est obligatoire`;
                }
                if (!face.dateDebut) {
                    errors[`face_${i}_dateDebut`] = `Face ${i + 1}: La date de début est obligatoire`;
                }
                if (!face.dateFin) {
                    errors[`face_${i}_dateFin`] = `Face ${i + 1}: La date de fin est obligatoire`;
                }
                if (face.dateDebut && face.dateFin && new Date(face.dateDebut) >= new Date(face.dateFin)) {
                    errors[`face_${i}_dates`] = `Face ${i + 1}: La date de début doit être antérieure à la date de fin`;
                }
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const enregistrerPanneau = async () => {
        if (validateForm()) {
            alert("Veuillez remplir tous les champs obligatoires");
            return;
        }
        // 1. Validations renforcées
        if (!coords || !coords.lat || !coords.lng) {
            return alert("ERREUR : La position GPS n'a pas été capturée avec précision.");
        }

        if (!formData.adresse.trim()) return alert("ERREUR : L'adresse est obligatoire.");

        setLoading(true);
        try {
            // --- LOGIQUE IDPAN SÉCURISÉE ---
            const snapshot = await getDocs(collection(db, "panneaux"));

            const dimensionFormatee = dimensions.hauteur && dimensions.largeur && dimensions.unite
            ? `${dimensions.hauteur} x ${dimensions.largeur} ${dimensions.unite}`
            : formData.dimension || '';

            
            let maxNumber = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.idPan) {
                    const currentNum = alphabetToNumber(data.idPan);
                    if (currentNum > maxNumber) maxNumber = currentNum;
                }
            });

            const nextId = getAlphabetId(maxNumber + 1);
            // ----------------------------------------

            const now = new Date();
            const isoNow = now.toISOString();

            // 2. Conversion sécurisée des coordonnées
            const latitude = parseFloat(coords.lat);
            const longitude = parseFloat(coords.lng);

            if (isNaN(latitude) || isNaN(longitude)) {
                throw new Error("Coordonnées GPS invalides.");
            }

            // 3. Construction des faces selon ta structure exacte
            // 3. Construction des faces selon ta structure exacte
            const formattedFaces = formData.faces.map((f, i) => {
                const isOccupied = f.statut !== "Libre";

                // Préparation de l'objet de réservation 
                const reservationData = isOccupied ? {
                    agentEmail: (f as any).agentEmail || "non-specifie@mail.com",
                    // On prend le nom sélectionné dans la liste, sinon le nom de l'admin
                    agentNom: (f as any).agentNom || "Agent inconnu",



                    dateDebut: f.dateDebut || "",
                    dateFin: f.dateFin || "",
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
                idPan: nextId,
                adresse: formData.adresse.trim().toUpperCase(),
                coords: new GeoPoint(latitude, longitude), // GeoPoint natif
                gps_raw: { lat: latitude, lng: longitude }, // Pour lecture rapide
                dimension: dimensionFormatee,
                nbFaces: formData.nbFaces,
                type: formData.type,
                faces: formattedFaces, // Contient sens, historique, reservations
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            alert(`SUCCÈS : Panneau ${nextId} enregistré.`);
            resetForm();

            if (onClose) onClose();

        } catch (e: any) {
            console.error("Erreur d'enregistrement:", e);
            alert(`Erreur : ${e.message || "Problème de connexion base de données"}`);
        } finally {
            setLoading(false);
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
// ============================================
// FONCTION DE TEST DE LA CAMÉRA
// ============================================
const testCamera = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        stream.getTracks().forEach(track => track.stop());
        alert("✅ Caméra disponible et fonctionnelle !");
    } catch (err) {
        console.error("❌ Erreur caméra:", err);
        alert("❌ Caméra non disponible ou accès refusé.\n\nVérifiez les permissions de votre navigateur.");
    }
};

    return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
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
                        onClick={goToMap}
                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 transition-all"
                    >
                        <MapPin size={14} className="text-emerald-400" />
                        <span className="hidden xs:inline text-[7px] sm:text-[8px] font-bold text-emerald-400 uppercase">Carte</span>
                    </button>

                    {user ? (
                        <div className="flex items-center gap-2">
                            <div className="text-right hidden sm:block">
                                <p className="text-[8px] sm:text-[9px] font-bold text-white truncate max-w-[80px] sm:max-w-[120px]">
                                    {user.nomComplet || user.nom || user.email?.split('@')[0] || "Agent"}
                                </p>
                                <p className="text-[6px] text-amber-400 font-bold uppercase">{user.role || "Commercial"}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 transition-all"
                            >
                                <LogOut size={14} className="text-red-400" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsLoginOpen(true)}
                            className="px-3 sm:px-4 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] sm:text-[9px] font-bold uppercase hover:bg-amber-500 hover:text-black transition-all"
                        >
                            🔐 Connexion
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
                {/* SECTION ADRESSE */}
                {/* ============================================ */}
                <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                        <Building2 size={16} className="text-blue-600" />
                        <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Adresse du panneau</h3>
                    </div>

                    {!isAdresseComplete ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <input
                                type="text"
                                placeholder="Avenue / Rue"
                                className="col-span-2 sm:col-span-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[11px] outline-none focus:ring-2 focus:ring-blue-500"
                                value={geo.avenue || ""}
                                onChange={e => setGeo({ ...geo, avenue: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Numéro"
                                className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[11px] outline-none focus:ring-2 focus:ring-blue-500"
                                value={geo.numero || ""}
                                onChange={e => setGeo({ ...geo, numero: e.target.value })}
                            />
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
                                    <option value="">Commune / Zone</option>
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
                                onClick={() => setGeo({ pays: "", province: "", villeOuDistrict: "", communeOuZone: "", avenue: "", numero: "" })}
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
                                            <input
                                                placeholder="Client / Société *"
                                                className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[10px] outline-none focus:ring-2 focus:ring-blue-500"
                                                value={face.clientNom || ''}
                                                onChange={e => {
                                                    const nf = [...formData.faces];
                                                    nf[i].clientNom = e.target.value.toUpperCase();
                                                    setFormData({ ...formData, faces: nf });
                                                }}
                                            />
                                            <input
                                                placeholder="Agent commercial *"
                                                className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-[10px] outline-none focus:ring-2 focus:ring-blue-500"
                                                value={(face as any).agentNom || ''}
                                                onChange={(e) => {
                                                    const valeur = e.target.value;
                                                    const nf = [...formData.faces];
                                                    const faceActuelle = nf[i] as any;
                                                    faceActuelle.agentNom = valeur;
                                                    if (listeCommerciaux) {
                                                        const found = listeCommerciaux.find((c: any) => (c.nom || c) === valeur);
                                                        faceActuelle.agentEmail = found?.email || "";
                                                    }
                                                    setFormData({ ...formData, faces: nf });
                                                }}
                                            />
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

                                        {/* Section photo corrigée */}
<label className={`flex flex-col items-center justify-center py-3 rounded-lg border-2 border-dashed cursor-pointer transition ${face.photoCampagneUrl ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-blue-400'}`}>
    <div className="flex gap-2 w-full px-2">
        {/* Bouton Galerie */}
        <div className="flex-1 flex flex-col items-center justify-center py-2">
            <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                id={`file-${i}`}
                onChange={(e) => handlePhotoUpload(i, e.target.files?.[0] || null)} 
            />
            <label htmlFor={`file-${i}`} className="flex flex-col items-center gap-1 cursor-pointer w-full">
                <Camera size={16} className="text-blue-400" />
                <span className="text-[7px] text-gray-500">Galerie</span>
            </label>
        </div>
        
        {/* Bouton Caméra */}
        <div className="flex-1 flex flex-col items-center justify-center py-2">
            <button
                type="button"
                onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'environment';
                    input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handlePhotoUpload(i, file);
                    };
                    input.click();
                }}
                className="flex flex-col items-center gap-1 w-full"
            >
                <Camera size={16} className="text-emerald-500" />
                <span className="text-[7px] text-gray-500">📸 Caméra</span>
            </button>
        </div>
        
        {/* Aperçu si photo existe */}
        {(localPreviews[i] || face.photoCampagneUrl) && (
            <div className="flex-1 flex items-center justify-center">
                <img 
                    src={localPreviews[i] || face.photoCampagneUrl} 
                    className="h-12 w-12 object-cover rounded-lg border border-gray-200" 
                    alt="preview" 
                />
            </div>
        )}
    </div>
</label>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ============================================ */}
                {/* BOUTON DE SOUMISSION */}
                {/* ============================================ */}
                <button
                    onClick={enregistrerPanneau}
                    disabled={loading || uploadingIndex !== null}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
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