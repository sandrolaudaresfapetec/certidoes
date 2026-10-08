import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { RESPOSTA_ENCERRADA } from "@/lib/chat-tipos";
import { chaveDuplicidade } from "@/lib/duplicidade";
import {
  STATUS_ARQUIVAMENTO_IMEDIATO,
  STATUS_SOLICITACAO,
  podeDesarquivar,
  statusAposDesarquivar,
  opcaoDeArquivamento,
  statusAposRecusa,
  validarMotivoArquivamento,
} from "@/lib/solicitacao-estados";

/**
 * Arquivamento da requisição (#PEND-29). Todo efeito é uma transição condicional (só vale se
 * a requisição ainda está no estado esperado) feita na mesma transação das mensagens do chat:
 * dois cliques, duas abas ou o agendador da duplicidade correndo junto nunca arquivam duas
 * vezes nem passam por cima de uma decisão da DDD.
 */

export type Tx = Prisma.TransactionClient;

/** A situação da requisição mudou entre a leitura e a gravação: desfaz a transação. */
export class Conflito extends Error {}

/** Grava um evento de sistema no chat, uma vez por `chave`. */
export async function eventoNaTransacao(
  tx: Tx,
  solicitacaoId: string,
  chave: string,
  texto: string
): Promise<void> {
  const ja = await tx.mensagemSolicitacao.findFirst({ where: { solicitacaoId, chave }, select: { id: true } });
  if (ja) return;
  await tx.mensagemSolicitacao.create({
    data: { solicitacaoId, autorTipo: "SISTEMA", autorNome: "Sistema", tipo: "EVENTO", texto, chave },
  });
}

async function haPerguntaAberta(tx: Tx, solicitacaoId: string): Promise<boolean> {
  return (
    (await tx.mensagemSolicitacao.count({
      where: { solicitacaoId, tipo: "PERGUNTA", respondidaEm: null, chave: { startsWith: "DUP:" } },
    })) > 0
  );
}

/** Sem pergunta de duplicidade aberta, a requisição volta para a fila da DDD. */
export async function devolverAFilaSeLivre(tx: Tx, solicitacaoId: string): Promise<void> {
  if (await haPerguntaAberta(tx, solicitacaoId)) return;
  await tx.solicitacao.updateMany({
    where: { id: solicitacaoId, status: STATUS_SOLICITACAO.AGUARDANDO_CLIENTE },
    data: { status: STATUS_SOLICITACAO.PENDENTE },
  });
}

/**
 * Arquiva a requisição de forma condicional (`condicao` acrescenta exigências, como "ainda
 * não analisada"). Sem `permitirProcesso`, só arquiva requisição sem processo. `motivo`
 * `undefined` mantém o motivo já gravado. As perguntas de duplicidade que dependiam dela, abertas nela mesma ou em
 * outras requisições, são encerradas para ninguém ficar esperando à toa.
 */
export async function arquivarNaTransacao(
  tx: Tx,
  alvo: { id: string; protocolo: string },
  motivo: string | null | undefined,
  deStatus: readonly string[],
  condicao: Prisma.SolicitacaoWhereInput = {},
  permitirProcesso = false
): Promise<void> {
  // Guarda de onde veio, para a DDD poder desarquivar. No aceite de um pedido o status lido é
  // `ARQUIVAMENTO_SOLICITADO` e o de antes do pedido já está gravado: não se sobrescreve.
  const atual = await tx.solicitacao.findUnique({ where: { id: alvo.id }, select: { status: true } });
  if (!atual || !deStatus.includes(atual.status)) throw new Conflito();
  const r = await tx.solicitacao.updateMany({
    where: {
      ...condicao,
      id: alvo.id,
      ...(permitirProcesso ? {} : { processId: null }),
      status: atual.status,
    },
    data: {
      status: STATUS_SOLICITACAO.ARQUIVADA,
      arquivadaEm: new Date(),
      arquivamentoMotivo: motivo,
      arquivamentoStatusAnterior:
        atual.status === STATUS_SOLICITACAO.ARQUIVAMENTO_SOLICITADO ? undefined : atual.status,
    },
  });
  if (r.count === 0) throw new Conflito();
  await encerrarPerguntasDe(tx, alvo);
}

async function encerrarPerguntasDe(tx: Tx, alvo: { id: string; protocolo: string }): Promise<void> {
  const agora = new Date();
  await tx.mensagemSolicitacao.updateMany({
    where: { solicitacaoId: alvo.id, tipo: "PERGUNTA", respondidaEm: null, chave: { startsWith: "DUP:" } },
    data: { respostaOpcao: RESPOSTA_ENCERRADA, respondidaEm: agora },
  });
  const dependentes = await tx.mensagemSolicitacao.findMany({
    where: { chave: chaveDuplicidade("S3", alvo.id), respondidaEm: null },
    select: { id: true, solicitacaoId: true },
  });
  for (const d of dependentes) {
    await tx.mensagemSolicitacao.updateMany({
      where: { id: d.id, respondidaEm: null },
      data: { respostaOpcao: RESPOSTA_ENCERRADA, respondidaEm: agora },
    });
    await eventoNaTransacao(
      tx,
      d.solicitacaoId,
      `DUP-FIM:${alvo.id}`,
      `A requisição ${alvo.protocolo} foi arquivada, então esta pergunta foi encerrada. A requisição segue para a fila.`
    );
    await devolverAFilaSeLivre(tx, d.solicitacaoId);
  }
}

