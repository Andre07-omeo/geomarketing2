// utils/reservationCleanup.ts

import { collection, writeBatch, doc, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';

// ============================================
// INITIALISATION FIREBASE
// ============================================
const config = require('../config/db');
const firebaseConfig = config.firebaseConfig;

// ✅ Initialisation sécurisée de Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================
// FONCTIONS DE VÉRIFICATION
// ============================================

/**
 * Vérifie si une réservation doit être déplacée vers l'historique
 */
const isReservationExpired = (res: any, now: Date): boolean => {
  // ✅ Condition 1: Campagne terminée (dateFin dépassée)
  const dateFin = new Date(res.dateFin);
  dateFin.setHours(0, 0, 0, 0);
  
  if (dateFin < now) {
    return true; // ✅ DÉPLACER
  }
  
  // ✅ Condition 2: Délai de paiement expiré
  const joursAvantExpiration = res.joursAvantExpiration ?? 0;
  
  if (joursAvantExpiration === 0) {
    return true; // ✅ DÉPLACER
  }
  
  return false; // ❌ GARDER
};

/**
 * Détermine la raison de l'expiration
 */
const getExpirationReason = (res: any): 'non_paye' | 'periode_terminee' => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const dateFin = new Date(res.dateFin);
  dateFin.setHours(0, 0, 0, 0);
  
  const isDateFinPassed = dateFin < now;
  const joursAvantExpiration = res.joursAvantExpiration ?? 0;
  const isPaymentDeadlineExpired = joursAvantExpiration === 0;
  
  if (isDateFinPassed) {
    return 'periode_terminee';
  }
  
  if (isPaymentDeadlineExpired) {
    return 'non_paye';
  }
  
  return 'periode_terminee';
};

// ============================================
// CRÉATION DES ENTRÉES D'HISTORIQUE
// ============================================

/**
 * Crée une entrée pour l'historique
 */
const createHistoriqueEntry = (panneau: any, face: any, res: any, now: Date): any => {
  const raison = getExpirationReason(res);
  
  const isPaidOrValidated = 
    res.statutPaiement === 'payé' || 
    res.statutPaiement === 'validé' || 
    res.validationComptable === true;
  
  let statutFinal = '';
  let description = '';
  
  if (raison === 'non_paye') {
    statutFinal = 'Expiré - Délai de paiement dépassé';
    description = `Réservation expirée car le délai de paiement a été dépassé. ${isPaidOrValidated ? 'Le paiement a finalement été effectué trop tard.' : 'Le paiement n\'a jamais été effectué.'}`;
  } else {
    statutFinal = 'Terminé - Campagne achevée';
    description = `La campagne s'est déroulée du ${res.dateDebut} au ${res.dateFin}. ${isPaidOrValidated ? 'Le paiement a été effectué avec succès.' : 'Le paiement n\'a pas été effectué.'}`;
  }
  
  return {
    // Informations de la réservation
    reservationId: res.id || res._id || `res_${Date.now()}`,
    societeLocatrice: res.societeLocatrice || 'N/A',
    dateDebut: res.dateDebut,
    dateFin: res.dateFin,
    statutOriginal: res.statut || 'Réservé',
    statutPaiementOriginal: res.statutPaiement || 'en attente',
    validationComptableOriginal: res.validationComptable || false,
    photoCampagneUrl: res.photoCampagneUrl || '',
    agentNom: res.agentNom || 'N/A',
    agentEmail: res.agentEmail || 'N/A',
    facturee: res.facturee || 'non',
    modePaiement: res.modePaiement || 'globale',
    
    // Informations de la face
    faceId: face.id || `face_${Date.now()}`,
    faceSens: face.sens || 'N/A',
    faceStatut: face.statut || 'N/A',
    
    // Informations du panneau
    panneauId: panneau.id,
    panneauIdPan: panneau.idPan || 'N/A',
    panneauAdresse: panneau.adresse || 'N/A',
    panneauType: panneau.type || 'N/A',
    panneauDimension: panneau.dimension || 'N/A',
    panneauCoords: panneau.coords || panneau.gps_raw || null,
    
    // Informations d'expiration
    raison: raison,
    statutFinal: statutFinal,
    description: description,
    dateExpiration: now.toISOString().split('T')[0],
    dateExpirationFormatted: now.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    joursAvantExpiration: res.joursAvantExpiration ?? 0,
    expirationDate: res.expirationDate || null,
    expirationDateFormatted: res.expirationDateFormatted || null,
    delaiExpirationJours: res.delaiExpirationJours || 10,
    
    // Métadonnées
    createdAt: res.createdAt || new Date().toISOString(),
    createdBy: res.createdBy || 'Système',
    createdByEmail: res.createdByEmail || 'system@dispromalt.cd',
    movedToHistoryAt: new Date().toISOString(),
    movedBy: 'Système - Nettoyage automatique'
  };
};

