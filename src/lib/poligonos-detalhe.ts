import { prisma } from "@/lib/prisma";
import { lerPoligonos } from "@/lib/cjt-formulario";
import { geometriaDoAcervo } from "@/components/requisicao/geometria";

/** Polígono nomeado com a parcela do SIGEF e o contorno (quando o acervo local o tem). */
export interface PoligonoDetalhe {
  nome: string;
  parcelaCodigo: string;
  nomeArea: string | null;
  areaHa: number | null;
  geometria: unknown | null;
}

/**
 * Polígonos de uma requisição com o vínculo à parcela (#PEND-34), para as telas de detalhe do
 * portal e do atendimento. Vazio quando não há vínculo (requisição antiga, um polígono ou
 * imóvel sem registro no INCRA).
 */
export async function carregarPoligonosDetalhe(requisicao: {
  cjtPoligonos: string | null;
}): Promise<PoligonoDetalhe[]> {
  const pares = lerPoligonos(requisicao.cjtPoligonos, null).filter((p) => p.parcelaCodigo);
  if (pares.length === 0) return [];
  const acervo = await prisma.sigefParcela.findMany({
    where: { codigoParcela: { in: pares.map((p) => p.parcelaCodigo as string) } },
    select: { codigoParcela: true, geometria: true },
  });
  return pares.map((p) => ({
    nome: p.nome,
    parcelaCodigo: p.parcelaCodigo as string,
    nomeArea: p.nomeArea ?? null,
    areaHa: p.areaHa ?? null,
    geometria: geometriaDoAcervo(acervo.find((a) => a.codigoParcela === p.parcelaCodigo)?.geometria),
  }));
}
