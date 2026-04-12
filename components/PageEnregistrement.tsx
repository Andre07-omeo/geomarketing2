'use client';
import React, { useState } from 'react';
import { MapPin, X, Building2, Camera, Loader2, Save } from 'lucide-react';
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

// --- CONFIGURATION CLOUDINARY ---
const CLOUDINARY_UPLOAD_PRESET = "ml_default";
const CLOUDINARY_CLOUD_NAME = "dn7wnikzp"; // Juste l'ID ici

const COMMUNES_KINSHASA = ["Bandalungwa", "Barumbu", "Gombe", "Kalamu", "Kasa-Vubu", "Kimbanseke", "Kinshasa", "Kintambo", "Lemba", "Limete", "Lingwala", "Masina", "Matete", "Mont-Ngafula", "Ngaliema", "Ndjili", "Plateaux", "Nsele"];

export default function PageEnregistrement({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {

    const [loading, setLoading] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);

    const [formData, setFormData] = useState({
        adresse: '',
        zone: '',
        dimension: '',
        typeSupport: 'Bâche', // Ajouté
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

    if (!isOpen) return null;

    const listeSocietes = [
        { id: 1, nomSociete: "Bracongo" }, { id: 2, nomSociete: "Bralima" },
        { id: 3, nomSociete: "Airtel" }, { id: 4, nomSociete: "Orange" }
    ];

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
        setUploadingIndex(index);

        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: data
            });
            const fileData = await res.json();
            const nf = [...formData.faces];
            nf[index].photoCampagneUrl = fileData.secure_url;
            setFormData({ ...formData, faces: nf });
        } catch (error) {
            console.error("Erreur Cloudinary:", error);
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
    setLoading(true);
    try {
        // 1. Calcul de l'ID alphabétique (A, B, C... AA...)
        const snapshot = await getDocs(collection(db, "panneaux"));
        const count = snapshot.size;
        const panelLetterId = getAlphabetId(count + 1); // Ex: 1 -> A, 27 -> AA

        // 2. Attribution des IDs aux faces (ID-1, ID-2...)
        const facesAvecIds = formData.faces.map((face, i) => ({
            ...face,
            id: `${panelLetterId}-${i + 1}` // Ex: AA-1, AA-2
        }));

        // 3. Envoi à Firestore
        await addDoc(collection(db, "panneaux"), {
            ...formData,
           idPan: panelLetterId,
            faces: facesAvecIds,
            coords,
            createdAt: new Date()
        });

        alert(`Dispositif ${panelLetterId} enregistré (${formData.nbFaces} faces générées)`);
        onClose();
    } catch (e) {
        console.error("Erreur:", e);
        alert("Erreur lors de l'enregistrement");
    } finally {
        setLoading(false);
    }
};

    return (
        <div className="fixed inset-0 z-[9999] bg-[#000a1a]/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#1e40af] w-full max-w-2xl p-6 md:p-10 rounded-[3rem] border border-white/20 relative my-auto shadow-2xl">

                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-white font-black text-2xl tracking-tighter">CONFIGURATION</h2>
                        <p className="text-[10px] text-blue-200 font-bold uppercase tracking-[0.5em]">Paramétrage du dispositif</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/10 rounded-full hover:bg-red-500 transition-all group">
                        <X className="text-white group-hover:rotate-90 transition-transform" size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* GPS */}
                    <button
                        onClick={() => navigator.geolocation.getCurrentPosition((pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }))}
                        className={`w-full p-5 rounded-3xl font-black text-[11px] uppercase flex items-center justify-center gap-4 transition-all border-2 ${coords ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-black/20 border-white/10 text-blue-300 hover:border-amber-500'}`}
                    >
                        <MapPin size={20} />
                        {coords ? `Position Capturée (${coords.lat.toFixed(4)})` : 'Activer la Géolocalisation GPS'}
                    </button>

                    {/* Infos Générales */}
                    <div className="space-y-4">
                        <input
                            className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 text-sm outline-none text-white focus:border-amber-500 transition-all placeholder:text-white/20"
                            placeholder="ADRESSE EXACTE DU DISPOSITIF..."
                            value={formData.adresse}
                            onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <select
                                className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 text-sm text-white outline-none focus:border-amber-500 appearance-none"
                                value={formData.zone}
                                onChange={e => setFormData({ ...formData, zone: e.target.value })}
                            >
                                <option value="">COMMUNE...</option>
                                {COMMUNES_KINSHASA.map(c => <option key={c} value={c} className="bg-[#1e40af]">{c.toUpperCase()}</option>)}
                            </select>
                            <input
                                className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 text-sm outline-none text-white focus:border-amber-500 placeholder:text-white/20"
                                placeholder="DIMENSIONS (EX: 12X4M)"
                                value={formData.dimension}
                                onChange={e => setFormData({ ...formData, dimension: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-blue-200 uppercase ml-2">Type de Support</label>
                            <select
                                className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 text-sm text-white outline-none focus:border-amber-500 appearance-none"
                                value={formData.typeSupport}
                                onChange={e => setFormData({ ...formData, typeSupport: e.target.value })}
                            >
                                <option value="Bâche" className="bg-[#1e40af]">BÂCHE</option>
                                <option value="Vinyle" className="bg-[#1e40af]">VINYLE</option>
                                <option value="LED" className="bg-[#1e40af]">ÉCRAN LED</option>
                                <option value="Néon" className="bg-[#1e40af]">NÉON</option>
                                <option value="Peinture" className="bg-[#1e40af]">PEINTURE MURALE</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between bg-black/20 p-5 rounded-3xl border border-white/10">
                            <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Nombre de faces</span>
                            <input
                                type="number"
                                className="bg-transparent font-black text-amber-500 w-12 text-center outline-none text-2xl italic"
                                value={formData.nbFaces}
                                onChange={e => handleNbFacesChange(parseInt(e.target.value) || 1)}
                            />
                        </div>
                    </div>

                    {/* Faces Dynamiques */}
                    <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                        {formData.faces.map((face, i) => (
                            <div key={i} className="p-6 bg-black/20 rounded-[2.5rem] border border-white/10 space-y-5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase text-amber-500 italic">Face {i + 1}</span>
                                    <select
                                        className={`text-[9px] font-black border-2 rounded-xl p-2 outline-none transition-all ${face.statut === 'Occupé' ? 'bg-amber-500 text-black border-white' : 'bg-transparent text-white border-white/20'}`}
                                        value={face.statut}
                                        onChange={e => { const nf = [...formData.faces]; nf[i].statut = e.target.value; setFormData({ ...formData, faces: nf }); }}
                                    >
                                        <option value="Libre">DISPONIBLE</option>
                                        <option value="Occupé">OCCUPÉ</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <input placeholder="SENS DU TRAFIC" className="bg-black/40 p-4 rounded-xl text-[10px] outline-none text-white border border-white/5" value={face.sens} onChange={e => { const nf = [...formData.faces]; nf[i].sens = e.target.value; setFormData({ ...formData, faces: nf }); }} />
                                    <input placeholder="PRIX ($)" type="number" className="bg-black/40 p-4 rounded-xl text-[10px] outline-none text-amber-400 font-bold border border-white/5" value={face.prix} onChange={e => { const nf = [...formData.faces]; nf[i].prix = e.target.value; setFormData({ ...formData, faces: nf }); }} />
                                </div>

                                {face.statut === 'Occupé' && (
                                    <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <select
                                            className="w-full p-3 bg-black/60 rounded-xl text-[10px] font-black text-white outline-none border border-white/10 appearance-none"
                                            value={face.clientNom}
                                            onChange={e => { const nf = [...formData.faces]; nf[i].clientNom = e.target.value; setFormData({ ...formData, faces: nf }); }}
                                        >
                                            <option value="">SOCIÉTÉ CLIENTE...</option>
                                            {listeSocietes.map(s => <option key={s.id} value={s.nomSociete} className="bg-[#1e40af]">{s.nomSociete.toUpperCase()}</option>)}
                                        </select>

                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="date" className="w-full p-3 bg-black/60 rounded-xl text-[10px] text-white outline-none border border-white/10" value={face.dateDebut} onChange={e => { const nf = [...formData.faces]; nf[i].dateDebut = e.target.value; setFormData({ ...formData, faces: nf }); }} />
                                            <input type="date" className="w-full p-3 bg-black/60 rounded-xl text-[10px] text-white outline-none border border-white/10" value={face.dateFin} onChange={e => { const nf = [...formData.faces]; nf[i].dateFin = e.target.value; setFormData({ ...formData, faces: nf }); }} />
                                        </div>

                                        <label className={`w-full flex flex-col items-center justify-center py-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${face.photoCampagneUrl ? 'border-emerald-500 bg-emerald-500/10' : 'border-amber-500/30'}`}>
                                            <input type="file" accept="image/*" className="hidden" capture="environment" onChange={(e) => handlePhotoUpload(i, e.target.files?.[0] || null)} />
                                            {uploadingIndex === i ? <Loader2 className="animate-spin text-amber-500" /> : face.photoCampagneUrl ? (
                                                <img src={face.photoCampagneUrl} className="h-16 w-16 object-cover rounded-lg border-2 border-emerald-500" alt="preview" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-amber-500/60">
                                                    <Camera size={20} />
                                                    <span className="text-[8px] font-black uppercase">Prendre Photo</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Submit */}
                    <button
                        onClick={enregistrerPanneau}
                        disabled={loading || uploadingIndex !== null}
                        className="w-full bg-amber-500 text-[#1e40af] p-6 rounded-[2rem] font-black uppercase text-xs shadow-xl flex justify-center items-center gap-4 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                        Enregistrer le Dispositif
                    </button>
                </div>
            </div>
        </div>
    );
}