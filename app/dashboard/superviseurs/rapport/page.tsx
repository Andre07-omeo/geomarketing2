'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Download, CheckCircle2, AlertCircle,
  Calendar, Printer, ArrowUpRight, Loader2, Clock,
  ChevronDown, Database,
} from 'lucide-react';
import { motion, } from 'framer-motion';

// --- INITIALISATION FIREBASE DIRECTE ---
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp, getDocs, } from 'firebase/firestore';

import ExcelJS from 'exceljs'; // <--- NOUVEL IMPORT

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  FileText, FileSpreadsheet,
} from 'lucide-react';

import autoTable from 'jspdf-autotable'; // Importation de la fonction directe

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






// 1. Assure-toi d'avoir ces imports en haut de ton fichier

const envoyerAlerteClient = async (item: any) => {
  // Petite validation de sécurité
  if (!item || !item.idPan) {
    alert("Données du panneau manquantes.");
    return;
  }

  try {
    const dateExpirationAlerte = new Date();
    dateExpirationAlerte.setHours(dateExpirationAlerte.getHours() + 24);

    // Calcul de l'impact financier
    // Note: Assure-tu que 'prix' existe dans ton objet 'item'
    const prixMensuel = parseFloat(item.prix) || 0;
    const perteVisibiliteAnnuelle = (prixMensuel * 12).toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'USD',
    });

    // Construction du message formel
    const corpsMessage = `
OBJET : AVIS D'EXPIRATION ET OPPORTUNITÉ DE RENOUVELLEMENT - FACE ${item.idPan}

Cher partenaire ${item.clientNom || 'Client'},

Nous attirons votre attention sur le fait que votre contrat d'occupation pour l'emplacement situé à :
📍 ${item.adresse} (${item.zone}) 
arrive à son terme le ${item.dateFin || 'prochainement'}.

Cet emplacement stratégique vous offre actuellement une visibilité premium. En ne renouvelant pas ce contrat, vous libérez cet espace au profit de la concurrence et perdez un investissement publicitaire d'une valeur de ${perteVisibiliteAnnuelle} en impact annuel de visibilité.

Pour garantir le maintien de votre image sur ce site, merci de nous confirmer votre intention de renouvellement sous 24h.
    `.trim();

    const alerte = {
      type: "ALERTE_CLIENT",
      destinataire: item.clientNom || "Inconnu",
      libelle: `Relance Formelle : ${item.idPan}`,
      idFace: item.idPan,
      adresse: item.adresse,
      messageComplet: corpsMessage,
      // Utilisation de la classe Timestamp importée
      dateExpirationAlerte: Timestamp.fromDate(dateExpirationAlerte),
      metadata: {
        perteEstimee: perteVisibiliteAnnuelle,
        idPan: item.idPan,
        commune: item.zone
      },
      statut: "En attente d'envoi",
      createdAt: Timestamp.now()
    };

    // Envoi vers la collection 'messages_clients'
    await addDoc(collection(db, "messages_clients"), alerte);

    alert(`✅ Dossier de relance généré pour ${item.clientNom || 'le client'}.`);

  } catch (error: any) {
    console.error("Erreur Firestore :", error);
    alert(`Erreur technique : ${error.message}`);
  }
};



