import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAtendimentoApi } from "@/lib/auth";
import { criarMensagem, validarTextoMensagem } from "@/lib/chat";
import { STATUS_SOLICITACAO, podeLiberar } from "@/lib/solicitacao-estados";

/**
 * POST /api/requisicoes/[id]/liberar  { mensagem? }  (ADMIN e SDTC, a "DDD")
 * Libera o preenchimento de um pedido congelado por ter 13 ou mais polígonos (#PEND-31):
 * volta a ser rascunho do solicitante, que continua e envia. A mensagem opcional vai ao chat.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessao = await exigirAtendimentoApi();
  if ("erro" in sessao) return sessao.erro;

  const requisicao = await prisma.solicitacao.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!requisicao) {
    return NextResponse.json({ error: "Requisição não encontrada." }, { status: 404 });
  }
  if (!podeLiberar(requisicao)) {
    return NextResponse.json(
      { error: "Só um pedido congelado, aguardando liberação, pode ser liberado." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  let nota = "";
  if (typeof body.mensagem === "string" && body.mensagem.trim()) {
    const valida = validarTextoMensagem(body.mensagem);
    if (!valida.ok) return NextResponse.json({ error: valida.erro }, { status: 400 });
    nota = valida.texto;
  }

  const r = await prisma.solicitacao.updateMany({
    where: { id, status: STATUS_SOLICITACAO.AGUARDANDO_LIBERACAO },
    data: { status: STATUS_SOLICITACAO.RASCUNHO, liberadaEm: new Date() },
  });
  if (r.count === 0) {
    return NextResponse.json(
      { error: "Este pedido acabou de mudar de situação e não pode mais ser liberado." },
      { status: 409 }
    );
  }

  await criarMensagem({
    solicitacaoId: id,
    autorTipo: "ATENDIMENTO",
    autorNome: sessao.usuario.name,
    autorUserId: sessao.usuario.id,
    texto:
      "A DDD liberou o seu pedido. Você já pode continuar o preenchimento e enviar a solicitação." +
      (nota ? `\n\n${nota}` : ""),
  });

  const atualizada = await prisma.solicitacao.findUniqueOrThrow({ where: { id } });
  return NextResponse.json(atualizada);
}
