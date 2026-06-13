import type { NextConfig } from "next";
import withPWAPlugin from "@ducanh2912/next-pwa";

const withPWA = withPWAPlugin({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: false,
  //disable: process.env.NODE_ENV === "development", 
});

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, 
  },
  // AJOUTE CETTE LIGNE ICI POUR CORRIGER L'ERREUR NEXT.JS 16 :
  turbopack: {}, 
};

export default withPWA(nextConfig);