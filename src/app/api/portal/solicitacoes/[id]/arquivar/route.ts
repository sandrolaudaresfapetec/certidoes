import { NextRequest, NextResponse } from "next/server";
import { exigirSolicitanteApi } from "@/lib/portal-auth";
import { solicitarArquivamento } from "@/lib/arquivamento-servidor";

/**
 * POST /api/portal/solicitacoes/[id]/arquivar  { motivo, tipo? }
 * O solicitante dono pede o arquivamento da requisição. Ainda não analisada e sem processo:
 * arquiva na hora, sem custo (`resultado: "ARQUIVADA"`, motivo opcional). Senão vira pedido à
 * DDD (`resultado: "SOLICITADO"`, motivo de 10 a 500 caracteres). `tipo` é o que a tela mostrou
 * (`IMEDIATO` ou `VIA_DDD`): se a situação mudou desde então, responde 409.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessao = await exigirSolicitanteApi();
  if ("erro" in sessao) return sessao.erro;

  const body = await request.json().catch(() => ({}));
  const r = await solicitarArquivamento({
    id,
    solicitanteId: sessao.solicitante.id,
    motivo: body.motivo,
    tipoEsperado: body.tipo,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status });
  return NextResponse.json({ resultado: r.resultado });
}
