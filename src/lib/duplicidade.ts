import * as turf from "@turf/turf";
import type { Feature, Geometry, MultiPolygon, Polygon } from "geojson";
import { lerPoligonos } from "./cjt-formulario";
import { STATUS_SOLICITACAO } from "./solicitacao-estados";

/**
 * Análise de duplicidade (#PEND-30): compara a geometria das parcelas do SIGEF de uma
 * requisição com a das demais. Funções puras (sem banco), testadas em `duplicidade.test.ts`.
 * O que roda, quando roda e as respostas do solicitante estão em `duplicidade-servidor.ts`.
 *
 * Decisões do time (2026-10-07, ver docs/atendimento-cjt-pedidos-restantes.md):
 *  - "mesma geometria": mesmo código de parcela, ou sobreposição mútua de pelo menos 98%;
 *  - sobreposição (S4): a partir de 1% da menor parcela e 100 m², para não acusar vizinhas;
 *  - mesma geometria com solicitantes diferentes, ou com a outra já em processo, cai em S4.
 */

export const TOLERANCIA_MESMA_GEOMETRIA = 0.98;
export const SOBREPOSICAO_MINIMA_FRACAO = 0.01;
export const SOBREPOSICAO_MINIMA_M2 = 100;

export type SituacaoDuplicidade = "S1" | "S2" | "S3" | "S4";

export interface ParcelaGeo {
  codigo: string;
  /** Contorno do acervo local; null quando a parcela não está no acervo. */
  geometria: Geometry | null;
}

/** Campos do cadastro que definem "mesmo cadastro" entre duas requisições. */
export interface CadastroComparavel {
  cjtQualidade?: string | null;
  cjtResultado?: string | null;
  cjtSituacao?: string | null;
  cjtPropriedadeDe?: string | null;
  cjtMatricula?: string | null;
  cjtCodigoIncra?: string | null;
  emNomeDeCpf?: string | null;
}

export interface RequisicaoComparavel {
  id: string;
  protocolo: string;
  solicitanteId: string;
  status: string;
  processId: string | null;
  finalizadaEm: Date | null;
  createdAt: Date;
  parcelas: ParcelaGeo[];
  cadastro: CadastroComparavel;
}

export type RelacaoGeometria = "NENHUMA" | "SOBREPOSICAO" | "MESMA";

export interface Achado {
  situacao: SituacaoDuplicidade;
  outra: Pick<RequisicaoComparavel, "id" | "protocolo" | "status" | "finalizadaEm" | "createdAt">;
  relacao: Exclude<RelacaoGeometria, "NENHUMA">;
  mesmoCadastro: boolean;
  /** Parte da menor parcela coberta pela outra (0 a 1); null quando não foi possível medir. */
  fracao: number | null;
  motivo: string;
}

/** Requisições que entram na comparação (as demais nunca são "duplicadas" de ninguém). */
export const STATUS_NAO_COMPARAVEIS: readonly string[] = [
  STATUS_SOLICITACAO.RASCUNHO,
  STATUS_SOLICITACAO.AGUARDANDO_LIBERACAO,
  STATUS_SOLICITACAO.ARQUIVAMENTO_SOLICITADO,
  STATUS_SOLICITACAO.ARQUIVADA,
];

/** Códigos das parcelas de uma requisição: o imóvel principal e os polígonos nomeados. */
export function codigosDasParcelas(requisicao: {
  sigefParcelaCodigo?: string | null;
  cjtPoligonos?: string | null;
}): string[] {
  const codigos = new Set<string>();
  if (requisicao.sigefParcelaCodigo) codigos.add(requisicao.sigefParcelaCodigo);
  for (const p of lerPoligonos(requisicao.cjtPoligonos, null)) {
    if (p.parcelaCodigo) codigos.add(p.parcelaCodigo);
  }
  return [...codigos];
}

function normalizar(valor: string | null | undefined): string {
  return (valor ?? "").trim().toLowerCase();
}

export function mesmoCadastro(a: CadastroComparavel, b: CadastroComparavel): boolean {
  const campos: (keyof CadastroComparavel)[] = [
    "cjtQualidade",
    "cjtResultado",
    "cjtSituacao",
    "cjtPropriedadeDe",
    "cjtMatricula",
    "cjtCodigoIncra",
    "emNomeDeCpf",
  ];
  return campos.every((c) => normalizar(a[c]) === normalizar(b[c]));
}

function comoFeature(g: Geometry | null): Feature<Polygon | MultiPolygon> | null {
  if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) return null;
  return { type: "Feature", properties: {}, geometry: g };
}

interface MedidaPar {
  /** Área comum em m²; null quando não foi possível medir. */
  comum: number | null;
  areaA: number | null;
  areaB: number | null;
}

