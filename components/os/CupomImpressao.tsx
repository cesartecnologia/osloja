import type { ReactNode } from 'react';
import Image from 'next/image';
import { Empresa, LarguraImpressora, OrdemServico } from '@/types';
import { formatCurrency, formatDateBR, toMonospaceLine } from '@/lib/utils';
import { getPrintChars, patternToAsciiGrid } from '@/lib/pattern';
import { getPaymentMethodLabel, getPaymentStatusLabel, getStatusLabel } from '@/lib/labels';

function divider(width: LarguraImpressora) {
  return '─'.repeat(getPrintChars(width));
}

function MonoDivider({ width }: { width: LarguraImpressora }) {
  return <pre className="font-mono text-[inherit] leading-[inherit]">{divider(width)}</pre>;
}

function LabelValue({
  label,
  value,
  uppercase = false,
}: {
  label: string;
  value?: string | number | null;
  uppercase?: boolean;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <p className={`break-words ${uppercase ? 'uppercase' : ''}`}>
      <span className="font-bold">{label}:</span> {value}
    </p>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="font-bold uppercase tracking-[0.04em]">{children}</p>;
}

function NoticeBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="my-1 border border-black px-2 py-1">
      <p className="font-bold uppercase">{title}</p>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
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

function SenhaBlock({ os }: { os: OrdemServico }) {
  if (os.senha.tipo === 'sem_senha') {
    return <LabelValue label="Senha" value="Não informada" uppercase />;
  }

  if (os.senha.tipo === 'numerica') {
    return <LabelValue label="Senha" value={`[NUMÉRICA] ${os.senha.valor}`} uppercase />;
  }

  return (
    <div>
      <p className="font-bold uppercase">Senha: [PADRÃO]</p>
      <pre className="whitespace-pre-wrap font-mono leading-[inherit]">{patternToAsciiGrid(os.senha.valor)}</pre>
    </div>
  );
}

function PaymentBlock({ os, width }: { os: OrdemServico; width: LarguraImpressora }) {
  const chars = getPrintChars(width);
  const forms = (os.pagamento.formas || []).filter((forma) => Number(forma.valor || 0) > 0);

  return (
    <div>
      <SectionTitle>Pagamento</SectionTitle>
      {os.pagamento.entrada ? (
        <pre className="whitespace-pre-wrap font-mono">
          {toMonospaceLine('Entrada', formatCurrency(os.pagamento.entrada), chars)}
        </pre>
      ) : null}
      {forms.map((forma) => (
        <pre key={`${forma.tipo}-${forma.valor}`} className="whitespace-pre-wrap font-mono font-bold">
          {toMonospaceLine(getPaymentMethodLabel(forma.tipo).toUpperCase(), formatCurrency(forma.valor), chars)}
        </pre>
      ))}
      {Number(os.pagamento.saldoDevedor || 0) > 0 ? (
        <pre className="whitespace-pre-wrap font-mono">
          {toMonospaceLine('Saldo retirada', formatCurrency(Number(os.pagamento.saldoDevedor || 0)), chars)}
        </pre>
      ) : null}
      {forms.length === 0 && !os.pagamento.entrada ? <p>Pagamento pendente na retirada.</p> : null}
      <LabelValue label="Status do pagamento" value={getPaymentStatusLabel(os.pagamento.statusPagamento)} />
    </div>
  );
}

function SummaryBlock({ os, width }: { os: OrdemServico; width: LarguraImpressora }) {
  const chars = getPrintChars(width);
  return (
    <div>
      <pre className="whitespace-pre-wrap font-mono">{toMonospaceLine('Subtotal', formatCurrency(os.subtotal), chars)}</pre>
      <pre className="whitespace-pre-wrap font-mono">{toMonospaceLine('Desconto', formatCurrency(os.desconto), chars)}</pre>
      <pre className="whitespace-pre-wrap font-mono font-bold">{toMonospaceLine('TOTAL', formatCurrency(os.total), chars)}</pre>
    </div>
  );
}

function TermsBlock({ empresa, width }: { empresa: Empresa; width: LarguraImpressora }) {
  const termos = empresa.termosCondicoes || 'Termos e condições da empresa.';
  return (
    <div>
      <SectionTitle>Termos e condições</SectionTitle>
      <p className={`print-terms ${width === '58mm' ? 'print-terms-58mm' : ''}`}>{termos}</p>
    </div>
  );
}

function SignatureBlock({ extraLines }: { extraLines?: string[] }) {
  return (
    <div className="mt-2">
      {extraLines?.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p className="mt-2 font-bold">Assinatura do cliente:</p>
      <p className="mt-4">________________________</p>
    </div>
  );
}

function CupomOSCompleta({ empresa, os, width }: { empresa: Empresa; os: OrdemServico; width: LarguraImpressora }) {
  return (
    <div className="print-cut border-b border-dashed border-gray-300 pb-4 pt-2">
      <HeaderBlock empresa={empresa} />
      <MonoDivider width={width} />
      <SectionTitle>Ordem de serviço</SectionTitle>
      <LabelValue label="OS" value={os.numeroFormatado} />
      <LabelValue label="Data" value={formatDateBR(os.dataCriacao, 'dd/MM/yyyy HH:mm')} />
      <MonoDivider width={width} />

      <SectionTitle>Cliente</SectionTitle>
      <LabelValue label="Nome" value={os.cliente.nome} />
      <LabelValue label="Telefone" value={os.cliente.telefone} />
      <MonoDivider width={width} />

      <SectionTitle>Aparelho</SectionTitle>
      <LabelValue label="Marca / Modelo" value={`${os.aparelho.marca} ${os.aparelho.modelo}`} />
      <LabelValue label="Cor" value={os.aparelho.cor || '-'} />
      <LabelValue label="IMEI" value={os.aparelho.imei} />
      <LabelValue label="Acessórios" value={os.aparelho.acessorios?.join(', ') || 'Nenhum informado'} />
      <LabelValue label="Condição" value={os.aparelho.condicaoEntrada} />
      <MonoDivider width={width} />

      <SectionTitle>Senha do aparelho</SectionTitle>
      <SenhaBlock os={os} />
      <MonoDivider width={width} />

      <SectionTitle>Serviços</SectionTitle>
      {os.servicos.map((item) => (
        <div key={`${item.descricao}-${item.valor}`} className="mb-1">
          <p className="font-bold">{item.descricao}</p>
          <pre className="whitespace-pre-wrap font-mono">
            {toMonospaceLine('Valor', formatCurrency(item.valor), getPrintChars(width))}
          </pre>
        </div>
      ))}
      <MonoDivider width={width} />

      <SummaryBlock os={os} width={width} />
      <MonoDivider width={width} />

      <PaymentBlock os={os} width={width} />
      <MonoDivider width={width} />

      <SectionTitle>Dados finais</SectionTitle>
      <LabelValue label="Status" value={getStatusLabel(os.status)} />
      <LabelValue label="Previsão" value={os.previsaoEntrega ? formatDateBR(os.previsaoEntrega, 'dd/MM/yyyy') : undefined} />
      <MonoDivider width={width} />

      <TermsBlock empresa={empresa} width={width} />
      <MonoDivider width={width} />
      <SignatureBlock />
    </div>
  );
}

function CupomRetirada({ empresa, os, width }: { empresa: Empresa; os: OrdemServico; width: LarguraImpressora }) {
  return (
    <div className="print-cut border-b border-dashed border-gray-300 pb-4 pt-2">
      <HeaderBlock empresa={empresa} />
      <MonoDivider width={width} />
      <SectionTitle>Comprovante de retirada</SectionTitle>
      <LabelValue label="Cupom" value={os.numeroFormatado} />
      <LabelValue label="Data" value={formatDateBR(os.dataCriacao, 'dd/MM/yyyy HH:mm')} />
      <MonoDivider width={width} />

      <SectionTitle>Cliente</SectionTitle>
      <LabelValue label="Nome" value={os.cliente.nome} />
      <LabelValue label="Telefone" value={os.cliente.telefone} />
      <MonoDivider width={width} />

      <SectionTitle>Aparelho</SectionTitle>
      <LabelValue label="Marca / Modelo" value={`${os.aparelho.marca} ${os.aparelho.modelo}`} />
      <LabelValue label="IMEI" value={os.aparelho.imei} />
      <LabelValue label="Acessórios" value={os.aparelho.acessorios?.join(', ') || 'Nenhum informado'} />
      <LabelValue label="Previsão de entrega" value={os.previsaoEntrega ? formatDateBR(os.previsaoEntrega, 'dd/MM/yyyy') : undefined} />
      <MonoDivider width={width} />

      <SectionTitle>Serviços previstos</SectionTitle>
      {os.servicos.map((item) => (
        <p key={item.descricao}>
          • <span className="font-bold">{item.descricao}</span>
        </p>
      ))}
      <MonoDivider width={width} />

      <NoticeBox
        title="Importante"
        lines={[
          'Somente será permitida a retirada do aparelho',
          'mediante apresentação deste comprovante.',
        ]}
      />
    </div>
  );
}

function CupomEntrega({
  empresa,
  os,
  width,
  atendente,
}: {
  empresa: Empresa;
  os: OrdemServico;
  width: LarguraImpressora;
  atendente?: string;
}) {
  const dataEntrega = formatDateBR(os.dataEntrega || new Date().toISOString(), 'dd/MM/yyyy HH:mm');
  const nomeAtendente = atendente || os.retiradoPor || 'Não informado';

  return (
    <div className="print-cut border-b border-dashed border-gray-300 pb-4 pt-2">
      <HeaderBlock empresa={empresa} />
      <MonoDivider width={width} />
      <SectionTitle>Comprovante de entrega</SectionTitle>
      <LabelValue label="OS" value={os.numeroFormatado} />
      <LabelValue label="Data / Hora" value={dataEntrega} />
      <MonoDivider width={width} />

      <SectionTitle>Cliente</SectionTitle>
      <LabelValue label="Nome" value={os.cliente.nome} />
      <LabelValue label="Telefone" value={os.cliente.telefone} />
      <MonoDivider width={width} />

      <SectionTitle>Aparelho</SectionTitle>
      <LabelValue label="Marca / Modelo" value={`${os.aparelho.marca} ${os.aparelho.modelo}`} />
      <LabelValue label="IMEI" value={os.aparelho.imei} />
      <LabelValue label="Acessórios" value={os.aparelho.acessorios?.join(', ') || 'Nenhum informado'} />
      <MonoDivider width={width} />

      <SectionTitle>Serviços realizados</SectionTitle>
      {os.servicos.map((item) => (
        <div key={`${item.descricao}-${item.valor}`} className="mb-1">
          <p>
            • <span className="font-bold">{item.descricao}</span>
          </p>
          <pre className="whitespace-pre-wrap font-mono">
            {toMonospaceLine('Valor', formatCurrency(item.valor), getPrintChars(width))}
          </pre>
        </div>
      ))}
      <MonoDivider width={width} />

      <NoticeBox
        title="Declaração do cliente"
        lines={[
          'Declaro que recebi o aparelho em perfeitas',
          'condições aparentes e com o serviço',
          'solicitado devidamente concluído.',
        ]}
      />
      <MonoDivider width={width} />

      <SectionTitle>Pagamento</SectionTitle>
      <pre className="whitespace-pre-wrap font-mono font-bold">
        {toMonospaceLine('TOTAL', formatCurrency(os.total), getPrintChars(width))}
      </pre>
      <LabelValue label="Status do pagamento" value={getPaymentStatusLabel(os.pagamento.statusPagamento)} />
      <LabelValue
        label="Saldo pendente"
        value={Number(os.pagamento.saldoDevedor || 0) > 0 ? formatCurrency(Number(os.pagamento.saldoDevedor || 0)) : 'Sem saldo pendente'}
      />
      <MonoDivider width={width} />

      <SectionTitle>Responsável pelo atendimento</SectionTitle>
      <LabelValue label="Atendente" value={nomeAtendente} />
      <LabelValue label="Entrega registrada em" value={dataEntrega} />
      <MonoDivider width={width} />

      <TermsBlock empresa={empresa} width={width} />
      <MonoDivider width={width} />
      <SignatureBlock extraLines={[`Atendente responsável: ${nomeAtendente}`, `Data da entrega: ${dataEntrega}`]} />
    </div>
  );
}

export function CupomImpressao({
  empresa,
  os,
  width = '58mm',
  mode = 'retirada',
  atendente,
}: {
  empresa: Empresa;
  os: OrdemServico;
  width?: LarguraImpressora;
  mode?: 'completo' | 'retirada' | 'entrega';
  atendente?: string;
}) {
  return (
    <div className={`print-shell rounded-xl border border-gray-200 bg-white p-4 text-black ${width === '58mm' ? 'cupom-58mm' : 'cupom-80mm'}`}>
      {mode === 'completo' ? (
        <CupomOSCompleta empresa={empresa} os={os} width={width} />
      ) : mode === 'entrega' ? (
        <CupomEntrega empresa={empresa} os={os} width={width} atendente={atendente} />
      ) : (
        <CupomRetirada empresa={empresa} os={os} width={width} />
      )}
    </div>
  );
}