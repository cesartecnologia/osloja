import type { ReactNode } from 'react';
import Image from 'next/image';
import { Empresa, LarguraImpressora, Venda } from '@/types';
import { formatCurrency, formatDateBR, toMonospaceLine } from '@/lib/utils';
import { getPrintChars } from '@/lib/pattern';
import { getPaymentMethodLabel, getPaymentStatusLabel } from '@/lib/labels';

function divider(width: LarguraImpressora) {
  return '─'.repeat(getPrintChars(width));
}

function HeaderBlock({ empresa }: { empresa: Empresa }) {
  return (
    <div className="mb-2 flex flex-col items-center justify-center gap-1 text-center">
      {empresa.logoUrl ? (
        <div className="relative h-16 w-32">
          <Image src={empresa.logoUrl} alt={empresa.nome} fill className="logo-print object-contain" />
        </div>
      ) : null}
      <p className="text-[1.05em] font-bold uppercase">{empresa.nome}</p>
      {empresa.slogan ? <p className="font-semibold">{empresa.slogan}</p> : null}
      {empresa.telefone ? (
        <p>
          <span className="font-bold">Tel:</span> {empresa.telefone}
        </p>
      ) : null}
      {empresa.endereco ? <p>{empresa.endereco}</p> : null}
    </div>
  );
}

function LabelValue({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <p className="break-words">
      <span className="font-bold">{label}:</span> {value}
    </p>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="font-bold uppercase tracking-[0.04em]">{children}</p>;
}

export function CupomVenda({
  empresa,
  venda,
  width = '58mm',
  atendente,
}: {
  empresa: Empresa;
  venda: Venda;
  width?: LarguraImpressora;
  atendente?: string;
}) {
  const chars = getPrintChars(width);
  const paymentForms = (venda.pagamento.formas || []).filter((forma) => Number(forma.valor || 0) > 0);

  return (
    <div className={`print-shell rounded-xl border border-gray-200 bg-white p-4 text-black ${width === '58mm' ? 'cupom-58mm' : 'cupom-80mm'}`}>
      <div className="print-cut pb-2 pt-1">
        <HeaderBlock empresa={empresa} />
        <pre className="font-mono">{divider(width)}</pre>

        <SectionTitle>Comprovante de venda</SectionTitle>
        <LabelValue label="Venda" value={venda.numeroFormatado} />
        <LabelValue label="Data / Hora" value={formatDateBR(venda.dataCriacao, 'dd/MM/yyyy HH:mm')} />
        <LabelValue label="Atendente" value={atendente} />
        <pre className="font-mono">{divider(width)}</pre>

        <SectionTitle>Cliente</SectionTitle>
        <LabelValue label="Nome" value={venda.cliente?.nome || 'Consumidor final'} />
        <LabelValue label="Telefone" value={venda.cliente?.telefone} />
        <pre className="font-mono">{divider(width)}</pre>

        <SectionTitle>Itens</SectionTitle>
        {venda.itens.map((item) => (
          <div key={`${item.nome}-${item.subtotal}`} className="mb-1">
            <p className="font-bold">{item.nome}</p>
            <pre className="whitespace-pre-wrap font-mono">
              {toMonospaceLine(`${item.quantidade} x ${formatCurrency(item.valorUnitario)}`, formatCurrency(item.subtotal), chars)}
            </pre>
          </div>
        ))}
        <pre className="font-mono">{divider(width)}</pre>

        <pre className="whitespace-pre-wrap font-mono">{toMonospaceLine('Subtotal', formatCurrency(venda.subtotal), chars)}</pre>
        <pre className="whitespace-pre-wrap font-mono">{toMonospaceLine('Desconto', formatCurrency(venda.desconto), chars)}</pre>
        <pre className="whitespace-pre-wrap font-mono font-bold">{toMonospaceLine('TOTAL', formatCurrency(venda.total), chars)}</pre>
        <pre className="font-mono">{divider(width)}</pre>

        <SectionTitle>Pagamento</SectionTitle>
        {paymentForms.map((forma) => (
          <pre key={`${forma.tipo}-${forma.valor}`} className="whitespace-pre-wrap font-mono font-bold">
            {toMonospaceLine(getPaymentMethodLabel(forma.tipo).toUpperCase(), formatCurrency(forma.valor), chars)}
          </pre>
        ))}
        {Number(venda.pagamento.saldoDevedor || 0) > 0 ? (
          <pre className="whitespace-pre-wrap font-mono">
            {toMonospaceLine('Saldo pendente', formatCurrency(Number(venda.pagamento.saldoDevedor || 0)), chars)}
          </pre>
        ) : null}
        <LabelValue label="Status do pagamento" value={getPaymentStatusLabel(venda.pagamento.statusPagamento)} />
        <pre className="font-mono">{divider(width)}</pre>

        {empresa.termosCondicoes ? (
          <>
            <SectionTitle>Termos e condições</SectionTitle>
            <p className={`print-terms ${width === '58mm' ? 'print-terms-58mm' : ''}`}>{empresa.termosCondicoes}</p>
            <pre className="font-mono">{divider(width)}</pre>
          </>
        ) : null}

        <p className="mt-2 font-bold">Assinatura do cliente:</p>
        <p className="mt-4">________________________</p>
      </div>
    </div>
  );
}