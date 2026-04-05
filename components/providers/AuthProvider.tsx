'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { bootstrapUser } from '@/lib/client-data';
import { getEmpresa } from '@/lib/repositories';
import { clearAuthCookie, setAuthCookie } from '@/lib/session';
import { Empresa, SessionUser } from '@/types';

type AuthContextValue = {
  firebaseUser: User | null;
  user: SessionUser | null;
  empresa: Empresa | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  async function hydrate(currentUser: User | null) {
    if (!currentUser) {
      setFirebaseUser(null);
      setUser(null);
      setEmpresa(null);
      clearAuthCookie();
      setLoading(false);
      return;
    }

    try {
      setAuthCookie();
      setFirebaseUser(currentUser);
      const profile = await bootstrapUser(currentUser);
      const empresaData = await getEmpresa(profile.empresaId);
      setUser(profile);
      setEmpresa(empresaData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setLoading(true);
      void hydrate(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    firebaseUser,
    user,
    empresa,
    loading,
    refresh: async () => {
      await hydrate(auth.currentUser);
    },
    logout: async () => {
      await signOut(auth);
      clearAuthCookie();
      setFirebaseUser(null);
      setUser(null);
      setEmpresa(null);
    }
  }), [empresa, firebaseUser, loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
