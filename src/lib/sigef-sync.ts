/**
 * Sincronizacao do acervo SIGEF (INCRA) com a tabela SigefParcela.
 *
 * O INCRA publica diariamente o shapefile das parcelas certificadas por UF em
 * `certificacao.incra.gov.br/csv_shp/zip/Sigef Brasil_<UF>.zip` (~350 MB para
 * SP). O servidor so responde a IPs no Brasil, por isso a sincronizacao roda no
 * processo `sigef_sync` do Fly na regiao `gru` (ver fly.toml e
 * scripts/sigef-scheduler.ts).
 *
 * Cada parcela recebe uma assinatura (hash dos atributos + geometria); so as
 * novas ou alteradas sao gravadas e as que sairam do acervo sao removidas. Os
 * lotes sao pequenos e espacados porque o Postgres compartilhado e modesto.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream } from "stream/web";
import * as shapefile from "shapefile";
import * as turf from "@turf/turf";
import type { Geometry, MultiPolygon, Polygon } from "geojson";
import { prisma } from "./prisma";

export const IBGE_MUNICIPIOS = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";

export function urlAcervo(uf: string): string {
  return (
    process.env.SIGEF_ACERVO_URL ??
    `https://certificacao.incra.gov.br/csv_shp/zip/Sigef%20Brasil_${uf.toUpperCase()}.zip`
  );
}

export function fonteAcervo(uf: string): string {
  return `SIGEF/Acervo Fundiario (INCRA) — Sigef Brasil_${uf.toUpperCase()}.zip`;
}

export type ParcelaAcervo = {
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
  assinatura: string;
};

export type MapaMunicipios = Map<number, { nome: string; uf: string }>;

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
export function resolverShp(arquivo: string): string {
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
export async function municipiosIbge(log: (m: string) => void = console.warn): Promise<MapaMunicipios> {
  const mapa: MapaMunicipios = new Map();
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
    log(`Nomes de municipio indisponiveis (${(e as Error).message}); gravando apenas os codigos.`);
  }
  return mapa;
}

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function assinaturaParcela(p: Omit<ParcelaAcervo, "assinatura">): string {
  const partes = [
    p.codigoParcela,
    p.nomeArea,
    p.codigoImovel,
    p.municipioIbge,
    p.situacaoImovel,
    p.status,
    p.rt,
    p.art,
    p.matricula,
    p.dataSubmissao?.toISOString(),
    p.dataAprovacao?.toISOString(),
    p.geometria,
  ];
  return createHash("md5").update(partes.map((x) => x ?? "").join("|")).digest("hex");
}

const ehPostgres = () => (process.env.DATABASE_URL ?? "").startsWith("postgres");

/**
 * Parcelas importadas antes da coluna `assinatura` recebem o hash calculado no
 * proprio Postgres (mesma string canonica de assinaturaParcela), em lotes, para
 * nao reescrever o acervo inteiro a partir do cliente na primeira sincronizacao.
 */
async function preencherAssinaturasNoBanco(uf: string, pausaMs: number, log: (m: string) => void) {
  if (!ehPostgres()) return;
  let total = 0;
  for (;;) {
    const n = await prisma.$executeRaw`
      UPDATE "SigefParcela" SET "assinatura" = md5(concat_ws('|',
        "codigoParcela",
        coalesce("nomeArea", ''),
        coalesce("codigoImovel", ''),
        coalesce("municipioIbge"::text, ''),
        coalesce("situacaoImovel", ''),
        coalesce("status", ''),
        coalesce("rt", ''),
        coalesce("art", ''),
        coalesce("matricula", ''),
        coalesce(to_char("dataSubmissao", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), ''),
        coalesce(to_char("dataAprovacao", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), ''),
        "geometria"))
      WHERE "id" IN (SELECT "id" FROM "SigefParcela" WHERE "uf" = ${uf} AND "assinatura" IS NULL LIMIT 1000)`;
    if (n === 0) break;
    total += n;
    await pausa(pausaMs);
  }
  if (total > 0) log(`${total} assinaturas preenchidas no banco`);
}

