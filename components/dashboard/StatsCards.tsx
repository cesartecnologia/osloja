import { AlertTriangle, ClipboardList, PackageCheck, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardKPIs } from '@/types';
import { formatCurrency } from '@/lib/utils';

const items = [
  { key: 'abertas', title: 'OS abertas', icon: ClipboardList },
  { key: 'prontas', title: 'Prontas para retirada', icon: PackageCheck },
  { key: 'faturamento', title: 'Faturamento', icon: Wallet },
  { key: 'emAtraso', title: 'OS em atraso', icon: AlertTriangle }
] as const;

export function StatsCards({ data }: { data: DashboardKPIs }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        const value = item.key === 'faturamento' ? formatCurrency(data.faturamento) : String(data[item.key]);

        return (
          <Card key={item.key} className="min-h-[172px]">
            <CardHeader className="flex min-h-[76px] flex-row items-start justify-between gap-3 space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-sm text-gray-500">{item.title}</CardTitle>
              </div>
              <div className="rounded-lg bg-red-50 p-2 text-red-600">
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="flex min-h-[96px] flex-col justify-end">
              <p className="text-3xl font-bold text-ink">{value}</p>
              {item.key === 'faturamento' ? <p className="mt-2 text-sm text-gray-500">Ticket médio: {formatCurrency(data.ticketMedio)}</p> : <p className="mt-2 text-sm text-gray-400">Atualizado com base no período selecionado.</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
