import type { Prisma } from "@prisma/client";

/**
 * Cartões de situação da lista de Requisições do backoffice. Cada requisição cai em um só
 * grupo, então os números dos cartões somam o que existe. Os filtros são condições do Prisma
 * (a página os combina com a busca e com o seletor de situação).
 */
export const GRUPOS_ATENDIMENTO = [
  {
    chave: "analise-duplicidade",
    rotulo: "Aguardando análise",
    dica: "Enviadas que esperam a análise de duplicidade (12:00 e 00:00)",
    filtro: { status: "PENDENTE", analiseDuplicidadeEm: null } satisfies Prisma.SolicitacaoWhereInput,
  },
  {
    chave: "fila",
    rotulo: "Na fila",
    dica: "Analisadas, aguardando abertura de processo",
    filtro: {
      status: "PENDENTE",
      analiseDuplicidadeEm: { not: null },
      processId: null,
    } satisfies Prisma.SolicitacaoWhereInput,
  },
  {
    chave: "aguardando-cliente",
    rotulo: "Aguardando cliente",
    dica: "Com pergunta de duplicidade sem resposta",
    filtro: { status: "AGUARDANDO_CLIENTE" } satisfies Prisma.SolicitacaoWhereInput,
  },
  {
    chave: "congeladas",
    rotulo: "Congeladas",
    dica: "Pedidos com 13 ou mais polígonos",
    filtro: {
      OR: [{ status: "AGUARDANDO_LIBERACAO" }, { status: "RASCUNHO", congeladaEm: { not: null } }],
    } satisfies Prisma.SolicitacaoWhereInput,
  },
  {
    chave: "em-analise",
    rotulo: "Em análise",
    dica: "Com processo aberto",
    filtro: { status: "EM_ANALISE" } satisfies Prisma.SolicitacaoWhereInput,
  },
  {
    chave: "devolvidas",
    rotulo: "Devolvidas",
    dica: "Devolvidas ao solicitante para correção",
    filtro: { status: "DEVOLVIDA" } satisfies Prisma.SolicitacaoWhereInput,
  },
  {
    chave: "arquivamento-solicitado",
    rotulo: "Arquivamento solicitado",
    dica: "Pedidos de arquivamento aguardando a DDD",
    filtro: { status: "ARQUIVAMENTO_SOLICITADO" } satisfies Prisma.SolicitacaoWhereInput,
  },
  {
    chave: "arquivadas",
    rotulo: "Arquivadas",
    dica: "Arquivadas (a DDD pode desarquivar)",
    filtro: { status: "ARQUIVADA" } satisfies Prisma.SolicitacaoWhereInput,
  },
  {
    chave: "concluidas",
    rotulo: "Concluídas",
    dica: "Finalizadas",
    filtro: { status: { in: ["APROVADA", "CONCLUIDA"] } } satisfies Prisma.SolicitacaoWhereInput,
  },
] as const;

export type ChaveGrupoAtendimento = (typeof GRUPOS_ATENDIMENTO)[number]["chave"];

export function grupoAtendimento(chave: string | null | undefined) {
  return GRUPOS_ATENDIMENTO.find((g) => g.chave === chave) ?? null;
}

/**
 * Links antigos da lista (`?semProcesso=1`, `?analise=1`) continuam funcionando: viram o
 * cartão equivalente.
 */
export function chaveDoGrupoPelosParametros(params: {
  grupo?: string;
  semProcesso?: string;
  analise?: string;
}): ChaveGrupoAtendimento | null {
  if (grupoAtendimento(params.grupo)) return params.grupo as ChaveGrupoAtendimento;
  if (params.analise === "1") return "analise-duplicidade";
  if (params.semProcesso === "1") return "fila";
  return null;
}
