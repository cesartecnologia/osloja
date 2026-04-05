import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getPrivateKey(value) {
  return value ? value.replace(/\n/g, '
') : undefined;
}

function initAdmin() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Defina FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no ambiente antes de rodar a migração.');
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey })
  });
}

function formatOSNumber(numero) {
  return String(Math.max(0, Number(numero || 0))).padStart(4, '0');
}

async function main() {
  initAdmin();
  const db = getFirestore();
  const empresaId = process.env.OS_EMPRESA_ID || 'default';
  const snapshot = await db.collection('ordens_servico').where('empresaId', '==', empresaId).get();

  const docs = snapshot.docs
    .sort((a, b) => {
      const av = a.get('dataCriacao') || '';
      const bv = b.get('dataCriacao') || '';
      return String(av).localeCompare(String(bv));
    });

  if (!docs.length) {
    console.log(`Nenhuma OS encontrada para a empresa ${empresaId}.`);
    return;
  }

  const chunkSize = 400;
  for (let start = 0; start < docs.length; start += chunkSize) {
    const batch = db.batch();
    const slice = docs.slice(start, start + chunkSize);
    slice.forEach((docSnap, offset) => {
      const numero = start + offset + 1;
      batch.update(docSnap.ref, {
        numero,
        numeroFormatado: formatOSNumber(numero),
        prefixoNumero: ''
      });
    });
    if (start + chunkSize >= docs.length) {
      const counterRef = db.collection('counters').doc(empresaId);
      batch.set(counterRef, {
        osNumber: docs.length,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    await batch.commit();
  }
  console.log(`OS renumeradas com sucesso: 0001 até ${formatOSNumber(docs.length)} para a empresa ${empresaId}.`);
}

main().catch((error) => {
  console.error('Falha ao renumerar OS:', error);
  process.exit(1);
});
