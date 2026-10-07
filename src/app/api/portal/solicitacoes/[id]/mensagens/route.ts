import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSolicitanteApi } from "@/lib/portal-auth";
import {
  chatAceitaMensagens,
  chatVisivel,
  criarMensagem,
  listarMensagens,
  marcarLido,
  validarTextoMensagem,
} from "@/lib/chat";

/** Requisição do próprio solicitante com o chat disponível, ou a resposta de erro. */
async function requisicaoDoChat(id: string, solicitanteId: string) {
  const requisicao = await prisma.solicitacao.findFirst({
    where: { id, solicitanteId },
    select: { id: true, status: true, congeladaEm: true },
  });
  if (!requisicao || !chatVisivel(requisicao.status, requisicao.congeladaEm)) {
    return {
      erro: NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 }),
    };
  }
  return { requisicao };
}

/**
 * GET /api/portal/solicitacoes/[id]/mensagens
 * Mensagens da conversa. Quem consulta está com a conversa aberta, então a leitura
 * é marcada (some o selo "novas" da lista).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessao = await exigirSolicitanteApi();
  if ("erro" in sessao) return sessao.erro;

  const r = await requisicaoDoChat(id, sessao.solicitante.id);
  if ("erro" in r) return r.erro;

  const mensagens = await listarMensagens(id);
  await marcarLido(id, "SOLICITANTE");
  return NextResponse.json({ mensagens, aceita: chatAceitaMensagens(r.requisicao.status, r.requisicao.congeladaEm) });
}

/** POST /api/portal/solicitacoes/[id]/mensagens — o solicitante escreve no chat. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessao = await exigirSolicitanteApi();
  if ("erro" in sessao) return sessao.erro;

  const r = await requisicaoDoChat(id, sessao.solicitante.id);
  if ("erro" in r) return r.erro;
  if (!chatAceitaMensagens(r.requisicao.status, r.requisicao.congeladaEm)) {
    return NextResponse.json(
      { error: "Esta solicitação foi arquivada e não aceita novas mensagens." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const texto = validarTextoMensagem(body.texto);
  if (!texto.ok) return NextResponse.json({ error: texto.erro }, { status: 400 });

  const mensagem = await criarMensagem({
    solicitacaoId: id,
    autorTipo: "SOLICITANTE",
    autorNome: sessao.solicitante.nome,
    texto: texto.texto,
  });
  return NextResponse.json({ mensagem }, { status: 201 });
}
