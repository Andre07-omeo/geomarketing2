"use client";

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ============================================
// IMPORTATION DEPUIS LE FICHIER DE CONFIG
// ============================================
const config = require('../../config/db');

// ============================================
// FIREBASE - Utilisation de la config
// ============================================
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

const app = getApps().length > 0 ? getApp() : initializeApp(config.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const DispromaltPrintLayer = () => {
  const router = useRouter();
  const [factureData, setFactureData] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isModification, setIsModification] = useState(false);
  const [reservationData, setReservationData] = useState<any>(null);
  const [factureNumber, setFactureNumber] = useState<string>('');
  const [allReservations, setAllReservations] = useState<any[]>([]);

  // ✅ Fonction pour générer le numéro de facture
  const generateFactureNumber = async () => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const datePrefix = `${year}${month}${day}`;

      const facturesRef = collection(db, "factures");
      const querySnapshot = await getDocs(facturesRef);
      
      let maxNumber = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const factureId = data.factureIdFormat || '';
        if (factureId && factureId.startsWith(datePrefix)) {
          const sequentialPart = factureId.substring(datePrefix.length);
          const num = parseInt(sequentialPart, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      });

      const newNumber = maxNumber + 1;
      const sequentialStr = String(newNumber).padStart(2, '0');
      const newFactureId = `${datePrefix}${sequentialStr}`;

      setFactureNumber(newFactureId);
      return newFactureId;

    } catch (error) {
      console.error('❌ Erreur génération numéro facture:', error);
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const random = String(Math.floor(Math.random() * 100)).padStart(2, '0');
      const fallbackId = `${year}${month}${day}${random}`;
      setFactureNumber(fallbackId);
      return fallbackId;
    }
  };

  // ✅ Redimensionnement pour mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 850) {
        setZoom(window.innerWidth / 850);
      } else {
        setZoom(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✅ Chargement des données depuis localStorage
  useEffect(() => {
    const loadData = async () => {
      const rawData = localStorage.getItem('facture_preview_data');
      if (rawData) {
        try {
          const decodedData = JSON.parse(rawData);
          const firstItem = decodedData[0];

          setAllReservations(decodedData);

          const isModif = firstItem?.modification === true || firstItem?.estModification === true || firstItem?.isModification === true;
          setIsModification(isModif);
          setReservationData(firstItem);

          const newFactureId = await generateFactureNumber();

          let cumulHT = 0;
          const lines = decodedData.map((item: any) => {
            const pu = Number(item.prixSaisi || item.montant || 0);
            const qte = Number(item.dureeMois || 1);
            const total = pu * qte;
            cumulHT += total;

            const modePaiement = item.modePaiement || 'total';
            const nombreTranches = item.nombreTranches || 1;

            return {
              qte,
              idFace: item.idFace || item.faceId || 'N/A',
              label: item.faceLabel || item.label || item.idFace || 'N/A',
              adresse: item.adresse || item.panneauAdresse || '',
              pu,
              total,
              dateDebut: item.dateDebut || "...",
              dateFin: item.dateFin || "...",
              type: item.type || "N/A",
              modePaiement: modePaiement,
              nombreTranches: nombreTranches,
              montantParTranche: modePaiement === 'tranche' && nombreTranches > 1
                ? total / nombreTranches
                : 0,
              panneauId: item.panneauId,
              faceId: item.faceId,
              faceIndex: item.faceIndex,
              societeLocatrice: item.societeLocatrice,
              dateDebutOriginal: item.dateDebut,
              dateFinOriginal: item.dateFin,
              agentEmail: item.agentEmail,
              createdAt: item.createdAt,
              dateCreation: item.dateCreation || item.createdAt
            };
          });

          setFactureData({
            factureId: newFactureId,
            client: firstItem.societeLocatrice || firstItem.clientNom || 'CLIENT',
            agent: firstItem.agentNom || 'Agent',
            email: firstItem.agentEmail || '',
            lignes: lines,
            totalHT: cumulHT,
            originalData: firstItem,
            isModification: isModif,
            rawReservations: decodedData
          });
        } catch (e) {
          console.error('❌ Erreur chargement données:', e);
        }
      }
    };

    loadData();
  }, []);

  // ============================================
  // ✅ FONCTION POUR MARQUER LES RÉSERVATIONS COMME FACTURÉES
  // ============================================
  const marquerReservationsFacturees = async (reservations: any[]) => {
    try {
      console.log('🔍 marquerReservationsFacturees - DÉBUT');
      console.log('📦 Nombre de réservations à marquer:', reservations.length);

      let successCount = 0;
      let errorCount = 0;
      let alreadyFacturedCount = 0;

      for (let i = 0; i < reservations.length; i++) {
        const res = reservations[i];

        console.log(`\n📌 RÉSERVATION ${i + 1}/${reservations.length}`);
        console.log(`  └─ PanneauId: ${res.panneauId}`);
        console.log(`  └─ FaceId: ${res.faceId}`);
        console.log(`  └─ Société: ${res.societeLocatrice}`);
        console.log(`  └─ IsModification: ${res.isModification}`);

        if (!res.panneauId) {
          console.error('❌ PanneauId manquant');
          errorCount++;
          continue;
        }

        try {
          // ✅ 1. Récupérer le panneau
          const panneauRef = doc(db, "panneaux", res.panneauId);
          const panneauSnap = await getDoc(panneauRef);

          if (!panneauSnap.exists()) {
            console.error(`❌ Panneau ${res.panneauId} introuvable`);
            errorCount++;
            continue;
          }

          const panneauData = panneauSnap.data();
          const faces = panneauData.faces || [];
          console.log(`  └─ Panneau trouvé, ${faces.length} face(s)`);

          // ✅ 2. Trouver la bonne face
          let faceIndex = -1;

          // Méthode 1: Par faceId
          if (res.faceId) {
            faceIndex = faces.findIndex((f: any) => f.id === res.faceId);
            if (faceIndex !== -1) {
              console.log(`  └─ ✅ Face trouvée par faceId à l'index ${faceIndex}`);
            }
          }

          // Méthode 2: Par faceIndexOriginal (pour les modifications)
          if (faceIndex === -1 && res.faceIndexOriginal !== undefined && res.faceIndexOriginal !== null && res.faceIndexOriginal !== -1) {
            faceIndex = parseInt(res.faceIndexOriginal);
            if (faceIndex >= 0 && faceIndex < faces.length) {
              console.log(`  └─ ✅ Face trouvée par faceIndexOriginal à l'index ${faceIndex}`);
            } else {
              faceIndex = -1;
            }
          }

          // Méthode 3: Par faceIndex
          if (faceIndex === -1 && res.faceIndex !== undefined && res.faceIndex !== null && res.faceIndex !== -1) {
            faceIndex = parseInt(res.faceIndex);
            if (faceIndex >= 0 && faceIndex < faces.length) {
              console.log(`  └─ ✅ Face trouvée par faceIndex à l'index ${faceIndex}`);
            } else {
              faceIndex = -1;
            }
          }

          // Méthode 4: Recherche avancée
          if (faceIndex === -1) {
            console.log('  └─ 🔍 Recherche avancée...');
            const searchCreatedAt = res.dateCreationOriginal || res.createdAt;
            const searchSociete = (res.societeLocatriceOriginal || res.societeLocatrice || '').toLowerCase().trim();
            const searchDateDebut = res.dateDebutOriginal || res.dateDebut;
            const searchDateFin = res.dateFinOriginal || res.dateFin;
            const searchAgent = (res.agentEmailOriginal || res.agentEmail || '').toLowerCase().trim();

            for (let j = 0; j < faces.length; j++) {
              const faceReservations = faces[j].reservations || [];
              
              // Par createdAt
              if (searchCreatedAt && faceReservations.some((r: any) => r.createdAt === searchCreatedAt)) {
                faceIndex = j;
                console.log(`  └─ ✅ Face trouvée par createdAt à l'index ${faceIndex}`);
                break;
              }
              
              // Par combinaison
              let found = false;
              for (const r of faceReservations) {
                const rSociete = (r.societeLocatrice || '').toLowerCase().trim();
                const rDateDebut = r.dateDebut;
                const rDateFin = r.dateFin;
                const rAgent = (r.agentEmail || '').toLowerCase().trim();
                
                let matchCount = 0;
                if (searchSociete && rSociete === searchSociete) matchCount++;
                if (searchDateDebut && rDateDebut === searchDateDebut) matchCount++;
                if (searchDateFin && rDateFin === searchDateFin) matchCount++;
                if (searchAgent && rAgent === searchAgent) matchCount++;
                
                if (matchCount >= 2) {
                  found = true;
                  break;
                }
              }
              if (found) {
                faceIndex = j;
                console.log(`  └─ ✅ Face trouvée par combinaison à l'index ${faceIndex}`);
                break;
              }
            }
          }

          if (faceIndex === -1 || faceIndex >= faces.length) {
            console.error(`❌ Face non trouvée pour la réservation`);
            errorCount++;
            continue;
          }

          const face = faces[faceIndex];
          const faceReservations = face.reservations || [];
          console.log(`  └─ Face ${faceIndex}, ${faceReservations.length} réservations`);

          // ✅ 3. Trouver et mettre à jour la réservation
          let updated = false;
          const updatedReservations = faceReservations.map((r: any) => {
            let isMatch = false;

            // 🔍 VÉRIFIER SI DÉJÀ FACTURÉE
            const estDejaFacturee = r.facturee === "oui" || r.facturee === "Oui" || r.facturee === true;
            if (estDejaFacturee) {
              console.log(`  └─ ⚠️ Réservation déjà facturée, ignorée`);
              alreadyFacturedCount++;
              return r;
            }

            // 🔍 Méthode 1: Par createdAt (le plus fiable)
            const searchCreatedAt = res.dateCreationOriginal || res.createdAt;
            if (searchCreatedAt && r.createdAt === searchCreatedAt) {
              isMatch = true;
              console.log(`  └─ ✅ Match par createdAt: ${searchCreatedAt}`);
            }

            // 🔍 Méthode 2: Par combinaison de critères
            if (!isMatch) {
              const rSociete = (r.societeLocatrice || '').toLowerCase().trim();
              const rDateDebut = r.dateDebut;
              const rDateFin = r.dateFin;
              const rAgent = (r.agentEmail || '').toLowerCase().trim();

              const searchSociete = (res.societeLocatriceOriginal || res.societeLocatrice || '').toLowerCase().trim();
              const searchDateDebut = res.dateDebutOriginal || res.dateDebut;
              const searchDateFin = res.dateFinOriginal || res.dateFin;
              const searchAgent = (res.agentEmailOriginal || res.agentEmail || '').toLowerCase().trim();

              let matchCount = 0;
              if (searchSociete && rSociete === searchSociete) matchCount++;
              if (searchDateDebut && rDateDebut === searchDateDebut) matchCount++;
              if (searchDateFin && rDateFin === searchDateFin) matchCount++;
              if (searchAgent && rAgent === searchAgent) matchCount++;

              isMatch = matchCount >= 3;

              if (isMatch) {
                console.log(`  └─ ✅ Match par critères (${matchCount}/4)`);
              }
            }

            // 🔍 Méthode 3: Pour les modifications
            if (!isMatch && (res.isModification || res.modification || res.estModification)) {
              const rSociete = (r.societeLocatrice || '').toLowerCase().trim();
              const rDateDebut = r.dateDebut;
              const rDateFin = r.dateFin;
              const rAgent = (r.agentEmail || '').toLowerCase().trim();

              const ancienneSociete = (res.ancienneSociete || '').toLowerCase().trim();
              const ancienneDateDebut = res.ancienneDateDebut;
              const ancienneDateFin = res.ancienneDateFin;
              const ancienAgent = (res.ancienAgentEmail || '').toLowerCase().trim();

              let matchCount = 0;
              if (ancienneSociete && rSociete === ancienneSociete) matchCount++;
              if (ancienneDateDebut && rDateDebut === ancienneDateDebut) matchCount++;
              if (ancienneDateFin && rDateFin === ancienneDateFin) matchCount++;
              if (ancienAgent && rAgent === ancienAgent) matchCount++;

              isMatch = matchCount >= 2;

              if (isMatch) {
                console.log(`  └─ ✅ Match par anciennes valeurs (${matchCount}/4)`);
              }
            }

            if (isMatch) {
              updated = true;
              console.log(`  └─ ✅ Réservation marquée comme facturée`);
              
              // ✅ Préparer les données mises à jour
              const updatedReservation: any = {
                ...r,
                facturee: "oui",
                dateFacturation: new Date().toISOString(),
                factureId: factureNumber || res.factureIdFormat || `F-${Date.now()}`,
                modifiePar: "facturation",
                modifieLe: new Date().toISOString()
              };

              // ✅ Si c'est une modification, mettre à jour les données
              if (res.isModification || res.modification || res.estModification) {
                updatedReservation.agentEmail = res.agentEmail || r.agentEmail;
                updatedReservation.agentNom = res.agentNom || r.agentNom;
                updatedReservation.societeLocatrice = res.societeLocatrice || r.societeLocatrice;
                updatedReservation.dateDebut = res.dateDebut || r.dateDebut;
                updatedReservation.dateFin = res.dateFin || r.dateFin;
                updatedReservation.montant = res.montant || r.montant;
                updatedReservation.ancienAgentEmail = r.agentEmail;
                updatedReservation.ancienAgentNom = r.agentNom;
                updatedReservation.ancienneSociete = r.societeLocatrice;
                updatedReservation.ancienneDateDebut = r.dateDebut;
                updatedReservation.ancienneDateFin = r.dateFin;
                updatedReservation.ancienMontant = r.montant || 0;
                updatedReservation.modification = true;
                updatedReservation.modifiePar = res.modifiePar || 'facturation';
                updatedReservation.modifieParNom = res.modifieParNom || 'Facturation';
                updatedReservation.dateModification = new Date().toISOString();
              }

              return updatedReservation;
            }
            return r;
          });

          if (!updated) {
            console.error(`❌ Réservation non trouvée dans la face`);
            errorCount++;
            continue;
          }

          // ✅ 4. Sauvegarder dans Firestore
          const updatedFaces = [...faces];
          updatedFaces[faceIndex] = {
            ...face,
            reservations: updatedReservations
          };

          await updateDoc(panneauRef, {
            faces: updatedFaces,
            updatedAt: new Date().toISOString()
          });

          console.log(`✅ Réservation ${i + 1} marquée avec succès`);
          successCount++;

        } catch (err) {
          console.error(`❌ Erreur pour la réservation ${i}:`, err);
          errorCount++;
        }
      }

      console.log(`\n📊 RÉSUMÉ:`);
      console.log(`  ✅ Marquées: ${successCount}`);
      console.log(`  ⚠️ Déjà facturées: ${alreadyFacturedCount}`);
      console.log(`  ❌ Erreurs: ${errorCount}`);
      console.log(`  📋 Total: ${reservations.length}`);

      // ✅ MESSAGE SI TOUTES ÉTAIENT DÉJÀ FACTURÉES
      if (alreadyFacturedCount === reservations.length && successCount === 0 && errorCount === 0) {
        alert("⚠️ Ces réservations ont déjà été facturées. Aucune modification n'a été effectuée.");
        return false;
      }

      return successCount > 0;

    } catch (error) {
      console.error('❌ Erreur générale:', error);
      return false;
    }
  };

// ============================================
// ✅ HANDLE PRINT AND SAVE - CORRIGÉ
// ============================================
const handlePrintAndSave = async () => {
  if (isSaving) return;
  setIsSaving(true);

  try {
    window.print();

    const rawData = localStorage.getItem('facture_preview_data');
    if (!rawData) {
      throw new Error('Aucune donnée trouvée');
    }

    const items = JSON.parse(rawData);
    const firstItem = items[0];

    // ✅ 2. PRÉPARER LES DONNÉES POUR LE MARQUAGE
    const reservationsToMark = items.map((item: any) => {
      return {
        panneauId: item.panneauId || item.panelDocId || '',
        faceId: item.faceId || item.idFace || '',
        faceIndex: item.faceIndex !== undefined && item.faceIndex !== null
          ? parseInt(item.faceIndex)
          : (item.faceIndexInPanneau !== undefined ? parseInt(item.faceIndexInPanneau) : -1),
        faceIndexOriginal: item.faceIndexOriginal !== undefined && item.faceIndexOriginal !== null
          ? parseInt(item.faceIndexOriginal)
          : (item.faceIndex !== undefined && item.faceIndex !== null
            ? parseInt(item.faceIndex)
            : (item.faceIndexInPanneau !== undefined ? parseInt(item.faceIndexInPanneau) : -1)),
        reservationId: item.reservationId || item.id || item.resUniqueId || '',
        societeLocatrice: item.societeLocatrice || item.clientNom || '',
        dateDebut: item.dateDebut || item.dateDebutOriginal || '',
        dateFin: item.dateFin || item.dateFinOriginal || '',
        agentEmail: item.agentEmail || item.agentEmailOriginal || '',
        agentNom: item.agentNom || item.agentNomOriginal || '',
        agentId: item.agentId || '',
        createdAt: item.createdAt || item.dateCreation || '',
        dateCreation: item.dateCreation || item.createdAt || '',
        isModification: item.modification === true || item.estModification === true || item.isModification === true,
        ancienneSociete: item.ancienneSociete || '',
        ancienAgentEmail: item.ancienAgentEmail || '',
        ancienAgentNom: item.ancienAgentNom || '',
        ancienAgentId: item.ancienAgentId || '',
        ancienneDateDebut: item.ancienneDateDebut || '',
        ancienneDateFin: item.ancienneDateFin || '',
        modifiePar: item.modifiePar || 'facturation',
        modifieParNom: item.modifieParNom || 'Facturation',
        dateCreationOriginal: item.dateCreationOriginal || item.createdAt || item.dateCreation || '',
        dateDebutOriginal: item.dateDebutOriginal || item.dateDebut || '',
        dateFinOriginal: item.dateFinOriginal || item.dateFin || '',
        agentEmailOriginal: item.agentEmailOriginal || item.agentEmail || '',
        societeLocatriceOriginal: item.societeLocatriceOriginal || item.societeLocatrice || '',
        factureIdFormat: factureNumber || item.factureIdFormat || `F-${Date.now()}`,
        panelDocId: item.panelDocId || item.panneauId || '',
        adresse: item.adresse || item.panneauAdresse || '',
        panneauIdPan: item.panneauIdPan || '',
        faceLabel: item.faceLabel || item.idFace || '',
        statut: item.statut || 'Réservé',
        statutPaiement: item.statutPaiement || 'en attente',
        validationComptable: item.validationComptable || false,
        montant: item.montant || item.prixSaisi || 0,
        dureeMois: item.dureeMois || 1
      };
    });

    // ✅ 3. MARQUER COMME FACTURÉES
    const markSuccess = await marquerReservationsFacturees(reservationsToMark);

    if (!markSuccess) {
      const allAlreadyFactured = reservationsToMark.every((item: any) => {
        return item.dejaFacturee === true;
      });
      
      if (allAlreadyFactured) {
        alert("⚠️ Ces réservations ont déjà été facturées. Aucune modification n'a été effectuée.");
      } else {
        alert("❌ Erreur lors du marquage des réservations comme facturées.");
      }
      setIsSaving(false);
      return;
    }

    // ✅ 4. ENREGISTRER LA FACTURE DANS FIRESTORE
    try {
      const isModification = firstItem?.modification || firstItem?.estModification || firstItem?.isModification || false;
      
      // 🔥 NOUVEL AGENT (celui sélectionné dans le formulaire)
      const nouvelAgentNom = firstItem?.agentNom || 'N/A';
      const nouvelAgentEmail = firstItem?.agentEmail || '';
      const nouvelAgentId = firstItem?.agentId || '';
      
      // 🔥 ANCIEN AGENT (celui qui était avant modification)
      const ancienAgentNom = firstItem?.ancienAgentNom || '';
      const ancienAgentEmail = firstItem?.ancienAgentEmail || '';
      const ancienAgentId = firstItem?.ancienAgentId || '';

      const factureDataToSave = {
        factureIdFormat: factureNumber || firstItem.factureIdFormat || `F-${Date.now()}`,
        clientNom: firstItem.societeLocatrice || firstItem.clientNom || 'CLIENT INCONNU',
        // ✅ NOUVEL agent dans la facture
        agentNom: nouvelAgentNom,
        agentEmail: nouvelAgentEmail,
        agentId: nouvelAgentId,
        // ✅ ANCIEN agent conservé pour l'historique
        ancienAgentNom: ancienAgentNom,
        ancienAgentEmail: ancienAgentEmail,
        ancienAgentId: ancienAgentId,
        totalHT: items.reduce((sum: number, item: any) => {
          const prix = item.prixSaisi || item.montant || 0;
          const duree = item.dureeMois || 1;
          return sum + (prix * duree);
        }, 0),
        dateCreation: new Date().toISOString(),
        dateValidation: new Date().toISOString(),
        lignes: items.map((item: any) => ({
          qte: item.dureeMois || 1,
          idFace: item.idFace || item.faceId || 'N/A',
          label: item.faceLabel || item.label || 'N/A',
          adresse: item.adresse || item.panneauAdresse || '',
          pu: item.prixSaisi || item.montant || 0,
          total: (item.prixSaisi || item.montant || 0) * (item.dureeMois || 1),
          dateDebut: item.dateDebut || '',
          dateFin: item.dateFin || '',
          type: item.type || 'Vinyle',
          modePaiement: item.modePaiement || 'total',
          nombreTranches: item.nombreTranches || 1,
          montantParTranche: item.montantParTranche || 0,
          panneauId: item.panneauId || '',
          faceId: item.faceId || ''
        })),
        statut: "Validée",
        statutPaiement: "Payé",
        validationComptable: true,
        estModification: isModification,
        ancienneSociete: firstItem?.ancienneSociete || '',
        modifiePar: firstItem?.modifiePar || 'admin',
        modifieParNom: firstItem?.modifieParNom || 'Administrateur'
      };

      await addDoc(collection(db, "factures"), factureDataToSave);
      console.log('✅ Facture enregistrée avec succès');

    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement de la facture:', error);
    }

    // ✅ 5. METTRE À JOUR LE LOCALSTORAGE
    const updatedItems = items.map((item: any) => ({
      ...item,
      facturee: "oui",
      dateFacturation: new Date().toISOString()
    }));
    localStorage.setItem('facture_preview_data', JSON.stringify(updatedItems));

    alert("✅ Facture enregistrée avec succès !");

    setTimeout(() => {
      localStorage.removeItem('facture_preview_data');
      router.back();
    }, 2000);

  } catch (error) {
    console.error('❌ Erreur:', error);
    alert("❌ Erreur lors de l'enregistrement.");
  } finally {
    setIsSaving(false);
  }
};
  if (!factureData) return null;

  // ✅ Affichage des informations de paiement
  const getPaymentInfoInDesignation = (l: any) => {
    if (l.modePaiement === 'tranche' && l.nombreTranches > 1) {
      return (
        <div style={{
          fontSize: '8px',
          color: '#d4af37',
          marginTop: '5px',
          fontWeight: 'bold',
          backgroundColor: '#fef9e6',
          padding: '3px 6px',
          borderRadius: '4px',
          display: 'inline-block'
        }}>
          📋 Paiement en {l.nombreTranches} tranches mensuelles de {l.montantParTranche.toLocaleString()} $
          <span style={{ fontSize: '7px', color: '#999', marginLeft: '8px' }}>
            (1er prélèvement à la signature)
          </span>
        </div>
      );
    } else {
      return (
        <div style={{ fontSize: '8px', color: '#27ae60', marginTop: '5px', fontWeight: 'bold' }}>
          💰 Paiement comptant
        </div>
      );
    }
  };

  return (
    <div className="page-container">
      <div className="no-print mobile-actions">
        <button className="btn-back" onClick={() => router.back()}>RETOUR</button>
        <button
          className="btn-print"
          onClick={handlePrintAndSave}
          disabled={isSaving}
        >
          {isSaving ? "ENREGISTREMENT..." : isModification ? "VALIDER" : "IMPRIMER"}
        </button>
      </div>

      <div className="zoom-wrapper" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
        <div className="sheet">

          {/* NUMÉRO DE FACTURE */}
          <div style={{
            position: 'absolute',
            top: '76mm',
            left: '50mm',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#000'
          }}>
            {factureNumber || factureData.factureId}
          </div>

          {/* DATE */}
          <div style={{ position: 'absolute', top: '66mm', left: '155mm', fontSize: '17px' }}>
            {new Date().toLocaleDateString('fr-FR')}
          </div>

          {/* RECTANGLE INFOS CLIENT */}
          <div style={{ position: 'absolute', top: '75mm', left: '135mm', width: '60mm', lineHeight: '1.5' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>
              {factureData.client}
            </div>
            <div style={{ marginTop: '3mm', fontSize: '10px', textTransform: 'uppercase' }}>
              Établi par : {factureData.agent}
            </div>
            <div style={{ fontSize: '10px', color: '#333' }}>
              {factureData.email}
            </div>
          </div>

          {/* TABLEAU DES LIGNES */}
          <div style={{
            position: 'absolute',
            top: isModification ? '108mm' : '110mm',
            left: '10mm',
            width: '180mm'
          }}>
            {factureData.lignes.map((l: any, i: number) => (
              <div key={i} style={{ display: 'flex', minHeight: '15.5mm', alignItems: 'flex-start', fontSize: '12px', marginBottom: '5px' }}>

                <div style={{ width: '22mm', textAlign: 'center', paddingTop: '5px' }}>
                  {l.qte}
                </div>

                <div style={{ width: '105mm', paddingLeft: '5mm', paddingTop: '5px', lineHeight: '1.3' }}>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px' }}>
                    {l.idFace} - {l.label}
                  </div>
                  <div style={{ fontSize: '13px', color: '#111' }}>
                    {l.adresse}
                  </div>
                  <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#111010dc' }}>
                    <span>Type: {l.type || 'Vinyle'}</span>
                    <span style={{ marginLeft: '10px' }}>Période: {l.dateDebut} au {l.dateFin}</span>
                  </div>
                  {getPaymentInfoInDesignation(l)}
                </div>

                <div style={{ width: '25mm', textAlign: 'right', paddingRight: '5mm', paddingTop: '5px' }}>
                  {Number(l.pu).toLocaleString()}
                </div>

                <div style={{ width: '28mm', textAlign: 'right', paddingTop: '5px' }}>
                  {Number(l.total).toLocaleString()}
                </div>

              </div>
            ))}
          </div>

          {/* TOTAL À PAYER */}
          <div style={{
            position: 'absolute',
            top: isModification ? '248mm' : '250mm',
            left: '160mm',
            width: '30mm',
            textAlign: 'right',
            fontWeight: 'bold',
            fontSize: '16px'
          }}>
            {factureData.totalHT.toLocaleString()} $
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-container {
          background-color: #525659;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: 50px;
        }
        .zoom-wrapper {
          margin-top: 80px;
          transition: transform 0.2s ease-out;
        }
        .sheet {
          background-color: white;
          width: 210mm;
          height: 297mm;
          position: relative;
          box-shadow: 0 0 15px rgba(0,0,0,0.5);
          color: black;
          font-family: 'Courier New', Courier, monospace;
        }
        .mobile-actions {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: #333;
          padding: 15px;
          display: flex;
          justify-content: center;
          gap: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .btn-print { 
          background: #27ae60; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          font-weight: bold; 
          cursor: pointer; 
          border-radius: 5px; 
        }
        .btn-back { 
          background: #e74c3c; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          font-weight: bold; 
          cursor: pointer; 
          border-radius: 5px; 
        }
        .btn-print:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media print {
          .page-container { background: none; padding: 0; display: block; }
          .zoom-wrapper { transform: none !important; margin: 0 !important; }
          .sheet { box-shadow: none; margin: 0; width: 100%; }
          .no-print { display: none !important; }
        }
        @media (max-width: 600px) {
          .btn-print, .btn-back { padding: 8px 12px; font-size: 12px; }
        }
      `}</style>
    </div>
  );
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DispromaltPrintLayer />
    </Suspense>
  );
}