/**
 * Formulario orientado para solicitacao de CJT.
 *
 * Implementa a Especificacao Funcional "Formulario orientado para solicitacao
 * de CJT" v1.0 (27/08/2026): perguntas 1 a 3, matriz das 12 combinacoes validas
 * (perguntas 2 x 3) e os campos dinamicos da pergunta 4, com as validacoes
 * usadas tanto no cliente quanto na API (campos fora da combinacao ativa nunca
 * sao persistidos nem transmitidos).
 */

export const QUALIDADE_OPCOES = [
  { codigo: "1a", label: "Representante", bloqueia: false },
  { codigo: "1b", label: "Proprietário", bloqueia: false },
  { codigo: "1c", label: "Não sei", bloqueia: true },
] as const;

export const RESULTADO_OPCOES = [
  { codigo: "2a", label: "Matrícula", bloqueia: false },
  { codigo: "2b", label: "Gleba", bloqueia: false },
  { codigo: "2c", label: "Área", bloqueia: false },
  { codigo: "2d", label: "Não sei", bloqueia: true },
] as const;

export const SITUACAO_OPCOES = [
  { codigo: "3a", label: "Espólio", bloqueia: false },
  { codigo: "3b", label: "Usucapião", bloqueia: false },
  { codigo: "3c", label: "Espólio com usucapião", bloqueia: false },
  { codigo: "3d", label: "Regular/comum", bloqueia: false },
  { codigo: "3e", label: "Não sei", bloqueia: true },
] as const;

export type QualidadeCodigo = (typeof QUALIDADE_OPCOES)[number]["codigo"];
export type ResultadoCodigo = (typeof RESULTADO_OPCOES)[number]["codigo"];
export type SituacaoCodigo = (typeof SITUACAO_OPCOES)[number]["codigo"];

export const MENSAGEM_NAO_SEI =
  "Não é possível continuar com “Não sei”. Consulte as instruções do site ou " +
  "o atendimento do IGC para identificar a informação antes de prosseguir.";

export const LIMITE_NOME_POLIGONO = 15;
export const ALERTA_QTD_POLIGONOS = 15;

export type CampoCjt =
  | "propriedadeDe"
  | "matricula"
  | "qtdPoligonos"
  | "nomesPoligonos"
  | "codigoIncra";

export interface FormularioCjt {
  qualidade: QualidadeCodigo | "";
  resultado: ResultadoCodigo | "";
  situacao: SituacaoCodigo | "";
  propriedadeDe: string;
  matricula: string;
  qtdPoligonos: string;
  nomesPoligonos: string[];
  codigoIncra: string;
  declaracao: boolean;
}

export function formularioVazio(): FormularioCjt {
  return {
    qualidade: "",
    resultado: "",
    situacao: "",
    propriedadeDe: "",
    matricula: "",
    qtdPoligonos: "",
    nomesPoligonos: [],
    codigoIncra: "",
    declaracao: false,
  };
}

/** Situacoes em que o campo "Propriedade de" aparece (secoes 5, 7 e 8). */
const SITUACOES_COM_PROPRIETARIO: SituacaoCodigo[] = ["3a", "3c", "3d"];

/** Situacoes em que o prefixo fixo "Espólio de" precede o nome informado. */
const SITUACOES_ESPOLIO: SituacaoCodigo[] = ["3a", "3c"];

export const PREFIXO_ESPOLIO = "Espólio de";

export function bloqueiaAvanco(form: FormularioCjt): boolean {
  return form.qualidade === "1c" || form.resultado === "2d" || form.situacao === "3e";
}

export function combinacaoDefinida(form: FormularioCjt): boolean {
  return Boolean(form.qualidade && form.resultado && form.situacao) && !bloqueiaAvanco(form);
}

export function exigeEspolio(situacao: SituacaoCodigo | ""): boolean {
  return SITUACOES_ESPOLIO.includes(situacao as SituacaoCodigo);
}

/**
 * Campos da pergunta 4 aplicaveis a combinacao ativa (matriz-resumo da secao 3).
 * Depende exclusivamente das respostas 2 e 3.
 */
export function camposAplicaveis(
  resultado: ResultadoCodigo | "",
  situacao: SituacaoCodigo | ""
): CampoCjt[] {
  if (!resultado || !situacao || resultado === "2d" || situacao === "3e") return [];

  const campos: CampoCjt[] = [];
  if (SITUACOES_COM_PROPRIETARIO.includes(situacao as SituacaoCodigo)) {
    campos.push("propriedadeDe");
  }
  if (resultado === "2a" || resultado === "2b") {
    campos.push("matricula");
  }
  if (resultado === "2b") {
    campos.push("qtdPoligonos", "nomesPoligonos");
  }
  campos.push("codigoIncra");
  return campos;
}

