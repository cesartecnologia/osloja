import { NextResponse } from 'next/server';
import { empresaSchema } from '@/lib/validations';
import { getCurrentUserProfile, updateEmpresa } from '@/lib/client-data';

export async function GET() {
  try {
    const user = await getCurrentUserProfile();

    if (!user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    return NextResponse.json({ empresaId: user.empresaId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar empresa.' },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUserProfile();

    if (!user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const payload = empresaSchema.parse(await request.json());

    await updateEmpresa(user.empresaId, payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar empresa.' },
      { status: 400 }
    );
  }
}