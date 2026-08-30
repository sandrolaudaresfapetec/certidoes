/**
 * Parcelas certificadas do SIGEF (shapefile do Acervo Fundiario do INCRA).
 *
 * O acervo (`certificacao.incra.gov.br` / `acervofundiario.incra.gov.br`) so
 * responde a IPs no Brasil, por isso nao ha consulta em tempo real: o shapefile
 * por UF e importado para a tabela SigefParcela (`scripts/import-sigef-shp.ts`).
 * A janela do mapa e filtrada pelo bbox indexado e o ponto clicado e resolvido
 * com point-in-polygon em Turf sobre os candidatos do bbox.
 */
import * as turf from "@turf/turf";
import type { Geometry, MultiPolygon, Polygon } from "geojson";
import { prisma } from "@/lib/prisma";

export interface SigefParcelaGeo {
  codigoParcela: string;
  nomeArea: string | null;
  codigoImovel: string | null;
  municipio: string | null;
  municipioIbge: number | null;
  uf: string;
  areaHa: number | null;
  situacaoImovel: string | null;
  status: string | null;
  rt: string | null;
  art: string | null;
  matricula: string | null;
  dataAprovacao: string | null;
  geometria: Geometry;
}

const CAMPOS = {
  codigoParcela: true,
  nomeArea: true,
  codigoImovel: true,
  municipio: true,
  municipioIbge: true,
  uf: true,
  areaHa: true,
  situacaoImovel: true,
  status: true,
  rt: true,
  art: true,
  matricula: true,
  dataAprovacao: true,
  geometria: true,
} as const;

type LinhaParcela = Omit<SigefParcelaGeo, "dataAprovacao" | "geometria"> & {
  dataAprovacao: Date | null;
  geometria: string;
};

function paraGeo(linha: LinhaParcela): SigefParcelaGeo {
  return {
    ...linha,
    dataAprovacao: linha.dataAprovacao ? linha.dataAprovacao.toISOString() : null,
    geometria: JSON.parse(linha.geometria) as Geometry,
  };
}

export async function contarParcelas(uf: string): Promise<number> {
  return prisma.sigefParcela.count({ where: { uf: uf.trim().toUpperCase() } });
}

export async function parcelasPorBbox(
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
  limite: number = 300,
  uf: string = "SP"
): Promise<SigefParcelaGeo[]> {
  const linhas = await prisma.sigefParcela.findMany({
    where: {
      uf: uf.trim().toUpperCase(),
      minLon: { lte: maxLon },
      maxLon: { gte: minLon },
      minLat: { lte: maxLat },
      maxLat: { gte: minLat },
    },
    select: CAMPOS,
    take: limite,
  });
  return linhas.map(paraGeo);
}

export async function parcelaNoPonto(
  lon: number,
  lat: number,
  uf: string = "SP"
): Promise<SigefParcelaGeo | null> {
  const candidatos = await prisma.sigefParcela.findMany({
    where: {
      uf: uf.trim().toUpperCase(),
      minLon: { lte: lon },
      maxLon: { gte: lon },
      minLat: { lte: lat },
      maxLat: { gte: lat },
    },
    select: CAMPOS,
    take: 50,
  });
  const ponto = turf.point([lon, lat]);
  for (const linha of candidatos) {
    const parcela = paraGeo(linha);
    const feature = turf.feature(parcela.geometria as Polygon | MultiPolygon);
    if (turf.booleanPointInPolygon(ponto, feature)) return parcela;
  }
  return null;
}

export async function parcelaPorCodigo(codigo: string): Promise<SigefParcelaGeo | null> {
  const linha = await prisma.sigefParcela.findUnique({
    where: { codigoParcela: codigo.trim() },
    select: CAMPOS,
  });
  return linha ? paraGeo(linha) : null;
}
