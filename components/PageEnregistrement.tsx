'use client';
import React, { useState, useEffect } from 'react';
import { MapPin, X, Camera, Loader2, Save } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

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

const COMMUNES_KINSHASA = ["Bandalungwa", "Barumbu", "Gombe", "Kalamu", "Kasa-Vubu", "Kimbanseke", "Kinshasa", "Kintambo", "Lemba", "Limete", "Lingwala", "Masina", "Matete", "Mont-Ngafula", "Ngaliema", "Ndjili", "Plateaux", "Nsele"];
const TYPES_PANNEAUX = ["Standard", "Lumineux", "LED / Digital", "Déroulant", "Mur d'image", "Abribus", "Totem"];

export default function PageEnregistrement({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [localPreviews, setLocalPreviews] = useState<{ [key: number]: string }>({});
    const [loading, setLoading] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
    const [coords, setCoords] = useState<{ lat: string, lng: string } | null>(null);
    const [listeSocietes, setListeSocietes] = useState<string[]>([]);

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
            dateDebut: '',
            dateFin: '',
            estAujourdhui: false,
            photoCampagneUrl: ''
        }]
    });

    useEffect(() => {
        if (isOpen) {
            const fetchSocietes = async () => {
                try {
                    const snap = await getDocs(collection(db, "societes"));
                    const noms = snap.docs.map(doc => doc.data().nomSociete);
                    setListeSocietes(noms);
                } catch (err) {
                    console.error("Erreur sociétés:", err);
                }
            };
            fetchSocietes();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleNbFacesChange = (n: number) => {
        const val = n < 1 ? 1 : n;
        const newFaces = Array.from({ length: val }, (_, i) =>
            formData.faces[i] || {
                statut: 'Libre', sens: '', prix: '', clientNom: '',
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
        if (!coords) return alert("ERREUR : La position GPS est obligatoire.");
        if (!formData.adresse.trim()) return alert("ERREUR : L'adresse est obligatoire.");
        if (!formData.zone) return alert("ERREUR : La commune est obligatoire.");
        if (!formData.dimension.trim()) return alert("ERREUR : La dimension est obligatoire.");
        if (!formData.type) return alert("ERREUR : Le type de panneau est obligatoire.");

        for (let i = 0; i < formData.faces.length; i++) {
            const face = formData.faces[i];
            const faceLabel = `Face ${i + 1}`;
            if (!face.sens.trim()) return alert(`ERREUR : Le sens du trafic pour la ${faceLabel} est obligatoire.`);
            if (!face.prix.trim()) return alert(`ERREUR : Le prix pour la ${faceLabel} est obligatoire.`);
            if (face.statut === 'Occupé') {
                if (!face.clientNom || !face.dateDebut || !face.dateFin || !face.photoCampagneUrl) {
                    return alert(`ERREUR : Infos incomplètes pour la ${faceLabel} (Occupée).`);
                }
            }
        }

        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, "panneaux"));
            const nextId = getAlphabetId(snapshot.size + 1);

            await addDoc(collection(db, "panneaux"), {
                ...formData,
                adresse: formData.adresse.toUpperCase(),
                idPan: nextId,
                coords: [coords.lat, coords.lng],
                faces: formData.faces.map((f, i) => ({ ...f, faceId: `${nextId}-${i + 1}`, estAujourdhui: f.statut === 'Occupé' })),
                createdAt: new Date()
            });

            alert(`Succès : Panneau ${nextId} enregistré.`);
            onClose();
        } catch (e) {
            alert("Erreur lors de l'enregistrement.");
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
                    <button onClick={onClose} className="p-3 bg-white/10 rounded-full hover:bg-red-500 text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-5">
                    <button
                        onClick={() => navigator.geolocation.getCurrentPosition((pos) => setCoords({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }))}
                        className={`w-full p-5 rounded-2xl font-black text-[11px] flex items-center justify-center gap-4 border-2 transition-all ${coords ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-black/20 border-white/10 text-blue-300'}`}
                    >
                        <MapPin size={20} />
                        {coords ? `GPS ACTIF : ${coords.lat.slice(0, 8)}` : 'CAPTURER POSITION GPS *'}
                    </button>

                    <input
                        className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 text-white outline-none focus:border-amber-500"
                        placeholder="ADRESSE COMPLETE *"
                        value={formData.adresse}
                        onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <select
                            className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 text-white outline-none focus:border-amber-500"
                            value={formData.zone}
                            onChange={e => setFormData({ ...formData, zone: e.target.value })}
                        >
                            <option value="">COMMUNE *</option>
                            {COMMUNES_KINSHASA.map(c => <option key={c} value={c} className="bg-blue-900">{c}</option>)}
                        </select>
                        <input
                            className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 text-white outline-none focus:border-amber-500"
                            placeholder="DIMENSIONS (ex: 4x3) *"
                            value={formData.dimension}
                            onChange={e => setFormData({ ...formData, dimension: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <select
                            className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 text-white outline-none focus:border-amber-500 font-bold"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="">TYPE DE PANNEAU *</option>
                            {TYPES_PANNEAUX.map(t => <option key={t} value={t} className="bg-blue-900">{t.toUpperCase()}</option>)}
                        </select>

                        <div className="flex items-center justify-between bg-black/20 px-5 rounded-2xl border border-white/10">
                            <span className="text-[9px] font-black text-blue-200 uppercase">Faces</span>
                            <input
                                type="number"
                                className="bg-transparent font-black text-amber-500 w-10 text-center text-2xl outline-none"
                                value={formData.nbFaces}
                                onChange={e => handleNbFacesChange(parseInt(e.target.value) || 1)}
                            />
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
                                    <input placeholder="PRIX ($) *" type="number" className="bg-black/40 p-4 rounded-xl text-amber-400 font-bold text-[10px] border border-white/5 outline-none" value={face.prix} onChange={e => { const nf = [...formData.faces]; nf[i].prix = e.target.value; setFormData({ ...formData, faces: nf }); }} />
                                </div>

                                {face.statut === 'Occupé' && (
                                    <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-amber-500/20">
                                        <select className="w-full p-4 bg-black/60 rounded-xl text-white text-xs border border-white/10 outline-none" value={face.clientNom} onChange={e => { const nf = [...formData.faces]; nf[i].clientNom = e.target.value; setFormData({ ...formData, faces: nf }); }}>
                                            <option value="">CLIENT *</option>
                                            {listeSocietes.map((nom, idx) => <option key={idx} value={nom.toLowerCase()} className="bg-blue-900">{nom.toUpperCase()}</option>)}
                                        </select>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="date" className="bg-black/60 p-3 rounded-xl text-white text-[10px]" value={face.dateDebut} onChange={e => { const nf = [...formData.faces]; nf[i].dateDebut = e.target.value; setFormData({ ...formData, faces: nf }); }} />
                                            <input type="date" className="bg-black/60 p-3 rounded-xl text-white text-[10px]" value={face.dateFin} onChange={e => { const nf = [...formData.faces]; nf[i].dateFin = e.target.value; setFormData({ ...formData, faces: nf }); }} />
                                        </div>
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

                        {/* On encapsule le texte dans un span également */}
                        <span>
                            {loading ? "TRAITEMENT EN COURS..." : "FINALISER L'ENREGISTREMENT"}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}