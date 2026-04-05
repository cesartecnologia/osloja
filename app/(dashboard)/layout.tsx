'use client';

import { Sidebar } from '@/components/shared/Sidebar';
import { BottomNav } from '@/components/shared/BottomNav';
import { AuthGate } from '@/components/shared/AuthGate';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-canvas">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-h-screen flex-1 flex-col">
            <main className="flex-1 px-4 py-6 pb-24 xl:px-8">{children}</main>
          </div>
        </div>
        <BottomNav />
      </div>
    </AuthGate>
  );
}
