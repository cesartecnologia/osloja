'use client';

import {
  createVenda,
  deleteOrdemServico,
  getDashboardData,
  getEmpresa,
  getOrdemServicoById,
  listClientes,
  listOrdensServico,
  listProdutos,
  listUsuarios,
  saveOrdemServico,
  saveProduto,
  updateEmpresa,
  updateUsuarioPerfil,
} from '@/lib/client-data';
import type { Venda } from '@/types';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

export {
  getEmpresa,
  updateEmpresa,
  listUsuarios,
  updateUsuarioPerfil,
  listClientes,
  listOrdensServico,
  getOrdemServicoById,
  deleteOrdemServico,
  listProdutos,
  saveProduto,
  createVenda,
  getDashboardData,
};

export const createOrUpdateOS = saveOrdemServico;

export type VendaView = Venda & {
  status?: 'ativa' | 'cancelada';
  canceladaEm?: string;
};

export async function listVendas(empresaId: string): Promise<VendaView[]> {
  const snap = await getDocs(
    query(collection(db, 'vendas'), where('empresaId', '==', empresaId))
  );

  return snap.docs
    .map((item) => {
      const data = item.data() as VendaView;
      return {
        id: item.id,
        ...data,
        status: data.status ?? 'ativa',
      };
    })
    .sort(
      (a, b) =>
        new Date(String(b.dataCriacao || '')).getTime() -
        new Date(String(a.dataCriacao || '')).getTime()
    );
}

export async function getVendaById(id: string): Promise<VendaView | null> {
  const snap = await getDoc(doc(db, 'vendas', id));
  if (!snap.exists()) return null;

  const data = snap.data() as VendaView;
  return {
    id: snap.id,
    ...data,
    status: data.status ?? 'ativa',
  };
}

export async function updateVenda(
  id: string,
  payload: Partial<Venda> &
    Pick<Venda, 'itens' | 'pagamento' | 'desconto' | 'descontoTipo' | 'cliente'>
): Promise<VendaView> {
  const ref = doc(db, 'vendas', id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('Venda não encontrada.');
  }

  const atual = snap.data() as VendaView;
  const itens = payload.itens || [];
  const subtotal = itens.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  const descontoBruto =
    payload.descontoTipo === 'percentual'
      ? subtotal * (Number(payload.desconto || 0) / 100)
      : Number(payload.desconto || 0);
  const desconto = Math.min(subtotal, descontoBruto);
  const total = Math.max(0, subtotal - desconto);

  const atualizado: VendaView = {
    ...atual,
    ...payload,
    id,
    itens,
    subtotal,
    desconto,
    total,
    status: atual.status ?? 'ativa',
  };

  await setDoc(ref, atualizado, { merge: true });
  return atualizado;
}

export async function deleteVenda(id: string) {
  await deleteDoc(doc(db, 'vendas', id));
}

export async function cancelVenda(id: string): Promise<VendaView> {
  const ref = doc(db, 'vendas', id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('Venda não encontrada.');
  }

  const atual = snap.data() as VendaView;
  const cancelada: VendaView = {
    ...atual,
    status: 'cancelada',
    canceladaEm: new Date().toISOString(),
  };

  await setDoc(ref, cancelada, { merge: true });
  return cancelada;
}