// ============================================
// SAUVEGARDE DANS FIRESTORE
// ============================================

/**
 * Sauvegarde l'historique dans Firebase (collection "historique")
 */
const saveHistoriqueToDatabase = async (updatedPanneaux: any[]) => {
  try {
    const historiqueEntries: any[] = [];
    
    updatedPanneaux.forEach((panneau) => {
      (panneau.faces || []).forEach((face: any) => {
        if (face.historique && Array.isArray(face.historique)) {
          face.historique.forEach((entry: any) => {
            const cleanEntry = {
              ...entry,
              panneauId: panneau.id,
              panneauIdPan: panneau.idPan || 'N/A',
              faceId: face.id || 'N/A',
              timestamp: new Date().getTime()
            };
            historiqueEntries.push(cleanEntry);
          });
        }
      });
    });
    
    if (historiqueEntries.length > 0) {
      console.log(`💾 Sauvegarde de ${historiqueEntries.length} entrées d'historique...`);
      
      const historiqueCollection = collection(db, 'historique');
      const batch = writeBatch(db);
      
      historiqueEntries.forEach((entry) => {
        const docRef = doc(historiqueCollection);
        batch.set(docRef, {
          ...entry,
          savedAt: new Date().toISOString(),
          savedBy: 'Système - Nettoyage automatique'
        });
      });
      
      await batch.commit();
      
      const nonPayeCount = historiqueEntries.filter(e => e.raison === 'non_paye').length;
      const periodeTermineeCount = historiqueEntries.filter(e => e.raison === 'periode_terminee').length;
      console.log(`✅ Historique sauvegardé avec succès dans Firestore`);
      console.log(`   📊 ${nonPayeCount} entrées (non payé) - ${periodeTermineeCount} entrées (période terminée)`);
    } else {
      console.log('ℹ️ Aucune entrée d\'historique à sauvegarder');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de l\'historique:', error);
  }
};

// ============================================
// FONCTION PRINCIPALE DE NETTOYAGE
// ============================================

/**
 * Fonction principale de nettoyage
 */
export const cleanupExpiredReservations = async (panneaux: any[], updatePanneaux: Function) => {
  console.log('🧹 Nettoyage automatique des réservations expirées...');
  
  let hasChanges = false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  console.log(`📅 Date actuelle: ${now.toISOString()}`);

  const updatedPanneaux = panneaux.map((panneau) => {
    console.log(`📦 Panneau: ${panneau.idPan}`);
    
    const updatedFaces = (panneau.faces || []).map((face: any) => {
      let faceModified = false;
      const validReservations: any[] = [];
      
      console.log(`  📋 Face: ${face.id || 'N/A'} - ${face.reservations?.length || 0} réservations`);
      
      (face.reservations || []).forEach((res: any) => {
        // 🔍 Log spécifique pour KAMSO
        if (res.societeLocatrice === 'KAMSO') {
          console.log(`  🔍 KAMSO détecté!`);
          console.log(`     dateFin: ${res.dateFin}`);
          console.log(`     joursAvantExpiration: ${res.joursAvantExpiration}`);
          console.log(`     statutPaiement: ${res.statutPaiement}`);
          console.log(`     validationComptable: ${res.validationComptable}`);
        }
        
        const isExpired = isReservationExpired(res, now);
        console.log(`    ${res.societeLocatrice}: isExpired = ${isExpired}`);
        
        if (isExpired) {
          console.log(`    📦 DÉPLACEMENT: ${res.societeLocatrice}`);
          const historiqueEntry = createHistoriqueEntry(panneau, face, res, now);
          if (!face.historique) face.historique = [];
          face.historique.push(historiqueEntry);
          faceModified = true;
          hasChanges = true;
        } else {
          console.log(`    ✅ GARDÉ: ${res.societeLocatrice}`);
          validReservations.push(res);
        }
      });
      
      if (faceModified) {
        console.log(`  ✅ Face modifiée, ${validReservations.length} réservations restantes`);
        face.reservations = validReservations;
      }
      
      return face;
    });
    
    panneau.faces = updatedFaces;
    return panneau;
  });

  if (hasChanges) {
    console.log('✅ Nettoyage terminé - Des réservations ont été déplacées');
    await saveHistoriqueToDatabase(updatedPanneaux);
    updatePanneaux(updatedPanneaux);
  } else {
    console.log('✅ Aucune réservation expirée à déplacer');
  }
  
  return updatedPanneaux;
};

