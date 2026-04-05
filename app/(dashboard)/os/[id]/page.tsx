'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Ban, CheckCircle2, Lock, MessageCircle, PenSquare, Printer, Save, Trash2 } from 'lucide-react';
import { OSForm } from '@/components/os/OSForm';
import { ModalImpressao } from '@/components/os/ModalImpressao';
import { OSStatusBadge } from '@/components/os/OSStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { patternPoints } from '@/lib/pattern';
import { formatCurrency, formatDateBR, formatPhone } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import { deleteOrdemServico, getEmpresa, getOrdemServicoById, saveOrdemServico } from '@/lib/client-data';
import { buildWhatsAppOSMessage, getWhatsAppWebUrl } from '@/lib/whatsapp';
import { getPaymentMethodLabel, getPaymentStatusLabel, getStatusLabel, getTimelineText } from '@/lib/labels';

function PatternSvg({ value }: { value: string }) {
  const points = value.split('');
  const mapped = points.map((digit) => patternPoints.find((item) => item.value === digit)).filter(Boolean) as Array<(typeof patternPoints)[number]>;

  return (
    <svg viewBox="0 0 240 240" className="h-48 w-48 rounded-xl border border-gray-200 bg-gray-50">
      {mapped.length > 1 ? <polyline points={mapped.map((item) => `${item.x},${item.y}`).join(' ')} fill="none" stroke="#DC2626" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {patternPoints.map((point) => <circle key={point.value} cx={point.x} cy={point.y} r="13" fill={points.includes(point.value) ? '#DC2626' : '#E5E7EB'} />)}
    </svg>
  );
}

export default function OSDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { notify, confirm } = useFeedback();
  const [os, setOs] = useState<any>(null);
  const [empresa, setEmpresa] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'completo' | 'retirada' | 'entrega'>('retirada');
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('');
  const [erro, setErro] = useState('');
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'transferencia'>('pix');
  const [deliveryValue, setDeliveryValue] = useState(0);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  useEffect(() => {
    if (!params?.id || !user) return;
    let ativo = true;
    async function load() {
      try {
        const [osData, empresaData] = await Promise.all([getOrdemServicoById(params.id), getEmpresa(user.empresaId)]);
        if (ativo) {
          setOs(osData);
          setEmpresa(empresaData);
          setStatus(osData?.status || 'aguardando');
          setDeliveryValue(Number(osData?.pagamento?.saldoDevedor || 0));
        }
      } catch (error) {
        if (ativo) setErro(error instanceof Error ? error.message : 'Falha ao carregar OS.');
      }
    }
    void load();
    return () => { ativo = false; };
  }, [params?.id, user]);

  useEffect(() => {
    if (!os || !empresa) return;

    const shouldOpenPrint = searchParams.get('imprimir') === 'retirada' && searchParams.get('auto') === '1';
    if (!shouldOpenPrint) return;

    setPrintMode('retirada');
    setPrintOpen(true);

    const url = new URL(window.location.href);
    url.searchParams.delete('imprimir');
    url.searchParams.delete('auto');
    window.history.replaceState({}, '', url.toString());
  }, [empresa, os, searchParams]);

  const senhaRotulo = useMemo(() => {
    if (!os) return '';
    return os.senha.tipo === 'numerica' ? os.senha.valor : os.senha.tipo === 'padrao' ? 'Padrão salvo' : 'Sem senha';
  }, [os]);

  if (erro) return <p className="text-sm text-red-600">{erro}</p>;
  if (!os || !empresa) return <p className="text-sm text-gray-500">Carregando OS...</p>;

  async function refreshOS() {
    const refreshed = await getOrdemServicoById(os.id);
    setOs(refreshed);
    setStatus(refreshed?.status || status);
    setDeliveryValue(Number(refreshed?.pagamento?.saldoDevedor || 0));
    return refreshed;
  }

  async function saveQuickStatus() {
    try {
      if (!user) throw new Error('Sessão não encontrada.');
      await saveOrdemServico(user, { ...os, id: os.id, status });
      await refreshOS();
      notify({ title: 'Status atualizado', description: 'O status da ordem de serviço foi salvo com sucesso.', variant: 'success' });
    } catch (error) {
      notify({ title: 'Falha ao atualizar status', description: error instanceof Error ? error.message : 'Não foi possível atualizar o status da OS.', variant: 'error' });
    }
  }

  function handleOpenWhatsApp() {
    const url = getWhatsAppWebUrl(os?.cliente?.telefone || '', buildWhatsAppOSMessage(empresa, os));
    if (!url) {
      notify({ title: 'Telefone do cliente inválido', description: 'Cadastre um telefone válido na OS para abrir o WhatsApp.', variant: 'warning' });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function finalizarEntrega(comPagamentoFinal: boolean) {
    try {
      if (!user) throw new Error('Sessão não encontrada.');
      setDeliveryLoading(true);
      const saldoAtual = Number(os.pagamento?.saldoDevedor || 0);
      const pagamentosAtuais = (os.pagamento?.formas || []).filter((item: any) => Number(item.valor || 0) > 0);

      if (comPagamentoFinal && deliveryValue <= 0) {
        throw new Error('Informe o valor que será quitado na entrega.');
      }

      const formasAtualizadas = comPagamentoFinal
        ? [...pagamentosAtuais, { tipo: deliveryMethod, valor: Number(deliveryValue || 0) }]
        : pagamentosAtuais;

      const atualizado = {
        ...os,
        id: os.id,
        status: 'entregue' as const,
        retiradoPor: user.nome,
        pagamento: {
          ...os.pagamento,
          formas: formasAtualizadas,
          entrada: Number(os.total || 0),
          saldoDevedor: 0,
          statusPagamento: Number(os.total || 0) > 0 ? 'pago_total' : os.pagamento.statusPagamento
        }
      };

      if (!comPagamentoFinal && saldoAtual > 0) {
        throw new Error('Ainda existe saldo devedor para esta OS.');
      }

      await saveOrdemServico(user, atualizado);
      const refreshed = await refreshOS();
      setDeliveryOpen(false);
      setPrintMode('entrega');
      setPrintOpen(true);
      if (refreshed) setOs(refreshed);
      notify({ title: 'Entrega concluída', description: 'A entrega foi registrada com sucesso e o comprovante foi aberto para impressão.', variant: 'success' });
    } catch (error) {
      notify({ title: 'Falha ao concluir a entrega', description: error instanceof Error ? error.message : 'Não foi possível concluir a entrega.', variant: 'error' });
    } finally {
      setDeliveryLoading(false);
    }
  }

  async function handleCancelOS() {
    try {
      if (!user) throw new Error('Sessão não encontrada.');
      if (os.status === 'cancelado') {
        notify({ title: 'OS já cancelada', description: 'Esta ordem de serviço já está marcada como cancelada.', variant: 'warning' });
        return;
      }
      const confirmed = await confirm({
        title: 'Cancelar ordem de serviço',
        description: 'Deseja realmente cancelar esta ordem de serviço? Você poderá reabrir editando o status depois, se necessário.',
        confirmText: 'Cancelar OS',
        cancelText: 'Voltar',
        tone: 'warning'
      });
      if (!confirmed) return;
      await saveOrdemServico(user, { ...os, id: os.id, status: 'cancelado' });
      await refreshOS();
      notify({ title: 'OS cancelada', description: 'A ordem de serviço foi cancelada com sucesso.', variant: 'success' });
    } catch (error) {
      notify({ title: 'Falha ao cancelar a OS', description: error instanceof Error ? error.message : 'Não foi possível cancelar a ordem de serviço.', variant: 'error' });
    }
  }

  async function handleDeleteOS() {
    try {
      if (!user) throw new Error('Sessão não encontrada.');
      const confirmed = await confirm({
        title: 'Excluir ordem de serviço',
        description: 'Deseja excluir esta ordem de serviço? Esta ação não poderá ser desfeita.',
        confirmText: 'Excluir OS',
        cancelText: 'Manter OS',
        tone: 'danger'
      });
      if (!confirmed) return;
      await deleteOrdemServico(os.id);
      window.location.href = '/os';
    } catch (error) {
      notify({ title: 'Falha ao excluir a OS', description: error instanceof Error ? error.message : 'Não foi possível excluir a ordem de serviço.', variant: 'error' });
    }
  }

  function handleEntrega() {
    if (os.status === 'entregue') {
      setPrintMode('entrega');
      setPrintOpen(true);
      return;
    }

    const saldo = Number(os.pagamento?.saldoDevedor || 0);
    if (saldo > 0) {
      setDeliveryValue(saldo);
      setDeliveryOpen(true);
      return;
    }

    void finalizarEntrega(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Detalhes da OS</p>
          <h1 className="text-3xl font-bold text-ink">{os.numeroFormatado}</h1>
        </div>
        <OSStatusBadge status={os.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>{os.cliente.nome}</CardTitle>
                <p className="mt-1 text-sm text-gray-500">{os.aparelho.marca} {os.aparelho.modelo}</p>
              </div>
              <p className="text-xl font-bold">{formatCurrency(os.total)}</p>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between"><span>Criada em</span><strong>{formatDateBR(os.dataCriacao)}</strong></div>
              <div className="flex items-center justify-between"><span>Telefone</span><strong>{formatPhone(os.cliente.telefone || '')}</strong></div>
              <div className="flex items-center justify-between"><span>Pagamento</span><strong>{getPaymentStatusLabel(os.pagamento.statusPagamento)}</strong></div>
              <div className="flex items-center justify-between"><span>Saldo devedor</span><strong>{formatCurrency(Number(os.pagamento.saldoDevedor || 0))}</strong></div>
              <div className="grid gap-2"><span className="text-gray-500">Condição de entrada</span><div className="rounded-xl bg-gray-50 p-3">{os.aparelho.condicaoEntrada}</div></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Senha do aparelho</p>
                <CardTitle className="mt-1 flex items-center gap-2"><Lock className="h-5 w-5" />{os.senha.tipo === 'padrao' ? 'Senha padrão' : os.senha.tipo === 'numerica' ? 'Senha numérica' : 'Sem senha'}</CardTitle>
              </div>
              <Button type="button" variant="outline" onClick={() => setShowPassword((current) => !current)}>{showPassword ? 'Ocultar' : 'Revelar senha'}</Button>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">{showPassword ? (os.senha.tipo === 'padrao' ? <PatternSvg value={os.senha.valor} /> : <p className="font-mono text-4xl font-bold tracking-[0.35em]">{senhaRotulo}</p>) : <p className="font-mono text-lg text-gray-400">••••••</p>}</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Ações da ordem de serviço</p>
                <CardTitle>Atualize o status e conclua o atendimento</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Status atual da OS</Label>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-white">
                    <option value="aguardando">Aguardando</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="aguardando_peca">Aguardando peça</option>
                    <option value="pronto">Pronto para retirada</option>
                    <option value="entregue">Entregue</option>
                    <option value="cancelado">Cancelado</option>
                  </Select>
                  <Button type="button" onClick={saveQuickStatus} className="h-11 min-w-[180px] rounded-md shadow-sm">
                    <Save className="mr-2 h-4 w-4" />
                    Salvar status
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Button
                  type="button"
                  variant="success"
                  onClick={handleEntrega}
                  className="h-12 justify-start rounded-md px-4 shadow-sm"
                >
                  <CheckCircle2 className="mr-3 h-4 w-4 shrink-0" />
                  <span className="text-left">
                    {os.status === 'entregue' ? 'Reimprimir entrega' : 'Registrar entrega'}
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenWhatsApp}
                  className="h-12 justify-start rounded-md border-green-200 bg-green-50 px-4 text-green-700 hover:bg-green-100"
                >
                  <MessageCircle className="mr-3 h-4 w-4 shrink-0" />
                  <span className="text-left">Enviar no WhatsApp</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPrintMode('completo');
                    setPrintOpen(true);
                  }}
                  className="h-12 justify-start rounded-md px-4"
                >
                  <Printer className="mr-3 h-4 w-4 shrink-0" />
                  <span className="text-left">Cupom completo</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing((current) => !current)}
                  className="h-12 justify-start rounded-md px-4"
                >
                  <PenSquare className="mr-3 h-4 w-4 shrink-0" />
                  <span className="text-left">{editing ? 'Fechar edição' : 'Editar OS'}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCancelOS()}
                  disabled={os.status === 'cancelado'}
                  className="h-12 justify-start rounded-md border-amber-200 bg-amber-50 px-4 text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                >
                  <Ban className="mr-3 h-4 w-4 shrink-0" />
                  <span className="text-left">{os.status === 'cancelado' ? 'OS cancelada' : 'Cancelar OS'}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDeleteOS()}
                  className="h-12 justify-start rounded-md border-red-200 bg-red-50 px-4 text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="mr-3 h-4 w-4 shrink-0" />
                  <span className="text-left">Excluir OS</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Timeline de status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {os.historicoStatus?.map((item: any, index: number) => (
                <div key={`${item.statusNovo}-${index}`} className="relative flex gap-3 pl-1">
                  <div className="flex flex-col items-center">
                    <div className="mt-1 h-3 w-3 rounded-full bg-red-600" />
                    {index < os.historicoStatus.length - 1 ? <div className="mt-2 h-full min-h-10 w-px bg-red-100" /> : null}
                  </div>
                  <div className="flex-1 rounded-xl border border-gray-200 p-4">
                    <p className="font-semibold text-ink">{getTimelineText(item.statusAnterior || null, item.statusNovo)}</p>
                    <p className="mt-1 text-sm text-gray-500">{formatDateBR(item.data)} por {item.usuarioNome}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {editing ? <OSForm initialData={os} /> : (
            <Card>
              <CardHeader><CardTitle>Serviços e pagamento</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Serviços</p>
                  <div className="space-y-3">
                    {os.servicos.map((servico: any, index: number) => (
                      <div key={`${servico.descricao}-${index}`} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{servico.descricao}</span>
                          <strong>{formatCurrency(servico.valor)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 rounded-xl bg-gray-50 p-4 text-sm">
                  <div className="flex items-center justify-between"><span>Subtotal</span><strong>{formatCurrency(os.subtotal)}</strong></div>
                  <div className="flex items-center justify-between"><span>Desconto</span><strong>{formatCurrency(os.desconto)}</strong></div>
                  <div className="flex items-center justify-between"><span>Status</span><strong>{getStatusLabel(os.status)}</strong></div>
                  <div className="flex items-center justify-between text-base"><span>Total</span><strong>{formatCurrency(os.total)}</strong></div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 text-sm">
                  <p className="font-semibold text-ink">Pagamentos lançados</p>
                  <div className="mt-3 space-y-2">
                    {(os.pagamento.formas || []).filter((item: any) => Number(item.valor || 0) > 0).length === 0 ? (
                      <p className="text-gray-500">Nenhum pagamento lançado.</p>
                    ) : (
                      (os.pagamento.formas || [])
                        .filter((item: any) => Number(item.valor || 0) > 0)
                        .map((item: any, index: number) => (
                          <div key={`${item.tipo}-${index}`} className="flex items-center justify-between gap-3">
                            <span>{getPaymentMethodLabel(item.tipo)}</span>
                            <strong>{formatCurrency(Number(item.valor || 0))}</strong>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ModalImpressao
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        os={os}
        empresa={empresa}
        defaultWidth={empresa.configuracoes?.larguraImpressora || '58mm'}
        mode={printMode}
        atendente={user?.nome}
        autoPrint={searchParams.get('imprimir') === 'retirada' && searchParams.get('auto') === '1'}
      />

      {deliveryOpen ? (
        <div className="fixed inset-0 z-50 bg-black/50 p-4">
          <div className="mx-auto mt-16 max-w-lg rounded-xl bg-white p-6 shadow-soft">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Entrega da OS</p>
              <h3 className="text-xl font-bold text-ink">Registrar pagamento final e concluir entrega</h3>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <Label>Forma de pagamento da entrega</Label>
                <Select value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value as typeof deliveryMethod)}>
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao_credito">Cartão de crédito</option>
                  <option value="cartao_debito">Cartão de débito</option>
                  <option value="transferencia">Transferência</option>
                </Select>
              </div>
              <div>
                <Label>Valor a quitar na entrega</Label>
                <Input type="number" step="0.01" value={deliveryValue} onChange={(e) => setDeliveryValue(Number(e.target.value || 0))} />
                <p className="mt-1 text-xs text-gray-500">Saldo atual: {formatCurrency(Number(os.pagamento?.saldoDevedor || 0))}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeliveryOpen(false)} disabled={deliveryLoading}>Cancelar</Button>
              <Button type="button" onClick={() => void finalizarEntrega(true)} disabled={deliveryLoading}>
                {deliveryLoading ? 'Concluindo...' : 'Concluir entrega'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
