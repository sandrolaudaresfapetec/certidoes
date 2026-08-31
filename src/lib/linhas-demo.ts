import { prisma } from "@/lib/prisma";

/** Linhas de divisa de demonstracao (interior de SP: Brotas, Torrinha, Itirapina, Sao Pedro). */
export const LINHAS_DEMO = [
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

/**
 * Cria as linhas de demonstracao apenas quando a base esta vazia. O upsert por
 * codigo mantem a operacao idempotente em chamadas concorrentes.
 */
export async function garantirLinhasDemo(): Promise<number> {
  const total = await prisma.linhaDivisa.count();
  if (total > 0) return 0;

  for (const d of LINHAS_DEMO) {
    const dados = {
      descricao: d.descricao,
      tipo: d.tipo,
      bancoOrigem: d.bancoOrigem,
      dataValidacao: new Date("2026-06-01"),
      municipios: JSON.stringify(d.municipios),
      geometria: JSON.stringify(d.geometria),
    };
    await prisma.linhaDivisa.upsert({
      where: { codigo: d.codigo },
      update: {},
      create: { codigo: d.codigo, ...dados },
    });
  }
  return LINHAS_DEMO.length;
}
