'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { CarrinhoVendas } from '@/components/vendas/CarrinhoVendas';
import { ModalImpressaoVenda } from '@/components/vendas/ModalImpressaoVenda';
import { formatCurrency, formatPhone } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import { createVenda, getEmpresa } from '@/lib/client-data';
import { Empresa, Venda } from '@/types';

interface CarrinhoItem {
  nome: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
}

interface FormaState {
  tipo: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'transferencia';
  valor: string;
  parcelas: number;
}

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
  const [lastVenda, setLastVenda] = useState<Venda | null>(null);
  const [openPrint, setOpenPrint] = useState(false);
  const [paymentTouched, setPaymentTouched] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function load() {
      try {
        if (!user) return;
        const data = await getEmpresa(user.empresaId);
        if (ativo) setEmpresa(data);
      } catch (error) {
        if (ativo) setErro(error instanceof Error ? error.message : 'Falha ao carregar dados da empresa.');
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
        subtotal: valor * qtd
      }
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
      tone: 'warning'
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
          parcelas: item.tipo === 'cartao_credito' ? Number(item.parcelas || 1) : undefined
        }))
        .filter((item) => item.valor > 0);

      if (!formasValidas.length) {
        throw new Error('Informe pelo menos uma forma de pagamento com valor.');
      }

      const venda = await createVenda(user, {
        cliente: {
          nome: clienteNome.trim(),
          telefone: clienteTelefone.trim()
        },
        itens,
        desconto: Number(desconto || 0),
        descontoTipo,
        pagamento: {
          formas: formasValidas,
          saldoDevedor,
          statusPagamento: saldoDevedor <= 0 ? 'pago_total' : 'pendente'
        }
      });

      setLastVenda(venda);
      setOpenPrint(true);
      notify({
        title: 'Venda registrada',
        description: `${venda.numeroFormatado} criada com sucesso.`,
        variant: 'success'
      });
      resetForm();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao finalizar venda.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Venda rápida</p>
            <h1 className="text-3xl font-bold text-ink">Lance uma venda sem estoque e sem cadastro prévio</h1>
            <p className="mt-1 text-sm text-gray-500">
              Informe somente cliente, descrição do item e valor. O sistema gera o comprovante de venda ao finalizar.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={limparVenda}>
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar venda
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
                  <Input type="number" min={0} step="0.01" value={valorUnitario} onChange={(e) => setValorUnitario(e.target.value)} placeholder="0,00" />
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
                <div className="flex items-center justify-between py-1"><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
                <div className="flex items-center justify-between py-1"><span>Desconto</span><strong>{formatCurrency(Math.min(subtotal, descontoCalculado))}</strong></div>
                <div className="flex items-center justify-between py-1 text-base"><span>Total</span><strong>{formatCurrency(total)}</strong></div>
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
                        setFormas((current) => current.map((item, i) => (i === index ? { ...item, tipo: e.target.value as FormaState['tipo'] } : item)));
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
                        setFormas((current) => current.map((item, i) => (i === index ? { ...item, valor: e.target.value } : item)));
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
                          setFormas((current) => current.map((item, i) => (i === index ? { ...item, parcelas: Number(e.target.value) } : item)));
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
                  <div className="flex items-center justify-between"><span>Total informado</span><strong>{formatCurrency(splitTotal)}</strong></div>
                  <div className="mt-1 flex items-center justify-between"><span>Saldo restante</span><strong>{formatCurrency(saldoDevedor)}</strong></div>
                </div>
              </div>

              <Button type="button" className="w-full" disabled={loading || itens.length === 0} onClick={finalizarVenda}>
                <Receipt className="mr-2 h-4 w-4" />
                {loading ? 'Finalizando...' : 'Finalizar venda e imprimir cupom'}
              </Button>
            </CardContent>
          </Card>
        </div>
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
    </>
  );
}
