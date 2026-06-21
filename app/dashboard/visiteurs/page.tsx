'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LogOut, MapPin, Bell, Globe, Zap, ShieldCheck, Award,
    Target, Activity, LayoutGrid, BarChart3, TrendingUp,
    Search, Layers, ArrowRight, Filter, Download, Maximize2,
    Building2, Users, Calendar, Clock, CheckCircle2, AlertCircle,
    X, ChevronDown, ChevronUp, Home, Menu, HelpCircle, FileText,
    Loader2, UserCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================
// IMPORT CONFIGURATION
// ============================================
const config = require('../../../config/db');

// ============================================
// FIREBASE
// ============================================
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getFirestore, doc, updateDoc, onSnapshot,
    collection, query, where, getDocs
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = config.firebaseConfig;
const LOGO_URL = config.LOGO_DISPROMALT;
const GEOGRAPHIE = config.GEOGRAPHIE;

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// ============================================
// TYPES
// ============================================
interface Face {
    id?: string;
    sens?: string;
    statut?: string;
    clientNom?: string;
    agentNom?: string;
    dateDebut?: string;
    dateFin?: string;
    photoCampagneUrl?: string;
    reservations?: any[];
}

interface Panneau {
    id: string;
    idPan?: string;
    adresse?: string;
    type?: string;
    dimension?: string;
    faces?: Face[];
    coords?: [number, number];
    gps_raw?: { lat: number; lng: number };
    createdAt?: any;
    updatedAt?: any;
}

interface User {
    id?: string;
    nomSociete?: string;
    email?: string;
    role?: string;
    messageAdmin?: string;
    isOnline?: boolean;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export default function VisiteurDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [user, setUser] = useState<User | null>(null);
    const [mesFaces, setMesFaces] = useState<any[]>([]);
    const [panneaux, setPanneaux] = useState<Panneau[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const router = useRouter();

    // ============================================
    // AUTHENTIFICATION
    // ============================================
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push('/');
                return;
            }

