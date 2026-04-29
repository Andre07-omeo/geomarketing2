"use client";

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
// Ajout des imports Firebase manquants
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

// 1. Initialisation de Firebase sécurisée (en dehors du composant)
const firebaseConfig = {
  apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
  authDomain: "kin-geo-market.firebaseapp.com",
  projectId: "kin-geo-market",
  storageBucket: "kin-geo-market.firebasestorage.app",
  messagingSenderId: "50335362445",
  appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const DispromaltPrintLayer = () => {
  const router = useRouter();
  const [factureData, setFactureData] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false); // Pour éviter les doubles clics

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
          return {
            qte,
            idFace: item.idFace,
            label: item.faceLabel,
            adresse: item.adresse,
            pu,
            total,
            dateDebut: item.dateDebut || "...",
            dateFin: item.dateFin || "...",
            type: item.type || "N/A"
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
      // 1. Impression
      window.print();

      // 2. Traçabilité
      const rawData = localStorage.getItem('facture_preview_data');
      if (!rawData) return;
      const items = JSON.parse(rawData);

      // 3. Enregistrement Facture
      // 3. Enregistrement Facture avec sécurité contre les "undefined"
      await addDoc(collection(db, "factures"), {
        factureIdFormat: factureData.factureId || "SANS-ID",
        clientNom: factureData.client || "CLIENT INCONNU",
        agentNom: factureData.agent || "N/A",
        agentEmail: factureData.email || "", // Si c'est undefined, on met une chaîne vide
        totalHT: Number(factureData.totalHT) || 0,
        dateCreation: serverTimestamp(),
        // On s'assure que chaque ligne n'a pas de champ undefined
        lignes: factureData.lignes.map((l: any) => ({
          qte: l.qte || 1,
          idFace: l.idFace || "N/A",
          label: l.label || "",
          adresse: l.adresse || "",
          pu: l.pu || 0,
          total: l.total || 0,
          dateDebut: l.dateDebut || "",
          dateFin: l.dateFin || "",
          type: l.type || "Vinyle"
        })),
        statut: "Validée"
      });

      // 4. Update Statut "facturee"
      for (const item of items) {
        if (item.panelDocId && item.faceIndex !== undefined) {
          const panneauRef = doc(db, "panneaux", item.panelDocId);
          const panneauSnap = await getDoc(panneauRef);

          if (panneauSnap.exists()) {
            const currentFaces = [...panneauSnap.data().faces];
            const updatedReservations = currentFaces[item.faceIndex].reservations.map((res: any) => {
              if (res.dateDebut === item.dateDebut && res.agentEmail === item.agentEmail) {
                return { ...res, facturee: "oui" };
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

  return (
    <div className="page-container">
      {/* Boutons en haut sur Mobile pour ne pas gêner */}
      <div className="no-print mobile-actions">
        <button className="btn-back" onClick={() => router.back()}>RETOUR</button>
        {/* On appelle notre nouvelle fonction ici */}
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


          {/* 0. NUMÉRO DE FACTURE */}
          <div style={{
            position: 'absolute',
            top: '75mm',    // Ajuste la hauteur selon ton papier
            left: '50mm',  // Aligné avec la date
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#000'
          }}>
            {factureData.factureId}
          </div>

          {/* 1. DATE (déjà présent dans ton code, juste pour repère) */}
          <div style={{ position: 'absolute', top: '65mm', left: '155mm', fontSize: '17px' }}>
            {new Date().toLocaleDateString('fr-FR')}
          </div>
          <div style={{ position: 'absolute', top: '65mm', left: '155mm', fontSize: '17px' }}>
            {new Date().toLocaleDateString('fr-FR')}
          </div>

          {/* 2. RECTANGLE INFOS */}
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

          {/* 3. TABLEAU */}
          <div style={{ position: 'absolute', top: '100mm', left: '5mm', width: '180mm' }}>
            {factureData.lignes.map((l: any, i: number) => (
              <div key={i} style={{ display: 'flex', height: '15.5mm', alignItems: 'center', fontSize: '12px' }}>

                {/* 1. QUANTITÉ */}
                <div style={{ width: '22mm', textAlign: 'center' }}>
                  {l.qte}
                </div>

                {/* 2. DÉSIGNATION ENRICHIE */}
                <div style={{ width: '105mm', paddingLeft: '5mm', lineHeight: '1.2' }}>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px' }}>
                    {l.idFace} - {l.label}
                  </div>
                  <div style={{ fontSize: '10px', color: '#111' }}>
                    {l.adresse} {l.ville ? `(${l.ville})` : ''}
                  </div>
                  <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#555' }}>
                    {/* On vérifie l.type ET l.displayType au cas où */}
                    <span>Type: {l.displayType || l.type || 'Vinyle'}</span>

                    <span style={{ marginLeft: '10px' }}>
                      Période: {l.dateDebut} au {l.dateFin}
                    </span>

                  </div>
                </div>

                {/* 3. PRIX UNITAIRE */}
                <div style={{ width: '25mm', textAlign: 'right', paddingRight: '5mm' }}>
                  {Number(l.pu).toLocaleString()}
                </div>

                {/* 4. PRIX TOTAL */}
                <div style={{ width: '28mm', textAlign: 'right' }}>
                  {Number(l.total).toLocaleString()}
                </div>

              </div>
            ))}
          </div>

          {/* 4. TOTAL */}
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
                
                /* Conteneur de zoom pour mobile */
                .zoom-wrapper {
                    margin-top: 80px; /* Espace pour les boutons mobiles */
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

                /* Ajustements pour les très petits écrans */
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