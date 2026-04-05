import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { createOrUpdateOS, getOrdemServicoById } from '@/lib/repositories';
import { osSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getRequestUser(request);
    const os = await getOrdemServicoById(params.id);
    if (!os) {
      return NextResponse.json({ error: 'OS não encontrada.' }, { status: 404 });
    }
    if (user.perfil === 'tecnico' && os.tecnicoId !== user.uid) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
    return NextResponse.json(os);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao buscar OS.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getRequestUser(request);
    const payload = osSchema.parse(await request.json());
    const id = await createOrUpdateOS(user, { ...payload, id: params.id } as never);
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao atualizar OS.' }, { status: 400 });
  }
}
