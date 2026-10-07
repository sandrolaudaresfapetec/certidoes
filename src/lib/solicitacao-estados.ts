import { LIMITE_POLIGONOS_ENVIO } from "./cjt-formulario";

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
 * existe justamente para o cliente corrigir, e o rascunho ainda é só dele.
 */
export const STATUS_EDITAVEIS_PELO_CLIENTE: readonly string[] = [
  STATUS_SOLICITACAO.RASCUNHO,
  STATUS_SOLICITACAO.DEVOLVIDA,
];

/**
 * Rascunho é só do solicitante: o atendimento não o vê em lista nem em tela. Exceção: o
 * rascunho que já foi congelado (13+ polígonos) tem conversa com a DDD e fica visível.
 */
export function visivelAoAtendimento(
  status: string,
  congeladaEm?: Date | string | null
): boolean {
  return status !== STATUS_SOLICITACAO.RASCUNHO || Boolean(congeladaEm);
}

/** Situações em que a requisição não está na fila de abertura de processo da DDD. */
export const STATUS_FORA_DA_FILA: readonly string[] = [
  STATUS_SOLICITACAO.RASCUNHO,
  STATUS_SOLICITACAO.AGUARDANDO_LIBERACAO,
  STATUS_SOLICITACAO.AGUARDANDO_CLIENTE,
  STATUS_SOLICITACAO.DEVOLVIDA,
  STATUS_SOLICITACAO.ARQUIVAMENTO_SOLICITADO,
  STATUS_SOLICITACAO.ARQUIVADA,
];

/**
 * Só um rascunho com mais de 12 polígonos vai para a DDD (#PEND-31). A quantidade vem do
 * rascunho guardado, não do que a tela mandou.
 */
export function podeCongelar(requisicao: {
  status: string;
  cjtQtdPoligonos?: number | null;
}): boolean {
  return (
    requisicao.status === STATUS_SOLICITACAO.RASCUNHO &&
    (requisicao.cjtQtdPoligonos ?? 0) > LIMITE_POLIGONOS_ENVIO
  );
}

export function podeLiberar(requisicao: { status: string }): boolean {
  return requisicao.status === STATUS_SOLICITACAO.AGUARDANDO_LIBERACAO;
}

/**
 * Situações em que a DDD não abre processo nem registra pagamento: a requisição ainda
 * não está na fila (rascunho, congelada, aguardando resposta) ou já saiu dela.
 * Devolve a mensagem de recusa, ou null quando pode agir.
 */
export function bloqueioAcaoAtendimento(status: string): string | null {
  switch (status) {
    case STATUS_SOLICITACAO.DEVOLVIDA:
      return "Requisição devolvida: aguarde o reenvio do solicitante.";
    case STATUS_SOLICITACAO.RASCUNHO:
      return "Esta requisição ainda não foi enviada pelo solicitante.";
    case STATUS_SOLICITACAO.AGUARDANDO_LIBERACAO:
      return "Esta requisição está congelada, aguardando liberação.";
    case STATUS_SOLICITACAO.AGUARDANDO_CLIENTE:
      return "Aguardando a resposta do solicitante a uma pergunta do chat.";
    case STATUS_SOLICITACAO.ARQUIVAMENTO_SOLICITADO:
    case STATUS_SOLICITACAO.ARQUIVADA:
      return "Esta requisição foi arquivada ou está com arquivamento solicitado.";
    default:
      return null;
  }
}

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
