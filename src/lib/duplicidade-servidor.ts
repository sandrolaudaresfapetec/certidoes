import type { Geometry } from "geojson";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  chaveDuplicidade,
  classificarPar,
  codigosDasParcelas,
  escolherPergunta,
  lerSobreposicao,
  opcoesDaPergunta,
  paraRegistroSobreposicao,
  STATUS_NAO_COMPARAVEIS,
  textoDaPergunta,
  type Achado,
  type ParcelaGeo,
  type RequisicaoComparavel,
  type SobreposicaoRegistro,
} from "@/lib/duplicidade";
import { STATUS_SOLICITACAO } from "@/lib/solicitacao-estados";
import type { ResumoAnalise } from "@/lib/duplicidade-resumo";

/**
 * Análise de duplicidade (#PEND-30), lado servidor. O que torna a execução idempotente:
 *  1. cada requisição é "reservada" por uma atualização condicional (`analiseDuplicidadeEm`
 *     ainda vazio e status PENDENTE) feita na MESMA transação que grava as mensagens e o
 *     novo status: se algo falhar nada fica pela metade, e duas execuções ao mesmo tempo
 *     nunca analisam a mesma requisição duas vezes;
 *  2. toda pergunta tem chave fixa (`DUP:S1:{idOutra}`), então repetir nunca duplica a mensagem;
 *  3. violação de unicidade (duas execuções gravando a mesma chave) refaz a unidade de trabalho.
 */

type Tx = Prisma.TransactionClient;

const COLUNAS_COMPARACAO = {
  id: true,
  protocolo: true,
  solicitanteId: true,
  status: true,
  processId: true,
  finalizadaEm: true,
  createdAt: true,
  sigefParcelaCodigo: true,
  cjtPoligonos: true,
  cjtQualidade: true,
  cjtResultado: true,
  cjtSituacao: true,
  cjtPropriedadeDe: true,
  cjtMatricula: true,
  cjtCodigoIncra: true,
  emNomeDeCpf: true,
} as const;

type LinhaComparacao = Prisma.SolicitacaoGetPayload<{ select: typeof COLUNAS_COMPARACAO }>;

function paraGeometria(json: string | null | undefined): Geometry | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as Geometry;
  } catch {
    return null;
  }
}

function paraComparavel(linha: LinhaComparacao, geometrias: Map<string, Geometry | null>): RequisicaoComparavel {
  return {
    id: linha.id,
    protocolo: linha.protocolo,
    solicitanteId: linha.solicitanteId,
    status: linha.status,
    processId: linha.processId,
    finalizadaEm: linha.finalizadaEm,
    createdAt: linha.createdAt,
    parcelas: codigosDasParcelas(linha).map<ParcelaGeo>((codigo) => ({
      codigo,
      geometria: geometrias.get(codigo) ?? null,
    })),
    cadastro: linha,
  };
}

async function carregarGeometrias(codigos: string[]): Promise<Map<string, Geometry | null>> {
  const mapa = new Map<string, Geometry | null>();
  for (let i = 0; i < codigos.length; i += 400) {
    const lote = codigos.slice(i, i + 400);
    const linhas = await prisma.sigefParcela.findMany({
      where: { codigoParcela: { in: lote } },
      select: { codigoParcela: true, geometria: true },
    });
    for (const l of linhas) mapa.set(l.codigoParcela, paraGeometria(l.geometria));
  }
  return mapa;
}

/**
 * Requisições comparáveis com a analisada: fora rascunho/arquivadas e só as que têm
 * parcela igual ou vizinha (pelo bbox indexado do acervo) à da analisada.
 */
