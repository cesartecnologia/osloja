import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

async function requireAdminConfigured() {
  if (!isFirebaseAdminConfigured()) {
    throw new Error('Firebase Admin não configurado. Para criar contas e redefinir senha, use o JSON da service account no .env.local.');
  }
}

async function verifyCaller(request: NextRequest) {
  await requireAdminConfigured();
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Token do usuário não informado.');
  const decoded = await getAdminAuth().verifyIdToken(token);
  const profile = await getAdminDb().collection('usuarios').doc(decoded.uid).get();
  if (!profile.exists || profile.data()?.perfil !== 'admin') {
    throw new Error('Apenas administradores podem executar esta ação.');
  }
  return decoded;
}

export async function POST(request: NextRequest) {
  try {
    await verifyCaller(request);
    const body = await request.json();
    const userRecord = await getAdminAuth().createUser({
      email: body.email,
      password: body.senhaTemporaria,
      displayName: body.nome,
      disabled: !body.ativo
    });

    await getAdminDb().collection('usuarios').doc(userRecord.uid).set({
      id: userRecord.uid,
      nome: body.nome,
      email: body.email,
      perfil: body.perfil,
      ativo: body.ativo,
      empresaId: body.empresaId,
      createdAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ id: userRecord.uid });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao criar usuário.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await verifyCaller(request);
    const body = await request.json();
    await getAdminAuth().updateUser(body.uid, { password: body.novaSenha });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao redefinir senha.' }, { status: 500 });
  }
}