            const session = localStorage.getItem('userSession');
            if (session) {
                const userData = JSON.parse(session);
                setUser(userData);
            } else {
                // Récupérer les données de l'utilisateur depuis Firestore
                const fetchUserData = async () => {
                    try {
                        const q = query(collection(db, "societes"), where("email", "==", currentUser.email));
                        const snapshot = await getDocs(q);
                        if (!snapshot.empty) {
                            const docData = snapshot.docs[0].data();
                            const userData = { id: snapshot.docs[0].id, ...docData };
                            setUser(userData);
                            localStorage.setItem('userSession', JSON.stringify(userData));
                        }
                    } catch (error) {
                        console.error("Erreur récupération utilisateur:", error);
                    }
                };
                fetchUserData();
            }
        });

        return () => unsubscribe();
    }, [router]);

    // ============================================
    // CHARGEMENT DES PANNEAUX
    // ============================================
    useEffect(() => {
        if (!user?.nomSociete) return;

        const q = query(collection(db, "panneaux"));

        const unsubPanneaux = onSnapshot(q, (snap) => {
            const allPanneaux: Panneau[] = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Panneau[];
            setPanneaux(allPanneaux);

            let tempFaces: any[] = [];
            allPanneaux.forEach((panneau: Panneau) => {
                if (panneau.faces && Array.isArray(panneau.faces)) {
                    const matched = panneau.faces.filter((f: Face) =>
                        f.clientNom?.toLowerCase().trim() === user.nomSociete?.toLowerCase().trim()
                    );
                    matched.forEach((f: Face) => {
                        tempFaces.push({
                            ...f,
                            parentAdresse: panneau.adresse,
                            parentIdPan: panneau.idPan,
                            panneauId: panneau.id,
                            parentType: panneau.type,
                            parentDimension: panneau.dimension
                        });
                    });
                }
            });
            setMesFaces(tempFaces);
            setLoading(false);
        });

        return () => unsubPanneaux();
    }, [user?.nomSociete]);

    // ============================================
    // NOTIFICATIONS
    // ============================================
    useEffect(() => {
        if (!user?.nomSociete) return;

        const targetClient = user.nomSociete.toLowerCase().trim();
        const q = query(
            collection(db, "messages_clients"),
            where("destinataire", "==", targetClient)
        );

        const unsub = onSnapshot(q, (snap) => {
            const rawDocs = snap.docs.map(docSnap => {
                const data = docSnap.data();
                let dateStr = "À l'instant";
                let timeVal = Date.now();

                if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                    const d = data.createdAt.toDate();
                    dateStr = d.toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    timeVal = data.createdAt.toMillis();
                }

                return {
                    id: docSnap.id,
                    ...data,
                    dateFormatee: dateStr,
                    timeValue: timeVal
                };
            });

            const sorted = rawDocs.sort((a, b) => b.timeValue - a.timeValue);
            setNotifications(sorted);
        });

        return () => unsub();
    }, [user?.nomSociete]);

    // ============================================
    // STATUT EN LIGNE
    // ============================================
    useEffect(() => {
        if (!user?.id) return;

        const userDocRef = doc(db, "societes", user.id);

        const updateOnlineStatus = async (status: boolean) => {
            try {
                await updateDoc(userDocRef, {
                    isOnline: status,
                    derniereConnexion: new Date().toISOString()
                });
            } catch (e) {
                console.error("Erreur update status:", e);
            }
        };

        updateOnlineStatus(true);

        const handleOnline = () => {
            setIsOnline(true);
            updateOnlineStatus(true);
        };
        const handleOffline = () => {
            setIsOnline(false);
            updateOnlineStatus(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            updateOnlineStatus(false);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [user?.id]);

    // ============================================
    // DÉCONNEXION
    // ============================================
    const handleLogout = async () => {
        try {
            localStorage.removeItem('userSession');
            sessionStorage.clear();
            router.push('/');
        } catch (error) {
            console.error("Erreur déconnexion:", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={32} className="text-blue-600 animate-spin mx-auto mb-3" />
                    <p className="text-blue-600 text-xs font-bold uppercase tracking-wider">Chargement...</p>
                </div>
            </div>
        );
    }

    // ============================================
    // RENDU PRINCIPAL
    // ============================================
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* ============================================ */}
            {/* SIDEBAR */}
            {/* ============================================ */}
            <aside className="w-full h-16 md:h-screen md:w-20 bg-gradient-to-b from-blue-800 to-blue-900 border-b md:border-b-0 md:border-r border-blue-700/50 flex flex-row md:flex-col items-center justify-between md:justify-start px-4 md:px-0 md:py-6 z-50">
                <div className="hidden md:flex mb-8">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                        <ShieldCheck className="text-blue-700" size={26} />
                    </div>
                </div>

                <nav className="flex flex-row md:flex-col items-center gap-4 md:gap-6">
                    {[
                        { id: 'overview', icon: LayoutGrid, label: 'Tableau' },
                        { id: 'analytics', icon: BarChart3, label: 'Stats' },
                        { id: 'inventory', icon: Layers, label: 'Faces' },
                        { id: 'map', icon: Globe, label: 'Carte' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-xl md:rounded-2xl transition-all ${activeTab === item.id
                                ? 'bg-white text-blue-700 shadow-lg shadow-blue-500/30 scale-110'
                                : 'text-white/50 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <item.icon size={20} className="md:w-[22px] md:h-[22px]" />
                        </button>
                    ))}
                </nav>

                <div className="flex flex-row md:flex-col items-center gap-3 md:gap-6">
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`text-[6px] font-bold uppercase tracking-tighter ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 flex items-center justify-center"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* ============================================ */}
            {/* CONTENU PRINCIPAL */}
            {/* ============================================ */}
            <div className="flex-1 flex flex-col overflow-y-auto h-screen">
                {/* HEADER */}
                <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[10px] md:text-sm font-bold uppercase tracking-[0.3em] text-blue-700 italic truncate">
                            {activeTab === 'overview' ? 'Tableau de bord' :
                                activeTab === 'analytics' ? 'Statistiques' :
                                    activeTab === 'inventory' ? 'Mes faces' :
                                        'Carte'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <p className="text-[9px] font-bold text-blue-700 truncate max-w-[100px]">
                                {user?.nomSociete || 'Client'}
                            </p>
                        </div>

                        {/* NOTIFICATIONS */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`w-9 h-9 rounded-lg border transition-all flex items-center justify-center ${showNotifications ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-blue-600 hover:bg-blue-50'
                                    }`}
                            >
                                <Bell size={16} />
                                {notifications.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-[6px] rounded-full flex items-center justify-center font-bold">
                                        {notifications.length}
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                                        >
                                            <div className="p-4 border-b border-gray-100 bg-blue-50 flex justify-between items-center">
                                                <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Notifications</h4>
                                                <span className="text-[8px] text-gray-400 font-bold">{notifications.length} message(s)</span>
                                            </div>

                                            <div className="max-h-[400px] overflow-y-auto">
                                                {notifications.length === 0 ? (
                                                    <div className="p-8 text-center">
                                                        <Bell size={32} className="text-gray-300 mx-auto mb-2" />
                                                        <p className="text-gray-400 text-sm">Aucune notification</p>
                                                    </div>
                                                ) : (
                                                    notifications.map((notif) => {
                                                        const isExpanded = expandedId === notif.id;
                                                        return (
                                                            <div
                                                                key={notif.id}
                                                                className={`border-b border-gray-100 transition-all ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                                            >
                                                                <div
                                                                    className="p-4 cursor-pointer flex gap-3"
                                                                    onClick={() => setExpandedId(isExpanded ? null : notif.id)}
                                                                >
                                                                    <div className="mt-1 shrink-0">
                                                                        {notif.type === "ALERTE_CLIENT" ? (
                                                                            <AlertCircle size={14} className="text-red-500" />
                                                                        ) : (
                                                                            <Bell size={14} className="text-blue-500" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between items-start mb-1">
                                                                            <p className={`text-[11px] font-bold uppercase leading-tight truncate ${isExpanded ? 'text-blue-700' : 'text-gray-800'}`}>
                                                                                {notif.libelle || "Alerte Système"}
                                                                            </p>
                                                                            <span className="text-[7px] text-gray-400 font-bold ml-2 shrink-0">
                                                                                {notif.dateFormatee}
                                                                            </span>
                                                                        </div>
                                                                        {!isExpanded && (
                                                                            <p className="text-[10px] text-gray-500 italic truncate">
                                                                                {notif.messageComplet}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <AnimatePresence>
                                                                    {isExpanded && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            className="overflow-hidden"
                                                                        >
                                                                            <div className="px-4 pb-4 ml-7 border-l-2 border-blue-300">
                                                                                <p className="text-[10px] text-gray-700 leading-relaxed">
                                                                                    {notif.messageComplet}
                                                                                </p>
                                                                                {notif.idFace && (
                                                                                    <span className="mt-2 inline-block text-[7px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">
                                                                                        Face: {notif.idFace}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            <button
                                                onClick={() => setShowNotifications(false)}
                                                className="w-full py-3 bg-gray-50 text-gray-500 text-[9px] font-bold uppercase hover:bg-gray-100 transition-colors"
                                            >
                                                Fermer
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                {/* CONTENU */}
                <main className="flex-1 p-4 md:p-8">
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && <OverviewSection mesFaces={mesFaces} user={user} key="overview" />}
                        {activeTab === 'analytics' && <AnalyticsSection mesFaces={mesFaces} user={user} panneaux={panneaux} key="analytics" />}
                        {activeTab === 'inventory' && <InventorySection mesFaces={mesFaces} user={user} key="inventory" />}
                        {activeTab === 'map' && <MapSection userConnecte={user} panneaux={panneaux} key="map" />}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

// ============================================
// COMPOSANTS DES SECTIONS
// ============================================

function OverviewSection({ mesFaces, user }: any) {
    const totalVues = mesFaces.length * 450;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-1 h-10 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
                    <p className="text-[8px] text-gray-400 uppercase tracking-wider">Vue d'ensemble</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Faces actives', value: mesFaces.length, icon: LayoutGrid, color: 'blue' },
                    { label: 'Portée estimée', value: `${totalVues}K`, icon: TrendingUp, color: 'emerald' },
                    { label: 'Localisation', value: 'KINSHASA', icon: MapPin, color: 'blue' },
                    { label: 'Performance', value: '+12.5%', icon: Award, color: 'amber' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm hover:shadow-md transition">
                        <div className="flex items-center gap-2 mb-1">
                            <stat.icon size={16} className={`text-${stat.color}-600`} />
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                        </div>
                        <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {user?.messageAdmin && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                            <MessageSquare size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[8px] font-bold text-blue-600 uppercase tracking-wider">Message de la direction</p>
                            <p className="text-sm text-gray-700">"{user.messageAdmin}"</p>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

function AnalyticsSection({ mesFaces, user, panneaux }: any) {
    const totalImpact = (mesFaces?.length || 0) * 450;
    const [filtreSociete, setFiltreSociete] = useState('Tous');

    const societesList = useMemo(() => {
        const societes = new Set<string>();
        panneaux?.forEach((p: any) => {
            p.faces?.forEach((f: any) => {
                if (f.clientNom) societes.add(f.clientNom);
            });
        });
        return ['Tous', ...Array.from(societes)];
    }, [panneaux]);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-1 h-10 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Statistiques</h1>
                        <p className="text-[8px] text-gray-400 uppercase tracking-wider">Analyses détaillées</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Filter size={14} className="text-gray-400" />
                    <select
                        className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                        value={filtreSociete}
                        onChange={(e) => setFiltreSociete(e.target.value)}
                    >
                        {societesList.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Visibilité', value: '84%', trend: '+5.2%', color: 'blue' },
                    { label: 'Impact Global', value: `${totalImpact}K`, trend: 'Live', color: 'emerald' },
                    { label: 'Maintenance', value: '100%', trend: 'OK', color: 'gray' },
                    { label: 'Score ROI', value: 'x3.2', trend: '+0.4', color: 'amber' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                        <p className="text-[7px] text-emerald-500">{stat.trend}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Flux d'audience</p>
                        <p className="text-[8px] text-gray-400">Données basées sur {mesFaces?.length || 0} emplacements</p>
                    </div>
                    <div className="flex gap-1.5">
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 6 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                </div>
                <div className="flex items-end justify-between gap-1 h-48">
                    {[40, 70, 45, 90, 65, 80, 50, 85, 60, 75, 95, 40].map((h, i) => (
                        <div key={i} className="flex-1 group relative h-full flex flex-col justify-end">
                            <div className="w-full bg-gradient-to-t from-blue-200 to-blue-500 rounded-t opacity-60 hover:opacity-100 transition-all duration-300 cursor-help"
                                style={{ height: `${h}%` }} />
                            <p className="text-[6px] font-bold text-gray-400 mt-2 text-center">{i === 11 ? 'Now' : `0${i + 1}`}</p>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

function InventorySection({ mesFaces }: any) {
    const [searchTerm, setSearchTerm] = useState('');

    const facesFiltrees = useMemo(() => {
        if (!searchTerm) return mesFaces || [];
        return (mesFaces || []).filter((f: any) =>
            f.parentAdresse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.parentIdPan?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [mesFaces, searchTerm]);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-1 h-10 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Mes faces</h1>
                        <p className="text-[8px] text-gray-400 uppercase tracking-wider">
                            {mesFaces.length} emplacement(s) stratégique(s)
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        className="pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 w-48 md:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {facesFiltrees.length === 0 ? (
                    <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-blue-200">
                        <Layers size={48} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-medium">Aucune face trouvée</p>
                    </div>
                ) : (
                    facesFiltrees.map((face: any, i: number) => (
                        <div key={i} className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm hover:shadow-md transition">
                            <div className="flex items-start gap-4">
                                <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                                    <img
                                        src={face.photoCampagneUrl || 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0'}
                                        className="w-full h-full object-cover"
                                        alt="Face"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-blue-700 truncate">
                                            {face.parentIdPan || 'Panneau'}
                                        </h3>
                                        <span className="text-[7px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                            Face {face.id || i + 1}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-gray-600 flex items-center gap-1 mt-0.5">
                                        <MapPin size={10} className="text-amber-400" />
                                        {face.parentAdresse || 'Adresse non définie'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span className={`text-[7px] font-bold px-2 py-0.5 rounded-full ${face.statut === 'Libre' ? 'bg-emerald-100 text-emerald-700' :
                                            face.statut === 'Occupé' ? 'bg-blue-100 text-blue-700' :
                                                face.statut === 'Réservé' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-gray-100 text-gray-600'
                                            }`}>
                                            {face.statut || 'N/A'}
                                        </span>
                                        {face.dateFin && (
                                            <span className="text-[7px] text-gray-400">
                                                Échéance: {new Date(face.dateFin).toLocaleDateString('fr-FR')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
}

function MapSection({ userConnecte, panneaux }: any) {
    const [MapLib, setMapLib] = useState<any>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [mapMode, setMapMode] = useState<'light' | 'dark' | 'satellite'>('light');

    const tileUrls = {
        dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    };

    const mesPointsGeo = useMemo(() => {
        const nomSocieteUser = userConnecte?.nomSociete?.toString().toLowerCase().trim();
        if (!nomSocieteUser) return [];

        return (panneaux || [])
            .filter((pan: any) => {
                return pan.faces?.some((face: any) =>
                    face.clientNom?.toString().toLowerCase().trim() === nomSocieteUser
                );
            })
            .map((pan: any) => {
                const lat = parseFloat(pan.coords?.[0] || pan.gps_raw?.lat);
                const lng = parseFloat(pan.coords?.[1] || pan.gps_raw?.lng);
                if (isNaN(lat) || isNaN(lng)) return null;
                return { ...pan, lat, lng };
            })
            .filter((p: any) => p !== null);
    }, [panneaux, userConnecte]);

    useEffect(() => {
        setIsMounted(true);
        const loadLeaflet = async () => {
            try {
                const [L, ReactLeaflet] = await Promise.all([
                    import('leaflet').then(m => m.default || m),
                    import('react-leaflet')
                ]);
                delete (L.Icon.Default.prototype as any)._getIconUrl;
                const RadarIcon = L.divIcon({
                    className: 'custom-radar-icon',
                    html: `<div class="flex items-center justify-center">
                             <div class="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping"></div>
                             <div class="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
                           </div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                });
                L.Marker.prototype.options.icon = RadarIcon;
                setMapLib({ ...ReactLeaflet, L });
            } catch (e) { console.error(e); }
        };
        loadLeaflet();
    }, []);

    if (!isMounted || !MapLib) {
        return (
            <div className="h-[60vh] bg-gray-100 rounded-xl flex flex-col items-center justify-center border border-gray-200">
                <Loader2 size={32} className="text-blue-600 animate-spin mb-4" />
                <p className="text-sm text-gray-400 font-medium">Chargement de la carte...</p>
            </div>
        );
    }

    const { MapContainer, TileLayer, Marker, Popup, useMap } = MapLib;

    function RecenterHelper({ points }: { points: any[] }) {
        const map = useMap();
        useEffect(() => {
            if (points.length > 0) {
                const bounds = MapLib.L.latLngBounds(points.map((p: any) => [p.lat, p.lng]));
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
            }
        }, [points, map]);
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="w-1 h-10 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Carte des panneaux</h1>
                    <p className="text-[8px] text-gray-400 uppercase tracking-wider">
                        {mesPointsGeo.length} panneau(x) détecté(s)
                    </p>
                </div>
            </div>

            <div className="h-[60vh] rounded-xl overflow-hidden border border-gray-200 shadow-sm relative bg-white">
                <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                    {[
                        { id: 'light', label: 'Clair' },
                        { id: 'dark', label: 'Sombre' },
                        { id: 'satellite', label: 'Satellite' }
                    ].map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => setMapMode(mode.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all border shadow-sm ${mapMode === mode.id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>

                <MapContainer center={[-4.32, 15.30]} zoom={12} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                    <TileLayer url={tileUrls[mapMode]} />
                    <RecenterHelper points={mesPointsGeo} />

                    {mesPointsGeo.map((pt: any) => (
                        <Marker key={pt.id} position={[pt.lat, pt.lng]}>
                            <Popup minWidth={200}>
                                <div className="p-2">
                                    <div className="flex items-center gap-2 mb-2 border-b border-gray-200 pb-2">
                                        <MapPin size={12} className="text-blue-600" />
                                        <span className="text-xs font-bold text-gray-800">{pt.idPan || 'Panneau'}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-600 mb-2">{pt.adresse}</p>
                                    {pt.faces?.filter((f: any) =>
                                        f.clientNom?.toLowerCase().trim() === userConnecte?.nomSociete?.toLowerCase().trim()
                                    ).map((face: any, idx: number) => (
                                        <div key={idx} className="bg-blue-50 p-2 rounded-lg border border-blue-200 flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-blue-700">Face {face.id || idx + 1}</span>
                                            <span className="text-[8px] font-bold text-emerald-600">ACTIVE</span>
                                        </div>
                                    ))}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}

// ============================================
// COMPOSANT ICÔNE
// ============================================
function MessageSquare({ size, className }: any) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>;
}