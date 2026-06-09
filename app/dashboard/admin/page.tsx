'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    MapPin, Loader2, CheckCircle2, Globe, Calendar, Building2,
    LayoutDashboard, Users, TrendingUp, Activity, Bell, LogOut, Menu,
    Settings, Eye, Search, BarChart3, PieChart, Clock, AlertTriangle,
    BookOpen, MessageSquare, HelpCircle, X, ChevronDown, Filter,
    Sunrise, Moon, Zap, Target, Award, Shield, ChevronRight  // ← AJOUTE CECI
    ,
    Layers, Smartphone, Wifi, Cloud, HardDrive, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
// CONSTANTES
// ============================================
const COMMUNES_KINSHASA = ["Bandalungwa", "Barumbu", "Gombe", "Kalamu", "Kasa-Vubu", "Kimbanseke", "Kinshasa", "Kintambo", "Lemba", "Limete", "Lingwala", "Masina", "Matete", "Mont-Ngafula", "Ngaliema", "Ndjili", "Nsele"];

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
        faces: { total: 0, libres: 0, occupees: 0, maintenance: 0 },
        users: 0,
        societes: 0,
        reservations: { enCours: 0, futures: 0, passees: 0 }
    });

    // ============================================
    // CHARGEMENT DES DONNÉES
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

                // Calcul des statistiques
                let totalFaces = 0;
                let facesLibres = 0;
                let facesOccupees = 0;
                let facesMaintenance = 0;
                let reservationsEnCours = 0;
                let reservationsFutures = 0;
                let reservationsPassees = 0;
                const now = new Date();

                panneauxData.forEach((p: any) => {
                    const faces = p.faces || [];
                    totalFaces += faces.length;
                    faces.forEach((face: any) => {
                        if (face.statut === 'Libre') facesLibres++;
                        else if (face.statut === 'Occupé') facesOccupees++;
                        else if (face.statut === 'Maintenance') facesMaintenance++;

                        // Compter les réservations par statut
                        (face.reservations || []).forEach((res: any) => {
                            const debut = new Date(res.dateDebut);
                            const fin = new Date(res.dateFin);
                            if (now >= debut && now <= fin) reservationsEnCours++;
                            else if (now < debut) reservationsFutures++;
                            else reservationsPassees++;
                        });
                    });
                });

                setStats({
                    panneaux: panneauxData.length,
                    faces: { total: totalFaces, libres: facesLibres, occupees: facesOccupees, maintenance: facesMaintenance },
                    users: societesData.filter((s: any) => s.role === 'commercial').length,
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

    const handleLogout = async () => { await signOut(auth); };

    const menuItems = [
        { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard, color: 'amber', description: 'Vue d\'ensemble' },
        { id: 'panneaux', label: 'Panneaux', icon: MapPin, color: 'blue', description: 'Gestion des supports' },
        { id: 'reservations', label: 'Réservations', icon: Calendar, color: 'emerald', description: 'Suivi des locations' },
        { id: 'utilisateurs', label: 'Utilisateurs', icon: Users, color: 'purple', description: 'Gestion des comptes' },
        { id: 'statistiques', label: 'Statistiques', icon: BarChart3, color: 'cyan', description: 'Analyses et rapports' },
        { id: 'support', label: 'Support', icon: HelpCircle, color: 'orange', description: 'Aide et assistance' },
    ];

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
                                <p className="text-[7px] text-amber-400 font-bold">Administrateur</p>
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
        { title: "Panneaux", value: stats.panneaux, icon: MapPin, color: "blue", trend: "+12%", bg: "from-blue-500/20 to-blue-600/10" },
        { title: "Faces", value: stats.faces.total, icon: Layers, color: "amber", trend: "+8%", bg: "from-amber-500/20 to-amber-600/10" },
        { title: "Faces libres", value: stats.faces.libres, icon: CheckCircle2, color: "emerald", trend: "Disponibles", bg: "from-emerald-500/20 to-emerald-600/10" },
        { title: "Réservations", value: stats.reservations.enCours + stats.reservations.futures, icon: Calendar, color: "purple", trend: "Actives", bg: "from-purple-500/20 to-purple-600/10" },
        { title: "Agents", value: stats.users, icon: Users, color: "cyan", trend: "+5%", bg: "from-cyan-500/20 to-cyan-600/10" },
        { title: "Clients", value: stats.societes, icon: Building2, color: "orange", trend: "Actifs", bg: "from-orange-500/20 to-orange-600/10" },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 pt-4">
            <div className="flex items-center gap-4">
                <div className="w-1 h-12 bg-gradient-to-b from-amber-500 to-red-500 rounded-full shadow-lg shadow-amber-500/30" />
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tighter">Tableau de bord <span className="text-amber-500">GDP</span></h1>
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
                            <span className={`text-[6px] sm:text-[7px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full`}>{card.trend}</span>
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
                        <StatBar label="Faces maintenance" value={stats.faces.maintenance} total={stats.faces.total} color="bg-amber-500" />
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
                    <input type="text" placeholder="Rechercher..." className="pl-9 pr-4 py-2 bg-white/10 rounded-xl text-white text-[11px] outline-none focus:ring-1 ring-amber-500 w-48 sm:w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredPanels.map((panel: any, idx: number) => (
                    <motion.div key={panel.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                        <FloatingCard title={`Panneau ${panel.idPan}`} icon={MapPin} className="hover:border-blue-500/30">
                            <div className="space-y-3">
                                <p className="text-[9px] sm:text-[10px] text-white/70 flex items-start gap-2 line-clamp-2"><MapPin size={12} className="shrink-0 mt-0.5 text-amber-400" />{panel.adresse}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] sm:text-[9px] text-white/50">{panel.type || 'Standard'}</span>
                                    <span className="text-[8px] sm:text-[9px] text-white/50">{panel.dimension}</span>
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-white/10">
                                    <div className="flex-1 text-center p-2 rounded-lg bg-white/5">
                                        <p className="text-[10px] sm:text-xs font-bold text-amber-400">{panel.faces?.length || 0}</p>
                                        <p className="text-[5px] sm:text-[6px] text-white/40 uppercase">Faces</p>
                                    </div>
                                    <div className="flex-1 text-center p-2 rounded-lg bg-white/5">
                                        <p className="text-[10px] sm:text-xs font-bold text-emerald-400">{panel.faces?.filter((f: any) => f.statut === 'Libre').length || 0}</p>
                                        <p className="text-[5px] sm:text-[6px] text-white/40 uppercase">Libres</p>
                                    </div>
                                    <div className="flex-1 text-center p-2 rounded-lg bg-white/5">
                                        <p className="text-[10px] sm:text-xs font-bold text-blue-400">{panel.faces?.filter((f: any) => f.statut === 'Occupé').length || 0}</p>
                                        <p className="text-[5px] sm:text-[6px] text-white/40 uppercase">Occupées</p>
                                    </div>
                                </div>
                            </div>
                        </FloatingCard>
                    </motion.div>
                ))}
            </div>
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
    const agents = societes.filter((s: any) => s.role === 'commercial');
    const clients = societes.filter((s: any) => s.role === 'visiteur' && s.nomSociete);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-1 h-10 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full shadow-lg" />
                <div>
                    <h1 className="text-2xl font-black text-white">Utilisateurs</h1>
                    <p className="text-[8px] text-white/50 uppercase tracking-wider">Gestion des comptes</p>
                </div>
            </div>

            <div className="flex gap-2 border-b border-white/10 pb-2">
                <button onClick={() => setActiveTab('agents')} className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'agents' ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white'}`}>Agents ({agents.length})</button>
                <button onClick={() => setActiveTab('clients')} className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'clients' ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white'}`}>Clients ({clients.length})</button>
            </div>

            <FloatingCard title={activeTab === 'agents' ? "Liste des agents" : "Liste des clients"} icon={Users}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-white/10">
                            <tr>
                                <th className="px-4 py-3 text-left text-[8px] font-black text-amber-400 uppercase">Nom</th>
                                <th className="px-4 py-3 text-left text-[8px] font-black text-amber-400 uppercase">Email</th>
                                <th className="px-4 py-3 text-left text-[8px] font-black text-amber-400 uppercase">Rôle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(activeTab === 'agents' ? agents : clients).map((u: any) => (
                                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition">
                                    <td className="px-4 py-3 text-[10px] text-white/80">{u.nomComplet || u.nomSociete || u.nom || 'N/A'}</td>
                                    <td className="px-4 py-3 text-[10px] text-white/60">{u.email}</td>
                                    <td className="px-4 py-3"><span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-[7px] font-bold">{activeTab === 'agents' ? 'Agent' : 'Client'}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </FloatingCard>
        </motion.div>
    );
}

