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
// --- CONFIGURATION FIREBASE ---
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

// --- CLOUDINARY ---
const CLOUDINARY_UPLOAD_PRESET = "panneaux";
const CLOUDINARY_CLOUD_NAME = "dn7wnikzp";
const LOGO_DISPROMALT = "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg";

const TYPES_PANNEAUX = ["LED", "Bache", "Vinyle",];

type Communaute = string;
type Ville = Record<string, Communaute[]>;
type Province = Record<string, Ville>;

const GEOGRAPHIE: Record<string, Province> = {
    "RDC": {
        "Kinshasa": {
            "Lukunga": [
                "Gombe", "Barumbu", "Kinshasa", "Lingwala", "Kintambo",
                "Ngaliema", "Mont-Ngafula", "Selembao"
            ],
            "Funa": [
                "Bandalungwa", "Kasa-Vubu", "Kalamu", "Limete", "Ngiri-Ngiri"
            ],
            "Mont-Amba": [
                "Matete", "Lemba", "Ngaba", "Kisenso", "Mont-Ngafula"
            ],
            "Tshangu": [
                "Ndjili", "Masina", "Kimbanseke", "Nsele", "Maluku"
            ]

        },
        "Kongo-Central": {
            "Matadi": ["Ville Haute", "Ville Basse", "Nzanza", "Sanga-Sanga"],
            "Boma": ["Nzadi", "Kabondo", "Kalamu"],
            "Mbanza-Ngungu": ["Noki", "Lukala"],
            "Inkisi": ["Kisantu", "Inkisi-Ville"]
        }
    },
    "Brazzaville": {
        "Brazzaville": {
            "Brazzaville": ["M'Pila", "Talangaï", "Ouenzé", "Poto-Poto", "Bacongo"]
        },
        "Pointe-Noire": {
            "Pointe-Noire": ["Lumumba", "Mvou-Mvou"]
        }
    }
};



