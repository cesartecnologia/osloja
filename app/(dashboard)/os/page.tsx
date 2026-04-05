'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Filter, Plus, Search, X } from 'lucide-react';
import { OSCard } from '@/components/os/OSCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/components/providers/AuthProvider';
import { listOrdensServico } from '@/lib/client-data';

const PAGE_SIZE = 9;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function OSPage() {
  const { user } = useAuth();
  const [todas, setTodas] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [periodo, setPeriodo] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let ativo = true;

    async function load() {
      try {
        setLoading(true);
        const data = await listOrdensServico(user.empresaId);
        if (ativo) setTodas(data);
      } catch (error) {
        if (ativo) setErro(error instanceof Error ? error.message : 'Falha ao carregar ordens de serviço.');
      } finally {
        if (ativo) setLoading(false);
      }
    }

    void load();
    return () => {
      ativo = false;
    };
  }, [user]);

  const filtered = useMemo(() => {
    const hoje = startOfDay(new Date());

    return todas.filter((item) => {
      const target = `${item.numeroFormatado} ${item.cliente?.nome} ${item.cliente?.telefone} ${item.aparelho?.modelo} ${item.aparelho?.marca}`.toLowerCase();
      const matchSearch = !search || target.includes(search.toLowerCase());
      const matchStatus = !status || item.status === status;

      let matchPeriodo = true;
      if (periodo !== 'todos') {
        const criado = new Date(item.dataCriacao);
        const diffDays = Math.floor((hoje.getTime() - startOfDay(criado).getTime()) / 86400000);
        if (periodo === 'hoje') matchPeriodo = diffDays === 0;
        if (periodo === '7') matchPeriodo = diffDays <= 7;
        if (periodo === '30') matchPeriodo = diffDays <= 30;
        if (periodo === '90') matchPeriodo = diffDays <= 90;
      }

      return matchSearch && matchStatus && matchPeriodo;
    });
  }, [periodo, search, status, todas]);

  useEffect(() => {
    setPagina(1);
  }, [search, status, periodo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(pagina, totalPages);
  const inicio = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(inicio, inicio + PAGE_SIZE);

  const resumo = useMemo(() => {
    const abertas = filtered.filter((item) => !['entregue', 'cancelado'].includes(item.status));
    const prontas = filtered.filter((item) => item.status === 'pronto');
    const aguardando = filtered.filter((item) => item.status === 'aguardando');
    return [
      { label: 'Total filtrado', value: String(filtered.length) },
      { label: 'Abertas', value: String(abertas.length) },
      { label: 'Prontas', value: String(prontas.length) },
      { label: 'Em análise', value: String(aguardando.length) }
    ];
  }, [filtered]);

  const hasFilters = Boolean(search || status || periodo !== 'todos');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Ordens de serviço</p>
          <h1 className="text-3xl font-bold text-ink">Acompanhe todas as OS</h1>
          <p className="mt-1 text-sm text-gray-500">Busque rápido por cliente, número, telefone ou aparelho e acompanhe o fluxo da oficina.</p>
        </div>
        <Link href="/os/nova">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova OS
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {resumo.map((item) => (
          <Card key={item.label} className="border-gray-200">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-ink">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-gray-200">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Filter className="h-4 w-4 text-red-600" />
            Filtros da listagem
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_220px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input className="pl-9" placeholder="Buscar por cliente, número, telefone ou modelo" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="aguardando">Aguardando</option>
              <option value="em_andamento">Em andamento</option>
              <option value="aguardando_peca">Aguardando peça</option>
              <option value="pronto">Pronto</option>
              <option value="entregue">Entregue</option>
              <option value="cancelado">Cancelado</option>
            </Select>

            <Select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              <option value="todos">Todo período</option>
              <option value="hoje">Hoje</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </Select>

            <Button
              type="button"
              variant="outline"
              disabled={!hasFilters}
              onClick={() => {
                setSearch('');
                setStatus('');
                setPeriodo('todos');
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Limpar
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
            <p>
              Mostrando <strong className="text-ink">{paginated.length}</strong> de <strong className="text-ink">{filtered.length}</strong> OS encontradas.
            </p>
            <p>
              Página <strong className="text-ink">{currentPage}</strong> de <strong className="text-ink">{totalPages}</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
      {loading ? <p className="text-sm text-gray-500">Carregando ordens de serviço...</p> : null}

      {!loading && !erro ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {paginated.map((ordem) => (
              <OSCard key={ordem.id} os={ordem} />
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma OS encontrada com os filtros atuais.</p>
          ) : null}

          {filtered.length > PAGE_SIZE ? (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button type="button" variant="outline" disabled={currentPage <= 1} onClick={() => setPagina((value) => Math.max(1, value - 1))}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>
              <div className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600">
                {currentPage}/{totalPages}
              </div>
              <Button type="button" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPagina((value) => Math.min(totalPages, value + 1))}>
                Próxima
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
