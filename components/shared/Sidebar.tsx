'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Wrench
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';

type NavRequirement = 'dashboard' | 'reports';

type SidebarItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requires?: NavRequirement;
};

function canAccessDashboard(user: ReturnType<typeof useAuth>['user']) {
  return user?.perfil === 'admin';
}

function canAccessReports(user: ReturnType<typeof useAuth>['user']) {
  return user?.perfil === 'admin';
}

const items: SidebarItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    requires: 'dashboard'
  },
  {
    href: '/os',
    label: 'Ordens de serviço',
    icon: Wrench
  },
  {
    href: '/vendas',
    label: 'Vendas',
    icon: Receipt
  },
  {
    href: '/relatorios',
    label: 'Relatórios',
    icon: BarChart3,
    requires: 'reports'
  },
  {
    href: '/usuarios',
    label: 'Usuários',
    icon: Users
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icon: Settings
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, empresa, logout } = useAuth();

  const visibleItems = items.filter((item) => {
    if (item.requires === 'dashboard') return canAccessDashboard(user);
    if (item.requires === 'reports') return canAccessReports(user);
    return true;
  });

  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">
      <div className="flex flex-col items-center gap-4 px-6 py-8">
        {empresa?.logoUrl ? (
          <img
            src={empresa.logoUrl}
            alt="Logo da empresa"
            className="max-h-24 w-auto object-contain"
          />
        ) : (
          <div className="text-sm font-semibold text-gray-400">Sem logo</div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 px-4 py-4">
        <div className="mb-3 px-2">
          <p className="text-sm font-semibold text-gray-900">{user?.nome || 'Usuário'}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}