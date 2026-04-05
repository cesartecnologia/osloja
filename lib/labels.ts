import { FormaPagamento, StatusOS } from '@/types';

export const statusLabels: Record<StatusOS, string> = {
  aguardando: 'Aguardando',
  em_andamento: 'Em andamento',
  aguardando_peca: 'Aguardando peça',
  pronto: 'Pronto para retirada',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

export const paymentStatusLabels = {
  pendente: 'Pendente',
  entrada_paga: 'Entrada paga',
  pago_total: 'Pago totalmente'
} as const;

export const paymentMethodLabels: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  transferencia: 'Transferência'
};

export function getStatusLabel(status?: StatusOS | null) {
  if (!status) return '—';
  return statusLabels[status] || status;
}

export function getPaymentStatusLabel(status?: keyof typeof paymentStatusLabels | string | null) {
  if (!status) return '—';
  return paymentStatusLabels[status as keyof typeof paymentStatusLabels] || String(status);
}

export function getPaymentMethodLabel(method?: FormaPagamento | string | null) {
  if (!method) return '—';
  return paymentMethodLabels[method as FormaPagamento] || String(method);
}

export function getTimelineText(previous: StatusOS | null, next: StatusOS) {
  if (!previous) return `OS criada como ${getStatusLabel(next)}`;
  return `${getStatusLabel(previous)} → ${getStatusLabel(next)}`;
}
