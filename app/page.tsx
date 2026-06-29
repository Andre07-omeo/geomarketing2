"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, ShieldCheck, Loader2, Zap, Eye, EyeOff,
  Building2, Users, MapPin, Globe
} from 'lucide-react';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';

// ============================================
// CONFIGURATION
// ============================================
const config = require('../config/db');
const { firebaseConfig, LOGO_DISPROMALT } = config;

// ============================================
// INITIALISATION FIREBASE
// ============================================
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ============================================
// 📦 TYPES ET INTERFACES
// ============================================

interface UserData {
  uid?: string;
  email?: string;
  nom?: string;
  role?: string;
  actif?: boolean;
  sessionToken?: string;
  lastSync?: string;
  isLocallyStored?: boolean;
  lastActivity?: string;
  lastUpdate?: string;
  [key: string]: any;
}

interface HistoryEntry {
  id: number;
  timestamp: string;
  type: 'LOGIN' | 'LOGOUT' | 'UPDATE' | 'DELETE' | 'ERROR' | 'ACCESS';
  description: string;
  userEmail: string;
  deviceInfo: DeviceInfo;
}

interface DeviceInfo {
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  language: string;
}

// ============================================
// 📦 SYSTÈME DE STOCKAGE LOCAL ET TRACABILITÉ
// ============================================

/**
 * Classe de gestion du stockage local et de la traçabilité
 * Garantit la persistance des données et l'historique des opérations
 */
class LocalStorageManager {
  private static readonly STORAGE_KEY = 'geomarketing_user_data';
  private static readonly HISTORY_KEY = 'geomarketing_operations_history';
  private static readonly MAX_HISTORY = 100;

