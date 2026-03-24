'use client';
import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Trash2, Power, Edit2, Search, X, Save, Loader2, UserPlus, Building2, ShieldCheck, Activity, Globe, Clock } from 'lucide-react';
import Image from 'next/image';

// Configuration Cloudinary / Logo
const LOGO_DISPROMALT = "https://res.cloudinary.com/dn7wnikzp/image/upload/v1773690069/vvrno0qyzvo9cujavqcj.jpg";

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
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ nomSociete: '', email: '', adresse: '', role: '', telephone: '' });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ nomSociete: '', email: '', password: '', role: 'visiteur' });

  // Récupération des données en temps réel
  useEffect(() => {
    const colRef = collection(db, "societes");
    const unsub = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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

  const handleCreateUser = async () => {
    if (!createForm.nomSociete || !createForm.email || !createForm.password) {
      return alert("Veuillez remplir tous les champs obligatoires");
    }
    setIsCreating(true);
    try {
      await addDoc(collection(db, "societes"), {
        ...createForm,
        role: 'visiteur',
        actif: true,
        isOnline: false,
        lastSeen: null,
        createdAt: serverTimestamp()
      });
      setCreateForm({ nomSociete: '', email: '', password: '', role: 'visiteur' });
      setIsCreateModalOpen(false);
    } catch (err) {
      alert("Erreur lors de la création");
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
              
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-amber-400/30 flex items-center justify-center overflow-hidden">
                    {user.logoUrl ? (
                      <img src={user.logoUrl} alt="L" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="text-blue-600" size={28} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-white uppercase truncate max-w-[140px]">{user.nomSociete}</h3>
                    <span className={`mt-1 px-3 py-0.5 inline-block rounded-full text-[9px] font-black uppercase border ${getRoleStyle(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${user.actif ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`} />
              </div>

              {/* AFFICHAGE LAST SEEN */}
              <div className="flex items-center gap-3 mb-6 bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="p-2 bg-blue-600/30 rounded-lg">
                    <Clock size={14} className="text-amber-400" />
                </div>
                <div>
                    <p className="text-[8px] text-blue-200/50 font-black uppercase tracking-tighter">Activité</p>
                    <p className="text-[11px] font-bold text-white italic">
    {user.isOnline ? (
      <span className="text-emerald-400">En ligne</span>
    ) : (
      `Déconnecté le ${formatLastSeen(user.lastSeen)}`
    )}
</p>
                </div>
              </div>

              <div className="bg-black/20 p-4 rounded-2xl mb-8 border border-white/5">
                <p className="text-[9px] text-blue-200/40 font-black uppercase tracking-widest mb-1">Identifiant Système</p>
                <p className="text-sm font-bold text-amber-100/90 truncate">{user.email}</p>
              </div>

              <div className="flex justify-between items-center gap-3">
                <button onClick={() => handleUpdateStatus(user.id, user.actif)} className={`flex-1 flex justify-center py-3 rounded-xl transition-all ${user.actif ? 'bg-amber-400/20 text-amber-400' : 'bg-red-600 text-white shadow-lg shadow-red-900/40'}`}><Power size={18} /></button>
                <button onClick={() => { setEditingUser(user); setEditForm({ nomSociete: user.nomSociete, email: user.email, adresse: user.adresse || '', role: user.role, telephone: user.telephone || '' }); }} className="flex-1 flex justify-center py-3 bg-white/10 rounded-xl text-white hover:bg-white/20"><Edit2 size={18} /></button>
                <button onClick={() => handleDelete(user.id)} className="flex-1 flex justify-center py-3 bg-red-600/10 text-red-400 rounded-xl hover:bg-red-600 hover:text-white"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}

          {/* MODALE DE CRÉATION */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-2xl">
              <div className="bg-[#4169E1] border-2 border-amber-400/40 p-8 md:p-12 rounded-[3rem] w-full max-w-lg shadow-2xl">
                <div className="flex justify-between items-center mb-10 text-white">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center"><UserPlus size={28} /></div>
                    <h3 className="text-3xl font-black italic uppercase leading-none text-white">Nouveau<br/><span className="text-amber-400">Visiteur</span></h3>
                  </div>
                  <button onClick={() => setIsCreateModalOpen(false)}><X size={32} /></button>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest ml-4 mb-2 block">Société</label>
                    <input
                      placeholder="NOM..."
                      className="w-full bg-white/10 p-5 rounded-[1.5rem] border border-white/20 text-white outline-none focus:border-amber-400 font-black uppercase"
                      value={createForm.nomSociete}
                      onChange={(e) => {
                        const nom = e.target.value;
                        const nomClean = nom.toLowerCase().replace(/\s+/g, '');
                        setCreateForm({ ...createForm, nomSociete: nom, email: nom ? `${nomClean}.dispro@visiteur.com` : '' });
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/10">
                      <label className="text-[10px] text-blue-200/50 uppercase block mb-1">Rôle</label>
                      <div className="text-amber-400 font-black italic">VISITEUR</div>
                    </div>
                    <div>
                      <label className="text-[10px] text-amber-400 uppercase block mb-2">Password</label>
                      <input type="password" placeholder="••••" className="w-full bg-white/10 p-5 rounded-[1.5rem] border border-white/20 text-white" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
                    </div>
                  </div>
                  <button onClick={handleCreateUser} disabled={isCreating} className="w-full p-6 bg-red-600 hover:bg-red-700 rounded-[1.5rem] font-black text-white flex justify-center items-center gap-3 shadow-xl uppercase">
                    {isCreating ? <Loader2 className="animate-spin" /> : <Save size={20} />} Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODALE DE MODIFICATION (COMPLÈTE) */}
          {editingUser && (
            <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-2xl">
              <div className="bg-[#4169E1] border-2 border-amber-400/40 p-10 rounded-[3rem] w-full max-w-lg shadow-2xl">
                <h3 className="text-3xl font-black italic text-white uppercase mb-8 text-center underline decoration-red-600 underline-offset-8">Édition Profil</h3>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-[10px] font-black text-amber-400 uppercase ml-2 mb-1 block">Nom Société</label>
                          <input className="w-full bg-white/10 p-4 rounded-2xl border border-white/10 text-white font-bold" value={editForm.nomSociete} onChange={(e) => setEditForm({ ...editForm, nomSociete: e.target.value })} />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-amber-400 uppercase ml-2 mb-1 block">Rôle</label>
                          <select className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 text-white font-bold outline-none" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                            <option value="visiteur">Visiteur</option>
                            <option value="admin">Admin</option>
                            <option value="comptable">Comptable</option>
                            <option value="commercial">Commercial</option>
                            <option value="superviseurs">Superviseur</option>
                          </select>
                      </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-amber-400 uppercase ml-2 mb-1 block">Téléphone</label>
                    <input className="w-full bg-white/10 p-4 rounded-2xl border border-white/10 text-white" value={editForm.telephone} onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-amber-400 uppercase ml-2 mb-1 block">Adresse</label>
                    <input className="w-full bg-white/10 p-4 rounded-2xl border border-white/10 text-white" value={editForm.adresse} onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })} />
                  </div>
                  <div className="flex gap-4 pt-6">
                    <button onClick={() => setEditingUser(null)} className="flex-1 p-5 bg-white/5 rounded-2xl font-black text-white uppercase text-xs hover:bg-white/10">Fermer</button>
                    <button onClick={handleSaveEdit} className="flex-1 p-5 bg-red-600 rounded-2xl font-black text-white uppercase text-xs shadow-lg shadow-red-900/40 hover:bg-red-700">Mettre à jour</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}