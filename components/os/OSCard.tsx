import Link from 'next/link';
import { ChevronRight, Smartphone, Wallet, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrdemServico } from '@/types';
import { formatCurrency, formatDateBR, formatPhone } from '@/lib/utils';
import { OSStatusBadge } from '@/components/os/OSStatusBadge';
import { getPaymentStatusLabel } from '@/lib/labels';

export function OSCard({ os }: { os: OrdemServico }) {
  return (
    <Link href={`/os/${os.id}`} className="block">
      <Card className="group h-full overflow-hidden rounded-xl border-gray-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-sm">
        <CardHeader className="space-y-3 p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-600">
                {os.numeroFormatado}
              </p>
              <CardTitle className="mt-1 line-clamp-1 text-base font-semibold">
                {os.cliente.nome}
              </CardTitle>
            </div>
            <OSStatusBadge status={os.status} />
          </div>

          <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 p-3">
            <div className="rounded-md bg-white p-2 text-red-600 shadow-sm">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {os.aparelho.marca} {os.aparelho.modelo}
              </p>
              <p className="truncate text-xs text-gray-500">
                {os.aparelho.cor || 'Cor não informada'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 p-4 pt-0">
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                Telefone
              </p>
              <p className="mt-1 line-clamp-1 text-sm font-semibold text-ink">
                {formatPhone(os.cliente.telefone || '')}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 p-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                Total
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {formatCurrency(os.total)}
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Wrench className="h-3.5 w-3.5" />
                Atualizada em
              </span>
              <strong className="text-right text-xs text-ink">
                {formatDateBR(os.dataAtualizacao, 'dd/MM/yyyy')}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Wallet className="h-3.5 w-3.5" />
                Pagamento
              </span>
              <strong className="line-clamp-1 text-right text-xs text-ink">
                {getPaymentStatusLabel(os.pagamento.statusPagamento)}
              </strong>
            </div>
          </div>

          <div className="flex items-center justify-end pt-0.5 text-[11px] font-medium text-red-600">
            Abrir detalhes
            <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}