/** Converte uma feicao do shapefile numa linha de SigefParcela (null = sem codigo/geometria). */
export function montarParcela(
  feicao: { properties?: unknown; geometry?: unknown } | undefined,
  municipios: MapaMunicipios,
  ufPadrao: string,
  fonte: string,
): ParcelaAcervo | null {
  const props = (feicao?.properties ?? {}) as Record<string, unknown>;
  const codigo = texto(props, "parcela_co");
  if (!feicao?.geometry || !codigo) return null;

  const geometria = planificar(feicao.geometry as Geometry);
  const feature = turf.feature(geometria as Polygon | MultiPolygon);
  const [minLon, minLat, maxLon, maxLat] = turf.bbox(feature);
  const codigoIbge = inteiro(props, "municipio_");
  const municipio = codigoIbge === null ? null : municipios.get(codigoIbge) ?? null;

  const base = {
    codigoParcela: codigo,
    nomeArea: texto(props, "nome_area"),
    codigoImovel: texto(props, "codigo_imo"),
    municipioIbge: codigoIbge,
    municipio: municipio?.nome ?? null,
    uf: municipio?.uf ?? ufPadrao,
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
  };
  return { ...base, assinatura: assinaturaParcela(base) };
}

export type DownloadAcervo = { etag: string | null; modificadoEm: Date | null; bytes: number };

/**
 * Baixa o zip do acervo para `destino`. Com `condicional`, envia
 * If-None-Match/If-Modified-Since e devolve null quando o INCRA responde 304.
 */
export async function baixarAcervo(
  url: string,
  destino: string,
  condicional?: { etag: string | null; modificadoEm: Date | null },
): Promise<DownloadAcervo | null> {
  const headers: Record<string, string> = {};
  if (condicional?.etag) headers["If-None-Match"] = condicional.etag;
  if (condicional?.modificadoEm) headers["If-Modified-Since"] = condicional.modificadoEm.toUTCString();
  const res = await fetch(url, { headers, redirect: "follow" });
  if (res.status === 304) return null;
  if (!res.ok || !res.body) throw new Error(`INCRA respondeu ${res.status} para ${url}`);
  const corpo = Readable.fromWeb(res.body as unknown as ReadableStream<Uint8Array>);
  await pipeline(corpo, fs.createWriteStream(destino));
  const lm = res.headers.get("last-modified");
  const modificadoEm = lm ? new Date(lm) : null;
  return {
    etag: res.headers.get("etag"),
    modificadoEm: modificadoEm && !Number.isNaN(modificadoEm.getTime()) ? modificadoEm : null,
    bytes: fs.statSync(destino).size,
  };
}

export type OpcoesSincronizacao = {
  uf?: string;
  /** Arquivo .zip/.shp local em vez de baixar do INCRA (importacao manual). */
  arquivo?: string;
  /** Ignora o ETag/Last-Modified da ultima execucao e reprocessa tudo. */
  forcar?: boolean;
  lote?: number;
  pausaMs?: number;
  log?: (mensagem: string) => void;
};

export type ResultadoSincronizacao = {
  id: string;
  status: "CONCLUIDA" | "SEM_ALTERACAO" | "ERRO";
  lidas: number;
  inseridas: number;
  atualizadas: number;
  removidas: number;
  mensagem: string | null;
};

/** Protecao contra download truncado: nao apaga o acervo se o arquivo veio pequeno demais. */
const FRACAO_MINIMA_PARA_REMOVER = 0.5;

/** Execucoes EXECUTANDO mais antigas que isto sao consideradas abandonadas (processo morto sem encerrar). */
const JANELA_EXECUCAO_MS = 6 * 60 * 60 * 1000;

