import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** POST /api/geometria/seed[?force=1] — linhas de divisa de demonstracao (interior de SP: Brotas, Holambra, Sao Pedro). */
export async function POST(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("force") === "1";
  const total = await prisma.linhaDivisa.count();
  if (total > 0 && !force) {
    return NextResponse.json({ ok: true, mensagem: "Linhas ja existentes (use ?force=1 para recriar)." });
  }
  if (force) await prisma.linhaDivisa.deleteMany();

  const demo = [
    {
      codigo: "DIV-SP-001",
      descricao: "Divisa Brotas / Torrinha",
      tipo: "DIVISA_MUNICIPAL",
      bancoOrigem: "base_divisas_validadas_igc",
      municipios: ["Brotas", "Torrinha"],
      geometria: { type: "LineString", coordinates: [[-48.20, -22.35], [-48.00, -22.35]] },
    },
    {
      codigo: "DIV-SP-002",
      descricao: "Divisa triplice Brotas / Itirapina / Sao Pedro",
      tipo: "TRIPLICE",
      bancoOrigem: "base_divisas_validadas_igc",
      municipios: ["Brotas", "Itirapina", "São Pedro"],
      geometria: { type: "LineString", coordinates: [[-48.10, -22.45], [-48.10, -22.25]] },
    },
    {
      codigo: "RIO-SP-001",
      descricao: "Rio Jacare-Pepira como divisa natural (trecho)",
      tipo: "RIO",
      bancoOrigem: "base_hidrografia_igc",
      municipios: ["Brotas", "São Pedro"],
      geometria: { type: "LineString", coordinates: [[-48.15, -22.30], [-48.05, -22.40]] },
    },
  ];

  for (const d of demo) {
    await prisma.linhaDivisa.create({
      data: {
        codigo: d.codigo,
        descricao: d.descricao,
        tipo: d.tipo,
        bancoOrigem: d.bancoOrigem,
        dataValidacao: new Date("2026-06-01"),
        municipios: JSON.stringify(d.municipios),
        geometria: JSON.stringify(d.geometria),
      },
    });
  }
  return NextResponse.json({ ok: true, criadas: demo.length, uf: "SP" }, { status: 201 });
}
