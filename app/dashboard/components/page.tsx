'use client';
import React, { useState, useEffect } from 'react';
import { MapPin, X, Camera, Loader2, Save } from 'lucide-react';
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
                dimension: formData.dimension,
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


    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-4">
            {/* IMAGE DE FOND */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/fond.jpg"
                    alt="Background"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            </div>
            <div className="bg-black/40 backdrop-blur-xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl p-4 md:p-10 md:rounded-[3rem] border md:border border-white/20 shadow-2xl relative flex flex-col">

                <div className="flex justify-between items-center pb-6 mb-2 border-b border-white/10">
                    {/* GAUCHE - TITRE AVEC BANDE DORÉE */}
                    <div className="flex items-center gap-4">
                        <div className="w-1 h-12 bg-gradient-to-b from-amber-500 via-yellow-500 to-amber-500 rounded-full" />
                        <div>
                            <h2 className="text-white font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-tighter">
                                <span className="text-amber-500">Nouveau</span> Panneau
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="w-1 h-1 rounded-full bg-amber-500" />
                                <p className="text-[6px] sm:text-[7px] md:text-[8px] text-white/40 font-bold uppercase tracking-[0.25em]">
                                    ENREGISTREMENT
                                </p>
                                <div className="w-1 h-1 rounded-full bg-amber-500" />
                            </div>
                        </div>
                    </div>

                    {/* DROITE - MENU NAVIGATION RESPONSIVE */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Bouton Carte - Visible sur tous les appareils */}
                        <button
                            onClick={goToMap}
                            className="group flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 px-2 sm:px-3 py-1.5 rounded-full border border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-300"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-emerald-400 group-hover:scale-110 transition-transform"
                            >
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span className="hidden xs:inline text-[7px] sm:text-[8px] font-bold text-emerald-400 uppercase tracking-wider">
                                Carte
                            </span>
                        </button>

                        {/* Section Utilisateur */}
                        {user ? (
                            <>
                                {/* Nom d'utilisateur - Responsive selon l'appareil */}
                                <div className="text-right">
                                    {/* Version Desktop - Nom complet */}
                                    <p className="hidden lg:block text-[11px] font-bold text-white/80 tracking-tight">
                                        {user.nomComplet || user.nom || user.email?.split('@')[0] || "Agent"}
                                    </p>
                                    {/* Version Tablet - Nom + Rôle */}
                                    <div className="hidden sm:block lg:hidden">
                                        <p className="text-[9px] font-bold text-white/80 tracking-tight">
                                            {user.nom?.split(' ')[0] || user.email?.split('@')[0]?.substring(0, 12) || "Agent"}
                                        </p>
                                        <p className="text-[6px] text-amber-400 font-bold uppercase tracking-wider">
                                            {user.role || "Commercial"}
                                        </p>
                                    </div>
                                    {/* Version Mobile - Juste l'icône */}
                                    <div className="sm:hidden">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
                                            <span className="text-[10px] font-black text-white">
                                                {user.nom?.charAt(0) || user.email?.charAt(0) || "U"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Rôle visible sur Desktop */}
                                    <p className="hidden lg:block text-[7px] text-amber-400 font-bold uppercase tracking-wider mt-0.5">
                                        {user.role || "Superviseur"}
                                    </p>
                                </div>

                                {/* Bouton Déconnexion */}
                                <button
                                    onClick={handleLogout}
                                    className="group flex items-center gap-1 sm:gap-2 bg-white/5 hover:bg-red-500/20 px-2 sm:px-3 py-1.5 rounded-full border border-white/10 hover:border-red-500/40 transition-all duration-300"
                                >
                                    <img
                                        src={logoUrl}
                                        className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full border border-amber-500/50 object-cover"
                                        alt="avatar"
                                    />
                                    <LogOut size={11} className="text-red-400 group-hover:scale-110 transition-transform hidden sm:block" />
                                    <span className="hidden md:inline text-[7px] sm:text-[8px] font-bold text-red-400">
                                        Quitter
                                    </span>
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsLoginOpen(true)}
                                className="px-3 sm:px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider hover:bg-amber-500 hover:text-black transition-all"
                            >
                                🔐 Connexion
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                    <button
                        type="button"
                        disabled={isLocating}
                        onClick={handleGetLocation}
                        className={`
        relative group w-full rounded-2xl transition-all duration-500 transform hover:-translate-y-0.5
        ${coords
                                ? 'bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 border-emerald-500/50 shadow-[0_8px_32px_rgba(16,185,129,0.15)]'
                                : 'bg-white/5 border-white/10 hover:border-amber-500/40 hover:bg-white/10'
                            }${isLocating ? 'opacity-70 cursor-wait' : 'cursor-pointer'} border backdrop-blur-xl overflow-hidden
    `}
                    >
                        {/* Effet de glow au survol */}
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none
        ${coords ? 'bg-emerald-500/5' : 'bg-amber-500/5'}
    `} />

                        <div className="relative p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Anneau extérieur animé */}
                                    <div className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                    ${coords
                                            ? 'bg-emerald-500/20 ring-2 ring-emerald-500/50'
                                            : 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20 group-hover:from-amber-500/30 group-hover:to-yellow-500/30'
                                        }
                    ${isLocating ? 'ring-2 ring-amber-500/50 animate-pulse' : ''}
                `}>
                                        {isLocating ? (
                                            <Loader2 size={20} className="animate-spin text-amber-400" />
                                        ) : (
                                            <MapPin size={20} className={coords ? 'text-emerald-400' : 'text-amber-400 group-hover:scale-110 transition-transform duration-300'} />
                                        )}

                                        {/* Point de pulse pour les coordonnées actives */}
                                        {coords && !isLocating && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
                                        )}
                                    </div>

                                    <div className="text-left">
                                        <p className={`text-xs font-bold uppercase tracking-wider ${coords ? 'text-emerald-400' : 'text-white/70 group-hover:text-amber-400'} transition-colors`}>
                                            {isLocating
                                                ? '🔍 Synchronisation GPS'
                                                : coords
                                                    ? '📍 Position géographique capturée'
                                                    : '📍 Géolocalisation requise'}
                                        </p>
                                        <p className="text-[7px] text-white/40 uppercase tracking-[0.2em] mt-1">
                                            {isLocating
                                                ? 'Recherche en cours...'
                                                : coords
                                                    ? 'Cliquez pour actualiser'
                                                    : 'Cliquez pour activer la localisation'}
                                        </p>
                                    </div>
                                </div>

                                {/* Badge de statut */}
                                <div className={`
                px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-wider transition-all duration-300
                ${coords
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    }
            `}>
                                    {coords ? '✓ ACTIF' : '● REQUIS'}
                                </div>
                            </div>

                            {/* Affichage des coordonnées avec design élégant */}
                            {coords && !isLocating && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 pt-3 border-t border-white/10"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[7px] text-white/40 font-mono uppercase">Latitude</span>
                                                <div className="h-px w-4 bg-white/20" />
                                                <code className="text-[10px] font-mono text-emerald-300 font-bold tracking-wider">{coords.lat.substring(0, 12)}</code>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[7px] text-white/40 font-mono uppercase">Longitude</span>
                                                <div className="h-px w-4 bg-white/20" />
                                                <code className="text-[10px] font-mono text-emerald-300 font-bold tracking-wider">{coords.lng.substring(0, 12)}</code>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-[7px] text-emerald-400/60 font-bold uppercase">
                                            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                            Précision élevée
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </button>
                    <div className="space-y-4">
                        {!isAdresseComplete ? (
                            // --- MODE SAISIE ---
                            <div className="space-y-4 animate-in fade-in duration-500">

                                <div className="grid grid-cols-2 gap-4">


                                    {/* AVENUE */}
                                    <input
                                        type="text"
                                        placeholder="Avenue / Rue"
                                        className="p-3 bg-black/40 rounded-xl border border-white/10 text-white placeholder:text-zinc-500"
                                        value={geo.avenue || ""}
                                        onChange={e => setGeo({ ...geo, avenue: e.target.value })}
                                    />

                                    {/* NUMÉRO */}
                                    <input
                                        type="text"
                                        placeholder="Numéro"
                                        className="p-3 bg-black/40 rounded-xl border border-white/10 text-white placeholder:text-zinc-500"
                                        value={geo.numero || ""}
                                        onChange={e => setGeo({ ...geo, numero: e.target.value })}
                                    />
                                    {/* PAYS */}
                                    <select className="p-3 bg-black/40 rounded-xl border border-white/10 text-white"
                                        value={geo.pays}
                                        onChange={e => setGeo({ ...geo, pays: e.target.value, province: "", villeOuDistrict: "", communeOuZone: "" })}>
                                        <option value="">Pays</option>
                                        {Object.keys(GEOGRAPHIE).map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>

                                    {/* PROVINCE */}
                                    {geo.pays && (
                                        <select className="p-3 bg-black/40 rounded-xl border border-white/10 text-white"
                                            value={geo.province}
                                            onChange={e => setGeo({ ...geo, province: e.target.value, villeOuDistrict: "", communeOuZone: "" })}>
                                            <option value="">Province / Région</option>
                                            {Object.keys(GEOGRAPHIE[geo.pays as keyof typeof GEOGRAPHIE] || {}).map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    )}

                                    {/* VILLE / DISTRICT */}
                                    {geo.pays && geo.province && (
                                        <select className="p-3 bg-black/40 rounded-xl border border-white/10 text-white"
                                            value={geo.villeOuDistrict}
                                            onChange={e => setGeo({ ...geo, villeOuDistrict: e.target.value, communeOuZone: "" })}>
                                            <option value="">Ville / District</option>
                                            {Object.keys((GEOGRAPHIE[geo.pays as keyof typeof GEOGRAPHIE] as any)?.[geo.province] || {}).map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    )}

                                    {/* COMMUNE / ZONE */}
                                    {geo.pays && geo.province && geo.villeOuDistrict && (
                                        <select className="p-3 bg-black/40 rounded-xl border border-white/10 text-white"
                                            value={geo.communeOuZone}
                                            onChange={e => setGeo({ ...geo, communeOuZone: e.target.value })}>
                                            <option value="">Commune / Zone</option>
                                            {((GEOGRAPHIE[geo.pays as keyof typeof GEOGRAPHIE] as any)?.[geo.province]?.[geo.villeOuDistrict] as string[] || []).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    )}


                                </div>


                            </div>
                        ) : (
                            // --- MODE RÉCAPITULATIF ---
                            <div className="p-6 bg-amber-500/10 border border-amber-500/50 rounded-2xl flex justify-between items-center animate-in zoom-in duration-300">
                                <div>
                                    <label className="text-[10px] text-amber-500 uppercase">Adresse finalisée</label>
                                    <p className="text-white font-medium">{formData.adresse}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setGeo({ pays: "", province: "", villeOuDistrict: "", communeOuZone: "", avenue: "", numero: "" })}
                                    className="text-xs text-red-400 hover:text-red-300 underline"
                                >
                                    Modifier
                                </button>
                            </div>
                        )}
                    </div>


                    {/* --- ZONE : INFORMATIONS TECHNIQUES --- */}
                    <div className="space-y-4">
                        {/* SECTION CARACTÉRISTIQUES */}
                        <div className="relative">
                            <div className="absolute -left-3 top-0 w-1 h-6 bg-gradient-to-b from-amber-500 to-yellow-500 rounded-full" />
                            <h3 className="text-white font-black text-sm uppercase tracking-wider mb-4 ml-2">
                                Caractéristiques techniques
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* TYPE DE PANNEAU - PREMIER */}
                            <div className="relative group">
                                <label className="absolute -top-2.5 left-4 px-2 text-[8px] font-black text-amber-400 uppercase tracking-wider bg-black/60 rounded-full z-10">
                                    Type de support *
                                </label>
                                <select
                                    className="w-full pt-5 pb-3 px-4 bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/10 text-white outline-none focus:border-amber-500 transition-all duration-300 appearance-none cursor-pointer group-hover:border-amber-500/50"
                                    value={formData.type}
                                    onChange={e => {
                                        setFormData({ ...formData, type: e.target.value });
                                        // Réinitialiser les dimensions quand le type change
                                        setDimensions({ hauteur: '', largeur: '', unite: '' });
                                    }}
                                >
                                    <option value="" disabled className="bg-gray-900">Sélectionner un type *</option>
                                    {TYPES_PANNEAUX.map((t: string) => (
                                        <option key={t} value={t} className="bg-gray-900 text-white py-2">
                                            {t.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                                {!formData.type && (
                                    <p className="text-[7px] text-red-400 mt-1 ml-2">● Champ obligatoire</p>
                                )}
                            </div>

                            {/* DIMENSIONS - CHAMPS INTELLIGENTS */}
                            <div className="relative group">
                                <label className="absolute -top-2.5 left-4 px-2 text-[8px] font-black text-amber-400 uppercase tracking-wider bg-black/60 rounded-full z-10">
                                    Dimensions *
                                </label>
                                <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/10 p-3 group-hover:border-amber-500/50 transition-all duration-300">
                                    <div className="flex items-center gap-2">
                                        {/* Hauteur */}
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Hauteur"
                                                className="w-full p-3 bg-black/40 rounded-lg border border-white/10 text-white text-center text-sm outline-none focus:border-amber-500 transition-all placeholder:text-white/20"
                                                value={dimensions.hauteur}
                                                onChange={e => setDimensions({ ...dimensions, hauteur: e.target.value })}
                                            />
                                        </div>

                                        {/* Symbole X */}
                                        <div className="text-amber-500 font-black text-lg">X</div>

                                        {/* Largeur */}
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Largeur"
                                                className="w-full p-3 bg-black/40 rounded-lg border border-white/10 text-white text-center text-sm outline-none focus:border-amber-500 transition-all placeholder:text-white/20"
                                                value={dimensions.largeur}
                                                onChange={e => setDimensions({ ...dimensions, largeur: e.target.value })}
                                            />
                                        </div>

                                        {/* Unité - Dynamique selon le type */}
                                        <div className="w-24">
                                            <select
                                                className="w-full p-3 bg-black/40 rounded-lg border border-white/10 text-white text-center text-sm outline-none focus:border-amber-500 transition-all cursor-pointer"
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
                                    </div>

                                    {/* Aperçu de la dimension formatée */}
                                    {dimensions.hauteur && dimensions.largeur && dimensions.unite && (
                                        <div className="mt-2 pt-2 border-t border-white/10 text-center">
                                            <span className="text-[9px] text-amber-400 font-mono">
                                                Dimension: {dimensions.hauteur} × {dimensions.largeur} {dimensions.unite}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SÉLECTEUR DE FACES */}
                        <div className="relative group mt-4">
                            <div className="absolute -left-3 top-0 w-1 h-6 bg-gradient-to-b from-amber-500 to-yellow-500 rounded-full" />
                            <h3 className="text-white font-black text-sm uppercase tracking-wider mb-4 ml-2">
                                Configuration des faces
                            </h3>

                            <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/10 p-5 group-hover:border-amber-500/30 transition-all duration-300">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                            <span className="text-amber-400 font-black text-sm">{formData.nbFaces}</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-white uppercase tracking-wider">
                                                Nombre total de faces
                                            </p>
                                            <p className="text-[7px] text-white/40 uppercase">
                                                Chaque face aura son propre formulaire
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-black/40 rounded-xl p-1 border border-white/5">
                                        <button
                                            type="button"
                                            onClick={() => handleNbFacesChange(Math.max(1, (formData.nbFaces || 1) - 1))}
                                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-red-500/30 transition-all duration-300 hover:scale-110 active:scale-95"
                                        >
                                            <span className="text-lg font-black">−</span>
                                        </button>

                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-16 text-center bg-transparent font-black text-amber-400 text-xl outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                value={formData.nbFaces}
                                                onChange={e => handleNbFacesChange(parseInt(e.target.value) || 1)}
                                                min="1"
                                                max="20"
                                            />
                                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[6px] text-white/30">faces</div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleNbFacesChange((formData.nbFaces || 1) + 1)}
                                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-green-500/30 transition-all duration-300 hover:scale-110 active:scale-95"
                                        >
                                            <span className="text-lg font-black">+</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Indicateur visuel des faces */}
                                <div className="flex justify-center gap-1 mt-4 pt-3 border-t border-white/10">
                                    {Array.from({ length: Math.min(formData.nbFaces, 8) }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-6 h-1 rounded-full bg-amber-500/30"
                                            style={{ width: `${Math.max(20, 60 / formData.nbFaces)}px` }}
                                        />
                                    ))}
                                    {formData.nbFaces > 8 && (
                                        <span className="text-[6px] text-white/30 ml-1">+{formData.nbFaces - 8}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <style jsx>{`
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }
`}</style>
                    <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                        {formData.faces.map((face, i) => (
                            <div key={i} className="p-6 bg-black/20 rounded-[2.5rem] border border-white/10 space-y-6">

                                {/* --- EN-TÊTE DE LA FACE --- */}
                                <div className="flex justify-between items-center">
                                    <span className="text-amber-500 font-black italic text-xs uppercase tracking-widest">
                                        FACE {String.fromCharCode(65 + i)}
                                    </span>
                                    <select
                                        className={`text-[10px] font-black rounded-lg p-2 outline-none border transition-all ${face.statut === 'Occupé'
                                            ? 'bg-amber-500 text-black border-amber-500'
                                            : 'bg-white/5 text-white border-white/10'
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

                                {/* --- CHAMP SENS (Toujours visible) --- */}
                                <div className="grid grid-cols-1 gap-3">
                                    <input
                                        placeholder="SENS TRAFIC (ex: DIRECTION CENTRE VILLE) *"
                                        className="bg-black/40 p-4 rounded-xl text-white text-[10px] border border-white/5 outline-none focus:border-amber-500/50"
                                        value={face.sens}
                                        onChange={e => {
                                            const nf = [...formData.faces];
                                            nf[i].sens = e.target.value.toUpperCase();
                                            setFormData({ ...formData, faces: nf });
                                        }}
                                    />
                                </div>

                                {/* --- DÉTAILS DE LA RÉSERVATION (Si Occupé ou Réservé) --- */}
                                {(face.statut === 'Occupé' || face.statut === 'Réservé') && (
                                    <div className="space-y-4 p-5 bg-white/5 rounded-3xl border border-white/10">

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Société */}
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-white/30 ml-2 font-bold uppercase">Client / Société</label>
                                                <input
                                                    list="suggestions-societes"
                                                    placeholder="NOM DE LA SOCIÉTÉ *"
                                                    className="w-full p-4 bg-black/60 rounded-xl text-white text-xs border border-white/10 outline-none"
                                                    value={face.clientNom || ''}
                                                    onChange={e => {
                                                        const nf = [...formData.faces];
                                                        nf[i].clientNom = e.target.value.toUpperCase();
                                                        setFormData({ ...formData, faces: nf });
                                                    }}
                                                />
                                            </div>

                                            {/* Agent Commercial */}
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-white/30 ml-2 font-bold uppercase">Agent Commercial</label>
                                                <input
                                                    list="listeCommerciaux"
                                                    placeholder="CHOISIR UN AGENT *"
                                                    className="w-full p-4 bg-black/60 rounded-xl text-white text-xs border border-white/10 outline-none"
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
                                        </div>

                                        {/* Dates */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-white/30 ml-2 font-bold uppercase">Début</label>
                                                <input type="date" className="w-full bg-black/60 p-3 rounded-xl text-white text-[10px] border border-white/5" value={face.dateDebut} onChange={e => { const nf = [...formData.faces]; nf[i].dateDebut = e.target.value; setFormData({ ...formData, faces: nf }); }} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-white/30 ml-2 font-bold uppercase">Fin</label>
                                                <input type="date" className="w-full bg-black/60 p-3 rounded-xl text-white text-[10px] border border-white/5" value={face.dateFin} onChange={e => { const nf = [...formData.faces]; nf[i].dateFin = e.target.value; setFormData({ ...formData, faces: nf }); }} />
                                            </div>
                                        </div>

                                        {/* Photo */}
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-white/30 ml-2 font-bold uppercase">Preuve d'affichage</label>
                                            <label className={`w-full flex flex-col items-center justify-center py-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${face.photoCampagneUrl ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:border-amber-500/50'}`}>
                                                <input type="file" accept="image/*" className="hidden" capture="environment" onChange={(e) => handlePhotoUpload(i, e.target.files?.[0] || null)} />
                                                {localPreviews[i] || face.photoCampagneUrl ? (
                                                    <img src={localPreviews[i] || face.photoCampagneUrl} className="h-16 w-28 object-cover rounded-lg border border-white/20" alt="preview" />
                                                ) : (
                                                    <div className="flex items-center gap-2 text-white/40 italic text-[9px]"><Camera size={16} /> CLIQUER POUR PHOTO</div>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* DATA LISTS (Hors de la boucle) */}
                        <datalist id="suggestions-societes">
                            {listeSocietes.map((nom, idx) => <option key={idx} value={nom} />)}
                        </datalist>
                        <datalist id="listeCommerciaux">
                            {listeCommerciaux?.map((c: any, index: number) => (
                                <option key={index} value={typeof c === 'object' ? c.nom : c} />
                            ))}
                        </datalist>
                    </div>

                    <button
                        onClick={enregistrerPanneau}
                        disabled={loading || uploadingIndex !== null}
                        className="w-full bg-amber-500 text-blue-900 p-6 rounded-3xl font-black uppercase text-xs flex justify-center items-center gap-4 active:scale-95 disabled:opacity-50 transition-all"
                    >
                        {/* On encapsule l'icône dans un span pour stabiliser le DOM */}
                        <span className="flex items-center justify-center">
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <Save size={20} />
                            )}
                        </span>

                        <span>
                            {loading ? "TRAITEMENT EN COURS..." : "FINALISER L'ENREGISTREMENT"}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}