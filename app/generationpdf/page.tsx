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
import { getFirestore, collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

const app = getApps().length > 0 ? getApp() : initializeApp(config.firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const DispromaltPrintLayer = () => {
  const router = useRouter();
  const [factureData, setFactureData] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

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
    const rawData = localStorage.getItem('facture_preview_data');
    if (rawData) {
      try {
        const decodedData = JSON.parse(rawData);
        let cumulHT = 0;
        const lines = decodedData.map((item: any) => {
          const pu = Number(item.prixSaisi || 0);
          const qte = Number(item.dureeMois || 1);
          const total = pu * qte;
          cumulHT += total;
          
          const modePaiement = item.modePaiement || 'total';
          const nombreTranches = item.nombreTranches || 1;
          
          return {
            qte,
            idFace: item.idFace,
            label: item.faceLabel,
            adresse: item.adresse,
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
          factureId: decodedData[0].factureIdFormat || "N/A",
          client: decodedData[0].societeLocatrice,
          agent: decodedData[0].agentNom || "N/A",
          email: decodedData[0].agentEmail || "",
          lignes: lines,
          totalHT: cumulHT,
        });
      } catch (e) { console.error(e); }
    }
  }, []);

  const handlePrintAndSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      window.print();

      const rawData = localStorage.getItem('facture_preview_data');
      if (!rawData) return;
      const items = JSON.parse(rawData);

      await addDoc(collection(db, "factures"), {
        factureIdFormat: factureData.factureId || "SANS-ID",
        clientNom: factureData.client || "CLIENT INCONNU",
        agentNom: factureData.agent || "N/A",
        agentEmail: factureData.email || "",
        totalHT: Number(factureData.totalHT) || 0,
        dateCreation: serverTimestamp(),
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
        statut: "Validée"
      });

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
      alert("Facture enregistrée avec succès !");
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!factureData) return null;

  // Fonction pour afficher le texte du mode de paiement dans la désignation
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
          {isSaving ? "ENREGISTREMENT..." : "IMPRIMER & VALIDER"}
        </button>
      </div>

      <div className="zoom-wrapper" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
        <div className="sheet">

          {/* NUMÉRO DE FACTURE */}
          <div style={{
            position: 'absolute',
            top: '75mm',
            left: '50mm',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#000'
          }}>
            {factureData.factureId}
          </div>

          {/* DATE */}
          <div style={{ position: 'absolute', top: '65mm', left: '155mm', fontSize: '17px' }}>
            {new Date().toLocaleDateString('fr-FR')}
          </div>

          {/* RECTANGLE INFOS CLIENT */}
          <div style={{ position: 'absolute', top: '75mm', left: '128mm', width: '65mm', lineHeight: '1.5' }}>
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
          <div style={{ position: 'absolute', top: '100mm', left: '5mm', width: '180mm' }}>
            {factureData.lignes.map((l: any, i: number) => (
              <div key={i} style={{ display: 'flex', minHeight: '15.5mm', alignItems: 'flex-start', fontSize: '12px', marginBottom: '5px' }}>

                {/* QUANTITÉ */}
                <div style={{ width: '22mm', textAlign: 'center', paddingTop: '5px' }}>
                  {l.qte}
                </div>

                {/* DÉSIGNATION - LE MESSAGE EST ICI */}
                <div style={{ width: '105mm', paddingLeft: '5mm', paddingTop: '5px', lineHeight: '1.3' }}>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px' }}>
                    {l.idFace} - {l.label}
                  </div>
                  <div style={{ fontSize: '10px', color: '#111' }}>
                    {l.adresse}
                  </div>
                  <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#555' }}>
                    <span>Type: {l.type || 'Vinyle'}</span>
                    <span style={{ marginLeft: '10px' }}>Période: {l.dateDebut} au {l.dateFin}</span>
                  </div>
                  {/* ✅ MESSAGE DE PAIEMENT DANS LA DÉSIGNATION */}
                  {getPaymentInfoInDesignation(l)}
                </div>

                {/* PRIX UNITAIRE */}
                <div style={{ width: '25mm', textAlign: 'right', paddingRight: '5mm', paddingTop: '5px' }}>
                  {Number(l.pu).toLocaleString()}
                </div>

                {/* PRIX TOTAL */}
                <div style={{ width: '28mm', textAlign: 'right', paddingTop: '5px' }}>
                  {Number(l.total).toLocaleString()}
                </div>

              </div>
            ))}
          </div>

          {/* TOTAL À PAYER */}
          <div style={{ position: 'absolute', top: '189mm', left: '160mm', width: '30mm', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>
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

        .btn-print { background: #27ae60; color: white; border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; border-radius: 5px; }
        .btn-back { background: #e74c3c; color: white; border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; border-radius: 5px; }

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