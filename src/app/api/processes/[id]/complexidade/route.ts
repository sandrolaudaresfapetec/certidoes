import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioApi } from "@/lib/auth";
import { lerNivel } from "@/lib/complexidade";

/**
 * PUT /api/processes/[id]/complexidade  { nivel }  (técnico responsável ou ADMIN)
 * Confirma (ou muda) o nível de complexidade de 1 a 9 sugerido pelo corte de divisas
 * (#PEND-32). `nivel` vazio ou nulo retira o nível: o solicitante deixa de vê-lo. A mesma
 * regra do corte vale aqui: só o técnico responsável pela análise do processo, ou ADMIN.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessao = await exigirUsuarioApi();
  if ("erro" in sessao) return sessao.erro;

  const { id } = await params;
  const processo = await prisma.process.findUnique({
    where: { id },
    select: { id: true, tecnicoRespId: true },
  });
  if (!processo) return NextResponse.json({ error: "Processo não encontrado." }, { status: 404 });
  if (sessao.usuario.role !== "ADMIN" && processo.tecnicoRespId !== sessao.usuario.id) {
    return NextResponse.json(
      { error: "Somente o técnico responsável pela análise deste processo (ou ADMIN) confirma o nível." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const nivel = lerNivel(body.nivel);
  if (!nivel.ok) return NextResponse.json({ error: nivel.erro }, { status: 400 });

  await prisma.process.update({
    where: { id },
    data: { nivelComplexidade: nivel.nivel, nivelComplexidadeEm: nivel.nivel === null ? null : new Date() },
  });
  return NextResponse.json({ nivel: nivel.nivel });
}
