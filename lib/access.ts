import type { SessionUser } from '@/types';

export function canAccessDashboard(user?: Pick<SessionUser, 'perfil'> | null) {
  return user?.perfil === 'admin';
}

export function canAccessReports(user?: Pick<SessionUser, 'perfil'> | null) {
  return user?.perfil === 'admin';
}

export function getDefaultRouteForUser(user?: Pick<SessionUser, 'perfil'> | null) {
  return canAccessDashboard(user) ? '/dashboard' : '/os';
}

export function sanitizeRedirectForUser(
  redirectTo: string | null | undefined,
  user?: Pick<SessionUser, 'perfil'> | null
) {
  if (!redirectTo) return getDefaultRouteForUser(user);
  const value = redirectTo.trim();
  if (!value.startsWith('/')) return getDefaultRouteForUser(user);

  if ((value === '/dashboard' || value.startsWith('/dashboard/') || value === '/relatorios' || value.startsWith('/relatorios/')) && !canAccessDashboard(user)) {
    return '/os';
  }

  return value;
}
