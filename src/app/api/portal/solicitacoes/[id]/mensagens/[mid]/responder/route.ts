import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSolicitanteApi } from "@/lib/portal-auth";
import { chatAceitaMensagens, chatVisivel, responderPergunta } from "@/lib/chat";
import { lerChaveDuplicidade } from "@/lib/duplicidade";
import { responderDuplicidade } from "@/lib/duplicidade-respostas";

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
    select: { id: true, status: true, congeladaEm: true },
  });
  if (!requisicao || !chatVisivel(requisicao.status, requisicao.congeladaEm)) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (!chatAceitaMensagens(requisicao.status, requisicao.congeladaEm)) {
    return NextResponse.json(
      { error: "Esta solicitação foi arquivada e não aceita respostas." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const dados = {
    solicitacaoId: id,
    mensagemId: mid,
    opcaoId: typeof body.opcao === "string" ? body.opcao : "",
  };
  // Perguntas de duplicidade (#PEND-30) têm efeito sobre a requisição: resposta e efeito
  // acontecem na mesma transação.
  const pergunta = await prisma.mensagemSolicitacao.findFirst({
    where: { id: mid, solicitacaoId: id },
    select: { chave: true },
  });
  const resultado = lerChaveDuplicidade(pergunta?.chave)
    ? await responderDuplicidade(dados)
    : await responderPergunta(dados);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.erro }, { status: resultado.status });
  }
  return NextResponse.json({ mensagem: resultado.mensagem });
}
