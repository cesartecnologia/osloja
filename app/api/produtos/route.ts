import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { listProdutos, saveProduto } from '@/lib/repositories';
import { produtoSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const produtos = await listProdutos(user.empresaId);
    return NextResponse.json(produtos);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar produtos.' },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const payload = produtoSchema.parse(await request.json());

    if (!payload.nome?.trim()) {
      return NextResponse.json(
        { error: 'Nome do produto é obrigatório.' },
        { status: 400 }
      );
    }

    const id = await saveProduto(user.empresaId, {
      ...payload,
      nome: payload.nome.trim(),
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar produto.' },
      { status: 400 }
    );
  }
}