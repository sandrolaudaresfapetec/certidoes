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

export const MOTIVO_ARQUIVAMENTO_MIN = 10;
export const MOTIVO_ARQUIVAMENTO_MAX = 500;

/**
 * O que o solicitante pode fazer para arquivar a própria requisição (#PEND-29):
 *  - `IMEDIATO`: ainda não foi analisada (a análise de duplicidade roda 12:00 e 00:00) e não
 *    tem processo; arquiva na hora e sem custo;
 *  - `VIA_DDD`: já analisada, devolvida ou com processo aberto; o pedido vai para a DDD, que
 *    aceita ou recusa (pode haver custo);
 *  - `NAO`: não há o que arquivar (rascunho, finalizada, já arquivada, pedido em aberto) ou
 *    há pergunta de duplicidade esperando resposta (ali já existe a opção de arquivar).
 */
export type OpcaoArquivamento =
  | { tipo: "IMEDIATO" }
  | { tipo: "VIA_DDD" }
  | { tipo: "NAO"; motivo: string };

/** Status em que o arquivamento imediato vale (conferido de novo na gravação). */
export const STATUS_ARQUIVAMENTO_IMEDIATO: readonly string[] = [
  STATUS_SOLICITACAO.PENDENTE,
  STATUS_SOLICITACAO.AGUARDANDO_LIBERACAO,
];

/** Status de onde o pedido segue para a DDD. */
export const STATUS_ARQUIVAMENTO_VIA_DDD: readonly string[] = [
  STATUS_SOLICITACAO.PENDENTE,
  STATUS_SOLICITACAO.EM_ANALISE,
  STATUS_SOLICITACAO.DEVOLVIDA,
];

export function opcaoDeArquivamento(requisicao: {
  status: string;
  processId?: string | null;
  analiseDuplicidadeEm?: Date | string | null;
  finalizadaEm?: Date | string | null;
}): OpcaoArquivamento {
  const { status } = requisicao;
  if (status === STATUS_SOLICITACAO.ARQUIVADA) {
    return { tipo: "NAO", motivo: "Esta requisição já está arquivada." };
  }
  if (status === STATUS_SOLICITACAO.ARQUIVAMENTO_SOLICITADO) {
    return { tipo: "NAO", motivo: "O pedido de arquivamento já foi enviado e aguarda a DDD." };
  }
  if (status === STATUS_SOLICITACAO.RASCUNHO) {
    return { tipo: "NAO", motivo: "Rascunho não é arquivado: basta não enviá-lo." };
  }
  if (
    requisicao.finalizadaEm ||
    status === STATUS_SOLICITACAO.CONCLUIDA ||
    status === STATUS_SOLICITACAO.APROVADA
  ) {
    return { tipo: "NAO", motivo: "Requisição finalizada não pode ser arquivada." };
  }
  if (status === STATUS_SOLICITACAO.AGUARDANDO_CLIENTE) {
    return { tipo: "NAO", motivo: "Responda a pergunta do chat: ela tem a opção de arquivar." };
  }
  if (
    STATUS_ARQUIVAMENTO_IMEDIATO.includes(status) &&
    !requisicao.processId &&
    !requisicao.analiseDuplicidadeEm
  ) {
    return { tipo: "IMEDIATO" };
  }
  if (STATUS_ARQUIVAMENTO_VIA_DDD.includes(status) || status === STATUS_SOLICITACAO.AGUARDANDO_LIBERACAO) {
    return { tipo: "VIA_DDD" };
  }
  return { tipo: "NAO", motivo: "Esta requisição não pode ser arquivada agora." };
}

/**
 * Motivo do arquivamento ou da recusa. Opcional só no arquivamento imediato; quando
 * informado, nunca passa do limite.
 */
export function validarMotivoArquivamento(
  motivo: unknown,
  obrigatorio: boolean,
  rotulo: string = "motivo"
): { ok: true; motivo: string | null } | { ok: false; erro: string } {
  const limpo = typeof motivo === "string" ? motivo.trim() : "";
  if (!limpo && !obrigatorio) return { ok: true, motivo: null };
  if (limpo.length < MOTIVO_ARQUIVAMENTO_MIN) {
    return { ok: false, erro: `Escreva o ${rotulo} com pelo menos ${MOTIVO_ARQUIVAMENTO_MIN} caracteres.` };
  }
  if (limpo.length > MOTIVO_ARQUIVAMENTO_MAX) {
    return { ok: false, erro: `O ${rotulo} pode ter até ${MOTIVO_ARQUIVAMENTO_MAX} caracteres.` };
  }
  return { ok: true, motivo: limpo };
}

/**
 * Para onde a requisição volta quando a DDD recusa o pedido: o status de antes do pedido
 * (guardado) ou, em registro sem ele, o que os dados indicam.
 */
/** Status para onde uma requisição arquivada pode voltar (o resto vira `PENDENTE`). */
export const STATUS_RETORNO_DESARQUIVAR: readonly string[] = [
  STATUS_SOLICITACAO.PENDENTE,
  STATUS_SOLICITACAO.EM_ANALISE,
  STATUS_SOLICITACAO.DEVOLVIDA,
  STATUS_SOLICITACAO.AGUARDANDO_LIBERACAO,
];

/** Só a requisição arquivada pode ser desarquivada (pela DDD). */
export function podeDesarquivar(requisicao: { status: string }): boolean {
  return requisicao.status === STATUS_SOLICITACAO.ARQUIVADA;
}

/**
 * Para onde a requisição volta ao ser desarquivada: o status de antes do arquivamento
 * (guardado) ou, sem ele, o que os dados indicam (processo aberto, pedido congelado). Uma
 * pergunta de duplicidade já foi encerrada ao arquivar, então não se volta a "aguardando
 * resposta": vai para a fila e a análise de duplicidade roda de novo.
 */
export function statusAposDesarquivar(requisicao: {
  arquivamentoStatusAnterior?: string | null;
  processId?: string | null;
  congeladaEm?: Date | string | null;
  liberadaEm?: Date | string | null;
}): string {
  const anterior = requisicao.arquivamentoStatusAnterior;
  if (anterior && STATUS_RETORNO_DESARQUIVAR.includes(anterior)) return anterior;
  if (requisicao.processId) return STATUS_SOLICITACAO.EM_ANALISE;
  if (requisicao.congeladaEm && !requisicao.liberadaEm) return STATUS_SOLICITACAO.AGUARDANDO_LIBERACAO;
  return STATUS_SOLICITACAO.PENDENTE;
}

export function statusAposRecusa(requisicao: {
  arquivamentoStatusAnterior?: string | null;
  processId?: string | null;
}): string {
  const anterior = requisicao.arquivamentoStatusAnterior;
  if (anterior && STATUS_ARQUIVAMENTO_VIA_DDD.includes(anterior)) return anterior;
  return requisicao.processId ? STATUS_SOLICITACAO.EM_ANALISE : STATUS_SOLICITACAO.PENDENTE;
}
