import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não autenticado.' }, { status: 401 });
  }
}
