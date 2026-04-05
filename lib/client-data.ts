'use client';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase-client';
import { Cliente, DashboardKPIs, Empresa, OrdemServico, Produto, SessionUser, StatusOS, Usuario, Venda } from '@/types';

const DEFAULT_EMPRESA_ID = 'default';

const statusFlow: Record<StatusOS, StatusOS[]> = {
  aguardando: ['em_andamento', 'aguardando_peca', 'cancelado'],
  em_andamento: ['aguardando_peca', 'pronto', 'cancelado'],
  aguardando_peca: ['em_andamento', 'pronto', 'cancelado'],
  pronto: ['entregue', 'cancelado'],
  entregue: [],
  cancelado: []
};

export const DEFAULT_EMPRESA: Empresa = {
  id: DEFAULT_EMPRESA_ID,
  nome: 'Minha Assistência Técnica',
  slogan: 'Serviço rápido e confiável',
  prefixoOS: '',
  termosCondicoes: 'Garantia e condições do serviço: descreva aqui as regras que devem aparecer no cupom e no comprovante enviado ao cliente.',
  configuracoes: { larguraImpressora: '58mm' }
};

function toIso(value: unknown) {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value && 'seconds' in value) {
    const ts = value as { seconds: number; nanoseconds?: number };
    return new Date(ts.seconds * 1000).toISOString();
  }
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function mapDoc<T>(id: string, data: Record<string, unknown>) {
  return { id, ...(data as T) };
}

function hasFilledService(item: { descricao?: string; valor?: number }) {
  return Boolean(item?.descricao?.trim() || Number(item?.valor || 0) > 0);
}



function formatOSNumber(numero: number) {
  return String(Math.max(0, Number(numero || 0))).padStart(4, '0');
}

function cleanFirestoreData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanFirestoreData(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, cleanFirestoreData(entryValue)]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}


async function ensureEmpresa(empresaId = DEFAULT_EMPRESA_ID) {
  const ref = doc(db, 'empresa', empresaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...DEFAULT_EMPRESA, id: empresaId });
    return { ...DEFAULT_EMPRESA, id: empresaId };
  }
  return { ...DEFAULT_EMPRESA, ...(snap.data() as Empresa), id: empresaId };
}

export async function bootstrapUser(firebaseUser: User): Promise<SessionUser> {
  const ref = doc(db, 'usuarios', firebaseUser.uid);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    const data = existing.data() as Usuario;
    await ensureEmpresa(data.empresaId || DEFAULT_EMPRESA_ID);
    return {
      uid: firebaseUser.uid,
      email: data.email,
      nome: data.nome,
      perfil: data.perfil,
      empresaId: data.empresaId,
      ativo: data.ativo
    };
  }

  const empresaId = DEFAULT_EMPRESA_ID;
  const empresaRef = doc(db, 'empresa', empresaId);
  const empresaSnap = await getDoc(empresaRef);
  const perfil = empresaSnap.exists() ? 'atendente' : 'admin';

  await ensureEmpresa(empresaId);

  const profile: Usuario = {
    id: firebaseUser.uid,
    nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
    email: firebaseUser.email || '',
    perfil,
    ativo: true,
    empresaId,
    createdAt: new Date().toISOString()
  };

  await setDoc(ref, profile, { merge: true });

  return {
    uid: profile.id,
    email: profile.email,
    nome: profile.nome,
    perfil: profile.perfil,
    empresaId: profile.empresaId,
    ativo: profile.ativo
  };
}

export async function getEmpresa(empresaId: string) {
  return ensureEmpresa(empresaId);
}

export async function updateEmpresa(empresaId: string, payload: Partial<Empresa>) {
  const ref = doc(db, 'empresa', empresaId);
  await setDoc(ref, { ...payload, id: empresaId }, { merge: true });
  return getEmpresa(empresaId);
}

export async function listUsuarios(empresaId: string) {
  const snap = await getDocs(query(collection(db, 'usuarios'), where('empresaId', '==', empresaId)));
  return snap.docs.map((item) => mapDoc<Usuario>(item.id, item.data())).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
}

export async function updateUsuarioPerfil(id: string, payload: Partial<Usuario>) {
  await setDoc(doc(db, 'usuarios', id), payload, { merge: true });
}

export async function listClientes(empresaId: string): Promise<Cliente[]> {
  const snap = await getDocs(query(collection(db, 'clientes'), where('empresaId', '==', empresaId)));
  return snap.docs.map((item) => mapDoc<Cliente>(item.id, item.data())).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
}

