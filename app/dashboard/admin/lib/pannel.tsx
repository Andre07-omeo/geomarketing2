'use client';
import React, { useState, useEffect } from 'react';
import { 
    MapPin, Loader2, Save, X, Camera, CheckCircle2, 
    Globe, Image as ImageIcon, Calendar, Building2 
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { 
    getFirestore, collection, addDoc, getDocs, query, 
    orderBy, limit, serverTimestamp, onSnapshot 
} from 'firebase/firestore';

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
    const [listeSocietes, setListeSocietes] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        adresse: '', zone: '', type: 'Standard', dimension: '', nbFaces: 1,
        faces: [{ 
            sens: '', prix: '', statut: 'Libre', photoCampagneUrl: '', 
            clientNom: '', dateDebut: '', dateFin: '', estAujourdhui: false 
        }]
    });

    // --- CHARGEMENT DES DONNÉES ---
    useEffect(() => {
        const qSoc = collection(db, "societes");
        const unsubSoc = onSnapshot(qSoc, (snap) => {
            setListeSocietes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        chargerDonneaux();
        return () => unsubSoc();
    }, []);

    const chargerDonneaux = async () => {
        const q = query(collection(db, "panneaux"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setPanels(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    // --- LOGIQUE ID ---
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

    // --- UPLOAD ---
    const handlePhotoUpload = async (index: number, file: File | null) => {
        if (!file) return;
        setUploadingIndex(index);
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "panneaux");

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/dn7wnikzp/image/upload`, { method: "POST", body: data });
            const fileData = await res.json();
            const nf = [...formData.faces];
            nf[index].photoCampagneUrl = fileData.secure_url;
            setFormData({ ...formData, faces: nf });
        } catch (e) { alert("Erreur upload"); }
        finally { setUploadingIndex(null); }
    };

    // --- ACTIONS ---
    const handleNbFacesChange = (val: number) => {
        const count = Math.max(1, val);
        const newFaces = Array.from({ length: count }, (_, i) => ({
            sens: formData.faces[i]?.sens || '',
            prix: formData.faces[i]?.prix || '',
            statut: formData.faces[i]?.statut || 'Libre',
            photoCampagneUrl: formData.faces[i]?.photoCampagneUrl || '',
            clientNom: formData.faces[i]?.clientNom || '',
            dateDebut: formData.faces[i]?.dateDebut || '',
            dateFin: formData.faces[i]?.dateFin || '',
            estAujourdhui: formData.faces[i]?.estAujourdhui || false
        }));
        setFormData({ ...formData, nbFaces: count, faces: newFaces });
    };

    const enregistrerPanneau = async () => {
        if (!coords || !formData.adresse || !formData.zone) return alert("Infos GPS et Adresse manquantes !");
        
        const erreur = formData.faces.some(f => 
            f.statut === 'Occupé' && (!f.photoCampagneUrl || !f.clientNom || !f.dateDebut || !f.dateFin)
        );
        if (erreur) return alert("Erreur : Photo, Société et Dates obligatoires pour les faces occupées !");

        setLoading(true);
        try {
            const uniqueId = await obtenirProchainId();
            const facesPretes = formData.faces.map((f, i) => ({
                faceId: `${uniqueId}-${i + 1}`,
                ...f
            }));

            await addDoc(collection(db, "panneaux"), {
                ...formData,
                idPan: uniqueId,
                faces: facesPretes,
                coords: [coords.lat.toString(), coords.lng.toString()],
                createdAt: serverTimestamp()
            });

            setIsModalOpen(false);
            setCoords(null);
            setFormData({ adresse: '', zone: '', type: 'Standard', dimension: '', nbFaces: 1, faces: [{ sens: '', prix: '', statut: 'Libre', photoCampagneUrl: '', clientNom: '', dateDebut: '', dateFin: '', estAujourdhui: false }] });
            chargerDonneaux();
            alert("Panneau enregistré !");
        } catch (e) { alert("Erreur Firebase"); }
        setLoading(false);
    };

    return (
        <div className="p-4 md:p-10 bg-[#000a1a] min-h-screen text-white font-sans selection:bg-amber-500 selection:text-black">
            
            {/* HEADER */}
            <div className="bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] p-10 rounded-[3rem] mb-12 border border-blue-400/20 shadow-2xl flex flex-wrap gap-8 items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full -mr-20 -mt-20"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="bg-amber-500 p-5 rounded-[1.5rem] shadow-xl shadow-amber-500/20 rotate-3">
                        <Globe className="text-[#1e3a8a]" size={35} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter">Kin-Geo <span className="text-amber-500">Market</span></h1>
                        <p className="text-[10px] text-blue-200 font-black uppercase tracking-[0.4em] opacity-70">Supervision Urbaine • Kinshasa 2026</p>
                    </div>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="relative z-10 bg-white text-[#1e40af] px-10 py-5 rounded-2xl font-black text-xs uppercase hover:bg-amber-500 transition-all shadow-2xl active:scale-95">
                    + Déployer un Panneau
                </button>
            </div>

            {/* GRILLE D'AFFICHAGE */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {panels.map((p) => (
                    <div key={p.id} className="bg-[#1e3a8a]/40 backdrop-blur-md p-8 rounded-[3.5rem] border border-white/10 shadow-2xl hover:border-amber-500/30 transition-all group">
                        <div className="flex justify-between items-center mb-6">
                            <span className="bg-amber-500 text-black text-[10px] font-black px-4 py-2 rounded-2xl uppercase italic">#{p.idPan}</span>
                            <div className="flex items-center gap-2 text-blue-300">
                                <MapPin size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{p.zone}</span>
                            </div>
                        </div>
                        <h3 className="font-black text-lg uppercase mb-8 text-white leading-tight h-14 line-clamp-2 italic tracking-tighter">{p.adresse}</h3>

                        <div className="space-y-6">
                            {p.faces?.map((f: any, i: number) => (
                                <div key={i} className={`p-5 rounded-[2rem] border-2 transition-all ${f.statut === 'Libre' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-[#000a1a]/40 border-white/5'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col">
                                            <span className={`text-[12px] font-black uppercase ${f.statut === 'Libre' ? 'text-emerald-400' : 'text-amber-500'}`}>{f.faceId}</span>
                                            <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">{f.sens}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-white">{f.prix}$</p>
                                            <p className="text-[8px] font-black uppercase text-blue-400">Mensuel</p>
                                        </div>
                                    </div>
                                    
                                    {f.statut === 'Occupé' && (
                                        <div className="space-y-4 animate-in fade-in duration-700">
                                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                                <Building2 size={14} className="text-amber-500" />
                                                <span className="text-[10px] font-black uppercase text-blue-100">{f.clientNom}</span>
                                            </div>
                                            <div className="relative h-40 w-full rounded-2xl overflow-hidden shadow-inner">
                                                <img src={f.photoCampagneUrl} alt="Campagne" className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                                <div className="absolute bottom-3 left-3 flex gap-2">
                                                    <span className="text-[8px] bg-amber-500 text-black px-2 py-1 rounded-md font-black uppercase">Fin: {f.dateFin}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* MODALE DE CONFIGURATION */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000a1a]/95 backdrop-blur-2xl p-4">
                    <div className="bg-[#1e40af] p-8 md:p-12 rounded-[4rem] w-full max-w-2xl border border-white/20 shadow-[0_0_100px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-10">
                            <div className="space-y-1">
                                <h2 className="text-4xl font-black uppercase text-amber-500 italic tracking-tighter leading-none">Configuration</h2>
                                <p className="text-[10px] text-blue-200 font-bold uppercase tracking-[0.5em]">Paramétrage du dispositif</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-4 bg-white/10 rounded-full hover:bg-red-500 transition-all">
                                <X className="text-white" size={24} />
                            </button>
                        </div>

                        {/* GPS */}
                        <button onClick={() => navigator.geolocation.getCurrentPosition((pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }))}
                            className={`w-full p-6 rounded-3xl font-black text-xs uppercase flex items-center justify-center gap-4 transition-all border-2 mb-8 ${coords ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-black/20 border-white/10 text-blue-300 hover:border-amber-500'}`}>
                            <MapPin size={22} /> {coords ? `Coordonnées Capturées (${coords.lat.toFixed(4)})` : 'Activer la Géolocalisation GPS'}
                        </button>

                        <div className="space-y-6">
                            <input className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 text-sm outline-none text-white focus:border-amber-500 transition-all placeholder:text-white/20"
                                placeholder="ADRESSE EXACTE DU DISPOSITIF..." value={formData.adresse} onChange={e => setFormData({...formData, adresse: e.target.value})} />
                            
                            <div className="grid grid-cols-2 gap-6">
                                <select className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 text-sm text-white outline-none focus:border-amber-500 appearance-none"
                                    value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})}>
                                    <option value="">COMMUNE...</option>
                                    {COMMUNES_KINSHASA.map(c => <option key={c} value={c} className="bg-[#1e40af]">{c.toUpperCase()}</option>)}
                                </select>
                                <input className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 text-sm outline-none text-white focus:border-amber-500 placeholder:text-white/20"
                                    placeholder="DIMENSIONS (EX: 12X4M)" value={formData.dimension} onChange={e => setFormData({...formData, dimension: e.target.value})} />
                            </div>

                            <div className="flex items-center justify-between bg-black/20 p-6 rounded-3xl border border-white/10">
                                <span className="text-[11px] font-black text-blue-200 uppercase tracking-widest">Nombre de faces actives</span>
                                <input type="number" className="bg-transparent font-black text-amber-500 w-16 text-center outline-none text-3xl italic" value={formData.nbFaces}
                                    onChange={e => handleNbFacesChange(parseInt(e.target.value) || 1)} />
                            </div>

                            {/* DÉTAILS DES FACES */}
                            <div className="space-y-8 pt-6">
                                {formData.faces.map((face, i) => (
                                    <div key={i} className="p-8 bg-black/20 rounded-[3rem] border border-white/10 space-y-6 relative overflow-hidden group">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[12px] font-black uppercase tracking-tighter text-amber-500 italic">Face Opérationnelle {i+1}</span>
                                            <select className={`text-[10px] font-black border-2 rounded-xl p-2 outline-none transition-all ${face.statut === 'Occupé' ? 'bg-amber-500 text-black border-white' : 'bg-transparent text-white border-white/20'}`}
                                                value={face.statut} onChange={e => { const nf = [...formData.faces]; nf[i].statut = e.target.value; setFormData({...formData, faces: nf}); }}>
                                                <option value="Libre">DISPONIBLE</option>
                                                <option value="Occupé">OCCUPÉ</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <input placeholder="SENS DU TRAFIC" className="bg-black/40 p-4 rounded-xl text-[11px] outline-none text-white border border-white/5 focus:border-amber-500/50" value={face.sens} 
                                                onChange={e => { const nf = [...formData.faces]; nf[i].sens = e.target.value; setFormData({...formData, faces: nf}); }}/>
                                            <input placeholder="PRIX ($)" type="number" className="bg-black/40 p-4 rounded-xl text-[11px] outline-none text-amber-400 font-bold border border-white/5 focus:border-amber-500/50" value={face.prix}
                                                onChange={e => { const nf = [...formData.faces]; nf[i].prix = e.target.value; setFormData({...formData, faces: nf}); }}/>
                                        </div>

                                        {/* SI OCCUPÉ : LOGIQUE AVANCÉE */}
                                        {face.statut === 'Occupé' && (
                                            <div className="space-y-5 p-5 bg-white/5 rounded-3xl border border-white/5 animate-in slide-in-from-top-4 duration-500">
                                                
                                                {/* SOCIÉTÉ */}
                                                <div className="relative">
                                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={18} />
                                                    <select className="w-full p-4 pl-12 bg-black/60 rounded-xl text-[11px] font-black text-white outline-none border border-white/10 focus:border-amber-500 appearance-none"
                                                        value={face.clientNom} onChange={e => { const nf = [...formData.faces]; nf[i].clientNom = e.target.value; setFormData({...formData, faces: nf}); }}>
                                                        <option value="">SÉLECTIONNER LA SOCIÉTÉ...</option>
                                                        {listeSocietes.map(s => <option key={s.id} value={s.nomSociete} className="bg-[#1e40af]">{s.nomSociete.toUpperCase()}</option>)}
                                                    </select>
                                                </div>

                                                {/* DATES */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3 px-2">
                                                        <input type="checkbox" id={`today-${i}`} className="w-4 h-4 accent-amber-500" 
                                                            checked={face.estAujourdhui} 
                                                            onChange={e => {
                                                                const nf = [...formData.faces];
                                                                nf[i].estAujourdhui = e.target.checked;
                                                                if(e.target.checked) nf[i].dateDebut = new Date().toISOString().split('T')[0];
                                                                setFormData({...formData, faces: nf});
                                                            }} 
                                                        />
                                                        <label htmlFor={`today-${i}`} className="text-[10px] font-black uppercase text-blue-200 cursor-pointer">Affichage dès aujourd'hui</label>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <p className="text-[8px] font-black text-amber-500 uppercase px-1">Début Contrat</p>
                                                            <input type="date" disabled={face.estAujourdhui} className="w-full p-3 bg-black/60 rounded-xl text-[11px] text-white outline-none border border-white/10 disabled:opacity-50"
                                                                value={face.dateDebut} onChange={e => { const nf = [...formData.faces]; nf[i].dateDebut = e.target.value; setFormData({...formData, faces: nf}); }}/>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <p className="text-[8px] font-black text-red-400 uppercase px-1">Fin Contrat</p>
                                                            <input type="date" className="w-full p-3 bg-black/60 rounded-xl text-[11px] text-white outline-none border border-white/10 focus:border-red-500"
                                                                value={face.dateFin} onChange={e => { const nf = [...formData.faces]; nf[i].dateFin = e.target.value; setFormData({...formData, faces: nf}); }}/>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* PHOTO */}
                                                <label className={`w-full flex flex-col items-center justify-center py-8 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer ${face.photoCampagneUrl ? 'border-emerald-500 bg-emerald-500/10' : 'border-amber-500/30 hover:bg-amber-500/5'}`}>
                                                    <input type="file" accept="image/*" className="hidden" capture="environment" onChange={(e) => handlePhotoUpload(i, e.target.files?.[0] || null)} />
                                                    {uploadingIndex === i ? <Loader2 className="animate-spin text-amber-500" /> : face.photoCampagneUrl ? (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <img src={face.photoCampagneUrl} className="h-20 w-20 object-cover rounded-xl border-2 border-emerald-500 shadow-lg" />
                                                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Visuel Confirmé</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-3 text-amber-500/60">
                                                            <Camera size={28} />
                                                            <span className="text-[9px] font-black uppercase tracking-tighter">Prendre la photo de la campagne</span>
                                                        </div>
                                                    )}
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={enregistrerPanneau} disabled={loading || uploadingIndex !== null}
                            className="w-full mt-10 bg-amber-500 text-[#1e40af] p-8 rounded-[2.5rem] font-black uppercase text-sm shadow-[0_20px_50px_rgba(212,175,55,0.3)] flex justify-center items-center gap-4 active:scale-95 transition-all disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin" /> : <Save size={24} />} 
                            Valider et Enregistrer le Dispositif
                        </button>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;900&display=swap');
                body { font-family: 'Archivo', sans-serif; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); }
            `}</style>
        </div>
    );
}