import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSolicitanteApi } from "@/lib/portal-auth";
import { chatAceitaMensagens, chatVisivel, responderPergunta } from "@/lib/chat";

/**
 * POST /api/portal/solicitacoes/[id]/mensagens/[mid]/responder  { opcao }
 * O solicitante responde uma pergunta do sistema escolhendo uma das opções. Só a primeira
 * resposta vale (a gravação é condicional).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const { id, mid } = await params;
  const sessao = await exigirSolicitanteApi();
  if ("erro" in sessao) return sessao.erro;

  const requisicao = await prisma.solicitacao.findFirst({
    where: { id, solicitanteId: sessao.solicitante.id },
    select: { id: true, status: true },
  });
  if (!requisicao || !chatVisivel(requisicao.status)) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (!chatAceitaMensagens(requisicao.status)) {
    return NextResponse.json(
      { error: "Esta solicitação foi arquivada e não aceita respostas." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const resultado = await responderPergunta({
    solicitacaoId: id,
    mensagemId: mid,
    opcaoId: typeof body.opcao === "string" ? body.opcao : "",
  });
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.erro }, { status: resultado.status });
  }
  return NextResponse.json({ mensagem: resultado.mensagem });
}