/** Remove valores de campos que deixaram de pertencer a combinacao ativa. */
export function limparCamposNaoAplicaveis(form: FormularioCjt): FormularioCjt {
  const campos = camposAplicaveis(form.resultado, form.situacao);
  const limpo: FormularioCjt = { ...form };
  if (!campos.includes("propriedadeDe")) limpo.propriedadeDe = "";
  if (!campos.includes("matricula")) limpo.matricula = "";
  if (!campos.includes("qtdPoligonos")) limpo.qtdPoligonos = "";
  if (!campos.includes("nomesPoligonos")) limpo.nomesPoligonos = [];
  if (!campos.includes("codigoIncra")) limpo.codigoIncra = "";
  return limpo;
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export const LIMITE_DIGITOS_INCRA = 13;

/** Algarismos do codigo INCRA/SNCR, limitados ao tamanho do cadastro. */
export function digitosIncra(valor: string): string {
  return somenteDigitos(valor).slice(0, LIMITE_DIGITOS_INCRA);
}

function codigoValido(
  codigo: string,
  opcoes: ReadonlyArray<{ codigo: string }>
): boolean {
  return opcoes.some((o) => o.codigo === codigo);
}

/** Quantidade de poligonos aceita apenas inteiro positivo, sem decimais. */
function quantidadeValida(valor: string): boolean {
  return /^\d+$/.test(valor.trim()) && parseInt(valor, 10) >= 1;
}

/** Aplica a mascara xxx.xxx.xxx.xxx-x sobre os digitos do codigo INCRA/SNCR. */
export function mascaraIncra(valor: string): string {
  const d = digitosIncra(valor);
  const partes = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9, 12)].filter(Boolean);
  const mascarado = partes.join(".");
  return d.length > 12 ? `${mascarado}-${d.slice(12)}` : mascarado;
}

export function ajustarNomesPoligonos(nomes: string[], quantidade: number): string[] {
  const alvo = Number.isFinite(quantidade) && quantidade > 0 ? Math.floor(quantidade) : 0;
  const ajustado = nomes.slice(0, alvo);
  while (ajustado.length < alvo) ajustado.push("");
  return ajustado;
}

export type ErrosCjt = Partial<Record<keyof FormularioCjt | "combinacao", string>>;

export function validarFormulario(form: FormularioCjt): ErrosCjt {
  const erros: ErrosCjt = {};

  if (!codigoValido(form.qualidade, QUALIDADE_OPCOES)) erros.qualidade = "Selecione uma opção.";
  if (!codigoValido(form.resultado, RESULTADO_OPCOES)) erros.resultado = "Selecione uma opção.";
  if (!codigoValido(form.situacao, SITUACAO_OPCOES)) erros.situacao = "Selecione uma opção.";
  if (bloqueiaAvanco(form)) erros.combinacao = MENSAGEM_NAO_SEI;
  if (Object.keys(erros).length > 0) return erros;

  const campos = camposAplicaveis(form.resultado, form.situacao);

  if (campos.includes("propriedadeDe")) {
    const nome = form.propriedadeDe.trim();
    if (!nome) {
      erros.propriedadeDe = exigeEspolio(form.situacao)
        ? "Informe o nome do falecido."
        : "Informe o nome do proprietário.";
    }
  }

  if (campos.includes("matricula")) {
    const digitos = somenteDigitos(form.matricula);
    if (!digitos) erros.matricula = "Informe o número da matrícula (somente algarismos).";
  }

  if (campos.includes("qtdPoligonos")) {
    if (!quantidadeValida(form.qtdPoligonos)) {
      erros.qtdPoligonos = "Informe um número inteiro igual ou superior a 1.";
    } else {
      const qtd = parseInt(form.qtdPoligonos, 10);
      const nomes = form.nomesPoligonos.map((n) => n.trim());
      if (nomes.length !== qtd) {
        erros.nomesPoligonos = "Informe um nome para cada polígono.";
      } else if (nomes.some((n) => !n)) {
        erros.nomesPoligonos = "Nenhum nome de gleba/polígono pode ficar vazio.";
      } else if (nomes.some((n) => n.length > LIMITE_NOME_POLIGONO)) {
        erros.nomesPoligonos = `Cada nome deve ter até ${LIMITE_NOME_POLIGONO} caracteres.`;
      } else if (new Set(nomes.map((n) => n.toLowerCase())).size !== nomes.length) {
        erros.nomesPoligonos = "Não repita nomes de gleba/polígono na mesma solicitação.";
      }
    }
  }

  if (campos.includes("codigoIncra")) {
    const digitos = somenteDigitos(form.codigoIncra);
    if (digitos.length > 0 && digitos.length !== LIMITE_DIGITOS_INCRA) {
      erros.codigoIncra = "O código INCRA/SNCR deve ter 13 algarismos.";
    }
  }

  if (!form.declaracao) {
    erros.declaracao =
      "É necessário declarar que as informações e a documentação estão de acordo com as instruções do site.";
  }

  return erros;
}

