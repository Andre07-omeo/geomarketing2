"use client";

import React, { useState, useEffect } from 'react';
import {
  FileDown, PlusCircle, MinusCircle, TrendingUp,
  LayoutDashboard, Receipt, CreditCard, FileSpreadsheet,
  FileText, Search, CheckCircle2
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from 'exceljs';

// FIREBASE IMPORTS
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, query, where, getDocs,
  doc, updateDoc, addDoc, serverTimestamp
} from "firebase/firestore";

// INITIALIZATION FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
  authDomain: "kin-geo-market.firebaseapp.com",
  projectId: "kin-geo-market",
  storageBucket: "kin-geo-market.firebasestorage.app",
  messagingSenderId: "50335362445",
  appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const CLOUDINARY_UPLOAD_PRESET = "dispromalt_preset";
const CLOUDINARY_CLOUD_NAME = "dn7wnikzp";

export default function AccountingDashboard() {
  // --- ÉTATS POUR LA CAISSE ---
  const [searchKey, setSearchKey] = useState("");
  const [factureTrouvee, setFactureTrouvee] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<'ENTREE' | 'SORTIE' | 'ENCAISSER' | null>(null);

  const [validationData, setValidationData] = useState({
    nomComptable: "",
    cleValidationConfirmation: "",
    imageFile: null as File | null
  });

  // --- ÉTATS POUR LE DASHBOARD ---
  const [data, setData] = useState({
    invoices: [
      { id: 'INV-001', client: 'Vodacom', amount: 5000, status: 'Payée', method: 'Virement', type: 'ENTREE', dueDate: '2026-02-15' },
    ],
    cashFlow: { totalIn: 450000, totalOut: 280000 },
    profitabilityByZone: [
      { zone: 'Gombe', revenue: 150000, costs: 50000 },
      { zone: 'Limete', revenue: 80000, costs: 60000 },
    ]
  });

  const [formData, setFormData] = useState({ panneau: 'Gombe', duree: 1, method: 'Cash', amount: '', motif: '' });

  // --- LOGIQUE RECHERCHE FACTURE ---
  const handleSearchFacture = async () => {
    if (!searchKey) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "factures"),
        where("validationId", "==", searchKey),
        where("statutPaiement", "==", "En attente")
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        setFactureTrouvee({ id: querySnapshot.docs[0].id, ...docData });
      } else {
        alert("Clé invalide, expirée ou déjà approuvée.");
        setFactureTrouvee(null);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // --- UPLOAD CLOUDINARY ---
  const uploadToCloudinary = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "panneaux"); // Vérifiez bien l'orthographe
    try {
    const resp = await fetch(`https://api.cloudinary.com/v1_1/dn7wnikzp/image/upload`, {
      method: "POST",
      body: formData
    });

    const data = await resp.json();

    if (!resp.ok) {
      // Si Cloudinary refuse, on voit pourquoi ici :
      console.error("Détails Erreur Cloudinary:", data.error.message);
      throw new Error(data.error.message);
    }

    return data.secure_url; 
  } catch (error) {
    console.error("Erreur Fetch Cloudinary:", error);
    return null;
  }
};

