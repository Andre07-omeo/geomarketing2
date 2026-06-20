
// ============================================
// COMPOSANT PRINCIPAL
// ============================================
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    MapPin, Loader2, CheckCircle2, Globe, Calendar, Building2,
    LayoutDashboard, Users, TrendingUp, Activity, Bell, LogOut, Menu,
    Settings, Eye, Search, BarChart3, PieChart, Clock, AlertTriangle,
    BookOpen, MessageSquare, HelpCircle, X, ChevronDown, Filter,
    Sunrise, Moon, Zap, Target, Award, Shield, ChevronRight,
    Power, Edit2, Trash2, UserCheck, List,
    Layers, Smartphone, Wifi, Cloud, HardDrive, Cpu
} from 'lucide-react';
import { Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuth, signOut } from 'firebase/auth';
import { UserPlus, EyeOff, Key } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
// ============================================
// IMPORTS - AJOUTER CES LIGNES
// ============================================
import { 
    Edit3, Plus, Minus, 
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
    orderBy, serverTimestamp, doc, updateDoc, deleteDoc
} from 'firebase/firestore';

const app = !getApps().length ? initializeApp(config.firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const LOGO_URL = config.LOGO_DISPROMALT;
const SUPER_ADMIN_EMAIL = 'omeongaandre2@gmail.com';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export default function AdminDashboard() {
    // ✅ Récupération de l'utilisateur depuis le contexte
    const { user: authUser, loading: authLoading } = useAuth();

    const [activeModule, setActiveModule] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
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
    // 1. CHARGEMENT DES DONNÉES
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
                let facesReservees = 0;
                let facesMaintenance = 0;

                const now = new Date();
                now.setHours(0, 0, 0, 0);

                const getFaceStatus = (face: any): 'libre' | 'occupe' | 'reserve' | 'maintenance' => {
                    const reservations = face.reservations || [];
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

                    if (face.statut === 'Maintenance') return 'maintenance';
                    return 'libre';
                };

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

                // Calcul des réservations
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

                // Mise à jour des stats
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
            } catch (error) {
                console.error("Erreur chargement:", error);
                setDataLoading(false);
            }
        };
        loadData();
    }, []);

    // ============================================
    // 2. GESTION DE LA DÉCONNEXION
    // ============================================
    const handleLogout = async () => {
        const confirmLogout = window.confirm(
            "🔐 Déconnexion\n\nÊtes-vous sûr de vouloir quitter votre session ?\n\nVous devrez vous reconnecter pour accéder à nouveau au tableau de bord."
        );

        if (confirmLogout) {
            try {
                await signOut(auth);
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
            } catch (error) {
                console.error("Erreur lors de la déconnexion:", error);
                alert("Une erreur est survenue lors de la déconnexion");
            }
        }
    };

    // ============================================
    // 3. MENU ITEMS
    // ============================================
    const menuItems = [
        { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard, color: 'amber', description: 'Vue d\'ensemble' },
        { id: 'panneaux', label: 'Panneaux', icon: MapPin, color: 'blue', description: 'Gestion des supports' },
        { id: 'reservations', label: 'Réservations', icon: Calendar, color: 'emerald', description: 'Suivi des locations' },
        { id: 'utilisateurs', label: 'Utilisateurs', icon: Users, color: 'purple', description: 'Gestion des comptes' },
        { id: 'statistiques', label: 'Statistiques', icon: BarChart3, color: 'cyan', description: 'Analyses et rapports' },
        { id: 'support', label: 'Support', icon: HelpCircle, color: 'orange', description: 'Aide et assistance' },
    ];

    // ============================================
    // 4. INFOS UTILISATEUR
    // ============================================
    // ✅ Utilisation directe de authUser du contexte
    const displayName = authUser?.nomComplet || authUser?.nom || authUser?.email?.split('@')[0] || 'Admin';
    const userEmail = authUser?.email || 'Email non disponible';
    const userInitial = authUser?.nomComplet?.charAt(0) || authUser?.email?.charAt(0) || 'A';
    const userPhotoURL = authUser?.photoURL || null;

    // ============================================
    // 5. RENDU - CHARGEMENT
    // ============================================
    if (authLoading || dataLoading) return <LoadingScreen />;

    // ============================================
    // 6. RENDU - ADMIN DASHBOARD
    // ============================================
    return (
        <div className="min-h-screen bg-gray-50">
            {/* ============================================ */}
            {/* HEADER ULTRA RESPONSIVE */}
            {/* ============================================ */}
            <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-900 shadow-lg">
                <div className="px-2 xs:px-3 sm:px-4 md:px-6 py-1.5 xs:py-2 sm:py-3 flex justify-between items-center border-b border-white/10 gap-1 xs:gap-2">
                    {/* Partie gauche - Logo */}
                    <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 min-w-0">
                        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 flex-shrink-0">
                            <div className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                <img src={LOGO_URL} className="w-full h-full object-cover" alt="GDP" />
                            </div>
                            <div className="hidden xs:block">
                                <h1 className="text-[10px] xs:text-xs sm:text-sm font-black text-white">
                                    GDP<span className="text-amber-400"> ADMIN</span>
                                </h1>
                                <p className="hidden sm:block text-[5px] xs:text-[6px] text-blue-200 uppercase tracking-[0.15em]">
                                    Gestion Digitale Panneaux
                                </p>
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 xs:px-2.5 xs:py-1 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
                            <div className="w-1 h-1 xs:w-1.5 xs:h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[6px] xs:text-[7px] text-white/80 font-bold uppercase tracking-wider hidden md:inline">
                                GDP Online
                            </span>
                            <span className="text-[6px] xs:text-[7px] text-white/80 font-bold uppercase tracking-wider md:hidden">
                                Online
                            </span>
                        </div>
                    </div>

                    {/* Partie droite - Profil + Actions */}
                    <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
                        <button
                            className="lg:hidden text-white hover:bg-white/10 p-1 xs:p-1.5 sm:p-2 rounded-lg transition"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            <Menu size={16} className="xs:w-[18px] xs:h-[18px] sm:w-5 sm:h-5" />
                        </button>

                        {/* ✅ Profil utilisateur - Utilise authUser directement */}
                        <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
                            {/* Avatar */}
                            <div className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md flex-shrink-0">
                                {userPhotoURL ? (
                                    <img
                                        src={userPhotoURL}
                                        alt="Avatar"
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-bold text-white">
                                        {userInitial}
                                    </span>
                                )}
                            </div>

                            {/* Nom et Email */}
                            <div className="hidden sm:block">
                                <p className="text-[10px] xs:text-[9px] font-bold text-white truncate max-w-[60px] md:max-w-[120px]">
                                    {displayName}
                                </p>
                                <p className="text-[6px] xs:text-[7px] text-blue-200 truncate max-w-[60px] md:max-w-[120px]">
                                    {userEmail}
                                </p>
                                <p className="text-[5px] xs:text-[6px] text-amber-400 font-bold uppercase">
                                    Administrateur
                                </p>
                            </div>

                            {/* Déconnexion */}
                            <button
                                onClick={handleLogout}
                                className="p-1 xs:p-1.5 sm:p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all hover:scale-105"
                            >
                                <LogOut size={14} className="xs:w-[15px] xs:h-[15px] sm:w-4 sm:h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ONGLETS EN HAUT */}
                <div className="px-2 xs:px-3 sm:px-4 md:px-6 py-1 xs:py-1.5 sm:py-2 flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide">
                    {menuItems.map((item) => {
                        const isActive = activeModule === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveModule(item.id)}
                                className={`flex items-center gap-1 xs:gap-1.5 sm:gap-2 px-2 xs:px-2.5 sm:px-3 md:px-4 py-1 xs:py-1.5 sm:py-2 rounded-lg text-[8px] xs:text-[9px] sm:text-[10px] md:text-[11px] font-bold transition-all whitespace-nowrap ${isActive
                                    ? 'bg-white text-blue-800 shadow-lg shadow-blue-500/30'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <item.icon size={12} className={`xs:w-[13px] xs:h-[13px] sm:w-4 sm:h-4 ${isActive ? 'text-blue-800' : 'text-white/60'}`} />
                                <span className="hidden xs:inline">{item.label}</span>
                                <span className="xs:hidden">{item.label.charAt(0)}</span>
                                {isActive && (
                                    <span className="ml-0.5 xs:ml-1 w-1 h-1 xs:w-1.5 xs:h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                )}
                            </button>
                        );
                    })}

                    <div className="hidden lg:block ml-auto">
                        <span className="text-[7px] xs:text-[8px] text-blue-200/60 uppercase tracking-wider">
                            {menuItems.find(item => item.id === activeModule)?.label || 'Accueil'}
                        </span>
                    </div>
                </div>
            </header>

            {/* ============================================ */}
            {/* CONTENU PRINCIPAL */}
            {/* ============================================ */}
            <main className="max-w-full px-2 xs:px-3 sm:px-4 md:px-6 py-2 xs:py-3 sm:py-4 md:py-6">
                <AnimatePresence mode="wait">
                    {activeModule === 'dashboard' && <DashboardModule stats={stats} key="dashboard" />}
                    {activeModule === 'panneaux' && <PanneauxModule panels={panels} key="panneaux" />}
                    {activeModule === 'reservations' && <ReservationsModule panels={panels} key="reservations" />}
                    {activeModule === 'utilisateurs' && (
                        <UtilisateursModule
                            societes={societes}
                            currentUser={authUser}  // ✅ Passer authUser
                            key="utilisateurs"
                        />
                    )}
                    {activeModule === 'statistiques' && <StatistiquesModule stats={stats} key="statistiques" />}
                    {activeModule === 'support' && <SupportModule key="support" />}
                </AnimatePresence>
            </main>

            {/* Sidebar mobile */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed top-0 left-0 z-50 w-64 xs:w-72 h-full bg-white shadow-2xl flex flex-col"
                        >
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-800 to-blue-900 flex items-center justify-center">
                                        <img src={LOGO_URL} className="w-full h-full object-cover rounded-lg" alt="GDP" />
                                    </div>
                                    <div>
                                        <h1 className="text-sm font-black text-gray-800">
                                            GDP<span className="text-blue-800">ADMIN</span>
                                        </h1>
                                        <p className="text-[5px] text-gray-400 uppercase tracking-[0.15em]">Gestion Digitale Panneaux</p>
                                    </div>
                                </div>
                            </div>

                            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                                {menuItems.map((item) => {
                                    const isActive = activeModule === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => { setActiveModule(item.id); setSidebarOpen(false); }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                                ? 'bg-blue-50 text-blue-800 border border-blue-200 shadow-sm'
                                                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50/50'
                                                }`}
                                        >
                                            <item.icon size={18} className={isActive ? 'text-blue-800' : 'text-gray-400'} />
                                            <div className="flex-1 text-left">
                                                <p className="text-[12px] font-medium">{item.label}</p>
                                                <p className="text-[7px] text-gray-400">{item.description}</p>
                                            </div>
                                            {isActive && <ChevronRight size={14} className="text-blue-800" />}
                                        </button>
                                    );
                                })}
                            </nav>

                            {/* ✅ Profil sidebar mobile */}
                            <div className="p-4 border-t border-gray-200 bg-gray-50">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-[9px] font-bold">{userInitial}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-bold text-gray-800 truncate">{displayName}</p>
                                        <p className="text-[6px] text-gray-500 truncate">{userEmail}</p>
                                        <p className="text-[6px] text-amber-500 font-medium">Administrateur</p>
                                    </div>
                                    <button onClick={handleLogout} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">
                                        <LogOut size={14} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// LOADING SCREEN