// ============================================
// FONCTION DE NETTOYAGE FORCÉ (EXPORTÉE)
// ============================================

/**
 * Force le nettoyage manuellement (à appeler dans la console)
 */
export const forceCleanup = (panneaux: any[]): any[] => {
  console.log('🔧 Nettoyage forcé manuellement...');
  let count = 0;
  
  panneaux.forEach((panneau) => {
    (panneau.faces || []).forEach((face: any) => {
      const reservations = face.reservations || [];
      const expiredReservations = reservations.filter((r: any) => {
        const dateFin = new Date(r.dateFin);
        dateFin.setHours(0, 0, 0, 0);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        return dateFin < now || r.joursAvantExpiration === 0;
      });
      
      if (expiredReservations.length > 0) {
        console.log(`📦 Face ${face.id || 'N/A'}: ${expiredReservations.length} réservation(s) expirée(s)`);
        
        expiredReservations.forEach((res: any) => {
          console.log(`  - ${res.societeLocatrice} (${res.dateDebut} → ${res.dateFin})`);
          
          if (!face.historique) face.historique = [];
          face.historique.push({
            ...res,
            movedToHistoryAt: new Date().toISOString(),
            movedBy: 'Nettoyage manuel'
          });
          
          const index = face.reservations.indexOf(res);
          if (index !== -1) {
            face.reservations.splice(index, 1);
            count++;
          }
        });
      }
    });
  });
  
  console.log(`✅ ${count} réservation(s) déplacée(s) vers l'historique`);
  return panneaux;
};

// ============================================
// INITIALISATION ET ARRÊT
// ============================================

/**
 * Initialise le nettoyage automatique
 */
export const initAutoCleanup = (panneaux: any[], updatePanneaux: Function) => {
  console.log('🔄 Initialisation du nettoyage automatique des réservations...');
  
  const timeoutId = setTimeout(() => {
    cleanupExpiredReservations(panneaux, updatePanneaux);
  }, 3000);
  
  const intervalId = setInterval(() => {
    console.log('⏰ Nettoyage périodique des réservations...');
    cleanupExpiredReservations(panneaux, updatePanneaux);
  }, 60 * 60 * 1000);
  
  const handleBeforeUnload = () => {
    console.log('🚪 Nettoyage avant fermeture de la page...');
    cleanupExpiredReservations(panneaux, updatePanneaux);
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return { timeoutId, intervalId, handleBeforeUnload };
};

/**
 * Arrête le nettoyage automatique
 */
export const stopAutoCleanup = (cleanupRefs: { timeoutId: NodeJS.Timeout, intervalId: NodeJS.Timeout, handleBeforeUnload: () => void }) => {
  if (cleanupRefs) {
    if (cleanupRefs.timeoutId) clearTimeout(cleanupRefs.timeoutId);
    if (cleanupRefs.intervalId) clearInterval(cleanupRefs.intervalId);
    if (cleanupRefs.handleBeforeUnload) {
      window.removeEventListener('beforeunload', cleanupRefs.handleBeforeUnload);
    }
    console.log('🛑 Nettoyage automatique arrêté');
  }
};