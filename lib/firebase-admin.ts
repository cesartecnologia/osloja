import 'server-only';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type ServiceAccountShape = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function parseJsonCredential(): ServiceAccountShape | null {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  try {
    if (base64) {
      return JSON.parse(Buffer.from(base64, 'base64').toString('utf8')) as ServiceAccountShape;
    }
    if (rawJson) {
      return JSON.parse(rawJson) as ServiceAccountShape;
    }
  } catch (error) {
    throw new Error(
      `Credencial JSON do Firebase Admin inválida. Use FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 ou FIREBASE_SERVICE_ACCOUNT_JSON com o JSON completo da service account. ${error instanceof Error ? error.message : ''}`
    );
  }

  return null;
}

function resolveServiceAccount() {
  const parsed = parseJsonCredential();
  const projectId = parsed?.project_id ?? process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = parsed?.client_email ?? process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKeyRaw = parsed?.private_key ?? process.env.FIREBASE_PRIVATE_KEY?.trim();
  const privateKey = privateKeyRaw?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) return null;

  if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
    throw new Error('FIREBASE_PRIVATE_KEY inválida. Use exatamente o campo private_key do JSON da service account do Firebase/Google Cloud.');
  }

  return { projectId, clientEmail, privateKey };
}

export function isFirebaseAdminConfigured() {
  return Boolean(resolveServiceAccount());
}

export function getFirebaseAdminApp() {
  if (getApps().length) return getApps()[0]!;

  const account = resolveServiceAccount();
  if (!account) {
    throw new Error('Firebase Admin não configurado. Para rotas administrativas, informe FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 ou as variáveis FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.');
  }

  return initializeApp({
    credential: cert({
      projectId: account.projectId,
      clientEmail: account.clientEmail,
      privateKey: account.privateKey
    })
  });
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}
