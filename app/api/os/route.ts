import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { createOrUpdateOS, listOrdensServico } from '@/lib/repositories';
import { osSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const ordens = await listOrdensServico(user.empresaId);

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').toLowerCase();
    const status = searchParams.get('status') || '';
    const tecnico = searchParams.get('tecnico') || '';

    const filtered = ordens.filter((item) => {
      const matchesSearch =
        !search ||
        [item.cliente.nome, item.numeroFormatado, item.aparelho.modelo, item.aparelho.marca]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search);

      const matchesStatus = !status || item.status === status;
      const matchesTecnico = !tecnico || item.tecnico === tecnico || item.tecnicoId === tecnico;

      if (user.perfil === 'tecnico') {
        return matchesSearch && matchesStatus && matchesTecnico && item.tecnicoId === user.uid;
      }

      return matchesSearch && matchesStatus && matchesTecnico;
    });

    return NextResponse.json(filtered);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao listar OS.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const payload = osSchema.parse(await request.json());
    const id = await createOrUpdateOS(user, payload as never);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar OS.' },
      { status: 400 }
    );
  }
}
