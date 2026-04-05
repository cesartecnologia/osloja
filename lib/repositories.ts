import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { Empresa, OrdemServico, SessionUser, StatusOS, Usuario, Venda } from '@/types';

const OS_STATUS_FLOW: Record<StatusOS, StatusOS[]> = {
  aguardando: ['em_andamento', 'aguardando_peca', 'cancelado'],
  em_andamento: ['aguardando_peca', 'pronto', 'cancelado'],
  aguardando_peca: ['em_andamento', 'pronto', 'cancelado'],
  pronto: ['entregue', 'cancelado'],
  entregue: [],
  cancelado: []
};

const adminDb = () => getAdminDb();
const adminAuth = () => getAdminAuth();

export function canTransitionStatus(current: StatusOS, next: StatusOS, perfil: SessionUser['perfil']) {
  if (perfil === 'admin') return true;
  if (current === next) return true;
  if (perfil === 'atendente' && ['cancelado', 'entregue'].includes(next)) return false;
  return OS_STATUS_FLOW[current]?.includes(next) ?? false;
}

export function mapDoc<T>(doc: FirebaseFirestore.DocumentSnapshot): T & { id: string } {
  return {
    id: doc.id,
    ...(doc.data() as T)
  };
}

export function normalizeDate(value: unknown) {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export async function getEmpresa(empresaId: string): Promise<Empresa> {
  const snap = await adminDb().collection('empresa').doc(empresaId).get();
  if (snap.exists) {
    const data = snap.data() as Omit<Empresa, 'id'>;
    return { id: snap.id, ...data };
  }

  const defaults: Empresa = {
    id: empresaId,
    nome: 'Minha Assistência Técnica',
    slogan: 'Serviço rápido e confiável',
    garantiaPadrao: 90,
    configuracoes: {
      larguraImpressora: '58mm'
    },
    termosCondicoes:
      'Garantia válida para o serviço executado. Não cobre danos físicos, líquidos ou sinais de mau uso.',
    notificacoes: {
      whatsappAtivo: false
    },
    prefixoOS: 'OS-'
  };

  await adminDb().collection('empresa').doc(empresaId).set(defaults);
  return defaults;
}

export async function updateEmpresa(empresaId: string, payload: Partial<Empresa>) {
  await adminDb().collection('empresa').doc(empresaId).set(
    {
      ...payload,
      id: empresaId
    },
    { merge: true }
  );
}

export async function getUsuariosAtivos(empresaId: string) {
  const snap = await adminDb
    .collection('usuarios')
    .where('empresaId', '==', empresaId)
    .where('ativo', '==', true)
    .get();

  return snap.docs.map((doc) => mapDoc<Usuario>(doc));
}

export async function getUsuarioById(uid: string) {
  const doc = await adminDb().collection('usuarios').doc(uid).get();
  return doc.exists ? mapDoc<Usuario>(doc) : null;
}

export async function listOrdensServico(empresaId: string) {
  const snap = await adminDb
    .collection('ordens_servico')
    .where('empresaId', '==', empresaId)
    .orderBy('dataCriacao', 'desc')
    .get();

  return snap.docs.map((doc) => mapDoc<OrdemServico>(doc)).map((item) => ({
    ...item,
    dataCriacao: normalizeDate(item.dataCriacao),
    dataAtualizacao: normalizeDate(item.dataAtualizacao),
    dataEntrega: item.dataEntrega ? normalizeDate(item.dataEntrega) : undefined,
    previsaoEntrega: item.previsaoEntrega ? normalizeDate(item.previsaoEntrega) : undefined,
    garantia: {
      ...item.garantia,
      dataInicio: item.garantia?.dataInicio ? normalizeDate(item.garantia.dataInicio) : undefined,
      dataFim: item.garantia?.dataFim ? normalizeDate(item.garantia.dataFim) : undefined
    },
    historicoStatus: (item.historicoStatus || []).map((entry) => ({
      ...entry,
      data: normalizeDate(entry.data)
    }))
  }));
}

export async function getOrdemServicoById(empresaId: string, id: string) {
  const doc = await adminDb().collection('ordens_servico').doc(id).get();
  if (!doc.exists) return null;
  const data = mapDoc<OrdemServico>(doc);
  if (data.empresaId !== empresaId) return null;
  return {
    ...data,
    dataCriacao: normalizeDate(data.dataCriacao),
    dataAtualizacao: normalizeDate(data.dataAtualizacao),
    dataEntrega: data.dataEntrega ? normalizeDate(data.dataEntrega) : undefined,
    previsaoEntrega: data.previsaoEntrega ? normalizeDate(data.previsaoEntrega) : undefined,
    garantia: {
      ...data.garantia,
      dataInicio: data.garantia?.dataInicio ? normalizeDate(data.garantia.dataInicio) : undefined,
      dataFim: data.garantia?.dataFim ? normalizeDate(data.garantia.dataFim) : undefined
    },
    historicoStatus: (data.historicoStatus || []).map((entry) => ({
      ...entry,
      data: normalizeDate(entry.data)
    }))
  };
}

export async function nextSequentialNumber(empresaId: string, field: 'osNumber' | 'vendaNumber') {
  const ref = adminDb().collection('counters').doc(empresaId);

  const nextValue = await adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data()! : {};
    const current = Number(data[field] ?? 0);
    const next = current + 1;
    transaction.set(ref, { [field]: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });

  return nextValue;
}

export async function saveCliente(empresaId: string, payload: {
  nome: string;
  telefone: string;
  cpf?: string;
  email?: string;
  endereco?: string;
  ordemId?: string;
}) {
  const existing = await adminDb
    .collection('clientes')
    .where('empresaId', '==', empresaId)
    .where('telefone', '==', payload.telefone)
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0]!;
    const updatePayload: Record<string, unknown> = {
      ...payload,
      empresaId
    };
    if (payload.ordemId) {
      updatePayload.historico_os = FieldValue.arrayUnion(payload.ordemId);
    }
    await doc.ref.set(updatePayload, { merge: true });
    return doc.id;
  }

  const ref = adminDb().collection('clientes').doc();
  await ref.set({
    id: ref.id,
    nome: payload.nome,
    telefone: payload.telefone,
    cpf: payload.cpf || '',
    email: payload.email || '',
    endereco: payload.endereco || '',
    historico_os: payload.ordemId ? [payload.ordemId] : [],
    empresaId,
    dataCriacao: new Date().toISOString()
  });
  return ref.id;
}

