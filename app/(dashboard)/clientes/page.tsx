'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateBR } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { listClientes } from '@/lib/client-data';

export default function ClientesPage() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!user) return;
    let ativo = true;
    async function load() {
      try {
        const data = await listClientes(user.empresaId);
        if (ativo) setClientes(data);
      } catch (error) {
        if (ativo) setErro(error instanceof Error ? error.message : 'Falha ao carregar clientes.');
      }
    }
    void load();
    return () => { ativo = false; };
  }, [user]);

  return (
    <Card>
      <CardHeader><CardTitle>Clientes cadastrados</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
        {clientes.length === 0 && !erro ? <p className="text-sm text-gray-500">Nenhum cliente cadastrado.</p> : null}
        {clientes.map((cliente) => (
          <div key={cliente.id} className="rounded-xl border border-gray-200 p-4">
            <p className="font-semibold text-ink">{cliente.nome}</p>
            <p className="text-sm text-gray-500">{cliente.telefone}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-400">Cadastro: {formatDateBR(cliente.dataCriacao)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
