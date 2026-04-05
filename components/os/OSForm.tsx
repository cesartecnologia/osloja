'use client';

import { KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, TriangleAlert, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { osSchema } from '@/lib/validations';
import { OrdemServico } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { formatCurrency, onlyDigits } from '@/lib/utils';
import { SenhaModal } from '@/components/os/SenhaModal';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import { listClientes, saveOrdemServico } from '@/lib/client-data';
import { getPaymentStatusLabel, getStatusLabel } from '@/lib/labels';

type OSFormValues = z.infer<typeof osSchema>;

const steps = ['Cliente e aparelho', 'Senha do aparelho', 'Serviços', 'Pagamento e observações'];

const marcasAparelho = [
  'Apple',
  'Samsung',
  'Motorola',
  'Xiaomi',
  'LG',
  'Realme',
  'Poco',
  'Asus',
  'Nokia',
  'Huawei',
  'OnePlus',
  'Oppo',
  'Vivo',
  'Infinix',
  'Multilaser',
  'Positivo',
  'Outro'
];

const acessoriosOptions = [
  { value: 'carregador', label: 'Carregador' },
  { value: 'capa', label: 'Capa' },
  { value: 'chip', label: 'Chip' }
];

const defaultValues: OSFormValues = {
  cliente: { nome: '', telefone: '', cpf: '', email: '', endereco: '' },
  aparelho: { marca: '', modelo: '', imei: '', cor: '', acessorios: [], condicaoEntrada: '' },
  senha: { tipo: 'sem_senha', valor: '' },
  servicos: [{ descricao: '', valor: 0, garantiaDias: 0 }],
  pecas: [],
  desconto: 0,
  descontoTipo: 'valor',
  pagamento: {
    formas: [],
    entrada: 0,
    saldoDevedor: 0,
    statusPagamento: 'pendente'
  },
  tecnico: '',
  tecnicoId: '',
  observacoes: '',
  previsaoEntrega: '',
  status: 'aguardando',
  origemOS: 'balcao'
};

function normalizeInitialData(initialData?: Partial<OrdemServico>): OSFormValues {
  if (!initialData) return defaultValues;

  return {
    ...defaultValues,
    ...initialData,
    cliente: { ...defaultValues.cliente, ...initialData.cliente },
    aparelho: { ...defaultValues.aparelho, ...initialData.aparelho },
    senha: { ...defaultValues.senha, ...initialData.senha },
    servicos: initialData.servicos?.length
      ? initialData.servicos.map((item) => ({
          descricao: item.descricao || '',
          valor: Number(item.valor || 0),
          garantiaDias: Number(item.garantiaDias || 0)
        }))
      : defaultValues.servicos,
    pecas: [],
    pagamento: {
      ...defaultValues.pagamento,
      ...initialData.pagamento,
      formas: (initialData.pagamento?.formas || []).map((item) => ({
        tipo: item.tipo,
        valor: Number(item.valor || 0),
        parcelas: item.parcelas ? Number(item.parcelas) : undefined
      }))
    },
    tecnico: '',
    tecnicoId: ''
  };
}

function hasServiceContent(item?: { descricao?: string; valor?: number }) {
  return Boolean(item?.descricao?.trim() || Number(item?.valor || 0) > 0);
}

function getStepFields(step: number, passwordType: OSFormValues['senha']['tipo']) {
  if (step === 0) return ['cliente', 'aparelho'] as const;
  if (step === 1) {
    if (passwordType === 'sem_senha') return ['senha.tipo'] as const;
    return ['senha'] as const;
  }
  if (step === 2) return ['servicos', 'desconto', 'descontoTipo'] as const;
  return ['pagamento', 'previsaoEntrega', 'status', 'origemOS', 'observacoes'] as const;
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

export function OSForm({ initialData }: { initialData?: Partial<OrdemServico> }) {
  const [step, setStep] = useState(0);
  const [patternOpen, setPatternOpen] = useState(false);
  const [clients, setClients] = useState<Array<Record<string, string>>>([]);
  const [loading, setLoading] = useState(false);
  const [formAlert, setFormAlert] = useState('');
  const { user } = useAuth();
  const { notify } = useFeedback();

  const form = useForm<OSFormValues>({
    resolver: zodResolver(osSchema),
    defaultValues: normalizeInitialData(initialData),
    mode: 'onChange'
  });

  const serviceArray = useFieldArray({ control: form.control, name: 'servicos' });
  const paymentArray = useFieldArray({ control: form.control, name: 'pagamento.formas' });

  useEffect(() => {
    let ativo = true;

    async function load() {
      try {
        if (!user) return;
        const allClients = await listClientes(user.empresaId);
        if (ativo) setClients(Array.isArray(allClients) ? allClients : []);
      } catch (error) {
        if (ativo) console.error(error);
      }
    }

    void load();
    return () => {
      ativo = false;
    };
  }, [user]);

  const watchedServices = useWatch({ control: form.control, name: 'servicos' }) || [];
  const watchedDiscount = Number(useWatch({ control: form.control, name: 'desconto' }) || 0);
  const watchedDiscountType = useWatch({ control: form.control, name: 'descontoTipo' });
  const watchedEntry = Number(useWatch({ control: form.control, name: 'pagamento.entrada' }) || 0);
  const watchedPayments = useWatch({ control: form.control, name: 'pagamento.formas' }) || [];
  const watchedClientName = useWatch({ control: form.control, name: 'cliente.nome' });
  const watchedPasswordType = useWatch({ control: form.control, name: 'senha.tipo' });
  const watchedAccessories = useWatch({ control: form.control, name: 'aparelho.acessorios' }) || [];

  useEffect(() => {
    const existing = clients.find((item) => item.nome === watchedClientName);
    if (!existing) return;
    form.setValue('cliente.telefone', existing.telefone || '');
    form.setValue('cliente.cpf', existing.cpf || '');
    form.setValue('cliente.email', existing.email || '');
    form.setValue('cliente.endereco', existing.endereco || '');
  }, [watchedClientName, clients, form]);

  const validServices = useMemo(
    () => watchedServices.filter((item) => hasServiceContent(item)).map((item) => ({
      descricao: item.descricao?.trim() || '',
      valor: Number(item.valor || 0),
      garantiaDias: 0
    })),
    [watchedServices]
  );

  const subtotal = useMemo(
    () => validServices.reduce((acc, item) => acc + Number(item.valor || 0), 0),
    [validServices]
  );

  const discountValue = useMemo(() => {
    if (watchedDiscountType === 'percentual') return subtotal * (watchedDiscount / 100);
    return watchedDiscount;
  }, [subtotal, watchedDiscount, watchedDiscountType]);

  const total = useMemo(() => Math.max(0, subtotal - discountValue), [subtotal, discountValue]);

  const validPayments = useMemo(
    () => watchedPayments.filter((item) => Number(item?.valor || 0) > 0),
    [watchedPayments]
  );

  const splitTotal = useMemo(
    () => validPayments.reduce((acc, item) => acc + Number(item.valor || 0), 0),
    [validPayments]
  );

  const restanteAlocar = Math.max(0, total - splitTotal);
  const saldoDevedor = Math.max(0, total - watchedEntry);

  useEffect(() => {
    form.setValue('pagamento.saldoDevedor', saldoDevedor);
    const status =
      watchedEntry > 0 && saldoDevedor > 0 ? 'entrada_paga' : saldoDevedor <= 0 && total > 0 ? 'pago_total' : 'pendente';
    form.setValue('pagamento.statusPagamento', status);
  }, [form, saldoDevedor, total, watchedEntry]);

  async function goToNextStep() {
    setFormAlert('');

    if (step === 2 && serviceArray.fields.length > 1) {
      const currentServices = form.getValues('servicos');
      const filteredServices = currentServices.filter((item) => hasServiceContent(item));
      if (filteredServices.length !== currentServices.length) {
        form.setValue('servicos', filteredServices.length ? filteredServices : [{ descricao: '', valor: 0, garantiaDias: 0 }], { shouldValidate: true });
      }
    }

    const valid = await form.trigger(getStepFields(step, watchedPasswordType as OSFormValues['senha']['tipo']));

    if (step === 2 && validServices.length === 0) {
      setFormAlert('Adicione pelo menos um serviço com descrição e valor para continuar.');
      return;
    }

    if (!valid) {
      setFormAlert('Revise os campos obrigatórios desta etapa antes de continuar.');
      return;
    }

    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  async function submitFormValues(values: OSFormValues) {
    if (step !== steps.length - 1) {
      setFormAlert('Conclua todas as etapas e clique em Criar OS somente no final.');
      return;
    }

    setLoading(true);
    setFormAlert('');

    try {
      if (!user) throw new Error('Sessão não encontrada.');

      const filteredServices = values.servicos
        .filter((item) => hasServiceContent(item))
        .map((item) => ({
          descricao: item.descricao.trim(),
          valor: Number(item.valor || 0),
          garantiaDias: 0
        }));

      if (filteredServices.length === 0) {
        setStep(2);
        throw new Error('Adicione pelo menos um serviço válido para salvar a OS.');
      }

      const filteredPayments = (values.pagamento.formas || [])
        .filter((item) => Number(item.valor || 0) > 0)
        .map((item) => ({
          tipo: item.tipo,
          valor: Number(item.valor || 0),
          parcelas: item.tipo === 'cartao_credito' ? Number(item.parcelas || 1) : undefined
        }));

      const payload = {
        ...values,
        servicos: filteredServices,
        pecas: [],
        tecnico: '',
        tecnicoId: '',
        pagamento: {
          ...values.pagamento,
          formas: filteredPayments
        },
        cliente: {
          ...values.cliente,
          telefone: onlyDigits(values.cliente.telefone)
        }
      };

      const id = await saveOrdemServico(user, { ...payload, id: initialData?.id });
      const shouldAutoPrint = !initialData?.id;
      window.location.href = shouldAutoPrint ? `/os/${id}?imprimir=retirada&auto=1` : `/os/${id}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar a ordem de serviço.';
      setFormAlert(message);
      notify({ title: 'Falha ao salvar a OS', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function renderStep() {
    if (step === 0) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Cliente</Label>
            <Input list="clientes-list" {...form.register('cliente.nome')} placeholder="Nome completo do cliente" />
            <ErrorText message={form.formState.errors.cliente?.nome?.message} />
            <datalist id="clientes-list">
              {clients.map((client) => (
                <option key={`${client.nome}-${client.telefone}`} value={client.nome} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Telefone</Label>
            <Input {...form.register('cliente.telefone')} placeholder="(00) 00000-0000" />
            <ErrorText message={form.formState.errors.cliente?.telefone?.message} />
          </div>
          <div>
            <Label>CPF</Label>
            <Input {...form.register('cliente.cpf')} placeholder="Opcional" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input {...form.register('cliente.email')} placeholder="Opcional" />
            <ErrorText message={form.formState.errors.cliente?.email?.message} />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input {...form.register('cliente.endereco')} placeholder="Opcional" />
          </div>
          <div>
            <Label>Marca</Label>
            <Select {...form.register('aparelho.marca')}>
              <option value="">Selecione a marca</option>
              {marcasAparelho.map((marca) => (
                <option key={marca} value={marca}>{marca}</option>
              ))}
            </Select>
            <ErrorText message={form.formState.errors.aparelho?.marca?.message} />
          </div>
          <div>
            <Label>Modelo</Label>
            <Input {...form.register('aparelho.modelo')} placeholder="Ex.: iPhone 13 / Galaxy A15" />
            <ErrorText message={form.formState.errors.aparelho?.modelo?.message} />
          </div>
          <div>
            <Label>IMEI</Label>
            <Input {...form.register('aparelho.imei')} />
          </div>
          <div>
            <Label>Cor</Label>
            <Input {...form.register('aparelho.cor')} />
          </div>

          <div className="md:col-span-2">
            <Label>Acessórios</Label>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-3">
              {acessoriosOptions.map((acessorio) => {
                const checked = watchedAccessories.includes(acessorio.value);
                return (
                  <label key={acessorio.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const current = form.getValues('aparelho.acessorios') || [];
                        form.setValue(
                          'aparelho.acessorios',
                          event.target.checked
                            ? [...current, acessorio.value]
                            : current.filter((item) => item !== acessorio.value)
                        );
                      }}
                    />
                    <span>{acessorio.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2">
            <Label>Condição de entrada</Label>
            <Textarea {...form.register('aparelho.condicaoEntrada')} placeholder="Descreva o estado do aparelho na entrada." />
            <ErrorText message={form.formState.errors.aparelho?.condicaoEntrada?.message} />
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { value: 'sem_senha', label: 'Sem senha' },
              { value: 'numerica', label: 'Senha numérica' },
              { value: 'padrao', label: 'Senha padrão' }
            ].map((item) => (
              <label
                key={item.value}
                className={`cursor-pointer rounded-xl border p-4 ${watchedPasswordType === item.value ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  value={item.value}
                  checked={watchedPasswordType === item.value}
                  onChange={() => {
                    form.setValue('senha.tipo', item.value as OSFormValues['senha']['tipo']);
                    if (item.value === 'sem_senha') form.setValue('senha.valor', '');
                  }}
                />
                <p className="font-semibold">{item.label}</p>
              </label>
            ))}
          </div>

          {watchedPasswordType === 'numerica' ? (
            <div className="max-w-sm">
              <Label>Senha numérica (4 a 6 dígitos)</Label>
              <Input inputMode="numeric" maxLength={6} {...form.register('senha.valor')} />
              <ErrorText message={form.formState.errors.senha?.valor?.message} />
            </div>
          ) : null}

          {watchedPasswordType === 'padrao' ? (
            <Card>
              <CardHeader>
                <CardTitle>Padrão do Android</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => setPatternOpen(true)}>
                  Desenhar padrão
                </Button>
                <p className="font-mono text-sm text-gray-600">{form.watch('senha.valor') || 'Nenhum padrão definido'}</p>
              </CardContent>
            </Card>
          ) : null}

          <SenhaModal
            open={patternOpen}
            initialValue={form.watch('senha.valor')}
            onClose={() => setPatternOpen(false)}
            onConfirm={(pattern) => form.setValue('senha.valor', pattern, { shouldValidate: true })}
          />
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Serviços</CardTitle>
              <Button type="button" size="sm" onClick={() => serviceArray.append({ descricao: '', valor: 0, garantiaDias: 0 })}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar serviço
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {serviceArray.fields.map((field, index) => (
                <div key={field.id} className="grid gap-3 rounded-xl border border-gray-200 p-4 md:grid-cols-[1fr_160px_auto]">
                  <div>
                    <Input {...form.register(`servicos.${index}.descricao`)} placeholder="Descrição do serviço" />
                    <ErrorText message={form.formState.errors.servicos?.[index]?.descricao?.message} />
                  </div>
                  <div>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register(`servicos.${index}.valor`, { valueAsNumber: true })}
                      placeholder="Valor"
                    />
                    <ErrorText message={form.formState.errors.servicos?.[index]?.valor?.message as string | undefined} />
                  </div>
                  <input type="hidden" {...form.register(`servicos.${index}.garantiaDias`, { valueAsNumber: true })} />
                  <Button type="button" variant="outline" size="icon" onClick={() => serviceArray.remove(index)} disabled={serviceArray.fields.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo financeiro</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div>
                <Label>Desconto</Label>
                <Input type="number" step="0.01" {...form.register('desconto', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Tipo do desconto</Label>
                <Select {...form.register('descontoTipo')}>
                  <option value="valor">R$</option>
                  <option value="percentual">%</option>
                </Select>
              </div>
              <div>
                <Label>Subtotal</Label>
                <Input value={formatCurrency(subtotal)} readOnly />
              </div>
              <div>
                <Label>Total</Label>
                <Input value={formatCurrency(total)} readOnly />
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentArray.fields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                Nenhuma forma de pagamento adicionada ainda. Adicione apenas se houver entrada ou pagamento já realizado.
              </div>
            ) : null}

            {paymentArray.fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 rounded-xl border border-gray-200 p-4 md:grid-cols-[200px_140px_120px_auto]">
                <Select {...form.register(`pagamento.formas.${index}.tipo`)}>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                  <option value="cartao_credito">Cartão de crédito</option>
                  <option value="cartao_debito">Cartão de débito</option>
                  <option value="transferencia">Transferência</option>
                </Select>
                <Input type="number" step="0.01" {...form.register(`pagamento.formas.${index}.valor`, { valueAsNumber: true })} />
                {form.watch(`pagamento.formas.${index}.tipo`) === 'cartao_credito' ? (
                  <Input type="number" min={1} max={12} {...form.register(`pagamento.formas.${index}.parcelas`, { valueAsNumber: true })} placeholder="Parcelas" />
                ) : (
                  <div />
                )}
                <Button type="button" variant="outline" size="icon" onClick={() => paymentArray.remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => paymentArray.append({ tipo: 'pix', valor: 0 })}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar pagamento
              </Button>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Total já lançado no pagamento</p>
              <p className="text-2xl font-bold text-ink">{formatCurrency(splitTotal)}</p>
              <p className="mt-1 text-sm text-gray-500">Falta alocar: {formatCurrency(restanteAlocar)}</p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
              <div>
                <p className="font-semibold text-ink">Cobrar entrada agora?</p>
                <p className="text-sm text-gray-500">O saldo devedor será calculado automaticamente.</p>
              </div>
              <Switch
                checked={Number(form.watch('pagamento.entrada') || 0) > 0}
                onCheckedChange={(checked) => form.setValue('pagamento.entrada', checked ? total : 0)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Valor da entrada</Label>
                <Input type="number" step="0.01" {...form.register('pagamento.entrada', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Saldo devedor</Label>
                <Input value={formatCurrency(saldoDevedor)} readOnly />
              </div>
              <div>
                <Label>Status do pagamento</Label>
                <Input value={getPaymentStatusLabel(form.watch('pagamento.statusPagamento'))} readOnly />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações da OS</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Previsão de entrega</Label>
              <Input type="date" {...form.register('previsaoEntrega')} />
            </div>
            <div>
              <Label>Status atual</Label>
              <Select {...form.register('status')}>
                <option value="aguardando">Aguardando</option>
                <option value="em_andamento">Em andamento</option>
                <option value="aguardando_peca">Aguardando peça</option>
                <option value="pronto">Pronto para retirada</option>
                <option value="entregue">Entregue</option>
                <option value="cancelado">Cancelado</option>
              </Select>
            </div>
            <div>
              <Label>Origem da OS</Label>
              <Select {...form.register('origemOS')}>
                <option value="balcao">Balcão</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="retorno">Retorno</option>
                <option value="garantia">Garantia</option>
              </Select>
            </div>
            <div>
              <Label>Situação atual</Label>
              <Input value={getStatusLabel(form.watch('status'))} readOnly />
            </div>
            <div className="md:col-span-2">
              <Label>Observações internas</Label>
              <Textarea {...form.register('observacoes')} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleFinalSave() {
    if (loading) return;
    setFormAlert('');

    if (step !== steps.length - 1) {
      setFormAlert('Conclua todas as etapas e clique em Criar OS somente no final.');
      return;
    }

    const valid = await form.trigger();
    if (!valid) {
      setFormAlert('Revise os campos obrigatórios antes de salvar a OS.');
      return;
    }

    const values = form.getValues();
    await submitFormValues(values);
  }

  function handleFormKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const isTextarea = tag === 'textarea';

    if (event.key === 'Enter' && !isTextarea) {
      event.preventDefault();
    }
  }

  return (
    <form onSubmit={(event) => event.preventDefault()} onKeyDown={handleFormKeyDown} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{initialData?.id ? 'Editar ordem de serviço' : 'Nova ordem de serviço'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            {steps.map((label, index) => (
              <button
                key={label}
                type="button"
                className={`rounded-xl border px-4 py-3 text-left ${step === index ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}
                onClick={() => setStep(index)}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Etapa {index + 1}</p>
                <p className="mt-1 font-semibold text-ink">{label}</p>
              </button>
            ))}
          </div>

          {formAlert ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Revise os dados da OS</p>
                <p>{formAlert}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {renderStep()}

      <div className="flex flex-wrap justify-between gap-3">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>
          Voltar
        </Button>
        <div className="flex gap-2">
          {step < steps.length - 1 ? (
            <Button key={`next-${step}`} type="button" onClick={goToNextStep}>
              Próximo
            </Button>
          ) : (
            <Button key={`save-${step}`} type="button" disabled={loading} onClick={handleFinalSave}>
              {loading ? 'Salvando...' : initialData?.id ? 'Atualizar OS' : 'Criar OS'}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
