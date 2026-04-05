'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, LayoutDashboard, Menu, Receipt, Wrench } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';

type NavRequirement = 'dashboard' | 'reports';

type BottomNavItem = {
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

const items: BottomNavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    requires: 'dashboard'
  },
  {
    href: '/os',
    label: 'OS',
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
    href: '/menu',
    label: 'Menu',
    icon: Menu
  }
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const visibleItems = items.filter((item) => {
    if (item.requires === 'dashboard') return canAccessDashboard(user);
    if (item.requires === 'reports') return canAccessReports(user);
    return true;
  });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur md:hidden">
      <div className="grid h-16 grid-cols-5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/menu' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                active ? 'text-red-600' : 'text-gray-500'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}