// config/db.js - Version avec exports directs

// ============================================
// 1. CONFIGURATION FIREBASE
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
  authDomain: "kin-geo-market.firebaseapp.com",
  projectId: "kin-geo-market",
  storageBucket: "kin-geo-market.firebasestorage.app",
  messagingSenderId: "50335362445",
  appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
};

// ============================================
// 2. CONFIGURATION CLOUDINARY
// ============================================
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dn7wnikzp/image/upload";
const UPLOAD_PRESET = "panneaux";

// ============================================
// 3. CONSTANTES DE L'APPLICATION
// ============================================
const LOGO_DISPROMALT = "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg";
const TYPES_SUPPORTS = ["LED", "Bache", "Vinyle"];
const STATUTS_POSSIBLES = ["Libre", "Occupé", "En Maintenance", "Réservé"];

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
// 4. FONCTIONS UTILITAIRES
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
// 5. EXPORTATION DIRECTE
// ============================================
module.exports = {
  // Firebase
  firebaseConfig,
  
  // Cloudinary
  CLOUDINARY_URL,
  UPLOAD_PRESET,
  
  // Constantes
  LOGO_DISPROMALT,
  TYPES_SUPPORTS,
  STATUTS_POSSIBLES,
  GEOGRAPHIE,
  
  // Fonctions
  getCommunesFromFilters
};