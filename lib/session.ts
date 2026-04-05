'use client';

const COOKIE_NAME = 'os-auth';

export function setAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
}

export function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}