export async function listClientes(empresaId: string) {
  const snap = await adminDb
    .collection('clientes')
    .where('empresaId', '==', empresaId)
    .orderBy('dataCriacao', 'desc')
    .get();

  return snap.docs.map((doc) => mapDoc(doc));
}

export async function listProdutos(empresaId: string) {
  const snap = await adminDb
    .collection('produtos')
    .where('empresaId', '==', empresaId)
    .orderBy('nome', 'asc')
    .get();

  return snap.docs.map((doc) => mapDoc(doc));
}

export async function saveProduto(empresaId: string, payload: Record<string, unknown>) {
  const ref = payload.id
    ? adminDb().collection('produtos').doc(String(payload.id))
    : adminDb().collection('produtos').doc();

  await ref.set(
    {
      id: ref.id,
      ...payload,
      empresaId
    },
    { merge: true }
  );

  return ref.id;
}

export async function createOrUpdateOS(
  user: SessionUser,
  payload: Omit<OrdemServico, 'id' | 'numero' | 'numeroFormatado' | 'prefixoNumero' | 'dataCriacao' | 'dataAtualizacao' | 'empresaId' | 'criadoPor' | 'historicoStatus' | 'garantia'> & {
    id?: string;
    status: StatusOS;
  }
) {
  const empresa = await getEmpresa(user.empresaId);
  const garantiaPadrao = empresa.garantiaPadrao || 90;
  const subtotalServicos = payload.servicos.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const subtotalPecas = (payload.pecas || []).reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const subtotal = subtotalServicos + subtotalPecas;
  const descontoBruto =
    payload.descontoTipo === 'percentual'
      ? subtotal * (Number(payload.desconto || 0) / 100)
      : Number(payload.desconto || 0);
  const desconto = Math.min(subtotal, descontoBruto);
  const total = Math.max(0, subtotal - desconto);

  const entrada = Number(payload.pagamento.entrada || 0);
  const saldoDevedor =
    payload.pagamento.saldoDevedor !== undefined
      ? Number(payload.pagamento.saldoDevedor)
      : Math.max(0, total - entrada);

  const statusPagamento =
    entrada > 0 && saldoDevedor > 0
      ? 'entrada_paga'
      : saldoDevedor <= 0 && total > 0
        ? 'pago_total'
        : payload.pagamento.statusPagamento;

  if (payload.id) {
    const current = await getOrdemServicoById(user.empresaId, payload.id);
    if (!current) throw new Error('OS não encontrada.');
    if (!canTransitionStatus(current.status, payload.status, user.perfil)) {
      throw new Error('Transição de status não permitida para este usuário.');
    }

    const historicoStatus =
      current.status === payload.status
        ? current.historicoStatus
        : [
            ...(current.historicoStatus || []),
            {
              statusAnterior: current.status,
              statusNovo: payload.status,
              data: new Date().toISOString(),
              usuarioId: user.uid,
              usuarioNome: user.nome
            }
          ];

    await adminDb().collection('ordens_servico').doc(payload.id).set(
      {
        ...current,
        ...payload,
        empresaId: user.empresaId,
        subtotal,
        desconto,
        total,
        garantia: {
          dias: garantiaPadrao,
          dataInicio: payload.status === 'entregue' ? new Date().toISOString() : current.garantia?.dataInicio,
          dataFim:
            payload.status === 'entregue'
              ? new Date(Date.now() + garantiaPadrao * 24 * 60 * 60 * 1000).toISOString()
              : current.garantia?.dataFim
        },
        pagamento: {
          ...payload.pagamento,
          entrada,
          saldoDevedor,
          statusPagamento
        },
        dataAtualizacao: new Date().toISOString(),
        dataEntrega: payload.status === 'entregue' ? new Date().toISOString() : current.dataEntrega,
        historicoStatus
      },
      { merge: true }
    );

    await saveCliente(user.empresaId, { ...payload.cliente, ordemId: payload.id });
    return payload.id;
  }

  const numero = await nextSequentialNumber(user.empresaId, 'osNumber');
  const ref = adminDb().collection('ordens_servico').doc();

  await ref.set({
    id: ref.id,
    numero,
    numeroFormatado: `${empresa.prefixoOS || 'OS-'}${String(numero).padStart(5, '0')}`,
    prefixoNumero: empresa.prefixoOS || 'OS-',
    ...payload,
    subtotal,
    desconto,
    total,
    pagamento: {
      ...payload.pagamento,
      entrada,
      saldoDevedor,
      statusPagamento
    },
    garantia: {
      dias: garantiaPadrao
    },
    empresaId: user.empresaId,
    criadoPor: user.uid,
    dataCriacao: new Date().toISOString(),
    dataAtualizacao: new Date().toISOString(),
    historicoStatus: [
      {
        statusAnterior: null,
        statusNovo: payload.status,
        data: new Date().toISOString(),
        usuarioId: user.uid,
        usuarioNome: user.nome
      }
    ]
  });

  await saveCliente(user.empresaId, { ...payload.cliente, ordemId: ref.id });
  return ref.id;
}

