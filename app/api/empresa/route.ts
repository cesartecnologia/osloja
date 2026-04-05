import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { getEmpresa, updateEmpresa } from '@/lib/repositories';
import { empresaSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const empresa = await getEmpresa(user.empresaId);
    return NextResponse.json(empresa);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao buscar empresa.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (user.perfil !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
    }

    const payload = empresaSchema.parse(await request.json());
    await updateEmpresa(user.empresaId, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao atualizar empresa.' }, { status: 400 });
  }
}