export type ResultadoArquivamento =
  | { ok: true; resultado: "ARQUIVADA" | "SOLICITADO" }
  | { ok: false; erro: string; status: 400 | 404 | 409 };

const CONFLITO = {
  ok: false,
  erro: "A situação da requisição mudou agora há pouco. Atualize a página e confira.",
  status: 409,
} as const;

/**
 * O solicitante pede o arquivamento da própria requisição. Imediato (sem custo) quando ainda
 * não foi analisada e não tem processo; senão vira pedido à DDD (`ARQUIVAMENTO_SOLICITADO`).
 */
export async function solicitarArquivamento(dados: {
  id: string;
  solicitanteId: string;
  motivo: unknown;
  /**
   * O que a tela mostrou ao solicitante (`IMEDIATO` ou `VIA_DDD`). Se a situação mudou desde
   * então (ex.: a análise de duplicidade rodou), recusa para ele reler o aviso, em vez de
   * arquivar de um jeito diferente do que foi prometido.
   */
  tipoEsperado?: unknown;
}): Promise<ResultadoArquivamento> {
  const r = await prisma.solicitacao.findFirst({
    where: { id: dados.id, solicitanteId: dados.solicitanteId },
    select: {
      id: true,
      protocolo: true,
      status: true,
      processId: true,
      analiseDuplicidadeEm: true,
      finalizadaEm: true,
    },
  });
  if (!r) return { ok: false, erro: "Requisição não encontrada.", status: 404 };

  const opcao = opcaoDeArquivamento(r);
  if (opcao.tipo === "NAO") return { ok: false, erro: opcao.motivo, status: 409 };

  if (
    (dados.tipoEsperado === "IMEDIATO" || dados.tipoEsperado === "VIA_DDD") &&
    dados.tipoEsperado !== opcao.tipo
  ) {
    return {
      ok: false,
      erro:
        opcao.tipo === "VIA_DDD"
          ? "A requisição acabou de ser analisada: agora o pedido precisa ir para a DDD. Confira o aviso e envie de novo."
          : "A situação da requisição mudou. Confira o aviso e tente de novo.",
      status: 409,
    };
  }

  const motivo = validarMotivoArquivamento(dados.motivo, opcao.tipo === "VIA_DDD");
  if (!motivo.ok) return { ok: false, erro: motivo.erro, status: 400 };

  try {
    if (opcao.tipo === "IMEDIATO") {
      await prisma.$transaction(async (tx) => {
        await arquivarNaTransacao(tx, r, motivo.motivo, STATUS_ARQUIVAMENTO_IMEDIATO, {
          solicitanteId: dados.solicitanteId,
          analiseDuplicidadeEm: null,
        });
        await eventoNaTransacao(
          tx,
          r.id,
          "ARQ-FIM",
          "Requisição arquivada a pedido do solicitante, sem custo."
        );
      });
      return { ok: true, resultado: "ARQUIVADA" };
    }

    const agora = new Date();
    await prisma.$transaction(async (tx) => {
      const g = await tx.solicitacao.updateMany({
        where: {
          id: r.id,
          solicitanteId: dados.solicitanteId,
          status: r.status, // o mesmo que foi lido: se mudou, não vale
          finalizadaEm: null,
        },
        data: {
          status: STATUS_SOLICITACAO.ARQUIVAMENTO_SOLICITADO,
          arquivamentoSolicitadoEm: agora,
          arquivamentoMotivo: motivo.motivo,
          arquivamentoStatusAnterior: r.status,
        },
      });
      if (g.count === 0) throw new Conflito();
      await eventoNaTransacao(
        tx,
        r.id,
        `ARQ-SOL:${agora.getTime()}`,
        `O solicitante pediu o arquivamento desta requisição.
Motivo: ${motivo.motivo}
Aguardando a decisão da DDD.`
      );
    });
    return { ok: true, resultado: "SOLICITADO" };
  } catch (e) {
    if (e instanceof Conflito) return CONFLITO;
    throw e;
  }
}

/**
 * A DDD aceita (arquiva) ou recusa o pedido. Recusar exige justificativa, enviada ao
 * solicitante no chat, e devolve a requisição ao status de antes do pedido. Aceitar NÃO
 * cancela o processo, se houver (decisão do time; #PEND-54).
 */