export interface DadosCjtPersistidos {
  cjtQualidade: string;
  cjtResultado: string;
  cjtSituacao: string;
  cjtPropriedadeDe: string | null;
  cjtMatricula: string | null;
  cjtQtdPoligonos: number | null;
  cjtNomesPoligonos: string | null;
  cjtCodigoIncra: string | null;
  cjtDeclaracaoAceita: boolean;
}

/**
 * Normaliza o formulario para persistencia: apenas os campos da combinacao
 * ativa, matricula/INCRA em algarismos e nomes de poligono como JSON.
 */
export function normalizarParaPersistencia(form: FormularioCjt): DadosCjtPersistidos {
  const limpo = limparCamposNaoAplicaveis(form);
  const campos = camposAplicaveis(limpo.resultado, limpo.situacao);
  const qtd = quantidadeValida(limpo.qtdPoligonos) ? parseInt(limpo.qtdPoligonos, 10) : NaN;
  const incra = somenteDigitos(limpo.codigoIncra);

  return {
    cjtQualidade: limpo.qualidade,
    cjtResultado: limpo.resultado,
    cjtSituacao: limpo.situacao,
    cjtPropriedadeDe: campos.includes("propriedadeDe")
      ? limpo.propriedadeDe.trim() || null
      : null,
    cjtMatricula: campos.includes("matricula") ? somenteDigitos(limpo.matricula) || null : null,
    cjtQtdPoligonos: campos.includes("qtdPoligonos") && Number.isInteger(qtd) ? qtd : null,
    cjtNomesPoligonos: campos.includes("nomesPoligonos")
      ? JSON.stringify(limpo.nomesPoligonos.map((n) => n.trim()))
      : null,
    cjtCodigoIncra:
      campos.includes("codigoIncra") && incra.length === LIMITE_DIGITOS_INCRA ? incra : null,
    cjtDeclaracaoAceita: limpo.declaracao,
  };
}

/** Reconstroi o formulario a partir do corpo JSON recebido pela API. */
export function formularioDoPayload(raw: unknown): FormularioCjt {
  const bruto = (raw ?? {}) as Record<string, unknown>;
  const texto = (valor: unknown): string => (typeof valor === "string" ? valor : "");
  const nomes = Array.isArray(bruto.nomesPoligonos)
    ? bruto.nomesPoligonos.map((n) => texto(n))
    : [];

  return {
    qualidade: texto(bruto.qualidade) as FormularioCjt["qualidade"],
    resultado: texto(bruto.resultado) as FormularioCjt["resultado"],
    situacao: texto(bruto.situacao) as FormularioCjt["situacao"],
    propriedadeDe: texto(bruto.propriedadeDe),
    matricula: texto(bruto.matricula),
    qtdPoligonos:
      typeof bruto.qtdPoligonos === "number"
        ? String(bruto.qtdPoligonos)
        : texto(bruto.qtdPoligonos),
    nomesPoligonos: nomes,
    codigoIncra: texto(bruto.codigoIncra),
    declaracao: bruto.declaracao === true,
  };
}

/** Primeira mensagem de erro da validacao, para resposta HTTP 400. */
export function primeiroErro(erros: ErrosCjt): string | null {
  const valores = Object.values(erros).filter(Boolean);
  return valores.length > 0 ? (valores[0] as string) : null;
}

export function rotuloOpcao(codigo: string | null | undefined): string {
  if (!codigo) return "—";
  const todas = [...QUALIDADE_OPCOES, ...RESULTADO_OPCOES, ...SITUACAO_OPCOES];
  return todas.find((o) => o.codigo === codigo)?.label ?? codigo;
}

/** Nome do proprietario como deve constar na certidao (prefixo do espolio). */
export function propriedadeDeExibicao(
  situacao: string | null | undefined,
  propriedadeDe: string | null | undefined
): string | null {
  if (!propriedadeDe) return null;
  return exigeEspolio((situacao ?? "") as SituacaoCodigo)
    ? `${PREFIXO_ESPOLIO} ${propriedadeDe}`
    : propriedadeDe;
}
