import { NextRequest, NextResponse } from "next/server";
import { exigirAtendimentoApi } from "@/lib/auth";
import { desarquivarRequisicao } from "@/lib/arquivamento-servidor";

/**
 * POST /api/requisicoes/[id]/desarquivar  { justificativa }  (ADMIN e SDTC, a "DDD")
 * Desfaz o arquivamento: a requisição volta ao status de antes, com a justificativa (10 a 500
 * caracteres) registrada no chat. Só vale para requisição arquivada.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessao = await exigirAtendimentoApi();
  if ("erro" in sessao) return sessao.erro;

  const body = await request.json().catch(() => ({}));
  const r = await desarquivarRequisicao({
    id,
    usuario: { id: sessao.usuario.id, name: sessao.usuario.name },
    justificativa: body.justificativa,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status });
  return NextResponse.json({ ok: true });
}