export async function createOrUpdateUsuario(
  user: SessionUser,
  payload: { id?: string; nome: string; email: string; perfil: Usuario['perfil']; ativo: boolean; senhaTemporaria?: string }
) {
  if (user.perfil !== 'admin') {
    throw new Error('Apenas administradores podem gerenciar usuários.');
  }

  if (payload.id) {
    await adminDb().collection('usuarios').doc(payload.id).set(
      {
        nome: payload.nome,
        email: payload.email,
        perfil: payload.perfil,
        ativo: payload.ativo,
        empresaId: user.empresaId
      },
      { merge: true }
    );
    return payload.id;
  }

  if (!payload.senhaTemporaria) {
    throw new Error('Senha temporária obrigatória para novo usuário.');
  }

  const created = await adminAuth().createUser({
    email: payload.email,
    password: payload.senhaTemporaria,
    displayName: payload.nome
  });

  await adminDb().collection('usuarios').doc(created.uid).set({
    id: created.uid,
    nome: payload.nome,
    email: payload.email,
    perfil: payload.perfil,
    ativo: payload.ativo,
    empresaId: user.empresaId,
    createdAt: new Date().toISOString()
  });

  return created.uid;
}

export async function listUsuarios(empresaId: string) {
  const snap = await adminDb
    .collection('usuarios')
    .where('empresaId', '==', empresaId)
    .orderBy('nome', 'asc')
    .get();

  return snap.docs.map((doc) => mapDoc<Usuario>(doc));
}

