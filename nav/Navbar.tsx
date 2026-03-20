'use client';
import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const [show, setShow] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const controlNavbar = () => {
    if (typeof window !== 'undefined') {
      if (window.scrollY > lastScrollY && window.scrollY > 50) {
        setShow(false);
      } else {
        setShow(true);
      }
      setLastScrollY(window.scrollY);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar);
      return () => window.removeEventListener('scroll', controlNavbar);
    }
  }, [lastScrollY]);

 const handleLogout = () => {
  // 1. Nettoyage
  localStorage.clear(); 
  sessionStorage.clear();
  
  // 2. Redirection vers la page d'accueil (page.tsx)
  // Utiliser '/' pointe automatiquement vers app/page.tsx
  window.location.replace('/'); 
};

  return (
    <header 
      className={`fixed top-4 left-6 right-6 z-[1000] transition-transform duration-500 ease-in-out ${
        show ? 'translate-y-0' : '-translate-y-24'
      }`}
    >
      <nav className="mx-auto max-w-7xl h-16 bg-zinc-950/70 backdrop-blur-2xl border border-zinc-800/50 rounded-2xl flex items-center justify-between px-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-yellow-500 via-red-500 to-blue-600 rounded-lg flex items-center justify-center font-bold text-black shadow-lg">GKM</div>
          <span className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-red-500 to-blue-600">
            GEO KIN MARKETING 
          </span>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-red-400 transition-colors"
        >
          <LogOut size={16} /> Déconnexion
        </button>
      </nav>
    </header>
  );
}