function medirPar(a: ParcelaGeo, b: ParcelaGeo): MedidaPar {
  const fa = comoFeature(a.geometria);
  const fb = comoFeature(b.geometria);
  if (!fa || !fb) return { comum: null, areaA: null, areaB: null };
  try {
    const [ax0, ay0, ax1, ay1] = turf.bbox(fa);
    const [bx0, by0, bx1, by1] = turf.bbox(fb);
    const areaA = turf.area(fa);
    const areaB = turf.area(fb);
    if (ax1 < bx0 || bx1 < ax0 || ay1 < by0 || by1 < ay0) return { comum: 0, areaA, areaB };
    const comum = turf.intersect(turf.featureCollection([fa, fb]));
    return { comum: comum ? turf.area(comum) : 0, areaA, areaB };
  } catch {
    // Geometria inválida: sem como medir; o código igual ainda é considerado abaixo.
    return { comum: null, areaA: null, areaB: null };
  }
}

function parcelasIguais(a: ParcelaGeo, b: ParcelaGeo, m: MedidaPar): boolean {
  if (a.codigo === b.codigo) return true;
  if (m.comum === null || m.areaA === null || m.areaB === null) return false;
  const maior = Math.max(m.areaA, m.areaB);
  return maior > 0 && m.comum / maior >= TOLERANCIA_MESMA_GEOMETRIA;
}

/**
 * Relação entre os conjuntos de parcelas de duas requisições. `MESMA`: toda parcela de um
 * lado tem uma igual do outro. `SOBREPOSICAO`: alguma parcela cobre parte relevante de outra.
 * `fracao` é a maior cobertura sobre a menor parcela do par (null se só o código coincide).
 */
export function compararParcelas(
  a: ParcelaGeo[],
  b: ParcelaGeo[]
): { relacao: RelacaoGeometria; fracao: number | null } {
  if (a.length === 0 || b.length === 0) return { relacao: "NENHUMA", fracao: null };

  const medidas = a.map((pa) => b.map((pb) => medirPar(pa, pb)));
  const igual = (i: number, j: number) => parcelasIguais(a[i], b[j], medidas[i][j]);

  const todasDeAComPar = a.every((_, i) => b.some((_, j) => igual(i, j)));
  const todasDeBComPar = b.every((_, j) => a.some((_, i) => igual(i, j)));
  if (todasDeAComPar && todasDeBComPar) {
    return { relacao: "MESMA", fracao: 1 };
  }

  let melhor: number | null = null;
  let sobrepoe = false;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      const m = medidas[i][j];
      if (a[i].codigo === b[j].codigo) {
        sobrepoe = true;
        melhor = Math.max(melhor ?? 0, 1);
        continue;
      }
      if (m.comum === null || m.areaA === null || m.areaB === null) continue;
      const menor = Math.min(m.areaA, m.areaB);
      if (menor <= 0) continue;
      const fracao = m.comum / menor;
      if (m.comum >= SOBREPOSICAO_MINIMA_M2 && fracao >= SOBREPOSICAO_MINIMA_FRACAO) {
        sobrepoe = true;
        melhor = Math.max(melhor ?? 0, fracao);
      }
    }
  }
  return sobrepoe ? { relacao: "SOBREPOSICAO", fracao: melhor } : { relacao: "NENHUMA", fracao: null };
}

function emAndamentoSemProcesso(r: Pick<RequisicaoComparavel, "status" | "processId" | "finalizadaEm">): boolean {
  return (
    !r.processId &&
    !r.finalizadaEm &&
    (r.status === STATUS_SOLICITACAO.PENDENTE || r.status === STATUS_SOLICITACAO.AGUARDANDO_CLIENTE)
  );
}

export function estaFinalizada(r: Pick<RequisicaoComparavel, "status" | "finalizadaEm">): boolean {
  return Boolean(r.finalizadaEm) || r.status === STATUS_SOLICITACAO.CONCLUIDA;
}

function descreverFracao(fracao: number | null): string {
  if (fracao === null) return "";
  return ` (${Math.round(fracao * 100)}% da menor parcela)`;
}

/** Classifica o par (nova, outra); null quando as geometrias não se repetem nem se sobrepõem. */
export function classificarPar(nova: RequisicaoComparavel, outra: RequisicaoComparavel): Achado | null {
  if (nova.id === outra.id || STATUS_NAO_COMPARAVEIS.includes(outra.status)) return null;
  const { relacao, fracao } = compararParcelas(nova.parcelas, outra.parcelas);
  if (relacao === "NENHUMA") return null;

  const cadastroIgual = mesmoCadastro(nova.cadastro, outra.cadastro);
  const mesmoSolicitante = nova.solicitanteId === outra.solicitanteId;
  const resumo = { id: outra.id, protocolo: outra.protocolo, status: outra.status, finalizadaEm: outra.finalizadaEm, createdAt: outra.createdAt };

  const base = { outra: resumo, relacao, mesmoCadastro: cadastroIgual, fracao };

  if (relacao === "MESMA" && mesmoSolicitante) {
    if (estaFinalizada(outra)) {
      return {
        ...base,
        situacao: cadastroIgual ? "S1" : "S2",
        motivo: cadastroIgual
          ? "Mesma geometria e mesmo cadastro de uma requisição finalizada do mesmo solicitante."
          : "Mesma geometria de uma requisição finalizada do mesmo solicitante, com cadastro diferente.",
      };
    }
    if (cadastroIgual && emAndamentoSemProcesso(outra)) {
      return {
        ...base,
        situacao: "S3",
        motivo: "Mesma geometria e mesmo cadastro de outra requisição em andamento do mesmo solicitante.",
      };
    }
  }

  let motivo: string;
  if (relacao === "SOBREPOSICAO") {
    motivo = `Sobreposição parcial${descreverFracao(fracao)}.`;
  } else if (!mesmoSolicitante) {
    motivo = "Mesma geometria de requisição de outro solicitante.";
  } else {
    motivo = outra.processId
      ? "Mesma geometria de requisição do mesmo solicitante que já tem processo aberto."
      : "Mesma geometria de requisição do mesmo solicitante, com cadastro diferente.";
  }
  return { ...base, situacao: "S4", motivo };
}

