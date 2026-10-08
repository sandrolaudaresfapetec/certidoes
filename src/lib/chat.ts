import type { MensagemSolicitacao } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  contarNaoLidas,
  type AutorChat,
  type LadoChat,
  type MensagemChat,
  type OpcaoPergunta,
  type TipoMensagemChat,
} from "@/lib/chat-tipos";

export * from "@/lib/chat-tipos";

/**
 * Chat da solicitação (#PEND-25): canal único entre o solicitante e a DDD (ADMIN e SDTC).
 * Mensagens de sistema (perguntas de duplicidade, avisos) usam `chave` para nunca serem
 * gravadas duas vezes, mesmo se o processo que as gera rodar de novo.
 */

function lerOpcoes(json: string | null): OpcaoPergunta[] | null {
  if (!json) return null;
  try {
    const lista: unknown = JSON.parse(json);
    if (!Array.isArray(lista)) return null;
    return lista
      .filter((o): o is OpcaoPergunta => typeof o?.id === "string" && typeof o?.rotulo === "string")
      .map((o) => ({ id: o.id, rotulo: o.rotulo }));
  } catch {
    return null;
  }
}

export function paraMensagemChat(m: MensagemSolicitacao): MensagemChat {
  return {
    id: m.id,
    autorTipo: m.autorTipo as AutorChat,
    autorNome: m.autorNome,
    tipo: m.tipo as TipoMensagemChat,
    texto: m.texto,
    opcoes: lerOpcoes(m.opcoes),
    respostaOpcao: m.respostaOpcao,
    respondidaEm: m.respondidaEm ? m.respondidaEm.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  };
}

function violouUnicidade(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

export async function listarMensagens(solicitacaoId: string): Promise<MensagemChat[]> {
  const linhas = await prisma.mensagemSolicitacao.findMany({
    where: { solicitacaoId },
    orderBy: { createdAt: "asc" },
  });
  return linhas.map(paraMensagemChat);
}

export async function criarMensagem(dados: {
  solicitacaoId: string;
  autorTipo: AutorChat;
  autorNome: string;
  autorUserId?: string | null;
  texto: string;
  tipo?: TipoMensagemChat;
  opcoes?: OpcaoPergunta[];
  chave?: string;
}): Promise<MensagemChat> {
  const linha = await prisma.mensagemSolicitacao.create({
    data: {
      solicitacaoId: dados.solicitacaoId,
      autorTipo: dados.autorTipo,
      autorNome: dados.autorNome,
      autorUserId: dados.autorUserId ?? null,
      texto: dados.texto,
      tipo: dados.tipo ?? "TEXTO",
      opcoes: dados.opcoes ? JSON.stringify(dados.opcoes) : null,
      chave: dados.chave ?? null,
    },
  });
  return paraMensagemChat(linha);
}

/**
 * Mensagem do sistema, idempotente pela `chave`: se já existe uma com a mesma chave na
 * solicitação, devolve a existente em vez de criar outra (`criada: false`).
 */
export async function mensagemDeSistema(dados: {
  solicitacaoId: string;
  texto: string;
  chave: string;
  tipo?: TipoMensagemChat;
  opcoes?: OpcaoPergunta[];
}): Promise<{ criada: boolean; mensagem: MensagemChat }> {
  const existente = await prisma.mensagemSolicitacao.findFirst({
    where: { solicitacaoId: dados.solicitacaoId, chave: dados.chave },
  });
  if (existente) return { criada: false, mensagem: paraMensagemChat(existente) };
  try {
    const mensagem = await criarMensagem({ ...dados, autorTipo: "SISTEMA", autorNome: "Sistema" });
    return { criada: true, mensagem };
  } catch (e) {
    if (!violouUnicidade(e)) throw e;
    const ja = await prisma.mensagemSolicitacao.findFirst({
      where: { solicitacaoId: dados.solicitacaoId, chave: dados.chave },
    });
    if (!ja) throw e;
    return { criada: false, mensagem: paraMensagemChat(ja) };
  }
}

export async function marcarLido(solicitacaoId: string, lado: LadoChat): Promise<void> {
  await prisma.solicitacao.update({
    where: { id: solicitacaoId },
    data: lado === "SOLICITANTE" ? { chatLidoSolicitanteEm: new Date() } : { chatLidoAtendimentoEm: new Date() },
  });
}

export type ResultadoResposta =
  | { ok: true; mensagem: MensagemChat; opcao: OpcaoPergunta }
  | { ok: false; erro: string; status: 400 | 404 | 409 };

/**
 * Responde uma pergunta do sistema. A gravação é condicional (`respondidaEm` ainda vazio):
 * responder duas vezes, ou duas abas ao mesmo tempo, só vale a primeira.
 */
export async function responderPergunta(dados: {
  solicitacaoId: string;
  mensagemId: string;
  opcaoId: string;
}): Promise<ResultadoResposta> {
  const linha = await prisma.mensagemSolicitacao.findFirst({
    where: { id: dados.mensagemId, solicitacaoId: dados.solicitacaoId },
  });
  if (!linha || linha.tipo !== "PERGUNTA") {
    return { ok: false, erro: "Pergunta não encontrada.", status: 404 };
  }
  const opcao = lerOpcoes(linha.opcoes)?.find((o) => o.id === dados.opcaoId);
  if (!opcao) return { ok: false, erro: "Escolha uma das opções da pergunta.", status: 400 };

  const r = await prisma.mensagemSolicitacao.updateMany({
    where: { id: linha.id, respondidaEm: null },
    data: { respostaOpcao: opcao.id, respondidaEm: new Date() },
  });
  if (r.count === 0) return { ok: false, erro: "Esta pergunta já foi respondida.", status: 409 };

  const atualizada = await prisma.mensagemSolicitacao.findUniqueOrThrow({ where: { id: linha.id } });
  return { ok: true, mensagem: paraMensagemChat(atualizada), opcao };
}

/**
 * Contagem de mensagens novas por solicitação, para os selos das listas. Uma consulta só
 * para a página inteira.
 */
export async function naoLidasPorSolicitacao(
  solicitacoes: { id: string; chatLidoSolicitanteEm: Date | null; chatLidoAtendimentoEm: Date | null }[],
  lado: LadoChat
): Promise<Map<string, number>> {
  const contagem = new Map<string, number>();
  if (solicitacoes.length === 0) return contagem;
  const mensagens = await prisma.mensagemSolicitacao.findMany({
    where: {
      solicitacaoId: { in: solicitacoes.map((s) => s.id) },
      autorTipo: lado === "SOLICITANTE" ? { not: "SOLICITANTE" } : "SOLICITANTE",
    },
    select: { solicitacaoId: true, autorTipo: true, createdAt: true },
  });
  const porSolicitacao = new Map<string, { autorTipo: string; createdAt: Date }[]>();
  for (const m of mensagens) {
    const lista = porSolicitacao.get(m.solicitacaoId) ?? [];
    lista.push(m);
    porSolicitacao.set(m.solicitacaoId, lista);
  }
  for (const s of solicitacoes) {
    const lidoEm = lado === "SOLICITANTE" ? s.chatLidoSolicitanteEm : s.chatLidoAtendimentoEm;
    const n = contarNaoLidas(porSolicitacao.get(s.id) ?? [], lidoEm, lado);
    if (n > 0) contagem.set(s.id, n);
  }
  return contagem;
}
