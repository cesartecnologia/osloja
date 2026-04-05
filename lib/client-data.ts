'use client';

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import type { Empresa } from '@/types';

export type UserProfile = {
  id: string;
  nome: string;
  email: string;
  perfil: 'admin' | 'tecnico' | 'atendente';
  ativo: boolean;
  empresaId: string;
};

type UpdateEmpresaPayload = Partial<Omit<Empresa, 'configuracoes'>> & {
  configuracoes?: Partial<Empresa['configuracoes']>;
};

const DEFAULT_EMPRESA_ID = 'default';

function cleanFirestoreData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanFirestoreData(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, cleanFirestoreData(v)]);

    return Object.fromEntries(entries) as T;
  }

  return value;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem('os_user');

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export async function getEmpresa(empresaId = DEFAULT_EMPRESA_ID): Promise<Empresa | null> {
  const ref = doc(db, 'empresa', empresaId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  return snap.data() as Empresa;
}

export async function updateEmpresa(
  empresaId: string,
  payload: UpdateEmpresaPayload
) {
  const ref = doc(db, 'empresa', empresaId);
  const currentSnap = await getDoc(ref);

  const current = currentSnap.exists()
    ? (currentSnap.data() as Empresa)
    : null;

  const merged: Empresa = {
    id: empresaId,
    nome: payload.nome ?? current?.nome ?? '',
    slogan: payload.slogan ?? current?.slogan ?? '',
    cnpj: payload.cnpj ?? current?.cnpj ?? '',
    telefone: payload.telefone ?? current?.telefone ?? '',
    endereco: payload.endereco ?? current?.endereco ?? '',
    logoUrl: payload.logoUrl ?? current?.logoUrl ?? '',
    prefixoOS: payload.prefixoOS ?? current?.prefixoOS ?? '',
    termosCondicoes: payload.termosCondicoes ?? current?.termosCondicoes ?? '',
    configuracoes: {
      larguraImpressora:
        payload.configuracoes?.larguraImpressora ??
        current?.configuracoes?.larguraImpressora ??
        '58mm',
    },
  };

  await setDoc(
    ref,
    cleanFirestoreData({
      ...merged,
      atualizadoEm: serverTimestamp(),
    }),
    { merge: true }
  );

  return merged;
}