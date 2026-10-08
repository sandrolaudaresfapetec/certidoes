/**
 * Nível de complexidade 1 a 9 do processo (#PEND-32). O corte de divisas SUGERE o nível e o
 * técnico responsável confirma ou muda; o solicitante só vê o número depois da confirmação.
 *
 * Regra do documento do cliente: longe da divisa 1 ou 2; na divisa com divisa finalizada 3 ou 4;
 * divisa simples não finalizada 5 ou 6; tríplice não finalizada 7 ou 8; reta, foz, quádrupla,
 * quíntupla ou zona de conflito 9. Ímpar = um polígono, par = vários (o 9 não tem par).
 *
 * Hipóteses do time (docs/atendimento-cjt-pedidos-restantes.md, #PEND-53 e #PEND-55):
 *  - imóvel no corredor de 1 km sem cortar a divisa conta como "longe";
 *  - rio continua no nível 9, por cautela (era o pior caso no código);
 *  - tríplice finalizada cai em 3 ou 4 ("na divisa com divisa finalizada");
 *  - cortando mais de uma linha, vale a mais difícil;
 *  - linha sem `finalizada` conta como não finalizada.
 */

export const NIVEL_MINIMO = 1;
export const NIVEL_MAXIMO = 9;

/** Tipos de linha que levam sempre ao nível 9. */
export const TIPOS_NIVEL_MAXIMO: readonly string[] = [
  "QUADRUPLA",
  "QUINTUPLA",
  "RETA",
  "FOZ",
  "CONFLITO",
  "RIO",
];

export const TIPOS_LINHA = [
  "DIVISA_MUNICIPAL",
  "TRIPLICE",
  "QUADRUPLA",
  "QUINTUPLA",
  "RIO",
  "RETA",
  "FOZ",
  "CONFLITO",
] as const;

export interface LinhaParaNivel {
  tipo: string;
  finalizada?: boolean | null;
  municipios?: string[];
}

export interface SugestaoNivel {
  nivel: number;
  /** Texto curto para a equipe: de onde veio a sugestão. */
  motivo: string;
}

function nivelBaseDaLinha(linha: LinhaParaNivel, tripliceDeFato: boolean): { base: number; rotulo: string } {
  const finalizada = Boolean(linha.finalizada);
  if (TIPOS_NIVEL_MAXIMO.includes(linha.tipo)) {
    return { base: 9, rotulo: rotuloTipo(linha.tipo) };
  }
  if (linha.tipo === "TRIPLICE" || tripliceDeFato) {
    return finalizada
      ? { base: 3, rotulo: "divisa tríplice finalizada" }
      : { base: 7, rotulo: "divisa tríplice não finalizada" };
  }
  return finalizada
    ? { base: 3, rotulo: "divisa finalizada" }
    : { base: 5, rotulo: "divisa simples não finalizada" };
}

function rotuloTipo(tipo: string): string {
  switch (tipo) {
    case "QUADRUPLA":
      return "divisa quádrupla";
    case "QUINTUPLA":
      return "divisa quíntupla";
    case "RETA":
      return "divisa reta";
    case "FOZ":
      return "foz";
    case "CONFLITO":
      return "zona de conflito";
    case "RIO":
      return "rio como divisa";
    default:
      return "divisa";
  }
}

/**
 * Sugere o nível a partir das linhas de divisa que o imóvel cruza e do número de polígonos.
 * Sem linha cruzada o imóvel está longe da divisa (níveis 1 e 2).
 */
export function sugerirNivel(dados: {
  linhasCortadas: LinhaParaNivel[];
  qtdPoligonos: number;
}): SugestaoNivel {
  const varios = dados.qtdPoligonos > 1;
  const poligonos = varios ? `${dados.qtdPoligonos} polígonos` : "1 polígono";

  if (dados.linhasCortadas.length === 0) {
    return { nivel: varios ? 2 : 1, motivo: `longe da divisa, ${poligonos}` };
  }

  // Três ou mais municípios no conjunto de linhas cortadas equivale a uma tríplice.
  const municipios = new Set(dados.linhasCortadas.flatMap((l) => l.municipios ?? []));
  const tripliceDeFato = municipios.size >= 3;

  let pior = { base: 0, rotulo: "" };
  for (const linha of dados.linhasCortadas) {
    const atual = nivelBaseDaLinha(linha, tripliceDeFato);
    if (atual.base > pior.base) pior = atual;
  }

  if (pior.base >= NIVEL_MAXIMO) {
    return { nivel: NIVEL_MAXIMO, motivo: `${pior.rotulo}, ${poligonos}` };
  }
  return { nivel: pior.base + (varios ? 1 : 0), motivo: `${pior.rotulo}, ${poligonos}` };
}

/** Quantos polígonos tem a geometria do imóvel (`Polygon` = 1; `MultiPolygon` = quantas partes). */
export function contarPoligonos(geometria: unknown): number {
  const g = geometria as { type?: string; coordinates?: unknown[]; geometry?: unknown } | null;
  if (!g) return 1;
  if (g.type === "Feature" && g.geometry) return contarPoligonos(g.geometry);
  if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) return Math.max(1, g.coordinates.length);
  return 1;
}

export function nivelValido(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= NIVEL_MINIMO && valor <= NIVEL_MAXIMO;
}

/**
 * Valor vindo de uma requisição: número 1 a 9, ou `null` (vazio, para retirar o nível).
 * Aceita texto numérico de formulário.
 */
export function lerNivel(valor: unknown): { ok: true; nivel: number | null } | { ok: false; erro: string } {
  if (valor === null || valor === undefined || valor === "") return { ok: true, nivel: null };
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (!nivelValido(n)) return { ok: false, erro: `Informe um nível de ${NIVEL_MINIMO} a ${NIVEL_MAXIMO}.` };
  return { ok: true, nivel: n };
}
