'use client';
import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, Save, X, Camera, CheckCircle2, Globe, Image as ImageIcon } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

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

const COMMUNES_KINSHASA = ["Bandalungwa", "Barumbu", "Gombe", "Kalamu", "Kasa-Vubu", "Kimbanseke", "Kinshasa", "Kintambo", "Lemba", "Limete", "Lingwala", "Masina", "Matete", "Mont-Ngafula", "Ngaliema", "Ndjili", "Nsele"];

export default function PanelsPage() {
    const [panels, setPanels] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
    
    const [formData, setFormData] = useState({
        adresse: '', zone: '', type: '', dimension: '', nbFaces: 1,
        faces: [{ sens: '', prix: '', statut: 'Libre', photoCampagneUrl: '' }]
    });

    // --- 1. GÉNÉRATION D'ID ---
    const incrementerId = (id: string) => {
        let chars = id.split("");
        let i = chars.length - 1;
        while (i >= 0) {
            if (chars[i] === "Z") { chars[i] = "A"; if (i === 0) return "A" + chars.join(""); i--; }
            else { chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1); break; }
        }
        return chars.join("");
    };

    const obtenirProchainId = async () => {
        const q = query(collection(db, "panneaux"), orderBy("idPan", "desc"), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) return "A";
        return incrementerId(snap.docs[0].data().idPan);
    };

    // --- 2. UPLOAD CLOUDINARY ---
    const handlePhotoUpload = async (index: number, file: File | null) => {
        if (!file) return;
        setUploadingIndex(index);

        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "panneaux"); 

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/dn7wnikzp/image/upload`, {
                method: "POST",
                body: data
            });
            const fileData = await res.json();
            if (!res.ok) throw new Error(fileData.error?.message || "Erreur Cloudinary");

            const updatedFaces = [...formData.faces];
            updatedFaces[index].photoCampagneUrl = fileData.secure_url;
            setFormData({ ...formData, faces: updatedFaces });

        } catch (e: any) {
            alert("Erreur: " + e.message);
        } finally {
            setUploadingIndex(null);
        }
    };

    // --- 3. FIREBASE ---
    const enregistrerPanneau = async () => {
        if (!coords || !formData.adresse || !formData.zone) return alert("Position GPS et infos obligatoires !");
        setLoading(true);
        try {
            const uniqueId = await obtenirProchainId();
            const facesPretes = formData.faces.map((f, i) => ({
                faceId: `${uniqueId}-${i + 1}`,
                sens: f.sens,
                prix: f.prix,
                statut: f.statut,
                photoCampagneUrl: f.photoCampagneUrl || "" 
            }));

            await addDoc(collection(db, "panneaux"), {
                adresse: formData.adresse,
                zone: formData.zone,
                type: formData.type,
                dimension: formData.dimension,
                nbFaces: formData.nbFaces,
                idPan: uniqueId,
                faces: facesPretes,
                coords: [coords.lat.toString(), coords.lng.toString()],
                createdAt: serverTimestamp()
            });

            setIsModalOpen(false);
            setCoords(null);
            setFormData({ adresse: '', zone: '', type: '', dimension: '', nbFaces: 1, faces: [{ sens: '', prix: '', statut: 'Libre', photoCampagneUrl: '' }] });
            chargerDonneaux();
            alert(`Panneau ${uniqueId} enregistré !`);
        } catch (e) { alert("Erreur Firebase"); }
        setLoading(false);
    };

    const chargerDonneaux = async () => {
        const q = query(collection(db, "panneaux"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setPanels(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    useEffect(() => { chargerDonneaux(); }, []);

    const handleNbFacesChange = (val: number) => {
        const count = Math.max(1, val);
        const newFaces = Array.from({ length: count }, (_, i) => ({
            sens: formData.faces[i]?.sens || '',
            prix: formData.faces[i]?.prix || '',
            statut: formData.faces[i]?.statut || 'Libre',
            photoCampagneUrl: formData.faces[i]?.photoCampagneUrl || ''
        }));
        setFormData({ ...formData, nbFaces: count, faces: newFaces });
    };

    return (
        <div className="p-4 md:p-8 bg-[#000a1a] min-h-screen text-white font-sans">
            
            {/* HEADER */}
            <div className="bg-[#1e3a8a] p-8 rounded-[2rem] mb-10 border border-blue-400/20 shadow-2xl flex flex-wrap gap-6 items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="bg-amber-500 p-4 rounded-2xl">
                        <Globe className="text-[#1e3a8a]" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Kin-Geo <span className="text-amber-500">Market</span></h1>
                        <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest opacity-80">Réseau Kinshasa 2026</p>
                    </div>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-amber-500 text-[#1e3a8a] px-8 py-4 rounded-2xl font-black text-xs uppercase hover:scale-105 transition-all shadow-lg shadow-amber-500/20">
                    + Ajouter Panneau
                </button>
            </div>

            {/* GRILLE D'AFFICHAGE */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {panels.map((p) => (
                    <div key={p.id} className="bg-[#1e3a8a] p-6 rounded-[2.5rem] border border-blue-400/20 shadow-xl overflow-hidden">
                        <div className="flex justify-between items-start mb-5">
                            <span className="bg-amber-500 text-[#1e3a8a] text-[10px] font-black px-3 py-1.5 rounded-xl uppercase italic">ID: {p.idPan}</span>
                            <span className="text-[10px] text-blue-200 font-black uppercase tracking-widest">{p.zone}</span>
                        </div>
                        <h3 className="font-black text-sm uppercase mb-6 text-white h-10 line-clamp-2">{p.adresse}</h3>
                        
                        <div className="space-y-4 pt-5 border-t border-blue-400/20">
                            {p.faces?.map((f: any, i: number) => (
                                <div key={i} className={`flex flex-col gap-3 p-4 rounded-3xl border ${f.statut === 'Libre' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className={`text-[11px] font-black uppercase ${f.statut === 'Libre' ? 'text-emerald-400' : 'text-red-400'}`}>{f.faceId}</span>
                                            <span className="text-[9px] text-blue-300 font-bold uppercase">{f.sens || 'Sens non défini'}</span>
                                        </div>
                                        <span className="text-xs font-black text-amber-500">{f.prix ? `${f.prix}$` : '--'}</span>
                                    </div>
                                    
                                    {/* ESPACE PHOTO ASSOCIE A LA FACE */}
                                    {f.photoCampagneUrl ? (
                                        <div className="relative h-32 w-full rounded-2xl overflow-hidden border border-blue-400/30">
                                            <img src={f.photoCampagneUrl} alt="Campagne" className="w-full h-full object-cover" />
                                            <div className="absolute top-2 right-2 bg-emerald-500 p-1 rounded-full shadow-lg">
                                                <CheckCircle2 size={12} className="text-white" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-10 w-full rounded-xl bg-[#000a1a]/40 flex items-center justify-center border border-dashed border-blue-400/20">
                                            <ImageIcon size={14} className="text-blue-500/30" />
                                            <span className="text-[8px] uppercase font-bold text-blue-500/40 ml-2 italic">Aucun visuel</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* MODALE */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000a1a]/95 backdrop-blur-xl p-4">
                    <div className="bg-[#1e3a8a] p-8 rounded-[3rem] w-full max-w-lg border border-blue-400/30 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black uppercase text-amber-500 italic tracking-tighter">Configuration</h2>
                            <X className="cursor-pointer text-white" onClick={() => setIsModalOpen(false)} size={30} />
                        </div>

                        <button onClick={() => navigator.geolocation.getCurrentPosition((pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }))}
                            className={`w-full p-5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 transition-all border-2 ${coords ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 'bg-[#000a1a]/40 border-blue-400/20 text-blue-200'}`}>
                            <MapPin size={20} /> {coords ? 'GPS Capturé' : 'Cliquer pour Position GPS'}
                        </button>

                        <div className="space-y-4">
                            <input className="w-full p-4 bg-[#000a1a]/40 rounded-2xl border border-blue-400/20 text-sm outline-none text-white focus:border-amber-500 transition-colors"
                                placeholder="Adresse Exacte" value={formData.adresse} onChange={e => setFormData({...formData, adresse: e.target.value})} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <select className="w-full p-4 bg-[#000a1a]/40 rounded-2xl border border-blue-400/20 text-sm text-white outline-none"
                                    value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})}>
                                    <option value="">Commune</option>
                                    {COMMUNES_KINSHASA.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input className="w-full p-4 bg-[#000a1a]/40 rounded-2xl border border-blue-400/20 text-sm outline-none text-white"
                                    placeholder="Dimensions (ex: 4x3m)" value={formData.dimension} onChange={e => setFormData({...formData, dimension: e.target.value})} />
                            </div>

                            <div className="flex items-center justify-between bg-[#000a1a]/40 p-5 rounded-2xl border border-blue-400/20">
                                <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Nombre de Faces</span>
                                <input type="number" className="bg-transparent font-black text-amber-500 w-12 text-center outline-none text-xl" value={formData.nbFaces}
                                    onChange={e => handleNbFacesChange(parseInt(e.target.value) || 1)} />
                            </div>

                            <div className="space-y-4 border-t border-blue-400/20 pt-6">
                                {formData.faces.map((face, i) => (
                                    <div key={i} className="p-5 bg-[#000a1a]/20 rounded-[2rem] border border-blue-400/10 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest text-amber-500">Détails Face {i+1}</span>
                                            <select className="bg-[#1e3a8a] text-[10px] font-black border border-blue-400/30 rounded p-1 outline-none"
                                                value={face.statut} onChange={e => { const nf = [...formData.faces]; nf[i].statut = e.target.value; setFormData({...formData, faces: nf}); }}>
                                                <option value="Libre">Libre</option>
                                                <option value="Occupé">Occupé</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input placeholder="Sens (ex: Vers Gombe)" className="bg-[#000a1a]/60 p-3 rounded-xl text-[11px] outline-none text-white border border-transparent focus:border-blue-400/30" value={face.sens} 
                                                onChange={e => { const nf = [...formData.faces]; nf[i].sens = e.target.value; setFormData({...formData, faces: nf}); }}/>
                                            <input placeholder="Prix Mensuel $" type="number" className="bg-[#000a1a]/60 p-3 rounded-xl text-[11px] outline-none text-amber-400 font-bold border border-transparent focus:border-blue-400/30" value={face.prix}
                                                onChange={e => { const nf = [...formData.faces]; nf[i].prix = e.target.value; setFormData({...formData, faces: nf}); }}/>
                                        </div>

                                        {face.statut === 'Occupé' && (
                                            <label className={`w-full flex flex-col items-center justify-center py-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${face.photoCampagneUrl ? 'border-emerald-500 bg-emerald-500/10' : 'border-blue-400/30 hover:border-amber-500 hover:bg-amber-500/5'}`}>
                                                <input type="file" accept="image/*" className="hidden" capture="environment" onChange={(e) => handlePhotoUpload(i, e.target.files?.[0] || null)} />
                                                
                                                {uploadingIndex === i ? (
                                                    <Loader2 className="animate-spin text-amber-500" size={24} />
                                                ) : face.photoCampagneUrl ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <img src={face.photoCampagneUrl} className="h-16 w-16 object-cover rounded-lg border border-emerald-500" />
                                                        <span className="text-[9px] font-black text-emerald-400 uppercase">Visuel validé</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-blue-300">
                                                        <Camera size={24} />
                                                        <span className="text-[9px] font-black uppercase">Prendre la photo</span>
                                                    </div>
                                                )}
                                            </label>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={enregistrerPanneau} disabled={loading || uploadingIndex !== null}
                            className="w-full bg-amber-500 text-[#1e3a8a] p-6 rounded-[2rem] font-black uppercase text-sm shadow-xl flex justify-center items-center gap-3 active:scale-95 transition-all disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} Finaliser et Enregistrer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}