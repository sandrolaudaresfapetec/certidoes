import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdminApi } from "@/lib/auth";

/**
 * PATCH /api/geometria/linhas/[id]  { finalizada: boolean }  (só ADMIN)
 * Marca ou desmarca a divisa como finalizada. Ela baixa o nível de complexidade sugerido
 * pelo corte (#PEND-32). Quem preenche esse dado no dia a dia está em aberto (#PEND-55).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessao = await exigirAdminApi();
  if ("erro" in sessao) return sessao.erro;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (typeof body.finalizada !== "boolean") {
    return NextResponse.json({ error: "Informe finalizada como verdadeiro ou falso." }, { status: 400 });
  }
  const r = await prisma.linhaDivisa.updateMany({ where: { id }, data: { finalizada: body.finalizada } });
  if (r.count === 0) return NextResponse.json({ error: "Linha de divisa não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true, finalizada: body.finalizada });
}
