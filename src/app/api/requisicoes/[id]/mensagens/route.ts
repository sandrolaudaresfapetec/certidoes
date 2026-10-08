import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAtendimentoApi } from "@/lib/auth";
import {
  chatAceitaMensagens,
  chatVisivel,
  criarMensagem,
  listarMensagens,
  marcarLido,
  validarTextoMensagem,
} from "@/lib/chat";

async function requisicaoDoChat(id: string) {
  const requisicao = await prisma.solicitacao.findUnique({
    where: { id },
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
 * GET /api/requisicoes/[id]/mensagens (ADMIN e SDTC)
 * Mensagens da conversa; a leitura do atendimento é marcada.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessao = await exigirAtendimentoApi();
  if ("erro" in sessao) return sessao.erro;

  const r = await requisicaoDoChat(id);
  if ("erro" in r) return r.erro;

  const mensagens = await listarMensagens(id);
  await marcarLido(id, "ATENDIMENTO");
  return NextResponse.json({ mensagens, aceita: chatAceitaMensagens(r.requisicao.status, r.requisicao.congeladaEm) });
}

/** POST /api/requisicoes/[id]/mensagens — o atendimento escreve para o solicitante. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessao = await exigirAtendimentoApi();
  if ("erro" in sessao) return sessao.erro;

  const r = await requisicaoDoChat(id);
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
    autorTipo: "ATENDIMENTO",
    autorNome: sessao.usuario.name,
    autorUserId: sessao.usuario.id,
    texto: texto.texto,
  });
  return NextResponse.json({ mensagem }, { status: 201 });
}
