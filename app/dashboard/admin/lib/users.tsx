'use client';
import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Trash2, Power, Edit2, Search, Plus, AlertCircle } from 'lucide-react';
import Image from 'next/image';

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

  useEffect(() => {
    const colRef = collection(db, "societes");
    const unsub = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log("Données chargées :", data);
      setUsers(data);
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const getRoleStyle = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'comptable':
      case 'commercial':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'client':
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      default:
        return 'bg-zinc-800 text-zinc-500 border-zinc-700';
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    await updateDoc(doc(db, "societes", editingUser.id), editForm);
    setEditingUser(null); // Fermer le mode édition
  };

  const filteredUsers = users.filter((u) =>
    (u.nomSociete?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (u.email?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const handleUpdateStatus = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "societes", id), { actif: !current });
  };

  const handleDelete = async (id: string) => {
  // 1. Demande de confirmation à l'utilisateur
  if (confirm("Voulez-vous vraiment supprimer cet enregistrement de la table Sociétés ?")) {
    try {
      // 2. Suppression directe dans Firestore
      const docRef = doc(db, "societes", id);
      await deleteDoc(docRef);

      // 3. Message de succès et rafraîchissement
      alert("Enregistrement supprimé avec succès.");
      
      // Optionnel : rafraîchir la page pour mettre à jour la liste affichée
      window.location.reload(); 
      
    } catch (error) {
      console.error("Erreur lors de la suppression Firestore:", error);
      alert("Erreur : Impossible de supprimer l'élément. Vérifiez vos permissions.");
    }
  }
};

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8">
      {/* SECTION HEADER & STATISTIQUES */}
      <header className="max-w-7xl mx-auto mb-10 bg-zinc-900/30 p-6 md:p-8 rounded-3xl border border-zinc-800 backdrop-blur-md">

        {/* LIGNE 1 : TITRE ET RECHERCHE */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter bg-gradient-to-r from-blue-600 via-red-600 to-amber-500 bg-clip-text text-transparent">
              UTILISATEURS / SOCIÉTÉS
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Gestion centralisée des adhérents GKM</p>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-3.5 text-zinc-600" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full bg-black pl-10 pr-4 py-3 rounded-xl text-sm border border-zinc-800 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* LIGNE 2 : STATISTIQUES RESPONSIVES */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Total', value: users.length, color: 'text-white' },
            { label: 'En ligne', value: users.filter(u => u.isOnline).length, color: 'text-emerald-500' },
            { label: 'Hors ligne', value: users.filter(u => !u.isOnline && u.actif).length, color: 'text-zinc-400' },
            { label: 'Désactivés', value: users.filter(u => !u.actif).length, color: 'text-rose-500' }
          ].map((stat, i) => (
            <div
              key={i}
              className="flex-1 min-w-[140px] md:min-w-[160px] bg-black/40 border border-zinc-800 p-4 rounded-2xl hover:border-zinc-600 transition-all"
            >
              <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </header>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {loading ? (
        <div className="text-center text-zinc-500">Chargement...</div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* C'EST ICI QU'IL FAUT UTILISER filteredUsers ET NON users */}
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div key={user.id} className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl">
                <div className="flex items-center gap-4 mb-6">

                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700 flex-shrink-0">
                    {user.logoUrl ? (
                      <Image
                        src={user.logoUrl}
                        alt="Logo Société"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-xl bg-zinc-800">
                        {user.nomSociete?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{user.nomSociete || "Sans nom"}</h3>
                    <span className="text-[10px] uppercase font-bold text-blue-400">{user.secteur || "Non défini"}</span>
                  </div>
                </div>
                <p className="text-zinc-400 text-sm mb-6 truncate">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getRoleStyle(user.role)}`}>role :
                    {user.role || "Non défini"}
                  </span>
                </div>


                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => handleUpdateStatus(user.id, user.actif)} className={`p-3 rounded-xl flex justify-center ${user.actif ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}><Power size={18} /></button>
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setEditForm({
                        nomSociete: user.nomSociete || '',
                        email: user.email || '',
                        adresse: user.adresse || '',    // Ajouté : valeur par défaut vide
                        role: user.role || '',          // Ajouté : valeur par défaut vide
                        telephone: user.telephone || '' // Ajouté : valeur par défaut vide
                      });
                    }}
                    className="p-3 bg-zinc-800 rounded-xl"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(user.id)} className="p-3 rounded-xl flex justify-center bg-rose-500/10 text-rose-500"><Trash2 size={18} /></button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-20 text-zinc-500">
              Aucun résultat pour "{search}"
            </div>
          )}


          {/* AJOUTEZ CETTE MODALE DANS VOTRE RETURN (en dehors de la boucle map) */}
          {editingUser && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-3xl w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 text-white">Modification{editingUser.nomSociete}</h3>

                {/* Nom Société */}
                <input
                  placeholder="Nom de la société"
                  className="w-full bg-black p-3 mb-3 rounded-xl border border-zinc-700 text-white"
                  value={editForm.nomSociete}
                  onChange={(e) => setEditForm({ ...editForm, nomSociete: e.target.value })}
                />

                <input
                  placeholder="Adresse"
                  className="w-full bg-black p-3 mb-3 rounded-xl border border-zinc-700 text-white"
                  value={editForm.adresse ?? ''} // Utilise ?? '' pour éviter undefined
                  onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })}
                />

                {/* Rôle - Menu déroulant */}
                <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Rôle</label>
                <select
                  className="w-full bg-black p-3 mb-3 rounded-xl border border-zinc-700 text-white focus:border-blue-500 outline-none"
                  value={editForm.role || ''}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="" disabled>Sélectionnez un rôle</option>
                  <option value="superviseurs">superviseurs</option>
                  <option value="admin">Admin</option>
                  
                {/* //<option value="client">Client</option>Rôle - Menu déroulant */}
                  <option value="comptable">Comptable</option>
                  <option value="commercial">Commercial</option>
                </select>

                <input
                  placeholder="Téléphone"
                  className="w-full bg-black p-3 mb-6 rounded-xl border border-zinc-700 text-white"
                  value={editForm.telephone ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 p-3 bg-zinc-800 rounded-xl text-white"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 p-3 bg-blue-600 rounded-xl font-bold text-white"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}