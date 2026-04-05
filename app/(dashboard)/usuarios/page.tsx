'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase-client';
import { updateUsuarioPerfil, listUsuarios } from '@/lib/client-data';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import { fetchJson } from '@/lib/http';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const initialForm = {
  nome: '',
  email: '',
  perfil: 'atendente',
  ativo: true,
  senhaTemporaria: ''
};

export default function UsuariosPage() {
  const { user } = useAuth();
  const { notify, prompt } = useFeedback();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState('');
  const [erro, setErro] = useState('');

  async function load() {
    if (!user) return;
    const data = await listUsuarios(user.empresaId);
    setUsuarios(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    void load().catch((error) => {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar usuários.');
    });
  }, [user]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro('');

    try {
      if (!user) throw new Error('Sessão não encontrada.');

      if (editingId) {
        await updateUsuarioPerfil(editingId, {
          nome: form.nome,
          email: form.email,
          perfil: form.perfil as any,
          ativo: form.ativo,
          empresaId: user.empresaId
        });
      } else {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
        await fetchJson('/api/usuarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ ...form, empresaId: user.empresaId })
        });
      }

      setForm(initialForm);
      setEditingId('');
      await load();
      notify({ title: editingId ? 'Usuário atualizado' : 'Usuário criado', description: editingId ? 'As informações do usuário foram atualizadas.' : 'O novo usuário foi cadastrado com sucesso.', variant: 'success' });
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar usuário.');
    }
  }

  async function redefinirSenha(uid: string) {
    const novaSenha = await prompt({
      title: 'Redefinir senha',
      description: 'Informe a nova senha temporária para este usuário.',
      label: 'Nova senha temporária',
      inputType: 'password',
      placeholder: 'Digite a nova senha',
      confirmText: 'Salvar senha',
      cancelText: 'Cancelar',
      tone: 'warning'
    });
    if (!novaSenha) return;

    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      await fetchJson('/api/usuarios', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ uid, novaSenha })
      });
      notify({ title: 'Senha redefinida', description: 'A nova senha temporária foi salva com sucesso.', variant: 'success' });
    } catch (error) {
      notify({ title: 'Falha ao redefinir senha', description: error instanceof Error ? error.message : 'Não foi possível redefinir a senha.', variant: 'error' });
    }
  }

  async function alternarStatus(usuario: any) {
    try {
      await updateUsuarioPerfil(usuario.id, { ativo: !usuario.ativo });
      await load();
      notify({ title: usuario.ativo ? 'Usuário desativado' : 'Usuário ativado', description: 'O status do usuário foi atualizado com sucesso.', variant: 'success' });
    } catch (error) {
      notify({ title: 'Falha ao atualizar status', description: error instanceof Error ? error.message : 'Não foi possível atualizar o status do usuário.', variant: 'error' });
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardHeader><CardTitle>{editingId ? 'Editar usuário' : 'Novo usuário'}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
            <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))} /></div>
            <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} /></div>
            <div><Label>Perfil</Label><Select value={form.perfil} onChange={(e) => setForm((c) => ({ ...c, perfil: e.target.value }))}><option value="admin">Admin</option><option value="tecnico">Técnico</option><option value="atendente">Atendente</option></Select></div>
            {!editingId ? <div><Label>Senha temporária</Label><Input type="password" value={form.senhaTemporaria} onChange={(e) => setForm((c) => ({ ...c, senhaTemporaria: e.target.value }))} /></div> : null}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4"><div><p className="font-semibold text-ink">Usuário ativo</p><p className="text-sm text-gray-500">Controle imediato de acesso ao sistema.</p></div><Switch checked={form.ativo} onCheckedChange={(checked) => setForm((c) => ({ ...c, ativo: checked }))} /></div>
            <Button type="submit" className="w-full">{editingId ? 'Atualizar usuário' : 'Criar usuário'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Usuários cadastrados</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {usuarios.map((usuario) => (
            <div key={usuario.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
              <div>
                <p className="font-semibold text-ink">{usuario.nome}</p>
                <p className="text-sm text-gray-500">{usuario.email} • {usuario.perfil}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => { setEditingId(usuario.id); setForm({ nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, ativo: usuario.ativo, senhaTemporaria: '' }); }}>Editar</Button>
                <Button type="button" variant="outline" onClick={() => void redefinirSenha(usuario.id)}>Redefinir senha</Button>
                <Button type="button" variant="outline" onClick={() => void alternarStatus(usuario)}>{usuario.ativo ? 'Desativar' : 'Ativar'}</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
