import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdminApi, exigirGeometriaApi } from "@/lib/auth";
import { garantirLinhasDemo } from "@/lib/linhas-demo";
import { TIPOS_LINHA } from "@/lib/complexidade";

/** GET /api/geometria/linhas — lista as linhas de divisa validadas. */
export async function GET() {
  const sessao = await exigirGeometriaApi();
  if ("erro" in sessao) return sessao.erro;

  // Instalacao nova comeca sem linhas: qualquer usuario ve as de demonstracao,
  // sem poder criar ou substituir o conjunto (isso segue restrito a ADMIN).
  await garantirLinhasDemo();

  const linhas = await prisma.linhaDivisa.findMany({ orderBy: { codigo: "asc" } });
  return NextResponse.json(
    linhas.map((l) => ({ ...l, municipios: JSON.parse(l.municipios), geometria: JSON.parse(l.geometria) }))
  );
}

/** POST /api/geometria/linhas — cadastra linha de divisa validada (base PostGIS). */
export async function POST(request: NextRequest) {
  const sessao = await exigirAdminApi();
  if ("erro" in sessao) return sessao.erro;

  const body = await request.json();
  if (!body.codigo || !body.geometria) {
    return NextResponse.json({ error: "codigo e geometria sao obrigatorios" }, { status: 400 });
  }
  const tipo = body.tipo ?? "DIVISA_MUNICIPAL";
  if (!(TIPOS_LINHA as readonly string[]).includes(tipo)) {
    return NextResponse.json({ error: `tipo deve ser um de: ${TIPOS_LINHA.join(", ")}` }, { status: 400 });
  }
  const linha = await prisma.linhaDivisa.create({
    data: {
      codigo: body.codigo,
      descricao: body.descricao ?? null,
      tipo,
      finalizada: body.finalizada === true,
      geometria: JSON.stringify(body.geometria),
      bancoOrigem: body.bancoOrigem ?? "manual",
      dataValidacao: body.dataValidacao ? new Date(body.dataValidacao) : new Date(),
      municipios: JSON.stringify(body.municipios ?? []),
    },
  });
  return NextResponse.json(linha, { status: 201 });
}
