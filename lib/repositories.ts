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
import type { SessionUser, OrdemServico, Venda, Produto, Empresa, Usuario } from '@/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
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

export async function listVendas(empresaId: string): Promise<Venda[]> {
  const snap = await getDocs(
    query(collection(db, 'vendas'), where('empresaId', '==', empresaId))
  );

  return snap.docs
    .map((item) => ({ id: item.id, ...(item.data() as Venda) }))
    .sort(
      (a, b) =>
        new Date(String(b.dataCriacao || '')).getTime() -
        new Date(String(a.dataCriacao || '')).getTime()
    );
}