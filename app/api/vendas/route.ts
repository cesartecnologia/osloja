import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { createVenda, listVendas } from '@/lib/repositories';
import { vendaSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const vendas = await listVendas(user.empresaId);
    return NextResponse.json(vendas);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao listar vendas.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const payload = vendaSchema.parse(await request.json());
    const id = await createVenda(user, payload as never);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao salvar venda.' }, { status: 400 });
  }
}