async function upsertCliente(empresaId: string, ordemId: string | undefined, cliente: OrdemServico['cliente']) {
  const snap = await getDocs(query(collection(db, 'clientes'), where('empresaId', '==', empresaId), where('telefone', '==', cliente.telefone), limit(1)));

  if (!snap.empty) {
    const existing = snap.docs[0]!;
    const atual = existing.data() as Cliente;
    await setDoc(existing.ref, {
      ...atual,
      ...cliente,
      historico_os: Array.from(new Set([...(atual.historico_os || []), ...(ordemId ? [ordemId] : [])]))
    }, { merge: true });
    return existing.id;
  }

  const ref = doc(collection(db, 'clientes'));
  await setDoc(ref, {
    id: ref.id,
    ...cliente,
    historico_os: ordemId ? [ordemId] : [],
    empresaId,
    dataCriacao: new Date().toISOString()
  });
  return ref.id;
}

export async function listProdutos(empresaId: string): Promise<Produto[]> {
  const snap = await getDocs(query(collection(db, 'produtos'), where('empresaId', '==', empresaId)));
  return snap.docs.map((item) => mapDoc<Produto>(item.id, item.data())).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
}

export async function saveProduto(empresaId: string, payload: Partial<Produto> & Pick<Produto, 'nome'>) {
  const ref = payload.id ? doc(db, 'produtos', payload.id) : doc(collection(db, 'produtos'));
  await setDoc(ref, { ...payload, id: ref.id, empresaId }, { merge: true });
  return ref.id;
}

async function nextSequentialNumber(empresaId: string, field: 'osNumber' | 'vendaNumber') {
  const ref = doc(db, 'counters', empresaId);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const data = (snap.data() || {}) as Record<string, number>;
    const next = Number(data[field] || 0) + 1;
    transaction.set(ref, { ...data, [field]: next, updatedAt: new Date().toISOString() }, { merge: true });
    return next;
  });
}

export async function listOrdensServico(empresaId: string) {
  const snap = await getDocs(query(collection(db, 'ordens_servico'), where('empresaId', '==', empresaId)));
  return snap.docs.map((item) => normalizeOS(mapDoc<OrdemServico>(item.id, item.data()))).sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
}

export async function getOrdemServicoById(id: string) {
  const snap = await getDoc(doc(db, 'ordens_servico', id));
  if (!snap.exists()) return null;
  return normalizeOS(mapDoc<OrdemServico>(snap.id, snap.data()));
}

function normalizeOS(item: OrdemServico): OrdemServico {
  return {
    ...item,
    numeroFormatado: formatOSNumber(item.numero),
    prefixoNumero: '',
    dataCriacao: toIso(item.dataCriacao),
    dataAtualizacao: toIso(item.dataAtualizacao),
    dataEntrega: item.dataEntrega ? toIso(item.dataEntrega) : undefined,
    previsaoEntrega: item.previsaoEntrega ? toIso(item.previsaoEntrega) : undefined,
    garantia: item.garantia
      ? {
          dias: Number(item.garantia?.dias || 0),
          dataInicio: item.garantia?.dataInicio ? toIso(item.garantia.dataInicio) : undefined,
          dataFim: item.garantia?.dataFim ? toIso(item.garantia.dataFim) : undefined
        }
      : { dias: 0 },
    historicoStatus: (item.historicoStatus || []).map((entry) => ({ ...entry, data: toIso(entry.data) }))
  };
}

export function canTransitionStatus(current: StatusOS, next: StatusOS, perfil: SessionUser['perfil']) {
  if (perfil === 'admin') return true;
  if (current === next) return true;
  if (perfil === 'atendente' && ['cancelado', 'entregue'].includes(next)) return false;
  return statusFlow[current]?.includes(next) ?? false;
}

