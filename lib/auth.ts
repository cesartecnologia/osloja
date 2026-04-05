import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { SessionUser, Usuario } from '@/types';

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? '__session';

async function getUserProfile(uid: string): Promise<Usuario | null> {
  const adminDb = getAdminDb();
  const doc = await adminDb.collection('usuarios').doc(uid).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<Usuario, 'id'>) };
}

export async function getOptionalSessionUser(): Promise<SessionUser | null> {
  const cookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true);
    const profile = await getUserProfile(decoded.uid);
    if (!profile || !profile.ativo) return null;

    return {
      uid: decoded.uid,
      email: profile.email,
      nome: profile.nome,
      perfil: profile.perfil,
      empresaId: profile.empresaId,
      ativo: profile.ativo
    };
  } catch {
    return null;
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getOptionalSessionUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdminUser() {
  const user = await requireSessionUser();
  if (user.perfil !== 'admin') {
    redirect('/dashboard');
  }
  return user;
}

export async function getRequestUser(request: NextRequest): Promise<SessionUser> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    throw new Error('Sessão não encontrada.');
  }

  const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
  const profile = await getUserProfile(decoded.uid);

  if (!profile || !profile.ativo) {
    throw new Error('Usuário inativo ou sem perfil.');
  }

  return {
    uid: decoded.uid,
    email: profile.email,
    nome: profile.nome,
    perfil: profile.perfil,
    empresaId: profile.empresaId,
    ativo: profile.ativo
  };
}
