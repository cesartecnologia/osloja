import { OrdemServico } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OSStatusBadge } from '@/components/os/OSStatusBadge';
import { formatCurrency, formatDateBR } from '@/lib/utils';

export function OSRecentes({ items }: { items: OrdemServico[] }) {
  return (
    <Card className="min-h-[250px]">
      <CardHeader>
        <CardTitle>Últimas 5 OS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-gray-500">Nenhuma ordem de serviço encontrada.</p> : null}
        {items.map((item) => (
          <div key={item.id} className="flex min-h-[86px] flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-4">
            <div>
              <p className="font-semibold text-ink">{item.numeroFormatado} • {item.cliente.nome}</p>
              <p className="text-sm text-gray-500">{item.aparelho.marca} {item.aparelho.modelo} • {formatDateBR(item.dataCriacao, 'dd/MM/yyyy')}</p>
            </div>
            <div className="flex items-center gap-3">
              <OSStatusBadge status={item.status} />
              <p className="font-semibold">{formatCurrency(item.total)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