export async function decidirArquivamento(dados: {
  id: string;
  usuario: { id: string; name: string };
  aceitar: boolean;
  justificativa: unknown;
}): Promise<ResultadoArquivamento> {
  const r = await prisma.solicitacao.findUnique({
    where: { id: dados.id },
    select: { id: true, protocolo: true, status: true, processId: true, arquivamentoStatusAnterior: true },
  });
  if (!r) return { ok: false, erro: "Requisição não encontrada.", status: 404 };
  if (r.status !== STATUS_SOLICITACAO.ARQUIVAMENTO_SOLICITADO) {
    return { ok: false, erro: "Esta requisição não tem pedido de arquivamento em aberto.", status: 409 };
  }

  const justificativa = validarMotivoArquivamento(dados.justificativa, !dados.aceitar, "justificativa");
  if (!justificativa.ok) return { ok: false, erro: justificativa.erro, status: 400 };

  const autor = {
    solicitacaoId: r.id,
    autorTipo: "ATENDIMENTO",
    autorUserId: dados.usuario.id,
    autorNome: dados.usuario.name,
    tipo: "TEXTO",
  };

  try {
    await prisma.$transaction(async (tx) => {
      if (dados.aceitar) {
        // O motivo do pedido do solicitante fica gravado em `arquivamentoMotivo` (não é sobrescrito).
        await arquivarNaTransacao(tx, r, undefined, [STATUS_SOLICITACAO.ARQUIVAMENTO_SOLICITADO], {}, true);
        await tx.mensagemSolicitacao.create({
          data: {
            ...autor,
            texto: justificativa.motivo
              ? `Arquivamento aceito. A requisição foi arquivada. ${justificativa.motivo}`
              : "Arquivamento aceito. A requisição foi arquivada.",
          },
        });
        return;
      }
      const g = await tx.solicitacao.updateMany({
        where: { id: r.id, status: STATUS_SOLICITACAO.ARQUIVAMENTO_SOLICITADO },
        data: {
          status: statusAposRecusa(r),
          arquivamentoSolicitadoEm: null,
          arquivamentoMotivo: null,
          arquivamentoStatusAnterior: null,
        },
      });
      if (g.count === 0) throw new Conflito();
      await tx.mensagemSolicitacao.create({
        data: { ...autor, texto: `Arquivamento recusado: ${justificativa.motivo}` },
      });
    });
    return { ok: true, resultado: dados.aceitar ? "ARQUIVADA" : "SOLICITADO" };
  } catch (e) {
    if (e instanceof Conflito) return CONFLITO;
    throw e;
  }
}

/**
 * A DDD desarquiva a requisição, com justificativa (10 a 500 caracteres, registrada no chat).
 * Ela volta ao status de antes do arquivamento e a análise de duplicidade recomeça quando o
 * destino é a fila (`PENDENTE`), para uma repetição que motivou o arquivamento aparecer de
 * novo como sobreposição. As perguntas de duplicidade encerradas ao arquivar não reabrem.
 */
export async function desarquivarRequisicao(dados: {
  id: string;
  usuario: { id: string; name: string };
  justificativa: unknown;
}): Promise<ResultadoArquivamento> {
  const r = await prisma.solicitacao.findUnique({
    where: { id: dados.id },
    select: {
      id: true,
      status: true,
      processId: true,
      congeladaEm: true,
      liberadaEm: true,
      arquivamentoStatusAnterior: true,
    },
  });
  if (!r) return { ok: false, erro: "Requisição não encontrada.", status: 404 };
  if (!podeDesarquivar(r)) {
    return { ok: false, erro: "Só uma requisição arquivada pode ser desarquivada.", status: 409 };
  }
  const justificativa = validarMotivoArquivamento(dados.justificativa, true, "justificativa");
  if (!justificativa.ok) return { ok: false, erro: justificativa.erro, status: 400 };

  const destino = statusAposDesarquivar(r);
  try {
    await prisma.$transaction(async (tx) => {
      const g = await tx.solicitacao.updateMany({
        where: { id: r.id, status: STATUS_SOLICITACAO.ARQUIVADA },
        data: {
          status: destino,
          arquivadaEm: null,
          arquivamentoMotivo: null,
          arquivamentoSolicitadoEm: null,
          arquivamentoStatusAnterior: null,
          ...(destino === STATUS_SOLICITACAO.PENDENTE
            ? { analiseDuplicidadeEm: null, sobreposicao: false, sobreposicaoCom: null }
            : {}),
        },
      });
      if (g.count === 0) throw new Conflito();
      await tx.mensagemSolicitacao.create({
        data: {
          solicitacaoId: r.id,
          autorTipo: "ATENDIMENTO",
          autorUserId: dados.usuario.id,
          autorNome: dados.usuario.name,
          tipo: "TEXTO",
          texto: `Requisição desarquivada pela DDD. ${justificativa.motivo}`,
        },
      });
    });
    return { ok: true, resultado: "ARQUIVADA" };
  } catch (e) {
    if (e instanceof Conflito) return CONFLITO;
    throw e;
  }
}