const PRIORIDADE: Record<SituacaoDuplicidade, number> = { S3: 0, S1: 1, S2: 2, S4: 3 };

/**
 * Entre as repetições achadas, escolhe a que vira pergunta ao solicitante: a de maior
 * prioridade (S3, S1, S2) e, no empate, a mais recente. O resto fica só como sobreposição.
 */
export function escolherPergunta(achados: Achado[]): { pergunta: Achado | null; demais: Achado[] } {
  const candidatas = achados
    .filter((a) => a.situacao !== "S4")
    .sort(
      (x, y) =>
        PRIORIDADE[x.situacao] - PRIORIDADE[y.situacao] ||
        y.outra.createdAt.getTime() - x.outra.createdAt.getTime() ||
        x.outra.id.localeCompare(y.outra.id)
    );
  const pergunta = candidatas[0] ?? null;
  return { pergunta, demais: achados.filter((a) => a !== pergunta) };
}

/** Chave fixa da pergunta: gravar de novo nunca duplica a mensagem. */
export function chaveDuplicidade(situacao: SituacaoDuplicidade, idOutra: string): string {
  return `DUP:${situacao}:${idOutra}`;
}

export function lerChaveDuplicidade(
  chave: string | null | undefined
): { situacao: SituacaoDuplicidade; idOutra: string } | null {
  const m = /^DUP:(S[1-4]):(.+)$/.exec(chave ?? "");
  return m ? { situacao: m[1] as SituacaoDuplicidade, idOutra: m[2] } : null;
}

export const OPCOES_RESPOSTA_UNICA = [
  { id: "seguir", rotulo: "Sim, quero uma nova certidão" },
  { id: "arquivar", rotulo: "Não, arquivar esta requisição" },
];

export function opcoesDaPergunta(situacao: SituacaoDuplicidade, protocoloEsta: string, protocoloOutra: string) {
  if (situacao === "S3") {
    return [
      { id: "manter_esta", rotulo: `Manter esta (${protocoloEsta})` },
      { id: "manter_outra", rotulo: `Manter a outra (${protocoloOutra})` },
    ];
  }
  return OPCOES_RESPOSTA_UNICA;
}

function dataCurta(d: Date | null): string {
  return d ? d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";
}

/** Texto da pergunta no chat da requisição `esta`, sobre a requisição `achado.outra`. */
export function textoDaPergunta(achado: Achado, protocoloEsta: string): string {
  const outra = achado.outra.protocolo;
  if (achado.situacao === "S3") {
    return `Você tem duas requisições iguais em andamento para o mesmo imóvel: ${protocoloEsta} e ${outra}. Qual delas você quer manter? A outra será arquivada.`;
  }
  const quando = achado.outra.finalizadaEm ? `, finalizada em ${dataCurta(achado.outra.finalizadaEm)}` : "";
  if (achado.situacao === "S2") {
    return `Encontramos a certidão ${outra}${quando}, para o mesmo imóvel, mas com dados de cadastro diferentes dos desta requisição. Você quer solicitar uma nova certidão mesmo assim?`;
  }
  return `Encontramos a certidão ${outra}${quando}, para o mesmo imóvel. Você quer solicitar uma nova certidão mesmo assim?`;
}

export interface SobreposicaoRegistro {
  id: string;
  protocolo: string;
  situacao: SituacaoDuplicidade;
  motivo: string;
}

export function paraRegistroSobreposicao(achado: Achado): SobreposicaoRegistro {
  return {
    id: achado.outra.id,
    protocolo: achado.outra.protocolo,
    situacao: achado.situacao,
    motivo: achado.motivo,
  };
}

export function lerSobreposicao(json: string | null | undefined): SobreposicaoRegistro[] {
  if (!json) return [];
  try {
    const lista: unknown = JSON.parse(json);
    if (!Array.isArray(lista)) return [];
    return lista.filter(
      (o): o is SobreposicaoRegistro =>
        typeof o?.id === "string" && typeof o?.protocolo === "string" && typeof o?.motivo === "string"
    );
  } catch {
    return [];
  }
}
