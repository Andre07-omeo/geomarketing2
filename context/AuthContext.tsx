"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Importer la configuration
const config = require('@/config/db');
const firebaseConfig = config.firebaseConfig;

// Initialiser Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Type pour l'utilisateur
interface UserData {
  uid: string;
  id?: string;
  email: string | null;
  displayName: string | null;
  nomComplet?: string;
  nom?: string;
  role?: string;
  photoURL?: string | null;
}

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fonction pour récupérer l'ID du document utilisateur
  const fetchUserDocId = async (email: string): Promise<string | null> => {
    try {
      // Chercher l'utilisateur par email dans la collection "users"
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        console.log("✅ Document utilisateur trouvé - ID:", doc.id);
        return doc.id;
      }
      
      // Si pas trouvé dans "users", chercher dans "societes" ou autre collection
      const societesRef = collection(db, "societes");
      const q2 = query(societesRef, where("email", "==", email));
      const querySnapshot2 = await getDocs(q2);
      
      if (!querySnapshot2.empty) {
        const doc = querySnapshot2.docs[0];
        console.log("✅ Document société trouvé - ID:", doc.id);
        return doc.id;
      }
      
      console.warn("⚠️ Aucun document trouvé pour l'email:", email);
      return null;
    } catch (error) {
      console.error("❌ Erreur lors de la recherche du document:", error);
      return null;
    }
  };

  // ✅ Fonction pour charger les données utilisateur complètes
  const loadUserData = async (firebaseUser: any) => {
    try {
      // 1. Récupérer l'ID du document Firestore
      const docId = await fetchUserDocId(firebaseUser.email);
      
      // 2. Construire l'objet utilisateur
      const userData: UserData = {
        uid: firebaseUser.uid,
        id: docId || firebaseUser.uid, // Utiliser l'ID Firestore ou l'UID comme fallback
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Agent',
        nomComplet: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Agent',
        nom: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Agent',
        role: 'commercial',
        photoURL: firebaseUser.photoURL || null
      };
      
      console.log("✅ Données utilisateur chargées:", userData);
      return userData;
    } catch (error) {
      console.error("❌ Erreur lors du chargement des données:", error);
      return null;
    }
  };

  // Écouter les changements d'authentification Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        // 1. Vérifier si les données sont déjà dans localStorage
        const savedUser = localStorage.getItem('userSession');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            // Si l'utilisateur a un ID, on l'utilise
            if (parsedUser.id) {
              setUser(parsedUser);
              setLoading(false);
              return;
            }
          } catch (e) {}
        }
        
        // 2. Charger les données depuis Firestore
        const userData = await loadUserData(firebaseUser);
        if (userData) {
          setUser(userData);
          localStorage.setItem('userSession', JSON.stringify(userData));
        }
      } else {
        setUser(null);
        localStorage.removeItem('userSession');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (userData: any) => {
    setUser(userData);
    localStorage.setItem('userSession', JSON.stringify(userData));
    return userData;
  };

  const logout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
    setUser(null);
    localStorage.removeItem('userSession');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);