export async function saveOrdemServico(
  user: SessionUser,
  payload: Omit<OrdemServico, 'id' | 'numero' | 'numeroFormatado' | 'prefixoNumero' | 'dataCriacao' | 'dataAtualizacao' | 'empresaId' | 'criadoPor' | 'historicoStatus' | 'garantia'> & { id?: string }
) {
  const empresa = await getEmpresa(user.empresaId);
  const subtotalServicos = payload.servicos.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const subtotal = subtotalServicos;
  const descontoBruto = payload.descontoTipo === 'percentual' ? subtotal * (Number(payload.desconto || 0) / 100) : Number(payload.desconto || 0);
  const desconto = Math.min(subtotal, descontoBruto);
  const total = Math.max(0, subtotal - desconto);
  const entrada = Number(payload.pagamento.entrada || 0);
  const saldoDevedor = Math.max(0, total - entrada);
  const paymentStatus = entrada > 0 && saldoDevedor > 0 ? 'entrada_paga' : saldoDevedor <= 0 ? 'pago_total' : 'pendente';
  const now = new Date().toISOString();

  let numero = 0;
  let numeroFormatado = '';
  let historicoStatus: any[] = payload.id ? [] : [{
    statusAnterior: null,
    statusNovo: payload.status,
    data: now,
    usuarioId: user.uid,
    usuarioNome: user.nome
  }];

  const current = payload.id ? await getOrdemServicoById(payload.id) : null;

  if (payload.id) {
    if (!current) throw new Error('Ordem de serviço não encontrada.');
    numero = current.numero;
    numeroFormatado = current.numeroFormatado;
    historicoStatus = current.historicoStatus || [];

    if (current.status !== payload.status) {
      if (!canTransitionStatus(current.status, payload.status, user.perfil)) {
        throw new Error('Transição de status não permitida para o seu perfil.');
      }
      historicoStatus = [
        ...historicoStatus,
        {
          statusAnterior: current.status,
          statusNovo: payload.status,
          data: now,
          usuarioId: user.uid,
          usuarioNome: user.nome
        }
      ];
    }
  } else {
    numero = await nextSequentialNumber(user.empresaId, 'osNumber');
    numeroFormatado = formatOSNumber(numero);
  }

  const ref = payload.id ? doc(db, 'ordens_servico', payload.id) : doc(collection(db, 'ordens_servico'));

  const docData: OrdemServico = {
    id: ref.id,
    numero,
    numeroFormatado,
    prefixoNumero: '',
    senha: payload.senha,
    status: payload.status,
    cliente: payload.cliente,
    aparelho: payload.aparelho,
    servicos: payload.servicos.filter((item) => hasFilledService(item)).map((item) => ({ descricao: String(item.descricao || '').trim(), valor: Number(item.valor || 0), garantiaDias: 0 })),
    pecas: [],
    subtotal,
    desconto,
    descontoTipo: payload.descontoTipo,
    total,
    pagamento: {
      ...payload.pagamento,
      entrada,
      saldoDevedor,
      statusPagamento: paymentStatus,
      formas: payload.pagamento.formas.filter((item) => Number(item.valor || 0) > 0).map((item) => ({ ...item, valor: Number(item.valor || 0) }))
    },
    tecnico: payload.tecnico || '',
    tecnicoId: payload.tecnicoId || '',
    observacoes: payload.observacoes,
    previsaoEntrega: payload.previsaoEntrega || undefined,
    garantia: { dias: 0 },
    dataCriacao: payload.id ? current?.dataCriacao || now : now,
    dataAtualizacao: now,
    dataEntrega: payload.status === 'entregue' ? current?.dataEntrega || now : undefined,
    criadoPor: payload.id ? current?.criadoPor || user.uid : user.uid,
    origemOS: payload.origemOS || 'balcao',
    retiradoPor: payload.retiradoPor,
    empresaId: user.empresaId,
    historicoStatus
  };

  await setDoc(ref, cleanFirestoreData(docData), { merge: true });
  await upsertCliente(user.empresaId, ref.id, payload.cliente);

  return ref.id;
}


export async function deleteOrdemServico(id: string) {
  await deleteDoc(doc(db, 'ordens_servico', id));
}

