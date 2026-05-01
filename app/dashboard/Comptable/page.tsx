'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, CheckCircle2, Clock, ArrowUpRight,
  MapPin, ShieldCheck, LogOut, User,
  ArrowDownLeft, BarChart3, Layers,
  Calendar, Building2, Tag, Info, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONFIG FIREBASE (Inchangée) ---
import { getDocs, query, where, writeBatch } from "firebase/firestore";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, updateDoc, Timestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";



import { useRouter } from 'next/navigation'; // Pour Next.js 13/14/15 (App Router)
// OU import { useRouter } from 'next/router'; // Si tu es sur l'ancien Pages Router

import { useAuth } from '@/context/AuthContext'; // Ajuste le chemin selon ton projet




const firebaseConfig = {
  apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
  authDomain: "kin-geo-market.firebaseapp.com",
  projectId: "kin-geo-market",
  appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const THEMES = [
  { id: 1, name: 'Obsidian', bg: '#112066', accent: '#969bb4' },
  { id: 2, name: 'Deep Sea', bg: '#8a979c', accent: '#021213' },
  { id: 3, name: 'Forest', bg: '#06100a', accent: '#10b981' },
  { id: 4, name: 'Midnight', bg: '#0a0a0a', accent: '#8b5cf6' },
  { id: 5, name: 'Bordeaux', bg: '#110505', accent: '#f87171' }
];

const AccountingMaster = () => {
  const auth = getAuth(app);


  const { user } = useAuth(); // Récupère loading si ton contexte le fournit
  const router = useRouter();


  const [currentUser, setCurrentUser] = useState<any>(null);
  const [factures, setFactures] = useState<any[]>([]);
  const [activeTheme, setActiveTheme] = useState(THEMES[0]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false); // Nouvel état de verrouillage

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "factures"), (snap) => {
      setFactures(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        dateFormatted: d.data().createdAt?.seconds ? new Date(d.data().createdAt.seconds * 1000).toLocaleDateString() : 'N/A'
      })));
      setLoading(false);
    });
    return () => unsub();
  }, []);
  // Si on n'est pas prêt, on affiche un écran noir total (Pas de dashboard, pas de redirection)





  const handleLogout = async () => {
    if (!confirm("Voulez-vous vraiment vous déconnecter ?")) return;

    try {
      localStorage.clear();
      sessionStorage.clear();

      // On appelle directement le signOut de Firebase
      await signOut(auth);

      router.push('/');
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      router.push('/');
    }
  };


  // --- AJOUT/MODIFICATION : Synchronisation de l'utilisateur ---
  useEffect(() => {
    if (!user) {
      // Si après le chargement il n'y a pas d'utilisateur, redirection
      // router.push('/'); // Optionnel : décommenter pour forcer le login
      return;
    }

    // On mappe les données du contexte Auth vers ton état local
    setCurrentUser({
      name: user.displayName || user.email?.split('@')[0] || "Agent",
      email: user.email,
      uid: user.uid
    });
  }, [user]);

  // --- TON CODE EXISTANT (Récupération factures) ---
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "factures"), (snap) => {
      setFactures(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        dateFormatted: d.data().createdAt?.seconds
          ? new Date(d.data().createdAt.seconds * 1000).toLocaleDateString()
          : 'N/A'
      })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleValidation = async (f: any) => {
    // SÉCURITÉ : Vérifier si l'agent est bien identifié
    if (!currentUser) {
      alert("Erreur d'authentification. Veuillez vous reconnecter.");
      return;
    }

    const du = Number(f.totalHT) - (Number(f.montantPaye) || 0);
    const mnt = prompt(`ENCAISSEMENT : ${f.clientNom}\nSomme due : $${du}`, du.toString());

    if (!mnt || isNaN(Number(mnt))) return;

    const v = Number(mnt);
    const nCumul = (Number(f.montantPaye) || 0) + v;
    const isDone = nCumul >= Number(f.totalHT);

    try {
      const batch = writeBatch(db);
      const docRef = doc(db, "factures", f.id);

      // MISE À JOUR FACTURE AVEC PROTECTION CONTRE LES VALEURS UNDEFINED
      batch.update(docRef, {
        validationComptable: isDone,
        montantPaye: nCumul,
        statut: isDone ? "Validée" : "Acompte",
        dateValidation: Timestamp.now(),
        derniereTransaction: v,
        valideParNom: currentUser.name || "Anonyme",
        valideParEmail: currentUser.email || "Non renseigné",
        statutPaiement: isDone ? "Payé" : "Acompte",
        valideParUID: user?.uid || currentUser?.uid || "UID_INCONNU", // Protection ici
      });

      // 2. SYNCHRONISATION AVEC LES PANNEAUX (Seulement si paiement complet)
      // 2. SYNCHRONISATION AVEC LES PANNEAUX (Seulement si paiement complet)
      if (isDone && f.lignes && f.lignes.length > 0) {

        const panneauxSnap = await getDocs(collection(db, "panneaux"));

        panneauxSnap.forEach((panneauDoc) => {
          const panneauData = panneauDoc.data();
          let aEteModifie = false;

          // On parcourt les faces du panneau
          const nouvellesFaces = panneauData.faces.map((face: any) => {
            if (!face.reservations) return face;

            // On parcourt les réservations de chaque face
            const nouvellesReservations = face.reservations.map((res: any) => {

              // LOGIQUE CORRIGÉE : On vérifie si CETTE réservation spécifique 
              // est présente dans l'une des lignes de la facture
              const matchFacture = f.lignes.find((ligne: any) =>
                // On compare l'identifiant unique de la face (si présent) ou le nom/code
                (ligne.faceId === face.id || ligne.faceNom === face.nom) &&
                res.dateDebut === ligne.dateDebut &&
                res.dateFin === ligne.dateFin &&
                res.societeLocatrice === f.clientNom
              );

              if (matchFacture) {
                aEteModifie = true;
                return {
                  ...res,
                  validationComptable: true,
                  statutPaiement: "Payé",
                  comptableValidateur: currentUser.email || "Email inconnu",
                  dateValidationComptable: Timestamp.now()
                };
              }

              return res;
            });

            return { ...face, reservations: nouvellesReservations };
          });

          if (aEteModifie) {
            const panRef = doc(db, "panneaux", panneauDoc.id);
            batch.update(panRef, { faces: nouvellesFaces });
          }
        });
      }
      await batch.commit();
      alert(`Bravo ${currentUser.name || ""}, la transaction est enregistrée.`);

    } catch (e) {
      console.error(e);
      alert("Erreur technique lors de la mise à jour");
    }
  };

  const filtered = useMemo(() => {
  return factures.filter(f =>
    f.clientNom?.toLowerCase().includes(search.toLowerCase()) ||
    f.factureIdFormat?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}, [factures, search]); // Dès que 'factures' change via le snapshot, 'filtered' et les sommes se mettent à jour.



  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-white font-black tracking-tighter animate-pulse">LEDGER SYNC...</div>;
  return (
    <div className="min-h-screen transition-all duration-700 pb-20" style={{ backgroundColor: activeTheme.bg, color: 'white' }}>
      {/* HEADER RESPONSIVE */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-3xl border-b border-white/10">
        <div className="max-w-[1700px] mx-auto px-4 md:px-10 h-20 md:h-24 flex items-center justify-between">

          {/* Logo & Themes (Cachés sur petit mobile si menu fermé) */}
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                <BarChart3 size={18} style={{ color: activeTheme.accent }} />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-black text-lg tracking-tighter uppercase italic leading-none">Ledger<span className="opacity-20">Pro</span></h1>
                <p className="text-[6px] font-bold tracking-[0.3em] opacity-40 uppercase">Secure Finance</p>
              </div>
            </div>

            {/* Themes - Desktop only */}
            <div className="hidden lg:flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setActiveTheme(t)}
                  className={`w-6 h-6 rounded-md border transition-all ${activeTheme.id === t.id ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-40'}`}
                  style={{ backgroundColor: t.bg }}
                />
              ))}
            </div>
          </div>

          {/* Recherche - Adaptative */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
              <input
                type="text" placeholder="Rechercher..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs outline-none focus:border-white/30 transition-all"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* PROFIL & DECONNEXION */}

          <div className="flex items-center gap-2 lg:gap-6 shrink-0 pl-2 lg:pl-6 border-l border-white/10">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Infos User (Masqué sur petit mobile) */}
                <div className="text-right hidden xl:block">
                  <p className="text-[10px] font-black text-white uppercase tracking-tight">{user.nom}</p>
                  <p className="text-[8px] font-bold text-[#d4af37] uppercase opacity-80">{user.role}</p>
                  <p className="text-[8px] opacity-40 font-mono">
                    {currentUser?.email || "Vérification session..."}
                  </p>
                </div>

                {/* Avatar & Logout Group */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 hover:border-[#d4af37]/50 transition-colors">
                  <img
                    src={user.logoUrl || "/default-avatar.png"}
                    className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl border border-white/10 object-cover"
                    alt="Profil"
                  />
                  <button
                    onClick={handleLogout}
                    className="p-2 text-red-400 hover:text-white hover:bg-red-500 transition-all rounded-xl"
                    title="Déconnexion"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="px-6 py-2.5 rounded-xl border border-[#d4af37] text-[#d4af37] text-[10px] font-black uppercase hover:bg-[#d4af37] hover:text-black transition-all shadow-lg"
              >
                Connexion
              </button>
            )}
          </div>

        </div>
      </header>

      <main className="p-4 md:p-8 max-w-[1700px] mx-auto">

        {/* STATS : Responsive Grid */}
        {/* STATS : Responsive Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12">
          {[
            {
              label: 'Recettes (Validées)',
              val: filtered.filter(f => f.validationComptable).reduce((acc, f) => acc + (Number(f.montantPaye) || 0), 0),
              icon: ArrowUpRight,
              color: '#10b981'
            },
            {
              label: 'À Recouvrer',
              val: filtered.filter(f => !f.validationComptable).reduce((acc, f) => acc + (Number(f.totalHT) - (Number(f.montantPaye) || 0)), 0),
              icon: Clock,
              color: '#fbbf24'
            },
            {
              label: 'Factures Validées',
              val: filtered.filter(f => f.validationComptable).length,
              icon: CheckCircle2,
              color: '#10b981'
            },
           { 
    label: 'Volume Total HT (Validé)', 
    val: filtered.filter(f => f.validationComptable).reduce((acc, f) => acc + Number(f.totalHT || 0), 0), 
    icon: Layers, 
    color: '#6366f1' 
  },
          ].map((s, i) => (
            <div key={i} className="bg-white/[0.04] border border-white/10 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 opacity-[0.05] rotate-12">
                <s.icon size={60} />
              </div>
              <p className="text-[8px] md:text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-lg md:text-3xl font-black tabular-nums tracking-tighter" style={{ color: s.color }}>
                {/* Affichage formaté : $ pour les montants, nombre simple pour le reste */}
                {i === 2 ? s.val : `$${s.val.toLocaleString()}`}
              </p>
            </div>
          ))}
        </div>

        {/* LISTE RESPONSIVE */}
        <div className="space-y-4">
          {/* Header de liste caché sur mobile */}
          <div className="px-8 hidden lg:flex items-center text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
            <div className="w-[30%]">Client / Réf</div>
            <div className="w-[25%]">Localisation</div>
            <div className="w-[25%] text-right font-mono">Montant HT</div>
            <div className="w-[20%] text-right text-right">Statut</div>
          </div>

          <AnimatePresence>
            {filtered.map((f, idx) => (
              <motion.div
                key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`relative rounded-[1.5rem] md:rounded-[2.2rem] border p-5 md:p-7 transition-all ${f.validationComptable ? 'bg-white/[0.01] border-white/5 opacity-60' : 'bg-white/[0.06] border-white/10 hover:border-white/20 shadow-xl'}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                  {/* CLIENT & REF */}
                  <div className="lg:w-[30%] flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center ${f.validationComptable ? 'bg-emerald-500/10 text-emerald-500' : 'bg-black/20'}`}>
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm uppercase truncate max-w-[200px]">{f.clientNom || 'Sans Nom'}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-mono text-[#d4af37]">{f.factureIdFormat}</span>
                        <span className="text-[8px] opacity-30 px-2 border border-white/10 rounded-full">{f.nombreFaces} faces</span>
                      </div>
                    </div>
                  </div>

                  {/* MOBILE ROW: GEO & DATE */}
                  <div className="flex items-center justify-between lg:w-[25%] lg:flex-col lg:items-start lg:justify-center gap-2">
                    <div className="flex items-center gap-2 opacity-60">
                      <MapPin size={12} className="text-white/40" />
                      <p className="text-[10px] font-bold uppercase truncate">{f.province} • {f.commune}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-30">
                      <Calendar size={11} />
                      <p className="text-[9px] font-bold">{f.dateFormatted}</p>
                    </div>
                  </div>

                  {/* MONTANT */}
                  <div className="lg:w-[25%] flex lg:flex-col items-center lg:items-end justify-between lg:justify-center border-t border-white/5 lg:border-none pt-3 lg:pt-0">
                    <p className="lg:hidden text-[9px] font-black opacity-30 uppercase tracking-widest">Total</p>
                    <div className="text-right">
                      <p className="text-lg md:text-xl font-mono font-black tracking-tighter">${Number(f.totalHT).toLocaleString()}</p>
                      {f.montantPaye > 0 && <p className="text-[9px] text-emerald-400 font-bold italic">Payé: ${f.montantPaye.toLocaleString()}</p>}
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="lg:w-[20%] flex items-center justify-between lg:justify-end gap-4">
                    <span className={`text-[7px] md:text-[8px] font-black px-3 py-1 rounded-full border tracking-widest ${f.validationComptable ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5' : 'border-amber-500/20 text-amber-500 bg-amber-500/5'}`}>
                      {f.validationComptable ? 'SÉCURISÉ' : 'EN ATTENTE'}
                    </span>

                    {!f.validationComptable ? (
                      <button
                        onClick={() => handleValidation(f)}
                        className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10"
                      >
                        <ArrowDownLeft size={18} />
                      </button>
                    ) : (
                      <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <ShieldCheck size={18} />
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* FOOTER MOBILE OPTIMIZED */}
      <footer className="fixed bottom-0 w-full px-4 md:px-10 py-3 border-t border-white/5 bg-black/80 backdrop-blur-md flex items-center justify-between text-[7px] md:text-[8px] font-black opacity-40 uppercase tracking-[0.2em] md:tracking-[0.5em]">
        <div className="flex gap-4 md:gap-10">
          <span className="hidden sm:inline">DB: Kin-Geo-Market</span>
          <span>Node: {activeTheme.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          <span>Encrypted Session</span>
        </div>
      </footer>
    </div>
  );
};

export default AccountingMaster;