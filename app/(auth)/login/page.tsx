'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { setAuthCookie } from '@/lib/session';
import { bootstrapUser } from '@/lib/client-data';
import { sanitizeRedirectForUser } from '@/lib/access';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const credential = await signInWithEmailAndPassword(auth, email, senha);
      setAuthCookie();
      const profile = await bootstrapUser(credential.user);
      router.replace(sanitizeRedirectForUser(searchParams.get('redirect'), profile));
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao entrar no sistema.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">OS Assistência</p>
          <CardTitle className="text-3xl">Acesso ao sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            {erro ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p> : null}
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
