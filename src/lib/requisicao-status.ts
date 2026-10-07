/** Rotulos e cores dos status das requisicoes (portal, atendimento e backoffice). */
export const REQUISICAO_STATUS: Record<string, { label: string; classe: string }> = {
  PENDENTE: { label: "Pendente", classe: "bg-amber-100 text-amber-800" },
  EM_ANALISE: { label: "Em análise", classe: "bg-blue-100 text-blue-800" },
  APROVADA: { label: "Aprovada", classe: "bg-emerald-100 text-emerald-800" },
  DEVOLVIDA: { label: "Devolvida", classe: "bg-red-100 text-red-800" },
  CONCLUIDA: { label: "Concluída", classe: "bg-gray-200 text-gray-700" },
  // Estados novos (ver solicitacao-estados.ts); só passam a ser gravados nas fases seguintes.
  RASCUNHO: { label: "Não enviada", classe: "bg-gray-100 text-gray-700" },
  AGUARDANDO_LIBERACAO: { label: "Aguardando liberação", classe: "bg-orange-100 text-orange-800" },
  AGUARDANDO_CLIENTE: { label: "Aguardando sua resposta", classe: "bg-violet-100 text-violet-800" },
  ARQUIVAMENTO_SOLICITADO: { label: "Arquivamento solicitado", classe: "bg-gray-200 text-gray-700" },
  ARQUIVADA: { label: "Arquivada", classe: "bg-gray-200 text-gray-700" },
};

export function statusRequisicao(status: string): { label: string; classe: string } {
  return REQUISICAO_STATUS[status] ?? REQUISICAO_STATUS.PENDENTE;
}

export const PAGAMENTO_LABEL: Record<string, string> = {
  PENDENTE: "Pagamento pendente",
  PAGO: "Pago",
  ISENTO: "Isento",
};

/** Etapas mostradas ao solicitante na tela de acompanhamento, em ordem. */
export const ETAPAS_ACOMPANHAMENTO = [
  "Conformidade mínima",
  "Setor de Atendimentos",
  "Setor Técnico",
  "Documento em assinatura",
  "Aguardando pagamento",
  "Liberado para download",
] as const;

export type AcompanhamentoRequisicao =
  | { tipo: "ETAPA"; atual: number; detalhe?: string }
  | { tipo: "SOBRESTADO" }
  | { tipo: "CANCELADO" };

const SUBETAPA_TECNICA: Record<string, string> = {
  distribuicao_gdat: "Triagem da área",
  analise_tecnica: "Elaboração da divisa",
  conferencia: "Conferência da divisa",
};

/**
 * Deriva a etapa do acompanhamento a partir do fluxo interno. Ainda não existe um
 * "status do cliente" no backend (#PEND-27): quando existir, esta função é substituída.
 * `atual` é o índice em ETAPAS_ACOMPANHAMENTO.
 */
export function acompanhamentoRequisicao(dados: {
  situacaoProcesso: string | null;
  pagamentoStatus: string | null;
  finalizadaEm?: Date | string | null;
}): AcompanhamentoRequisicao {
  const { situacaoProcesso: s, pagamentoStatus, finalizadaEm } = dados;
  const pago = pagamentoStatus === "PAGO" || pagamentoStatus === "ISENTO";
  if (!s) return { tipo: "ETAPA", atual: finalizadaEm ? (pago ? 5 : 4) : 0 };
  if (s === "sobrestado") return { tipo: "SOBRESTADO" };
  if (s === "cancelado") return { tipo: "CANCELADO" };
  if (s === "entrada_sdtc") return { tipo: "ETAPA", atual: 1 };
  if (s in SUBETAPA_TECNICA) return { tipo: "ETAPA", atual: 2, detalhe: SUBETAPA_TECNICA[s] };
  if (["assinatura_tecnico", "assinatura_gerente", "assinatura_diretor", "upload_sei"].includes(s)) {
    return { tipo: "ETAPA", atual: 3 };
  }
  if (s === "finalizado") {
    return { tipo: "ETAPA", atual: pago ? 5 : 4 };
  }
  return { tipo: "ETAPA", atual: 1 };
}

/**
 * Status Geral da tela Minhas Requisições (documento do cliente): cada grupo reúne os
 * status que o solicitante enxerga como uma coisa só. `status` vazio = grupo que o
 * backend ainda não alimenta (#PEND-42 rascunho, #PEND-29 arquivada); o cartão aparece
 * como "em breve" e passa a funcionar quando o código do status entrar na lista.
 */
export const GRUPOS_STATUS_GERAL = [
  { chave: "nao-enviadas", rotulo: "Não enviadas", status: ["RASCUNHO"] },
  { chave: "em-analise", rotulo: "Em análise", status: ["PENDENTE", "EM_ANALISE"] },
  { chave: "devolvidas", rotulo: "Devolvidas", status: ["DEVOLVIDA"] },
  { chave: "arquivadas", rotulo: "Arquivadas", status: [] as string[] }, // PEND-29: ["ARQUIVADA"]
  { chave: "concluidas", rotulo: "Concluídas", status: ["APROVADA", "CONCLUIDA"] },
] as const;

export type ChaveGrupoStatus = (typeof GRUPOS_STATUS_GERAL)[number]["chave"];

export function grupoStatusGeral(chave: string | undefined) {
  return GRUPOS_STATUS_GERAL.find((g) => g.chave === chave);
}
