import type { NextConfig } from "next";
import withPWAPlugin from "@ducanh2912/next-pwa";

const withPWA = withPWAPlugin({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: false,
  // disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: "standalone",   // ← AJOUT OBLIGATOIRE POUR LE SERVEUR
  images: {
    unoptimized: true,
  },
  turbopack: {},
};

export default withPWA(nextConfig);