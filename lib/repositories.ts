import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import type { Empresa } from '@/types';

const DEFAULT_EMPRESA_ID = 'default';

const DEFAULT_EMPRESA: Empresa = {
  id: DEFAULT_EMPRESA_ID,
  nome: 'Minha Assistência Técnica',
  slogan: 'Serviço rápido e confiável',
  prefixoOS: '',
  termosCondicoes:
    'Garantia e condições do serviço: descreva aqui as regras que devem aparecer no cupom e no comprovante enviado ao cliente.',
  configuracoes: {
    larguraImpressora: '58mm',
  },
};

type UpdateEmpresaPayload = Partial<Omit<Empresa, 'configuracoes'>> & {
  configuracoes?: Partial<Empresa['configuracoes']>;
};

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

export async function getEmpresa(empresaId = DEFAULT_EMPRESA_ID): Promise<Empresa> {
  const ref = doc(db, 'empresa', empresaId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const empresa = { ...DEFAULT_EMPRESA, id: empresaId };
    await setDoc(ref, empresa, { merge: true });
    return empresa;
  }

  return {
    ...DEFAULT_EMPRESA,
    ...(snap.data() as Empresa),
    id: empresaId,
    configuracoes: {
      larguraImpressora:
        (snap.data() as Empresa)?.configuracoes?.larguraImpressora ?? '58mm',
    },
  };
}

export async function updateEmpresa(
  empresaId: string,
  payload: UpdateEmpresaPayload
): Promise<Empresa> {
  const ref = doc(db, 'empresa', empresaId);
  const current = await getEmpresa(empresaId);

  const merged: Empresa = {
    ...current,
    ...payload,
    id: empresaId,
    configuracoes: {
      larguraImpressora:
        payload.configuracoes?.larguraImpressora ??
        current.configuracoes?.larguraImpressora ??
        '58mm',
    },
  };

  await setDoc(ref, cleanFirestoreData(merged), { merge: true });
  return merged;
}