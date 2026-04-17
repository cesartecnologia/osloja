import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPrefixes = ['/dashboard', '/os', '/vendas', '/relatorios', '/clientes', '/usuarios', '/configuracoes'];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const hasCookie = request.cookies.get('os-auth')?.value === '1';

  if (pathname === '/login' && hasCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isProtected && !hasCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/os/:path*', '/vendas/:path*', '/relatorios/:path*', '/clientes/:path*', '/usuarios/:path*', '/configuracoes/:path*', '/login']
};
