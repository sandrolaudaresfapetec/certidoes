import { NextRequest, NextResponse } from "next/server";
import { exigirAtendimentoApi } from "@/lib/auth";
import { decidirArquivamento } from "@/lib/arquivamento-servidor";

/**
 * POST /api/requisicoes/[id]/arquivamento  { aceitar, justificativa }  (ADMIN e SDTC, a "DDD")
 * Decide o pedido de arquivamento do solicitante. Aceitar arquiva (justificativa opcional);
 * recusar exige justificativa (enviada ao solicitante no chat) e devolve a requisição ao
 * status de antes do pedido. Aceitar não cancela o processo aberto (#PEND-54).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessao = await exigirAtendimentoApi();
  if ("erro" in sessao) return sessao.erro;

  const body = await request.json().catch(() => ({}));
  if (typeof body.aceitar !== "boolean") {
    return NextResponse.json({ error: "Informe se aceita ou recusa o arquivamento." }, { status: 400 });
  }
  const r = await decidirArquivamento({
    id,
    usuario: { id: sessao.usuario.id, name: sessao.usuario.name },
    aceitar: body.aceitar,
    justificativa: body.justificativa,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status });
  return NextResponse.json({ resultado: r.resultado });
}