async function carregarVizinhas(
  base: LinhaComparacao,
  codigosBase: string[]
): Promise<{ vizinhas: LinhaComparacao[]; geometrias: Map<string, Geometry | null> }> {
  const boxes = await prisma.sigefParcela.findMany({
    where: { codigoParcela: { in: codigosBase } },
    select: { minLon: true, minLat: true, maxLon: true, maxLat: true },
  });
  const proximos = new Set(codigosBase);
  if (boxes.length > 0) {
    const perto = await prisma.sigefParcela.findMany({
      where: {
        OR: boxes.map((b) => ({
          minLon: { lte: b.maxLon },
          maxLon: { gte: b.minLon },
          minLat: { lte: b.maxLat },
          maxLat: { gte: b.minLat },
        })),
      },
      select: { codigoParcela: true },
    });
    for (const p of perto) proximos.add(p.codigoParcela);
  }

  const candidatas = await prisma.solicitacao.findMany({
    where: {
      id: { not: base.id },
      status: { notIn: [...STATUS_NAO_COMPARAVEIS] },
      OR: [{ sigefParcelaCodigo: { not: null } }, { cjtPoligonos: { not: null } }],
    },
    select: COLUNAS_COMPARACAO,
  });
  const vizinhas = candidatas.filter((c) => codigosDasParcelas(c).some((cod) => proximos.has(cod)));
  const todos = new Set(codigosBase);
  for (const v of vizinhas) for (const cod of codigosDasParcelas(v)) todos.add(cod);
  return { vizinhas, geometrias: await carregarGeometrias([...todos]) };
}

export type DesfechoAnalise =
  | "JA_ANALISADA"
  | "SEM_GEOMETRIA"
  | "LIBERADA"
  | "COM_PERGUNTA"
  | "COM_SOBREPOSICAO"
  | "PERGUNTA_JA_RESPONDIDA";

export interface ResultadoAnalise {
  desfecho: DesfechoAnalise;
  situacao?: string;
  sobreposicoes: number;
}

