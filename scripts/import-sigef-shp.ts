/**
 * Importa o shapefile de parcelas certificadas do SIGEF (Acervo Fundiario do
 * INCRA, ex.: "Sigef Brasil_SP.zip") para a tabela SigefParcela.
 *
 * Uso:  npx tsx scripts/import-sigef-shp.ts <arquivo.shp|arquivo.zip>
 *
 * O acervo do INCRA so responde a IPs no Brasil, entao o arquivo e baixado
 * manualmente e importado aqui. Cada parcela vira GeoJSON em TEXT + bbox, que e
 * o padrao de geometria do projeto (ver prisma/schema.prisma). O shapefile e
 * PolygonZ em SIRGAS 2000 (graus, equivalentes a WGS84 para uso em mapa): a
 * cota Z e descartada e a area em hectares e calculada com Turf, porque o DBF
 * nao traz area.
 *
 * Campos do DBF: parcela_co, rt, art, situacao_i, codigo_imo, data_submi,
 * data_aprov, status, nome_area, registro_m, registro_d, municipio_, uf_id.
 * DATABASE_URL define o destino (SQLite local por padrao, Postgres via fly proxy).
 */
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import * as shapefile from "shapefile";
import * as turf from "@turf/turf";
import type { Geometry, MultiPolygon, Polygon } from "geojson";
import { prisma } from "../src/lib/prisma";

const LOTE = 250;
const IBGE_MUNICIPIOS = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";

type Parcela = {
  codigoParcela: string;
  nomeArea: string | null;
  codigoImovel: string | null;
  municipioIbge: number | null;
  municipio: string | null;
  uf: string;
  areaHa: number | null;
  situacaoImovel: string | null;
  status: string | null;
  rt: string | null;
  art: string | null;
  matricula: string | null;
  dataSubmissao: Date | null;
  dataAprovacao: Date | null;
  geometria: string;
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
  fonte: string;
};

function texto(props: Record<string, unknown>, campo: string): string | null {
  const v = props[campo];
  if (v === null || v === undefined || v === "") return null;
  return String(v).trim() || null;
}

function inteiro(props: Record<string, unknown>, campo: string): number | null {
  const v = texto(props, campo);
  if (v === null) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

function data(props: Record<string, unknown>, campo: string): Date | null {
  const v = texto(props, campo);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Remove a cota Z e arredonda para 6 casas (~0,1 m), reduzindo o GeoJSON. */
function planificar(geometria: Geometry): Geometry {
  const ponto = (c: number[]) => [Number(c[0].toFixed(6)), Number(c[1].toFixed(6))];
  const anel = (a: number[][]) => a.map(ponto);
  if (geometria.type === "Polygon") {
    return { ...geometria, coordinates: geometria.coordinates.map(anel) };
  }
  if (geometria.type === "MultiPolygon") {
    return { ...geometria, coordinates: geometria.coordinates.map((p) => p.map(anel)) };
  }
  return geometria;
}

/** Extrai o .zip do acervo num diretorio temporario e devolve o .shp de dentro. */
function resolverShp(arquivo: string): string {
  if (!arquivo.toLowerCase().endsWith(".zip")) return arquivo;
  const destino = fs.mkdtempSync(path.join(os.tmpdir(), "sigef-shp-"));
  execFileSync("unzip", ["-o", "-q", arquivo, "-d", destino]);
  const encontrados: string[] = [];
  const percorrer = (dir: string) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const cheio = path.join(dir, entrada.name);
      if (entrada.isDirectory()) percorrer(cheio);
      else if (entrada.name.toLowerCase().endsWith(".shp")) encontrados.push(cheio);
    }
  };
  percorrer(destino);
  if (encontrados.length === 0) throw new Error(`Nenhum .shp dentro de ${arquivo}`);
  return encontrados[0];
}

/** O DBF traz municipio_/uf_id como codigos do IBGE; os nomes vem da API do IBGE. */
async function municipiosIbge(): Promise<Map<number, { nome: string; uf: string }>> {
  const mapa = new Map<number, { nome: string; uf: string }>();
  try {
    const res = await fetch(IBGE_MUNICIPIOS);
    if (!res.ok) throw new Error(`IBGE respondeu ${res.status}`);
    const lista = (await res.json()) as {
      id: number;
      nome: string;
      microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
    }[];
    for (const m of lista) {
      const uf = m.microrregiao?.mesorregiao?.UF?.sigla;
      if (uf) mapa.set(m.id, { nome: m.nome, uf });
    }
  } catch (e) {
    console.warn(`Nomes de municipio indisponiveis (${(e as Error).message}); gravando apenas os codigos.`);
  }
  return mapa;
}

async function main() {
  const arquivo = process.argv[2];
  if (!arquivo) {
    throw new Error("Uso: npx tsx scripts/import-sigef-shp.ts <arquivo.shp|arquivo.zip>");
  }

  const shp = resolverShp(arquivo);
  const fonte = `SIGEF/Acervo Fundiario (INCRA) — ${path.basename(arquivo)}`;
  const municipios = await municipiosIbge();
  // O DBF do acervo vem em latin1.
  const origem = await shapefile.open(shp, undefined, { encoding: "latin1" });

  let lidas = 0;
  let gravadas = 0;
  let ignoradas = 0;
  let lote: Parcela[] = [];

  const gravarLote = async () => {
    if (lote.length === 0) return;
    // Reimportacao: sobrescreve pelo codigo da parcela.
    await prisma.sigefParcela.deleteMany({
      where: { codigoParcela: { in: lote.map((p) => p.codigoParcela) } },
    });
    await prisma.sigefParcela.createMany({ data: lote });
    gravadas += lote.length;
    lote = [];
    if (gravadas % 5000 === 0) process.stdout.write(`\r${gravadas} parcelas gravadas (${lidas} lidas)`);
  };

  for (;;) {
    const { done, value } = await origem.read();
    if (done) break;
    lidas += 1;
    const props = (value?.properties ?? {}) as Record<string, unknown>;
    if (lidas === 1) console.log("Campos do DBF:", Object.keys(props).join(", "));

    const codigo = texto(props, "parcela_co");
    if (!value?.geometry || !codigo) {
      ignoradas += 1;
      continue;
    }

    const geometria = planificar(value.geometry as Geometry);
    const feature = turf.feature(geometria as Polygon | MultiPolygon);
    const [minLon, minLat, maxLon, maxLat] = turf.bbox(feature);
    const codigoIbge = inteiro(props, "municipio_");
    const municipio = codigoIbge === null ? null : municipios.get(codigoIbge) ?? null;

    lote.push({
      codigoParcela: codigo,
      nomeArea: texto(props, "nome_area"),
      codigoImovel: texto(props, "codigo_imo"),
      municipioIbge: codigoIbge,
      municipio: municipio?.nome ?? null,
      uf: municipio?.uf ?? "SP",
      areaHa: Number((turf.area(feature) / 10_000).toFixed(4)),
      situacaoImovel: texto(props, "situacao_i"),
      status: texto(props, "status"),
      rt: texto(props, "rt"),
      art: texto(props, "art"),
      matricula: texto(props, "registro_m"),
      dataSubmissao: data(props, "data_submi"),
      dataAprovacao: data(props, "data_aprov"),
      geometria: JSON.stringify(geometria),
      minLon,
      minLat,
      maxLon,
      maxLat,
      fonte,
    });
    if (lote.length >= LOTE) await gravarLote();
  }
  await gravarLote();

  console.log(
    `\nImportacao concluida: ${gravadas} parcelas gravadas, ${lidas} feicoes lidas, ${ignoradas} ignoradas (sem geometria ou sem codigo).`
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
