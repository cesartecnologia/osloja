import { NextRequest, NextResponse } from 'next/server';
import { differenceInDays, subDays } from 'date-fns';
import { getRequestUser } from '@/lib/auth';
import { listOrdensServico, listProdutos, listVendas } from '@/lib/repositories';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const [ordens, vendas, produtos] = await Promise.all([
      listOrdensServico(user.empresaId),
      listVendas(user.empresaId),
      listProdutos(user.empresaId)
    ]);

    const period = new URL(request.url).searchParams.get('periodo') || '30';
    const days = Number(period);
    const startDate = subDays(new Date(), days);

    const ordensPeriodo = ordens.filter((item) => new Date(item.dataCriacao) >= startDate);
    const vendasPeriodo = vendas.filter((item) => new Date(item.dataCriacao) >= startDate);

    const faturamentoOS = ordensPeriodo.reduce((acc, item) => acc + (item.pagamento.statusPagamento !== 'pendente' ? item.total : item.pagamento.entrada || 0), 0);
    const faturamentoVendas = vendasPeriodo.reduce((acc, item) => acc + item.total, 0);
    const faturamento = faturamentoOS + faturamentoVendas;
    const ticketMedio = ordensPeriodo.length ? faturamentoOS / ordensPeriodo.length : 0;
    const prontas = ordens.filter((item) => item.status === 'pronto').length;
    const abertas = ordens.filter((item) => ['aguardando', 'em_andamento', 'aguardando_peca'].includes(item.status)).length;
    const emAtraso = ordens.filter((item) => item.status !== 'entregue' && differenceInDays(new Date(), new Date(item.dataAtualizacao)) > 7).length;

    const receita7Dias = Array.from({ length: 7 }, (_, index) => {
      const date = subDays(new Date(), 6 - index);
      const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const total = ordens
        .filter((item) => new Date(item.dataCriacao).toDateString() === date.toDateString())
        .reduce((acc, item) => acc + item.total, 0);
      return { label, total };
    });

    const statusDistribuicao = ['aguardando', 'em_andamento', 'aguardando_peca', 'pronto', 'entregue', 'cancelado'].map((status) => ({
      status,
      total: ordens.filter((item) => item.status === status).length
    }));

    const formasPagamento = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia'].map((tipo) => ({
      tipo,
      total: ordensPeriodo.reduce((acc, item) => {
        const soma = item.pagamento.formas.filter((forma) => forma.tipo === tipo).reduce((inner, forma) => inner + forma.valor, 0);
        return acc + soma;
      }, 0)
    }));

    const tecnicoRanking = Object.values(
      ordensPeriodo.reduce<Record<string, { tecnico: string; total: number }>>((acc, item) => {
        const key = item.tecnico || 'Sem técnico';
        acc[key] = acc[key] || { tecnico: key, total: 0 };
        acc[key].total += 1;
        return acc;
      }, {})
    );

    const servicosRanking = Object.values(
      ordensPeriodo.flatMap((item) => item.servicos).reduce<Record<string, { descricao: string; total: number }>>((acc, item) => {
        acc[item.descricao] = acc[item.descricao] || { descricao: item.descricao, total: 0 };
        acc[item.descricao].total += 1;
        return acc;
      }, {})
    ).sort((a, b) => b.total - a.total);

    const estoqueBaixo = produtos.filter((item) => item.estoque <= item.estoque_minimo);
    const valorTotalEstoque = produtos.reduce((acc, item) => acc + item.preco_custo * item.estoque, 0);

    return NextResponse.json({
      kpis: {
        abertas,
        prontas,
        faturamento,
        ticketMedio,
        emAtraso
      },
      receita7Dias,
      statusDistribuicao,
      formasPagamento,
      tecnicoRanking,
      servicosRanking,
      estoqueBaixo,
      valorTotalEstoque,
      ordensRecentes: ordens.slice(0, 5),
      ordensPeriodo
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao gerar relatórios.' }, { status: 500 });
  }
}
