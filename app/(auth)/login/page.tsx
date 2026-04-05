import { Suspense } from 'react';
import { LoginPageClient } from './LoginPageClient';

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10"><p className="text-sm text-gray-500">Carregando...</p></main>}>
      <LoginPageClient />
    </Suspense>
  );
}