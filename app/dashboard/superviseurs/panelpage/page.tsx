'use client';

import React, { useState } from 'react';
import { MapPin, Loader2, Save, X, Camera } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

// --- CONFIGURATION FIREBASE (La vôtre) ---
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

const COMMUNES_KINSHASA = ["Bandalungwa", "Barumbu", "Gombe", "Kalamu", "Kasa-Vubu", "Kimbanseke", "Kinshasa", "Kintambo", "Lemba", "Limete", "Lingwala", "Masina", "Matete", "Mont-Ngafula", "Ngaliema", "Ndjili", "Nsele"];

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddPanneauModal({ isOpen, onClose }: Props) {
    const [loading, setLoading] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [formData, setFormData] = useState({
        adresse: '', zone: '', type: '', dimension: '', nbFaces: 1,
        faces: [{ sens: '', prix: '', statut: 'Libre', photoCampagneUrl: '' }]
    });

    if (!isOpen) return null;

    // --- LOGIQUE ID ---
    const obtenirProchainId = async () => {
        const q = query(collection(db, "panneaux"), orderBy("idPan", "desc"), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) return "A";
        let id = snap.docs[0].data().idPan;
        let chars = id.split("");
        let i = chars.length - 1;
        while (i >= 0) {
            if (chars[i] === "Z") { chars[i] = "A"; if (i === 0) return "A" + chars.join(""); i--; }
            else { chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1); break; }
        }
        return chars.join("");
    };

    // --- LOGIQUE CLOUDINARY ---
    const handlePhotoUpload = async (index: number, file: File | null) => {
        if (!file) return;
        setUploadingIndex(index);
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "panneaux"); 
        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/dn7wnikzp/image/upload`, { method: "POST", body: data });
            const fileData = await res.json();
            const updatedFaces = [...formData.faces];
            updatedFaces[index].photoCampagneUrl = fileData.secure_url;
            setFormData({ ...formData, faces: updatedFaces });
        } catch (e) { alert("Erreur upload"); }
        finally { setUploadingIndex(null); }
    };

    // --- ENREGISTREMENT ---
    const enregistrer = async () => {
        if (!coords || !formData.adresse || !formData.zone) return alert("Position GPS et infos obligatoires !");
        setLoading(true);
        try {
            const uniqueId = await obtenirProchainId();
            const facesPretes = formData.faces.map((f, i) => ({
                faceId: `${uniqueId}-${i + 1}`, sens: f.sens, prix: f.prix, statut: f.statut, photoCampagneUrl: f.photoCampagneUrl || "" 
            }));
            await addDoc(collection(db, "panneaux"), {
                ...formData, idPan: uniqueId, faces: facesPretes,
                coords: [coords.lat.toString(), coords.lng.toString()],
                createdAt: serverTimestamp()
            });
            alert(`Panneau ${uniqueId} enregistré !`);
            onClose();
        } catch (e) { alert("Erreur Firebase"); }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#000a1a]/95 backdrop-blur-xl p-4">
            <div className="bg-[#1e3a8a] p-8 rounded-[3rem] w-full max-w-lg border border-blue-400/30 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center text-white">
                    <h2 className="text-2xl font-black uppercase text-amber-500 italic">Nouveau Panneau</h2>
                    <X className="cursor-pointer" onClick={onClose} size={30} />
                </div>

                <button onClick={() => navigator.geolocation.getCurrentPosition((pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }))}
                    className={`w-full p-4 rounded-2xl font-bold text-xs uppercase flex gap-3 justify-center border-2 ${coords ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-[#000a1a]/40 border-blue-400/20 text-blue-200'}`}>
                    <MapPin size={18} /> {coords ? 'GPS Capturé' : 'Capturer GPS'}
                </button>

                <div className="space-y-3">
                    <input className="w-full p-4 bg-[#000a1a]/40 rounded-2xl border border-blue-400/20 text-white outline-none"
                        placeholder="Adresse" value={formData.adresse} onChange={e => setFormData({...formData, adresse: e.target.value})} />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <select className="w-full p-4 bg-[#000a1a]/40 rounded-2xl border border-blue-400/20 text-white outline-none"
                            value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})}>
                            <option value="">Commune</option>
                            {COMMUNES_KINSHASA.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input className="w-full p-4 bg-[#000a1a]/40 rounded-2xl border border-blue-400/20 text-white outline-none"
                            placeholder="Dimensions" value={formData.dimension} onChange={e => setFormData({...formData, dimension: e.target.value})} />
                    </div>
                </div>

                <button onClick={enregistrer} disabled={loading} className="w-full bg-amber-500 text-[#1e3a8a] p-5 rounded-[2rem] font-black uppercase flex justify-center items-center gap-3">
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} Enregistrer
                </button>
            </div>
        </div>
    );
}