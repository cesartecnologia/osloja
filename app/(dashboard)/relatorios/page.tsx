'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { getDashboardData } from '@/lib/client-data';
import { getPaymentMethodLabel } from '@/lib/labels';
import { canAccessReports } from '@/lib/access';

export default function RelatoriosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState('30');
  const [data, setData] = useState<any>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!user) return;
    if (!canAccessReports(user)) {
      router.replace('/os');
      return;
    }
    let ativo = true;
    async function load() {
      try {
        const report = await getDashboardData(user.empresaId, Number(periodo));
        if (ativo) setData(report);
      } catch (error) {
        if (ativo) setErro(error instanceof Error ? error.message : 'Falha ao carregar relatórios.');
      }
    }
    void load();
    return () => { ativo = false; };
  }, [periodo, router, user]);

  if (user && !canAccessReports(user)) return null;
  if (erro) return <p className="text-sm text-red-600">{erro}</p>;
  if (!data) return <p className="text-sm text-gray-500">Carregando relatórios...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Relatórios</p>
          <h1 className="text-3xl font-bold text-ink">Visão financeira e operacional</h1>
        </div>
        <Select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="w-full max-w-[220px]">
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="365">Último ano</option>
        </Select>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card><CardHeader><CardTitle>Financeiro</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className="flex justify-between"><span>Receita do período</span><strong>{formatCurrency(data.kpis.faturamento)}</strong></div><div className="flex justify-between"><span>Ticket médio</span><strong>{formatCurrency(data.kpis.ticketMedio)}</strong></div><div className="flex justify-between"><span>OS prontas</span><strong>{data.kpis.prontas}</strong></div></CardContent></Card>
        <Card><CardHeader><CardTitle>Formas de pagamento</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{data.formasPagamento.map((item: any) => <div key={item.tipo} className="flex justify-between"><span>{getPaymentMethodLabel(item.tipo)}</span><strong>{formatCurrency(item.total)}</strong></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Estoque</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className="flex justify-between"><span>Valor total em estoque</span><strong>{formatCurrency(data.valorTotalEstoque)}</strong></div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Produtos abaixo do mínimo</p>{data.estoqueBaixo.length === 0 ? <p className="text-gray-500">Nenhum alerta de estoque.</p> : null}{data.estoqueBaixo.map((item: any) => <div key={item.id} className="flex justify-between"><span>{item.nome}</span><strong>{item.estoque}</strong></div>)}</CardContent></Card>
      </div>
    </div>
  );
}
