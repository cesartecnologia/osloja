import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { listClientes } from '@/lib/repositories';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const clientes = await listClientes(user.empresaId);
    return NextResponse.json(clientes);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao listar clientes.' }, { status: 500 });
  }
}
