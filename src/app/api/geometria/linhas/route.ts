import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioApi } from "@/lib/auth";

/** GET /api/geometria/linhas — lista as linhas de divisa validadas. */
export async function GET() {
  const sessao = await exigirUsuarioApi();
  if ("erro" in sessao) return sessao.erro;

  const linhas = await prisma.linhaDivisa.findMany({ orderBy: { codigo: "asc" } });
  return NextResponse.json(
    linhas.map((l) => ({ ...l, municipios: JSON.parse(l.municipios), geometria: JSON.parse(l.geometria) }))
  );
}

/** POST /api/geometria/linhas — cadastra linha de divisa validada (base PostGIS). */
export async function POST(request: NextRequest) {
  const sessao = await exigirUsuarioApi();
  if ("erro" in sessao) return sessao.erro;

  const body = await request.json();
  if (!body.codigo || !body.geometria) {
    return NextResponse.json({ error: "codigo e geometria sao obrigatorios" }, { status: 400 });
  }
  const linha = await prisma.linhaDivisa.create({
    data: {
      codigo: body.codigo,
      descricao: body.descricao ?? null,
      tipo: body.tipo ?? "DIVISA_MUNICIPAL",
      geometria: JSON.stringify(body.geometria),
      bancoOrigem: body.bancoOrigem ?? "manual",
      dataValidacao: body.dataValidacao ? new Date(body.dataValidacao) : new Date(),
      municipios: JSON.stringify(body.municipios ?? []),
    },
  });
  return NextResponse.json(linha, { status: 201 });
}
