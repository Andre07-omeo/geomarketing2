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
import { getFirestore, collection, addDoc, doc, updateDoc, getDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
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

  // ✅ Fonction pour générer le numéro de facture
  const generateFactureNumber = async () => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const datePrefix = `${year}${month}${day}`;

      // ✅ Récupérer la dernière facture de la journée
      const facturesRef = collection(db, "factures");
      const q = query(
        facturesRef,
        orderBy("dateCreation", "desc"),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      let lastNumber = 0;
      
      if (!querySnapshot.empty) {
        const lastDoc = querySnapshot.docs[0];
        const lastData = lastDoc.data();
        const lastFactureId = lastData.factureIdFormat || '';
        
        // ✅ Extraire le numéro séquentiel
        if (lastFactureId.startsWith(datePrefix)) {
          const sequentialPart = lastFactureId.substring(datePrefix.length);
          lastNumber = parseInt(sequentialPart, 10) || 0;
        }
      }
      
      // ✅ Incrémenter le numéro
      const newNumber = lastNumber + 1;
      const sequentialStr = String(newNumber).padStart(2, '0');
      const newFactureId = `${datePrefix}${sequentialStr}`;
      
      setFactureNumber(newFactureId);
      return newFactureId;
      
    } catch (error) {
      console.error('Erreur génération numéro facture:', error);
      // ✅ Fallback : générer un numéro avec timestamp
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const fallbackId = `${year}${month}${day}01`;
      setFactureNumber(fallbackId);
      return fallbackId;
    }
  };

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

  useEffect(() => {
    const loadData = async () => {
      const rawData = localStorage.getItem('facture_preview_data');
      if (rawData) {
        try {
          const decodedData = JSON.parse(rawData);
          const firstItem = decodedData[0];
          
          // ✅ Vérifier si c'est une modification
          const isModif = firstItem?.modification === true;
          setIsModification(isModif);
          
          // ✅ Stocker les données de réservation pour la mise à jour
          setReservationData(firstItem);

          // ✅ Générer le numéro de facture
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
                : 0
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
            isModification: isModif
          });
        } catch (e) { 
          console.error('Erreur chargement données:', e); 
        }
      }
    };
    
    loadData();
  }, []);

  // ============================================
  // HANDLE PRINT AND SAVE - CORRIGÉ
  // ============================================
  const handlePrintAndSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      // ✅ Imprimer d'abord
      window.print();

      const rawData = localStorage.getItem('facture_preview_data');
      if (!rawData) {
        throw new Error('Aucune donnée trouvée');
      }
      
      const items = JSON.parse(rawData);
      const firstItem = items[0];

      // ✅ Vérifier si c'est une modification
      const isModification = firstItem?.modification === true;

      // ✅ Si c'est une modification, on met à jour la réservation existante
      if (isModification && firstItem?.panelDocId && firstItem?.faceIndex !== undefined) {
        console.log('🔄 Mise à jour de la réservation existante (modification)');
        
        const panneauRef = doc(db, "panneaux", firstItem.panelDocId);
        const panneauSnap = await getDoc(panneauRef);

        if (panneauSnap.exists()) {
          const data = panneauSnap.data();
          const currentFaces = [...(data.faces || [])];
          const faceIndex = firstItem.faceIndex;
          
          if (currentFaces[faceIndex]) {
            const faceReservations = currentFaces[faceIndex].reservations || [];
            
            const updatedReservations = faceReservations.map((r: any) => {
              const isMatch = 
                r.createdAt === firstItem.createdAt || 
                (r.dateDebut === firstItem.dateDebut && 
                 r.societeLocatrice === firstItem.societeLocatrice);
              
              if (isMatch) {
                return {
                  ...r,
                  agentEmail: firstItem.agentEmail || r.agentEmail,
                  agentNom: firstItem.agentNom || r.agentNom,
                  societeLocatrice: firstItem.societeLocatrice || r.societeLocatrice,
                  dateDebut: firstItem.dateDebut || r.dateDebut,
                  dateFin: firstItem.dateFin || r.dateFin,
                  montant: firstItem.montant || r.montant,
                  ancienAgentEmail: firstItem.ancienAgentEmail || r.agentEmail,
                  ancienAgentNom: firstItem.ancienAgentNom || r.agentNom,
                  ancienneSociete: firstItem.ancienneSociete || r.societeLocatrice,
                  ancienneDateDebut: firstItem.ancienneDateDebut || r.dateDebut,
                  ancienneDateFin: firstItem.ancienneDateFin || r.dateFin,
                  ancienMontant: firstItem.ancienMontant || r.montant,
                  modification: true,
                  modifiePar: firstItem.modifiePar || 'admin',
                  modifieParNom: firstItem.modifieParNom || 'Administrateur',
                  modifieLe: firstItem.modifieLe || new Date().toISOString(),
                  dateModification: new Date().toISOString(),
                  facturee: "oui",
                  modePaiement: firstItem.modePaiement || r.modePaiement || 'total',
                  nombreTranches: firstItem.nombreTranches || r.nombreTranches || 1
                };
              }
              return r;
            });
            
            currentFaces[faceIndex].reservations = updatedReservations;
            await updateDoc(panneauRef, { faces: currentFaces });
          }
        }
      } else {
        // ✅ Si c'est une nouvelle réservation (pas de modification)
        for (const item of items) {
          if (item.panelDocId && item.faceIndex !== undefined) {
            const panneauRef = doc(db, "panneaux", item.panelDocId);
            const panneauSnap = await getDoc(panneauRef);

            if (panneauSnap.exists()) {
              const currentFaces = [...panneauSnap.data().faces];
              const updatedReservations = currentFaces[item.faceIndex].reservations.map((res: any) => {
                if (res.dateDebut === item.dateDebut && res.agentEmail === item.agentEmail) {
                  return { 
                    ...res, 
                    facturee: "oui",
                    modePaiement: item.modePaiement || 'total',
                    nombreTranches: item.nombreTranches || 1
                  };
                }
                return res;
              });

              currentFaces[item.faceIndex].reservations = updatedReservations;
              await updateDoc(panneauRef, { faces: currentFaces });
            }
          }
        }
      }

      // ✅ Enregistrer la facture avec le numéro généré
      await addDoc(collection(db, "factures"), {
        factureIdFormat: factureNumber || factureData.factureId,
        clientNom: factureData.client || "CLIENT INCONNU",
        agentNom: factureData.agent || "N/A",
        agentEmail: factureData.email || "",
        totalHT: Number(factureData.totalHT) || 0,
        dateCreation: new Date().toISOString(),
        dateValidation: new Date().toISOString(),
        lignes: factureData.lignes.map((l: any) => ({
          qte: l.qte || 1,
          idFace: l.idFace || "N/A",
          label: l.label || "",
          adresse: l.adresse || "",
          pu: l.pu || 0,
          total: l.total || 0,
          dateDebut: l.dateDebut || "",
          dateFin: l.dateFin || "",
          type: l.type || "Vinyle",
          modePaiement: l.modePaiement || "total",
          nombreTranches: l.nombreTranches || 1,
          montantParTranche: l.montantParTranche || 0
        })),
        statut: "Validée",
        statutPaiement: "Payé",
        validationComptable: true,
        estModification: isModification || false,
        ancienAgentNom: firstItem?.ancienAgentNom || '',
        ancienneSociete: firstItem?.ancienneSociete || '',
        modifiePar: firstItem?.modifiePar || 'admin',
        modifieParNom: firstItem?.modifieParNom || 'Administrateur'
      });

      alert("✅ Facture enregistrée avec succès !");
      
      // ✅ Nettoyer localStorage
      localStorage.removeItem('facture_preview_data');
      
      // ✅ Rediriger après 2 secondes
      setTimeout(() => {
        router.back();
      }, 2000);

    } catch (error) {
      console.error("Erreur:", error);
      alert("❌ Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!factureData) return null;

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

          {/* NUMÉRO DE FACTURE - FORMAT AAAAMMJJ + NUMÉRO SÉQUENTIEL */}
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

          {/* DATE - DATE DU JOUR */}
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