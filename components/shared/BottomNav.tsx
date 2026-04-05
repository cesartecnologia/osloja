'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardList, Home, Menu, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { canAccessDashboard, canAccessReports } from '@/lib/access';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, requires: 'dashboard' },
  { href: '/os', label: 'OS', icon: ClipboardList },
  { href: '/vendas', label: 'Vendas', icon: ShoppingCart },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3, requires: 'reports' },
  { href: '/configuracoes', label: 'Menu', icon: Menu }
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const visibleItems = items.filter((item) => {
    if (item.requires === 'dashboard') return canAccessDashboard(user);
    if (item.requires === 'reports') return canAccessReports(user);
    return true;
  });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-2 lg:hidden">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))` }}>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl px-1 py-2 text-[11px] font-semibold',
                active ? 'text-red-600' : 'text-gray-500'
              )}
            >
              <Icon className="mb-1 h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
