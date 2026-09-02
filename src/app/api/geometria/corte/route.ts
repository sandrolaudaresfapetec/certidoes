import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cortarImovel, LinhaDivisaGeo } from "@/lib/geometria";
import { exigirUsuarioApi } from "@/lib/auth";
import { garantirLinhasDemo } from "@/lib/linhas-demo";

/**
 * POST /api/geometria/corte
 * Body: { imovel: GeoJSON Feature<Polygon>, processId?: string }
 * Executa o corte automatico do imovel pelas linhas de divisa validadas,
 * registra CorteDivisa (rastreabilidade: linha, banco, data) e retorna
 * classificacao + fragmentos com area/percentual por municipio.
 */
export async function POST(request: NextRequest) {
  const sessao = await exigirUsuarioApi();
  if ("erro" in sessao) return sessao.erro;

  const body = await request.json().catch(() => ({}));
  const imovel = body.imovel;
  if (!imovel || imovel.type !== "Feature") {
    return NextResponse.json({ error: "Envie o imovel como GeoJSON Feature<Polygon>." }, { status: 400 });
  }

  // Base vazia nao pode produzir corte sem divisas: garante as linhas de
  // demonstracao antes de classificar (idempotente, so insere se nao houver).
  await garantirLinhasDemo();

  const linhasDb = await prisma.linhaDivisa.findMany();
  const linhas: LinhaDivisaGeo[] = linhasDb.map((l) => ({
    id: l.id,
    codigo: l.codigo,
    tipo: l.tipo,
    municipios: JSON.parse(l.municipios),
    feature: { type: "Feature", properties: { codigo: l.codigo }, geometry: JSON.parse(l.geometria) },
  }));

  const resultado = cortarImovel(imovel, linhas);

  const corte = await prisma.corteDivisa.create({
    data: {
      classificacao: resultado.classificacao,
      geometriaImovel: JSON.stringify(imovel.geometry ?? imovel),
      resultadoJson: JSON.stringify(resultado.fragmentos),
      processId: body.processId ?? null,
      linhaDivisaId: resultado.linhasUsadas[0]?.id ?? null,
    },
  });

  return NextResponse.json({ corteId: corte.id, ...resultado }, { status: 201 });
}
