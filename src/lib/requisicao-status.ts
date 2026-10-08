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
  ARQUIVAMENTO_SOLICITADO: { label: "Arquivamento solicitado", classe: "bg-amber-100 text-amber-800" },
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

export interface Subetapa {
  rotulo: string;
  estado: "FEITA" | "ATUAL" | "PENDENTE";
}

export type AcompanhamentoRequisicao =
  | {
      tipo: "ETAPA";
      atual: number;
      /** Nome da subetapa em andamento (mostrado sob a etapa atual). */
      detalhe?: string;
      /** Subetapas do setor da etapa atual (Atendimento e Técnico), em ordem. */
      subetapas?: Subetapa[];
      /** Aviso quando a requisição está parada fora do fluxo do processo (ex.: devolvida). */
      aviso?: { titulo: string; texto: string };
    }
  | { tipo: "SOBRESTADO" }
  | { tipo: "CANCELADO" }
  /** Requisição arquivada (#PEND-29): não tem mais andamento. */
  | { tipo: "ARQUIVADA" };

/** Subetapas do Setor de Atendimentos (documento do cliente). */
export const SUBETAPAS_ATENDIMENTO = ["Checagem de documentos", "Liberação do número SEI"] as const;

/**
 * Subetapas do Setor Técnico. A "Expedição" corresponde à assinatura do técnico (hipótese do
 * time para o "Documento em expedição – CJT" do documento); as assinaturas do gerente e do
 * diretor ficam em "Documento em assinatura".
 */
export const SUBETAPAS_TECNICO = [
  "Triagem",
  "Elaboração da divisa",
  "Conferência da divisa",
  "Expedição",
] as const;

const INDICE_SUBETAPA_TECNICA: Record<string, number> = {
  distribuicao_gdat: 0,
  analise_tecnica: 1,
  conferencia: 2,
  assinatura_tecnico: 3,
};

function marcar(rotulos: readonly string[], atual: number): Subetapa[] {
  return rotulos.map((rotulo, i) => ({
    rotulo,
    estado: i < atual ? "FEITA" : i === atual ? "ATUAL" : "PENDENTE",
  }));
}

/** Aviso da etapa "Conformidade mínima" conforme a situação da requisição (sem processo). */
function avisoDeConformidade(
  status: string | null | undefined,
  analiseDuplicidadeEm: Date | string | null | undefined
): { titulo: string; texto: string } | undefined {
  switch (status) {
    case "DEVOLVIDA":
      return { titulo: "Devolvida para correção.", texto: "Revise os dados e envie novamente; o motivo está no aviso da requisição." };
    case "AGUARDANDO_LIBERACAO":
      return { titulo: "Aguardando a liberação da DDD.", texto: "Seu pedido tem 13 ou mais polígonos; o preenchimento fica pausado até a DDD liberar." };
    case "RASCUNHO":
      return { titulo: "Liberada pela DDD.", texto: "Continue o preenchimento e envie a solicitação." };
    case "AGUARDANDO_CLIENTE":
      return { titulo: "Aguardando a sua resposta.", texto: "Há uma pergunta na conversa que precisa ser respondida para a análise continuar." };
    case "ARQUIVAMENTO_SOLICITADO":
      return { titulo: "Pedido de arquivamento em análise.", texto: "A DDD vai decidir sobre o seu pedido." };
    case "PENDENTE":
      return analiseDuplicidadeEm
        ? { titulo: "Aguardando a abertura do processo.", texto: "A análise de duplicidade foi concluída; o Atendimento vai abrir o processo." }
        : { titulo: "Em análise de duplicidade.", texto: "A análise roda às 12:00 e às 00:00; depois a requisição segue para o Atendimento." };
    default:
      return undefined;
  }
}

/**
 * Deriva o acompanhamento do solicitante (#PEND-27) a partir do fluxo interno e da situação
 * da requisição. `atual` é o índice em ETAPAS_ACOMPANHAMENTO. Os setores de Atendimento e
 * Técnico trazem as subetapas; antes do processo, `aviso` explica a espera.
 */
export function acompanhamentoRequisicao(dados: {
  situacaoProcesso: string | null;
  pagamentoStatus: string | null;
  finalizadaEm?: Date | string | null;
  /** Status da requisição (`Solicitacao.status`). */
  statusRequisicao?: string | null;
  /** Quando o Atendimento marcou a checagem de documentos. */
  docsConferidosEm?: Date | string | null;
  /** Número SEI do processo; preenchido = liberação do SEI feita. */
  expediente?: string | null;
  analiseDuplicidadeEm?: Date | string | null;
}): AcompanhamentoRequisicao {
  const { situacaoProcesso: s, pagamentoStatus, finalizadaEm } = dados;
  if (dados.statusRequisicao === "ARQUIVADA") return { tipo: "ARQUIVADA" };
  const pago = pagamentoStatus === "PAGO" || pagamentoStatus === "ISENTO";
  if (!s) {
    if (finalizadaEm) return { tipo: "ETAPA", atual: pago ? 5 : 4 };
    return {
      tipo: "ETAPA",
      atual: 0,
      aviso: avisoDeConformidade(dados.statusRequisicao, dados.analiseDuplicidadeEm),
    };
  }
  if (s === "sobrestado") return { tipo: "SOBRESTADO" };
  if (s === "cancelado") return { tipo: "CANCELADO" };
  if (s === "entrada_sdtc") {
    const docs = Boolean(dados.docsConferidosEm);
    const sei = Boolean(dados.expediente);
    const atual: number = !docs ? 0 : !sei ? 1 : SUBETAPAS_ATENDIMENTO.length;
    return {
      tipo: "ETAPA",
      atual: 1,
      detalhe: SUBETAPAS_ATENDIMENTO[atual as number],
      subetapas: marcar(SUBETAPAS_ATENDIMENTO, atual),
    };
  }
  if (s in INDICE_SUBETAPA_TECNICA) {
    const i = INDICE_SUBETAPA_TECNICA[s];
    return { tipo: "ETAPA", atual: 2, detalhe: SUBETAPAS_TECNICO[i], subetapas: marcar(SUBETAPAS_TECNICO, i) };
  }
  if (["assinatura_gerente", "assinatura_diretor", "upload_sei"].includes(s)) {
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
 * backend ainda não alimenta; o cartão aparece como "em breve" e passa a funcionar quando o
 * código do status entrar na lista. Hoje todos os grupos são alimentados.
 */
export const GRUPOS_STATUS_GERAL = [
  { chave: "nao-enviadas", rotulo: "Não enviadas", status: ["RASCUNHO"] },
  {
    chave: "em-analise",
    rotulo: "Em análise",
    // Congelada (13+ polígonos), aguardando resposta e pedido de arquivamento também estão com a DDD.
    status: ["PENDENTE", "EM_ANALISE", "AGUARDANDO_LIBERACAO", "AGUARDANDO_CLIENTE", "ARQUIVAMENTO_SOLICITADO"],
  },
  { chave: "devolvidas", rotulo: "Devolvidas", status: ["DEVOLVIDA"] },
  { chave: "arquivadas", rotulo: "Arquivadas", status: ["ARQUIVADA"] },
  { chave: "concluidas", rotulo: "Concluídas", status: ["APROVADA", "CONCLUIDA"] },
] as const;

export type ChaveGrupoStatus = (typeof GRUPOS_STATUS_GERAL)[number]["chave"];

export function grupoStatusGeral(chave: string | undefined) {
  return GRUPOS_STATUS_GERAL.find((g) => g.chave === chave);
}