export async function createVenda(
  user: SessionUser,
  payload: Omit<Venda, 'id' | 'numero' | 'numeroFormatado' | 'subtotal' | 'total' | 'dataCriacao' | 'criadoPor' | 'empresaId'>
): Promise<Venda> {
  const numero = await nextSequentialNumber(user.empresaId, 'vendaNumber');
  const subtotal = payload.itens.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  const descontoBruto = payload.descontoTipo === 'percentual' ? subtotal * (Number(payload.desconto || 0) / 100) : Number(payload.desconto || 0);
  const desconto = Math.min(subtotal, descontoBruto);
  const total = Math.max(0, subtotal - desconto);
  const ref = doc(collection(db, 'vendas'));

  const venda: Venda = {
    id: ref.id,
    numero,
    numeroFormatado: `VD-${String(numero).padStart(5, '0')}`,
    itens: payload.itens,
    subtotal,
    desconto,
    descontoTipo: payload.descontoTipo,
    total,
    pagamento: payload.pagamento,
    cliente: payload.cliente,
    dataCriacao: new Date().toISOString(),
    criadoPor: user.uid,
    empresaId: user.empresaId
  };

  await setDoc(ref, venda);

  for (const item of payload.itens) {
    if (!item.produtoId) continue;
    const produtoRef = doc(db, 'produtos', item.produtoId);
    const produtoSnap = await getDoc(produtoRef);
    if (!produtoSnap.exists()) continue;
    const produto = produtoSnap.data() as Produto;
    await updateDoc(produtoRef, {
      estoque: Math.max(0, Number(produto.estoque || 0) - Number(item.quantidade || 0))
    });
  }

  return venda;
}

export async function getDashboardData(empresaId: string, periodoDias = 30) {
  const [ordens, vendas, produtos] = await Promise.all([
    listOrdensServico(empresaId),
    getDocs(query(collection(db, 'vendas'), where('empresaId', '==', empresaId))),
    listProdutos(empresaId)
  ]);

  const limite = Date.now() - periodoDias * 86400000;
  const ordensPeriodo = ordens.filter((item) => new Date(item.dataCriacao).getTime() >= limite);
  const vendasPeriodo = vendas.docs.map((item) => mapDoc<Venda>(item.id, item.data())).filter((item) => new Date(toIso(item.dataCriacao)).getTime() >= limite);
  const receitaOS = ordensPeriodo.filter((item) => item.status !== 'cancelado').reduce((acc, item) => acc + Number(item.total || 0), 0);
  const receitaVendas = vendasPeriodo.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const faturamento = receitaOS + receitaVendas;

  const kpis: DashboardKPIs = {
    abertas: ordens.filter((item) => !['entregue', 'cancelado'].includes(item.status)).length,
    prontas: ordens.filter((item) => item.status === 'pronto').length,
    faturamento,
    ticketMedio: ordensPeriodo.length + vendasPeriodo.length > 0 ? faturamento / (ordensPeriodo.length + vendasPeriodo.length) : 0,
    emAtraso: ordens.filter((item) => !['entregue', 'cancelado'].includes(item.status) && Date.now() - new Date(item.dataAtualizacao).getTime() > 7 * 86400000).length
  };

  const todayBars = Array.from({ length: Math.min(periodoDias, 7) }).map((_, index, arr) => {
    const offset = arr.length - index - 1;
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    const key = day.toISOString().slice(0, 10);
    const totalDia = [...ordens, ...vendas.docs.map((item) => mapDoc<Venda>(item.id, item.data()) as any)].reduce((acc, item: any) => {
      const rawDate = 'dataCriacao' in item ? item.dataCriacao : undefined;
      const itemKey = toIso(rawDate).slice(0, 10);
      return itemKey === key ? acc + Number(item.total || 0) : acc;
    }, 0);
    return { label: key.slice(8, 10), total: totalDia };
  });

  const statusDistribuicao = ['aguardando', 'em_andamento', 'aguardando_peca', 'pronto', 'entregue', 'cancelado'].map((status) => ({
    status,
    total: ordens.filter((item) => item.status === status).length
  }));

  const ordensRecentes = ordens.slice(0, 5);

  const formasMap = new Map<string, number>();
  ordensPeriodo.forEach((item) => item.pagamento.formas.forEach((forma) => formasMap.set(forma.tipo, (formasMap.get(forma.tipo) || 0) + Number(forma.valor || 0))));
  vendasPeriodo.forEach((item) => item.pagamento.formas.forEach((forma) => formasMap.set(forma.tipo, (formasMap.get(forma.tipo) || 0) + Number(forma.valor || 0))));
  const formasPagamento = Array.from(formasMap.entries()).map(([tipo, total]) => ({ tipo, total }));

  const estoqueBaixo = produtos.filter((item) => Number(item.estoque || 0) <= Number(item.estoque_minimo || 0));
  const valorTotalEstoque = produtos.reduce((acc, item) => acc + Number(item.estoque || 0) * Number(item.preco_custo || 0), 0);

  return {
    kpis,
    receita7Dias: todayBars,
    statusDistribuicao,
    ordensRecentes,
    formasPagamento,
    estoqueBaixo,
    valorTotalEstoque
  };
}
