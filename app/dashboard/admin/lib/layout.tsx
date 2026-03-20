// app/admin/layout.tsx
import Link from 'next/link';
import { LayoutDashboard, ShieldCheck, Users, MapPin, Settings, Database, LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar - Style DISPROMALT */}
      <aside className="w-64 border-r border-zinc-800 flex flex-col p-6">
        <div className="mb-10">
          <h1 className="text-xl font-black text-white">DISPROMALT</h1>
        </div>

        <nav className="flex-1 space-y-8">
          {/* Section Principal */}
          <div>
            <p className="text-[10px] uppercase text-zinc-500 font-bold mb-4 tracking-widest">Principal</p>
            <div className="space-y-2">
              <Link href="/admin/dashboard" className="flex items-center gap-3 text-sm text-zinc-300 hover:text-blue-500"><LayoutDashboard size={18}/> Vue d'ensemble</Link>
              <Link href="/admin/audit" className="flex items-center gap-3 text-sm text-zinc-300 hover:text-blue-500"><ShieldCheck size={18}/> Journal d'Audit</Link>
            </div>
          </div>

          {/* Section Gestion */}
          <div>
            <p className="text-[10px] uppercase text-zinc-500 font-bold mb-4 tracking-widest">Gestion</p>
            <div className="space-y-2">
              <Link href="/admin/users" className="flex items-center gap-3 text-sm text-blue-500 bg-blue-500/10 p-2 rounded-lg"><Users size={18}/> Utilisateurs & RBAC</Link>
              <Link href="/admin/panels" className="flex items-center gap-3 text-sm text-zinc-300 hover:text-blue-500"><MapPin size={18}/> Gestion des Panneaux</Link>
            </div>
          </div>

          {/* Section Système */}
          <div>
            <p className="text-[10px] uppercase text-zinc-500 font-bold mb-4 tracking-widest">Système</p>
            <div className="space-y-2">
              <Link href="/admin/maintenance" className="flex items-center gap-3 text-sm text-zinc-300 hover:text-blue-500"><Database size={18}/> Maintenance & DB</Link>
              <Link href="/admin/settings" className="flex items-center gap-3 text-sm text-zinc-300 hover:text-blue-500"><Settings size={18}/> Paramètres App</Link>
            </div>
          </div>
        </nav>

        {/* Footer Sidebar */}
        <button className="flex items-center gap-3 text-red-500 text-sm font-bold mt-auto">
          <LogOut size={18}/> DÉCONNEXION
        </button>
      </aside>

      {/* Main Body */}
      <main className="flex-1 p-12 bg-black overflow-y-auto">
        {children}
      </main>
    </div>
  );
}