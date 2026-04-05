'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardList, Home, LogOut, Settings, ShoppingCart, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { canAccessDashboard, canAccessReports } from '@/lib/access';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, requires: 'dashboard' },
  { href: '/os', label: 'Ordens de serviço', icon: ClipboardList },
  { href: '/vendas', label: 'Vendas', icon: ShoppingCart },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3, requires: 'reports' },
  { href: '/usuarios', label: 'Usuários', icon: Users },
  { href: '/configuracoes', label: 'Configurações', icon: Settings }
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { empresa, user, logout } = useAuth();

  const visibleItems = items.filter((item) => {
    if (item.requires === 'dashboard') return canAccessDashboard(user);
    if (item.requires === 'reports') return canAccessReports(user);
    return true;
  });

  return (
    <aside className="hidden w-72 border-r border-gray-200 bg-white/95 px-4 py-6 lg:flex lg:flex-col">
      <div className="mb-8 px-2">
        <div className="flex flex-col items-center text-center">
          {empresa?.logoUrl ? (
            <div className="relative h-28 w-full max-w-[184px] overflow-hidden">
              <Image src={empresa.logoUrl} alt={empresa?.nome || 'Empresa'} fill className="object-contain" />
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-red-50 text-3xl font-bold text-red-600 shadow-sm">
              {(empresa?.nome || 'E').slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <nav className="space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                active ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50 hover:text-ink'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-gray-200 px-2 pt-5">
        <div className="mb-3 rounded-2xl bg-gray-50 px-4 py-3">
          <p className="truncate text-base font-semibold text-ink">{user?.nome || 'Usuário'}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            void logout().then(() => {
              window.location.href = '/login';
            });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:text-ink"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