type Communes = string[];
type Villes = Record<string, Communes>;
type Provinces = Record<string, Villes>;


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
    const { user } = useAuth();

    // Dans votre composant :
    const auth = getAuth();
    const currentUser = auth.currentUser; // Récupération de l'utilisateur connecté

    const [listeAgents, setListeAgents] = useState<{ nom: string, email: string }[]>([]);

    const [formData, setFormData] = useState({
        adresse: '',
        zone: '',
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
    const [listeCommerciaux, setListeCommerciaux] = useState<string[]>([]);




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
                const nomsAgents = donneesBrutes
                    .filter(d => d.role === "commercial" && d.fonction === "agent")
                    .map(d => d.nomComplet || d.nom || "Sans nom")
                    .filter(nom => nom !== "Sans nom");

                // On met à jour les états avec des listes uniques (sans doublons)
                setListeSocietes([...new Set(nomsSocietes)]);
                setListeCommerciaux([...new Set(nomsAgents)]);

            } catch (err) {
                console.error("Erreur de récupération :", err);
            }
        };
        fetchDonnees();
    }, []);
    const [recherche, setRecherche] = useState("");

    // 2. Filtrage automatique
    const suggestionsSocietes = listeSocietes.filter((societes) =>
        societes.toLowerCase().startsWith(recherche.toLowerCase())
    );


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

    const getAlphabetId = (n: number): string => {
        let s = "";
        while (n > 0) {
            let m = (n - 1) % 26;
            s = String.fromCharCode(65 + m) + s;
            n = Math.floor((n - m) / 26);
        }
        return s || "A";
    };

    const enregistrerPanneau = async () => {
        // 1. Validations renforcées
        if (!coords || !coords.lat || !coords.lng) {
            return alert("ERREUR : La position GPS n'a pas été capturée avec précision.");
        }

        if (!formData.adresse.trim()) return alert("ERREUR : L'adresse est obligatoire.");
        if (!formData.zone) return alert("ERREUR : La commune est obligatoire.");

        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, "panneaux"));
            const nextId = getAlphabetId(snapshot.size + 1);
            const now = new Date();
            const isoNow = now.toISOString();

            // 2. Conversion sécurisée des coordonnées
            const latitude = parseFloat(coords.lat);
            const longitude = parseFloat(coords.lng);

            // Vérification si les nombres sont valides
            if (isNaN(latitude) || isNaN(longitude)) {
                throw new Error("Coordonnées GPS invalides.");
            }

            // 3. Construction des faces (ton code actuel est bon)
            const formattedFaces = formData.faces.map((f, i) => {
                const isOccupied = f.statut !== "Libre";
                return {
                    agentEmail: isOccupied ? (currentUser?.email || "") : "",
                    clientNom: isOccupied ? f.clientNom : "",
                    dateDebut: isOccupied ? f.dateDebut : "",
                    dateFin: isOccupied ? f.dateFin : "",
                    photoCampagneUrl: f.photoCampagneUrl || LOGO_DISPROMALT,
                    statut: f.statut,
                    historique: [{
                        agent: currentUser?.displayName || "Agent",
                        date: isoNow,
                        statut: f.statut
                    }],
                    reservations: isOccupied ? [{
                        id: 1,
                        agentEmail: currentUser?.email || "",
                        dateDebut: f.dateDebut,
                        dateFin: f.dateFin,
                        statut: f.statut
                    }] : []
                };
            });

            // 4. Envoi à Firestore avec GeoPoint
            await addDoc(collection(db, "panneaux"), {
                adresse: formData.adresse.trim().toUpperCase(),
                createdAt: serverTimestamp(), // Utilise le temps du serveur pour la précision
                updatedAt: serverTimestamp(),
                dimension: formData.dimension,
                faces: formattedFaces,

                // UTILISATION DU GEOPOINT ICI
                gps: new GeoPoint(latitude, longitude),

                // On peut garder une version texte pour l'affichage rapide si besoin
                gps_raw: { lat: latitude, lng: longitude },

                idPan: nextId,
                nbFaces: formData.nbFaces,
                type: formData.type,
                zone: formData.zone.trim()
            });

            alert(`SUCCÈS : Panneau ${nextId} enregistré avec position précise.`);
            if (onClose) onClose();

        } catch (e: any) {
            console.error("Erreur d'enregistrement:", e);
            alert(`Erreur : ${e.message || "Problème de connexion base de données"}`);
        } finally {
            setLoading(false);
        }
    };




    return (
        <div className="fixed inset-0 z-[9999] bg-[#000a1a]/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#1e40af] w-full max-w-2xl p-6 md:p-10 rounded-[3rem] border border-white/20 shadow-2xl relative">

                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-white font-black text-2xl tracking-tighter italic">NOUVEAU PANNEAU</h2>
                        <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">Saisie obligatoire de tous les champs</p>
                    </div>

                    {user ? (
                        <div className="flex items-center gap-3 pl-6 border-l border-white/10 relative z-[100]">
                            <div className="text-right hidden 2xl:block">
                                <p className="text-[10px] font-bold text-white uppercase tracking-wider">
                                    {/* On privilégie le nom de la DB, sinon displayName, sinon le début de l'email */}
                                    {user.nom || user.displayName || user.email?.split('@')[0] || "Agent"}
                                </p>
                                <p className="text-[8px] text-[#d4af37] font-black uppercase tracking-[0.2em]">
                                    {user.role || "Superviseur"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation(); // Évite que le clic ne déclenche d'autres événements parents
                                    handleLogout();
                                }}
                                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-full transition-all border border-red-500/20 cursor-pointer pointer-events-auto active:scale-95"
                                title="Déconnexion"
                            >
                                <img
                                    src={user.logoUrl || user.photoURL || "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg"}
                                    className="w-8 h-8 rounded-full border border-[#d4af37] object-cover bg-black"
                                    alt="Profil"
                                    onError={(e) => { (e.target as HTMLImageElement).src = "/default-avatar.png" }}
                                />
                                <LogOut size={14} className="flex-shrink-0" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                setIsLoginOpen(true);
                            }}
                            className="relative z-[100] text-[#d4af37] text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors pointer-events-auto cursor-pointer"
                        >
                            Connexion
                        </button>
                    )}
                </div>
                <div className="space-y-5">
                    <button
                        type="button"
                        // On désactive le bouton pendant la recherche pour éviter les bugs
                        disabled={isLocating}
                        // APPEL DE TA FONCTION CI-DESSOUS
                        onClick={handleGetLocation}
                        className={`w-full p-5 rounded-2xl font-black flex flex-col items-center justify-center gap-2 border-2 transition-all duration-500 ${coords
                                ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg'
                                : 'bg-black/20 border-white/10 text-blue-300 hover:border-blue-500/40'
                            } ${isLocating ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            {isLocating ? (
                                <Loader2 size={18} className="animate-spin text-amber-500" />
                            ) : (
                                <MapPin size={18} className={coords ? 'animate-bounce' : ''} />
                            )}

                            <span className="text-[11px] uppercase tracking-[0.2em]">
                                {isLocating
                                    ? 'Recherche satellites (30s max)...'
                                    : coords ? 'Position GPS Verrouillée' : 'Capturer Position GPS *'}
                            </span>
                        </div>

                        {/* Affichage des coordonnées réelles avec animation si elles existent */}
                        {coords && !isLocating && (
                            <div className="flex flex-col items-center mt-1 pt-2 border-t border-white/20 w-full animate-in fade-in slide-in-from-top-1">
                                <span className="font-mono text-[10px] text-emerald-100 tracking-tighter">
                                    LAT: {coords.lat}
                                </span>
                                <span className="font-mono text-[10px] text-emerald-100 tracking-tighter">
                                    LNG: {coords.lng}
                                </span>
                            </div>
                        )}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Dimensions - Mobile: Full / Desktop: 1/2 */}
                        <div className="relative">
                            <input
                                className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 text-white outline-none focus:border-amber-500 transition-all placeholder:text-white/20"
                                placeholder="DIMENSIONS (ex: 4x3) *"
                                value={formData.dimension}
                                onChange={e => setFormData({ ...formData, dimension: e.target.value })}
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[8px] font-black text-amber-500/40 uppercase">Mètres</span>
                        </div>

                        {/* Type de Panneau - Mobile: Full / Desktop: 1/2 */}
                        <select
                            className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 text-white outline-none focus:border-amber-500 font-bold appearance-none cursor-pointer"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="">TYPE DE PANNEAU *</option>
                            {TYPES_PANNEAUX.map(t => (
                                <option key={t} value={t} className="bg-blue-900 text-white">
                                    {t.toUpperCase()}
                                </option>
                            ))}
                        </select>

                        {/* Sélecteur de Faces - Mobile: Full / Desktop: Full (sur une nouvelle ligne si besoin) */}
                        <div className="md:col-span-2 flex items-center justify-between bg-black/40 p-5 rounded-2xl border border-white/10 group hover:border-amber-500/30 transition-all">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Nombre de faces</span>
                                <span className="text-[8px] text-white/40 uppercase">Définit le nombre de formulaires de réservation</span>
                            </div>

                            <div className="flex items-center gap-4 bg-black/20 p-2 rounded-xl border border-white/5">
                                <button
                                    type="button"
                                    onClick={() => handleNbFacesChange(Math.max(1, (formData.nbFaces || 1) - 1))}
                                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 text-white hover:bg-red-500/20 transition-colors"
                                > - </button>

                                <input
                                    type="number"
                                    className="bg-transparent font-black text-amber-500 w-12 text-center text-2xl outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={formData.nbFaces}
                                    onChange={e => handleNbFacesChange(parseInt(e.target.value) || 1)}
                                />

                                <button
                                    type="button"
                                    onClick={() => handleNbFacesChange((formData.nbFaces || 1) + 1)}
                                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 text-white hover:bg-green-500/20 transition-colors"
                                > + </button>
                            </div>
                        </div>
                    </div>
                    <div className="max-h-[30vh] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {formData.faces.map((face, i) => (
                            <div key={i} className="p-6 bg-black/20 rounded-[2.5rem] border border-white/10 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-amber-500 font-black italic text-xs">FACE {i + 1}</span>
                                    <select
                                        className={`text-[10px] font-black rounded-lg p-2 outline-none border ${face.statut === 'Occupé' ? 'bg-amber-500 text-black' : 'bg-white/5 text-white border-white/10'}`}
                                        value={face.statut}
                                        onChange={e => { const nf = [...formData.faces]; nf[i].statut = e.target.value; setFormData({ ...formData, faces: nf }); }}
                                    >
                                        <option value="Libre">LIBRE</option>
                                        <option value="Occupé">OCCUPÉ</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <input placeholder="SENS TRAFIC *" className="bg-black/40 p-4 rounded-xl text-white text-[10px] border border-white/5 outline-none" value={face.sens} onChange={e => { const nf = [...formData.faces]; nf[i].sens = e.target.value; setFormData({ ...formData, faces: nf }); }} />
                                </div>

                                {face.statut === 'Occupé' && (
                                    <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-amber-500/20">

                                        {/* --- CHAMP SOCIÉTÉ --- */}
                                        <div className="relative">
                                            <div className="relative">
                                                <input
                                                    list="suggestions-societes"
                                                    placeholder="NOM DE LA SOCIÉTÉ *"
                                                    className="w-full p-4 bg-black/60 rounded-xl text-white text-xs border border-white/10 outline-none"
                                                    value={face.clientNom}
                                                    onChange={e => {
                                                        const nf = [...formData.faces];
                                                        nf[i].clientNom = e.target.value;
                                                        setFormData({ ...formData, faces: nf });
                                                    }}
                                                />

                                                {/* La liste des suggestions est alimentée par votre state listeSocietes */}
                                                <datalist id="suggestions-societes">
                                                    {listeSocietes.map((nom, idx) => (
                                                        <option key={idx} value={nom} />
                                                    ))}
                                                </datalist>
                                            </div>
                                        </div>

                                        {/* --- CHAMP AGENT COMMERCIAL (Ajouté) --- */}
                                        <div className="relative">
                                            <input
                                                list="listeCommerciaux"
                                                placeholder="AGENT COMMERCIAL *"
                                                className="w-full p-4 bg-black/60 rounded-xl text-white text-xs border border-white/10 outline-none focus:border-blue-500"
                                                value={face.agentNom || ''} // Assurez-vous d'avoir ce champ dans votre state initial
                                                onChange={e => {
                                                    const nf = [...formData.faces];
                                                    nf[i].agentNom = e.target.value; // On stocke le nom de l'agent commercial
                                                    setFormData({ ...formData, faces: nf });
                                                }}
                                            />
                                            <datalist id="listeCommerciaux">
                                                {listeCommerciaux.map((nom, idx) => <option key={idx} value={nom} />)}
                                            </datalist>
                                        </div>

                                        {/* --- DATES --- */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="date" className="bg-black/60 p-3 rounded-xl text-white text-[10px]" value={face.dateDebut} onChange={e => { const nf = [...formData.faces]; nf[i].dateDebut = e.target.value; setFormData({ ...formData, faces: nf }); }} />
                                            <input type="date" className="bg-black/60 p-3 rounded-xl text-white text-[10px]" value={face.dateFin} onChange={e => { const nf = [...formData.faces]; nf[i].dateFin = e.target.value; setFormData({ ...formData, faces: nf }); }} />
                                        </div>

                                        {/* --- PHOTO --- */}
                                        <label className={`w-full flex flex-col items-center justify-center py-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${face.photoCampagneUrl ? 'border-emerald-500 bg-emerald-500/10' : 'border-amber-500/30'}`}>
                                            <input type="file" accept="image/*" className="hidden" capture="environment" onChange={(e) => handlePhotoUpload(i, e.target.files?.[0] || null)} />
                                            {localPreviews[i] || face.photoCampagneUrl ? (
                                                <img src={localPreviews[i] || face.photoCampagneUrl} className="h-20 w-32 object-cover rounded-lg border-2 border-emerald-500" alt="p" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-1 text-amber-500/60"><Camera size={20} /><span className="text-[8px] font-black">PHOTO CAMPAGNE *</span></div>
                                            )}
                                        </label>
                                    </div>
                                )}







                            </div>
                        ))}

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