/**
 * Estados da requisição (`Solicitacao.status`) e regras que dependem só deles.
 * O banco guarda texto livre (sem enum): todo código de status novo entra aqui e em
 * `REQUISICAO_STATUS` (`requisicao-status.ts`), senão a tela o mostra como "Pendente".
 *
 * Quem é a "DDD" do documento do cliente: os papéis de atendimento (ADMIN e SDTC,
 * `podeAtender` em `auth.ts`). Decisão do time em 2026-10-07, sem papel novo.
 */
export const STATUS_SOLICITACAO = {
  /** Salva pelo solicitante, ainda não enviada (#PEND-42). */
  RASCUNHO: "RASCUNHO",
  /** Congelada: 13 ou mais polígonos, aguarda a liberação da DDD (#PEND-31). */
  AGUARDANDO_LIBERACAO: "AGUARDANDO_LIBERACAO",
  /** Enviada; entra na fila da DDD depois da análise de duplicidade (#PEND-30). */
  PENDENTE: "PENDENTE",
  /** Pergunta de duplicidade aberta no chat; fora da fila até o solicitante responder. */
  AGUARDANDO_CLIENTE: "AGUARDANDO_CLIENTE",
  /** Processo aberto no backoffice. */
  EM_ANALISE: "EM_ANALISE",
  /** Devolvida ao solicitante para correção. */
  DEVOLVIDA: "DEVOLVIDA",
  APROVADA: "APROVADA",
  CONCLUIDA: "CONCLUIDA",
  /** O solicitante pediu arquivamento e a DDD ainda vai decidir (#PEND-29). */
  ARQUIVAMENTO_SOLICITADO: "ARQUIVAMENTO_SOLICITADO",
  ARQUIVADA: "ARQUIVADA",
} as const;

export type StatusSolicitacao = (typeof STATUS_SOLICITACAO)[keyof typeof STATUS_SOLICITACAO];

/**
 * Situações em que o solicitante pode alterar a própria requisição. Depois da abertura
 * do processo os dados alimentam a análise técnica e só o backoffice altera; a devolução
 * existe justamente para o cliente corrigir. Rascunho entra na Fase 4.
 */
export const STATUS_EDITAVEIS_PELO_CLIENTE: readonly string[] = [STATUS_SOLICITACAO.DEVOLVIDA];

/** Situações em que a DDD pode devolver a requisição ao solicitante. */
export const STATUS_DEVOLVIVEIS: readonly string[] = [
  STATUS_SOLICITACAO.PENDENTE,
  STATUS_SOLICITACAO.EM_ANALISE,
];

export const MOTIVO_DEVOLUCAO_MIN = 10;
export const MOTIVO_DEVOLUCAO_MAX = 1000;

/**
 * Devolução só enquanto não há processo aberto nem finalização: depois disso os dados
 * alimentam a análise técnica e o solicitante não os altera mais.
 */
export function podeDevolver(requisicao: {
  status: string;
  processId?: string | null;
  finalizadaEm?: Date | string | null;
}): boolean {
  return (
    !requisicao.processId &&
    !requisicao.finalizadaEm &&
    STATUS_DEVOLVIVEIS.includes(requisicao.status)
  );
}

export function validarMotivoDevolucao(
  motivo: unknown
): { ok: true; motivo: string } | { ok: false; erro: string } {
  const limpo = typeof motivo === "string" ? motivo.trim() : "";
  if (limpo.length < MOTIVO_DEVOLUCAO_MIN) {
    return {
      ok: false,
      erro: `Escreva o motivo com pelo menos ${MOTIVO_DEVOLUCAO_MIN} caracteres.`,
    };
  }
  if (limpo.length > MOTIVO_DEVOLUCAO_MAX) {
    return { ok: false, erro: `O motivo pode ter até ${MOTIVO_DEVOLUCAO_MAX} caracteres.` };
  }
  return { ok: true, motivo: limpo };
}

/** Fonte única da regra "o solicitante ainda pode editar" (API e telas do portal). */
export function clientePodeEditar(requisicao: {
  status: string;
  processId?: string | null;
  finalizadaEm?: Date | string | null;
}): boolean {
  return (
    !requisicao.processId &&
    !requisicao.finalizadaEm &&
    STATUS_EDITAVEIS_PELO_CLIENTE.includes(requisicao.status)
  );
}
