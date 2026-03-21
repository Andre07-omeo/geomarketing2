'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import BookingForm from "../../../components/booking/BookingForm";
import { collection, onSnapshot } from 'firebase/firestore';
import {
  X, TrendingUp, BarChart3, ListChecks, MapPin,
  Filter, LayoutGrid, Zap, Maximize, Maximize2, Ruler
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Modifiez votre ligne d'import lucide-react comme ceci :
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { addDoc, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
  authDomain: "kin-geo-market.firebaseapp.com",
  projectId: "kin-geo-market",
  storageBucket: "kin-geo-market.firebasestorage.app",
  messagingSenderId: "50335362445",
  appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
};



// Initialisation sécurisée pour Next.js (évite les doublons côté serveur/client)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Instances exportées pour utilisation globale
export const db = getFirestore(app);
export const auth = getAuth(app);


const statusConfig: any = {
  'Libre': { bg: 'bg-emerald-500/10', text: 'text-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-500', label: 'Disponible' },
  'Occupé': { bg: 'bg-amber-500/10', text: 'text-amber-500', btn: 'bg-zinc-800 cursor-not-allowed', label: 'Occupé' },
  'Réservé': { bg: 'bg-blue-500/10', text: 'text-blue-500', btn: 'bg-zinc-800 cursor-not-allowed', label: 'Réservé' },
  'Maintenance': { bg: 'bg-rose-500/10', text: 'text-rose-500', btn: 'bg-zinc-800 cursor-not-allowed', label: 'En Maintenance' }
};


// Configuration Cloudinary
export const cloudinaryConfig = {
  cloudName: "dn7wnikzp",
  uploadPreset: "dispromalt_preset", // Remplacez par votre preset Cloudinary
};


// Remplace la ligne 66 par celle-ci si l'erreur persiste :
const MapComponent = dynamic(() => import('../../../components/MapComponent'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-zinc-900 animate-pulse flex items-center justify-center text-[#d4af37]">Initialisation de la carte...</div>
});




export default function ElegantDashboard() {
  const [panneaux, setPanneaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [filters, setFilters] = useState({
    zone: 'Toutes',    // Remplace 'commune' pour matcher le filtre
    type: 'Toutes',
    status: 'Toutes',  // Remplace 'statut' pour matcher le filtre
    classe: 'Toutes'
  });

  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- LOGIQUE DE DONNÉES ---
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "panneaux"), (snapshot) => {
      setPanneaux(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredPanneaux = useMemo(() => {
    return panneaux.filter((p: any) => {
      // 1. Zone (Commune)
      const matchZone = filters.zone === 'Toutes' || p.zone === filters.zone;

      // 2. Type (Technologie)
      const matchType = filters.type === 'Toutes' || p.type === filters.type;

      // 3. Status (On cherche dans les faces)
      const matchStatus = filters.status === 'Toutes' || filters.status === 'Tous' ||
        p.faces?.some((f: any) => f.statut === filters.status);

      // 4. Classe (Prestige)
      const matchClasse = filters.classe === 'Toutes' || p.classe === filters.classe;

      return matchZone && matchType && matchStatus && matchClasse;
    });
  }, [panneaux, filters]);



  // --- CALCUL DES KPI ---
  const stats = useMemo(() => {
    const total = panneaux.reduce((acc, p) => acc + (p.faces?.length || 0), 0);
    const libre = panneaux.reduce((acc, p) => acc + (p.faces?.filter((f: any) => f.statut === 'Libre').length || 0), 0);
    return [
      { label: "Disponibilité", val: `${libre} faces`, icon: ListChecks, color: "text-emerald-400" },
      { label: "Occupation", val: `${total > 0 ? Math.round(((total - libre) / total) * 100) : 0}%`, icon: TrendingUp, color: "text-sky-400" },
      { label: "Zones", val: `${new Set(panneaux.map(p => p.zone)).size}`, icon: MapPin, color: "text-amber-400" },
      { label: "Inventaire", val: total, icon: BarChart3, color: "text-purple-400" },
    ];
  }, [panneaux]);

  if (loading) return <LoadingState />;

  return (
    <div className="min-h-screen bg-[#1e40af] text-zinc-100 p-4 md:p-8 overflow-hidden flex flex-col relative">

      {/* EFFETS DE FOND POUR PROFONDEUR */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-black/20 rounded-full blur-[120px]" />
      </div>

      {/* HEADER & KPI SECTION */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 relative z-10"
      >
        {stats.map((s, i) => (
          <KPICard key={i} {...s} delay={i * 0.1} />
        ))}
      </motion.div>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 relative z-10">

        {/* CARTE */}
        <motion.div
          layout
          className="lg:col-span-4 h-[60vh] lg:h-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative bg-black/20 backdrop-blur-sm"
        >
          <MapComponent
            onMarkerClick={setSelected}
            panneaux={filteredPanneaux}
          />

          {/* Bouton Mobile Toggle */}
          <button
            onClick={() => setIsMobileListOpen(!isMobileListOpen)}
            className="lg:hidden absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-[#1e40af] px-6 py-3 rounded-full font-black shadow-xl flex items-center gap-2 z-50 uppercase text-[10px] tracking-widest"
          >
            <LayoutGrid size={18} /> {isMobileListOpen ? "Voir Carte" : "Voir Liste"}
          </button>
        </motion.div>

        {/* SIDEBAR FILTERS & LIST */}
        <aside className={`${isMobileListOpen
          ? 'fixed inset-0 z-[100] bg-[#020617] p-6 overflow-y-auto'
          : 'hidden'
          } lg:block lg:col-span-1 space-y-6`}>

          {/* CONTENEUR DE FILTRES STYLE HUD */}
          <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden">

            {/* EFFET DE LUMIÈRE DANS LE COIN */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-600/10 blur-[50px] pointer-events-none" />

            <h3 className="flex items-center gap-3 text-[11px] font-[1000] uppercase tracking-[0.4em] text-white/40 mb-10">
              <Filter size={14} className="text-blue-500" />
              Filtres Avancés
            </h3>

            <div className="flex flex-col gap-8">
              {/* 1. SECTEUR GÉOGRAPHIQUE */}
              <FilterGroup
                label="Commune / Zone"
                icon={MapPin}
                options={Array.from(new Set(panneaux.map(p => p.zone)))}
                placeholder="Tout Kinshasa"
                onChange={(v: string) => setFilters({ ...filters, zone: v })}
              />

              {/* 2. TECHNOLOGIE DU SUPPORT */}
              <FilterGroup
                label="Technologie"
                icon={Layers}
                options={Array.from(new Set(panneaux.map(p => p.type)))}
                placeholder="Tous Supports"
                onChange={(v: string) => setFilters({ ...filters, type: v })}
              />

              {/* 3. DISPONIBILITÉ RÉELLE */}
              <FilterGroup
                label="Statut Actuel"
                icon={Activity}
                options={['Disponible', 'Occupé', 'Maintenance']}
                placeholder="Tous les États"
                onChange={(v: string) => setFilters({ ...filters, status: v })}
              />

              {/* 4. CLASSIFICATION AUDIENCE */}
              <FilterGroup
                label="Prestige / Classe"
                icon={ShieldCheck}
                options={['Premium (A+)', 'Standard (B)', 'Éco (C)']}
                placeholder="Toutes Classes"
                onChange={(v: string) => setFilters({ ...filters, classe: v })}
              />
            </div>

          </div>

          {/* ICI VOUS POUVEZ AJOUTER VOTRE LISTE DE RÉSULTATS SOUS LES FILTRES SI BESOIN */}
        </aside>
      </div>

      {/* OVERLAYS (MODALES) */}
      <AnimatePresence>
        {selected && (
          <DetailOverlay
            panneau={selected}
            onClose={() => setSelected(null)}
            onBook={(face: any) => { setShowBooking(true); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SOUS-COMPOSANTS MODULAIRES ---

function KPICard({ label, val, icon: Icon, color, delay }: any) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay }}
      className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-5 hover:bg-white/10 transition-all group backdrop-blur-md shadow-lg"
    >
      <div className={`p-4 rounded-2xl bg-[#1e40af] border border-white/10 ${color} group-hover:scale-110 transition-transform shadow-inner`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">{label}</p>
        <p className="text-2xl font-black text-white">{val}</p>
      </div>
    </motion.div>
  );
}


/* CORRECTION : AJOUT DES IMPORTS MANQUANTS */
import { Monitor } from 'lucide-react';

function DetailOverlay({ panneau, onClose }: any) {
  /* OPTIONAL: BLOQUER LE SCROLL DU BODY QUAND LA MODALE EST OUVERTE */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  if (!panneau) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      /* OVERLAY FLOU SANS NOIR OPAQUE */
      className="fixed inset-0 z-[2000] backdrop-blur-xl bg-blue-900/10 flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: "50%", opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: "50%", opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        /* h-auto + max-h : LA BOÎTE S'ADAPTE AU CONTENU */
        className="w-full max-w-[1450px] bg-[#1e3a8a] h-auto max-h-[92vh] rounded-[3rem] md:rounded-[5rem] border-4 border-white/20 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden relative"
      >

        {/* BOUTON FERMER (X) DYNAMIQUE */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 md:top-10 md:right-10 z-[100] p-3 rounded-2xl bg-black/20 border border-white/10 text-white/40 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-300 group"
        >
          <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>



        {/* TEXTURE DE FOND PROFONDE */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400/10 via-transparent to-black/60 pointer-events-none" />

        {/* 1. HEADER ADAPTATIF ET DYNAMIQUE */}
        <div className="relative px-6 py-8 md:px-14 md:py-12 bg-black/40 backdrop-blur-3xl border-b border-white/10">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">

            {/* INFOS PRINCIPALES (GAUCHE) */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-red-600 shadow-[0_0_15px_#ef4444]" />
                <span className="text-[#d4af37] text-[10px] md:text-[12px] font-[1000] uppercase tracking-[0.5em]">
                  Control Station
                </span>
              </div>

              <h1 className="text-4xl md:text-7xl font-[1000] text-white tracking-tighter uppercase italic leading-none">
                {panneau?.idPan}
              </h1>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/10">
                  <MapPin size={14} className="text-red-600" />
                  <span className="text-[11px] font-black text-white uppercase tracking-widest italic">
                    {panneau?.zone || "Zone Non Définie"}
                  </span>
                </div>
              </div>
            </div>

            {/* GRILLE D'INSTRUMENTS (DROITE) */}
            <div className="flex flex-wrap gap-3 md:gap-4">
              <HeaderStat icon={<Monitor size={18} />} label="Techno" value={panneau?.type || "LED"} theme="light" />
              <HeaderStat icon={<LayoutGrid size={18} />} label="Capacité" value={`${panneau?.faces?.length || 0} FACES`} theme="dark" />
              <HeaderStat icon={<Maximize2 size={18} />} label="Format" value={panneau?.dimension || "Standard"} theme="gold" />
            </div>
          </div>
        </div>

        {/* 2. ZONE DE CONTENU : LES FACES */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16 custom-scrollbar bg-transparent">

          <div className="flex items-center gap-6 mb-12">
            <h3 className="text-[11px] font-[1000] uppercase tracking-[0.4em] text-white/50 whitespace-nowrap">Inventaire détaillé</h3>
            <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-8 md:gap-12 justify-items-center">
            {(panneau.faces || []).map((face: any, i: number) => (
              <FaceCard key={face.id || i} face={face} index={i} parentPanneau={panneau} />
            ))}
          </div>

          {/* FOOTER DISCRET DANS LE SCROLL */}
          <div className="mt-20 py-10 border-t border-white/5 flex flex-col items-center gap-4 text-center">
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em]">
              Fin de liste • Cliquez en dehors pour fermer
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* COMPOSANT INTERNE POUR LES STATS DU HEADER */
function HeaderStat({ icon, label, value, theme }: any) {
  const styles: any = {
    light: "bg-white text-black shadow-xl",
    dark: "bg-black text-white border border-white/10",
    gold: "bg-[#d4af37] text-black shadow-[0_10px_30px_rgba(212,175,55,0.3)]"
  };

  return (
    <div className={`flex flex-col min-w-[130px] md:min-w-[160px] px-6 py-4 rounded-[2rem] ${styles[theme]}`}>
      <div className="flex items-center gap-2 mb-1 opacity-60">
        {icon}
        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-lg md:text-xl font-[1000] uppercase italic leading-none">{value}</span>
    </div>
  );
}






// --- SOUS-COMPOSANTS RE-STYLES (LUMINEUX) ---

function InfoBlock({ label, value }: { label: string, value: string }) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-white border border-black/[0.03] shadow-sm hover:shadow-md transition-shadow">
      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3">{label}</p>
      <p className="text-2xl font-black text-zinc-800 tracking-tight">{value}</p>
    </div>
  );
}

function FaceCard({ face, parentPanneau, index }: any) {
  const [showConfirm, setShowConfirm] = useState(false);

  const idFaceUnique = face?.idPan || `${parentPanneau?.idPan || 'PAN'}-${index + 1}`;
  const zoneAffiche = parentPanneau?.zone || "Zone Géo";
  const status = face?.statut || 'Maintenance';

  const [isFullscreen, setIsFullscreen] = useState(false);


  const [isBooking, setIsBooking] = useState(false);
  const [bookingData, setBookingData] = useState({
    societe: '',
    mois: 1,
    paiement: 'M-Pesa'
  });



  const [societes, setSocietes] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "societes"), (snapshot) => {
      setSocietes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);


  // --- FONCTION DE GÉNÉRATION PDF PROFESSIONNELLE ---
  const generatePDF = (data: any, validationId: string) => {
    const doc = new jsPDF();

    // Design de l'Entête (Bleu Roi Profond #1e40af)
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175); // Correspond à #1e40af (R:30, G:64, B:175)
    doc.text("DISPROMALT", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Régie Publicitaire & Affichage", 14, 26);
    doc.text("Kinshasa, RDC | contact@dispromalt.com", 14, 31);

    // Infos Facture
    doc.setDrawColor(30, 64, 175); // Ligne en Bleu Roi Profond
    doc.line(14, 35, 196, 35);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Facture N°: ${validationId}`, 14, 45);
    doc.text(`Date: 12/03/2026`, 14, 52);

    // Infos Client
    doc.setFontSize(11);
    doc.text("INFORMATIONS CLIENT", 14, 65);
    doc.setFont("helvetica", "normal");
    doc.text(`Société: ${data.societe}`, 14, 72);
    doc.text(`Paiement: ${data.paiement}`, 14, 79);

    // Tableau Technique
    doc.setFont("helvetica", "bold");
    doc.text("DÉTAILS TECHNIQUES DU SUPPORT", 14, 95);

    autoTable(doc, {
      startY: 100,
      head: [['Désignation', 'Détails']],
      body: [
        ['Référence Face', data.idFace],
        ['Adresse', "Avenue de l'Université (Kapela)"],
        ['Zone', data.zone],
        ['Dimension', "4m x 3m"],
        ['Durée', `${data.mois} Mois`],
        ['Prix Unitaire', "450$"],
        ['Total', `${450 * data.mois}$`]
      ],
      headStyles: { fillColor: [30, 64, 175] }, // Header du tableau en Bleu Roi Profond
      theme: 'grid'
    });




    // Bas de page (Engagement & Cachet)
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Nous garantissons une visibilité optimale sur nos supports.", 14, finalY);
    doc.text("Ce document est une preuve officielle de votre réservation.", 14, finalY + 5);

    doc.setFont("helvetica", "bold");
    doc.text("Pour la Direction, Signature & Cachet", 140, finalY + 15);
    doc.rect(140, finalY + 18, 50, 25);


    doc.save(`Facture_${data.idFace}.pdf`);
  };

  // --- LOGIQUE DE RÉSERVATION ---
  const handleFinalizeBooking = async () => {

    const dateExpiration = new Date();
    dateExpiration.setHours(dateExpiration.getHours() + 24);

    if (!bookingData.societe) return alert("Veuillez sélectionner une société");

    setIsBooking(true);
    try {
      // Génération de l'ID Unique
      const validationId = `VAL-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // 1. Enregistrement Firebase (Table Facture)
      await addDoc(collection(db, "factures"), {
        nomSociete: bookingData.societe,
        moisLocation: bookingData.mois,
        moyenPaiement: bookingData.paiement,
        idFace: idFaceUnique,
        validationId: validationId,
        dateCreation: new Date().toISOString(),
        dateExpiration: dateExpiration.toISOString(),
        statutPaiement: "En attente",

        // CORRECTIONS ICI :
        adresseSupport: parentPanneau?.adresse || "Adresse non spécifiée",

        // 2. On récupère la zone dynamiquement
        zone: parentPanneau?.zone || zoneAffiche,

        // 3. On récupère le prix réel de la face
        prixUnitaire: Number(face?.prix) || 0,

        // 4. On récupère la dimension réelle de la face
        dimension: parentPanneau?.dimension || "N/A"
      }
      );

      // --- ÉTAPE 3 : METTRE À JOUR LE STATUT DE LA FACE (Firestore) ---
      const panneauRef = doc(db, "panneaux", parentPanneau.id);

      const facesMisesAJour = parentPanneau.faces.map((f: any, i: number) => {
        const currentFaceId = f.idPan || `${parentPanneau.idPan}-${i + 1}`;
        if (currentFaceId === idFaceUnique) {
          return { ...f, statut: "Réservé" }; // Change le statut ici
        }
        return f;
      });

      await updateDoc(panneauRef, {
        faces: facesMisesAJour
      });

      // 2. Lancement du PDF avec les données exactes
      // --- ÉTAPE 4 : GÉNÉRER LE PDF ---
      const pdfData = {
        societe: bookingData.societe,
        paiement: bookingData.paiement,
        idFace: idFaceUnique,
        zone: zoneAffiche,
        mois: bookingData.mois
      };
      generatePDF(pdfData, validationId);

      alert(`Réservation réussie ! Valable 24h (ID: ${validationId})`);
      setShowConfirm(false);

    } catch (error) {
      console.error("Erreur complète:", error);
      alert("Une erreur est survenue lors de la réservation.");
    } finally {
      setIsBooking(false);
    }
  };

  const config = {
    'Libre': { bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
    'Occupé': { bg: 'bg-zinc-800', text: 'text-zinc-500', dot: 'bg-zinc-600', btn: 'bg-zinc-800 text-zinc-500 cursor-not-allowed' },
    'Réservé': { bg: 'bg-[#1e40af]/10', text: 'text-[#1e40af]', dot: 'bg-[#1e40af]', btn: 'bg-zinc-800 text-zinc-500 cursor-not-allowed' },
    'Maintenance': { bg: 'bg-rose-500/10', text: 'text-rose-500', dot: 'bg-rose-500', btn: 'bg-zinc-800 text-zinc-500 cursor-not-allowed' }
  }[status as string] || { bg: 'bg-zinc-900', text: 'text-zinc-500', dot: 'bg-zinc-700', btn: 'bg-zinc-900' };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ y: -12 }}
        /* STRUCTURE PRINCIPALE : LÉVITATION & FOND BLEU ROI DISCRET */
        className="relative w-full max-w-[650px] min-h-[320px] bg-[#1e40af]/10 backdrop-blur-3xl rounded-[3.5rem] border border-white/20 flex flex-row group transition-all duration-700 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]"
      >
        {/* 1. PARTIE GAUCHE : PHOTO (50% DU PARENT) */}
        <div className="w-1/2 relative p-4">
          <motion.div
            whileHover={{ scale: 1.03, rotateY: -5 }}
            className="w-full h-full relative rounded-[3rem] overflow-hidden shadow-2xl border border-white/10"
          >
            {face?.photoCampagneUrl ? (
              <>
                <img
                  src={face.photoCampagneUrl}
                  alt={idFaceUnique}
                  className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                />
                {/* ANIMATION SCANNER LASER ROUGE DYNAMIQUE */}
                <motion.div
                  animate={{ top: ["-10%", "110%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_15px_#ef4444] z-20 opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-70" />
              </>
            ) : (
              <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
                <LayoutGrid size={32} className="text-white/5" />
              </div>
            )}

            {/* STATUT FLOTTANT STYLE "VERRE" */}
            <div className={`absolute bottom-6 left-6 px-4 py-2 rounded-2xl backdrop-blur-2xl border border-white/20 shadow-2xl ${config.bg} ${config.text}`}>
              <p className="text-[9px] font-[1000] uppercase tracking-[0.2em] flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
                {status}
              </p>
            </div>
          </motion.div>
        </div>

        {/* 2. PARTIE DROITE : INFOS (50% DU PARENT) - ENCRE RENFORCÉE */}
        <div className="w-1/2 p-10 flex flex-col justify-between">

          {/* HEADER : IDENTIFICATION */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {/* TOUCHE ROUGE VIF */}
              <div className="w-1.5 h-4 bg-red-600 rounded-full shadow-[0_0_15px_#ef4444]" />
              <span className="text-[10px] font-[1000] text-[#1e40af] uppercase tracking-[0.5em]">Digital Support</span>
            </div>
            <h3 className="text-4xl font-[1000] text-white tracking-tighter uppercase italic leading-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
              {idFaceUnique}
            </h3>
          </div>

          {/* DATA : ALIGNEMENT HORIZONTAL & COULEURS CODÉES */}
          <div className="flex justify-between items-center py-6 border-y border-white/10 my-4">
            <div className="flex flex-col gap-1">
              {/* LABEL ROUGE */}
              <span className="text-[8px] font-[1000] text-red-500 uppercase tracking-widest">Format</span>
              <span className="text-sm font-[1000] text-white drop-shadow-sm tabular-nums">{parentPanneau?.dimension || "12x4m"}</span>
            </div>

            <div className="h-8 w-[1px] bg-white/10" />

            <div className="flex flex-col gap-1 text-right">
              {/* LABEL BLEU ROI */}
              <span className="text-[8px] font-[1000] text-[#1e40af] uppercase tracking-widest">Techno</span>
              <span className="text-sm font-[1000] text-white uppercase italic">{parentPanneau?.type || "LED"}</span>
            </div>
          </div>

          {/* FOOTER : PRIX DORÉ & BOUTON PRÉCIEUX */}
          <div className="flex flex-col gap-6">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-[8px] font-[1000] text-white/40 uppercase tracking-[0.2em]">Investissement</span>
                {/* PRIX BLANC PUR AVEC SYMBOLE DORÉ */}
                <p className="text-4xl font-[1000] text-white tracking-tighter leading-none drop-shadow-[0_5px_15px_rgba(212,175,55,0.2)]">
                  {face?.prix || "2.5"}<span className="text-[#d4af37] text-sm ml-1 italic">$</span>
                </p>
              </div>
              {status !== 'Libre' && <Zap size={22} className="text-red-500 animate-pulse" />}
            </div>

            {/* BOUTON DORÉ STYLE "OR MASSIF" */}
            <motion.button
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              disabled={status !== 'Libre'}
              onClick={() => setShowConfirm(true)}
              className={`w-full py-5 rounded-[2rem] text-[11px] font-[1000] uppercase tracking-[0.4em] transition-all duration-500 relative overflow-hidden shadow-2xl ${status === 'Libre'
                ? 'bg-[#d4af37] text-black hover:bg-white hover:shadow-[0_0_50px_rgba(212,175,55,0.6)]'
                : 'bg-zinc-900 text-zinc-600 grayscale opacity-50'
                }`}
            >
              {/* EFFET DE BRILLANCE AU SURVOL */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />

              <span className="flex items-center justify-center gap-3 relative z-10">
                <Zap size={16} fill="currentColor" />
                {status === 'Libre' ? "Réserver maintenant" : "Support Occupé"}
              </span>
            </motion.button>
          </div>
        </div>

        {/* EFFET SHIMMER DISCRET SUR L'ENSEMBLE DU BLOC */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_3s_infinite] pointer-events-none" />
      </motion.div>


      {/* BOITE DE DIALOGUE DE CONFIRMATION */}
      <AnimatePresence>

        {showConfirm && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isBooking && setShowConfirm(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-white/10 p-8 rounded-[3rem] shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-[#1e40af] rounded-2xl shadow-lg shadow-[#1e40af]/20">
                  <Zap size={24} className="text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black text-white uppercase italic">Contrat de Réservation</h3>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Support: {idFaceUnique}</p>
                </div>
              </div>

              <div className="space-y-6 text-left">
                {/* Champ Société */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nom de la Société </label>
                  <input
                    type="text"
                    className="w-full bg-zinc-900 border border-white/5 p-4 rounded-2xl text-white outline-none focus:border-[#1e40af] transition-all"
                    placeholder="Ex: Dispromalt"
                    onChange={(e) => setBookingData({ ...bookingData, societe: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Champ Durée */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Durée (Mois)</label>
                    <input
                      type="number" min="1"
                      className="w-full bg-zinc-900 border border-white/5 p-4 rounded-2xl text-white outline-none focus:border-[#1e40af]"
                      value={bookingData.mois}
                      onChange={(e) => setBookingData({ ...bookingData, mois: parseInt(e.target.value) })}
                    />
                  </div>

                  {/* Moyen de Paiement */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Paiement</label>
                    <select
                      className="w-full bg-zinc-900 border border-white/5 p-4 rounded-2xl text-white outline-none focus:border-[#1e40af] appearance-none"
                      onChange={(e) => setBookingData({ ...bookingData, paiement: e.target.value })}
                    >
                      <option value="M-Pesa">M-Pesa (Comptabilité)</option>
                      <option value="Virement">Virement Bancaire (Comptabilité)</option>
                      <option value="Cash">Cash (Comptabilité)</option>
                    </select>
                  </div>
                </div>

                {/* Recapitulatif Prix */}
                <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 flex justify-between items-center">
                  <span className="text-[10px] font-black text-zinc-500 uppercase">Total Estimé :</span>
                  <span className="text-xl font-black text-emerald-500">{450 * bookingData.mois}$</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button
                  disabled={isBooking}
                  onClick={() => setShowConfirm(false)}
                  className="py-4 rounded-2xl bg-zinc-900 text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
                >
                  Annuler
                </button>
                <button
                  disabled={isBooking || !bookingData.societe}
                  onClick={handleFinalizeBooking}
                  className="py-4 rounded-2xl bg-[#1e40af] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#1e40af]/80 shadow-lg shadow-[#1e40af]/20 transition-all flex items-center justify-center gap-2"
                >
                  {isBooking ? "Traitement..." : "Valider & Imprimer"}
                </button>
              </div>

              <p className="mt-6 text-[8px] text-zinc-600 uppercase font-bold tracking-tighter">
                Dispromalt garantit une visibilité optimale sur nos supports.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function LoadingState() {
  return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 border-4 border-[#d4af37]/20 border-t-[#d4af37] rounded-full animate-spin" />
      <p className="text-[#d4af37] font-black italic tracking-widest uppercase text-sm animate-pulse">
        Dispromalt Dashboard
      </p>
    </div>
  );
}

import React from 'react';
import {

  Activity,
  ShieldCheck,
  Layers,
  ChevronDown
} from 'lucide-react';

/**
 * 1. COMPOSANT INDIVIDUEL DE FILTRE (UI)
 * Style : Futuristic Stealth (Noir pur, accents bleus, polices grasses)
 */
interface FilterGroupProps {
  label: string;
  options: string[];
  onChange: (value: string) => void;
  icon?: any;
  placeholder?: string;
}

function FilterGroup({
  label,
  options,
  onChange,
  icon: Icon = Zap,
  placeholder = "Toutes"
}: FilterGroupProps) {
  return (
    <div className="space-y-3 group">
      {/* LABEL STYLE HUD */}
      <label className="flex items-center gap-2 text-[9px] font-[1000] text-zinc-500 uppercase tracking-[0.3em] group-hover:text-blue-400 transition-colors duration-300">
        <Icon size={12} className="text-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
        {label}
      </label>

      <div className="relative">
        <select
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-white/5 p-4 md:p-5 rounded-[1.2rem] md:rounded-[1.8rem] text-[12px] font-black uppercase tracking-tighter focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all appearance-none cursor-pointer hover:bg-zinc-900/50 text-white italic"
        >
          <option value="Toutes" className="bg-black text-zinc-500 font-bold">
            {placeholder}
          </option>
          {options.filter(o => o).map((o: string) => (
            <option key={o} value={o} className="bg-black text-white font-bold uppercase">
              {o}
            </option>
          ))}
        </select>

        {/* ICON DE DÉCORATION / FLÈCHE */}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 group-hover:opacity-100 transition-opacity">
          <ChevronDown size={14} className="text-white" />
        </div>
      </div>
    </div>
  );
}




/**
 * 2. BARRE DE FILTRES COMPLÈTE
 * Utilisation : <FilterBar onFilterChange={...} communes={...} types={...} />
 */
interface FilterBarProps {
  onFilterChange: (key: string, value: string) => void;
  communes: string[];
  types: string[];
}

function FilterBar({ onFilterChange, communes, types }: FilterBarProps) {
  return (
    <div className="w-full">
      {/* CONTENEUR GRILLE : S'ADAPTE DE 1 À 4 COLONNES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 bg-black/40 backdrop-blur-3xl p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/5 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.8)]">

        {/* FILTRE 1 : LOCALISATION */}
        <FilterGroup
          label="Secteur Géo"
          options={communes}
          icon={MapPin}
          placeholder="Tout Kinshasa"
          onChange={(v) => onFilterChange('zone', v)}
        />

        {/* FILTRE 2 : TYPE DE MATÉRIEL */}
        <FilterGroup
          label="Technologie"
          options={types}
          icon={Layers}
          placeholder="Tous Supports"
          onChange={(v) => onFilterChange('type', v)}
        />

        {/* FILTRE 3 : ÉTAT ACTUEL */}
        <FilterGroup
          label="Disponibilité"
          options={['Disponible', 'Occupé', 'En Maintenance', 'Bientôt Libre']}
          icon={Activity}
          placeholder="Tous Statuts"
          onChange={(v) => onFilterChange('status', v)}
        />

        {/* FILTRE 4 : CLASSIFICATION */}
        <FilterGroup
          label="Visibilité"
          options={['Premium (A+)', 'Standard (B)', 'Éco (C)']}
          icon={ShieldCheck}
          placeholder="Toutes Classes"
          onChange={(v) => onFilterChange('classe', v)}
        />

      </div>

      {/* PETIT INDICATEUR DYNAMIQUE SOUS LA BARRE (Optionnel) */}
      <div className="mt-4 flex items-center gap-2 px-6 opacity-20 hover:opacity-100 transition-opacity duration-500">
        <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-[8px] font-black text-white uppercase tracking-[0.4em]">
          Filtres intelligents synchronisés
        </span>
      </div>
    </div>
  );
}