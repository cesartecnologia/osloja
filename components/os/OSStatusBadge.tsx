import { Badge } from '@/components/ui/badge';
import { StatusOS } from '@/types';

const map: Record<StatusOS, { label: string; variant: 'default' | 'info' | 'success' | 'warning' | 'danger' }> = {
  aguardando: { label: 'Aguardando', variant: 'default' },
  em_andamento: { label: 'Em andamento', variant: 'info' },
  aguardando_peca: { label: 'Aguardando peça', variant: 'warning' },
  pronto: { label: 'Pronto para retirada', variant: 'success' },
  entregue: { label: 'Entregue', variant: 'success' },
  cancelado: { label: 'Cancelado', variant: 'danger' }
};

export function OSStatusBadge({ status }: { status: StatusOS }) {
  const current = map[status];
  return <Badge variant={current.variant}>{current.label}</Badge>;
}
