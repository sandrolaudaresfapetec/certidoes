import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPerfilAtivo, podeAtender } from "@/lib/perfil-ativo";

const STATUS_VALIDOS = ["PENDENTE", "PAGO", "ISENTO"];

/**
 * POST /api/requisicoes/[id]/pagamento — Finalização e Pagamento (Atendimento).
 * Registra a situação do pagamento e, quando finalizar=true, encerra a
 * requisição para o cliente.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const perfil = await getPerfilAtivo();
  if (!podeAtender(perfil)) {
    return NextResponse.json(
      { error: "Perfil ativo não pertence ao Atendimento." },
      { status: 403 }
    );
  }

  const requisicao = await prisma.solicitacao.findUnique({ where: { id } });
  if (!requisicao) {
    return NextResponse.json({ error: "Requisição não encontrada." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const pagamentoStatus = (body.pagamentoStatus ?? "").toString();
  if (!STATUS_VALIDOS.includes(pagamentoStatus)) {
    return NextResponse.json({ error: "Situação de pagamento inválida." }, { status: 400 });
  }

  const valorBruto = body.pagamentoValor;
  const pagamentoValor =
    valorBruto === "" || valorBruto == null ? null : Number(valorBruto);
  if (pagamentoValor != null && (!Number.isFinite(pagamentoValor) || pagamentoValor < 0)) {
    return NextResponse.json({ error: "Valor inválido." }, { status: 400 });
  }

  const finalizar = body.finalizar === true;
  if (finalizar && pagamentoStatus === "PENDENTE") {
    return NextResponse.json(
      { error: "Não é possível finalizar com pagamento pendente." },
      { status: 400 }
    );
  }

  const atualizada = await prisma.solicitacao.update({
    where: { id: requisicao.id },
    data: {
      pagamentoStatus,
      pagamentoValor,
      pagamentoObs: (body.pagamentoObs ?? "").toString().trim() || null,
      pagamentoEm: pagamentoStatus === "PENDENTE" ? null : new Date(),
      finalizadaEm: finalizar ? new Date() : requisicao.finalizadaEm,
      status: finalizar ? "CONCLUIDA" : requisicao.status,
    },
  });

  return NextResponse.json(atualizada);
}