const handleFinalApprobation = async () => {
  if (!validationData.nomComptable || !validationData.imageFile || !validationData.cleValidationConfirmation) {
    return alert("Champs obligatoires manquants.");
  }

  if (validationData.cleValidationConfirmation !== factureTrouvee.validationId) {
    return alert("La clé de confirmation ne correspond pas.");
  }

  setLoading(true);
  try {
    // 1. Upload Cloudinary
    const photoUrl = await uploadToCloudinary(validationData.imageFile);

    if (!photoUrl) {
      setLoading(false);
      return alert("Erreur lors de l'upload de l'image.");
    }

    // 2. Mise à jour de la FACTURE
    await updateDoc(doc(db, "factures", factureTrouvee.id), {
      statutPaiement: "Approuvé",
      validePar: validationData.nomComptable,
      dateValidation: serverTimestamp(),
      photoCampagneUrl: photoUrl 
    });

    // 3. MISE À JOUR DU PANNEAU (C'est ici que la correction a lieu)
    // On extrait l'ID du panneau (ex: "B") de l'ID complet (ex: "B-1")
    const idPanPrincipal = factureTrouvee.idFace.split('-')[0];
    
    const qPan = query(collection(db, "panneaux"), where("idPan", "==", idPanPrincipal));
    const panSnap = await getDocs(qPan);

    if (!panSnap.empty) {
      const pDoc = panSnap.docs[0];
      const panRef = doc(db, "panneaux", pDoc.id);
      
      // CORRECTION : On utilise f.id au lieu de f.idPan
      const updatedFaces = pDoc.data().faces.map((f: any) => {
        // On compare avec f.id car c'est le nom du champ dans votre map Firestore
        if (f.id === factureTrouvee.idFace) { 
          return { 
            ...f, 
            statut: "Occupé",
            urlPhotoCampagne: photoUrl 
          };
        }
        return f;
      });

      await updateDoc(panRef, { faces: updatedFaces });
    }

    // 4. Archive dans validerpanneaux
    await addDoc(collection(db, "validerpanneaux"), {
      idPan: factureTrouvee.idFace,
      urlPhotoCampagne: photoUrl,
      societe: factureTrouvee.nomSociete,
      montant: (factureTrouvee.prixUnitaire * factureTrouvee.moisLocation),
      dateValidation: serverTimestamp(),
      comptable: validationData.nomComptable
    });

    alert("Validation réussie ! Le statut est maintenant 'Occupé' dans la table de la face.");
    
    setFactureTrouvee(null);
    setShowConfirmModal(false);
    setSearchKey("");

  } catch (error) {
    console.error("Erreur:", error);
    alert("Une erreur est survenue lors de la mise à jour.");
  } finally {
    setLoading(false);
  }
};



  const balance = data.cashFlow.totalIn - data.cashFlow.totalOut;

  // --- RENDU ---
  return (
    <div className="flex min-h-screen bg-black text-white font-sans">
      {/* SIDEBAR */}
      <div className="w-64 border-r border-zinc-800 p-8 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-black mb-10 text-blue-500">DISPROMALT</h2>
          <nav className="space-y-6 text-sm">
            <button onClick={() => setActiveAction(null)} className="flex items-center gap-2 font-bold"><LayoutDashboard size={18} /> Dashboard</button>
            <button onClick={() => setActiveAction('ENCAISSER')} className="flex items-center gap-2 text-blue-400 font-bold"><Search size={18} /> Encaisser Facture</button>
            <button onClick={() => setActiveAction('SORTIE')} className="flex items-center gap-2 text-rose-500 font-bold"><MinusCircle size={18} /> Sortie Caisse</button>
          </nav>
        </div>
      </div>

      <div className="flex-1 p-10 overflow-y-auto">
        <h1 className="text-4xl font-black mb-8">Gestion Comptable</h1>

        {/* SECTION RECHERCHE / ENCAISSEMENT */}
        {activeAction === 'ENCAISSER' && (
          <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 mb-10">
            <h3 className="text-xl font-bold mb-6">Rechercher une Facture de Réservation</h3>
            <div className="flex gap-4">
              <input
                value={searchKey} onChange={(e) => setSearchKey(e.target.value)}
                placeholder="Entrez la clé VAL-XXXX"
                className="flex-1 bg-black p-4 rounded-xl border border-zinc-800"
              />
              <button onClick={handleSearchFacture} className="bg-blue-600 px-8 rounded-xl font-bold">Vérifier</button>
            </div>

            {factureTrouvee && (
              <div className="mt-8 p-6 bg-blue-600/10 border border-blue-500/30 rounded-2xl flex justify-between items-center animate-in fade-in">
                <div>
                  <p className="text-xs font-bold text-blue-400 uppercase">Facture trouvée</p>
                  <h4 className="text-2xl font-black">{factureTrouvee.nomSociete}</h4>
                  <p className="text-sm text-zinc-400">Support: {factureTrouvee.idFace} • {factureTrouvee.moisLocation} mois</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-500">{factureTrouvee.prixUnitaire * factureTrouvee.moisLocation} $</p>
                  <button onClick={() => setShowConfirmModal(true)} className="mt-2 bg-blue-600 px-4 py-2 rounded-lg text-xs font-bold">Valider Paiement</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STATS RAPIDES */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
            <p className="text-zinc-500 text-[10px] font-bold uppercase">Entrées</p>
            <p className="text-2xl font-black text-emerald-500">{data.cashFlow.totalIn.toLocaleString()} $</p>
          </div>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
            <p className="text-zinc-500 text-[10px] font-bold uppercase">Sorties</p>
            <p className="text-2xl font-black text-rose-500">{data.cashFlow.totalOut.toLocaleString()} $</p>
          </div>
          <div className="bg-blue-600 p-6 rounded-2xl">
            <p className="text-blue-200 text-[10px] font-bold uppercase">Solde Net</p>
            <p className="text-2xl font-black text-white">{balance.toLocaleString()} $</p>
          </div>
        </div>

        {/* TABLE DES TRANSACTIONS */}
        <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Receipt size={20} /> Historique</h3>
          <div className="space-y-4">
            {data.invoices.map((inv) => (
              <div key={inv.id} className="flex justify-between items-center p-4 bg-black rounded-xl border border-zinc-800">
                <div>
                  <p className="font-bold">{inv.client}</p>
                  <p className="text-[10px] text-zinc-500">{inv.dueDate} • {inv.method}</p>
                </div>
                <p className={`font-black ${inv.type === 'SORTIE' ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {inv.type === 'SORTIE' ? '-' : '+'}{inv.amount.toLocaleString()} $
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODALE DE VALIDATION COMPTABLE */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-zinc-900 border border-white/10 p-10 rounded-[2.5rem] max-w-lg w-full">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-2 text-blue-500">
              <CheckCircle2 /> Confirmation Finale
            </h3>

            <div className="space-y-4">
              <input
                placeholder="Nom du Comptable"
                className="w-full bg-black border border-zinc-800 p-4 rounded-xl"
                onChange={(e) => setValidationData({ ...validationData, nomComptable: e.target.value })}
              />
              <input
                placeholder="Ressaisir la Clé de Validation"
                className="w-full bg-black border border-zinc-800 p-4 rounded-xl"
                onChange={(e) => setValidationData({ ...validationData, cleValidationConfirmation: e.target.value })}
              />
              <div className="p-4 bg-black rounded-xl border border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 mb-2 uppercase">Photo de la Campagne (Obligatoire)</p>
                <input
                  type="file" accept="image/*"
                  onChange={(e) => setValidationData({ ...validationData, imageFile: e.target.files?.[0] || null })}
                  className="text-xs text-zinc-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <button onClick={() => setShowConfirmModal(false)} className="py-4 bg-zinc-800 rounded-xl font-bold">Annuler</button>
              <button
                onClick={handleFinalApprobation}
                disabled={loading}
                className="py-4 bg-emerald-600 rounded-xl font-bold"
              >
                {loading ? "Chargement..." : "Confirmer Encaissement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}