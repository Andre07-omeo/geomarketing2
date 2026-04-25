'use client';
import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { Timestamp, getFirestore, collection, onSnapshot, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Trash2, Power, Edit2, Search, X, Save, Loader2, UserPlus, Building2, ShieldCheck, Activity, Globe, Clock, Eye, EyeOff } from 'lucide-react';



// 1. Définition de l'interface
interface User {
  id: string;
  nomSociete?: string;
  adresse?: string;
  logoUrl?: string;
  nom?: string;
  postNom?: string;
  prenom?: string;
  nomComplet?: string;
  fonction?: string;
  email: string;
  telephone: string;
  role: 'admin' | 'comptable' | 'commercial' | 'visiteur';
  actif: boolean;
  isOnline: boolean;
  lastLogin: Timestamp | null;
  createdAt: Timestamp;
  password?: string; // <--- Ajoute cette ligne ici
}


// Configuration Cloudinary / Logo
const LOGO_DISPROMALT = "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg";
// Constantes des URLs par défaut
const LOGO_AGENT_PAR_DEFAUT = "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690407/dtmebbxkdgj56wmg07hw.jpg";

const firebaseConfig = {
  apiKey: "AIzaSyDWqh9fFs2Me5pBY5V6riPfLX6QUHvOqmw",
  authDomain: "kin-geo-market.firebaseapp.com",
  projectId: "kin-geo-market",
  storageBucket: "kin-geo-market.firebasestorage.app",
  messagingSenderId: "50335362445",
  appId: "1:50335362445:web:44430fdb027a4bec80a1c4"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default function UsersPage() {

  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [editForm, setEditForm] = useState({
    nomSociete: '',
    email: '',
    adresse: '',
    role: '',
    telephone: '',
    // Ajoute ces champs pour les agents
    nom: '',
    postNom: '',
    prenom: '',
    fonction: ''
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  // Remplace ton useState actuel par celui-ci
  const [createForm, setCreateForm] = useState({
    type: 'societe', // 'societe' ou 'agent'
    nomSociete: '',
    // Champs Agent
    nom: '',
    postNom: '',
    prenom: '',
    fonction: '',
    role: 'comptable', // admin, comptable, commercial
    email: '',
    telephone: '+243',
    password: ''
  });





  // Génération auto de l'email
  const generateEmail = (nom: string, prenom: string) => {
    if (!nom || !prenom) return '';
    const cleanNom = nom.toLowerCase().replace(/\s/g, '');
    const cleanPrenom = prenom.toLowerCase().replace(/\s/g, '');
    return `${cleanPrenom}.${cleanNom}.${Math.floor(Math.random() * 999)}@dispromalt.cd`;
  };

  // Récupération des données en temps réel
  useEffect(() => {
    const colRef = collection(db, "societes");
    const unsub = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as User[]; // Typage explicite
      setUsers(data);
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Formatage de la dernière connexion
  const formatLastSeen = (timestamp: any) => {
    if (!timestamp) return "Jamais connecté";

    try {
      let date: Date;

      // Cas 1 : C'est un Timestamp Firebase classique (le plus probable)
      if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // Cas 2 : C'est déjà une Date JS ou un nombre (ms)
      else if (timestamp instanceof Date || typeof timestamp === 'number') {
        date = new Date(timestamp);
      }
      // Cas 3 : C'est une String (ISO ou autre format texte)
      else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      }
      // Cas 4 : C'est l'objet temporaire de Firebase pendant l'écriture
      else {
        return "Synchronisation...";
      }

      // Si la date est valide, on extrait l'heure et les minutes
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit'
        }).format(date);
      }

      return "Heure non définie";
    } catch (e) {
      return "Erreur lecture";
    }
  };



  const isFormValid = () => {
    // Si c'est une société, seul le nom est nécessaire
    if (createForm.type === 'societe') {
      return createForm.nomSociete.trim().length > 2;
    }

    // Si c'est un agent, on vérifie TOUS les champs
    return (
      createForm.nom.trim().length > 0 &&
      createForm.postNom.trim().length > 0 &&
      createForm.prenom.trim().length > 0 &&
      createForm.telephone.trim().length >= 10 &&
      createForm.fonction.trim().length > 0 &&
      createForm.password.trim().length >= 8
    );
  };

  const handleCreateUser = async () => {
    // 1. Validation de base
    if (createForm.type === 'agent' && (!createForm.nom || !createForm.prenom || !createForm.email)) {
      return alert("Veuillez remplir les champs obligatoires pour l'agent");
    }

    setIsCreating(true);
    try {
      // 2. Construction de l'objet de données
      const userData = createForm.type === 'societe'
        ? {
          nomSociete: createForm.nomSociete,
          email: createForm.email,
          password: createForm.password, // Stocké pour vérification future
          role: 'visiteur',
          logoUrl: LOGO_DISPROMALT, // Utilisation de la constante
          actif: true,
          createdAt: serverTimestamp(),
          lastLogin: null,
          isOnline: false,
          mouvements: []
        }
        : {
          nom: createForm.nom,
          postNom: createForm.postNom,
          prenom: createForm.prenom,
          nomComplet: `${createForm.nom} ${createForm.postNom} ${createForm.prenom}`,
          telephone: createForm.telephone,
          email: createForm.email,
          fonction: createForm.fonction,
          logoUrl: LOGO_AGENT_PAR_DEFAUT, // Utilisation de la constante
          role: createForm.role, // admin, comptable, ou commercial
          password: createForm.password,
          actif: true,
          createdAt: serverTimestamp(),
          lastLogin: null,
          isOnline: false,
          mouvements: []
        };

      // 3. Envoi à Firestore
      await addDoc(collection(db, "societes"), userData);

      // 4. Succès
      alert("Compte créé avec succès. Veuillez transmettre le mot de passe manuellement.");

      // 5. Fermeture et Reset complet
      setIsCreateModalOpen(false);
      setCreateForm({
        type: 'societe',
        nomSociete: '',
        nom: '',
        postNom: '',
        prenom: '',
        fonction: '',
        role: 'comptable',
        email: '',
        telephone: '+243',
        password: ''
      });

    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
        alert("Erreur : " + err.message);
      } else {
        alert("Une erreur inconnue est survenue");
      }
    } finally {
      setIsCreating(false);
    }
  };


  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, "societes", editingUser.id), editForm);
      setEditingUser(null);
    } catch (e) {
      alert("Erreur lors de la mise à jour");
    }
  };


  const handleUpdateStatus = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "societes", id), { actif: !current });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer définitivement cette société ?")) {
      try {
        await deleteDoc(doc(db, "societes", id));
      } catch (error) {
        alert("Erreur de suppression");
      }
    }
  };

  const getRoleStyle = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'visiteur': return 'bg-blue-400/20 text-blue-200 border-blue-400/40';
      case 'comptable':
      case 'commercial':
      case 'superviseurs': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      default: return 'bg-white/10 text-zinc-300 border-white/10';
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.nomSociete?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (u.email?.toLowerCase() || "").includes(search.toLowerCase())
  );



  const handleEditClick = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setEditForm({
      nomSociete: userToEdit.nomSociete || '',
      email: userToEdit.email || '',
      adresse: userToEdit.adresse || '',
      role: userToEdit.role || 'visiteur',
      telephone: userToEdit.telephone || '',
      nom: userToEdit.nom || '',
      postNom: userToEdit.postNom || '',
      prenom: userToEdit.prenom || '',
      fonction: userToEdit.fonction || ''
    });
  };


  return (
    <div className="min-h-screen bg-[#4169E1] text-white p-4 md:p-8 selection:bg-red-600">

      {/* HEADER LUXE */}
      <header className="max-w-7xl mx-auto mb-10 bg-white/10 p-6 md:p-10 rounded-[3rem] border border-white/20 backdrop-blur-2xl shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10">
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 p-1 bg-gradient-to-br from-amber-400 via-amber-100 to-amber-600 rounded-[2rem] shadow-xl border border-amber-300/50 flex items-center justify-center overflow-hidden">
              <div className="w-full h-full bg-white rounded-[1.8rem] overflow-hidden flex items-center justify-center">
                <img src={LOGO_DISPROMALT} alt="Logo Dispromalt" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none drop-shadow-md">
                DISPROMALT <span className="text-amber-400">GKM</span>
              </h2>
              <p className="text-blue-100/70 text-[11px] mt-2 uppercase tracking-[0.4em] font-bold flex items-center gap-2">
                <span className="w-6 h-[1px] bg-red-500"></span>
                Administration des utilisateurs
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-4 text-amber-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-black/20 pl-12 pr-4 py-4 rounded-2xl border border-white/10 outline-none focus:border-amber-400 transition-all placeholder:text-blue-100/40"
              />
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 text-sm font-black uppercase shadow-lg shadow-red-900/40 border-t border-red-400"
            >
              <UserPlus size={20} />
              Nouveau Visiteur
            </button>
          </div>
        </div>

        {/* STATS RAPIDES */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Partenaires', value: users.length, icon: Building2, color: 'text-white' },
            { label: 'En Ligne', value: users.filter(u => u.isOnline).length, icon: Activity, color: 'text-emerald-400' },
            { label: 'Actives', value: users.filter(u => u.actif).length, icon: Activity, color: 'text-emerald-400' },

            { label: 'Visiteurs', value: users.filter(u => u.role === 'visiteur').length, icon: ShieldCheck, color: 'text-amber-400' }
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl hidden sm:block"><stat.icon className="text-amber-400" size={20} /></div>
              <div>
                <p className="text-[10px] uppercase font-black text-blue-100/50">{stat.label}</p>
                <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* GRILLE DES SOCIETES */}
      {loading ? (
        <div className="text-center py-40 animate-pulse text-amber-400 font-black tracking-widest">SYNCHRONISATION...</div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredUsers.map((user) => (
            <div key={user.id} className="relative group bg-white/10 border border-white/20 p-8 rounded-[2.5rem] hover:bg-white/20 transition-all duration-500 backdrop-blur-sm shadow-xl">

              {/* HEADER : Photo / Logo et Nom */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-amber-400/30 flex items-center justify-center overflow-hidden">
                    {user.logoUrl ? (
                      <img src={user.logoUrl || LOGO_DISPROMALT} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="text-blue-600" size={28} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-white uppercase truncate max-w-[140px]">
                      {user.nom ? `${user.prenom} ${user.nom}` : user.nomSociete}
                    </h3>
                    <span className={`mt-1 px-3 py-0.5 inline-block rounded-full text-[9px] font-black uppercase border ${getRoleStyle(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${user.actif ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`} />
              </div>

              {/* SECTION INFORMATIONS AGENT (Intégrée dans le map) */}
              {user.nom && (
                <div className="mb-4 p-4 bg-black/20 rounded-2xl border border-white/5 space-y-2">
                  <p className="text-[9px] text-blue-200/40 font-black uppercase tracking-widest">Détails Agent</p>
                  <div className="text-white font-bold text-sm">
                    {user.prenom} {user.nom} {user.postNom}
                  </div>
                  <div className="text-amber-400 text-xs italic">{user.fonction}</div>

                  {/* TOGGLE MOT DE PASSE */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Pass:</span>

                    {/* Conteneur pour l'input et l'icône */}
                    <div className="flex items-center bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                      <input
                        id={`pass-${user.id}`}
                        type="password"
                        // Utilise (user as any) si tu n'as pas mis 'password' dans ton interface User
                        defaultValue={(user as any).password || '******'}
                        readOnly
                        className="bg-transparent w-20 outline-none text-center text-white text-[11px] font-mono cursor-default"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(`pass-${user.id}`) as HTMLInputElement;
                          if (el) el.type = el.type === 'password' ? 'text' : 'password';
                        }}
                        className="ml-2 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                      >
                        👁️
                      </button>

                    </div>
                    <p className="text-[11px] font-bold text-white italic">
                      {user.isOnline ? (
                        <span className="text-emerald-400">En ligne</span>
                      ) : (
                        user.lastLogin
                          ? `Déconnecté le ${formatLastSeen(user.lastLogin)}`
                          : "Jamais connecté"
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* IDENTIFIANT SYSTÈME (Email) */}
              <div className="bg-black/20 p-4 rounded-2xl mb-8 border border-white/5">
                <p className="text-[9px] text-blue-200/40 font-black uppercase tracking-widest mb-1">Email</p>
                <p className="text-sm font-bold text-amber-100/90 truncate">{user.email}</p>
              </div>

              {/* FOOTER : BOUTONS */}
              <div className="flex justify-between items-center gap-3">
                <button onClick={() => handleUpdateStatus(user.id, user.actif)} className={`flex-1 flex justify-center py-3 rounded-xl transition-all ${user.actif ? 'bg-amber-400/20 text-amber-400' : 'bg-red-600 text-white'}`}>
                  <Power size={18} />
                </button>
                <button onClick={() => handleEditClick(user)} className="flex-1 flex justify-center py-3 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(user.id)} className="flex-1 flex justify-center py-3 bg-red-600/10 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {/* MODALE DE CRÉATION */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-2xl overflow-y-auto">
              <div className="bg-[#4169E1] border-2 border-amber-400/40 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl my-8">

                {/* HEADER AVEC CROIX */}
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-3xl font-black italic uppercase text-white">Nouvel <span className="text-amber-400">Accès</span></h3>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="text-white hover:text-red-400 transition-colors"
                  >
                    <X size={32} />
                  </button>
                </div>

                {/* SÉLECTEUR TYPE */}
                <div className="flex gap-2 mb-8 p-1 bg-white/10 rounded-2xl">
                  <button onClick={() => setCreateForm({ ...createForm, type: 'societe' })} className={`flex-1 py-3 rounded-xl font-black ${createForm.type === 'societe' ? 'bg-amber-400 text-blue-900' : 'text-white'}`}>SOCIÉTÉ</button>
                  <button onClick={() => setCreateForm({ ...createForm, type: 'agent' })} className={`flex-1 py-3 rounded-xl font-black ${createForm.type === 'agent' ? 'bg-amber-400 text-blue-900' : 'text-white'}`}>AGENT</button>
                </div>

                <div className="space-y-4">
                  {createForm.type === 'agent' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="Nom" className="bg-white/10 p-4 rounded-xl border border-white/20 text-white" value={createForm.nom} onChange={(e) => setCreateForm({ ...createForm, nom: e.target.value })} />
                        <input placeholder="Post-Nom" className="bg-white/10 p-4 rounded-xl border border-white/20 text-white" value={createForm.postNom} onChange={(e) => setCreateForm({ ...createForm, postNom: e.target.value })} />
                      </div>
                      <input placeholder="Prénom" className="w-full bg-white/10 p-4 rounded-xl border border-white/20 text-white" value={createForm.prenom} onChange={(e) => {
                        const newPrenom = e.target.value;
                        setCreateForm({ ...createForm, prenom: newPrenom, email: generateEmail(createForm.nom, newPrenom) });
                      }} />
                      <input placeholder="Téléphone (+243...)" className="w-full bg-white/10 p-4 rounded-xl border border-white/20 text-white" value={createForm.telephone} onChange={(e) => setCreateForm({ ...createForm, telephone: e.target.value })} />

                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="Fonction" className="bg-white/10 p-4 rounded-xl border border-white/20 text-white" value={createForm.fonction} onChange={(e) => setCreateForm({ ...createForm, fonction: e.target.value })} />
                        <select className="bg-white/10 p-4 rounded-xl border border-white/20 text-white outline-none" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                          <option value="admin">Admin</option>
                          <option value="comptable">Comptable</option>
                          <option value="commercial">Commercial</option>
                          <option value="superviseurs">Superviseur</option>
                        </select>
                      </div>

                      <div className="bg-black/20 p-4 rounded-xl border border-white/10">
                        <label className="text-[9px] text-amber-400 uppercase">Email généré</label>
                        <div className="text-white font-bold">{createForm.email || 'en attente...'}</div>
                      </div>

                      {/* INPUT MOT DE PASSE AVEC VISIBILITÉ */}
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Mot de passe sécurisé"
                          className="w-full bg-white/10 p-4 rounded-xl border border-white/20 text-white pr-12"
                          value={createForm.password}
                          onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>

                    </div>
                  ) : (
                    <input className="w-full bg-white/10 p-5 rounded-[1.5rem] border border-white/20 text-white font-black" placeholder="NOM DE LA SOCIÉTÉ" value={createForm.nomSociete} onChange={(e) => setCreateForm({ ...createForm, nomSociete: e.target.value })} />
                  )}

                  <button
                    onClick={handleCreateUser}
                    disabled={!isFormValid()}
                    className={`w-full mt-6 p-6 rounded-[1.5rem] font-black text-white uppercase shadow-xl transition-all ${isFormValid() ? 'bg-red-600 hover:bg-red-700' : 'bg-zinc-700 cursor-not-allowed opacity-50'}`}
                  >
                    {isCreating ? <Loader2 className="animate-spin" /> : "Valider Enregistrement"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {editingUser && (
            <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-2xl overflow-y-auto">
              <div className="bg-[#4169E1] border-2 border-amber-400/40 p-8 rounded-[3rem] w-full max-w-lg shadow-2xl">
                <h3 className="text-2xl font-black text-white uppercase mb-6 text-center">
                  {/* Utilisation de l'optional chaining ?. pour la sécurité */}
                  {editingUser?.nom ? 'Modification Agent' : 'Modification Société'}
                </h3>

                <div className="space-y-4">
                  {/* LOGIQUE DYNAMIQUE : Si c'est un agent (possède un nom), on affiche ses champs */}
                  {editingUser?.nom ? (
                    <div className="space-y-3 border-b border-white/20 pb-4">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          placeholder="Nom"
                          className="bg-white/10 p-4 rounded-xl border border-white/20 text-white"
                          value={editForm.nom}
                          onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                        />
                        <input
                          placeholder="Post-Nom"
                          className="bg-white/10 p-4 rounded-xl border border-white/20 text-white"
                          value={editForm.postNom}
                          onChange={(e) => setEditForm({ ...editForm, postNom: e.target.value })}
                        />
                      </div>
                      <input
                        placeholder="Prénom"
                        className="w-full bg-white/10 p-4 rounded-xl border border-white/20 text-white"
                        value={editForm.prenom}
                        onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                      />
                      <input
                        placeholder="Fonction"
                        className="w-full bg-white/10 p-4 rounded-xl border border-white/20 text-white"
                        value={editForm.fonction}
                        onChange={(e) => setEditForm({ ...editForm, fonction: e.target.value })}
                      />
                    </div>
                  ) : (
                    <input
                      className="w-full bg-white/10 p-4 rounded-xl border border-white/20 text-white font-bold"
                      placeholder="Nom Société"
                      value={editForm.nomSociete}
                      onChange={(e) => setEditForm({ ...editForm, nomSociete: e.target.value })}
                    />
                  )}

                  {/* Champs communs */}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="bg-white/10 p-4 rounded-xl border border-white/20 text-white"
                      placeholder="Tél"
                      value={editForm.telephone}
                      onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                    />
                    <select
                      className="bg-black/40 p-4 rounded-xl border border-white/20 text-white"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                    >
                      <option value="admin">Admin</option>
                      <option value="comptable">Comptable</option>
                      <option value="commercial">Commercial</option>
                      <option value="visiteur">Client</option>
                      <option value="superviseurs">Superviseur</option>

                    </select>
                  </div>
                  <input
                    className="w-full bg-white/10 p-4 rounded-xl border border-white/20 text-white"
                    placeholder="Email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>

                <div className="flex gap-4 pt-8">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 p-4 bg-white/10 rounded-2xl text-white font-bold hover:bg-white/20 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 p-4 bg-red-600 rounded-2xl text-white font-bold hover:bg-red-700 transition-all"
                  >
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )
      }
    </div >
  );
}