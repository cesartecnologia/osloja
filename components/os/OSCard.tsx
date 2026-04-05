import Link from 'next/link';
import { ChevronRight, Smartphone, Wallet, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrdemServico } from '@/types';
import { formatCurrency, formatDateBR, formatPhone } from '@/lib/utils';
import { OSStatusBadge } from '@/components/os/OSStatusBadge';
import { getPaymentStatusLabel } from '@/lib/labels';

export function OSCard({ os }: { os: OrdemServico }) {
  return (
    <Link href={`/os/${os.id}`}>
      <Card className="group h-full overflow-hidden border-gray-200 transition-all hover:-translate-y-1 hover:border-red-200 hover:shadow-soft">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">{os.numeroFormatado}</p>
              <CardTitle className="mt-1 line-clamp-1 text-xl">{os.cliente.nome}</CardTitle>
            </div>
            <OSStatusBadge status={os.status} />
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
            <div className="rounded-lg bg-white p-3 text-red-600 shadow-sm">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">
                {os.aparelho.marca} {os.aparelho.modelo}
              </p>
              <p className="truncate text-sm text-gray-500">{os.aparelho.cor || 'Cor não informada'}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Telefone</p>
              <p className="mt-1 font-semibold text-ink">{formatPhone(os.cliente.telefone || '')}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Total</p>
              <p className="mt-1 font-semibold text-ink">{formatCurrency(os.total)}</p>
            </div>
          </div>

          <div className="space-y-2 rounded-xl bg-gray-50 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-gray-500"><Wrench className="h-4 w-4" /> Atualizada em</span>
              <strong className="text-right text-ink">{formatDateBR(os.dataAtualizacao, 'dd/MM/yyyy')}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-gray-500"><Wallet className="h-4 w-4" /> Pagamento</span>
              <strong className="line-clamp-1 text-right text-ink">{getPaymentStatusLabel(os.pagamento.statusPagamento)}</strong>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-sm font-medium text-gray-500 group-hover:text-red-600">
            <span>Abrir detalhes</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
