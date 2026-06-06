import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";

// @ts-ignore
import "./globals.css";

const geistSans = Geist({ 
  variable: "--font-geist-sans", 
  subsets: ["latin"] 
});

const geistMono = Geist_Mono({ 
  variable: "--font-geist-mono", 
  subsets: ["latin"] 
});

export const metadata: Metadata = {
  title: "GDPS | Dispromalt Intelligence",
  description: "Système de monitoring digital haute performance",
};

const FloatingParticles = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute w-96 h-96 -top-48 -right-48 rounded-full bg-amber-400/10 blur-3xl animate-pulse" />
      <div className="absolute w-96 h-96 -bottom-48 -left-48 rounded-full bg-amber-400/10 blur-3xl animate-pulse delay-1000" />
      <div className="absolute w-64 h-64 top-1/3 left-1/2 rounded-full bg-amber-500/5 blur-3xl animate-pulse delay-500" />
      <div className="absolute w-80 h-80 bottom-1/4 right-1/3 rounded-full bg-amber-400/8 blur-3xl animate-pulse delay-2000" />
      <div className="absolute w-56 h-56 top-2/3 right-10 rounded-full bg-yellow-500/5 blur-3xl animate-pulse delay-1500" />
      <div className="absolute w-40 h-40 top-1/2 left-1/4 rounded-full bg-amber-400/5 blur-3xl animate-pulse delay-2500" />
    </div>
  );
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#001a33] text-white overflow-x-hidden relative`}
      >
        {/* Arrière-plan avec particules */}
        <FloatingParticles />
        
        {/* Overlay gradient */}
        <div className="fixed inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/10 pointer-events-none z-0" />
        
        {/* Effet glassmorphism léger */}
        <div className="fixed inset-0 backdrop-blur-[1px] pointer-events-none z-0" />
        
        {/* Grille décorative simple - Sans SVG complexe */}
        <div 
          className="fixed inset-0 pointer-events-none z-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(212,175,55,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
        
        {/* Contenu principal */}
        <div className="relative z-10">
          <Providers>
            <main className="min-h-screen w-full">
              {children}
            </main>
          </Providers>
        </div>
      </body>
    </html>
  );
}