'use client';

import { useEffect, useState } from 'react';
import { UploadLogo } from '@/components/shared/UploadLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import { DEFAULT_EMPRESA, getEmpresa, updateEmpresa } from '@/lib/client-data';

export default function ConfiguracoesPage() {
  const { user, refresh } = useAuth();
  const { notify } = useFeedback();
  const [empresa, setEmpresa] = useState<any>(DEFAULT_EMPRESA);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let ativo = true;

    async function load() {
      try {
        const data = await getEmpresa(user.empresaId);
        if (ativo) {
          setEmpresa({
            ...DEFAULT_EMPRESA,
            ...data,
            configuracoes: {
              ...DEFAULT_EMPRESA.configuracoes,
              ...(data?.configuracoes || {})
            }
          });
        }
      } catch (error) {
        if (ativo) setErro(error instanceof Error ? error.message : 'Falha ao carregar configurações.');
      }
    }

    void load();
    return () => {
      ativo = false;
    };
  }, [user]);

  async function salvar() {
    if (!user) return;
    setLoading(true);
    setErro('');
    try {
      await updateEmpresa(user.empresaId, empresa);
      await refresh();
      notify({ title: 'Configurações salvas', description: 'As alterações da empresa foram atualizadas com sucesso.', variant: 'success' });
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Configurações</p>
        <h1 className="text-3xl font-bold text-ink">Dados da empresa e impressão</h1>
      </div>
      {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Identidade da empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome da empresa</Label>
              <Input value={empresa.nome} onChange={(e) => setEmpresa((c: any) => ({ ...c, nome: e.target.value }))} />
            </div>
            <div>
              <Label>Slogan</Label>
              <Input value={empresa.slogan || ''} onChange={(e) => setEmpresa((c: any) => ({ ...c, slogan: e.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>CNPJ</Label>
                <Input value={empresa.cnpj || ''} onChange={(e) => setEmpresa((c: any) => ({ ...c, cnpj: e.target.value }))} />
              </div>
              <div>
                <Label>Telefone / WhatsApp</Label>
                <Input value={empresa.telefone || ''} onChange={(e) => setEmpresa((c: any) => ({ ...c, telefone: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Endereço</Label>
              <Input value={empresa.endereco || ''} onChange={(e) => setEmpresa((c: any) => ({ ...c, endereco: e.target.value }))} />
            </div>
            <UploadLogo currentUrl={empresa.logoUrl} onUploaded={(url) => setEmpresa((c: any) => ({ ...c, logoUrl: url }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OS e impressão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Largura da impressora</Label>
              <Select value={empresa.configuracoes?.larguraImpressora || '58mm'} onChange={(e) => setEmpresa((c: any) => ({ ...c, configuracoes: { ...(c.configuracoes || {}), larguraImpressora: e.target.value } }))}>
                <option value="58mm">58mm</option>
                <option value="80mm">80mm</option>
              </Select>
            </div>

            <div>
              <Label>Termos e condições do cupom</Label>
              <Textarea
                rows={10}
                value={empresa.termosCondicoes || ''}
                onChange={(e) => setEmpresa((c: any) => ({ ...c, termosCondicoes: e.target.value }))}
                placeholder="Ex.: Garantia de 90 dias apenas para o serviço executado. Não cobre mau uso, oxidação, quedas ou violação do aparelho."
              />
            </div>

            <Button type="button" onClick={salvar} disabled={loading} className="w-full">
              {loading ? 'Salvando...' : 'Salvar configurações'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
