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
 * Cria as linhas de demonstracao apenas quando a base esta vazia. As insercoes
 * ficam em uma transacao para que uma chamada concorrente veja a base vazia ou
 * o conjunto completo — nunca uma inicializacao parcial, que produziria corte
 * com menos divisas do que existem.
 */
export async function garantirLinhasDemo(): Promise<number> {
  const total = await prisma.linhaDivisa.count();
  if (total > 0) return 0;

  try {
    await prisma.$transaction(
      LINHAS_DEMO.map((d) =>
        prisma.linhaDivisa.upsert({
          where: { codigo: d.codigo },
          update: {},
          create: {
            codigo: d.codigo,
            descricao: d.descricao,
            tipo: d.tipo,
            bancoOrigem: d.bancoOrigem,
            dataValidacao: new Date("2026-06-01"),
            municipios: JSON.stringify(d.municipios),
            geometria: JSON.stringify(d.geometria),
          },
        }),
      ),
    );
  } catch (erro) {
    // P2002: outra chamada concorrente inseriu os mesmos codigos primeiro.
    if ((erro as { code?: string })?.code !== "P2002") throw erro;
    return 0;
  }
  return LINHAS_DEMO.length;
}