  /**
   * Sauvegarde les données utilisateur localement
   */
  static saveUserData(userData: UserData, sessionToken?: string): boolean {
    try {
      const dataToStore: UserData = {
        ...userData,
        id: userData.id || userData.uid, // ✅ ID du document Firestore
        uid: userData.uid,
        sessionToken: sessionToken || this.generateSessionToken(),
        lastSync: new Date().toISOString(),
        isLocallyStored: true,
        lastActivity: new Date().toISOString()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToStore));

      this.addToHistory('LOGIN', 'Connexion réussie', userData.email || 'unknown');

      console.log('✅ Données utilisateur sauvegardées localement');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde locale:', error);
      return false;
    }
  }

  /**
   * Récupère les données utilisateur du stockage local
   */
  static getUserData(): UserData | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        console.log('📥 Données récupérées localement');
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération locale:', error);
      return null;
    }
  }

  /**
   * Met à jour les données utilisateur dans le stockage local
   */
  static updateUserData(updates: Partial<UserData>): boolean {
    try {
      const currentData = this.getUserData();
      if (currentData) {
        const updatedData: UserData = {
          ...currentData,
          ...updates,
          lastUpdate: new Date().toISOString()
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData));

        this.addToHistory('UPDATE', 'Mise à jour des données', currentData.email || 'unknown');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour locale:', error);
      return false;
    }
  }

  /**
   * Supprime les données utilisateur du stockage local
   */
  static clearUserData(): boolean {
    try {
      const userData = this.getUserData();
      if (userData) {
        this.addToHistory('LOGOUT', 'Déconnexion', userData.email || 'unknown');
      }
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Données utilisateur supprimées');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression locale:', error);
      return false;
    }
  }

  /**
   * Génère un token de session unique
   */
  private static generateSessionToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Ajoute une opération à l'historique des transactions
   */
  private static addToHistory(
    type: HistoryEntry['type'],
    description: string,
    userEmail: string
  ): void {
    try {
      let history = this.getHistory();

      const entry: HistoryEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: type,
        description: description,
        userEmail: userEmail || 'unknown',
        deviceInfo: this.getDeviceInfo()
      };

      history.unshift(entry);

      if (history.length > this.MAX_HISTORY) {
        history = history.slice(0, this.MAX_HISTORY);
      }

      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
      console.log(`📝 Historique mis à jour: ${type} - ${description}`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout à l\'historique:', error);
    }
  }

  /**
   * Récupère l'historique des opérations
   */
  static getHistory(): HistoryEntry[] {
    try {
      const history = localStorage.getItem(this.HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'historique:', error);
      return [];
    }
  }

  /**
   * Efface l'historique des opérations
   */
  static clearHistory(): boolean {
    try {
      localStorage.removeItem(this.HISTORY_KEY);
      console.log('🗑️ Historique effacé');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'effacement de l\'historique:', error);
      return false;
    }
  }

  /**
   * Récupère les informations de l'appareil
   */
  private static getDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent || 'unknown',
      platform: navigator.platform || 'unknown',
      screenWidth: window.screen?.width || 0,
      screenHeight: window.screen?.height || 0,
      language: navigator.language || 'unknown'
    };
  }

  /**
   * Vérifie la validité des données locales
   */
  static validateLocalData(): boolean {
    try {
      const data = this.getUserData();
      if (!data) return false;

      if (!data.lastSync) return false;

      const lastSync = new Date(data.lastSync);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        console.warn('⚠️ Données locales trop anciennes (> 24h)');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la validation des données:', error);
      return false;
    }
  }

  /**
   * Exporte l'historique au format CSV
   */
  static exportHistoryToCSV(): string {
    const history = this.getHistory();
    if (history.length === 0) return '';

    const headers = ['Date', 'Type', 'Description', 'Email'];
    const rows = history.map((entry: HistoryEntry) => [
      new Date(entry.timestamp).toLocaleString(),
      entry.type,
      entry.description,
      entry.userEmail
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Télécharge l'historique en tant que fichier CSV
   */
  static downloadHistoryAsCSV(): void {
    const csv = this.exportHistoryToCSV();
    if (!csv) {
      console.warn('Aucun historique à exporter');
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historique_operations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /**
   * Récupère les statistiques d'utilisation
   */
  static getStatistics(): {
    totalOperations: number;
    lastLogin: string | null;
    totalLogins: number;
    lastActivity: string | null;
  } {
    const history = this.getHistory();
    const userData = this.getUserData();

    const logins = history.filter((entry: HistoryEntry) => entry.type === 'LOGIN');

    return {
      totalOperations: history.length,
      lastLogin: logins.length > 0 ? logins[0].timestamp : null,
      totalLogins: logins.length,
      lastActivity: userData?.lastActivity || null
    };
  }
}

// ============================================
// COMPOSANT PRINCIPAL - PAGE DE LOGIN UNIQUEMENT
// ============================================
export default function LoginPage() {
  const router = useRouter();

  // États
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Vérifier la connexion réseau
  useEffect(() => {
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ✅ Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsCheckingAuth(true);

      if (user) {
        try {
          const docSnap = await getDoc(doc(db, "societes", user.uid));

          if (docSnap.exists()) {
            const userData = docSnap.data();

            if (userData.actif === true) {
              // Mettre à jour le statut en ligne
              await updateDoc(doc(db, "societes", user.uid), {
                isOnline: true,
                lastLogin: serverTimestamp()
              });

              // 📦 Sauvegarder localement les données utilisateur
              LocalStorageManager.saveUserData({
                ...userData,
                uid: user.uid
              });

              // Rediriger vers le dashboard
              const routes: Record<string, string> = {
                visiteur: '/dashboard/visiteurs',
                admin: '/dashboard/admin',
                superviseurs: '/dashboard/components',
                commercial: '/dashboard/superviseurs',
                comptable: '/dashboard/Comptable',
                client: '/dashboard/visiteurs'
              };

              const targetRoute = routes[userData.role?.toLowerCase()];
              if (targetRoute) {
                router.push(targetRoute);
              } else {
                router.push('/dashboard/visiteurs');
              }
            } else {
              await signOut(auth);
              LocalStorageManager.clearUserData();
              setError("Votre compte a été désactivé. Contactez l'administrateur.");
            }
          } else {
            await signOut(auth);
            LocalStorageManager.clearUserData();
          }
        } catch (error) {
          console.error("Erreur:", error);
        }
      } else {
        // Vérifier si des données locales existent
        const localData = LocalStorageManager.getUserData();
        if (localData && LocalStorageManager.validateLocalData()) {
          console.log('📱 Données locales trouvées pour:', localData.email);
        }
      }
      setIsCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // ============================================
  // HANDLE LOGIN - VERSION AVEC NOM DANS LA NOTIFICATION
  // ============================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("Veuillez remplir tous les champs.");
      setLoading(false);
      return;
    }

    if (attempts >= 5) {
      setError("Trop de tentatives. Veuillez réessayer dans 5 minutes.");
      setLoading(false);
      return;
    }

    try {
      let userData: any = null;
      let userId: string = "";

      // 🔍 LOG DÉBUT DE LA CONNEXION
      console.log('🔐 Tentative de connexion pour:', cleanEmail);

      // ÉTAPE 1 : Connexion Firebase Auth
      try {
        console.log('📡 Tentative de connexion avec Firebase Auth...');
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        userId = userCredential.user.uid;
        console.log('✅ Firebase Auth réussi - UID:', userId);

        const docSnap = await getDoc(doc(db, "societes", userId));
        if (docSnap.exists()) {
          userData = docSnap.data();
          console.log('✅ Données récupérées depuis Firestore (collection societes)');
        } else {
          console.warn('⚠️ Document Firestore non trouvé pour l\'UID:', userId);
        }
      } catch (authError: any) {
        console.warn('⚠️ Firebase Auth a échoué, tentative de recherche manuelle...', authError.message);

        // ÉTAPE 2 : Recherche manuelle
        const q = query(
          collection(db, "societes"),
          where("email", "==", cleanEmail),
          limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const resDoc = querySnapshot.docs[0];
          const data = resDoc.data();

          if (data.password === cleanPassword) {
            userId = resDoc.id;
            userData = data;
            console.log('✅ Recherche manuelle réussie - Utilisateur trouvé dans societes');
          } else {
            console.warn('❌ Mot de passe incorrect (recherche manuelle)');
            throw new Error("Mot de passe incorrect.");
          }
        } else {
          console.warn('❌ Utilisateur introuvable (recherche manuelle)');
          throw new Error("Utilisateur introuvable.");
        }
      }

      if (!userData) {
        console.error('❌ Aucune donnée utilisateur trouvée');
        throw new Error("Identifiants incorrects.");
      }

      console.log('📋 Données utilisateur brutes:', userData);

      if (userData.actif !== true) {
        console.warn('⚠️ Compte inactif pour:', cleanEmail);
        if (auth.currentUser) await signOut(auth);
        throw new Error("Compte non activé. Contactez l'administrateur.");
      }

      // 📦 Sauvegarde locale des données utilisateur avec token
      console.log('💾 Sauvegarde des données en local...');
      const userDataToSave = {
        ...userData,
        uid: userId,
        id: userId,           // ✅ ID du document Firestore
        nom: userData.nom || userData.name || userData.prenom || 'Utilisateur',
        role: userData.role || 'visiteur',
        email: cleanEmail,
        lastLogin: new Date().toISOString()
      };

      const saved = LocalStorageManager.saveUserData(userDataToSave);
      console.log('✅ Sauvegarde locale:', saved ? 'Réussie' : 'Échouée');


      // 🔍 VÉRIFICATION IMMÉDIATE - Lire ce qui vient d'être sauvegardé
      const verifySaved = LocalStorageManager.getUserData();
      console.log('🔍 Vérification après sauvegarde:', verifySaved);






      // Après la sauvegarde, vérifiez que l'ID est bien présent
      //const verifySaved = LocalStorageManager.getUserData();
      console.log('🔍 Vérification après sauvegarde - ID:', verifySaved?.id);
      console.log('🔍 Vérification après sauvegarde - uid:', verifySaved?.uid);
      console.log('🔍 Vérification après sauvegarde - email:', verifySaved?.email);

      // Vérifier le localStorage directement
      const rawStorage = localStorage.getItem('geomarketing_user_data');
      console.log('📦 Raw localStorage:', rawStorage);

      // ÉTAPE 3 : Routes
      const routes: Record<string, string> = {
        visiteur: '/dashboard/visiteurs',
        admin: '/dashboard/admin',
        superviseurs: '/dashboard/components',
        commercial: '/dashboard/superviseurs/rapport',
        comptable: '/dashboard/Comptable',
        client: '/dashboard/visiteurs'
      };

      const targetRoute = routes[userData.role?.toLowerCase()];
      console.log('🎯 Route cible:', targetRoute);
      console.log('🎭 Rôle utilisateur:', userData.role);

      if (targetRoute) {
        // Mise à jour du statut en ligne
        console.log('🔄 Mise à jour du statut en ligne...');
        await updateDoc(doc(db, "societes", userId), {
          isOnline: true,
          lastLogin: serverTimestamp()
        });
        console.log('✅ Statut en ligne mis à jour');


        // Récupérer le nom de l'utilisateur (avec fallback)
        const userName = userData.nom || userData.name || userData.prenom || 'Utilisateur';
        const userRole = userData.role || 'visiteur';
        const userEmail = userData.email || cleanEmail;

        // Créer la notification
        const notification = document.createElement('div');
        notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
        animation: slideIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        max-width: 400px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
      `;

        // Contenu de la notification avec le nom
        notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
          ">
            👋
          </div>
          <div>
            <div style="font-size: 16px; font-weight: 700;">
              Bienvenue ${userName} !
            </div>
            <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">
              ✅ Connexion réussie en tant que <strong>${userRole}</strong>
            </div>
            <div style="font-size: 10px; opacity: 0.7; margin-top: 2px;">
              ${userEmail}
            </div>
          </div>
        </div>
        <div style="
          margin-top: 8px;
          height: 3px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          overflow: hidden;
        ">
          <div style="
            height: 100%;
            width: 100%;
            background: white;
            animation: progressBar 3s linear forwards;
            border-radius: 4px;
          "></div>
        </div>
      `;

        document.body.appendChild(notification);

        // Ajouter l'animation de la barre de progression
        const style = document.createElement('style');
        style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%) scale(0.8);
            opacity: 0;
          }
          to {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes progressBar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `;
        document.head.appendChild(style);

        // Supprimer la notification après 4 secondes
        setTimeout(() => {
          notification.style.transition = 'all 0.5s ease-out';
          notification.style.transform = 'translateX(120%) scale(0.8)';
          notification.style.opacity = '0';
          setTimeout(() => {
            notification.remove();
            style.remove();
          }, 500);
        }, 4000);

        setAttempts(0);

        // ⏰ Petite pause pour voir les logs avant la redirection
        console.log('⏳ Redirection dans 1 seconde...');
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('🚀 Redirection vers:', targetRoute);
        router.push(targetRoute);
      } else {
        console.error('❌ Rôle non reconnu:', userData.role);
        throw new Error(`Rôle "${userData.role}" non reconnu.`);
      }

    } catch (err: any) {
      console.error("❌ Erreur de connexion:", err);

      setAttempts(prev => prev + 1);

      let errorMessage = "Erreur de connexion.";

      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMessage = "Email ou mot de passe incorrect.";
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = "Trop de tentatives. Réessayez plus tard.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDU - PAGE DE LOGIN
  // ============================================
  return (
    <div className="min-h-screen relative overflow-hidden bg-white">

      {/* ===== BACKGROUND ===== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-50/60 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-50/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-50/30 rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200/50 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200/50 to-transparent" />
      </div>

      {/* ===== CONTENU ===== */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden">

            {/* ===== HEADER ===== */}
            <div className="px-8 pt-10 pb-6 text-center border-b border-gray-100">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex justify-center mb-5"
              >
                <div className="relative">
                  <img
                    src={LOGO_DISPROMALT || 'icon-512x512.png'}
                    alt="Logo"
                    className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-blue-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/icon-512x512.png';
                    }}
                  />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full animate-ping opacity-75" />
                </div>
              </motion.div>

              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Geomarketing
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1">
                Accédez à votre espace sécurisé
              </p>

              <div className="flex items-center justify-center gap-2 mt-3">
                <MapPin size={12} className="text-blue-500" />
                <span className="text-[10px] text-gray-400 font-medium">
                  Kinshasa • RDC
                </span>
                <Globe size={12} className="text-blue-500" />
              </div>
            </div>

            {/* ===== FORMULAIRE ===== */}
            <form onSubmit={handleLogin} className="p-8 space-y-5">

              {!isConnected && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-red-600 font-medium">
                    Pas de connexion internet
                  </span>
                </div>
              )}

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-red-50 border border-red-200 rounded-xl"
                  >
                    <p className="text-xs text-red-600 font-medium text-center">
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>



              {/* ===== EMAIL ===== */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Adresse email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-50"
                    placeholder="exemple@dispromalt.cd"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* ===== PASSWORD ===== */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Mot de passe
                </label>
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-12 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-50"
                    placeholder="••••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* ===== BOUTON ===== */}
              <button
                type="submit"
                disabled={loading || !isConnected}
                className="relative w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 rounded-xl text-sm tracking-wide shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} className="group-hover:rotate-12 transition-transform" />
                    <span>Se connecter</span>
                  </>
                )}
              </button>

              {attempts > 0 && attempts < 5 && (
                <div className="flex justify-center">
                  <span className="text-[10px] text-gray-400 font-medium">
                    Tentative {attempts}/5
                  </span>
                </div>
              )}
              {/* ===== PIED ===== */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">
                    {isConnected ? 'En ligne' : 'Hors ligne'}
                  </span>
                </div>
                <div className="w-px h-4 bg-gray-200" />
                <span className="text-[9px] text-gray-400 font-medium">
                  v2.0
                </span>
                <div className="w-px h-4 bg-gray-200" />
                <span className="text-[9px] text-gray-400 font-medium">
                  🔒 SSL
                </span>
              </div>
            </form>
          </div>
          {/* ===== MESSAGE ===== */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400 font-medium">
              Système de gestion géomarketing sécurisé
            </p>
            <div className="flex justify-center gap-6 mt-2">
              <span className="text-[8px] text-gray-300 uppercase tracking-wider">
                🔒 Chiffrement SSL
              </span>
              <span className="text-[8px] text-gray-300 uppercase tracking-wider">
                🛡️ Protection anti-intrusion
              </span>
              <span className="text-[8px] text-gray-300 uppercase tracking-wider">
                ⚡ Performance
              </span>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}