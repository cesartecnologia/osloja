'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, MoreVertical, Pencil, Plus, Receipt, Trash2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { CarrinhoVendas } from '@/components/vendas/CarrinhoVendas';
import { ModalImpressaoVenda } from '@/components/vendas/ModalImpressaoVenda';
import { formatCurrency, formatDateBR, formatPhone } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import { cancelVenda, createVenda, deleteVenda, getEmpresa, listVendas, updateVenda } from '@/lib/repositories';
import type { Empresa, Venda } from '@/types';

interface CarrinhoItem {
  nome: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
  produtoId?: string;
}

interface FormaState {
  tipo: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'transferencia';
  valor: string;
  parcelas: number;
}

type VendaStatus = 'ativa' | 'cancelada';
type VendaView = Venda & { status?: VendaStatus };

const EMPTY_PAYMENT: FormaState = { tipo: 'dinheiro', valor: '', parcelas: 1 };

export function PDVForm() {
  const { user } = useAuth();
  const { notify, confirm } = useFeedback();

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [itemNome, setItemNome] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [valorUnitario, setValorUnitario] = useState('');
  const [itens, setItens] = useState<CarrinhoItem[]>([]);
  const [desconto, setDesconto] = useState('0');
  const [descontoTipo, setDescontoTipo] = useState<'valor' | 'percentual'>('valor');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [formas, setFormas] = useState<FormaState[]>([{ ...EMPTY_PAYMENT }]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [lastVenda, setLastVenda] = useState<VendaView | null>(null);
  const [openPrint, setOpenPrint] = useState(false);
  const [paymentTouched, setPaymentTouched] = useState(false);

  const [vendas, setVendas] = useState<VendaView[]>([]);
  const [selectedVenda, setSelectedVenda] = useState<VendaView | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);
  const [editingVendaId, setEditingVendaId] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function load() {
      try {
        if (!user) return;
        const [empresaData, vendasData] = await Promise.all([
          getEmpresa(user.empresaId),
          listVendas(user.empresaId),
        ]);

        if (ativo) {
          setEmpresa(empresaData);
          setVendas(vendasData);
        }
      } catch (error) {
        if (ativo) {
          setErro(error instanceof Error ? error.message : 'Falha ao carregar dados.');
        }
      }
    }

    void load();

    return () => {
      ativo = false;
    };
  }, [user]);

  const subtotal = useMemo(() => itens.reduce((acc, item) => acc + item.subtotal, 0), [itens]);
  const descontoNumero = Number(desconto || 0);

  const descontoCalculado = useMemo(() => {
    if (descontoTipo === 'percentual') {
      return subtotal * (descontoNumero / 100);
    }
    return descontoNumero;
  }, [descontoNumero, descontoTipo, subtotal]);

  const total = Math.max(0, subtotal - descontoCalculado);

  useEffect(() => {
    if (!paymentTouched) {
      setFormas((current) => {
        const next = [...current];
        if (!next.length) return [{ ...EMPTY_PAYMENT, valor: total > 0 ? total.toFixed(2) : '' }];
        next[0] = { ...next[0], valor: total > 0 ? total.toFixed(2) : '' };
        return next;
      });
    }
  }, [paymentTouched, total]);

  const splitTotal = formas.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const saldoDevedor = Math.max(0, total - splitTotal);

  function resetForm() {
    setItemNome('');
    setQuantidade(1);
    setValorUnitario('');
    setItens([]);
    setDesconto('0');
    setDescontoTipo('valor');
    setClienteNome('');
    setClienteTelefone('');
    setFormas([{ ...EMPTY_PAYMENT }]);
    setPaymentTouched(false);
    setErro('');
    setEditingVendaId(null);
  }

  function addItem() {
    const nome = itemNome.trim();
    const valor = Number(valorUnitario || 0);
    const qtd = Math.max(1, Number(quantidade || 1));

    if (!nome) {
      setErro('Informe a descrição do item.');
      return;
    }

    if (valor <= 0) {
      setErro('Informe um valor unitário maior que zero.');
      return;
    }

    setItens((current) => [
      ...current,
      {
        nome,
        quantidade: qtd,
        valorUnitario: valor,
        subtotal: valor * qtd,
      },
    ]);
    setItemNome('');
    setQuantidade(1);
    setValorUnitario('');
    setErro('');
  }

  async function limparVenda() {
    const ok = await confirm({
      title: 'Limpar venda rápida',
      description: 'Deseja remover os dados preenchidos desta venda?',
      confirmText: 'Limpar',
      cancelText: 'Voltar',
      tone: 'warning',
    });

    if (ok) resetForm();
  }

  async function finalizarVenda() {
    setLoading(true);
    setErro('');

    try {
      if (!user) throw new Error('Sessão não encontrada.');
      if (!itens.length) throw new Error('Adicione pelo menos um item à venda.');
      if (!clienteNome.trim()) throw new Error('Informe o nome do cliente.');

      const formasValidas = formas
        .map((item) => ({
          tipo: item.tipo,
          valor: Number(item.valor || 0),
          parcelas: item.tipo === 'cartao_credito' ? Number(item.parcelas || 1) : undefined,
        }))
        .filter((item) => item.valor > 0);

      if (!formasValidas.length) {
        throw new Error('Informe pelo menos uma forma de pagamento com valor.');
      }

      if (editingVendaId) {
        const atualizada = await updateVenda(editingVendaId, {
          cliente: {
            nome: clienteNome.trim(),
            telefone: clienteTelefone.trim(),
          },
          itens,
          desconto: Number(desconto || 0),
          descontoTipo,
          pagamento: {
            formas: formasValidas,
            saldoDevedor,
            statusPagamento: saldoDevedor <= 0 ? 'pago_total' : 'pendente',
          },
        } as Partial<Venda> & { itens: Venda['itens'] });

        setVendas((current) =>
          current.map((item) => (item.id === editingVendaId ? { ...item, ...atualizada } : item))
        );

        notify({
          title: 'Venda atualizada',
          description: `${atualizada.numeroFormatado} atualizada com sucesso.`,
          variant: 'success',
        });
      } else {
        const venda = await createVenda(user, {
          cliente: {
            nome: clienteNome.trim(),
            telefone: clienteTelefone.trim(),
          },
          itens,
          desconto: Number(desconto || 0),
          descontoTipo,
          pagamento: {
            formas: formasValidas,
            saldoDevedor,
            statusPagamento: saldoDevedor <= 0 ? 'pago_total' : 'pendente',
          },
        });

        const vendaView: VendaView = { ...venda, status: 'ativa' };

        setLastVenda(vendaView);
        setOpenPrint(true);
        setVendas((current) => [vendaView, ...current]);

        notify({
          title: 'Venda registrada',
          description: `${venda.numeroFormatado} criada com sucesso.`,
          variant: 'success',
        });
      }

      resetForm();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao finalizar venda.');
    } finally {
      setLoading(false);
    }
  }

  function editarVenda(venda: VendaView) {
    setEditingVendaId(venda.id);
    setClienteNome(venda.cliente?.nome || '');
    setClienteTelefone(venda.cliente?.telefone || '');
    setItens(
      (venda.itens || []).map((item) => ({
        nome: item.nome,
        quantidade: Number(item.quantidade || 1),
        valorUnitario: Number(item.valorUnitario || 0),
        subtotal: Number(item.subtotal || 0),
        produtoId: item.produtoId,
      }))
    );
    setDesconto(String(Number(venda.desconto || 0)));
    setDescontoTipo(venda.descontoTipo || 'valor');
    setFormas(
      (venda.pagamento?.formas || []).length
        ? venda.pagamento.formas.map((item) => ({
            tipo: item.tipo,
            valor: String(Number(item.valor || 0)),
            parcelas: Number(item.parcelas || 1),
          }))
        : [{ ...EMPTY_PAYMENT }]
    );
    setPaymentTouched(true);
    setActionsOpenId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function excluirVenda(id: string) {
    const ok = await confirm({
      title: 'Excluir venda',
      description: 'Deseja excluir esta venda? Esta ação não poderá ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Voltar',
      tone: 'danger',
    });

    if (!ok) return;

    await deleteVenda(id);
    setVendas((current) => current.filter((item) => item.id !== id));
    setActionsOpenId(null);

    notify({
      title: 'Venda excluída',
      description: 'A venda foi excluída com sucesso.',
      variant: 'success',
    });
  }

  async function cancelarRegistroVenda(id: string) {
    const ok = await confirm({
      title: 'Cancelar venda',
      description: 'Deseja marcar esta venda como cancelada?',
      confirmText: 'Cancelar venda',
      cancelText: 'Voltar',
      tone: 'warning',
    });

    if (!ok) return;

    const cancelada = await cancelVenda(id);
    setVendas((current) =>
      current.map((item) => (item.id === id ? { ...item, ...cancelada } : item))
    );
    setActionsOpenId(null);

    notify({
      title: 'Venda cancelada',
      description: 'A venda foi marcada como cancelada.',
      variant: 'success',
    });
  }

  function abrirDetalhes(venda: VendaView) {
    setSelectedVenda(venda);
    setDetailsOpen(true);
    setActionsOpenId(null);
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Venda rápida</p>
            <h1 className="text-3xl font-bold text-ink">
              {editingVendaId ? 'Editar venda rápida' : 'Lance uma venda rápida'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Informe cliente, descrição do item e valor. As vendas ficam listadas abaixo com ações rápidas.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={limparVenda}>
              <Trash2 className="mr-2 h-4 w-4" />
              {editingVendaId ? 'Cancelar edição' : 'Limpar venda'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Itens da venda</CardTitle>
              <CardDescription>Adicione manualmente os itens que serão vendidos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
              <div className="grid gap-4 md:grid-cols-[1.5fr_120px_180px_auto]">
                <div>
                  <Label>Descrição do item</Label>
                  <Input
                    value={itemNome}
                    onChange={(e) => setItemNome(e.target.value)}
                    placeholder="Ex.: Capinha Samsung A54, película, carregador..."
                  />
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Valor unitário</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={valorUnitario}
                    onChange={(e) => setValorUnitario(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </div>

              <CarrinhoVendas itens={itens} onRemove={(index) => setItens((current) => current.filter((_, i) => i !== index))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fechamento da venda</CardTitle>
              <CardDescription>Preencha os dados básicos e finalize com cupom.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Nome do cliente" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Desconto</Label>
                  <Input type="number" step="0.01" min={0} value={desconto} onChange={(e) => setDesconto(e.target.value)} />
                </div>
                <div>
                  <Label>Tipo do desconto</Label>
                  <Select value={descontoTipo} onChange={(e) => setDescontoTipo(e.target.value as 'valor' | 'percentual')}>
                    <option value="valor">R$</option>
                    <option value="percentual">%</option>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 text-sm">
                <div className="flex items-center justify-between py-1">
                  <span>Subtotal</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Desconto</span>
                  <strong>{formatCurrency(Math.min(subtotal, descontoCalculado))}</strong>
                </div>
                <div className="flex items-center justify-between py-1 text-base">
                  <span>Total</span>
                  <strong>{formatCurrency(total)}</strong>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Pagamento</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPaymentTouched(true);
                      setFormas((current) => [...current, { ...EMPTY_PAYMENT }]);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar forma
                  </Button>
                </div>

                {formas.map((forma, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[1fr_160px_80px_auto]">
                    <Select
                      value={forma.tipo}
                      onChange={(e) => {
                        setPaymentTouched(true);
                        setFormas((current) =>
                          current.map((item, i) => (i === index ? { ...item, tipo: e.target.value as FormaState['tipo'] } : item))
                        );
                      }}
                    >
                      <option value="dinheiro">Dinheiro</option>
                      <option value="pix">PIX</option>
                      <option value="cartao_credito">Cartão de crédito</option>
                      <option value="cartao_debito">Cartão de débito</option>
                      <option value="transferencia">Transferência</option>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={forma.valor}
                      onChange={(e) => {
                        setPaymentTouched(true);
                        setFormas((current) =>
                          current.map((item, i) => (i === index ? { ...item, valor: e.target.value } : item))
                        );
                      }}
                      placeholder="Valor"
                    />
                    {forma.tipo === 'cartao_credito' ? (
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={forma.parcelas}
                        onChange={(e) => {
                          setPaymentTouched(true);
                          setFormas((current) =>
                            current.map((item, i) => (i === index ? { ...item, parcelas: Number(e.target.value) } : item))
                          );
                        }}
                      />
                    ) : (
                      <div className="rounded-lg border border-transparent px-3 py-2 text-center text-xs text-gray-400">1x</div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setPaymentTouched(true);
                        setFormas((current) => {
                          if (current.length === 1) return [{ ...EMPTY_PAYMENT }];
                          return current.filter((_, i) => i !== index);
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Total informado</span>
                    <strong>{formatCurrency(splitTotal)}</strong>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span>Saldo restante</span>
                    <strong>{formatCurrency(saldoDevedor)}</strong>
                  </div>
                </div>
              </div>

              <Button type="button" className="w-full" disabled={loading || itens.length === 0} onClick={finalizarVenda}>
                <Receipt className="mr-2 h-4 w-4" />
                {loading
                  ? editingVendaId
                    ? 'Salvando...'
                    : 'Finalizando...'
                  : editingVendaId
                    ? 'Salvar alterações'
                    : 'Finalizar venda e imprimir cupom'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vendas registradas</CardTitle>
            <CardDescription>Use o botão de ações para detalhar, editar, cancelar ou excluir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!vendas.length ? (
              <p className="text-sm text-gray-500">Nenhuma venda registrada ainda.</p>
            ) : (
              vendas.map((venda) => (
                <div key={venda.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{venda.numeroFormatado}</p>
                      <p className="text-sm text-gray-500">{venda.cliente?.nome || 'Consumidor final'}</p>
                      <p className="text-xs text-gray-500">{formatDateBR(venda.dataCriacao, 'dd/MM/yyyy HH:mm')}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(venda.total)}</p>
                        <p className={`text-xs ${venda.status === 'cancelada' ? 'text-red-600' : 'text-gray-500'}`}>
                          {venda.status === 'cancelada' ? 'Cancelada' : 'Ativa'}
                        </p>
                      </div>

                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setActionsOpenId((current) => (current === venda.id ? null : venda.id))}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>

                        {actionsOpenId === venda.id ? (
                          <div className="absolute right-0 top-12 z-20 min-w-[180px] rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                              onClick={() => abrirDetalhes(venda)}
                            >
                              <Eye className="h-4 w-4" />
                              Detalhar
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                              onClick={() => editarVenda(venda)}
                            >
                              <Pencil className="h-4 w-4" />
                              Editar
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                              onClick={() => void cancelarRegistroVenda(venda.id)}
                              disabled={venda.status === 'cancelada'}
                            >
                              <Ban className="h-4 w-4" />
                              Cancelar
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                              onClick={() => void excluirVenda(venda.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-gray-600 md:grid-cols-3">
                    <div>
                      <span className="font-medium text-ink">Itens:</span> {venda.itens.length}
                    </div>
                    <div>
                      <span className="font-medium text-ink">Telefone:</span> {venda.cliente?.telefone || '-'}
                    </div>
                    <div>
                      <span className="font-medium text-ink">Pagamento:</span> {venda.pagamento?.statusPagamento || '-'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {empresa && lastVenda ? (
        <ModalImpressaoVenda
          open={openPrint}
          onClose={() => setOpenPrint(false)}
          empresa={empresa}
          venda={lastVenda}
          defaultWidth={empresa.configuracoes?.larguraImpressora || '58mm'}
          atendente={user?.nome}
          autoPrint
        />
      ) : null}

      {detailsOpen && selectedVenda ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4">
          <div className="mx-auto mt-10 max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Detalhes da venda</p>
                <h3 className="text-2xl font-bold text-ink">{selectedVenda.numeroFormatado}</h3>
              </div>
              <Button type="button" variant="outline" onClick={() => setDetailsOpen(false)}>
                Fechar
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid gap-2 md:grid-cols-2">
                <div><span className="font-medium text-ink">Cliente:</span> {selectedVenda.cliente?.nome || 'Consumidor final'}</div>
                <div><span className="font-medium text-ink">Telefone:</span> {selectedVenda.cliente?.telefone || '-'}</div>
                <div><span className="font-medium text-ink">Data:</span> {formatDateBR(selectedVenda.dataCriacao, 'dd/MM/yyyy HH:mm')}</div>
                <div><span className="font-medium text-ink">Status:</span> {selectedVenda.status === 'cancelada' ? 'Cancelada' : 'Ativa'}</div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="mb-3 font-semibold text-ink">Itens</p>
                <div className="space-y-2">
                  {selectedVenda.itens.map((item, index) => (
                    <div key={`${item.nome}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                      <span>{item.quantidade}x {item.nome}</span>
                      <strong>{formatCurrency(item.subtotal)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 text-sm">
                <div className="flex items-center justify-between py-1"><span>Subtotal</span><strong>{formatCurrency(selectedVenda.subtotal)}</strong></div>
                <div className="flex items-center justify-between py-1"><span>Desconto</span><strong>{formatCurrency(selectedVenda.desconto)}</strong></div>
                <div className="flex items-center justify-between py-1 text-base"><span>Total</span><strong>{formatCurrency(selectedVenda.total)}</strong></div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
