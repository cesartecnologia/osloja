import { z } from 'zod';

export const pagamentoFormaSchema = z.object({
  tipo: z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia']),
  valor: z.coerce.number().min(0),
  parcelas: z.coerce.number().min(1).max(12).optional()
});

export const senhaSchema = z.object({
  tipo: z.enum(['sem_senha', 'numerica', 'padrao']),
  valor: z.string().default('')
}).superRefine((value, ctx) => {
  if (value.tipo === 'numerica' && !/^\d{4,6}$/.test(value.valor)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['valor'],
      message: 'Informe uma senha numérica entre 4 e 6 dígitos.'
    });
  }

  if (value.tipo === 'padrao' && value.valor.length < 4) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['valor'],
      message: 'O padrão deve conter pelo menos 4 pontos conectados.'
    });
  }
});

export const servicoSchema = z.object({
  descricao: z.string().optional().or(z.literal('')).default(''),
  valor: z.coerce.number().min(0),
  garantiaDias: z.coerce.number().min(0).default(0)
});

export const pecaSchema = z.object({
  descricao: z.string().min(2),
  valor: z.coerce.number().min(0),
  produtoId: z.string().optional(),
  quantidade: z.coerce.number().min(1).optional()
});

export const osSchema = z.object({
  id: z.string().optional(),
  cliente: z.object({
    nome: z.string().min(2),
    telefone: z.string().min(10),
    cpf: z.string().optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
    endereco: z.string().optional().or(z.literal(''))
  }),
  aparelho: z.object({
    marca: z.string().min(1),
    modelo: z.string().min(1),
    imei: z.string().optional().or(z.literal('')),
    cor: z.string().optional().or(z.literal('')),
    acessorios: z.array(z.string()).default([]),
    condicaoEntrada: z.string().min(4)
  }),
  senha: senhaSchema,
  servicos: z.array(servicoSchema).min(1),
  pecas: z.array(pecaSchema).optional().default([]),
  desconto: z.coerce.number().min(0).default(0),
  descontoTipo: z.enum(['valor', 'percentual']).default('valor'),
  pagamento: z.object({
    formas: z.array(pagamentoFormaSchema).default([]),
    entrada: z.coerce.number().min(0).optional(),
    saldoDevedor: z.coerce.number().min(0).optional(),
    statusPagamento: z.enum(['pendente', 'entrada_paga', 'pago_total'])
  }),
  tecnico: z.string().optional().or(z.literal('')).default(''),
  tecnicoId: z.string().optional().or(z.literal('')).default(''),
  observacoes: z.string().optional().or(z.literal('')),
  previsaoEntrega: z.string().optional().or(z.literal('')),
  status: z.enum(['aguardando', 'em_andamento', 'aguardando_peca', 'pronto', 'entregue', 'cancelado']).default('aguardando'),
  origemOS: z.enum(['balcao', 'whatsapp', 'retorno', 'garantia']).default('balcao')
}).superRefine((value, ctx) => {
  const filledServices = value.servicos.filter((item) => (item.descricao || '').trim().length > 0 || Number(item.valor || 0) > 0);

  if (filledServices.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['servicos'],
      message: 'Adicione pelo menos um serviço válido.'
    });
  }

  value.servicos.forEach((item, index) => {
    const hasContent = (item.descricao || '').trim().length > 0 || Number(item.valor || 0) > 0;
    if (hasContent && (item.descricao || '').trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['servicos', index, 'descricao'],
        message: 'Informe a descrição do serviço.'
      });
    }
  });
});

export const produtoSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(2),
  categoria: z.string().min(2),
  codigo: z.string().optional(),
  preco_custo: z.coerce.number().min(0),
  preco_venda: z.coerce.number().min(0),
  estoque: z.coerce.number().min(0),
  estoque_minimo: z.coerce.number().min(0)
});

export const vendaSchema = z.object({
  id: z.string().optional(),
  cliente: z.object({
    nome: z.string().optional(),
    telefone: z.string().optional()
  }).optional(),
  itens: z.array(z.object({
    produtoId: z.string().optional(),
    nome: z.string().min(2),
    quantidade: z.coerce.number().min(1),
    valorUnitario: z.coerce.number().min(0),
    subtotal: z.coerce.number().min(0)
  })).min(1),
  desconto: z.coerce.number().min(0).default(0),
  descontoTipo: z.enum(['valor', 'percentual']).default('valor'),
  pagamento: z.object({
    formas: z.array(pagamentoFormaSchema).default([]),
    entrada: z.coerce.number().min(0).optional(),
    saldoDevedor: z.coerce.number().min(0).optional(),
    statusPagamento: z.enum(['pendente', 'entrada_paga', 'pago_total'])
  })
});

export const usuarioSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(2),
  email: z.string().email(),
  perfil: z.enum(['admin', 'tecnico', 'atendente']),
  ativo: z.boolean().default(true),
  senhaTemporaria: z.string().min(6).optional()
});

export const empresaSchema = z.object({
  nome: z.string().min(2),
  slogan: z.string().optional().or(z.literal('')),
  cnpj: z.string().optional().or(z.literal('')),
  telefone: z.string().optional().or(z.literal('')),
  endereco: z.string().optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  prefixoOS: z.string().optional().or(z.literal('')),
  termosCondicoes: z.string().optional().or(z.literal('')),
  configuracoes: z.object({
    larguraImpressora: z.enum(['58mm', '80mm'])
  })
});
