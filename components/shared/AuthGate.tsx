'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/dashboard')}`);
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Carregando sessão...</div>;
  }

  if (!user) return null;
  return <>{children}</>;
}
