'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    MapPin, Loader2, CheckCircle2, Globe, Calendar, Building2,
    LayoutDashboard, Users, TrendingUp, Activity, Bell, LogOut, Menu,
    Settings, Eye, Search, BarChart3, PieChart, Clock, AlertTriangle,
    BookOpen, MessageSquare, HelpCircle, X, ChevronDown, Filter,
    Sunrise, Moon, Zap, Target, Award, Shield, ChevronRight  // ← AJOUTE CECI
    , Power, Edit2, Trash2
    ,
    Layers, Smartphone, Wifi, Cloud, HardDrive, Cpu
} from 'lucide-react';
import { Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    // ... autres imports
    UserPlus, EyeOff,
} from 'lucide-react';

// ============================================
// IMPORTATION DEPUIS LE FICHIER DE CONFIG
// ============================================
const config = require('../../../config/db');

// ============================================
// FIREBASE
// ============================================
import { initializeApp, getApps } from 'firebase/app';
import {
    getFirestore, collection, addDoc, getDocs, query,
    orderBy, limit, serverTimestamp, doc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';

const app = !getApps().length ? initializeApp(config.firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const LOGO_URL = config.LOGO_DISPROMALT;

// ============================================
// FONCTION UTILITAIRE - STATUT D'UNE FACE
// ============================================
const getFaceStatus = (face: any): 'libre' | 'occupe' | 'reserve' | 'maintenance' => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const reservations = face.reservations || [];

    // Chercher une réservation ACTIVE (date du jour entre début et fin)
    const activeRes = reservations.find((res: any) => {
        const debut = new Date(res.dateDebut);
        const fin = new Date(res.dateFin);
        debut.setHours(0, 0, 0, 0);
        fin.setHours(0, 0, 0, 0);
        return now >= debut && now <= fin;
    });

    if (activeRes) {
        const statut = activeRes.statut?.toLowerCase();
        if (statut === 'occupé') return 'occupe';
        if (statut === 'réservé') return 'reserve';
        return 'occupe';
    }

    // Vérifier si la face a un statut maintenance (champ direct)
    if (face.statut === 'Maintenance') return 'maintenance';

    return 'libre';
};
// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export default function AdminDashboard() {
    const [activeModule, setActiveModule] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [panels, setPanels] = useState<any[]>([]);
    const [societes, setSocietes] = useState<any[]>([]);
    const [stats, setStats] = useState({
        panneaux: 0,
        faces: { total: 0, libres: 0, occupees: 0, reservees: 0, maintenance: 0 },
        users: 0,
        societes: 0,
        reservations: { enCours: 0, futures: 0, passees: 0 }
    });

    // ============================================
    // CHARGEMENT DES DONNÉES - VERSION CORRIGÉE
    // ============================================
    useEffect(() => {
        const loadData = async () => {
            try {
                // Chargement des panneaux
                const qPan = query(collection(db, "panneaux"), orderBy("createdAt", "desc"));
                const snapPan = await getDocs(qPan);
                const panneauxData = snapPan.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPanels(panneauxData);

                // Chargement des sociétés (utilisateurs)
                const snapSoc = await getDocs(collection(db, "societes"));
                const societesData = snapSoc.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setSocietes(societesData);

                // ============================================
                // CALCUL DES STATISTIQUES CORRIGÉ
                // ============================================
                let totalFaces = 0;
                let facesLibres = 0;
                let facesOccupees = 0;
                let facesReservees = 0;
                let facesMaintenance = 0;

                const now = new Date();
                now.setHours(0, 0, 0, 0); // Important: comparer uniquement les dates

                // Fonction pour déterminer le statut d'une face basé sur les réservations actives
                const getFaceStatus = (face: any): 'libre' | 'occupe' | 'reserve' | 'maintenance' => {
                    const reservations = face.reservations || [];

                    // Chercher une réservation ACTIVE (date du jour entre début et fin)
                    const activeRes = reservations.find((res: any) => {
                        const debut = new Date(res.dateDebut);
                        const fin = new Date(res.dateFin);
                        debut.setHours(0, 0, 0, 0);
                        fin.setHours(0, 0, 0, 0);
                        return now >= debut && now <= fin;
                    });

                    if (activeRes) {
                        const statut = activeRes.statut?.toLowerCase();
                        if (statut === 'occupé') return 'occupe';
                        if (statut === 'réservé') return 'reserve';
                        return 'occupe';
                    }

                    // Vérifier si la face a un statut maintenance (champ direct)
                    if (face.statut === 'Maintenance') return 'maintenance';

                    return 'libre';
                };

                // Calcul des statistiques par panneau
                panneauxData.forEach((p: any) => {
                    const faces = p.faces || [];
                    totalFaces += faces.length;

                    faces.forEach((face: any) => {
                        const status = getFaceStatus(face);
                        if (status === 'libre') facesLibres++;
                        else if (status === 'occupe') facesOccupees++;
                        else if (status === 'reserve') facesReservees++;
                        else if (status === 'maintenance') facesMaintenance++;
                    });
                });

                // ============================================
                // CALCUL DES RÉSERVATIONS (EN COURS, FUTURES, PASSÉES)
                // ============================================
                let reservationsEnCours = 0;
                let reservationsFutures = 0;
                let reservationsPassees = 0;

                panneauxData.forEach((p: any) => {
                    const faces = p.faces || [];
                    faces.forEach((face: any) => {
                        const reservations = face.reservations || [];
                        reservations.forEach((res: any) => {
                            const debut = new Date(res.dateDebut);
                            const fin = new Date(res.dateFin);
                            debut.setHours(0, 0, 0, 0);
                            fin.setHours(0, 0, 0, 0);

                            if (now >= debut && now <= fin) {
                                reservationsEnCours++;
                            } else if (now < debut) {
                                reservationsFutures++;
                            } else {
                                reservationsPassees++;
                            }
                        });
                    });
                });

                // ============================================
                // MISE À JOUR DES STATS
                // ============================================
                setStats({
                    panneaux: panneauxData.length,
                    faces: {
                        total: totalFaces,
                        libres: facesLibres,
                        occupees: facesOccupees,
                        reservees: facesReservees,
                        maintenance: facesMaintenance
                    },
                    users: societesData.filter((s: any) => s.role === 'commercial' || s.fonction === 'agent').length,
                    societes: societesData.filter((s: any) => s.role === 'visiteur' && s.nomSociete).length,
                    reservations: { enCours: reservationsEnCours, futures: reservationsFutures, passees: reservationsPassees }
                });

                setDataLoading(false);
                setLoading(false);
            } catch (error) {
                console.error("Erreur chargement:", error);
                setDataLoading(false);
                setLoading(false);
            }
        };

        loadData();
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
        return () => unsubscribe();
    }, []);



const handleLogout = async () => {
    const confirmLogout = window.confirm(
        "🔐 Déconnexion\n\nÊtes-vous sûr de vouloir quitter votre session ?\n\nVous devrez vous reconnecter pour accéder à nouveau au tableau de bord."
    );
    
    if (confirmLogout) {
        try {
            await signOut(auth);
            // Nettoyage des données
            localStorage.clear();
            sessionStorage.clear();
            // Redirection
            window.location.href = '/';
        } catch (error) {
            console.error("Erreur lors de la déconnexion:", error);
            alert("Une erreur est survenue lors de la déconnexion");
        }
    }
};
    const menuItems = [
        { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard, color: 'amber', description: 'Vue d\'ensemble' },
        { id: 'panneaux', label: 'Panneaux', icon: MapPin, color: 'blue', description: 'Gestion des supports' },
        { id: 'reservations', label: 'Réservations', icon: Calendar, color: 'emerald', description: 'Suivi des locations' },
        { id: 'utilisateurs', label: 'Utilisateurs', icon: Users, color: 'purple', description: 'Gestion des comptes' },
        { id: 'statistiques', label: 'Statistiques', icon: BarChart3, color: 'cyan', description: 'Analyses et rapports' },
        { id: 'support', label: 'Support', icon: HelpCircle, color: 'orange', description: 'Aide et assistance' },
    ];



 // Ajouter cette fonction utilitaire avant le return du composant principal
    const getFaceStatus = (face: any): 'libre' | 'occupe' | 'reserve' | 'maintenance' => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const reservations = face.reservations || [];

        // Chercher une réservation ACTIVE (date du jour entre début et fin)
        const activeRes = reservations.find((res: any) => {
            const debut = new Date(res.dateDebut);
            const fin = new Date(res.dateFin);
            debut.setHours(0, 0, 0, 0);
            fin.setHours(0, 0, 0, 0);
            return now >= debut && now <= fin;
        });

        if (activeRes) {
            const statut = activeRes.statut?.toLowerCase();
            if (statut === 'occupé') return 'occupe';
            if (statut === 'réservé') return 'reserve';
            return 'occupe';
        }

        // Vérifier si la face a un statut maintenance (champ direct)
        if (face.statut === 'Maintenance') return 'maintenance';

        return 'libre';
    };
   

    if (loading || dataLoading) return <LoadingScreen />;

    return (
        <div className="relative min-h-screen bg-fixed bg-cover bg-center" style={{ backgroundImage: "url('/fond.jpg')" }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div className="relative z-10 flex">
                {/* Sidebar */}
                <aside
                    className={`fixed top-0 left-0 z-50 h-full w-72 bg-black/40 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 lg:translate-x-0 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                >

                    {/* Navigation - avec espacement supplémentaire */}
                    <nav className="flex-1 overflow-y-auto px-4 space-y-2">
                        {/* Logo - avec plus d'espace en bas */}
                        <div className="p-4 border-b border-white/10 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                {/* Logo de la société - remplace Smartphone */}
                                <img
                                    src={LOGO_URL}
                                    alt="Logo Dispromalt"
                                    className="w-8 h-8 rounded-lg object-cover border border-amber-500/30 shadow-lg"
                                />
                                <div>
                                    <h1 className="text-sm font-black text-white">GDP<span className="text-amber-500">ADMIN</span></h1>
                                    <p className="text-[5px] text-white/40 uppercase tracking-wider">Gestion Digitale Panneaux</p>
                                </div>
                            </div>
                        </div>

                        {/* Ajouter un espacement vertical entre le logo et les boutons */}
                        <div className="h-4 flex-shrink-0" />

                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveModule(item.id); setSidebarOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeModule === item.id
                                    ? `bg-${item.color}-500/20 text-${item.color}-400 border border-${item.color}-500/30 shadow-lg`
                                    : 'text-white/50 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <item.icon size={18} />
                                <div className="flex-1 text-left">
                                    <p className="text-[11px] font-medium">{item.label}</p>
                                    <p className="text-[7px] text-white/30">{item.description}</p>
                                </div>
                                {activeModule === item.id && <ChevronRight size={14} className={`text-${item.color}-400`} />}
                            </button>
                        ))}
                    </nav>

                    {/* Footer utilisateur */}
                    <div className="p-4 border-t border-white/10 flex-shrink-0 mt-auto">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center shadow-lg">
                                <span className="text-white text-[10px] font-bold">{user?.email?.charAt(0).toUpperCase() || 'A'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-white truncate">{user?.email?.split('@')[0] || 'Admin'}</p>
                                <p className="text-[7px] text-amber-400 font-bold">Administrateur </p>
                            </div>
                            <button onClick={handleLogout} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all hover:scale-105">
                                <LogOut size={14} />
                            </button>
                        </div>
                    </div>
                </aside>

                {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

                {/* Main Content */}
                {/* Main Content - Modifier pt-16 en pt-0 ou supprimer pt-16 */}
                <main className="flex-1 lg:ml-72 min-h-screen">
                    <header className="sticky top-0 z-30 bg-black/30 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-2 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <button className="lg:hidden text-white hover:bg-white/10 p-2 rounded-lg transition" onClick={() => setSidebarOpen(true)}>
                                <Menu size={20} />
                            </button>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full backdrop-blur-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                                <span className="text-[8px] text-white/80 font-bold uppercase tracking-wider">GDP Online</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <img src={LOGO_URL} className="w-8 h-8 rounded-full border border-amber-500 object-cover" alt="GDP" />
                                <div className="text-right hidden sm:block">
                                    <p className="text-[9px] font-bold text-white">GDP Admin</p>
                                    <p className="text-[6px] text-amber-400 font-bold uppercase">Gestion Digitale Panneaux</p>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Supprimer pt-20 ici, garder seulement p-4 sm:p-6 */}
                    <div className="p-4 sm:p-6">
                        <AnimatePresence mode="wait">
                            {activeModule === 'dashboard' && <DashboardModule stats={stats} key="dashboard" />}
                            {activeModule === 'panneaux' && <PanneauxModule panels={panels} key="panneaux" />}
                            {activeModule === 'reservations' && <ReservationsModule panels={panels} key="reservations" />}
                            {activeModule === 'utilisateurs' && <UtilisateursModule societes={societes} key="utilisateurs" />}
                            {activeModule === 'statistiques' && <StatistiquesModule stats={stats} key="statistiques" />}
                            {activeModule === 'support' && <SupportModule key="support" />}
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}

// ============================================
// DASHBOARD MODULE
// ============================================
function DashboardModule({ stats }: any) {
    const cards = [
        { title: "Panneaux", value: stats.panneaux, icon: MapPin, color: "blue", trend: "", bg: "from-blue-500/20 to-blue-600/10" },
        { title: "Faces", value: stats.faces.total, icon: Layers, color: "amber", trend: "", bg: "from-amber-500/20 to-amber-600/10" },
        { title: "Faces libres", value: stats.faces.libres, icon: CheckCircle2, color: "emerald", trend: "Disponibles", bg: "from-emerald-500/20 to-emerald-600/10" },
        { title: "Faces occupées", value: stats.faces.occupees, icon: Users, color: "blue", trend: "Actives", bg: "from-blue-500/20 to-blue-600/10" },
        { title: "Faces réservées", value: stats.faces.reservees, icon: Calendar, color: "amber", trend: "À venir", bg: "from-amber-500/20 to-amber-600/10" },
        { title: "Agents", value: stats.users, icon: Users, color: "cyan", trend: "", bg: "from-cyan-500/20 to-cyan-600/10" },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-1 h-12 bg-gradient-to-b from-amber-500 to-red-500 rounded-full shadow-lg shadow-amber-500/30" />
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter">Tableau de bord <span className="text-amber-500">GDP</span></h1>
                    <p className="text-[7px] text-white/50 uppercase tracking-wider">Gestion Digitale des Panneaux Publicitaires</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {cards.map((card, i) => (
                    <motion.div key={i} whileHover={{ y: -5, scale: 1.02 }} className={`bg-gradient-to-br ${card.bg} rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/20 backdrop-blur-sm shadow-xl transition-all duration-300`}>
                        <div className="flex justify-between items-start mb-2">
                            <div className={`p-1.5 sm:p-2 rounded-lg bg-${card.color}-500/20`}>
                                <card.icon size={14} className={`text-${card.color}-400`} />
                            </div>
                            {card.trend && <span className={`text-[6px] sm:text-[7px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full`}>{card.trend}</span>}
                        </div>
                        <p className="text-lg sm:text-2xl font-black text-white">{card.value}</p>
                        <p className="text-[7px] sm:text-[8px] text-white/50 uppercase mt-0.5 tracking-wider">{card.title}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FloatingCard title="Occupation des faces" icon={PieChart}>
                    <div className="space-y-4">
                        <StatBar label="Faces libres" value={stats.faces.libres} total={stats.faces.total} color="bg-emerald-500" />
                        <StatBar label="Faces occupées" value={stats.faces.occupees} total={stats.faces.total} color="bg-blue-500" />
                        <StatBar label="Faces réservées" value={stats.faces.reservees} total={stats.faces.total} color="bg-amber-500" />
                        <StatBar label="Faces maintenance" value={stats.faces.maintenance} total={stats.faces.total} color="bg-red-500" />
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10 text-center">
                        <p className="text-[8px] text-white/40">Total panneaux: {stats.panneaux} | Total faces: {stats.faces.total}</p>
                    </div>
                </FloatingCard>

                <FloatingCard title="Réservations" icon={Calendar}>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <Clock size={16} className="text-emerald-400 mx-auto mb-1" />
                            <p className="text-xl font-black text-emerald-400">{stats.reservations.enCours}</p>
                            <p className="text-[7px] text-white/40 uppercase">En cours</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <Calendar size={16} className="text-amber-400 mx-auto mb-1" />
                            <p className="text-xl font-black text-amber-400">{stats.reservations.futures}</p>
                            <p className="text-[7px] text-white/40 uppercase">Futures</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-gray-500/10 border border-gray-500/20">
                            <Clock size={16} className="text-gray-400 mx-auto mb-1" />
                            <p className="text-xl font-black text-gray-400">{stats.reservations.passees}</p>
                            <p className="text-[7px] text-white/40 uppercase">Passées</p>
                        </div>
                    </div>
                </FloatingCard>
            </div>
        </motion.div>
    );
}




// ============================================
// PANNEAUX MODULE
// ============================================
function PanneauxModule({ panels }: any) {
    const [searchTerm, setSearchTerm] = useState("");
    
    // Fonction pour déterminer le statut d'une face basé sur les réservations actives
    const getFaceStatus = (face: any): 'libre' | 'occupe' | 'reserve' => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const reservations = face.reservations || [];
        
        // Chercher une réservation ACTIVE (date du jour entre début et fin)
        const activeRes = reservations.find((res: any) => {
            const debut = new Date(res.dateDebut);
            const fin = new Date(res.dateFin);
            debut.setHours(0, 0, 0, 0);
            fin.setHours(0, 0, 0, 0);
            return now >= debut && now <= fin;
        });
        
        if (activeRes) {
            const statut = activeRes.statut?.toLowerCase();
            if (statut === 'occupé') return 'occupe';
            if (statut === 'réservé') return 'reserve';
            return 'occupe';
        }
        
        return 'libre';
    };

    const filteredPanels = panels.filter((p: any) =>
        p.idPan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.adresse?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-1 h-10 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full shadow-lg" />
                    <div>
                        <h1 className="text-2xl font-black text-white">Panneaux publicitaires</h1>
                        <p className="text-[8px] text-white/50 uppercase tracking-wider">Gestion des supports d'affichage</p>
                    </div>
                </div>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input 
                        type="text" 
                        placeholder="Rechercher..." 
                        className="pl-9 pr-4 py-2 bg-white/10 rounded-xl text-white text-[11px] outline-none focus:ring-1 ring-blue-500 w-48 sm:w-64" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredPanels.map((panel: any, idx: number) => {
                    // Calculer les statistiques des faces pour ce panneau
                    const faces = panel.faces || [];
                    const totalFaces = faces.length;
                    
                    let libres = 0;
                    let occupees = 0;
                    let reservees = 0;
                    
                    faces.forEach((face: any) => {
                        const status = getFaceStatus(face);
                        if (status === 'libre') libres++;
                        else if (status === 'occupe') occupees++;
                        else if (status === 'reserve') reservees++;
                    });
                    
                    return (
                        <motion.div key={panel.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                            <FloatingCard title={`Panneau ${panel.idPan}`} icon={MapPin} className="hover:border-blue-500/30">
                                <div className="space-y-3">
                                    <p className="text-[9px] sm:text-[10px] text-white/70 flex items-start gap-2 line-clamp-2">
                                        <MapPin size={12} className="shrink-0 mt-0.5 text-amber-400" />
                                        {panel.adresse || 'Adresse non définie'}
                                    </p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[8px] sm:text-[9px] text-white/50">{panel.type || 'Standard'}</span>
                                        <span className="text-[8px] sm:text-[9px] text-white/50">{panel.dimension || 'ND'}</span>
                                    </div>
                                    <div className="flex gap-2 pt-2 border-t border-white/10">
                                        {/* Total faces */}
                                        <div className="flex-1 text-center p-2 rounded-lg bg-white/5">
                                            <p className="text-[10px] sm:text-xs font-bold text-amber-400">{totalFaces}</p>
                                            <p className="text-[5px] sm:text-[6px] text-white/40 uppercase">Faces</p>
                                        </div>
                                        {/* Faces libres */}
                                        <div className="flex-1 text-center p-2 rounded-lg bg-emerald-500/10">
                                            <p className="text-[10px] sm:text-xs font-bold text-emerald-400">{libres}</p>
                                            <p className="text-[5px] sm:text-[6px] text-white/40 uppercase">Libres</p>
                                        </div>
                                        {/* Faces occupées */}
                                        <div className="flex-1 text-center p-2 rounded-lg bg-blue-500/10">
                                            <p className="text-[10px] sm:text-xs font-bold text-blue-400">{occupees}</p>
                                            <p className="text-[5px] sm:text-[6px] text-white/40 uppercase">Occupées</p>
                                        </div>
                                        {/* Faces réservées */}
                                        <div className="flex-1 text-center p-2 rounded-lg bg-amber-500/10">
                                            <p className="text-[10px] sm:text-xs font-bold text-amber-400">{reservees}</p>
                                            <p className="text-[5px] sm:text-[6px] text-white/40 uppercase">Réservées</p>
                                        </div>
                                    </div>
                                </div>
                            </FloatingCard>
                        </motion.div>
                    );
                })}
            </div>
            
            {/* Message si aucun résultat */}
            {filteredPanels.length === 0 && (
                <div className="text-center py-12">
                    <MapPin size={48} className="text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">Aucun panneau trouvé</p>
                </div>
            )}
        </motion.div>
    );
}
// ============================================
// RÉSERVATIONS MODULE - AVEC BLOCS DÉROULANTS
// ============================================
function ReservationsModule({ panels }: any) {
    const [openSection, setOpenSection] = useState<string | null>('enCours');
    const [reservations, setReservations] = useState({
        enCours: [] as any[],
        futures: [] as any[],
        passees: [] as any[]
    });
    const now = new Date();

    useEffect(() => {
        const enCours: any[] = [];
        const futures: any[] = [];
        const passees: any[] = [];

        panels.forEach((panel: any) => {
            panel.faces?.forEach((face: any, faceIdx: number) => {
                face.reservations?.forEach((res: any, resIdx: number) => {
                    const debut = new Date(res.dateDebut);
                    const fin = new Date(res.dateFin);
                    const reservation = {
                        ...res,
                        panelId: panel.idPan,
                        panelAdresse: panel.adresse,
                        faceId: `${panel.idPan}-${faceIdx + 1}`,
                        faceSens: face.sens
                    };
                    if (now >= debut && now <= fin) enCours.push(reservation);
                    else if (now < debut) futures.push(reservation);
                    else passees.push(reservation);
                });
            });
        });

        setReservations({ enCours, futures, passees });
    }, [panels]);

    const sections = [
        { id: 'enCours', title: 'Réservations en cours', icon: Clock, color: 'emerald', count: reservations.enCours.length, data: reservations.enCours },
        { id: 'futures', title: 'Réservations futures', icon: Calendar, color: 'amber', count: reservations.futures.length, data: reservations.futures },
        { id: 'passees', title: 'Réservations passées', icon: CheckCircle2, color: 'gray', count: reservations.passees.length, data: reservations.passees }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-1 h-10 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full shadow-lg" />
                <div>
                    <h1 className="text-2xl font-black text-white">Réservations</h1>
                    <p className="text-[8px] text-white/50 uppercase tracking-wider">Suivi des locations</p>
                </div>
            </div>

            <div className="space-y-4">
                {sections.map((section) => (
                    <motion.div key={section.id} className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
                        <button
                            onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
                            className="w-full flex items-center justify-between p-4 transition-colors hover:bg-white/10"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-${section.color}-500/20`}>
                                    <section.icon size={16} className={`text-${section.color}-400`} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-[11px] font-bold text-white">{section.title}</h3>
                                    <p className="text-[8px] text-white/40">{section.count} réservation(s)</p>
                                </div>
                            </div>
                            <motion.div animate={{ rotate: openSection === section.id ? 180 : 0 }} transition={{ duration: 0.3 }}>
                                <ChevronDown size={16} className="text-white/50" />
                            </motion.div>
                        </button>

                        <AnimatePresence>
                            {openSection === section.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="border-t border-white/10"
                                >
                                    <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                                        {section.data.length === 0 ? (
                                            <div className="text-center py-8">
                                                <Calendar size={32} className="text-white/20 mx-auto mb-2" />
                                                <p className="text-white/40 text-[10px]">Aucune réservation</p>
                                            </div>
                                        ) : (
                                            section.data.map((res: any, idx: number) => (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                                                >
                                                    <div className="flex flex-wrap justify-between items-start gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-bold text-amber-400 truncate">{res.societeLocatrice}</p>
                                                            <p className="text-[8px] text-white/50">Panneau: {res.panelId} | Face: {res.faceId}</p>
                                                            <p className="text-[7px] text-white/40 mt-1">{res.dateDebut} → {res.dateFin}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {res.photoCampagneUrl && (
                                                                <img src={res.photoCampagneUrl} className="w-8 h-8 rounded-lg object-cover border border-white/20" alt="" />
                                                            )}
                                                            <span className={`px-2 py-1 rounded-full text-[6px] font-bold uppercase ${section.id === 'enCours' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                section.id === 'futures' ? 'bg-amber-500/20 text-amber-400' :
                                                                    'bg-gray-500/20 text-gray-400'
                                                                }`}>
                                                                {section.id === 'enCours' ? 'En cours' : section.id === 'futures' ? 'À venir' : 'Terminée'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}












// ============================================
// UTILISATEURS MODULE
// ============================================
function UtilisateursModule({ societes }: any) {
    const [activeTab, setActiveTab] = useState('agents');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [editForm, setEditForm] = useState({
        nom: '',
        postNom: '',
        prenom: '',
        nomComplet: '',
        email: '',
        telephone: '',
        role: '',
        fonction: ''
    });

    // Formulaire de création
    const [createForm, setCreateForm] = useState({
        type: 'agent',
        nom: '',
        postNom: '',
        prenom: '',
        fonction: '',
        role: 'commercial',
        email: '',
        telephone: '+243',
        password: '123456789'
    });

    // Filtrer les utilisateurs
    const agents = societes.filter((s: any) => s.role === 'commercial' || s.fonction === 'agent');
    const clients = societes.filter((s: any) => s.role === 'visiteur' && s.nomSociete);

    const currentList = activeTab === 'agents' ? agents : clients;

    const filteredList = currentList.filter((u: any) =>
        (u.nomComplet?.toLowerCase() || u.nomSociete?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    // Générer un email unique
    const generateUniqueEmail = async (prenom: string, nom: string, role: string) => {
        const baseEmail = `${prenom.toLowerCase()}.${nom.toLowerCase()}`;
        let randomNum = Math.floor(Math.random() * 900) + 100;
        let email = `${baseEmail}.${randomNum}@dispromalt.cd`;

        // Vérifier si l'email existe déjà
        let exists = true;
        while (exists) {
            const existingUser = societes.find((s: any) => s.email === email);
            if (!existingUser) {
                exists = false;
            } else {
                randomNum = Math.floor(Math.random() * 900) + 100;
                email = `${baseEmail}.${randomNum}@dispromalt.cd`;
            }
        }
        return email;
    };

    // Générer automatiquement l'email quand les champs changent
    useEffect(() => {
        if (createForm.prenom && createForm.nom) {
            const generateEmailAsync = async () => {
                const newEmail = await generateUniqueEmail(createForm.prenom, createForm.nom, createForm.role);
                setCreateForm(prev => ({ ...prev, email: newEmail }));
            };
            generateEmailAsync();
        }
    }, [createForm.prenom, createForm.nom, societes]);

    // Créer un utilisateur
    const handleCreateUser = async () => {
        if (!createForm.nom || !createForm.prenom || !createForm.telephone) {
            return alert("Veuillez remplir tous les champs obligatoires");
        }

        setIsCreating(true);
        try {
            const userData = {
                nom: createForm.nom,
                postNom: createForm.postNom,
                prenom: createForm.prenom,
                nomComplet: `${createForm.nom} ${createForm.postNom} ${createForm.prenom}`,
                telephone: createForm.telephone,
                email: createForm.email,
                fonction: createForm.fonction,
                role: createForm.role,
                password: createForm.password,
                actif: true,
                isOnline: false,
                createdAt: serverTimestamp(),
                lastLogin: null,
                logoUrl: LOGO_URL,
                mouvements: []
            };

            await addDoc(collection(db, "societes"), userData);
            alert(`✅ Utilisateur créé avec succès\n📧 Email: ${createForm.email}\n🔑 Mot de passe: ${createForm.password}`);
            setIsCreateModalOpen(false);
            setCreateForm({
                type: 'agent',
                nom: '',
                postNom: '',
                prenom: '',
                fonction: '',
                role: 'commercial',
                email: '',
                telephone: '+243',
                password: '123456789'
            });
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la création");
        } finally {
            setIsCreating(false);
        }
    };

    // Formater la date de dernière connexion
    const formatLastSeen = (timestamp: any) => {
        if (!timestamp) return "Jamais connecté";
        try {
            let date;
            if (timestamp && typeof timestamp.toDate === 'function') {
                date = timestamp.toDate();
            } else if (timestamp instanceof Date || typeof timestamp === 'number') {
                date = new Date(timestamp);
            } else if (typeof timestamp === 'string') {
                date = new Date(timestamp);
            } else {
                return "Non disponible";
            }
            if (!isNaN(date.getTime())) {
                return new Intl.DateTimeFormat('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit'
                }).format(date);
            }
            return "Date inconnue";
        } catch (e) {
            return "Erreur";
        }
    };

    // Mettre à jour le statut actif/inactif
    const handleUpdateStatus = async (id: string, currentActif: boolean) => {
        const newStatus = !currentActif;
        const action = newStatus ? "activer" : "désactiver";

        if (confirm(`Voulez-vous vraiment ${action} ce compte ?`)) {
            try {
                await updateDoc(doc(db, "societes", id), { actif: newStatus });
                alert(newStatus ? "✅ Compte activé" : "⚠️ Compte désactivé - L'utilisateur ne pourra plus se connecter");
            } catch (error) {
                alert("Erreur lors de la mise à jour");
            }
        }
    };

    // Supprimer un utilisateur
    const handleDelete = async (id: string) => {
        if (confirm("⚠️ Supprimer définitivement cet utilisateur ? Cette action est irréversible.")) {
            try {
                await deleteDoc(doc(db, "societes", id));
                alert("✅ Utilisateur supprimé");
            } catch (error) {
                alert("Erreur de suppression");
            }
        }
    };

    // Ouvrir le modal d'édition
    const handleEdit = (user: any) => {
        setEditingUser(user);
        setEditForm({
            nom: user.nom || '',
            postNom: user.postNom || '',
            prenom: user.prenom || '',
            nomComplet: user.nomComplet || user.nomSociete || '',
            email: user.email || '',
            telephone: user.telephone || '',
            role: user.role || 'visiteur',
            fonction: user.fonction || ''
        });
    };

    // Sauvegarder les modifications
    const handleSaveEdit = async () => {
        if (!editingUser) return;
        try {
            const updateData: any = {
                email: editForm.email,
                telephone: editForm.telephone,
                role: editForm.role
            };

            if (editForm.nom) {
                updateData.nom = editForm.nom;
                updateData.postNom = editForm.postNom;
                updateData.prenom = editForm.prenom;
                updateData.nomComplet = `${editForm.nom} ${editForm.postNom} ${editForm.prenom}`;
                updateData.fonction = editForm.fonction;
            } else {
                updateData.nomSociete = editForm.nomComplet;
            }

            await updateDoc(doc(db, "societes", editingUser.id), updateData);
            alert("✅ Utilisateur modifié");
            setEditingUser(null);
        } catch (error) {
            alert("Erreur lors de la modification");
        }
    };

    // Obtenir le style du rôle
    const getRoleStyle = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'admin': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
            case 'commercial': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
            case 'visiteur': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
            case 'superviseurs': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            {/* En-tête */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-1 h-10 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full shadow-lg" />
                    <div>
                        <h1 className="text-2xl font-black text-white">Utilisateurs</h1>
                        <p className="text-[8px] text-white/50 uppercase tracking-wider">Gestion des comptes</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    {/* Barre de recherche */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            className="pl-9 pr-4 py-2 bg-white/10 rounded-xl text-white text-[11px] outline-none focus:ring-1 ring-purple-500 w-48 sm:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Bouton créer */}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white text-[11px] font-bold hover:shadow-lg transition-all flex items-center gap-2"
                    >
                        <UserPlus size={14} /> Nouveau
                    </button>
                </div>
            </div>

            {/* Onglets */}
            <div className="flex gap-2 border-b border-white/10 pb-2">
                <button
                    onClick={() => setActiveTab('agents')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'agents' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}`}
                >
                    Agents ({agents.length})
                </button>
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'clients' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}`}
                >
                    Clients ({clients.length})
                </button>
            </div>

            {/* Grille des utilisateurs  */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                {filteredList.map((user: any, idx: number) => (
                    <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ y: -2, scale: 1.01 }}
                        className={`group relative overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-300 cursor-pointer backdrop-blur-md ${!user.actif
                            ? 'bg-red-500/10 border-red-500/30'
                            : user.isOnline
                                ? 'bg-white/10 border-emerald-500/30 hover:bg-white/15'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            } border shadow-lg`}
                    >
                        {/* Badge de statut flottant */}
                        <div className="absolute top-3 right-3 z-10">
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold ${!user.actif
                                ? 'bg-red-500 text-white'
                                : user.isOnline
                                    ? 'bg-emerald-500 text-white shadow-sm'
                                    : 'bg-gray-600 text-white'
                                }`}>
                                {!user.actif ? (
                                    <><Power size={8} /> Désactivé</>
                                ) : user.isOnline ? (
                                    <><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> En ligne</>
                                ) : (
                                    <><Clock size={8} /> Hors ligne</>
                                )}
                            </div>
                        </div>

                        {/* Contenu principal */}
                        <div className="p-3 sm:p-4">
                            {/* Profil */}
                            <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                                {/* Avatar */}
                                <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-md ${!user.actif
                                    ? 'bg-gradient-to-br from-gray-600 to-gray-700'
                                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                                    }`}>
                                    {LOGO_URL ? (
                                        <img src={LOGO_URL} className="w-full h-full rounded-xl object-cover" alt="logo" />
                                    ) : (
                                        <span className="text-white font-black text-base sm:text-lg">
                                            {(user.nomComplet?.charAt(0) || user.nomSociete?.charAt(0) || 'U').toUpperCase()}
                                        </span>
                                    )}
                                    {user.isOnline && user.actif && (
                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                                    )}
                                </div>

                                {/* Infos nom */}
                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-xs sm:text-sm font-bold truncate ${!user.actif ? 'text-gray-300' : 'text-white'}`}>
                                        {user.nomComplet || user.nomSociete || 'Utilisateur'}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        <span className={`px-1.5 py-0.5 rounded-full text-[6px] sm:text-[7px] font-bold uppercase border ${getRoleStyle(user.role)}`}>
                                            {user.role === 'commercial' ? 'agent' : user.role === 'visiteur' ? 'Client' : user.role}
                                        </span>
                                        {user.fonction && (
                                            <span className="text-[6px] sm:text-[7px] text-white/40">{user.fonction}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Informations de contact */}
                            <div className="space-y-2 sm:space-y-2.5">
                                {/* Email */}
                                <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                                    <Mail size={12} className="text-purple-400 shrink-0" />
                                    <span className="text-[8px] sm:text-[9px] text-white/70 truncate flex-1">{user.email}</span>
                                </div>

                                {/* Téléphone */}
                                {user.telephone && (
                                    <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                                        <Phone size={12} className="text-purple-400 shrink-0" />
                                        <span className="text-[8px] sm:text-[9px] text-white/70">{user.telephone}</span>
                                    </div>
                                )}

                                {/* Dernière connexion */}
                                <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                                    <Clock size={12} className="text-purple-400 shrink-0" />
                                    <span className="text-[7px] sm:text-[8px] text-white/50">
                                        {!user.actif
                                            ? 'Compte désactivé'
                                            : user.isOnline
                                                ? 'Actif maintenant'
                                                : `Dernière connexion: ${formatLastSeen(user.lastLogin)}`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-3 pt-0 flex gap-1.5 sm:gap-2 border-t border-white/10 mt-1">
                            <button
                                onClick={() => handleUpdateStatus(user.id, user.actif)}
                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 rounded-lg text-[7px] sm:text-[8px] font-bold uppercase transition-all ${user.actif
                                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                    }`}
                            >
                                <Power size={10} className="sm:w-3 sm:h-3" />
                                <span className="hidden xs:inline">{user.actif ? 'Désactiver' : 'Activer'}</span>
                            </button>
                            <button
                                onClick={() => handleEdit(user)}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all text-[7px] sm:text-[8px] font-bold uppercase"
                            >
                                <Edit2 size={10} className="sm:w-3 sm:h-3" />
                                <span className="hidden xs:inline">Modifier</span>
                            </button>
                            <button
                                onClick={() => handleDelete(user.id)}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all text-[7px] sm:text-[8px] font-bold uppercase"
                            >
                                <Trash2 size={10} className="sm:w-3 sm:h-3" />
                                <span className="hidden xs:inline">Supprimer</span>
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>




            {/* Message si aucun résultat */}
            {filteredList.length === 0 && (
                <div className="text-center py-12">
                    <Users size={48} className="text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">Aucun utilisateur trouvé</p>
                </div>
            )}

            {/* Modal de création d'utilisateur - Version Pro avec scroll et fermeture externe */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4"
                        onClick={(e) => {
                            // Fermer si on clique sur l'overlay (en dehors du modal)
                            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-lg bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header avec dégradé - FIXE */}
                            <div className="relative px-4 xs:px-5 sm:px-6 py-3 xs:py-4 sm:py-5 bg-gradient-to-r from-purple-600/20 to-transparent border-b border-white/10 flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base xs:text-lg sm:text-xl font-bold text-white">
                                            Nouvel utilisateur
                                        </h3>
                                        <p className="text-[7px] xs:text-[8px] sm:text-[9px] text-purple-400 uppercase tracking-wider mt-0.5">
                                            Création de compte
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200"
                                    >
                                        <X size={16} className="text-white/60" />
                                    </button>
                                </div>
                            </div>

                            {/* Corps du formulaire - SCROLLABLE */}
                            <div className="flex-1 overflow-y-auto p-4 xs:p-5 sm:p-6 space-y-4 custom-scrollbar">
                                {/* Type de compte (caché - toujours agent) */}
                                <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
                                    <div className="flex-1 text-center py-2 px-3 rounded-lg bg-purple-500 text-white text-[9px] xs:text-[10px] sm:text-[11px] font-bold uppercase">
                                        Agent commercial
                                    </div>
                                </div>

                                {/* Ligne Nom + Post-nom */}
                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Nom *</label>
                                        <input
                                            type="text"
                                            placeholder="omeonga"
                                            className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all"
                                            value={createForm.nom}
                                            onChange={(e) => setCreateForm({ ...createForm, nom: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Post-nom *</label>
                                        <input
                                            type="text"
                                            placeholder="omakinda"
                                            className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all"
                                            value={createForm.postNom}
                                            onChange={(e) => setCreateForm({ ...createForm, postNom: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Prénom */}
                                <div className="space-y-1">
                                    <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Prénom *</label>
                                    <input
                                        type="text"
                                        placeholder="andre"
                                        className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all"
                                        value={createForm.prenom}
                                        onChange={(e) => setCreateForm({ ...createForm, prenom: e.target.value })}
                                    />
                                </div>

                                {/* Téléphone */}
                                <div className="space-y-1">
                                    <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Téléphone *</label>
                                    <input
                                        type="tel"
                                        placeholder="+243 XXX XXX XXX"
                                        className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all"
                                        value={createForm.telephone}
                                        onChange={(e) => setCreateForm({ ...createForm, telephone: e.target.value })}
                                    />
                                </div>

                                {/* Fonction + Rôle */}
                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Fonction</label>
                                        <input
                                            type="text"
                                            placeholder="agent"
                                            className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all"
                                            value={createForm.fonction}
                                            onChange={(e) => setCreateForm({ ...createForm, fonction: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Rôle *</label>
                                        <select
                                            className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all cursor-pointer"
                                            value={createForm.role}
                                            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                                        >
                                            <option value="commercial" className="bg-gray-800">Commercial</option>
                                            <option value="admin" className="bg-gray-800">Administrateur</option>
                                            <option value="comptable" className="bg-gray-800">Comptable</option>
                                            <option value="superviseurs" className="bg-gray-800">Superviseur</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Email généré - Carte stylisée */}
                                <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/5 rounded-xl p-3 border border-purple-500/20">
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} className="text-purple-400" />
                                        <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Email généré</label>
                                    </div>
                                    <p className="text-[10px] xs:text-[11px] text-white/80 font-mono mt-1 break-all">{createForm.email || 'En attente...'}</p>
                                    <p className="text-[6px] xs:text-[7px] text-white/30 mt-1">✓ Généré automatiquement à partir du prénom et nom</p>
                                </div>

                                {/* Mot de passe */}
                                <div className="space-y-1">
                                    <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Mot de passe *</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="123456789"
                                            className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all pr-10"
                                            value={createForm.password}
                                            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-purple-400 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                    <p className="text-[6px] xs:text-[7px] text-white/30">Défaut: 123456789 (l'utilisateur pourra le modifier)</p>
                                </div>
                            </div>

                            {/* Footer avec boutons - FIXE */}
                            <div className="px-4 xs:px-5 sm:px-6 py-3 xs:py-4 sm:py-5 bg-white/5 border-t border-white/10 flex gap-3 flex-shrink-0">
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-2 xs:py-2.5 rounded-xl bg-white/10 text-white/70 text-[9px] xs:text-[10px] font-bold uppercase tracking-wider hover:bg-white/20 transition-all duration-200"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleCreateUser}
                                    disabled={isCreating || !createForm.nom || !createForm.prenom}
                                    className={`flex-1 py-2 xs:py-2.5 rounded-xl text-white text-[9px] xs:text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${isCreating || !createForm.nom || !createForm.prenom
                                            ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                                        }`}
                                >
                                    {isCreating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                                    {isCreating ? 'Création...' : 'Créer'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>



            {/* Modal d'édition - Version Pro */}
            <AnimatePresence>
                {editingUser && (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setEditingUser(null);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-purple-500/30 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header - FIXE */}
                            <div className="relative px-4 xs:px-5 sm:px-6 py-3 xs:py-4 sm:py-5 bg-gradient-to-r from-purple-600/20 to-transparent border-b border-white/10 flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base xs:text-lg sm:text-xl font-bold text-white">
                                            Modifier l'utilisateur
                                        </h3>
                                        <p className="text-[7px] xs:text-[8px] sm:text-[9px] text-purple-400 uppercase tracking-wider mt-0.5">
                                            Édition des informations
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setEditingUser(null)}
                                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200"
                                    >
                                        <X size={16} className="text-white/60" />
                                    </button>
                                </div>
                            </div>

                            {/* Corps du formulaire - SCROLLABLE */}
                            <div className="flex-1 overflow-y-auto p-4 xs:p-5 sm:p-6 space-y-4 custom-scrollbar">
                                {editingUser.nom ? (
                                    <>
                                        {/* Ligne Nom + Post-nom */}
                                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Nom</label>
                                                <input
                                                    type="text"
                                                    placeholder="Nom"
                                                    className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all"
                                                    value={editForm.nom}
                                                    onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Post-nom</label>
                                                <input
                                                    type="text"
                                                    placeholder="Post-nom"
                                                    className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all"
                                                    value={editForm.postNom}
                                                    onChange={(e) => setEditForm({ ...editForm, postNom: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* Prénom */}
                                        <div className="space-y-1">
                                            <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Prénom</label>
                                            <input
                                                type="text"
                                                placeholder="Prénom"
                                                className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all"
                                                value={editForm.prenom}
                                                onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                                            />
                                        </div>

                                        {/* Fonction */}
                                        <div className="space-y-1">
                                            <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Fonction</label>
                                            <input
                                                type="text"
                                                placeholder="Fonction"
                                                className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all"
                                                value={editForm.fonction}
                                                onChange={(e) => setEditForm({ ...editForm, fonction: e.target.value })}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-1">
                                        <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Nom de la société</label>
                                        <input
                                            type="text"
                                            placeholder="Nom de la société"
                                            className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all"
                                            value={editForm.nomComplet}
                                            onChange={(e) => setEditForm({ ...editForm, nomComplet: e.target.value })}
                                        />
                                    </div>
                                )}

                                {/* Email */}
                                <div className="space-y-1">
                                    <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Email</label>
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                </div>

                                {/* Téléphone */}
                                <div className="space-y-1">
                                    <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Téléphone</label>
                                    <input
                                        type="tel"
                                        placeholder="Téléphone"
                                        className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all"
                                        value={editForm.telephone}
                                        onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                                    />
                                </div>

                                {/* Rôle */}
                                <div className="space-y-1">
                                    <label className="text-[7px] xs:text-[8px] text-purple-400 font-bold uppercase tracking-wider">Rôle</label>
                                    <select
                                        className="w-full px-3 py-2.5 bg-white/10 rounded-xl text-white text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 focus:border-transparent transition-all cursor-pointer"
                                        value={editForm.role}
                                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    >
                                        <option value="admin" className="bg-gray-800">Administrateur</option>
                                        <option value="commercial" className="bg-gray-800">Commercial</option>
                                        <option value="comptable" className="bg-gray-800">Comptable</option>
                                        <option value="visiteur" className="bg-gray-800">Client</option>
                                        <option value="superviseurs" className="bg-gray-800">Superviseur</option>
                                    </select>
                                </div>
                            </div>

                            {/* Footer avec boutons - FIXE */}
                            <div className="px-4 xs:px-5 sm:px-6 py-3 xs:py-4 sm:py-5 bg-white/5 border-t border-white/10 flex gap-3 flex-shrink-0">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 py-2 xs:py-2.5 rounded-xl bg-white/10 text-white/70 text-[9px] xs:text-[10px] font-bold uppercase tracking-wider hover:bg-white/20 transition-all duration-200"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="flex-1 py-2 xs:py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[9px] xs:text-[10px] font-bold uppercase tracking-wider hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                >
                                    <Save size={14} className="inline mr-1" />
                                    Enregistrer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}








// ============================================
// STATISTIQUES MODULE - AVEC DIAGRAMMES
// ============================================
function StatistiquesModule({ stats }: any) {
    // Calcul des pourcentages
    const totalFaces = stats.faces.total || 1;
    const pourcentageLibres = Math.round((stats.faces.libres / totalFaces) * 100);
    const pourcentageOccupees = Math.round((stats.faces.occupees / totalFaces) * 100);
    const pourcentageReservees = Math.round((stats.faces.reservees / totalFaces) * 100);
    const pourcentageMaintenance = Math.round((stats.faces.maintenance / totalFaces) * 100);
    const tauxOccupation = stats.faces.occupees + stats.faces.reservees;
    const pourcentageOccupation = Math.round((tauxOccupation / totalFaces) * 100);
    
    // Données pour les graphiques
    const pieData = [
        { name: 'Libres', value: stats.faces.libres, color: '#10B981', percentage: pourcentageLibres },
        { name: 'Occupées', value: stats.faces.occupees, color: '#3B82F6', percentage: pourcentageOccupees },
        { name: 'Réservées', value: stats.faces.reservees, color: '#F59E0B', percentage: pourcentageReservees },
        { name: 'Maintenance', value: stats.faces.maintenance, color: '#EF4444', percentage: pourcentageMaintenance }
    ].filter(d => d.value > 0);
    
    // Données pour le graphique en barres (évolution mensuelle - simulation)
    const monthlyData = [
        { month: 'Jan', value: 65 },
        { month: 'Fév', value: 72 },
        { month: 'Mar', value: 78 },
        { month: 'Avr', value: 82 },
        { month: 'Mai', value: 88 },
        { month: 'Juin', value: pourcentageOccupation },
        { month: 'Jul', value: 0 },
        { month: 'Aoû', value: 0 },
        { month: 'Sep', value: 0 },
        { month: 'Oct', value: 0 },
        { month: 'Nov', value: 0 },
        { month: 'Déc', value: 0 }
    ];
    
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-1 h-10 bg-gradient-to-b from-cyan-500 to-cyan-600 rounded-full shadow-lg" />
                <div>
                    <h1 className="text-2xl font-black text-white">Statistiques</h1>
                    <p className="text-[8px] text-white/50 uppercase tracking-wider">Analyses détaillées</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Diagramme Circulaire (Camembert) */}
                <FloatingCard title="Distribution des faces" icon={PieChart}>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Graphique circulaire SVG */}
                        <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                {(() => {
                                    let currentAngle = 0;
                                    return pieData.map((item, index) => {
                                        const angle = (item.value / totalFaces) * 360;
                                        const startAngle = currentAngle;
                                        const endAngle = currentAngle + angle;
                                        currentAngle = endAngle;
                                        
                                        const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                                        const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                                        const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
                                        const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
                                        const largeArc = angle > 180 ? 1 : 0;
                                        
                                        return (
                                            <path
                                                key={index}
                                                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                fill={item.color}
                                                stroke="#1f2937"
                                                strokeWidth="1"
                                                className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                                            >
                                                <title>{`${item.name}: ${item.value} (${item.percentage}%)`}</title>
                                            </path>
                                        );
                                    });
                                })()}
                                <circle cx="50" cy="50" r="25" fill="#1f2937" />
                                <text x="50" y="48" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" className="pointer-events-none">
                                    {totalFaces}
                                </text>
                                <text x="50" y="58" textAnchor="middle" fill="#9CA3AF" fontSize="5" className="pointer-events-none">
                                    FACES
                                </text>
                            </svg>
                        </div>
                        
                        {/* Légende */}
                        <div className="flex-1 space-y-2">
                            {pieData.map((item, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-[9px] text-white/80">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-white">{item.value}</span>
                                        <span className="text-[8px] text-white/40">({item.percentage}%)</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </FloatingCard>

                {/* Graphique en barres (Taux d'occupation mensuel) */}
                <FloatingCard title="Évolution du taux d'occupation" icon={TrendingUp}>
                    <div className="space-y-4">
                        {/* Barres horizontales */}
                        <div className="space-y-3">
                            {monthlyData.slice(0, 6).map((item, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="group"
                                >
                                    <div className="flex justify-between text-[8px] text-white/50 mb-1">
                                        <span className="font-bold">{item.month}</span>
                                        <span>{item.value}%</span>
                                    </div>
                                    <div className="w-full h-6 bg-white/10 rounded-lg overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.value}%` }}
                                            transition={{ duration: 0.8, delay: idx * 0.05 }}
                                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-end pr-2"
                                        >
                                            {item.value > 15 && (
                                                <span className="text-[7px] font-bold text-white">{item.value}%</span>
                                            )}
                                        </motion.div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        
                        {/* Indicateur de tendance */}
                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={12} className="text-emerald-400" />
                                <span className="text-[7px] text-white/40">Tendance actuelle</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-emerald-400">+{pourcentageOccupation - monthlyData[4].value}%</span>
                                <span className="text-[6px] text-white/30">vs mois dernier</span>
                            </div>
                        </div>
                    </div>
                </FloatingCard>
            </div>

            {/* Deuxième ligne - Graphiques supplémentaires */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Jauge de taux d'occupation */}
                <FloatingCard title="Taux d'occupation global" icon={Target}>
                    <div className="flex flex-col items-center">
                        {/* Jauge circulaire */}
                        <div className="relative w-40 h-40 mb-4">
                            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="#374151" strokeWidth="10" />
                                <circle 
                                    cx="60" cy="60" r="50" fill="none" 
                                    stroke="url(#gradient)" 
                                    strokeWidth="10"
                                    strokeDasharray={`${pourcentageOccupation * 3.14} 314`}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000"
                                />
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#06b6d4" />
                                        <stop offset="100%" stopColor="#3b82f6" />
                                    </linearGradient>
                                </defs>
                                <text x="60" y="55" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
                                    {pourcentageOccupation}%
                                </text>
                                <text x="60" y="70" textAnchor="middle" fill="#9CA3AF" fontSize="7">
                                    Occupation
                                </text>
                            </svg>
                        </div>
                        
                        {/* Légende occupation */}
                        <div className="flex gap-4 justify-center">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-[7px] text-white/40">Libre {pourcentageLibres}%</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-[7px] text-white/40">Occupé {pourcentageOccupees}%</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-[7px] text-white/40">Réservé {pourcentageReservees}%</span>
                            </div>
                        </div>
                    </div>
                </FloatingCard>

                {/* Indicateurs clés avec mini graphiques */}
                <FloatingCard title="Indicateurs clés" icon={Activity}>
                    <div className="grid grid-cols-2 gap-3">
                        <StatBox 
                            value={stats.reservations.enCours} 
                            label="Réservations en cours" 
                            color="emerald" 
                            icon={<Clock size={12} />}
                        />
                        <StatBox 
                            value={stats.reservations.futures} 
                            label="Réservations futures" 
                            color="amber" 
                            icon={<Calendar size={12} />}
                        />
                        <StatBox 
                            value={stats.users} 
                            label="Agents actifs" 
                            color="cyan" 
                            icon={<Users size={12} />}
                        />
                        <StatBox 
                            value={stats.societes} 
                            label="Clients" 
                            color="purple" 
                            icon={<Building2 size={12} />}
                        />
                        <StatBox 
                            value={stats.panneaux} 
                            label="Panneaux" 
                            color="orange" 
                            icon={<MapPin size={12} />}
                        />
                        <StatBox 
                            value={stats.faces.total} 
                            label="Faces totales" 
                            color="blue" 
                            icon={<Layers size={12} />}
                        />
                    </div>
                    
                    {/* Mini histogramme de tendance */}
                    <div className="mt-4 pt-3 border-t border-white/10">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[7px] text-white/40 uppercase tracking-wider">Tendance mensuelle</span>
                            <span className="text-[7px] text-emerald-400">↑ +12%</span>
                        </div>
                        <div className="flex items-end gap-1 h-12">
                            {[40, 55, 48, 62, 58, 75, 82, 78, 85, 88, 92, pourcentageOccupation].map((val, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${val * 0.6}px` }}
                                    transition={{ duration: 0.5, delay: i * 0.03 }}
                                    className="flex-1 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t-sm hover:opacity-80 transition cursor-pointer"
                                    style={{ height: `${val * 0.6}px` }}
                                >
                                    <div className="opacity-0 hover:opacity-100 transition absolute -mt-5 text-[6px] text-white bg-black/50 px-1 rounded">
                                        {val}%
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-1">
                            {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((month, i) => (
                                <span key={i} className="text-[5px] text-white/30">{month}</span>
                            ))}
                        </div>
                    </div>
                </FloatingCard>
            </div>

            {/* Troisième ligne - Répartition détaillée */}
            <div className="grid grid-cols-1 gap-6">
                <FloatingCard title="Analyse détaillée" icon={BarChart3}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <DetailStat 
                            label="Taux de rotation" 
                            value={`${Math.round((stats.reservations.passees / (stats.reservations.enCours + stats.reservations.passees || 1)) * 100)}%`}
                            description="des réservations terminées"
                            color="emerald"
                        />
                        <DetailStat 
                            label="Ratio faces/panneau" 
                            value={(stats.faces.total / stats.panneaux || 0).toFixed(1)}
                            description="faces par panneau en moyenne"
                            color="blue"
                        />
                        <DetailStat 
                            label="Réservations actives" 
                            value={stats.reservations.enCours}
                            description="contrats en cours"
                            color="amber"
                        />
                        <DetailStat 
                            label="Projection mensuelle" 
                            value={`+${Math.round((stats.reservations.futures / (stats.reservations.enCours || 1)) * 100)}%`}
                            description="vs période actuelle"
                            color="purple"
                        />
                    </div>
                </FloatingCard>
            </div>
        </motion.div>
    );
}

// ============================================
// COMPOSANTS ADDITIONNELS
// ============================================
function DetailStat({ label, value, description, color }: any) {
    const getColorClass = () => {
        switch(color) {
            case 'emerald': return 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30';
            case 'blue': return 'from-blue-500/20 to-blue-600/10 border-blue-500/30';
            case 'amber': return 'from-amber-500/20 to-amber-600/10 border-amber-500/30';
            case 'purple': return 'from-purple-500/20 to-purple-600/10 border-purple-500/30';
            default: return 'from-blue-500/20 to-blue-600/10 border-blue-500/30';
        }
    };
    
    return (
        <div className={`p-3 rounded-xl bg-gradient-to-br ${getColorClass()} border text-center`}>
            <p className="text-[6px] text-white/40 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xl font-black text-white">{value}</p>
            <p className="text-[6px] text-white/30 mt-1">{description}</p>
        </div>
    );
}

// ============================================
// SUPPORT MODULE - ULTRA RESPONSIVE
// ============================================
function SupportModule() {
    const [activeTab, setActiveTab] = useState('docs');
    
    const faqs = [
        { question: "Comment ajouter un nouveau panneau ?", answer: "Rendez-vous dans l'onglet 'Panneaux' puis cliquez sur 'Nouveau panneau'. Remplissez le formulaire avec les informations GPS, l'adresse et les caractéristiques du panneau." },
        { question: "Comment gérer les réservations ?", answer: "Dans l'onglet 'Réservations', vous pouvez visualiser toutes les demandes et les valider ou les rejeter." },
        { question: "Comment créer un compte utilisateur ?", answer: "Allez dans 'Utilisateurs', cliquez sur 'Nouvel utilisateur' et remplissez les informations nécessaires." },
        { question: "Que faire en cas de problème technique ?", answer: "Contactez notre support technique via les coordonnées ci-dessous ou ouvrez un ticket." }
    ];
    
    const updates = [
        { version: "v2.4.0", date: "10/06/2026", features: ["Ajout des diagrammes statistiques", "Amélioration de la sidebar responsive", "Correction des bugs d'affichage"] },
        { version: "v2.3.0", date: "01/06/2026", features: ["Nouveau module de réservations", "Optimisation des performances", "Interface utilisateur améliorée"] },
        { version: "v2.2.0", date: "20/05/2026", features: ["Gestion avancée des utilisateurs", "Export des rapports en PDF", "Notifications en temps réel"] }
    ];
    
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            {/* En-tête */}
            <div className="flex items-center gap-4">
                <div className="w-1 h-10 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-lg" />
                <div>
                    <h1 className="text-2xl font-black text-white">Support</h1>
                    <p className="text-[8px] text-white/50 uppercase tracking-wider">Aide et assistance</p>
                </div>
            </div>

            {/* Onglets */}
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
                {[
                    { id: 'docs', label: 'Documentation', icon: BookOpen },
                    { id: 'faq', label: 'FAQ', icon: HelpCircle },
                    { id: 'contact', label: 'Contact', icon: MessageSquare },
                    { id: 'updates', label: 'Mises à jour', icon: Zap }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all ${
                            activeTab === tab.id 
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' 
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <tab.icon size={12} />
                        <span className="hidden xs:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Contenu dynamique */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Colonne principale - Contenu actif */}
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'docs' && (
                        <FloatingCard title="Documentation" icon={BookOpen} className="h-full">
                            <div className="space-y-4">
                                <SearchBar placeholder="Rechercher dans la documentation..." />
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <DocCard 
                                        title="Guide de démarrage"
                                        description="Premiers pas avec GDP"
                                        icon={Rocket}
                                        color="emerald"
                                        link="#"
                                    />
                                    <DocCard 
                                        title="Administration"
                                        description="Gestion des utilisateurs et permissions"
                                        icon={Shield}
                                        color="blue"
                                        link="#"
                                    />
                                    <DocCard 
                                        title="Panneaux"
                                        description="Configuration et gestion des supports"
                                        icon={MapPin}
                                        color="amber"
                                        link="#"
                                    />
                                    <DocCard 
                                        title="Réservations"
                                        description="Gestion des locations"
                                        icon={Calendar}
                                        color="purple"
                                        link="#"
                                    />
                                    <DocCard 
                                        title="Facturation"
                                        description="Suivi financier"
                                        icon={DollarSign}
                                        color="cyan"
                                        link="#"
                                    />
                                    <DocCard 
                                        title="API & Développeurs"
                                        description="Intégrations techniques"
                                        icon={Code}
                                        color="orange"
                                        link="#"
                                    />
                                </div>
                            </div>
                        </FloatingCard>
                    )}
                    
                    {activeTab === 'faq' && (
                        <FloatingCard title="Foire aux questions" icon={HelpCircle} className="h-full">
                            <div className="space-y-3">
                                <SearchBar placeholder="Posez votre question..." />
                                
                                {faqs.map((faq, idx) => (
                                    <FaqItem key={idx} question={faq.question} answer={faq.answer} />
                                ))}
                                
                                <div className="mt-4 p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20 text-center">
                                    <p className="text-[8px] text-white/60">Vous n'avez pas trouvé votre réponse ?</p>
                                    <button 
                                        onClick={() => setActiveTab('contact')}
                                        className="mt-2 text-[9px] font-bold text-orange-400 hover:text-orange-300 transition"
                                    >
                                        Contactez notre support →
                                    </button>
                                </div>
                            </div>
                        </FloatingCard>
                    )}
                    
                    {activeTab === 'contact' && (
                        <FloatingCard title="Nous contacter" icon={MessageSquare} className="h-full">
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <ContactCard 
                                        icon={Mail} 
                                        title="Email" 
                                        info="omeongaandre2@gmail.com"
                                        secondary="omeongaandre2@gmail.com"
                                        action="Envoyer un email"
                                        color="emerald"
                                    />
                                    <ContactCard 
                                        icon={Phone} 
                                        title="Téléphone" 
                                        info="+243815023699"
                                        secondary="Lun-Ven, 8h-18h"
                                        action="Appeler maintenant"
                                        color="blue"
                                    />
                                    <ContactCard 
                                        icon={MessageSquare} 
                                        title="Chat en ligne" 
                                        info="Disponible 24/7"
                                        secondary="Temps de réponse: ~2min"
                                        action="Ouvrir le chat"
                                        color="amber"
                                    />
                                    <ContactCard 
                                        icon={Globe} 
                                        title="Centre d'aide" 
                                        info="docs.dispromalt.cd"
                                        secondary="Tutoriels vidéo"
                                        action="Accéder au centre"
                                        color="purple"
                                    />
                                </div>
                                
                                {/* Formulaire de contact rapide */}
                                <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                                    <h3 className="text-[10px] font-bold text-white mb-3">Message rapide</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                        <input type="text" placeholder="Votre nom" className="px-3 py-2 bg-white/10 rounded-lg text-white text-[10px] outline-none focus:ring-1 ring-orange-500" />
                                        <input type="email" placeholder="Votre email" className="px-3 py-2 bg-white/10 rounded-lg text-white text-[10px] outline-none focus:ring-1 ring-orange-500" />
                                    </div>
                                    <textarea rows={2} placeholder="Votre message..." className="w-full px-3 py-2 bg-white/10 rounded-lg text-white text-[10px] outline-none focus:ring-1 ring-orange-500 mb-3 resize-none" />
                                    <button className="w-full py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg text-white text-[9px] font-bold uppercase hover:shadow-lg transition">
                                        Envoyer le message
                                    </button>
                                </div>
                            </div>
                        </FloatingCard>
                    )}
                    
                    {activeTab === 'updates' && (
                        <FloatingCard title="Historique des mises à jour" icon={Zap} className="h-full">
                            <div className="space-y-4">
                                {updates.map((update, idx) => (
                                    <motion.div 
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="relative pl-4 pb-4 border-l-2 border-orange-500/30 last:pb-0"
                                    >
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-orange-500 border-2 border-white/20" />
                                        <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                            <span className="text-[11px] font-bold text-orange-400">{update.version}</span>
                                            <span className="text-[7px] text-white/30">{update.date}</span>
                                        </div>
                                        <ul className="space-y-1">
                                            {update.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-1.5">
                                                    <span className="text-[6px] text-emerald-400 mt-0.5">✓</span>
                                                    <span className="text-[8px] text-white/60">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                ))}
                            </div>
                        </FloatingCard>
                    )}
                </div>
                
                {/* Sidebar - Ressources rapides */}
                <div className="space-y-6">
                    <FloatingCard title="Ressources utiles" icon={Star}>
                        <div className="space-y-3">
                            <ResourceItem 
                                icon={Video} 
                                title="Tutoriels vidéo" 
                                description="Guides pas à pas"
                                badge="12 vidéos"
                            />
                            <ResourceItem 
                                icon={FileText} 
                                title="API Documentation" 
                                description="Pour développeurs"
                                badge="Complet"
                            />
                            <ResourceItem 
                                icon={Download} 
                                title="Téléchargements" 
                                description="Rapports et exports"
                                badge="PDF, Excel"
                            />
                            <ResourceItem 
                                icon={MessageSquare} 
                                title="Communauté" 
                                description="Forum d'entraide"
                                badge="Actif"
                            />
                        </div>
                    </FloatingCard>
                    
                    <FloatingCard title="Statut du système" icon={Activity}>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[8px] text-white">API</span>
                                </div>
                                <span className="text-[7px] text-emerald-400">Opérationnel</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[8px] text-white">Base de données</span>
                                </div>
                                <span className="text-[7px] text-emerald-400">Connectée</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-[8px] text-white">Serveur</span>
                                </div>
                                <span className="text-[7px] text-white/60">Charge normale</span>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="flex justify-between text-[7px] text-white/40 mb-1">
                                <span>Uptime</span>
                                <span>99.9%</span>
                            </div>
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="w-[99.9%] h-full bg-emerald-500 rounded-full" />
                            </div>
                        </div>
                    </FloatingCard>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// COMPOSANTS ADDITIONNELS
// ============================================

function SearchBar({ placeholder }: { placeholder: string }) {
    return (
        <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
                type="text" 
                placeholder={placeholder}
                className="w-full pl-8 pr-3 py-2 bg-white/10 rounded-lg text-white text-[9px] outline-none focus:ring-1 ring-orange-500"
            />
        </div>
    );
}

function DocCard({ title, description, icon: Icon, color, link }: any) {
    const getColorClass = () => {
        switch(color) {
            case 'emerald': return 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:border-emerald-500/50';
            case 'blue': return 'from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-500/50';
            case 'amber': return 'from-amber-500/20 to-amber-600/10 border-amber-500/30 hover:border-amber-500/50';
            case 'purple': return 'from-purple-500/20 to-purple-600/10 border-purple-500/30 hover:border-purple-500/50';
            case 'cyan': return 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 hover:border-cyan-500/50';
            case 'orange': return 'from-orange-500/20 to-orange-600/10 border-orange-500/30 hover:border-orange-500/50';
            default: return 'from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-500/50';
        }
    };
    
    const getBgColor = () => {
        switch(color) {
            case 'emerald': return 'bg-emerald-500/20';
            case 'blue': return 'bg-blue-500/20';
            case 'amber': return 'bg-amber-500/20';
            case 'purple': return 'bg-purple-500/20';
            case 'cyan': return 'bg-cyan-500/20';
            case 'orange': return 'bg-orange-500/20';
            default: return 'bg-blue-500/20';
        }
    };
    
    const getTextColor = () => {
        switch(color) {
            case 'emerald': return 'text-emerald-400';
            case 'blue': return 'text-blue-400';
            case 'amber': return 'text-amber-400';
            case 'purple': return 'text-purple-400';
            case 'cyan': return 'text-cyan-400';
            case 'orange': return 'text-orange-400';
            default: return 'text-blue-400';
        }
    };
    
    return (
        <motion.div whileHover={{ y: -2, scale: 1.01 }} className={`p-3 rounded-xl bg-gradient-to-br ${getColorClass()} border transition-all duration-300 cursor-pointer group`}>
            <div className="flex items-start gap-2.5">
                <div className={`p-1.5 rounded-lg ${getBgColor()}`}>
                    <Icon size={14} className={getTextColor()} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-[9px] font-bold text-white group-hover:text-amber-400 transition">{title}</h4>
                    <p className="text-[7px] text-white/40 mt-0.5">{description}</p>
                </div>
            </div>
        </motion.div>
    );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="border-b border-white/10 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center py-3 text-left"
            >
                <span className="text-[9px] sm:text-[10px] font-medium text-white/80 hover:text-white transition">{question}</span>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown size={12} className="text-white/40" />
                </motion.div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <p className="text-[8px] text-white/50 pb-3 leading-relaxed">{answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ContactCard({ icon: Icon, title, info, secondary, action, color }: any) {
    const getColorClass = () => {
        switch(color) {
            case 'emerald': return 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30';
            case 'blue': return 'from-blue-500/20 to-blue-600/10 border-blue-500/30';
            case 'amber': return 'from-amber-500/20 to-amber-600/10 border-amber-500/30';
            case 'purple': return 'from-purple-500/20 to-purple-600/10 border-purple-500/30';
            default: return 'from-blue-500/20 to-blue-600/10 border-blue-500/30';
        }
    };
    
    const getTextColor = () => {
        switch(color) {
            case 'emerald': return 'text-emerald-400';
            case 'blue': return 'text-blue-400';
            case 'amber': return 'text-amber-400';
            case 'purple': return 'text-purple-400';
            default: return 'text-blue-400';
        }
    };
    
    return (
        <div className={`p-3 rounded-xl bg-gradient-to-br ${getColorClass()} border text-center`}>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                <Icon size={14} className={getTextColor()} />
            </div>
            <h4 className="text-[9px] font-bold text-white mb-0.5">{title}</h4>
            <p className="text-[8px] font-mono text-white/70">{info}</p>
            <p className="text-[6px] text-white/30 mt-0.5">{secondary}</p>
            <button className="mt-2 text-[7px] font-bold text-amber-400 hover:text-amber-300 transition">
                {action} →
            </button>
        </div>
    );
}

function ResourceItem({ icon: Icon, title, description, badge }: any) {
    return (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer group">
            <div className="p-1.5 rounded-lg bg-orange-500/20">
                <Icon size={12} className="text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-bold text-white group-hover:text-orange-400 transition">{title}</p>
                    <span className="text-[5px] px-1 py-0.5 rounded-full bg-orange-500/20 text-orange-400">{badge}</span>
                </div>
                <p className="text-[7px] text-white/40">{description}</p>
            </div>
        </div>
    );
}

// Icônes supplémentaires
function Video({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m10 10 5 2-5 2V10z" /></svg>; }
function Download({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>; }
function Code({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>; }
function Star({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>; }
function Rocket({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M4.5 16.5c-1.5 1.26-2 3-2 5 0 0 2 0 5-2" /><path d="M12 2a9 9 0 0 0-9 9c0 2.5 1 5 3 7 0 0 2 1 5 1s5-1 5-1c2-2 3-4.5 3-7a9 9 0 0 0-9-9z" /><circle cx="12" cy="11" r="3" /></svg>; }
// ============================================
// COMPOSANTS RÉUTILISABLES
// ============================================

function FloatingCard({ children, title, icon: Icon, className = "" }: any) {
    return (
        <motion.div whileHover={{ y: -3 }} className={`bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/10 shadow-xl transition-all duration-300 hover:border-amber-500/30 hover:shadow-amber-500/10 ${className}`}>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                {Icon && <Icon size={12} className="text-amber-400" />}
                <h3 className="text-[9px] sm:text-[10px] font-black text-amber-400 uppercase tracking-wider">{title}</h3>
            </div>
            {children}
        </motion.div>
    );
}

function StatBar({ label, value, total, color }: any) {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between text-[8px] sm:text-[9px] text-white/60 mb-1">
                <span>{label}</span>
                <span>{value} ({Math.round(percentage)}%)</span>
            </div>
            <div className="w-full h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}

function StatBox({ value, label, color, suffix = "" }: any) {
    return (
        <div className={`text-center p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}>
            <p className="text-lg sm:text-xl font-black text-white">{value}{suffix}</p>
            <p className="text-[6px] sm:text-[7px] text-white/40 uppercase mt-0.5">{label}</p>
        </div>
    );
}


function LoadingScreen() {
    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
            <div className="absolute inset-0"><img src="/fond.jpg" className="w-full h-full object-cover opacity-30" alt="" /></div>
            <div className="relative z-10 text-center">
                <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-amber-500 text-xs font-bold uppercase tracking-wider">GDP | Chargement...</p>
            </div>
        </div>
    );
}


// Icônes
function Mail({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 7L2 7" /></svg>; }
function Phone({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>; }
function FileText({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>; }




import { 
    // ... autres icônes
    DollarSign, 
} from 'lucide-react';