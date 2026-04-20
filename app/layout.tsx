import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";

// @ts-ignore : Cette ligne force TypeScript à ignorer l'erreur sur le fichier CSS
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#001a33] text-white overflow-x-hidden`} 
        style={{ margin: 0, padding: 0 }}
      >
        <Providers>
          <main className="min-h-screen w-full">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}