function violouUnicidade(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

/** Grava a pergunta se a chave ainda não existe; informa se ela segue aberta. */
async function garantirPergunta(
  tx: Tx,
  dados: { solicitacaoId: string; chave: string; texto: string; opcoes: { id: string; rotulo: string }[] }
): Promise<{ aberta: boolean }> {
  const existente = await tx.mensagemSolicitacao.findFirst({
    where: { solicitacaoId: dados.solicitacaoId, chave: dados.chave },
    select: { respondidaEm: true },
  });
  if (existente) return { aberta: existente.respondidaEm === null };
  await tx.mensagemSolicitacao.create({
    data: {
      solicitacaoId: dados.solicitacaoId,
      autorTipo: "SISTEMA",
      autorNome: "Sistema",
      tipo: "PERGUNTA",
      texto: dados.texto,
      opcoes: JSON.stringify(dados.opcoes),
      chave: dados.chave,
    },
  });
  return { aberta: true };
}

async function aplicarAnalise(
  base: LinhaComparacao,
  achados: Achado[]
): Promise<ResultadoAnalise> {
  const { pergunta, demais } = escolherPergunta(achados);
  const registros: SobreposicaoRegistro[] = demais.map(paraRegistroSobreposicao);
  const agora = new Date();

  return prisma.$transaction(async (tx) => {
    // Reserva: só quem muda o registro de "não analisada" para "analisada" continua.
    const reserva = await tx.solicitacao.updateMany({
      where: { id: base.id, status: STATUS_SOLICITACAO.PENDENTE, analiseDuplicidadeEm: null },
      data: {
        analiseDuplicidadeEm: agora,
        sobreposicao: registros.length > 0,
        sobreposicaoCom: registros.length > 0 ? JSON.stringify(registros) : null,
      },
    });
    if (reserva.count === 0) return { desfecho: "JA_ANALISADA", sobreposicoes: 0 } as ResultadoAnalise;

    let aberta = false;
    if (pergunta) {
      const outra = pergunta.outra;
      const chave = chaveDuplicidade(pergunta.situacao, outra.id);
      const estaAberta = await garantirPergunta(tx, {
        solicitacaoId: base.id,
        chave,
        texto: textoDaPergunta(pergunta, base.protocolo),
        opcoes: opcoesDaPergunta(pergunta.situacao, base.protocolo, outra.protocolo),
      });
      aberta = estaAberta.aberta;
      if (!aberta) {
        // Pergunta já respondida antes (ex.: requisição desarquivada ou reenviada): não pergunta
        // de novo, mas a DDD continua vendo a repetição.
        registros.push(paraRegistroSobreposicao(pergunta));
        await tx.solicitacao.update({
          where: { id: base.id },
          data: { sobreposicao: true, sobreposicaoCom: JSON.stringify(registros) },
        });
      }

      if (pergunta.situacao === "S3") {
        // A mesma decisão é pedida na outra requisição, e ela sai da fila até alguém responder.
        const espelho: Achado = {
          ...pergunta,
          outra: { id: base.id, protocolo: base.protocolo, status: base.status, finalizadaEm: null, createdAt: base.createdAt },
        };
        const naOutra = await garantirPergunta(tx, {
          solicitacaoId: outra.id,
          chave: chaveDuplicidade("S3", base.id),
          texto: textoDaPergunta(espelho, outra.protocolo),
          opcoes: opcoesDaPergunta("S3", outra.protocolo, base.protocolo),
        });
        if (naOutra.aberta) {
          await tx.solicitacao.updateMany({
            where: { id: outra.id, status: STATUS_SOLICITACAO.PENDENTE, processId: null },
            data: { status: STATUS_SOLICITACAO.AGUARDANDO_CLIENTE },
          });
          await tx.solicitacao.updateMany({
            where: { id: outra.id, analiseDuplicidadeEm: null },
            data: { analiseDuplicidadeEm: agora },
          });
        }
      }
    }

    if (aberta) {
      await tx.solicitacao.updateMany({
        where: { id: base.id, status: STATUS_SOLICITACAO.PENDENTE },
        data: { status: STATUS_SOLICITACAO.AGUARDANDO_CLIENTE },
      });
    }

    const desfecho: DesfechoAnalise = aberta
      ? "COM_PERGUNTA"
      : pergunta
        ? "PERGUNTA_JA_RESPONDIDA"
        : registros.length > 0
          ? "COM_SOBREPOSICAO"
          : "LIBERADA";
    return { desfecho, situacao: pergunta?.situacao, sobreposicoes: registros.length };
  });
}

/**
 * Analisa uma requisição enviada e ainda não analisada. Repetir a chamada é seguro: depois
 * da primeira vez devolve `JA_ANALISADA` sem mexer em nada.
 */
export async function analisarSolicitacao(id: string): Promise<ResultadoAnalise> {
  for (let tentativa = 0; ; tentativa++) {
    try {
      const base = await prisma.solicitacao.findUnique({ where: { id }, select: { ...COLUNAS_COMPARACAO, analiseDuplicidadeEm: true } });
      if (!base || base.status !== STATUS_SOLICITACAO.PENDENTE || base.analiseDuplicidadeEm) {
        return { desfecho: "JA_ANALISADA", sobreposicoes: 0 };
      }
      const codigos = codigosDasParcelas(base);
      let achados: Achado[] = [];
      if (codigos.length > 0) {
        const { vizinhas, geometrias } = await carregarVizinhas(base, codigos);
        const nova = paraComparavel(base, geometrias);
        achados = vizinhas
          .map((v) => classificarPar(nova, paraComparavel(v, geometrias)))
          .filter((a): a is Achado => a !== null);
      }
      const resultado = await aplicarAnalise(base, achados);
      if (codigos.length === 0 && resultado.desfecho === "LIBERADA") {
        return { ...resultado, desfecho: "SEM_GEOMETRIA" };
      }
      return resultado;
    } catch (e) {
      if (!violouUnicidade(e) || tentativa >= 2) throw e;
    }
  }
}

/** Analisa todas as requisições enviadas que ainda aguardam a análise, uma a uma. */
export async function executarAnalise(): Promise<ResumoAnalise> {
  const resumo: ResumoAnalise = {
    analisadas: 0,
    liberadas: 0,
    comPergunta: 0,
    comSobreposicao: 0,
    semGeometria: 0,
    jaAnalisadas: 0,
    erros: 0,
  };
  const fila = await prisma.solicitacao.findMany({
    where: { status: STATUS_SOLICITACAO.PENDENTE, analiseDuplicidadeEm: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  for (const { id } of fila) {
    try {
      const r = await analisarSolicitacao(id);
      if (r.desfecho === "JA_ANALISADA") {
        resumo.jaAnalisadas++;
        continue;
      }
      resumo.analisadas++;
      if (r.desfecho === "COM_PERGUNTA") resumo.comPergunta++;
      else if (r.desfecho === "COM_SOBREPOSICAO") resumo.comSobreposicao++;
      else if (r.desfecho === "SEM_GEOMETRIA") resumo.semGeometria++;
      else resumo.liberadas++;
      if (r.desfecho === "PERGUNTA_JA_RESPONDIDA" && r.sobreposicoes > 0) resumo.comSobreposicao++;
    } catch (e) {
      resumo.erros++;
      console.error(`[duplicidade] falha ao analisar ${id}:`, e);
    }
  }
  return resumo;
}

/** Quantas requisições esperam a próxima execução. */
export async function contarAguardandoAnalise(): Promise<number> {
  return prisma.solicitacao.count({
    where: { status: STATUS_SOLICITACAO.PENDENTE, analiseDuplicidadeEm: null },
  });
}

export interface SobreposicaoDaRequisicao extends SobreposicaoRegistro {
  /** "aponta" = esta requisição listou a outra; "apontada" = a outra listou esta. */
  sentido: "aponta" | "apontada";
}

/**
 * Sobreposições de uma requisição nos dois sentidos: as que ela mesma listou e as de outras
 * requisições que a listaram. Nada é gravado na outra ponta, então nada fica desatualizado
 * quando uma requisição é devolvida e reanalisada.
 */
export async function sobreposicoesDe(
  requisicao: { id: string; sobreposicaoCom: string | null }
): Promise<SobreposicaoDaRequisicao[]> {
  const proprias = lerSobreposicao(requisicao.sobreposicaoCom).map<SobreposicaoDaRequisicao>((s) => ({
    ...s,
    sentido: "aponta",
  }));
  const outras = await prisma.solicitacao.findMany({
    where: {
      sobreposicao: true,
      id: { not: requisicao.id },
      sobreposicaoCom: { contains: requisicao.id },
      status: { notIn: [...STATUS_NAO_COMPARAVEIS] },
    },
    select: { id: true, protocolo: true, sobreposicaoCom: true },
  });
  const ja = new Set(proprias.map((p) => p.id));
  const apontadas: SobreposicaoDaRequisicao[] = [];
  for (const o of outras) {
    if (ja.has(o.id)) continue;
    const registro = lerSobreposicao(o.sobreposicaoCom).find((s) => s.id === requisicao.id);
    if (!registro) continue;
    apontadas.push({ id: o.id, protocolo: o.protocolo, situacao: registro.situacao, motivo: registro.motivo, sentido: "apontada" });
  }
  return [...proprias, ...apontadas];
}

/** Ids de requisições com sobreposição (as que listam e as listadas), para selos nas listas. */
export async function idsComSobreposicao(): Promise<Set<string>> {
  const linhas = await prisma.solicitacao.findMany({
    where: { sobreposicao: true, status: { notIn: [...STATUS_NAO_COMPARAVEIS] } },
    select: { id: true, sobreposicaoCom: true },
  });
  const ids = new Set<string>();
  for (const l of linhas) {
    ids.add(l.id);
    for (const s of lerSobreposicao(l.sobreposicaoCom)) ids.add(s.id);
  }
  return ids;
}
