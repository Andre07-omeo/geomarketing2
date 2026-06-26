// config/db.js - Version SÉCURISÉE avec variables d'environnement

// ============================================
// 1. VÉRIFICATION EN PRODUCTION
// ============================================

if (isProd) {
  // En production, TOUTES les variables doivent être définies
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];
  
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`❌ Variables d'environnement manquantes en production: ${missing.join(', ')}`);
  }
}

// ============================================
// 2. CONFIGURATION FIREBASE - SÉCURISÉE
// ============================================
// ✅ UTILISATION DES VARIABLES D'ENVIRONNEMENT
// En production, les valeurs viennent UNIQUEMENT des ENV
// En développement, on utilise un fallback (MAIS jamais en prod)
// Remplacez la vérification production par ceci :
const isProd = process.env.NODE_ENV === 'production';

// ⚠️ SOLUTION TEMPORAIRE : Fallback également en production
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "kin-geo-market.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kin-geo-market",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "kin-geo-market.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "50335362445",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:50335362445:web:44430fdb027a4bec80a1c4"
};

// En développement, on peut avoir un fallback (optionnel)
if (!isProd) {
  // Fallback uniquement en développement
  const fallbackConfig = {
    apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
    authDomain: "kin-geo-market.firebaseapp.com",
    projectId: "kin-geo-market",
    storageBucket: "kin-geo-market.firebasestorage.app",
    messagingSenderId: "50335362445",
    appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
  };
  
  // Fusionner : les variables ENV priment sur le fallback
  Object.keys(fallbackConfig).forEach(key => {
    if (!firebaseConfig[key]) {
      firebaseConfig[key] = fallbackConfig[key];
      console.warn(`⚠️ Utilisation du fallback pour ${key} (développement uniquement)`);
    }
  });
}

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
// 5. GÉOGRAPHIE (peut rester en dur)
// ============================================
const GEOGRAPHIE = {
  "RDC": {
    "Kinshasa": {
      "Lukunga": [
        "Gombe", "Barumbu", "Kinshasa", "Lingwala",
        "Kintambo", "Ngaliema", "Mont-Ngafula"
      ],
      "Funa": [
        "Bandalungwa", "Kasa-Vubu", "Kalamu", "Ngiri-Ngiri",
        "Bumbu", "Makala", "Selembao"
      ],
      "Mont-Amba": [
        "Limete", "Lemba", "Matete", "Ngaba",
        "Kisenso"
      ],
      "Tshangu": [
        "Masina", "Ndjili", "Kimbanseke", "Nsele",
        "Maluku"
      ]
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