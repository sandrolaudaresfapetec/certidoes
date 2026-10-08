import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAtendimentoApi } from "@/lib/auth";
import { mensagemDeSistema } from "@/lib/chat";
import { bloqueioAcaoAtendimento } from "@/lib/solicitacao-estados";

/**
 * POST /api/requisicoes/[id]/documentos-conferidos  (ADMIN e SDTC, a "DDD")
 * Marca a checagem de documentos como feita: primeira subetapa do Setor de Atendimentos no
 * acompanhamento do solicitante (#PEND-27). Só vale uma vez (gravação condicional) e só para
 * requisição já analisada pela duplicidade e fora de qualquer pausa. Avisa no chat.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessao = await exigirAtendimentoApi();
  if ("erro" in sessao) return sessao.erro;

  const r = await prisma.solicitacao.findUnique({
    where: { id },
    select: { id: true, status: true, analiseDuplicidadeEm: true, docsConferidosEm: true },
  });
  if (!r) return NextResponse.json({ error: "Requisição não encontrada." }, { status: 404 });
  const bloqueio = bloqueioAcaoAtendimento(r.status);
  if (bloqueio) return NextResponse.json({ error: bloqueio }, { status: 409 });
  if (!r.analiseDuplicidadeEm) {
    return NextResponse.json(
      { error: "Esta requisição ainda aguarda a análise de duplicidade (12:00 e 00:00)." },
      { status: 409 }
    );
  }
  if (r.docsConferidosEm) {
    return NextResponse.json({ error: "Os documentos desta requisição já foram conferidos." }, { status: 409 });
  }

  // Condicional: duas conferências simultâneas, ou uma depois de arquivar, só deixam passar uma.
  const g = await prisma.solicitacao.updateMany({
    where: { id, docsConferidosEm: null, status: r.status },
    data: { docsConferidosEm: new Date() },
  });
  if (g.count === 0) {
    return NextResponse.json(
      { error: "A situação da requisição mudou agora há pouco. Atualize a página e confira." },
      { status: 409 }
    );
  }
  await mensagemDeSistema({
    solicitacaoId: id,
    texto: "Os documentos da requisição foram conferidos pela equipe.",
    chave: "DOCS-OK",
    tipo: "EVENTO",
  });
  return NextResponse.json({ ok: true });
}
