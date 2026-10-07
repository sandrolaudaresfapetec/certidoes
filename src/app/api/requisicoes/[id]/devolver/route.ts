import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAtendimentoApi } from "@/lib/auth";
import { criarMensagem } from "@/lib/chat";
import {
  STATUS_DEVOLVIVEIS,
  STATUS_SOLICITACAO,
  podeDevolver,
  validarMotivoDevolucao,
} from "@/lib/solicitacao-estados";

/**
 * POST /api/requisicoes/[id]/devolver  { motivo }  (ADMIN e SDTC, a "DDD")
 * Devolve a requisição ao solicitante para correção: grava o motivo, muda o status
 * para DEVOLVIDA (única situação em que o portal deixa editar) e avisa pelo chat.
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
    select: { id: true, status: true, processId: true, finalizadaEm: true },
  });
  if (!requisicao) {
    return NextResponse.json({ error: "Requisição não encontrada." }, { status: 404 });
  }
  if (!podeDevolver(requisicao)) {
    return NextResponse.json(
      {
        error:
          "Esta requisição não pode ser devolvida: só se devolve requisição pendente, sem processo aberto e sem finalização.",
      },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const motivo = validarMotivoDevolucao(body.motivo);
  if (!motivo.ok) return NextResponse.json({ error: motivo.erro }, { status: 400 });

  // Transição condicional: duas devoluções ao mesmo tempo (ou uma depois de abrir o
  // processo) só deixam passar a primeira.
  const r = await prisma.solicitacao.updateMany({
    where: {
      id,
      status: { in: [...STATUS_DEVOLVIVEIS] },
      processId: null,
      finalizadaEm: null,
    },
    data: {
      status: STATUS_SOLICITACAO.DEVOLVIDA,
      devolucaoMotivo: motivo.motivo,
      devolvidaEm: new Date(),
    },
  });
  if (r.count === 0) {
    return NextResponse.json(
      { error: "Esta requisição acabou de mudar de situação e não pode mais ser devolvida." },
      { status: 409 }
    );
  }

  await criarMensagem({
    solicitacaoId: id,
    autorTipo: "ATENDIMENTO",
    autorNome: sessao.usuario.name,
    autorUserId: sessao.usuario.id,
    texto: `Sua requisição foi devolvida para correção.\n\nMotivo: ${motivo.motivo}`,
  });

  const atualizada = await prisma.solicitacao.findUniqueOrThrow({ where: { id } });
  return NextResponse.json(atualizada);
}
