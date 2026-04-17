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
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
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

export type VendaStatus = 'ativa' | 'cancelada';
export type VendaView = Venda & { status?: VendaStatus; canceladaEm?: string };

export async function listVendas(empresaId: string): Promise<VendaView[]> {
  const snap = await getDocs(query(collection(db, 'vendas'), where('empresaId', '==', empresaId)));

  return snap.docs
    .map((item) => ({
      id: item.id,
      ...(item.data() as Venda),
      status: ((item.data() as any)?.status ?? 'ativa') as VendaStatus,
      canceladaEm: (item.data() as any)?.canceladaEm,
    }))
    .sort(
      (a, b) =>
        new Date(String(b.dataCriacao || '')).getTime() -
        new Date(String(a.dataCriacao || '')).getTime()
    );
}

export async function getVendaById(id: string): Promise<VendaView | null> {
  const snap = await getDoc(doc(db, 'vendas', id));
  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...(snap.data() as Venda),
    status: ((snap.data() as any)?.status ?? 'ativa') as VendaStatus,
    canceladaEm: (snap.data() as any)?.canceladaEm,
  };
}

export async function updateVenda(
  id: string,
  payload: Partial<Venda> & { itens: Venda['itens'] }
): Promise<VendaView> {
  const ref = doc(db, 'vendas', id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('Venda não encontrada.');
  }

  const atual = snap.data() as VendaView;

  const subtotal = payload.itens.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
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

  const atual = snap.data() as Venda;
  const canceladaEm = new Date().toISOString();

  const atualizado: VendaView = {
    ...atual,
    id,
    status: 'cancelada',
    canceladaEm,
  };

  await setDoc(ref, atualizado, { merge: true });
  return atualizado;
}
