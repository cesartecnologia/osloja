import { Empresa, OrdemServico } from '@/types';
import { formatCurrency, formatDateBR, onlyDigits } from '@/lib/utils';
import { getPaymentMethodLabel, getStatusLabel } from '@/lib/labels';

function normalizeWhatsAppPhone(phone: string) {
  const digits = onlyDigits(phone || '');
  if (!digits) return '';
  if (digits.length === 13 && digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function buildWhatsAppOSMessage(empresa: Empresa, os: OrdemServico) {
  const formas = (os.pagamento.formas || [])
    .filter((item) => Number(item.valor || 0) > 0)
    .map((item) => `${getPaymentMethodLabel(item.tipo)}: ${formatCurrency(Number(item.valor || 0))}`)
    .join(' | ');

  const linhas = [
    `Olá, ${os.cliente.nome}!`,
    `Segue o comprovante da sua ordem de serviço na ${empresa.nome}.`,
    '',
    `OS: ${os.numeroFormatado}`,
    `Aparelho: ${os.aparelho.marca} ${os.aparelho.modelo}`,
    `Status: ${getStatusLabel(os.status)}`,
    `Total: ${formatCurrency(os.total)}`,
    os.pagamento.entrada ? `Entrada: ${formatCurrency(Number(os.pagamento.entrada || 0))}` : '',
    Number(os.pagamento.saldoDevedor || 0) > 0 ? `Saldo pendente: ${formatCurrency(Number(os.pagamento.saldoDevedor || 0))}` : '',
    formas ? `Pagamento: ${formas}` : '',
    os.previsaoEntrega ? `Previsão: ${formatDateBR(os.previsaoEntrega, 'dd/MM/yyyy')}` : '',
    '',
    'Condição de entrada:',
    os.aparelho.condicaoEntrada,
    empresa.termosCondicoes ? '' : '',
    empresa.termosCondicoes ? 'Termos e condições:' : '',
    empresa.termosCondicoes || ''
  ].filter(Boolean);

  return linhas.join('\n');
}

export function getWhatsAppWebUrl(phone: string, message: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) return null;
  return `https://web.whatsapp.com/send?phone=${normalizedPhone}&text=${encodeURIComponent(message)}`;
}