// ============================================
// STATISTIQUES MODULE
// ============================================
function StatistiquesModule({ stats }: any) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-1 h-10 bg-gradient-to-b from-cyan-500 to-cyan-600 rounded-full shadow-lg" />
                <div>
                    <h1 className="text-2xl font-black text-white">Statistiques</h1>
                    <p className="text-[8px] text-white/50 uppercase tracking-wider">Analyses détaillées</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FloatingCard title="Distribution des faces" icon={PieChart}>
                    <div className="space-y-4">
                        <StatBar label="Faces libres" value={stats.faces.libres} total={stats.faces.total} color="bg-emerald-500" />
                        <StatBar label="Faces occupées" value={stats.faces.occupees} total={stats.faces.total} color="bg-blue-500" />
                        <StatBar label="Faces maintenance" value={stats.faces.maintenance} total={stats.faces.total} color="bg-amber-500" />
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10 text-center">
                        <p className="text-[8px] text-white/40">Total panneaux: {stats.panneaux} | Total faces: {stats.faces.total}</p>
                    </div>
                </FloatingCard>

                <FloatingCard title="Indicateurs clés" icon={Target}>
                    <div className="grid grid-cols-2 gap-3">
                        <StatBox value={stats.reservations.enCours} label="Réservations en cours" color="emerald" />
                        <StatBox value={stats.reservations.futures} label="Réservations futures" color="amber" />
                        <StatBox value={stats.users} label="Agents actifs" color="cyan" />
                        <StatBox value={stats.societes} label="Clients" color="purple" />
                        <StatBox value={Math.round((stats.faces.occupees / stats.faces.total) * 100)} label="Taux d'occupation" color="blue" suffix="%" />
                        <StatBox value={stats.panneaux} label="Panneaux" color="orange" />
                    </div>
                </FloatingCard>
            </div>
        </motion.div>
    );
}

