// config/db.js - Version OPTIMISÉE et SÉCURISÉE

// ============================================
// 1. DÉTERMINER L'ENVIRONNEMENT
// ============================================
const isProd = process.env.NODE_ENV === 'production';

// ============================================
// 2. CONFIGURATION FIREBASE AVEC FALLBACK UNIVERSEL
// ============================================
// ✅ Stratégie : Les variables ENV priment, sinon fallback (développement UNIQUEMENT)
// ⚠️ En production, le fallback ne doit JAMAIS être utilisé (mais présent pour éviter le crash)
const getFirebaseConfig = () => {
  // Valeurs par défaut (fallback) - UNIQUEMENT pour le développement
  const fallback = {
    apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
    authDomain: "kin-geo-market.firebaseapp.com",
    projectId: "kin-geo-market",
    storageBucket: "kin-geo-market.firebasestorage.app",
    messagingSenderId: "50335362445",
    appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
  };

  // Construire la config à partir des ENV ou du fallback
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || fallback.apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || fallback.authDomain,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || fallback.projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || fallback.storageBucket,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || fallback.messagingSenderId,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || fallback.appId
  };

  // 🔥 ALERTE EN PRODUCTION : Si une variable est manquante, on log mais on ne crash pas
  if (isProd) {
    const missingVars = Object.keys(fallback).filter(key => !process.env[`NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`]);
    if (missingVars.length > 0) {
      console.warn(`⚠️ [PRODUCTION] Variables ENV manquantes : ${missingVars.join(', ')}. Utilisation du fallback (NON RECOMMANDÉ).`);
      console.warn('➡️ Configurez vos variables dans Vercel (Settings → Environment Variables)');
    }
  } else {
    console.log('🔧 [DÉVELOPPEMENT] Utilisation des variables ENV ou du fallback.');
  }

  return config;
};

const firebaseConfig = getFirebaseConfig();

// ============================================
// 3. CONFIGURATION CLOUDINARY
// ============================================
const CLOUDINARY_URL = process.env.NEXT_PUBLIC_CLOUDINARY_URL || "https://api.cloudinary.com/v1_1/dn7wnikzp/image/upload";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_UPLOAD_PRESET || "panneaux";

// ============================================
// 4. LOGO ET CONSTANTES
// ============================================
const LOGO_DISPROMALT = process.env.NEXT_PUBLIC_LOGO_URL || "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg";
const TYPES_SUPPORTS = ["LED", "Bache", "Vinyle"];
const STATUTS_POSSIBLES = ["Libre", "Occupé", "En Maintenance", "Réservé"];

// ============================================
// 5. GÉOGRAPHIE (données statiques)
// ============================================
const GEOGRAPHIE = {
  "RDC": {
    "Kinshasa": {
      "Lukunga": ["Tronçon Aerodrome", "Tronçon Bokasa", "Tronçon Kabambare", "Tronçon Blvd 30 juin( gare centrale - socimat)",
        "Tronçon Colonel Mondjiba -Nguma-Ecuries-OZONE-Route Matadi",
         "Tronçon Avenue Huilerie - Blvd du 30 JUIN /REGIDESO",
         "Tronçon av Prince de Liège/REF: AVENUE LYCEE MGR,SHAUMBA"],
      
      "Funa": ["Tronçon av de l' Université / KIMWENZA",
        "Tronçon av Victoire - SAIO-Bongolo",
        "Tronçon Assossa - Av Huileries",
        "Tronçon Blvd Sendwe", "Av, Kasa-vubu",
        "Tronçon Av 24 Novembre(prison centrale--Blvd 30 juin)",
         ],

      "Mont-Amba": ["Tronçon Blvd Lumumba",
        "Tronçon Poids Lourds",
        "Tronçon By Pass - Rond point Ngaba-Mt Ngafula",
        "Commune de Matete",
        "Commune de Lemba",
        "Tronçon Lemba Foire"],
      "Tshangu": ["Tronçon Aéroport de ndjili - Centre FECOFA",
         "Tronçon Aéroport de ndjili - LIMETE",
          "Commune de ndjili-Masina"]
    },
    "Kongo-Central": {
      "Matadi": ["Ville Haute", "Ville Basse", "Nzanza", "Sanga-Sanga"],
      "Boma": ["Nzadi", "Kabondo", "Kalamu"],
      "Mbanza-Ngungu": ["Noki", "Lukala"],
      "Inkisi": ["Kisantu", "Inkisi-Ville"]
    }
  },
  "Brazzaville": {
    "Brazzaville": {
      "Brazzaville": ["M'Pila", "Talangaï", "Ouenzé", "Poto-Poto", "Bacongo"]
    },
    "Pointe-Noire": {
      "Pointe-Noire": ["Lumumba", "Mvou-Mvou"]
    }
  }
};

// ============================================
// 6. FONCTIONS UTILITAIRES
// ============================================
const getCommunesFromFilters = (pays, province, district) => {
  if (!pays || !GEOGRAPHIE[pays]) return [];
  if (!province || !GEOGRAPHIE[pays][province]) return [];

  const provinceData = GEOGRAPHIE[pays][province];

  if (district) {
    const communesDuDistrict = provinceData[district];
    return Array.isArray(communesDuDistrict) ? communesDuDistrict : [];
  }

  const allCommunes = Object.values(provinceData).flatMap(val =>
    Array.isArray(val) ? val : []
  );

  return [...new Set(allCommunes)];
};

// ============================================
// 7. EXPORTATION
// ============================================
module.exports = {
  firebaseConfig,
  CLOUDINARY_URL,
  UPLOAD_PRESET,
  LOGO_DISPROMALT,
  TYPES_SUPPORTS,
  STATUTS_POSSIBLES,
  GEOGRAPHIE,
  getCommunesFromFilters
};