// ============================================
function LoadingScreen() {
    return (
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
            <div className="text-center">
                <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 border-2 border-blue-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-blue-800 text-[10px] xs:text-xs font-bold uppercase tracking-wider">GDP | Chargement...</p>
            </div>
        </div>
    );
}





// ============================================
// DASHBOARD MODULE
// ============================================
function DashboardModule({ stats }: any) {
    const [activeTab, setActiveTab] = useState('overview');

    const tabs = [
        { id: 'overview', label: 'Vue', icon: LayoutDashboard },
        { id: 'occupation', label: 'Occupation', icon: PieChart },
        { id: 'reservations', label: 'Réservations', icon: Calendar },
        { id: 'trends', label: 'Tendances', icon: TrendingUp },
    ];

    // Cartes adaptatives
    const cards = [
        { title: "Panneaux", value: stats.panneaux, icon: MapPin, color: "blue" },
        { title: "Faces", value: stats.faces.total, icon: Layers, color: "blue" },
        { title: "Libres", value: stats.faces.libres, icon: CheckCircle2, color: "emerald" },
        { title: "Occupées", value: stats.faces.occupees, icon: Users, color: "blue" },
        { title: "Réservées", value: stats.faces.reservees, icon: Calendar, color: "amber" },
        { title: "Agents", value: stats.users, icon: UserCheck, color: "blue" },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 xs:space-y-5 sm:space-y-6">
            {/* En-tête */}
            <div className="flex items-center gap-3 xs:gap-4">
                <div className="w-1 h-8 xs:h-10 sm:h-12 bg-gradient-to-b from-blue-800 to-blue-900 rounded-full" />
                <div>
                    <h1 className="text-base xs:text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
                        Tableau de bord <span className="text-blue-800">GDP</span>
                    </h1>
                    <p className="text-[6px] xs:text-[7px] sm:text-[8px] text-gray-400 uppercase tracking-[0.15em]">
                        Gestion Digitale des Panneaux Publicitaires
                    </p>
                </div>
            </div>

            {/* Onglets dashboard - Scrollable */}
            <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 shadow-sm overflow-x-auto w-full">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1 xs:gap-2 px-2 xs:px-3 sm:px-4 py-1.5 xs:py-2 rounded-lg text-[8px] xs:text-[9px] sm:text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-blue-800 text-white shadow-md shadow-blue-500/30'
                            : 'text-gray-500 hover:text-blue-800 hover:bg-blue-50'
                            }`}
                    >
                        <tab.icon size={12} className="xs:w-[14px] xs:h-[14px] sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">{tab.label}</span>
                        <span className="xs:hidden">{tab.label.substring(0, 3)}</span>
                    </button>
                ))}
            </div>

            {/* Grille de cartes - Adaptative */}
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 xs:gap-3 sm:gap-4">
                {cards.map((card, i) => {
                    const colorMap = {
                        blue: { bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:border-blue-400', text: 'text-blue-800', iconBg: 'bg-blue-100' },
                        amber: { bg: 'bg-amber-50', border: 'border-amber-200', hover: 'hover:border-amber-400', text: 'text-amber-600', iconBg: 'bg-amber-100' },
                        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', hover: 'hover:border-emerald-400', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
                    };
                    const colors = colorMap[card.color as keyof typeof colorMap] || colorMap.blue;

                    return (
                        <motion.div
                            key={i}
                            whileHover={{ y: -2, scale: 1.02 }}
                            className={`bg-white rounded-lg xs:rounded-xl p-2 xs:p-3 sm:p-4 border ${colors.border} ${colors.hover} shadow-sm hover:shadow-md transition-all`}
                        >
                            <div className={`p-1 xs:p-1.5 sm:p-2 rounded-lg inline-block ${colors.iconBg}`}>
                                <card.icon size={12} className={`xs:w-[14px] xs:h-[14px] sm:w-4 sm:h-4 ${colors.text}`} />
                            </div>
                            <p className="text-sm xs:text-base sm:text-xl md:text-2xl font-bold text-gray-800 mt-1 xs:mt-1.5 sm:mt-2">
                                {card.value}
                            </p>
                            <p className="text-[6px] xs:text-[7px] sm:text-[8px] text-gray-500 uppercase mt-0.5 tracking-wider">
                                {card.title}
                            </p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Contenu des onglets avec scroll horizontal si nécessaire */}
            <div className="overflow-x-auto">
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="min-w-[280px]"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                <WhiteCard title="Occupation des faces" icon={PieChart} color="blue">
                                    <div className="space-y-3">
                                        <StatBar label="Libres" value={stats.faces.libres} total={stats.faces.total} color="bg-emerald-500" />
                                        <StatBar label="Occupées" value={stats.faces.occupees} total={stats.faces.total} color="bg-blue-500" />
                                        <StatBar label="Réservées" value={stats.faces.reservees} total={stats.faces.total} color="bg-amber-500" />
                                        <StatBar label="Maintenance" value={stats.faces.maintenance} total={stats.faces.total} color="bg-red-500" />
                                    </div>
                                </WhiteCard>

                                <WhiteCard title="Réservations" icon={Calendar} color="amber">
                                    <div className="grid grid-cols-3 gap-2 xs:gap-3">
                                        <div className="text-center p-2 xs:p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                            <Clock size={16} className="text-emerald-500 mx-auto mb-1 xs:w-[18px] xs:h-[18px]" />
                                            <p className="text-lg xs:text-xl font-bold text-emerald-600">{stats.reservations.enCours}</p>
                                            <p className="text-[6px] xs:text-[7px] text-gray-500 uppercase">En cours</p>
                                        </div>
                                        <div className="text-center p-2 xs:p-3 rounded-lg bg-amber-50 border border-amber-200">
                                            <Calendar size={16} className="text-amber-500 mx-auto mb-1 xs:w-[18px] xs:h-[18px]" />
                                            <p className="text-lg xs:text-xl font-bold text-amber-600">{stats.reservations.futures}</p>
                                            <p className="text-[6px] xs:text-[7px] text-gray-500 uppercase">Futures</p>
                                        </div>
                                        <div className="text-center p-2 xs:p-3 rounded-lg bg-gray-50 border border-gray-200">
                                            <Clock size={16} className="text-gray-400 mx-auto mb-1 xs:w-[18px] xs:h-[18px]" />
                                            <p className="text-lg xs:text-xl font-bold text-gray-500">{stats.reservations.passees}</p>
                                            <p className="text-[6px] xs:text-[7px] text-gray-400 uppercase">Passées</p>
                                        </div>
                                    </div>
                                </WhiteCard>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}


// ============================================
// PANNEAUX MODULE - AVEC MODIFICATION ET SUPPRESSION
// ============================================
function PanneauxModule({ panels }: any) {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    
    // ✅ États pour la modification et suppression
    const [selectedPanel, setSelectedPanel] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [panelToDelete, setPanelToDelete] = useState<any>(null);
    const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [editingPanel, setEditingPanel] = useState<any>(null);
    const [editForm, setEditForm] = useState({
        adresse: '',
        type: '',
        dimension: '',
        faces: [] as any[],
        nbFaces: 0
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fonction pour déterminer le statut d'une face
    const getFaceStatus = (face: any): 'libre' | 'occupe' | 'reserve' => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const reservations = face.reservations || [];
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

    // ============================================
    // FONCTIONS DE GESTION D'APPUI LONG
    // ============================================
    const handlePressStart = (panel: any) => {
        const timer = setTimeout(() => {
            // ✅ Ouvrir le menu d'actions après 3 secondes
            setSelectedPanel(panel);
            setIsDeleteModalOpen(true);
        }, 3000);
        setPressTimer(timer);
    };

    const handlePressEnd = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            setPressTimer(null);
        }
    };

    const handlePressCancel = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            setPressTimer(null);
        }
    };

    // ============================================
    // FONCTIONS DE MODIFICATION DU PANNEAU
    // ============================================
    const openEditModal = (panel: any) => {
        setEditingPanel(panel);
        setEditForm({
            adresse: panel.adresse || '',
            type: panel.type || '',
            dimension: panel.dimension || '',
            faces: panel.faces || [],
            nbFaces: panel.faces?.length || 0
        });
        setIsEditModalOpen(true);
        setIsDeleteModalOpen(false);
        setSelectedPanel(null);
    };

    const addFace = () => {
        const newFace = {
            sens: '',
            reservations: [],
            historique: [],
            statut: 'Libre'
        };
        setEditForm({
            ...editForm,
            faces: [...editForm.faces, newFace],
            nbFaces: editForm.nbFaces + 1
        });
    };

    const removeFace = (index: number) => {
        if (editForm.faces.length <= 1) {
            alert("❌ Un panneau doit avoir au moins une face");
            return;
        }
        const newFaces = editForm.faces.filter((_, i) => i !== index);
        setEditForm({
            ...editForm,
            faces: newFaces,
            nbFaces: newFaces.length
        });
    };

    const updateFace = (index: number, field: string, value: any) => {
        const newFaces = [...editForm.faces];
        newFaces[index] = { ...newFaces[index], [field]: value };
        setEditForm({ ...editForm, faces: newFaces });
    };

    const savePanelChanges = async () => {
        if (!editingPanel) return;

        setIsSubmitting(true);
        try {
            const panelRef = doc(db, "panneaux", editingPanel.id);
            
            await updateDoc(panelRef, {
                adresse: editForm.adresse,
                type: editForm.type,
                dimension: editForm.dimension,
                faces: editForm.faces,
                nbFaces: editForm.nbFaces,
                updatedAt: new Date().toISOString()
            });

            alert("✅ Panneau modifié avec succès !");
            setIsEditModalOpen(false);
            setEditingPanel(null);
            // Recharger les données
            window.location.reload();
        } catch (error) {
            console.error("❌ Erreur lors de la modification:", error);
            alert("❌ Erreur lors de la modification du panneau");
        } finally {
            setIsSubmitting(false);
        }
    };

    const deletePanel = async () => {
        if (!selectedPanel) return;

        if (!confirm(`⚠️ Voulez-vous vraiment supprimer le panneau "${selectedPanel.idPan}" ?\n\nCette action est irréversible.`)) {
            return;
        }

        try {
            await deleteDoc(doc(db, "panneaux", selectedPanel.id));
            alert("✅ Panneau supprimé avec succès !");
            setIsDeleteModalOpen(false);
            setSelectedPanel(null);
            window.location.reload();
        } catch (error) {
            console.error("❌ Erreur lors de la suppression:", error);
            alert("❌ Erreur lors de la suppression du panneau");
        }
    };

    // Filtrage par statut
    const filteredPanels = panels.filter((p: any) => {
        const searchMatch = p.idPan?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!searchMatch) return false;
        if (activeTab === 'all') return true;
        const faces = p.faces || [];
        const hasMatchingStatus = faces.some((face: any) => {
            const status = getFaceStatus(face);
            if (activeTab === 'libres') return status === 'libre';
            if (activeTab === 'occupes') return status === 'occupe';
            if (activeTab === 'reserves') return status === 'reserve';
            return false;
        });
        return hasMatchingStatus;
    });

    // Compteurs par statut
    const totalPanels = panels.length;
    const libresPanels = panels.filter((p: any) =>
        (p.faces || []).some((face: any) => getFaceStatus(face) === 'libre')
    ).length;
    const occupesPanels = panels.filter((p: any) =>
        (p.faces || []).some((face: any) => getFaceStatus(face) === 'occupe')
    ).length;
    const reservesPanels = panels.filter((p: any) =>
        (p.faces || []).some((face: any) => getFaceStatus(face) === 'reserve')
    ).length;

    // Onglets
    const tabs = [
        { id: 'all', label: 'Tous', icon: LayoutDashboard, count: totalPanels },
        { id: 'libres', label: 'Libres', icon: CheckCircle2, count: libresPanels },
        { id: 'occupes', label: 'Occupés', icon: Users, count: occupesPanels },
        { id: 'reserves', label: 'Réservés', icon: Calendar, count: reservesPanels },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            {/* ============================================ */}
            {/* EN-TÊTE */}
            {/* ============================================ */}
            <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-1 h-10 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full shadow-lg shadow-blue-500/30" />
                    <div>
                        <h1 className="text-2xl font-black text-blue-800">Panneaux publicitaires</h1>
                        <p className="text-[8px] text-blue-600 uppercase tracking-wider">Gestion des supports d'affichage</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            className="pl-9 pr-4 py-2 bg-white rounded-xl text-blue-800 text-[11px] outline-none focus:ring-2 ring-blue-500 border border-blue-200 w-36 sm:w-48"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-1 bg-white rounded-lg p-1 border border-blue-200">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-blue-600'}`}
                        >
                            <LayoutDashboard size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-blue-600'}`}
                        >
                            <List size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ============================================ */}
            {/* ONGLETS */}
            {/* ============================================ */}
            <div className="flex flex-wrap gap-2 border-b border-blue-200 pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                            : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] ${activeTab === tab.id
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-100 text-blue-600'
                            }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* ============================================ */}
            {/* STATISTIQUES RAPIDES */}
            {/* ============================================ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-3 border border-blue-200 text-center shadow-sm">
                    <p className="text-xl font-bold text-blue-700">{totalPanels}</p>
                    <p className="text-[7px] text-blue-600 uppercase tracking-wider">Total</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-center shadow-sm">
                    <p className="text-xl font-bold text-emerald-600">{libresPanels}</p>
                    <p className="text-[7px] text-emerald-600 uppercase tracking-wider">Libres</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 text-center shadow-sm">
                    <p className="text-xl font-bold text-blue-600">{occupesPanels}</p>
                    <p className="text-[7px] text-blue-600 uppercase tracking-wider">Occupés</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-center shadow-sm">
                    <p className="text-xl font-bold text-amber-600">{reservesPanels}</p>
                    <p className="text-[7px] text-amber-600 uppercase tracking-wider">Réservés</p>
                </div>
            </div>

            {/* ============================================ */}
            {/* GRILLE DES PANNEAUX */}
            {/* ============================================ */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                    {filteredPanels.map((panel: any, idx: number) => {
                        const faces = panel.faces || [];
                        const totalFaces = faces.length;
                        let libres = 0, occupees = 0, reservees = 0;

                        faces.forEach((face: any) => {
                            const status = getFaceStatus(face);
                            if (status === 'libre') libres++;
                            else if (status === 'occupe') occupees++;
                            else if (status === 'reserve') reservees++;
                        });

                        return (
                            <motion.div
                                key={panel.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                whileHover={{ y: -3, scale: 1.02 }}
                                className="bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all p-3 relative cursor-pointer"
                                onMouseDown={() => handlePressStart(panel)}
                                onMouseUp={handlePressEnd}
                                onMouseLeave={handlePressCancel}
                                onTouchStart={() => handlePressStart(panel)}
                                onTouchEnd={handlePressEnd}
                                onTouchCancel={handlePressCancel}
                            >
                                {/* ✅ Indicateur d'appui long */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[6px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                        Appui long
                                    </span>
                                </div>

                                {/* ID Panneau */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-blue-700 truncate">
                                        {panel.idPan || 'N/A'}
                                    </span>
                                    <span className="text-[7px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                                        {panel.type || 'Standard'}
                                    </span>
                                </div>

                                {/* Adresse */}
                                <p className="text-[8px] text-gray-500 flex items-start gap-1 line-clamp-2 mb-2">
                                    <MapPin size={10} className="shrink-0 mt-0.5 text-amber-400" />
                                    <span>{panel.adresse || 'Adresse non définie'}</span>
                                </p>

                                {/* Statistiques des faces */}
                                <div className="grid grid-cols-4 gap-1 pt-2 border-t border-gray-100">
                                    <div className="text-center">
                                        <p className="text-[9px] font-bold text-amber-500">{totalFaces}</p>
                                        <p className="text-[5px] text-gray-400 uppercase">Faces</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] font-bold text-emerald-500">{libres}</p>
                                        <p className="text-[5px] text-gray-400 uppercase">Libres</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] font-bold text-blue-500">{occupees}</p>
                                        <p className="text-[5px] text-gray-400 uppercase">Occupées</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] font-bold text-amber-500">{reservees}</p>
                                        <p className="text-[5px] text-gray-400 uppercase">Réservées</p>
                                    </div>
                                </div>

                                {/* Dimension */}
                                {panel.dimension && (
                                    <div className="mt-2 pt-2 border-t border-gray-100 text-[6px] text-gray-400 text-center">
                                        {panel.dimension}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-blue-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                            <thead className="bg-blue-50 border-b border-blue-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-blue-700 uppercase tracking-wider">ID</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-blue-700 uppercase tracking-wider">Adresse</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-blue-700 uppercase tracking-wider">Type</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-bold text-blue-700 uppercase tracking-wider">Faces</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-bold text-blue-700 uppercase tracking-wider">Libres</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-bold text-blue-700 uppercase tracking-wider">Occupées</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-bold text-blue-700 uppercase tracking-wider">Réservées</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-bold text-blue-700 uppercase tracking-wider">Dimension</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredPanels.map((panel: any) => {
                                    const faces = panel.faces || [];
                                    const totalFaces = faces.length;
                                    let libres = 0, occupees = 0, reservees = 0;

                                    faces.forEach((face: any) => {
                                        const status = getFaceStatus(face);
                                        if (status === 'libre') libres++;
                                        else if (status === 'occupe') occupees++;
                                        else if (status === 'reserve') reservees++;
                                    });

                                    return (
                                        <tr key={panel.id} className="hover:bg-blue-50/50 transition-colors cursor-pointer relative"
                                            onMouseDown={() => handlePressStart(panel)}
                                            onMouseUp={handlePressEnd}
                                            onMouseLeave={handlePressCancel}
                                            onTouchStart={() => handlePressStart(panel)}
                                            onTouchEnd={handlePressEnd}
                                            onTouchCancel={handlePressCancel}
                                        >
                                            <td className="px-4 py-3 text-sm font-bold text-blue-700">{panel.idPan || 'N/A'}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600">{panel.adresse || 'N/A'}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600">{panel.type || 'Standard'}</td>
                                            <td className="px-4 py-3 text-center text-sm font-bold text-amber-500">{totalFaces}</td>
                                            <td className="px-4 py-3 text-center text-sm font-bold text-emerald-500">{libres}</td>
                                            <td className="px-4 py-3 text-center text-sm font-bold text-blue-500">{occupees}</td>
                                            <td className="px-4 py-3 text-center text-sm font-bold text-amber-500">{reservees}</td>
                                            <td className="px-4 py-3 text-center text-xs text-gray-400">{panel.dimension || 'ND'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Message si aucun résultat */}
            {filteredPanels.length === 0 && (
                <div className="text-center py-12 bg-blue-50 rounded-2xl border border-blue-200">
                    <MapPin size={48} className="text-blue-300 mx-auto mb-3" />
                    <p className="text-blue-500 text-sm">Aucun panneau trouvé</p>
                </div>
            )}

            {/* ============================================ */}
            {/* MODAL D'ACTIONS - APPUI LONG */}
            {/* ============================================ */}
            <AnimatePresence>
                {isDeleteModalOpen && selectedPanel && (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setIsDeleteModalOpen(false);
                                setSelectedPanel(null);
                            }
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-sm bg-white rounded-2xl border border-blue-200 shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
                                <h3 className="text-white font-bold text-center">Actions disponibles</h3>
                                <p className="text-[7px] text-blue-200 text-center">{selectedPanel.idPan}</p>
                            </div>

                            <div className="p-4 space-y-2">
                                <button
                                    onClick={() => openEditModal(selectedPanel)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition text-blue-700 font-medium text-sm"
                                >
                                    <Edit3 size={18} className="text-blue-500" />
                                    Modifier le panneau
                                </button>

                                <button
                                    onClick={deletePanel}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-50 hover:bg-red-100 transition text-red-600 font-medium text-sm"
                                >
                                    <Trash2 size={18} className="text-red-500" />
                                    Supprimer le panneau
                                </button>

                                <button
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setSelectedPanel(null);
                                    }}
                                    className="w-full p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-600 font-medium text-sm"
                                >
                                    Annuler
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ============================================ */}
            {/* MODAL D'ÉDITION DU PANNEAU */}
            {/* ============================================ */}
            <AnimatePresence>
                {isEditModalOpen && editingPanel && (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setIsEditModalOpen(false);
                                setEditingPanel(null);
                            }
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-2xl bg-white rounded-2xl border border-blue-200 shadow-2xl flex flex-col max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="relative px-4 xs:px-5 sm:px-6 py-3 xs:py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base xs:text-lg sm:text-xl font-bold text-white">
                                            Modifier le panneau
                                        </h3>
                                        <p className="text-[7px] xs:text-[8px] sm:text-[9px] text-blue-200 uppercase tracking-wider mt-0.5">
                                            {editingPanel.idPan} • {editingPanel.adresse?.split('/').slice(-3).join(' / ')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsEditModalOpen(false);
                                            setEditingPanel(null);
                                        }}
                                        className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/80 transition-all duration-200"
                                    >
                                        <X size={16} className="text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* Corps du formulaire */}
                            <div className="flex-1 overflow-y-auto p-4 xs:p-5 sm:p-6 space-y-4">
                                {/* ID Panneau - Non modifiable */}
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                                    <label className="text-[7px] xs:text-[8px] text-gray-500 font-bold uppercase tracking-wider">
                                        ID Panneau (non modifiable)
                                    </label>
                                    <p className="text-sm font-bold text-gray-800 mt-1">{editingPanel.idPan}</p>
                                </div>

                                {/* Adresse */}
                                <div>
                                    <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">
                                        Adresse *
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full mt-1 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editForm.adresse}
                                        onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })}
                                        placeholder="Ex: RDC / KINSHASA / MONT-AMBA / NGABA / KAHEMBA / 06"
                                    />
                                    <p className="text-[6px] xs:text-[7px] text-gray-400 mt-1">⚠️ Format: Pays / Province / District / Commune / Avenue / Numéro</p>
                                </div>

                                {/* Type & Dimension */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">
                                            Type *
                                        </label>
                                        <select
                                            className="w-full mt-1 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            value={editForm.type}
                                            onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                                        >
                                            <option value="Vinyle">Vinyle</option>
                                            <option value="Bache">Bâche</option>
                                            <option value="LED">LED</option>
                                            <option value="Numérique">Numérique</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">
                                            Dimension
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full mt-1 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            value={editForm.dimension}
                                            onChange={(e) => setEditForm({ ...editForm, dimension: e.target.value })}
                                            placeholder="Ex: 12 x 22"
                                        />
                                    </div>
                                </div>

                                {/* Gestion des faces */}
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">
                                            Faces ({editForm.faces.length})
                                        </label>
                                        <button
                                            onClick={addFace}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-bold hover:bg-emerald-100 transition border border-emerald-200"
                                        >
                                            <Plus size={12} />
                                            Ajouter
                                        </button>
                                    </div>

                                    <div className="space-y-3 max-h-60 overflow-y-auto">
                                        {editForm.faces.map((face: any, index: number) => (
                                            <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[9px] font-bold text-blue-700">
                                                        Face {index + 1}
                                                    </span>
                                                    <button
                                                        onClick={() => removeFace(index)}
                                                        className="p-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Sens (ex: ROND POINT)"
                                                    className="w-full px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-gray-700 text-[10px] outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={face.sens || ''}
                                                    onChange={(e) => updateFace(index, 'sens', e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-4 xs:px-5 sm:px-6 py-3 xs:py-4 sm:py-5 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex gap-3 flex-shrink-0">
                                <button
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        setEditingPanel(null);
                                    }}
                                    className="flex-1 py-2 xs:py-2.5 rounded-xl bg-gray-100 text-gray-600 text-[9px] xs:text-[10px] font-bold uppercase tracking-wider hover:bg-gray-200 transition-all duration-200"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={savePanelChanges}
                                    disabled={isSubmitting}
                                    className="flex-1 py-2 xs:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[9px] xs:text-[10px] font-bold uppercase tracking-wider hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                    ) : (
                                        <>
                                            <Save size={14} className="inline mr-1" />
                                            Enregistrer
                                        </>
                                    )}
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
// RÉSERVATIONS MODULE - DISPOSITION AMÉLIORÉE
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
                face.reservations?.forEach((res: any) => {
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
        {
            id: 'enCours',
            title: 'En cours',
            icon: Clock,
            color: 'emerald',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            text: 'text-emerald-600',
            badge: 'bg-emerald-100 text-emerald-700',
            count: reservations.enCours.length,
            data: reservations.enCours
        },
        {
            id: 'futures',
            title: 'Futures',
            icon: Calendar,
            color: 'amber',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-600',
            badge: 'bg-amber-100 text-amber-700',
            count: reservations.futures.length,
            data: reservations.futures
        },
        {
            id: 'passees',
            title: 'Passées',
            icon: CheckCircle2,
            color: 'gray',
            bg: 'bg-gray-50',
            border: 'border-gray-200',
            text: 'text-gray-500',
            badge: 'bg-gray-100 text-gray-600',
            count: reservations.passees.length,
            data: reservations.passees
        }
    ];

    const totalReservations = reservations.enCours.length + reservations.futures.length + reservations.passees.length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            {/* ============================================ */}
            {/* EN-TÊTE */}
            {/* ============================================ */}
            <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-1 h-10 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full shadow-lg shadow-emerald-500/30" />
                    <div>
                        <h1 className="text-2xl font-black text-blue-800">Réservations</h1>
                        <p className="text-[8px] text-blue-600 uppercase tracking-wider">Suivi des locations</p>
                    </div>
                </div>
                <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-blue-200">
                    <span className="text-[10px] text-gray-500">Total</span>
                    <span className="ml-2 text-lg font-bold text-blue-700">{totalReservations}</span>
                </div>
            </div>

            {/* ============================================ */}
            {/* 3 CARTES DE RÉSUMÉ - 3 colonnes sur tous les écrans */}
            {/* ============================================ */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center shadow-sm hover:shadow-md transition">
                    <Clock size={20} className="text-emerald-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-emerald-600">{reservations.enCours.length}</p>
                    <p className="text-[8px] text-emerald-600 uppercase tracking-wider">En cours</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-center shadow-sm hover:shadow-md transition">
                    <Calendar size={20} className="text-amber-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-amber-600">{reservations.futures.length}</p>
                    <p className="text-[8px] text-amber-600 uppercase tracking-wider">Futures</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center shadow-sm hover:shadow-md transition">
                    <CheckCircle2 size={20} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-500">{reservations.passees.length}</p>
                    <p className="text-[8px] text-gray-500 uppercase tracking-wider">Passées</p>
                </div>
            </div>

            {/* ============================================ */}
            {/* SECTIONS DÉROULANTES - 3 colonnes sur PC, 1 sur mobile */}
            {/* ============================================ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sections.map((section) => (
                    <motion.div
                        key={section.id}
                        className={`bg-white rounded-xl border ${section.border} shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col`}
                    >
                        {/* En-tête de section - Toujours visible */}
                        <button
                            onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
                            className="w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-50 flex-shrink-0"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`p-2 rounded-lg ${section.bg} flex-shrink-0`}>
                                    <section.icon size={16} className={section.text} />
                                </div>
                                <div className="text-left min-w-0">
                                    <h3 className="text-[11px] font-bold text-gray-800 truncate">{section.title}</h3>
                                    <p className="text-[8px] text-gray-400">{section.count} réservation(s)</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${section.badge}`}>
                                    {section.count}
                                </span>
                                <motion.div
                                    animate={{ rotate: openSection === section.id ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <ChevronDown size={16} className="text-gray-400" />
                                </motion.div>
                            </div>
                        </button>

                        {/* Contenu déroulant */}
                        <AnimatePresence>
                            {openSection === section.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="border-t border-gray-100 overflow-hidden flex-1"
                                >
                                    <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                                        {section.data.length === 0 ? (
                                            <div className="text-center py-6">
                                                <section.icon size={24} className="text-gray-300 mx-auto mb-2" />
                                                <p className="text-gray-400 text-[9px]">Aucune réservation</p>
                                            </div>
                                        ) : (
                                            section.data.map((res: any, idx: number) => (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.03 }}
                                                    className={`p-2 rounded-lg ${section.bg} hover:bg-opacity-80 transition border ${section.border}`}
                                                >
                                                    <div className="flex flex-col gap-1.5 sm:gap-2">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] xs:text-[11px] sm:text-[12px] md:text-[13px] font-bold text-gray-800 truncate">
                                                                {res.societeLocatrice || 'Société inconnue'}
                                                            </p>
                                                            <span className={`px-1.5 py-0.5 rounded-full text-[6px] xs:text-[7px] sm:text-[8px] font-bold uppercase ${section.badge}`}>
                                                                {section.id === 'enCours' ? 'En cours' : section.id === 'futures' ? 'À venir' : 'Terminée'}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-[8px] xs:text-[9px] sm:text-[10px] md:text-[11px] text-gray-500">
                                                            <span>Panneau: <span className="font-medium text-gray-700">{res.panelId}</span></span>
                                                            <span className="text-gray-300">•</span>
                                                            <span>Face: <span className="font-medium text-gray-700">{res.faceId}</span></span>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] text-gray-400">
                                                            <Calendar size={10} className="xs:w-[11px] xs:h-[11px] sm:w-[12px] sm:h-[12px] md:w-[14px] md:h-[14px]" />
                                                            <span>{res.dateDebut} → {res.dateFin}</span>
                                                        </div>

                                                        {res.agentNom && (
                                                            <div className="flex items-center gap-1.5 text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] text-gray-400">
                                                                <Users size={10} className="xs:w-[11px] xs:h-[11px] sm:w-[12px] sm:h-[12px] md:w-[14px] md:h-[14px]" />
                                                                <span className="text-gray-500">Agent: <span className="text-gray-700">{res.agentNom}</span></span>
                                                            </div>
                                                        )}


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
// UTILISATEURS MODULE - VERSION AMÉLIORÉE
// ============================================
function UtilisateursModule({ societes, currentUser: initialUser }: any) {
    // Utilisez currentUser comme nom de variable d'état
    const [currentUser, setCurrentUser] = useState<any>(initialUser || null);



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
        fonction: '',
        password: ''  // ✅ AJOUTER

    });

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

    const agents = societes.filter((s: any) => s.role === 'commercial' || s.fonction === 'agent');
    const clients = societes.filter((s: any) => s.role === 'visiteur' && s.nomSociete);
    const currentList = activeTab === 'agents' ? agents : clients;

    const filteredList = currentList.filter((u: any) =>
        (u.nomComplet?.toLowerCase() || u.nomSociete?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const getRoleStyle = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'admin': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'commercial': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'visiteur': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'superviseurs': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };


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

    // ============================================
    // HANDLE EDIT - AVEC PROTECTION SUPER ADMIN
    // ============================================
    const handleEdit = (user: any) => {
        // ✅ Vérifier si c'est le super administrateur
        if (user.email === SUPER_ADMIN_EMAIL) {
            if (currentUser?.email !== SUPER_ADMIN_EMAIL) {
                alert("⛔ ACCÈS REFUSÉ !\n\nSeul le super administrateur peut modifier son propre compte.");
                return;
            }
        }

        console.log("📝 Édition de l'utilisateur:", user);

        setEditForm({
            nom: user.nom || '',
            postNom: user.postNom || '',
            prenom: user.prenom || '',
            nomComplet: user.nomComplet || user.nomSociete || '',
            email: user.email || '',
            telephone: user.telephone || '',
            role: user.role || 'visiteur',
            fonction: user.fonction || '',
            password: ''
        });

        setEditingUser(user);
    };
    const loadData = async () => {
        try {
            // Recharger les données depuis Firebase
            const snapSoc = await getDocs(collection(db, "societes"));
            const societesData = snapSoc.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Mettre à jour les données dans le composant parent
            // ou faire une mise à jour locale
            window.location.reload(); // Recharge simple
        } catch (error) {
            console.error("Erreur lors du rechargement:", error);
            alert("Erreur lors du rechargement des données");
        }
    };





    // ✅ Version corrigée de handleSaveEdit
    const handleSaveEdit = async () => {
        if (!editingUser) {
            alert("❌ Aucun utilisateur sélectionné");
            return;
        }

        if (!editForm.email || editForm.email.trim() === '') {
            alert("❌ L'email est obligatoire");
            return;
        }



        try {
            const updateData: any = {
                email: editForm.email.trim(),
                telephone: editForm.telephone || '',
                role: editForm.role || 'visiteur',
                updatedAt: new Date().toISOString()
            };

            // ✅ CORRECTION - Vérifier currentUser existe
            if (editForm.password && editForm.password.trim() !== '') {
                updateData.password = editForm.password.trim();
                updateData.passwordUpdatedAt = new Date().toISOString();
                // ✅ Utiliser currentUser s'il existe, sinon fallback
                updateData.passwordUpdatedBy = currentUser?.email || 'Administrateur';
            }

            // Si c'est un agent (a un nom)
            const isAgent = editingUser.nom || editForm.nom || editingUser.role === 'commercial';

            if (isAgent) {
                const nom = editForm.nom?.trim() || editingUser.nom || '';
                const postNom = editForm.postNom?.trim() || editingUser.postNom || '';
                const prenom = editForm.prenom?.trim() || editingUser.prenom || '';

                updateData.nom = nom;
                updateData.postNom = postNom;
                updateData.prenom = prenom;

                const nomComplet = [nom, postNom, prenom].filter(Boolean).join(' ').trim();
                if (nomComplet) {
                    updateData.nomComplet = nomComplet;
                }

                if (editForm.fonction) {
                    updateData.fonction = editForm.fonction.trim();
                }
            } else {
                const nomSociete = editForm.nomComplet?.trim() || editingUser.nomSociete || '';
                if (nomSociete) {
                    updateData.nomSociete = nomSociete;
                }
            }

            const userRef = doc(db, "societes", editingUser.id);
            await updateDoc(userRef, updateData);

            const passwordMessage = editForm.password && editForm.password.trim() !== ''
                ? ' 🔑 Mot de passe modifié'
                : '';
            alert(`✅ Utilisateur modifié avec succès !${passwordMessage}`);

            setEditingUser(null);
            setEditForm({
                nom: '',
                postNom: '',
                prenom: '',
                nomComplet: '',
                email: '',
                telephone: '',
                role: '',
                fonction: '',
                password: ''
            });

            window.location.reload();

        } catch (error: any) {
            console.error("❌ Erreur lors de la modification:", error);
            alert(`❌ Erreur: ${error.message || "Erreur inconnue"}`);
        }
    };

    const handleDelete = async (id: string, userEmail?: string, userNom?: string) => {
        // ✅ Vérifier si c'est le super administrateur
        if (userEmail === SUPER_ADMIN_EMAIL) {
            alert("⛔ ACCÈS REFUSÉ !\n\nVous ne pouvez pas supprimer le super administrateur.\n\nCe compte est protégé.");
            return;
        }

        if (!confirm(`⚠️ Supprimer définitivement "${userNom || 'cet utilisateur'}" ?\n\nCette action est irréversible.`)) {
            return;
        }

        try {
            await deleteDoc(doc(db, "societes", id));
            alert(`✅ Utilisateur "${userNom || 'Inconnu'}" supprimé avec succès !`);
            loadData();
        } catch (error) {
            console.error("❌ Erreur lors de la suppression:", error);
            alert("❌ Erreur lors de la suppression de l'utilisateur");
        }
    };


    // ============================================
    // HANDLE UPDATE STATUS - AVEC PROTECTION SUPER ADMIN
    // ============================================
    const handleUpdateStatus = async (id: string, currentActif: boolean, userEmail?: string) => {
        // ✅ Vérifier si c'est le super administrateur
        if (userEmail === SUPER_ADMIN_EMAIL) {
            // ✅ Vérifier si l'utilisateur connecté est le super admin lui-même
            if (currentUser?.email !== SUPER_ADMIN_EMAIL) {
                alert("⛔ ACCÈS REFUSÉ !\n\nSeul le super administrateur peut modifier son propre compte.");
                return;
            }
        }

        const newStatus = !currentActif;
        const action = newStatus ? "activer" : "désactiver";

        if (!confirm(`Voulez-vous vraiment ${action} ce compte ?`)) {
            return;
        }

        try {
            await updateDoc(doc(db, "societes", id), { actif: newStatus });
            alert(newStatus ? "✅ Compte activé" : "⚠️ Compte désactivé");
            loadData();
        } catch (error) {
            console.error("❌ Erreur lors de la mise à jour:", error);
            alert("❌ Erreur lors de la mise à jour du statut");
        }
    };

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
            loadData();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la création");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                {/* En-tête - Fond bleu clair */}
                <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-1 h-10 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full shadow-lg shadow-blue-500/30" />
                        <div>
                            <h1 className="text-2xl font-black text-blue-800">Utilisateurs</h1>
                            <p className="text-[8px] text-blue-600 uppercase tracking-wider">Gestion des comptes</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                className="pl-9 pr-4 py-2 bg-white rounded-xl text-blue-800 text-[11px] outline-none focus:ring-2 ring-blue-500 border border-blue-200 w-48 sm:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white text-[11px] font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
                        >
                            <UserPlus size={14} /> Nouveau
                        </button>
                    </div>
                </div>

                {/* Onglets */}
                <div className="flex gap-2 border-b border-blue-200 pb-2">
                    <button
                        onClick={() => setActiveTab('agents')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'agents'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                            : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                            }`}
                    >
                        Agents ({agents.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('clients')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'clients'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                            : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                            }`}
                    >
                        Clients ({clients.length})
                    </button>
                </div>

                {/* Grille des utilisateurs - Fond bleu clair pour les cartes */}
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                    {filteredList.map((user: any, idx: number) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ y: -4, scale: 1.02 }}
                            className={`group relative overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-300 cursor-pointer shadow-md hover:shadow-xl ${!user.actif
                                ? 'bg-red-50 border-red-300 border'
                                : user.isOnline
                                    ? 'bg-white border-emerald-300 hover:border-emerald-400 border'
                                    : 'bg-white border-blue-200 hover:border-blue-300 border'
                                }`}
                        >
                            {/* Badge de statut flottant */}
                            <div className="absolute top-3 right-3 z-10">
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold ${!user.actif
                                    ? 'bg-red-500 text-white'
                                    : user.isOnline
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : 'bg-gray-400 text-white'
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
                                    <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ${!user.actif
                                        ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                                        : 'bg-gradient-to-br from-blue-600 to-blue-700'
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
                                        <h3 className={`text-xs sm:text-sm font-bold truncate ${!user.actif ? 'text-gray-500' : 'text-gray-800'
                                            }`}>
                                            {user.nomComplet || user.nomSociete || 'Utilisateur'}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                            <span className={`px-1.5 py-0.5 rounded-full text-[6px] sm:text-[7px] font-bold uppercase border ${getRoleStyle(user.role)}`}>
                                                {user.role === 'commercial' ? 'agent' : user.role === 'visiteur' ? 'Client' : user.role || 'Utilisateur'}
                                            </span>
                                            {user.fonction && (
                                                <span className="text-[6px] sm:text-[7px] text-gray-400">{user.fonction}</span>
                                            )}
                                        </div>
                                    </div>

                                    {user.email === 'omeongaandre2@gmail.com' && (
                                        <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-red-500 text-white text-[6px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                                            Super Admin
                                        </span>
                                    )}
                                </div>

                                {/* Informations de contact */}
                                {/* Email - Masqué si Super Admin */}
                                {user.email !== SUPER_ADMIN_EMAIL && (
                                    <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                                        <Mail size={12} className="text-blue-500 shrink-0" />
                                        <span className="text-[8px] sm:text-[9px] text-gray-600 truncate flex-1">{user.email}</span>
                                    </div>
                                )}

                                {/* Téléphone - Masqué si Super Admin */}
                                {user.email !== SUPER_ADMIN_EMAIL && user.telephone && (
                                    <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                                        <Phone size={12} className="text-blue-500 shrink-0" />
                                        <span className="text-[8px] sm:text-[9px] text-gray-600">{user.telephone}</span>
                                    </div>
                                )}

                                {/* Statut de connexion - Masqué si Super Admin */}
                                {user.email !== SUPER_ADMIN_EMAIL && (
                                    <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                                        <Clock size={12} className="text-blue-500 shrink-0" />
                                        <span className="text-[7px] sm:text-[8px] text-gray-500">
                                            {!user.actif
                                                ? 'Compte désactivé'
                                                : user.isOnline
                                                    ? 'Actif maintenant'
                                                    : `Dernière connexion: ${formatLastSeen(user.lastLogin)}`}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Actions - Textes bleus */}
                            <div className="p-3 pt-0 flex gap-1.5 sm:gap-2 border-t border-blue-100 mt-1">
                                {/* ✅ Bouton Activer/Désactiver - Protégé */}
                                <button
                                    onClick={() => handleUpdateStatus(user.id, user.actif, user.email)}
                                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 rounded-lg text-[7px] sm:text-[8px] font-bold uppercase transition-all ${user.email === 'omeongaandre2@gmail.com' && currentUser?.email !== 'omeongaandre2@gmail.com'
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                        : user.actif
                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                        }`}
                                    disabled={user.email === SUPER_ADMIN_EMAIL && currentUser?.email !== SUPER_ADMIN_EMAIL}
                                >
                                    <Power size={10} className="sm:w-3 sm:h-3" />
                                    <span className="hidden xs:inline">{user.actif ? 'Désactiver' : 'Activer'}</span>
                                </button>

                                {/* ✅ Bouton Modifier - Protégé */}
                                <button
                                    onClick={() => handleEdit(user)}
                                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 rounded-lg transition-all text-[7px] sm:text-[8px] font-bold uppercase ${user.email === 'omeongaandre2@gmail.com' && currentUser?.email !== 'omeongaandre2@gmail.com'
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                        }`}
                                    disabled={user.email === SUPER_ADMIN_EMAIL && currentUser?.email !== SUPER_ADMIN_EMAIL}
                                >
                                    <Edit2 size={10} className="sm:w-3 sm:h-3" />
                                    <span className="hidden xs:inline">
                                        {user.email === SUPER_ADMIN_EMAIL && currentUser?.email === SUPER_ADMIN_EMAIL
                                            ? 'Modifier'
                                            : user.email === SUPER_ADMIN_EMAIL
                                                ? 'Protégé'
                                                : 'Modifier'}
                                    </span>
                                </button>

                                {/* ✅ Bouton Supprimer avec toutes les informations */}
                                <button
                                    onClick={() => handleDelete(user.id, user.email, user.nomComplet || user.nomSociete)}
                                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 rounded-lg transition-all text-[7px] sm:text-[8px] font-bold uppercase ${user.email === SUPER_ADMIN_EMAIL
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                                        }`}
                                    disabled={user.email === SUPER_ADMIN_EMAIL}
                                >
                                    <Trash2 size={10} className="sm:w-3 sm:h-3" />
                                    <span className="hidden xs:inline">
                                        {user.email === SUPER_ADMIN_EMAIL ? 'Protégé' : 'Supprimer'}
                                    </span>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>


                {/* ✅ MODAL D'ÉDITION - À AJOUTER */}
                <AnimatePresence>
                    {editingUser && (
                        <div
                            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                    setEditingUser(null);
                                    setEditForm({
                                        nom: '',
                                        postNom: '',
                                        prenom: '',
                                        nomComplet: '',
                                        email: '',
                                        telephone: '',
                                        role: '',
                                        fonction: '',
                                        password: ''

                                    });
                                }
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="relative w-full max-w-md bg-white rounded-2xl border border-blue-200 shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="relative px-4 xs:px-5 sm:px-6 py-3 xs:py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl flex-shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-base xs:text-lg sm:text-xl font-bold text-white">
                                                Modifier l'utilisateur
                                            </h3>
                                            <p className="text-[7px] xs:text-[8px] sm:text-[9px] text-blue-200 uppercase tracking-wider mt-0.5">
                                                Édition des informations
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingUser(null);
                                                setEditForm({
                                                    nom: '',
                                                    postNom: '',
                                                    prenom: '',
                                                    nomComplet: '',
                                                    email: '',
                                                    telephone: '',
                                                    role: '',
                                                    fonction: '',
                                                    password: ''  // ✅ AJOUTER
                                                });
                                            }}
                                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200"
                                        >
                                            <X size={16} className="text-white/60" />
                                        </button>
                                    </div>
                                </div>

                                {/* Corps du formulaire */}
                                <div className="flex-1 overflow-y-auto p-4 xs:p-5 sm:p-6 space-y-4">
                                    {editingUser.nom || editForm.nom ? (
                                        <>
                                            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Nom</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200"
                                                        value={editForm.nom}
                                                        onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Post-nom</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200"
                                                        value={editForm.postNom}
                                                        onChange={(e) => setEditForm({ ...editForm, postNom: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Prénom</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200"
                                                    value={editForm.prenom}
                                                    onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Fonction</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200"
                                                    value={editForm.fonction}
                                                    onChange={(e) => setEditForm({ ...editForm, fonction: e.target.value })}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-1">
                                            <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Nom de la société</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200"
                                                value={editForm.nomComplet}
                                                onChange={(e) => setEditForm({ ...editForm, nomComplet: e.target.value })}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Email</label>
                                        <input
                                            type="email"
                                            className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Téléphone</label>
                                        <input
                                            type="tel"
                                            className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200"
                                            value={editForm.telephone}
                                            onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Rôle</label>
                                        <select
                                            className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200"
                                            value={editForm.role}
                                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                        >
                                            <option value="admin">Administrateur</option>
                                            <option value="commercial">Commercial</option>
                                            <option value="comptable">Comptable</option>
                                            <option value="visiteur">Client</option>
                                            <option value="superviseurs">Superviseur</option>
                                        </select>
                                    </div>
                                    {/* ✅ AJOUTER CE BLOC DANS LE MODAL D'ÉDITION, APRÈS LE CHAMP RÔLE */}
                                    <div className="space-y-1">
                                        <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">
                                            Nouveau mot de passe
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Laisser vide pour ne pas modifier"
                                                className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200 focus:border-transparent transition-all pr-10"
                                                value={editForm.password}
                                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                        <p className="text-[6px] xs:text-[7px] text-gray-400">
                                            ⚠️ Laissez vide pour conserver le mot de passe actuel
                                        </p>
                                    </div>
                                </div>


                                {/* Footer avec boutons */}
                                <div className="px-4 xs:px-5 sm:px-6 py-3 xs:py-4 sm:py-5 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex gap-3 flex-shrink-0">
                                    <button
                                        onClick={() => {
                                            setEditingUser(null);
                                            setEditForm({
                                                nom: '',
                                                postNom: '',
                                                prenom: '',
                                                nomComplet: '',
                                                email: '',
                                                telephone: '',
                                                role: '',
                                                fonction: '',
                                                password: ''  // ✅ AJOUTER
                                            });
                                        }}
                                        className="flex-1 py-2 xs:py-2.5 rounded-xl bg-gray-100 text-gray-600 text-[9px] xs:text-[10px] font-bold uppercase tracking-wider hover:bg-gray-200 transition-all duration-200"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        className="flex-1 py-2 xs:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[9px] xs:text-[10px] font-bold uppercase tracking-wider hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                    >
                                        <Save size={14} className="inline mr-1" />
                                        Enregistrer
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
                {/* Message si aucun résultat */}
                {filteredList.length === 0 && (
                    <div className="text-center py-12 bg-blue-50 rounded-2xl border border-blue-200">
                        <Users size={48} className="text-blue-300 mx-auto mb-3" />
                        <p className="text-blue-500 text-sm">Aucun utilisateur trouvé</p>
                    </div>
                )}

                {/* Modals - Gardés identiques mais avec couleurs bleues */}
                <AnimatePresence>
                    {isCreateModalOpen && (
                        <div
                            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) setIsCreateModalOpen(false);
                            }}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="relative w-full max-w-lg bg-white rounded-2xl border border-blue-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="relative px-4 xs:px-5 sm:px-6 py-3 xs:py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-300 flex-shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-base xs:text-lg sm:text-xl font-bold text-white">
                                                Nouvel utilisateur
                                            </h3>
                                            <p className="text-[7px] xs:text-[8px] sm:text-[9px] text-blue-200 uppercase tracking-wider mt-0.5">
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

                                <div className="flex-1 overflow-y-auto p-4 xs:p-5 sm:p-6 space-y-4">
                                    {/* Contenu du formulaire - identique mais avec couleurs adaptées */}
                                    <div className="flex gap-2 p-1 bg-blue-50 rounded-xl">
                                        <div className="flex-1 text-center py-2 px-3 rounded-lg bg-blue-600 text-white text-[9px] xs:text-[10px] sm:text-[11px] font-bold uppercase">
                                            Agent dispromalt
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Nom *</label>
                                            <input
                                                type="text"
                                                placeholder="omeonga"
                                                className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200 focus:border-transparent transition-all"
                                                value={createForm.nom}
                                                onChange={(e) => setCreateForm({ ...createForm, nom: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Post-nom *</label>
                                            <input
                                                type="text"
                                                placeholder="omakinda"
                                                className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200 focus:border-transparent transition-all"
                                                value={createForm.postNom}
                                                onChange={(e) => setCreateForm({ ...createForm, postNom: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Prénom *</label>
                                        <input
                                            type="text"
                                            placeholder="andre"
                                            className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200 focus:border-transparent transition-all"
                                            value={createForm.prenom}
                                            onChange={(e) => setCreateForm({ ...createForm, prenom: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Téléphone *</label>
                                        <input
                                            type="tel"
                                            placeholder="+243 XXX XXX XXX"
                                            className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200 focus:border-transparent transition-all"
                                            value={createForm.telephone}
                                            onChange={(e) => setCreateForm({ ...createForm, telephone: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Fonction</label>
                                            <input
                                                type="text"
                                                placeholder="agent"
                                                className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200 focus:border-transparent transition-all"
                                                value={createForm.fonction}
                                                onChange={(e) => setCreateForm({ ...createForm, fonction: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Rôle *</label>
                                            <select
                                                className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200 focus:border-transparent transition-all cursor-pointer"
                                                value={createForm.role}
                                                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                                            >
                                                <option value="commercial" className="bg-white">Commercial</option>
                                                <option value="admin" className="bg-white">Administrateur</option>
                                                <option value="comptable" className="bg-white">Comptable</option>
                                                <option value="superviseurs" className="bg-white">Superviseur</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-blue-500" />
                                            <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Email généré</label>
                                        </div>
                                        <p className="text-[10px] xs:text-[11px] text-gray-700 font-mono mt-1 break-all">{createForm.email || 'En attente...'}</p>
                                        <p className="text-[6px] xs:text-[7px] text-gray-400 mt-1">✓ Généré automatiquement à partir du prénom et nom</p>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[7px] xs:text-[8px] text-blue-600 font-bold uppercase tracking-wider">Mot de passe *</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="123456789"
                                                className="w-full px-3 py-2.5 bg-blue-50 rounded-xl text-gray-700 text-[11px] xs:text-[12px] outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200 focus:border-transparent transition-all pr-10"
                                                value={createForm.password}
                                                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                        <p className="text-[6px] xs:text-[7px] text-gray-400">Défaut: 123456789 (l'utilisateur pourra le modifier)</p>
                                    </div>
                                </div>

                                <div className="px-4 xs:px-5 sm:px-6 py-3 xs:py-4 sm:py-5 bg-gray-50 border-t border-gray-200 flex gap-3 flex-shrink-0">
                                    <button
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="flex-1 py-2 xs:py-2.5 rounded-xl bg-gray-100 text-gray-600 text-[9px] xs:text-[10px] font-bold uppercase tracking-wider hover:bg-gray-200 transition-all duration-200"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleCreateUser}
                                        disabled={isCreating || !createForm.nom || !createForm.prenom}
                                        className={`flex-1 py-2 xs:py-2.5 rounded-xl text-white text-[9px] xs:text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${isCreating || !createForm.nom || !createForm.prenom
                                            ? 'bg-gray-400 cursor-not-allowed opacity-50'
                                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
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
            </motion.div>
        </div>
    );
}






// ✅ Version correcte de StatistiquesModule
function StatistiquesModule({ stats }: any) {
    // Calcul des pourcentages
    const totalFaces = stats.faces.total || 1;
    const pourcentageLibres = Math.round((stats.faces.libres / totalFaces) * 100);
    const pourcentageOccupees = Math.round((stats.faces.occupees / totalFaces) * 100);
    const pourcentageReservees = Math.round((stats.faces.reservees / totalFaces) * 100);
    const pourcentageMaintenance = Math.round((stats.faces.maintenance / totalFaces) * 100);
    const tauxOccupation = stats.faces.occupees + stats.faces.reservees;
    const pourcentageOccupation = Math.round((tauxOccupation / totalFaces) * 100);

    const pieData = [
        { name: 'Libres', value: stats.faces.libres, color: '#10B981', percentage: pourcentageLibres },
        { name: 'Occupées', value: stats.faces.occupees, color: '#3B82F6', percentage: pourcentageOccupees },
        { name: 'Réservées', value: stats.faces.reservees, color: '#F59E0B', percentage: pourcentageReservees },
        { name: 'Maintenance', value: stats.faces.maintenance, color: '#EF4444', percentage: pourcentageMaintenance }
    ].filter(d => d.value > 0);

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

    // ✅ LE RETURN DOIT ÊTRE ICI - AVEC LE JSX
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            {/* En-tête */}
            <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-1 h-10 bg-gradient-to-b from-cyan-500 to-cyan-600 rounded-full shadow-lg shadow-cyan-500/30" />
                    <div>
                        <h1 className="text-2xl font-black text-blue-800">Statistiques</h1>
                        <p className="text-[8px] text-blue-600 uppercase tracking-wider">Analyses détaillées</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-blue-200 shadow-sm">
                    <Clock size={14} className="text-blue-400" />
                    <span className="text-[8px] text-gray-500">Mis à jour: {new Date().toLocaleDateString()}</span>
                </div>
            </div>

            {/* LIGNE 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Diagramme Circulaire */}
                <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                        <PieChart size={16} className="text-cyan-500" />
                        <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Distribution des faces</h3>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
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
                                                stroke="#fff"
                                                strokeWidth="2"
                                                className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                                            />
                                        );
                                    });
                                })()}
                                <circle cx="50" cy="50" r="25" fill="#fff" />
                                <text x="50" y="48" textAnchor="middle" fill="#1F2937" fontSize="10" fontWeight="bold">
                                    {totalFaces}
                                </text>
                                <text x="50" y="58" textAnchor="middle" fill="#9CA3AF" fontSize="5">
                                    FACES
                                </text>
                            </svg>
                        </div>
                        <div className="flex-1 space-y-2 w-full">
                            {pieData.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition cursor-pointer border border-gray-100"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-[9px] text-gray-700 font-medium">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-gray-800">{item.value}</span>
                                        <span className="text-[8px] text-gray-400">({item.percentage}%)</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Graphique en barres */}
                <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                        <TrendingUp size={16} className="text-cyan-500" />
                        <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Évolution du taux d'occupation</h3>
                    </div>
                    <div className="space-y-3">
                        {monthlyData.slice(0, 6).map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <div className="flex justify-between text-[8px] text-gray-500 mb-1">
                                    <span className="font-bold text-gray-600">{item.month}</span>
                                    <span className="font-bold text-cyan-500">{item.value}%</span>
                                </div>
                                <div className="w-full h-5 bg-gray-100 rounded-lg overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.value}%` }}
                                        transition={{ duration: 0.8, delay: idx * 0.05 }}
                                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-end pr-2 shadow-sm"
                                    >
                                        {item.value > 15 && (
                                            <span className="text-[6px] font-bold text-white">{item.value}%</span>
                                        )}
                                    </motion.div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={12} className="text-emerald-500" />
                            <span className="text-[7px] text-gray-500">Tendance actuelle</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-emerald-500">+{pourcentageOccupation - monthlyData[4].value}%</span>
                            <span className="text-[6px] text-gray-400">vs mois dernier</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* LIGNE 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Jauge */}
                <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                        <Target size={16} className="text-cyan-500" />
                        <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Taux d'occupation global</h3>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="relative w-40 h-40 mb-4">
                            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="#E5E7EB" strokeWidth="10" />
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
                                <text x="60" y="55" textAnchor="middle" fill="#1F2937" fontSize="18" fontWeight="bold">
                                    {pourcentageOccupation}%
                                </text>
                                <text x="60" y="70" textAnchor="middle" fill="#9CA3AF" fontSize="7">
                                    Occupation
                                </text>
                            </svg>
                        </div>
                        <div className="flex gap-4 justify-center flex-wrap">
                            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-[7px] text-gray-600">Libre {pourcentageLibres}%</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-[7px] text-gray-600">Occupé {pourcentageOccupees}%</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-[7px] text-gray-600">Réservé {pourcentageReservees}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Indicateurs clés */}
                <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                        <Activity size={16} className="text-cyan-500" />
                        <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Indicateurs clés</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                            <Clock size={16} className="text-emerald-500 mx-auto mb-1" />
                            <p className="text-lg font-bold text-emerald-600">{stats.reservations.enCours}</p>
                            <p className="text-[7px] text-emerald-600 uppercase">En cours</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <Calendar size={16} className="text-amber-500 mx-auto mb-1" />
                            <p className="text-lg font-bold text-amber-600">{stats.reservations.futures}</p>
                            <p className="text-[7px] text-amber-600 uppercase">Futures</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-cyan-50 border border-cyan-200">
                            <Users size={16} className="text-cyan-500 mx-auto mb-1" />
                            <p className="text-lg font-bold text-cyan-600">{stats.users}</p>
                            <p className="text-[7px] text-cyan-600 uppercase">Agents</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-200">
                            <Building2 size={16} className="text-purple-500 mx-auto mb-1" />
                            <p className="text-lg font-bold text-purple-600">{stats.societes}</p>
                            <p className="text-[7px] text-purple-600 uppercase">Clients</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-orange-50 border border-orange-200">
                            <MapPin size={16} className="text-orange-500 mx-auto mb-1" />
                            <p className="text-lg font-bold text-orange-600">{stats.panneaux}</p>
                            <p className="text-[7px] text-orange-600 uppercase">Panneaux</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                            <Layers size={16} className="text-blue-500 mx-auto mb-1" />
                            <p className="text-lg font-bold text-blue-600">{stats.faces.total}</p>
                            <p className="text-[7px] text-blue-600 uppercase">Faces</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* LIGNE 3 */}
            <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                    <BarChart3 size={16} className="text-cyan-500" />
                    <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Analyse détaillée</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center hover:shadow-sm transition">
                        <p className="text-[7px] text-emerald-600 uppercase tracking-wider">Taux de rotation</p>
                        <p className="text-2xl font-bold text-emerald-600">
                            {Math.round((stats.reservations.passees / (stats.reservations.enCours + stats.reservations.passees || 1)) * 100)}%
                        </p>
                        <p className="text-[7px] text-emerald-500">des réservations terminées</p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center hover:shadow-sm transition">
                        <p className="text-[7px] text-blue-600 uppercase tracking-wider">Ratio faces/panneau</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {(stats.faces.total / stats.panneaux || 0).toFixed(1)}
                        </p>
                        <p className="text-[7px] text-blue-500">faces par panneau</p>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center hover:shadow-sm transition">
                        <p className="text-[7px] text-amber-600 uppercase tracking-wider">Réservations actives</p>
                        <p className="text-2xl font-bold text-amber-600">{stats.reservations.enCours}</p>
                        <p className="text-[7px] text-amber-500">contrats en cours</p>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-center hover:shadow-sm transition">
                        <p className="text-[7px] text-purple-600 uppercase tracking-wider">Projection mensuelle</p>
                        <p className="text-2xl font-bold text-purple-600">
                            +{Math.round((stats.reservations.futures / (stats.reservations.enCours || 1)) * 100)}%
                        </p>
                        <p className="text-[7px] text-purple-500">vs période actuelle</p>
                    </div>
                </div>
            </div>
        </motion.div>
    ); // ✅ FERMETURE DU RETURN
}

// ============================================
// SUPPORT MODULE - VERSION AMÉLIORÉE
// ============================================
// ============================================
// SUPPORT MODULE - DESIGN FANTASTIQUE
// ============================================
function SupportModule() {
    const [activeTab, setActiveTab] = useState('docs');
    const [searchQuery, setSearchQuery] = useState('');

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

    const tabs = [
        { id: 'docs', label: 'Documentation', icon: BookOpen, color: 'blue', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
        { id: 'faq', label: 'FAQ', icon: HelpCircle, color: 'amber', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
        { id: 'contact', label: 'Contact', icon: MessageSquare, color: 'emerald', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
        { id: 'updates', label: 'Mises à jour', icon: Zap, color: 'purple', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' }
    ];

    const getTabColors = (color: string, isActive: boolean) => {
        const colors: Record<string, any> = {
            blue: {
                bg: isActive ? 'bg-blue-600' : 'bg-blue-50',
                text: isActive ? 'text-white' : 'text-blue-600',
                border: isActive ? 'border-blue-600' : 'border-blue-200',
                shadow: isActive ? 'shadow-lg shadow-blue-500/30' : '',
                hover: 'hover:bg-blue-100'
            },
            amber: {
                bg: isActive ? 'bg-amber-600' : 'bg-amber-50',
                text: isActive ? 'text-white' : 'text-amber-600',
                border: isActive ? 'border-amber-600' : 'border-amber-200',
                shadow: isActive ? 'shadow-lg shadow-amber-500/30' : '',
                hover: 'hover:bg-amber-100'
            },
            emerald: {
                bg: isActive ? 'bg-emerald-600' : 'bg-emerald-50',
                text: isActive ? 'text-white' : 'text-emerald-600',
                border: isActive ? 'border-emerald-600' : 'border-emerald-200',
                shadow: isActive ? 'shadow-lg shadow-emerald-500/30' : '',
                hover: 'hover:bg-emerald-100'
            },
            purple: {
                bg: isActive ? 'bg-purple-600' : 'bg-purple-50',
                text: isActive ? 'text-white' : 'text-purple-600',
                border: isActive ? 'border-purple-600' : 'border-purple-200',
                shadow: isActive ? 'shadow-lg shadow-purple-500/30' : '',
                hover: 'hover:bg-purple-100'
            }
        };
        return colors[color] || colors.blue;
    };

    const getCardColors = (color: string) => {
        const colors: Record<string, any> = {
            blue: { border: 'border-blue-200', hover: 'hover:border-blue-400', icon: 'text-blue-600', bg: 'bg-blue-50' },
            amber: { border: 'border-amber-200', hover: 'hover:border-amber-400', icon: 'text-amber-600', bg: 'bg-amber-50' },
            emerald: { border: 'border-emerald-200', hover: 'hover:border-emerald-400', icon: 'text-emerald-600', bg: 'bg-emerald-50' },
            purple: { border: 'border-purple-200', hover: 'hover:border-purple-400', icon: 'text-purple-600', bg: 'bg-purple-50' },
            orange: { border: 'border-orange-200', hover: 'hover:border-orange-400', icon: 'text-orange-600', bg: 'bg-orange-50' },
            cyan: { border: 'border-cyan-200', hover: 'hover:border-cyan-400', icon: 'text-cyan-600', bg: 'bg-cyan-50' }
        };
        return colors[color] || colors.blue;
    };

    // Filtrer les FAQs
    const filteredFaqs = faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            {/* ============================================ */}
            {/* EN-TÊTE AVEC GRADIENT */}
            {/* ============================================ */}
            <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 shadow-xl">
                <div className="absolute inset-0 bg-white/5" />
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full" />
                <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-white/5 rounded-full" />

                <div className="relative flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                            <HelpCircle size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white">Centre d'aide</h1>
                            <p className="text-[8px] text-blue-200 uppercase tracking-wider">Support et assistance</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[8px] text-white/80">Support disponible 24/7</span>
                    </div>
                </div>
            </div>

            {/* ============================================ */}
            {/* ONGLETS AVEC EFFET MODERNE */}
            {/* ============================================ */}
            <div className="flex flex-wrap gap-2 p-1 bg-white rounded-2xl border border-gray-200 shadow-sm">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const colors = getTabColors(tab.color, isActive);

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all duration-300 flex-1 sm:flex-none justify-center ${isActive
                                ? `${colors.bg} ${colors.text} ${colors.shadow} ${colors.border} border`
                                : `${colors.text} ${colors.hover} border border-transparent`
                                }`}
                        >
                            <div className={`p-1 rounded-lg ${isActive ? 'bg-white/20' : tab.iconBg}`}>
                                <tab.icon size={14} className={isActive ? 'text-white' : tab.iconColor} />
                            </div>
                            <span className="hidden xs:inline">{tab.label}</span>
                            <span className="xs:hidden">{tab.label.charAt(0)}</span>
                            {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ============================================ */}
            {/* CONTENU AVEC CARTES MODERNES */}
            {/* ============================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Colonne principale */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Documentation */}
                    {activeTab === 'docs' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300"
                        >
                            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
                                <div className="p-2 rounded-xl bg-blue-100">
                                    <BookOpen size={18} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800">Documentation</h3>
                                    <p className="text-[8px] text-gray-400 uppercase tracking-wider">Guides et tutoriels</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher dans la documentation..."
                                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl text-gray-700 text-[10px] outline-none focus:ring-2 ring-blue-500 border border-gray-200 focus:border-transparent transition"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <DocCardModern
                                        title="Guide de démarrage"
                                        description="Premiers pas avec GDP"
                                        icon={Rocket}
                                        color="emerald"
                                    />
                                    <DocCardModern
                                        title="Administration"
                                        description="Gestion des utilisateurs"
                                        icon={Shield}
                                        color="blue"
                                    />
                                    <DocCardModern
                                        title="Panneaux"
                                        description="Configuration des supports"
                                        icon={MapPin}
                                        color="amber"
                                    />
                                    <DocCardModern
                                        title="Réservations"
                                        description="Gestion des locations"
                                        icon={Calendar}
                                        color="purple"
                                    />
                                    <DocCardModern
                                        title="Facturation"
                                        description="Suivi financier"
                                        icon={DollarSign}
                                        color="cyan"
                                    />
                                    <DocCardModern
                                        title="API & Développeurs"
                                        description="Intégrations techniques"
                                        icon={Code}
                                        color="orange"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* FAQ avec recherche */}
                    {activeTab === 'faq' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300"
                        >
                            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
                                <div className="p-2 rounded-xl bg-amber-100">
                                    <HelpCircle size={18} className="text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800">Foire aux questions</h3>
                                    <p className="text-[8px] text-gray-400 uppercase tracking-wider">Questions fréquentes</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher une question..."
                                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl text-gray-700 text-[10px] outline-none focus:ring-2 ring-amber-500 border border-gray-200 focus:border-transparent transition"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                {filteredFaqs.length === 0 ? (
                                    <div className="text-center py-8">
                                        <HelpCircle size={32} className="text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-400 text-sm">Aucune question trouvée</p>
                                    </div>
                                ) : (
                                    filteredFaqs.map((faq, idx) => (
                                        <FaqItemModern key={idx} question={faq.question} answer={faq.answer} />
                                    ))
                                )}
                                <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 text-center">
                                    <p className="text-[8px] text-gray-600">Vous n'avez pas trouvé votre réponse ?</p>
                                    <button
                                        onClick={() => setActiveTab('contact')}
                                        className="mt-2 text-[9px] font-bold text-amber-600 hover:text-amber-700 transition"
                                    >
                                        Contactez notre support →
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Contact */}
                    {activeTab === 'contact' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300"
                        >
                            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
                                <div className="p-2 rounded-xl bg-emerald-100">
                                    <MessageSquare size={18} className="text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800">Nous contacter</h3>
                                    <p className="text-[8px] text-gray-400 uppercase tracking-wider">Tous les moyens de contact</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ContactCardModern
                                    icon={Mail}
                                    title="Email"
                                    info="support@dispromalt.cd"
                                    secondary="Réponse sous 24h"
                                    action="Envoyer un email"
                                    color="emerald"
                                />
                                <ContactCardModern
                                    icon={Phone}
                                    title="Téléphone"
                                    info="+243 815 023 699"
                                    secondary="Lun-Ven, 8h-18h"
                                    action="Appeler maintenant"
                                    color="blue"
                                />
                                <ContactCardModern
                                    icon={MessageSquare}
                                    title="Chat en ligne"
                                    info="Disponible 24/7"
                                    secondary="Temps de réponse: ~2min"
                                    action="Ouvrir le chat"
                                    color="amber"
                                />
                                <ContactCardModern
                                    icon={Globe}
                                    title="Centre d'aide"
                                    info="docs.dispromalt.cd"
                                    secondary="Tutoriels vidéo"
                                    action="Accéder au centre"
                                    color="purple"
                                />
                            </div>
                            <div className="mt-5 p-5 bg-gray-50 rounded-xl border border-gray-200">
                                <h3 className="text-[11px] font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <MessageSquare size={14} className="text-emerald-500" />
                                    Envoyer un message
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                    <input type="text" placeholder="Votre nom" className="px-3 py-2.5 bg-white rounded-xl text-gray-700 text-[10px] outline-none focus:ring-2 ring-emerald-500 border border-gray-200" />
                                    <input type="email" placeholder="Votre email" className="px-3 py-2.5 bg-white rounded-xl text-gray-700 text-[10px] outline-none focus:ring-2 ring-emerald-500 border border-gray-200" />
                                </div>
                                <textarea rows={2} placeholder="Votre message..." className="w-full px-3 py-2.5 bg-white rounded-xl text-gray-700 text-[10px] outline-none focus:ring-2 ring-emerald-500 border border-gray-200 mb-3 resize-none" />
                                <button className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white text-[10px] font-bold uppercase hover:shadow-lg hover:shadow-emerald-500/30 transition hover:scale-[1.02]">
                                    Envoyer le message
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Updates */}
                    {activeTab === 'updates' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300"
                        >
                            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
                                <div className="p-2 rounded-xl bg-purple-100">
                                    <Zap size={18} className="text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800">Mises à jour</h3>
                                    <p className="text-[8px] text-gray-400 uppercase tracking-wider">Nouveautés et améliorations</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {updates.map((update, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="relative pl-5 pb-5 border-l-2 border-purple-300 last:pb-0 last:border-l-0"
                                    >
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 border-2 border-white shadow-md" />
                                        <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                            <span className="text-[12px] font-bold text-purple-600">{update.version}</span>
                                            <span className="text-[7px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{update.date}</span>
                                        </div>
                                        <ul className="space-y-1">
                                            {update.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-1.5">
                                                    <span className="text-[7px] text-emerald-500 mt-0.5">✓</span>
                                                    <span className="text-[9px] text-gray-600">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Ressources utiles */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                            <div className="p-2 rounded-xl bg-amber-100">
                                <Star size={18} className="text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-800">Ressources</h3>
                                <p className="text-[7px] text-gray-400 uppercase tracking-wider">Utiles et pratiques</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <ResourceItemModern
                                icon={Video}
                                title="Tutoriels vidéo"
                                description="Guides pas à pas"
                                badge="12 vidéos"
                                color="blue"
                            />
                            <ResourceItemModern
                                icon={FileText}
                                title="API Documentation"
                                description="Pour développeurs"
                                badge="Complet"
                                color="purple"
                            />
                            <ResourceItemModern
                                icon={Download}
                                title="Téléchargements"
                                description="Rapports et exports"
                                badge="PDF, Excel"
                                color="emerald"
                            />
                            <ResourceItemModern
                                icon={MessageSquare}
                                title="Communauté"
                                description="Forum d'entraide"
                                badge="Actif"
                                color="orange"
                            />
                        </div>
                    </div>

                    {/* Statut du système */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                            <div className="p-2 rounded-xl bg-blue-100">
                                <Activity size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-800">Statut système</h3>
                                <p className="text-[7px] text-gray-400 uppercase tracking-wider">État des services</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] text-gray-700">API</span>
                                </div>
                                <span className="text-[8px] text-emerald-600 font-medium">Opérationnel</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] text-gray-700">Base de données</span>
                                </div>
                                <span className="text-[8px] text-emerald-600 font-medium">Connectée</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                    <span className="text-[9px] text-gray-700">Serveur</span>
                                </div>
                                <span className="text-[8px] text-gray-500">Charge normale</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="flex justify-between text-[8px] text-gray-400 mb-1">
                                <span>Disponibilité</span>
                                <span className="text-emerald-600 font-bold">99.9%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="w-[99.9%] h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}// ============================================
// DOCCARD MODERN
// ============================================
function DocCardModern({ title, description, icon: Icon, color = "blue" }: any) {
    const colors = {
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', hover: 'hover:border-emerald-400' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', hover: 'hover:border-blue-400' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', hover: 'hover:border-amber-400' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', hover: 'hover:border-purple-400' },
        cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', hover: 'hover:border-cyan-400' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', hover: 'hover:border-orange-400' }
    };
    const c = colors[color as keyof typeof colors] || colors.blue;

    return (
        <motion.div whileHover={{ y: -3, scale: 1.02 }} className={`p-3 rounded-xl ${c.bg} border ${c.border} ${c.hover} transition-all duration-300 cursor-pointer group`}>
            <div className="flex items-start gap-2.5">
                <div className={`p-1.5 rounded-lg ${c.bg}`}>
                    <Icon size={14} className={c.text} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-[10px] font-bold text-gray-800 group-hover:text-amber-600 transition">{title}</h4>
                    <p className="text-[7px] text-gray-500 mt-0.5">{description}</p>
                </div>
                <ChevronRight size={12} className="text-gray-300 group-hover:text-amber-500 transition" />
            </div>
        </motion.div>
    );
}

// ============================================
// FAQITEM MODERN
// ============================================
function FaqItemModern({ question, answer }: any) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-100 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center py-3 text-left group"
            >
                <span className="text-[10px] font-medium text-gray-800 group-hover:text-amber-600 transition">{question}</span>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown size={14} className="text-gray-400 group-hover:text-amber-500 transition" />
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
                        <p className="text-[9px] text-gray-600 pb-3 leading-relaxed">{answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// CONTACTCARD MODERN
// ============================================
function ContactCardModern({ icon: Icon, title, info, secondary, action, color = "blue" }: any) {
    const colors = {
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', hover: 'hover:border-emerald-400' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', hover: 'hover:border-blue-400' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', hover: 'hover:border-amber-400' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', hover: 'hover:border-purple-400' }
    };
    const c = colors[color as keyof typeof colors] || colors.blue;

    return (
        <motion.div whileHover={{ y: -3, scale: 1.02 }} className={`p-4 rounded-xl ${c.bg} border ${c.border} ${c.hover} transition-all duration-300 text-center`}>
            <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center mx-auto mb-2 border ${c.border}`}>
                <Icon size={18} className={c.text} />
            </div>
            <h4 className="text-[10px] font-bold text-gray-800">{title}</h4>
            <p className="text-[9px] font-medium text-gray-700">{info}</p>
            <p className="text-[7px] text-gray-400 mt-0.5">{secondary}</p>
            <button className={`mt-2 text-[8px] font-bold ${c.text} hover:opacity-80 transition`}>
                {action} →
            </button>
        </motion.div>
    );
}

// ============================================
// RESOURCEITEM MODERN
// ============================================
function ResourceItemModern({ icon: Icon, title, description, badge, color = "blue" }: any) {
    const colors = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-600' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-600' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-600' }
    };
    const c = colors[color as keyof typeof colors] || colors.blue;

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-white transition border border-gray-100 hover:border-gray-300 cursor-pointer group">
            <div className={`p-2 rounded-lg ${c.bg}`}>
                <Icon size={14} className={c.text} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold text-gray-800 group-hover:text-amber-600 transition">{title}</p>
                    <span className={`text-[6px] px-2 py-0.5 rounded-full ${c.badge} font-bold`}>{badge}</span>
                </div>
                <p className="text-[8px] text-gray-500">{description}</p>
            </div>
        </div>
    );
}

// ============================================
// COMPOSANTS ADDITIONNELS
// ============================================

// Icônes supplémentaires
function Video({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m10 10 5 2-5 2V10z" /></svg>; }
function Download({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>; }
function Code({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>; }
function Star({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>; }
function Rocket({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M4.5 16.5c-1.5 1.26-2 3-2 5 0 0 2 0 5-2" /><path d="M12 2a9 9 0 0 0-9 9c0 2.5 1 5 3 7 0 0 2 1 5 1s5-1 5-1c2-2 3-4.5 3-7a9 9 0 0 0-9-9z" /><circle cx="12" cy="11" r="3" /></svg>; }
// ============================================
// COMPOSANTS RÉUTILISABLES
// ============================================


// 1. WHITECARD - Carte blanche avec titre
function WhiteCard({ children, title, icon: Icon, className = "", color = "blue" }: any) {
    const colorClasses = {
        blue: { border: 'border-blue-200', hover: 'hover:border-blue-400', icon: 'text-blue-800', bg: 'bg-blue-50' },
        amber: { border: 'border-amber-200', hover: 'hover:border-amber-400', icon: 'text-amber-600', bg: 'bg-amber-50' },
        emerald: { border: 'border-emerald-200', hover: 'hover:border-emerald-400', icon: 'text-emerald-600', bg: 'bg-emerald-50' },
        red: { border: 'border-red-200', hover: 'hover:border-red-400', icon: 'text-red-600', bg: 'bg-red-50' },
    };

    const classes = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

    return (
        <div className={`bg-white rounded-xl p-3 xs:p-4 sm:p-5 border ${classes.border} shadow-sm hover:shadow-md transition-all ${classes.hover} ${className}`}>
            <div className="flex items-center gap-2 mb-2 xs:mb-3 pb-2 border-b border-gray-100">
                {Icon && <Icon size={14} className={`xs:w-[16px] xs:h-[16px] sm:w-[18px] sm:h-[18px] ${classes.icon}`} />}
                <h3 className="text-[9px] xs:text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
            </div>
            {children}
        </div>
    );
}

// 2. STATBAR - Barre de progression
function StatBar({ label, value, total, color }: any) {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between text-[8px] xs:text-[9px] text-gray-600 mb-1">
                <span>{label}</span>
                <span>{value} ({Math.round(percentage)}%)</span>
            </div>
            <div className="w-full h-1.5 xs:h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
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