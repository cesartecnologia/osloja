'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, ClipboardList, PlusCircle, ReceiptText } from 'lucide-react';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { GraficoReceita } from '@/components/dashboard/GraficoReceita';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/AuthProvider';
import { getDashboardData } from '@/lib/client-data';
import { canAccessDashboard } from '@/lib/access';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!user) return;
    if (!canAccessDashboard(user)) {
      router.replace('/os');
      return;
    }
    let ativo = true;

    async function load() {
      try {
        const dashboardData = await getDashboardData(user.empresaId, 30);
        if (ativo) setData(dashboardData);
      } catch (error) {
        if (ativo) setErro(error instanceof Error ? error.message : 'Erro ao carregar dashboard.');
      }
    }

    void load();
    return () => {
      ativo = false;
    };
  }, [router, user]);

  if (user && !canAccessDashboard(user)) return null;
  if (erro) return <p className="text-sm text-red-600">{erro}</p>;
  if (!data) return <p className="text-sm text-gray-500">Carregando dashboard...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Dashboard</p>
          <h1 className="text-3xl font-bold text-ink">Visão geral da operação</h1>
          <p className="mt-1 text-sm text-gray-500">Acompanhe ordens de serviço, faturamento e andamento do sistema em um só lugar.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/os/nova"><Button><PlusCircle className="mr-2 h-4 w-4" />Nova OS</Button></Link>
          <Link href="/vendas"><Button variant="outline"><ReceiptText className="mr-2 h-4 w-4" />Nova venda</Button></Link>
          <Link href="/os"><Button variant="outline"><ClipboardList className="mr-2 h-4 w-4" />Ver OS</Button></Link>
          <Link href="/relatorios"><Button variant="outline"><BarChart3 className="mr-2 h-4 w-4" />Relatórios</Button></Link>
        </div>
      </div>

      <StatsCards data={data.kpis} />
      <GraficoReceita barras={data.receita7Dias} pizza={data.statusDistribuicao} />
    </div>
  );
}