export async function sincronizarAcervo(opcoes: OpcoesSincronizacao = {}): Promise<ResultadoSincronizacao> {
  const uf = (opcoes.uf ?? process.env.SIGEF_SYNC_UF ?? "SP").toUpperCase();
  const tamanhoLote = opcoes.lote ?? Number(process.env.SIGEF_SYNC_LOTE ?? 300);
  const pausaMs = opcoes.pausaMs ?? Number(process.env.SIGEF_SYNC_PAUSA_MS ?? 250);
  const log = opcoes.log ?? ((m: string) => console.log(`[sigef-sync] ${m}`));
  const url = opcoes.arquivo ? `file://${path.resolve(opcoes.arquivo)}` : urlAcervo(uf);
  const fonte = fonteAcervo(uf);

  const emAndamento = await prisma.sigefSincronizacao.findFirst({
    where: { uf, status: "EXECUTANDO", iniciadoEm: { gte: new Date(Date.now() - JANELA_EXECUCAO_MS) } },
    select: { id: true, iniciadoEm: true },
  });
  if (emAndamento) {
    const mensagem = `Ja existe uma sincronizacao em andamento para ${uf} (${emAndamento.id}, iniciada em ${emAndamento.iniciadoEm.toISOString()})`;
    log(mensagem);
    return { id: emAndamento.id, status: "ERRO", lidas: 0, inseridas: 0, atualizadas: 0, removidas: 0, mensagem };
  }

  const execucao = await prisma.sigefSincronizacao.create({
    data: { uf, status: "EXECUTANDO", fonteUrl: url },
  });
  const contadores = { lidas: 0, inseridas: 0, atualizadas: 0, removidas: 0 };
  const temporarios: string[] = [];

  const encerrar = async (
    status: ResultadoSincronizacao["status"],
    mensagem: string | null,
    fonteInfo?: DownloadAcervo | null,
  ): Promise<ResultadoSincronizacao> => {
    const data = {
      status,
      mensagem,
      terminadoEm: new Date(),
      fonteEtag: fonteInfo?.etag ?? undefined,
      fonteModificadoEm: fonteInfo?.modificadoEm ?? undefined,
      ...contadores,
    };
    // O banco pode estar reiniciando (foi o que derrubou a execucao); insiste um pouco.
    for (let tentativa = 1; ; tentativa++) {
      try {
        await prisma.sigefSincronizacao.update({ where: { id: execucao.id }, data });
        break;
      } catch (e) {
        if (tentativa >= 5) throw e;
        log(`Registro da execucao falhou (${(e as Error).message}); nova tentativa em 30s`);
        await pausa(30_000);
      }
    }
    for (const t of temporarios) fs.rmSync(t, { recursive: true, force: true });
    log(`${status}: ${mensagem ?? ""} ${JSON.stringify(contadores)}`.trim());
    return { id: execucao.id, status, mensagem, ...contadores };
  };

  try {
    let arquivo = opcoes.arquivo;
    let download: DownloadAcervo | null = null;
    if (!arquivo) {
      const ultima = opcoes.forcar
        ? null
        : await prisma.sigefSincronizacao.findFirst({
            where: { uf, status: { in: ["CONCLUIDA", "SEM_ALTERACAO"] }, fonteUrl: url },
            orderBy: { iniciadoEm: "desc" },
            select: { fonteEtag: true, fonteModificadoEm: true },
          });
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sigef-acervo-"));
      temporarios.push(dir);
      arquivo = path.join(dir, `Sigef Brasil_${uf}.zip`);
      log(`Baixando ${url}`);
      download = await baixarAcervo(
        url,
        arquivo,
        ultima ? { etag: ultima.fonteEtag, modificadoEm: ultima.fonteModificadoEm } : undefined,
      );
      if (!download) {
        return encerrar("SEM_ALTERACAO", "INCRA respondeu 304: acervo igual ao da ultima sincronizacao.", {
          etag: ultima?.fonteEtag ?? null,
          modificadoEm: ultima?.fonteModificadoEm ?? null,
          bytes: 0,
        });
      }
      log(`Baixado ${(download.bytes / 1e6).toFixed(1)} MB (Last-Modified ${download.modificadoEm?.toISOString() ?? "?"})`);
    }

    const shp = resolverShp(arquivo);
    if (shp !== arquivo) temporarios.push(path.dirname(shp));
    const municipios = await municipiosIbge(log);

    await preencherAssinaturasNoBanco(uf, pausaMs, log);

    // Assinaturas atuais, paginadas por id para nao carregar as geometrias.
    const existentes = new Map<string, string | null>();
    let cursor: string | undefined;
    for (;;) {
      const pagina = await prisma.sigefParcela.findMany({
        where: { uf },
        select: { id: true, codigoParcela: true, assinatura: true },
        orderBy: { id: "asc" },
        take: 5000,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (pagina.length === 0) break;
      for (const p of pagina) existentes.set(p.codigoParcela, p.assinatura);
      cursor = pagina[pagina.length - 1].id;
    }
    log(`${existentes.size} parcelas de ${uf} no banco`);

    const vistas = new Set<string>();
    let pendentes: ParcelaAcervo[] = [];
    let novasNoLote = 0;

    const gravarLote = async () => {
      if (pendentes.length === 0) return;
      const unicas = [...new Map(pendentes.map((p) => [p.codigoParcela, p])).values()];
      await prisma.$transaction(
        async (tx) => {
          await tx.sigefParcela.deleteMany({
            where: { codigoParcela: { in: unicas.map((p) => p.codigoParcela) } },
          });
          await tx.sigefParcela.createMany({ data: unicas });
        },
        { timeout: 120_000, maxWait: 60_000 },
      );
      contadores.inseridas += novasNoLote;
      contadores.atualizadas += unicas.length - novasNoLote;
      pendentes = [];
      novasNoLote = 0;
      await pausa(pausaMs);
    };

    // O DBF do acervo vem em latin1.
    const origem = await shapefile.open(shp, undefined, { encoding: "latin1" });
    for (;;) {
      const { done, value } = await origem.read();
      if (done) break;
      contadores.lidas += 1;
      const parcela = montarParcela(value, municipios, uf, fonte);
      if (!parcela) continue;
      // O acervo pode repetir parcela_co; a ultima ocorrencia vence.
      vistas.add(parcela.codigoParcela);
      const assinaturaAtual = existentes.get(parcela.codigoParcela);
      if (assinaturaAtual === parcela.assinatura) continue;
      if (!existentes.has(parcela.codigoParcela)) novasNoLote += 1;
      existentes.set(parcela.codigoParcela, parcela.assinatura);
      pendentes.push(parcela);
      if (pendentes.length >= tamanhoLote) await gravarLote();
      if (contadores.lidas % 20_000 === 0) {
        log(`${contadores.lidas} lidas, ${contadores.inseridas} novas, ${contadores.atualizadas} alteradas`);
      }
    }
    await gravarLote();

    const removiveis = [...existentes.keys()].filter((c) => !vistas.has(c));
    const existiamAntes = existentes.size - contadores.inseridas;
    if (removiveis.length > 0 && contadores.lidas < existiamAntes * FRACAO_MINIMA_PARA_REMOVER) {
      log(`Arquivo com ${contadores.lidas} parcelas para ${existiamAntes} no banco: remocao de ${removiveis.length} suspensa.`);
    } else {
      for (let i = 0; i < removiveis.length; i += 500) {
        const fatia = removiveis.slice(i, i + 500);
        await prisma.sigefParcela.deleteMany({ where: { uf, codigoParcela: { in: fatia } } });
        contadores.removidas += fatia.length;
        await pausa(pausaMs);
      }
    }

    return encerrar("CONCLUIDA", null, download);
  } catch (e) {
    return encerrar("ERRO", (e as Error).message ?? String(e));
  }
}