export async function createVenda(
  user: SessionUser,
  payload: Omit<Venda, 'id' | 'numero' | 'numeroFormatado' | 'dataCriacao' | 'criadoPor' | 'empresaId'>
) {
  const subtotal = payload.itens.reduce((acc, item) => acc + item.subtotal, 0);
  const descontoBruto =
    payload.descontoTipo === 'percentual'
      ? subtotal * (Number(payload.desconto || 0) / 100)
      : Number(payload.desconto || 0);
  const desconto = Math.min(subtotal, descontoBruto);
  const total = Math.max(0, subtotal - desconto);
  const entrada = Number(payload.pagamento.entrada || 0);
  const saldoDevedor =
    payload.pagamento.saldoDevedor !== undefined
      ? Number(payload.pagamento.saldoDevedor)
      : Math.max(0, total - entrada);

  const statusPagamento =
    entrada > 0 && saldoDevedor > 0
      ? 'entrada_paga'
      : saldoDevedor <= 0 && total > 0
        ? 'pago_total'
        : payload.pagamento.statusPagamento;

  const numero = await nextSequentialNumber(user.empresaId, 'vendaNumber');
  const ref = adminDb().collection('vendas').doc();

  await adminDb().runTransaction(async (transaction) => {
    for (const item of payload.itens) {
      if (!item.produtoId) continue;
      const productRef = adminDb().collection('produtos').doc(item.produtoId);
      const productDoc = await transaction.get(productRef);
      const currentStock = Number(productDoc.data()?.estoque ?? 0);
      if (currentStock < item.quantidade) {
        throw new Error(`Estoque insuficiente para ${item.nome}.`);
      }
      transaction.set(
        productRef,
        {
          estoque: currentStock - item.quantidade
        },
        { merge: true }
      );
    }

    transaction.set(ref, {
      id: ref.id,
      numero,
      numeroFormatado: `VD-${String(numero).padStart(5, '0')}`,
      ...payload,
      subtotal,
      desconto,
      total,
      pagamento: {
        ...payload.pagamento,
        entrada,
        saldoDevedor,
        statusPagamento
      },
      empresaId: user.empresaId,
      criadoPor: user.uid,
      dataCriacao: new Date().toISOString()
    });
  });

  return ref.id;
}

export async function listVendas(empresaId: string) {
  const snap = await adminDb
    .collection('vendas')
    .where('empresaId', '==', empresaId)
    .orderBy('dataCriacao', 'desc')
    .get();

  return snap.docs.map((doc) => mapDoc<Venda>(doc)).map((venda) => ({
    ...venda,
    dataCriacao: normalizeDate(venda.dataCriacao)
  }));
}
