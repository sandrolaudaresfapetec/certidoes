import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSolicitanteApi } from "@/lib/portal-auth";
import { mensagemDeSistema } from "@/lib/chat";
import { LIMITE_POLIGONOS_ENVIO } from "@/lib/cjt-formulario";
import { STATUS_SOLICITACAO, podeCongelar } from "@/lib/solicitacao-estados";

/**
 * POST /api/portal/solicitacoes/[id]/congelar
 * Encaminha à DDD um rascunho com 13 ou mais polígonos (#PEND-31): o pedido fica congelado,
 * com o chat aberto, até a DDD liberar. A quantidade vem do rascunho já guardado.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessao = await exigirSolicitanteApi();
  if ("erro" in sessao) return sessao.erro;

  const requisicao = await prisma.solicitacao.findFirst({
    where: { id, solicitanteId: sessao.solicitante.id },
    select: { id: true, status: true, cjtQtdPoligonos: true },
  });
  if (!requisicao) {
    return NextResponse.json({ error: "Requisição não encontrada." }, { status: 404 });
  }
  if (requisicao.status !== STATUS_SOLICITACAO.RASCUNHO) {
    return NextResponse.json(
      { error: "Só um rascunho ainda não enviado pode ser encaminhado à DDD." },
      { status: 409 }
    );
  }
  if (!podeCongelar(requisicao)) {
    return NextResponse.json(
      {
        error: `Só pedidos com ${LIMITE_POLIGONOS_ENVIO + 1} ou mais polígonos precisam da análise da DDD.`,
      },
      { status: 400 }
    );
  }

  // Transição condicional: duas chamadas ao mesmo tempo congelam uma vez só.
  const r = await prisma.solicitacao.updateMany({
    where: { id, status: STATUS_SOLICITACAO.RASCUNHO },
    data: { status: STATUS_SOLICITACAO.AGUARDANDO_LIBERACAO, congeladaEm: new Date() },
  });
  if (r.count === 0) {
    return NextResponse.json(
      { error: "Esta requisição acabou de mudar de situação." },
      { status: 409 }
    );
  }

  await mensagemDeSistema({
    solicitacaoId: id,
    chave: "CONGELADA",
    tipo: "EVENTO",
    texto:
      `Seu pedido tem ${requisicao.cjtQtdPoligonos} polígonos. Pedidos com ${LIMITE_POLIGONOS_ENVIO + 1} ou mais ` +
      "polígonos exigem análise da DDD antes de continuar. Use esta conversa para enviar as " +
      "informações que a equipe solicitar. Depois da liberação você poderá continuar o " +
      "preenchimento e enviar a solicitação.",
  });

  const atualizada = await prisma.solicitacao.findUniqueOrThrow({ where: { id } });
  return NextResponse.json(atualizada);
}