// --- COMPOSANT PRINCIPAL ---
export default function DisproReporting() {
  // --- ÉTATS ---
  const [loading, setLoading] = useState(true);
  const [rawPanneaux, setRawPanneaux] = useState<any[]>([]);
  const [filter, setFilter] = useState({
    zone: 'Tous',
    type: 'Tous',
    statut: 'Tous',
    search: '',
    format: 'Tous',
    support: 'Tous',
    district: 'Tous',
    moisRestants: 'Tous', // <--- IMPORTANT
    moisLoue: 'Tous',     // <--- IMPORTANT
    anneeLoue: "2026"
    // anneeLoue: new Date().getFullYear().toString()
  });


  const [editingCell, setEditingCell] = useState<any>(null);

  // RÉCUPÉRATION DES DONNÉES
  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, "panneaux"));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRawPanneaux(data);
      } catch (err) {
        console.error("Erreur Firebase:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);







 
const exportToExcel = async () => {
  if (!filteredData || filteredData.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Inventaire DISPRO');

  // --- 1. PRÉPARATION DES COLONNES ---
  const columns = [
    { name: 'RÉFÉRENCE', filterButton: true },
    { name: 'SITE / ADRESSE', filterButton: true },
    { name: 'ZONE GÉOGRAPHIQUE', filterButton: true },
    { name: 'TYPE DE SUPPORT', filterButton: true },
    { name: 'STATUT ACTUEL', filterButton: true },
    { name: 'CLIENT / LOCATAIRE', filterButton: true },
    { name: "DATE D'ÉCHÉANCE", filterButton: true },
  ];

  // --- 2. PRÉPARATION DES DONNÉES ---
  const rows = filteredData.map(item => [
    item.idPan,
    item.adresse.toUpperCase(),
    item.zone,
    item.supportType,
    item.statut.toUpperCase(),
    item.clientNom || 'DISPONIBLE (LIBRE)',
    item.dateFin || '---'
  ]);

  // --- 3. AJOUT DU TABLEAU NATIF (Style identique à ton image) ---
  worksheet.addTable({
    name: 'TableauInventaire',
    ref: 'A1',
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium2', // Bleu officiel Excel
      showRowStripes: true,
    },
    columns: columns,
    rows: rows,
  });

  // --- 4. RÉGLAGES MAGNIFIQUES (Design & Ergonomie) ---
  
  // Ajustement des largeurs de colonnes
  const widths = [15, 45, 25, 20, 20, 35, 20];
  widths.forEach((w, i) => {
    worksheet.getColumn(i + 1).width = w;
  });

  // Style des lignes (Hauteur et Alignement)
  worksheet.eachRow((row, rowNumber) => {
    row.height = 22; // Lignes plus aérées
    row.eachCell((cell, colNumber) => {
      cell.alignment = { 
        vertical: 'middle', 
        horizontal: (colNumber === 1 || colNumber === 5) ? 'center' : 'left' 
      };
    });
  });

  // --- 5. COLORATION CONDITIONNELLE (Statuts) ---
  (worksheet as any).addConditionalFormatting({
    ref: `E2:E${rows.length + 1}`,
    rules: [
      {
        type: 'containsText',
        operator: 'containsText',
        text: 'OCCUPÉ',
        formulae: [`NOT(ISERROR(SEARCH("OCCUPÉ",E2)))`], 
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }, // Vert clair
          font: { color: { argb: 'FF15803D' }, bold: true } // Texte vert foncé
        },
      },
      {
        type: 'containsText',
        operator: 'containsText',
        text: 'LIBRE',
        formulae: [`NOT(ISERROR(SEARCH("LIBRE",E2)))`],
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }, // Rouge clair
          font: { color: { argb: 'FFB91C1C' }, bold: true } // Texte rouge foncé
        },
      }
    ]
  });

  // --- 6. VUE PROFESSIONNELLE (Volets figés et Grille masquée) ---
  worksheet.views = [
    {
      state: 'frozen',
      xSplit: 0,
      ySplit: 1, // L'en-tête reste visible au scroll
      showGridLines: false, // Rend le fichier beaucoup plus propre (Dashboard style)
      activeCell: 'A2'
    }
  ];

  // --- 7. GÉNÉRATION ET TÉLÉCHARGEMENT ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  const dateStr = new Date().toLocaleDateString().replace(/\//g, '-');
  a.href = url;
  a.download = `DISPRO_INVENTAIRE_PRO_${dateStr}.xlsx`;
  a.click();
  
  window.URL.revokeObjectURL(url);
};







  const exportToPDF = () => {
    if (!filteredData || filteredData.length === 0) return;

    const doc = new jsPDF('l', 'mm', 'a4');
    const now = new Date();

    // Calcul des stats
    const total = filteredData.length;
    const occupes = filteredData.filter((i: any) => i.statut === 'Occupé').length;
    const taux = ((occupes / total) * 100).toFixed(1);

    // --- 1. FONCTION INTERNE POUR LES STATS (Règle l'erreur label, value, x) ---
    const drawStat = (label: string, value: string, xPos: number) => {
      doc.setFillColor(30, 41, 59); // Slate 800
      doc.roundedRect(xPos, 12, 45, 20, 3, 3, 'F');

      doc.setTextColor(148, 163, 184); // Slate 400
      doc.setFontSize(7);
      doc.text(label, xPos + 5, 18);

      doc.setTextColor(255, 255, 255); // Blanc
      doc.setFontSize(12);
      doc.text(value, xPos + 5, 27);
    };

    // --- 2. HEADER DESIGN ---
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 40, 'F');
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 38, 297, 2, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("DISPRO", 14, 20);
    doc.setTextColor(212, 175, 55);
    doc.text(".INTEL", 50, 20);

    // Appel des stats (On utilise les paramètres définis plus haut)
    drawStat("TOTAL FACES", total.toString(), 140);
    drawStat("OCCUPATION", `${taux}%`, 190);
    drawStat("GÉNÉRÉ LE", now.toLocaleDateString(), 240);

    // --- 3. TABLEAU ---
    autoTable(doc, {
      head: [["ID", "SITE / ADRESSE", "ZONE", "TYPE", "STATUT", "CLIENT", "ÉCHÉANCE"]],
      body: filteredData.map((item: any) => [
        item.idPan,
        item.adresse.toUpperCase(),
        item.zone,
        item.supportType,
        item.statut.toUpperCase(),
        item.clientNom || '---',
        item.dateFin || 'DISPONIBLE'
      ]),
      startY: 50,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 64, 175] },

      // --- FIX ERREUR data.cell.raw ---
      didParseCell: (data) => {
        // On vérifie si on est dans le corps du tableau et sur la colonne Statut (index 4)
        if (data.section === 'body' && data.column.index === 4) {
          // Sécurisation du contenu de la cellule
          const rawValue = data.cell.raw ? data.cell.raw.toString().toUpperCase() : '';

          if (rawValue === 'OCCUPÉ') {
            data.cell.styles.textColor = [22, 163, 74]; // Vert
          } else if (rawValue === 'LIBRE' || rawValue === 'DISPONIBLE') {
            data.cell.styles.textColor = [220, 38, 38]; // Rouge
          }
        }
      }
    });

    doc.save(`RAPPORT_STRATEGIQUE_${now.getTime()}.pdf`);
  };








  const filteredData = useMemo(() => {
    if (!rawPanneaux || rawPanneaux.length === 0) return []; // <-- Sécurité supplémentaire

    const now = new Date();
    const currentYear = now.getFullYear();

    // --- ÉTAPE 1 : APLATISSEMENT ---
    // On ajoute :any pour p et f pour supprimer les erreurs de type
    let flattened = rawPanneaux.flatMap((p: any) =>
      (p.faces || []).map((f: any) => {
        const dFin = f.dateFin ? new Date(f.dateFin) : null;
        const dDebut = f.dateDebut ? new Date(f.dateDebut) : null;

        let moisRestantsCount = -1;
        if (dFin && f.statut === 'Occupé') {
          moisRestantsCount = (dFin.getFullYear() - now.getFullYear()) * 12 + (dFin.getMonth() - now.getMonth());
        }

        return {
          ...f,
          parentDocId: p.id,
          adresse: p.adresse || "N/A",
          zone: p.zone || "Inconnue",
          idPan: p.idPan || "N/A",
          // On récupère le type de support soit sur la face, soit sur le panneau
          supportType: f.type || p.type || "Inconnu",
          dFin,
          dDebut,
          moisRestantsCount
        };
      })
    );

    // --- ÉTAPE 2 : FILTRAGE ---
    return flattened.filter((item: any) => {
      // 1. Filtres Classiques
      const matchZone = filter.zone === 'Tous' || item.zone === filter.zone;
      const matchStatut = filter.statut === 'Tous' || item.statut === filter.statut;
      const matchSupport = filter.support === 'Tous' || item.supportType === filter.support;

      // 2. Filtre Échéance
      let matchEcheance = true;
      if (filter.moisRestants !== 'Tous') {
        const limite = parseInt(filter.moisRestants);
        matchEcheance = item.moisRestantsCount <= limite && item.moisRestantsCount >= 0;
      }

      // 3. Filtre "Loué en..."
      let matchMoisLoue = true;
      if (filter.moisLoue !== 'Tous') {
        if (item.dDebut && item.dFin) {
          const moisCible = parseInt(filter.moisLoue as string) - 1;

          // CORRECTION ICI : On force le type ou on utilise currentYear si anneeLoue est absent
          const anneeChoisie = (filter as any).anneeLoue || currentYear.toString();
          const anneeCible = parseInt(anneeChoisie);

          const debutMoisCible = new Date(anneeCible, moisCible, 1);
          const finMoisCible = new Date(anneeCible, moisCible + 1, 0);

          matchMoisLoue = (item.dDebut <= finMoisCible && item.dFin >= debutMoisCible);
        } else {
          matchMoisLoue = false;
        }
      }

      // 4. Recherche Textuelle
      const searchTerm = (filter.search || "").toLowerCase();
      const matchSearch =
        item.adresse.toLowerCase().includes(searchTerm) ||
        item.idPan.toLowerCase().includes(searchTerm) ||
        (item.clientNom && item.clientNom.toLowerCase().includes(searchTerm));

      return matchZone && matchStatut && matchSupport && matchEcheance && matchMoisLoue && matchSearch;
    });
  }, [rawPanneaux, filter]);



  // --- AFFICHAGE CHARGEMENT ---
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#000a1a] gap-4">
      <Loader2 className="animate-spin text-[#FFD700]" size={50} />
      <p className="text-[#FFD700] font-black text-[10px] uppercase tracking-[0.3em]">
        Intelligence Dispromalt...
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#000a1a] text-white p-4 md:p-10 font-sans selection:bg-[#FFD700] selection:text-black">

      {/* HEADER LUXE */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-1 bg-[#E31E24]" />
            <h1 className="text-5xl font-black italic tracking-tighter">Rapport<span className="text-[#FFD700]">.</span>Général</h1>
          </div>
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.5em] flex items-center gap-2">
            <Database size={12} /> Real-time Inventory Analysis
          </p>
        </div>

        <div className="flex flex-wrap gap-4 z-20 relative">
          {/* IMPRIMER */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-3 px-6 py-4 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl hover:border-[#1e40af] text-slate-600 hover:text-[#1e40af] transition-all font-black text-[10px] uppercase shadow-sm active:scale-95 group"
          >
            <Printer size={18} className="group-hover:rotate-12 transition-transform" />
            <span>Imprimer</span>
          </button>

          {/* EXPORT EXCEL */}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-black text-[10px] uppercase shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            <FileSpreadsheet size={18} />
            <span>Excel</span>
          </button>

          {/* EXPORT PDF */}
          <button
            onClick={exportToPDF}
            className="flex items-center gap-3 px-6 py-4 bg-[#0F172A] text-white rounded-2xl hover:bg-[#1e40af] transition-all font-black text-[10px] uppercase shadow-lg shadow-slate-900/20 active:scale-95 group"
          >
            <FileText size={18} className="text-[#d4af37] group-hover:text-white transition-colors" />
            <span>PDF</span>
          </button>
        </div>
      </header>

      {/* FILTRES AVANCÉS */}
      <section className="bg-[#1e40af]/60 backdrop-blur-3xl border border-white/10 p-6 rounded-[3rem] mb-10 shadow-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 print:hidden relative z-10">

        {/* 1. RECHERCHE PRINCIPALE */}
        <div className="xl:col-span-2 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#d4af37]/60" size={18} />
          <input
            type="text"
            placeholder="SITE, CLIENT, ID..."
            className="w-full pl-12 pr-4 py-4 bg-black/30 border border-white/10 rounded-2xl outline-none focus:border-[#d4af37] transition-all text-[10px] font-bold uppercase tracking-widest text-white placeholder:text-white/30 focus:bg-black/50"
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </div>

        {/* FILTRE ÉCHÉANCE */}
        <div className="relative">
          <select
            className="w-full px-5 py-4 bg-black/30 border border-white/10 rounded-2xl outline-none focus:border-[#d4af37] appearance-none text-[10px] font-black uppercase text-white/80 cursor-pointer"
            onChange={(e) => setFilter({ ...filter, moisRestants: e.target.value })}
          >
            <option value="Tous" className="bg-[#1e40af]">Échéance : Toutes</option>
            <option value="0" className="bg-[#1e40af]">Expire ce mois-ci</option>
            <option value="3" className="bg-[#1e40af]">Expire sous 3 mois</option>
            <option value="6" className="bg-[#1e40af]">Expire sous 6 mois</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={14} />
        </div>

        {/* FILTRE MOIS DE LOCATION */}
        <div className="relative">
          <select
            className="w-full px-5 py-4 bg-black/30 border border-white/10 rounded-2xl outline-none focus:border-[#d4af37] appearance-none text-[10px] font-black uppercase text-white/80 cursor-pointer"
            onChange={(e) => setFilter({ ...filter, moisLoue: e.target.value })}
          >
            <option value="Tous" className="bg-[#1e40af]">Loué en...</option>
            {["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"].map((m, i) => (
              <option key={m} value={i + 1} className="bg-[#1e40af]">{m}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={14} />
        </div>

        {/* 4. SUPPORT */}
        <div className="relative">
          <select
            className="w-full px-5 py-4 bg-black/30 border border-white/10 rounded-2xl outline-none focus:border-[#d4af37] appearance-none text-[10px] font-black uppercase cursor-pointer text-white/80"
            onChange={(e) => setFilter({ ...filter, support: e.target.value })}
          >
            <option value="Tous" className="bg-[#1e40af]">Supports : Tous</option>
            <option value="Vinyle" className="bg-[#1e40af]">Vinyle</option>
            <option value="LED" className="bg-[#1e40af]">LED</option>
            <option value="Bache" className="bg-[#1e40af]">Bâche</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={14} />
        </div>

        {/* 5. COMMUNE / ZONE */}
        <div className="relative">
          <select
            className="w-full px-5 py-4 bg-black/30 border border-white/10 rounded-2xl outline-none focus:border-[#d4af37] appearance-none text-[10px] font-black uppercase cursor-pointer text-white/80"
            onChange={(e) => setFilter({ ...filter, zone: e.target.value })}
          >
            <option value="Tous" className="bg-[#1e40af]">Communes : Toutes</option>
            {Array.from(new Set(rawPanneaux.map((p: any) => p.zone).filter(Boolean))).map((z) => (
              <option key={z} value={z} className="bg-[#1e40af]">{z}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={14} />
        </div>

        {/* 6. STATUT (L'élément d'action en OR) */}
        <div className="relative">
          <select
            className="w-full px-5 py-4 bg-[#d4af37] text-black border-none rounded-2xl outline-none font-black text-[10px] uppercase cursor-pointer shadow-lg shadow-[#d4af37]/20 hover:bg-white transition-all appearance-none"
            onChange={(e) => setFilter({ ...filter, statut: e.target.value })}
          >
            <option value="Tous">Statut : Tous</option>
            <option value="Libre">Disponible</option>
            <option value="Occupé">Occupé</option>
            <option value="En Maintenance">Maintenance</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" size={14} />
        </div>

      </section>

      {/* CONTAINER PRINCIPAL AVEC LA COULEUR DE LA NAV ET BLUR */}
      <div className="bg-[#1e40af]/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 overflow-hidden shadow-3xl relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              {/* Header légèrement plus sombre pour le contraste */}
              <tr className="bg-[#1e40af]/40 border-b border-white/10">
                <th className="p-8 text-[11px] font-black uppercase text-[#d4af37] tracking-widest">Site / Identifiant</th>
                <th className="p-8 text-[11px] font-black uppercase text-[#d4af37] tracking-widest">Catégorie</th>
                <th className="p-8 text-[11px] font-black uppercase text-[#d4af37] tracking-widest text-center">Statut Actuel</th>
                <th className="p-8 text-[11px] font-black uppercase text-[#d4af37] tracking-widest">Locataire</th>
                <th className="p-8 text-[11px] font-black uppercase text-[#d4af37] tracking-widest">Échéance</th>
                <th className="p-8 text-[11px] font-black uppercase text-[#d4af37] tracking-widest text-right">Détails</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {filteredData.map((item, idx) => (
                <motion.tr
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="hover:bg-white/[0.05] transition-all group"
                >
                  {/* COLONNE IDENTIFIANT */}
                  <td className="p-8">
                    <div className="flex items-center gap-5">
                      {/* Utilisation de l'or #d4af37 pour matcher le logo */}
                      <div className="bg-[#d4af37]/10 h-14 w-14 flex items-center justify-center rounded-2xl border border-[#d4af37]/20 font-black text-[#d4af37]">
                        {item.idPan}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white leading-tight uppercase group-hover:text-[#d4af37] transition-colors">
                          {item.adresse}
                        </p>
                        <p className="text-[9px] font-bold text-blue-200/60 mt-1 tracking-widest uppercase">
                          {item.zone}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* COLONNE CATÉGORIE */}
                  <td className="p-8">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-blue-100 uppercase">{item.type}</span>
                      <span className="text-[9px] font-bold text-white/20 uppercase italic">{item.sens || 'FACE UNIQUE'}</span>
                    </div>
                  </td>

                  {/* COLONNE STATUT */}
                  <td className="p-8 text-center">
                    <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-xl font-black text-[9px] uppercase italic tracking-tighter ${item.statut === 'Libre'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                      {item.statut === 'Libre' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      {item.statut}
                    </div>
                  </td>

                  {/* COLONNE CLIENT */}
                  <td className="p-8">
                    <span className="text-xs font-black text-white/80 uppercase">
                      {item.clientNom || 'DISPONIBLE'}
                    </span>
                  </td>

                  {/* COLONNE ÉCHÉANCE */}
                  <td className="p-8 font-mono text-xs">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[#d4af37]">
                        <Calendar size={14} />
                        {item.dateFin || '-- / -- / --'}
                      </div>
                      {item.moisRestantsCount <= 2 && item.statut === 'Occupé' && (
                        <span className="text-[8px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full w-fit animate-pulse">
                          EXPIRATION ({item.moisRestantsCount} mois)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* COLONNE ACTIONS */}
                  <td className="p-8 text-right">
                    <button
                      onClick={() => envoyerAlerteClient(item)}
                      className="p-4 bg-white/5 rounded-2xl hover:bg-[#d4af37] transition-all text-[#d4af37] hover:text-black border border-white/5"
                    >
                      <ArrowUpRight size={20} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* FOOTER ANALYTICS */}
      <footer className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6 p-10 bg-[#1e40af]/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl relative z-10">

        {/* TEXTE COPYRIGHT AVEC L'OR SIGNATURE */}
        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-black uppercase text-white/40 tracking-[0.4em]">
            Dispromalt Intelligence Service © 2026 Kinshasa
          </div>
          <div className="h-0.5 w-12 bg-[#d4af37]/40 rounded-full" />
        </div>

        <div className="flex gap-10">
          {/* COMPTEUR LIBRES */}
          <div className="text-center group">
            <p className="text-[10px] font-black text-blue-200/40 uppercase mb-1 tracking-widest group-hover:text-blue-200 transition-colors">Libres</p>
            <p className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
              {filteredData.filter(d =>
                d.statut?.toString().toLowerCase().includes('libre') ||
                d.statut?.toString().toLowerCase().includes('disponible')
              ).length}
            </p>
          </div>

          {/* COMPTEUR OCCUPÉS */}
          <div className="text-center border-l border-white/10 pl-10 group">
            <p className="text-[10px] font-black text-blue-200/40 uppercase mb-1 tracking-widest group-hover:text-blue-200 transition-colors">Occupés</p>
            <p className="text-3xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
              {filteredData.filter(d =>
                d.statut?.toString().toLowerCase().includes('occup')
              ).length}
            </p>
          </div>

          {/* TOTAL AFFICHÉ AVEC L'OR SIGNATURE */}
          <div className="text-center border-l border-white/10 pl-10 group">
            <p className="text-[10px] font-black text-[#d4af37]/40 uppercase mb-1 tracking-widest group-hover:text-[#d4af37] transition-colors">Total Affiché</p>
            <p className="text-3xl font-black text-[#d4af37] drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
              {filteredData.length}
            </p>
          </div>
        </div>
      </footer>
      <style jsx global>{`
  @media print {
    /* 1. CONFIGURATION DE LA PAGE (Paysage + Marges) */
    @page {
      size: landscape;
      margin: 10mm;
    }

    /* 2. NETTOYAGE DE L'INTERFACE */
    /* On cache les boutons, la recherche, les filtres et les éléments décoratifs */
    nav, 
    button, 
    header .flex-wrap, 
    section, 
    .print\:hidden,
    .fixed { 
      display: none !important; 
    }

    /* 3. RÉINITIALISATION DU STYLE POUR LE PAPIER */
    body, .min-h-screen {
      background: white !important;
      color: black !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* 4. FORCE LE TABLEAU À UTILISER TOUTE LA LARGEUR */
    /* On casse les limitations de scroll (overflow) */
    .overflow-x-auto, 
    div[class*="overflow"] {
      overflow: visible !important;
      height: auto !important;
      display: block !important;
      width: 100% !important;
    }

    table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: auto !important; /* Laisse le navigateur ajuster les colonnes */
    }

    th, td {
      border: 1px solid #e2e8f0 !important; /* Bordures légères pour la lecture */
      font-size: 9pt !important; /* Taille de police optimale pour l'impression */
      padding: 6px !important;
    }

    /* 5. COULEURS ET BADGES */
    /* Permet de garder les couleurs des statuts (vert, rouge, etc.) */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Évite de couper une ligne de données au milieu d'un saut de page */
    tr {
      page-break-inside: avoid !important;
    }

    /* Optionnel : Ajoute un titre spécifique à l'impression si nécessaire */
    header h1 {
      font-size: 24pt !important;
      margin-bottom: 20px !important;
    }
  }
`}</style>
    </div>
  );
}




