// app/providers.tsx
"use client"; // Ce fichier doit être un Client Component

import { AuthProvider } from "../context/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}