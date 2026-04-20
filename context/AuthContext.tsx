"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState(null);

  // Initialisation au chargement
  useEffect(() => {
    const savedUser = localStorage.getItem('userSession');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const login = (userData: any) => {
    localStorage.setItem('userSession', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('userSession');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);