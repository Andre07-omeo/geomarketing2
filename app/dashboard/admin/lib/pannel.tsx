'use client';
import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, Save, X, Plus, Filter } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

// --- CONFIGURATION & INITIALISATION ---
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

const COMMUNES_KINSHASA = [
    "Bandalungwa", "Barumbu", "Bumbu", "Gombe", "Kalamu", "Kasa-Vubu", "Kimbanseke",
    "Kinshasa", "Kintambo", "Kisenso", "Lemba", "Limete", "Lingwala",
    "Makala", "Maluku", "Masina", "Matete", "Mont-Ngafula", "Ndjili", "Ngaba",
    "Ngaliema", "Ngiri-Ngiri", "Nsele", "Selembao"
];

export default function PanelsPage() {
    const [panels, setPanels] = useState<any[]>([]);
    const [filteredPanels, setFilteredPanels] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // États de filtrage Navbar
    const [filterZone, setFilterZone] = useState('');
    const [filterStatut, setFilterStatut] = useState('Tous');

    // États Formulaire Modale
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [formData, setFormData] = useState({
        adresse: '',
        zone: '',
        type: '',
        dimension: '',
        nbFaces: 1,
        faces: [{ sens: '', prix: '', statut: 'Libre' }]
    });

    const handleNbFacesChange = (val: number) => {
        const count = Math.max(1, val);
        const newFaces = Array.from({ length: count }, (_, i) => ({
            sens: formData.faces[i]?.sens || '',
            prix: formData.faces[i]?.prix || '',
            statut: formData.faces[i]?.statut || 'Libre'
        }));
        setFormData({ ...formData, nbFaces: count, faces: newFaces });
    };



    const chargerPanneaux = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "panneaux"));
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPanels(data);
            setFilteredPanels(data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { chargerPanneaux(); }, []);

    const [filterNbFaces, setFilterNbFaces] = useState('Tous');
    const [filterType, setFilterType] = useState('Tous');



    useEffect(() => {
        let result = panels;

        if (filterZone) result = result.filter(p => p.zone === filterZone);

        if (filterStatut !== 'Tous') {
            result = result.filter(p => p.faces?.some((f: any) => f.statut === filterStatut));
        }

        if (filterType !== 'Tous') {
            result = result.filter(p => p.type === filterType);
        }

        if (filterNbFaces !== 'Tous') {
            result = result.filter(p => p.nbFaces === parseInt(filterNbFaces));
        }

        setFilteredPanels(result);
    }, [filterZone, filterStatut, filterType, filterNbFaces, panels]);

    // Logique de filtrage
    useEffect(() => {
        let result = panels;
        if (filterZone) result = result.filter(p => p.zone === filterZone);
        if (filterStatut !== 'Tous') {
            result = result.filter(p => p.faces?.some((f: any) => f.statut === filterStatut));
        }
        // CORRECTION ICI : Gestion du nombre de faces
        if (filterNbFaces !== 'Tous') {
            const nb = parseInt(filterNbFaces);
            result = result.filter(p => Number(p.nbFaces) === nb);
        }
        setFilteredPanels(result);
    }, [filterZone, filterStatut, panels]);

    const generateId = (n: number) => {
        let res = "";
        while (n >= 0) {
            res = String.fromCharCode((n % 26) + 65) + res;
            n = Math.floor(n / 26) - 1;
        }
        return res;
    };


    const updateFace = (index: number, field: string, value: any) => {
        const newFaces = [...formData.faces];
        newFaces[index] = { ...newFaces[index], [field]: value };
        setFormData({ ...formData, faces: newFaces });
    };
    const capturerPosition = () => {
        navigator.geolocation.getCurrentPosition(
            (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => alert("Erreur GPS: " + err.message)
        );
    };

    const enregistrer = async () => {
        // Vérifiez uniquement les champs globaux
        if (!coords || !formData.adresse || !formData.zone) {
            return alert("Veuillez remplir tous les champs obligatoires et capturer la position.");
        }

        setLoading(true);
        try {
            const newIdPan = generateId(panels.length);

            // Les informations de sens sont maintenant dans formData.faces
            const facesArray = formData.faces.map((f, i) => ({
                id: `${newIdPan}-${i + 1}`,
                sens: f.sens,
                prix: f.prix,
                statut: f.statut
            }));

            await addDoc(collection(db, "panneaux"), {
                idPan: newIdPan,
                adresse: formData.adresse,
                zone: formData.zone,
                type: formData.type,
                dimension: formData.dimension,
                nbFaces: Number(formData.nbFaces),
                coords: [coords.lat.toString(), coords.lng.toString()],
                faces: facesArray,
                createdAt: new Date().toISOString()
            });

            // Reset propre
            setFormData({
                adresse: '', zone: '', type: '', dimension: '', nbFaces: 1, faces: [{ sens: '', prix: '', statut: 'Libre' }]
            });
            setCoords(null);
            setIsModalOpen(false);
            await chargerPanneaux();
        } catch (e) { alert("Erreur lors de l'enregistrement."); }
        setLoading(false);
    };


    const getStatusColor = (statut: string) => {
        switch (statut) {
            case 'Libre': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'Occupé': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'Réservé': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Maintenance': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
        }
    };

    return (
        <div className="p-4 md:p-10 bg-black min-h-screen text-white font-sans">

            {/* NAVBAR DE FILTRAGE */}
            <div className="bg-zinc-900 p-6 rounded-3xl mb-10 border border-zinc-800 flex flex-wrap gap-6 items-center justify-between shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-500/10 p-3 rounded-2xl">
                        <Filter className="text-amber-500" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tighter">Gestion Panneaux</h1>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">{panels.length} Unités enregistrées</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <select className="bg-black p-2.5 rounded-xl border border-zinc-700 text-xs font-bold uppercase outline-none"
                        onChange={(e) => setFilterType(e.target.value)}>
                        <option value="Tous">Tous les Types</option>
                        <option value="Bache">Bâche</option>
                        <option value="Vrile">Vrile</option>
                        <option value="LED">LED</option>
                        <option value="Digital">Digital</option>
                    </select>

                    


                    
                    <select className="bg-black p-2.5 rounded-xl border border-zinc-700 text-xs font-bold uppercase outline-none focus:border-amber-500"
                        onChange={(e) => setFilterZone(e.target.value)}>
                        <option value="">Toutes les Communes</option>
                        {COMMUNES_KINSHASA.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select
                        className="bg-black p-2.5 rounded-xl border border-zinc-700 text-xs font-bold uppercase outline-none"
                        onChange={(e) => setFilterStatut(e.target.value)}>
                        <option value="Tous">Tous les Statuts</option>
                        <option value="Libre">Libre</option>
                        <option value="Occupé">Occupé</option>
                        <option value="Réservé">Réservé</option>
                        <option value="Maintenance">Maintenance</option>
                    </select>

                    <button onClick={() => setIsModalOpen(true)} className="bg-amber-500 text-black px-5 py-2.5 rounded-xl font-black text-xs uppercase hover:bg-amber-400 transition-all flex items-center gap-2">
                        <Plus size={16} /> Nouveau
                    </button>
                </div>
            </div>
            {/* MODALE D'ENREGISTREMENT MISE À JOUR */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
                    <div className="bg-zinc-900 p-8 rounded-[2.5rem] w-full max-w-lg border border-zinc-700 space-y-5 shadow-2xl shadow-blue-900/20 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Enregistrement</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-red-500/20 rounded-full text-zinc-500 hover:text-red-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <button onClick={capturerPosition}
                            className={`w-full p-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all ${coords ? 'bg-emerald-600 shadow-lg shadow-emerald-900/40' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
                            <MapPin size={18} /> {coords ? 'Position GPS Verrouillée' : 'Capturer Position GPS'}
                        </button>

                        <div className="space-y-4">
                            <input className="w-full p-4 bg-black rounded-2xl border border-zinc-800 text-sm focus:border-blue-500 outline-none"
                                placeholder="Adresse exacte"
                                value={formData.adresse}
                                onChange={e => setFormData({ ...formData, adresse: e.target.value })} />

                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    className="w-full p-4 bg-black rounded-2xl border border-zinc-800 text-sm focus:border-blue-500 outline-none"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="">Type de support</option>
                                    <option value="Bache">Bâche</option>
                                    <option value="Vrile">Vrile</option>
                                    <option value="LED">LED</option>
                                    <option value="Digital">Digital</option>
                                </select>

                                <input
                                    className="w-full p-4 bg-black rounded-2xl border border-zinc-800 text-sm focus:border-blue-500 outline-none"
                                    placeholder="Dimensions (ex: 4x3)"
                                    value={formData.dimension}
                                    onChange={e => setFormData({ ...formData, dimension: e.target.value })}
                                />
                            </div>

                            <select className="w-full p-4 bg-black rounded-2xl border border-zinc-800 text-sm focus:border-blue-500 outline-none"
                                value={formData.zone}
                                onChange={e => setFormData({ ...formData, zone: e.target.value })}>
                                <option value="">Choisir la Zone (Commune)</option>
                                {COMMUNES_KINSHASA.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            <div className="flex items-center gap-4 bg-black p-4 rounded-2xl border border-zinc-800">
                                <span className="text-xs font-bold text-zinc-500 uppercase">Nombre de Faces:</span>
                                <input type="number" min="1" className="bg-transparent w-full outline-none text-sm font-bold"
                                    value={formData.nbFaces}
                                    onChange={e => handleNbFacesChange(parseInt(e.target.value) || 1)} />
                            </div>

                            {/* LOGIQUE DYNAMIQUE DES FACES */}
                            <div className="space-y-3 pt-4 border-t border-zinc-800">
                                <p className="text-[10px] font-black text-zinc-500 uppercase">Configuration des faces</p>
                                {Array.from({ length: formData.nbFaces }).map((_, i) => (
                                    <div key={i} className="grid grid-cols-3 gap-2 p-3 bg-black rounded-2xl border border-zinc-800">
                                        <input
                                            className="bg-transparent text-[10px] outline-none"
                                            placeholder="Sens"
                                            value={formData.faces[i]?.sens || ''}
                                            onChange={(e) => updateFace(i, 'sens', e.target.value)}
                                        />
                                        <input
                                            type="number"
                                            className="bg-transparent text-[10px] outline-none"
                                            placeholder="Prix"
                                            value={formData.faces[i]?.prix || ''}
                                            onChange={(e) => updateFace(i, 'prix', e.target.value)}
                                        />
                                        <select
                                            className="bg-transparent text-[10px] outline-none"
                                            value={formData.faces[i]?.statut || 'Libre'}
                                            onChange={(e) => updateFace(i, 'statut', e.target.value)}>
                                            <option value="Libre">Libre</option>
                                            <option value="Occupé">Occupé</option>
                                            <option value="Réservé">Réservé</option>
                                            <option value="Maintenance">Maintenance</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={enregistrer} disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl font-black text-xs uppercase flex justify-center items-center gap-3 transition-all shadow-lg shadow-blue-900/40">
                            {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />} Confirmer l'enregistrement
                        </button>
                    </div>
                </div>
            )}

            {/* GRILLE D'AFFICHAGE RESPONSIVE */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPanels.map((p) => (
                    <div key={p.id} className="bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800 hover:border-amber-500/40 transition-all group backdrop-blur-sm">
                        <div className="flex justify-between items-start mb-4">
                            <span className="bg-amber-500 text-black text-[9px] font-black px-3 py-1 rounded-lg uppercase">ID: {p.idPan}</span>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">{p.zone}</span>
                        </div>
                        <h3 className="font-black text-sm uppercase mb-4 truncate">{p.adresse}</h3>

                        <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-800">
                            {p.faces?.map((f: any, i: number) => (
                                // Utilisation de la fonction getStatusColor pour la couleur dynamique
                                <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${getStatusColor(f.statut)}`}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                    <span className="text-[9px] font-black uppercase">{f.id}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}