// ============================================
// SUPPORT MODULE
// ============================================
function SupportModule() {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-1 h-10 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-lg" />
                <div>
                    <h1 className="text-2xl font-black text-white">Support</h1>
                    <p className="text-[8px] text-white/50 uppercase tracking-wider">Aide et assistance</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FloatingCard title="Documentation" icon={BookOpen}>
                    <div className="space-y-3">
                        <SupportItem icon={FileText} title="Guide d'utilisation" description="Manuel utilisateur complet" />
                        <SupportItem icon={Settings} title="Configuration" description="Paramètres avancés" />
                        <SupportItem icon={Shield} title="Sécurité" description="Bonnes pratiques" />
                    </div>
                </FloatingCard>

                <FloatingCard title="Contact" icon={MessageSquare}>
                    <div className="space-y-3">
                        <SupportItem icon={Mail} title="Support technique" description="support@dispromalt.cd" />
                        <SupportItem icon={Phone} title="Assistance" description="+243 123 456 789" />
                        <SupportItem icon={Globe} title="Documentation en ligne" description="docs.dispromalt.cd" />
                    </div>
                </FloatingCard>
            </div>
        </motion.div>
    );
}

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

function SupportItem({ icon: Icon, title, description }: any) {
    return (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer">
            <div className="p-1.5 rounded-lg bg-amber-500/20"><Icon size={12} className="text-amber-400" /></div>
            <div><p className="text-[9px] sm:text-[10px] font-bold text-white">{title}</p><p className="text-[6px] sm:text-[7px] text-white/40">{description}</p></div>
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

function ActivityItem({ text, time, type }: any) {
    const getColorClass = () => {
        switch (type) {
            case 'success': return 'bg-emerald-400';
            case 'info': return 'bg-blue-400';
            case 'warning': return 'bg-amber-400';
            default: return 'bg-white/40';
        }
    };
    return (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
            <div className={`w-1.5 h-1.5 rounded-full ${getColorClass()} animate-pulse`} />
            <div className="flex-1"><p className="text-[9px] text-white">{text}</p><p className="text-[7px] text-white/30">{time}</p></div>
        </div>
    );
}

// Icônes
function Mail({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 7L2 7" /></svg>; }
function Phone({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>; }
function FileText({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>; }