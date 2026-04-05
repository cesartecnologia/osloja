import { Package2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface CarrinhoItem {
  nome: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
}

export function CarrinhoVendas({
  itens,
  onRemove
}: {
  itens: CarrinhoItem[];
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      {itens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-sm text-gray-500">
          <Package2 className="mx-auto mb-2 h-5 w-5 text-gray-400" />
          Nenhum item adicionado à venda.
        </div>
      ) : null}

      {itens.map((item, index) => (
        <div key={`${item.nome}-${index}`} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{item.nome}</p>
            <p className="text-sm text-gray-500">
              {item.quantidade} x {formatCurrency(item.valorUnitario)}
            </p>
          </div>
          <div className="ml-3 flex items-center gap-3">
            <p className="font-semibold text-ink">{formatCurrency(item.subtotal)}</p>
            <Button type="button" variant="outline" size="icon" onClick={() => onRemove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
