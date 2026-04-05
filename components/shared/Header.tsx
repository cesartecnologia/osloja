'use client';

import { Bell, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/AuthProvider';

export function Header() {
  const { user, empresa, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 px-4 py-4 backdrop-blur xl:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">{empresa?.nome || 'OS Assistência'}</p>
          <h2 className="text-2xl font-bold text-ink">Olá, {user?.nome || 'usuário'}</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-gray-500">
            <Bell className="h-5 w-5" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => {
              void logout().then(() => {
                window.location.href = '/login';
              });
            }}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
