export type PerfilUsuario = 'admin' | 'tecnico' | 'atendente';

export type StatusOS =
  | 'aguardando'
  | 'em_andamento'
  | 'aguardando_peca'
  | 'pronto'
  | 'entregue'
  | 'cancelado';

export type TipoSenha = 'sem_senha' | 'numerica' | 'padrao';

export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'transferencia';

export type LarguraImpressora = '58mm' | '80mm';

export interface SessionUser {
  uid: string;
  email: string;
  nome: string;
  perfil: PerfilUsuario;
  empresaId: string;
  ativo: boolean;
}

export interface ItemServico {
  descricao: string;
  valor: number;
  garantiaDias?: number;
}

export interface ItemPeca {
  descricao: string;
  valor: number;
  produtoId?: string;
  quantidade?: number;
}

export interface PagamentoForma {
  tipo: FormaPagamento;
  valor: number;
  parcelas?: number;
}

export interface HistoricoStatusItem {
  statusAnterior: StatusOS | null;
  statusNovo: StatusOS;
  data: string;
  usuarioId: string;
  usuarioNome: string;
  observacao?: string;
}

export interface OrdemServico {
  id: string;
  numero: number;
  numeroFormatado: string;
  prefixoNumero?: string;
  senha: { tipo: TipoSenha; valor: string };
  status: StatusOS;
  cliente: {
    nome: string;
    telefone: string;
    cpf?: string;
    email?: string;
    endereco?: string;
  };
  aparelho: {
    marca: string;
    modelo: string;
    imei?: string;
    cor?: string;
    acessorios?: string[];
    condicaoEntrada: string;
  };
  servicos: ItemServico[];
  pecas?: ItemPeca[];
  subtotal: number;
  desconto: number;
  descontoTipo: 'valor' | 'percentual';
  total: number;
  pagamento: {
    formas: PagamentoForma[];
    entrada?: number;
    saldoDevedor?: number;
    statusPagamento: 'pendente' | 'entrada_paga' | 'pago_total';
  };
  tecnico?: string;
  tecnicoId?: string;
  observacoes?: string;
  garantia?: {
    dias: number;
    dataInicio?: string;
    dataFim?: string;
  };
  previsaoEntrega?: string;
  dataCriacao: string;
  dataAtualizacao: string;
  dataEntrega?: string;
  criadoPor: string;
  origemOS?: 'balcao' | 'whatsapp' | 'retorno' | 'garantia';
  retiradoPor?: string;
  empresaId: string;
  historicoStatus: HistoricoStatusItem[];
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  cpf?: string;
  email?: string;
  endereco?: string;
  historico_os?: string[];
  dataCriacao: string;
  empresaId: string;
}

export interface Produto {
  id: string;
  nome: string;
  categoria: string;
  codigo?: string;
  preco_custo: number;
  preco_venda: number;
  estoque: number;
  estoque_minimo: number;
  empresaId: string;
}

export interface Venda {
  id: string;
  numero: number;
  numeroFormatado: string;
  itens: Array<{
    produtoId?: string;
    nome: string;
    quantidade: number;
    valorUnitario: number;
    subtotal: number;
  }>;
  subtotal: number;
  desconto: number;
  descontoTipo: 'valor' | 'percentual';
  total: number;
  pagamento: {
    formas: PagamentoForma[];
    entrada?: number;
    saldoDevedor?: number;
    statusPagamento: 'pendente' | 'entrada_paga' | 'pago_total';
  };
  cliente?: {
    nome?: string;
    telefone?: string;
  };
  dataCriacao: string;
  criadoPor: string;
  empresaId: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  empresaId: string;
  avatarUrl?: string;
  telefone?: string;
  createdAt?: string;
}

export interface Empresa {
  id: string;
  nome: string;
  slogan?: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
  logoUrl?: string;
  prefixoOS?: string;
  termosCondicoes?: string;
  configuracoes: {
    larguraImpressora: LarguraImpressora;
  };
}

export interface DashboardKPIs {
  abertas: number;
  prontas: number;
  faturamento: number;
  ticketMedio: number;
  emAtraso: number;
}
