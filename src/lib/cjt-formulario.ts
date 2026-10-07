/**
 * Formulario orientado para solicitacao de CJT.
 *
 * Implementa a Especificacao Funcional "Formulario orientado para solicitacao
 * de CJT" v1.0 (27/08/2026): perguntas 1 a 3, matriz das 12 combinacoes validas
 * (perguntas 2 x 3) e os campos dinamicos da pergunta 4, com as validacoes
 * usadas tanto no cliente quanto na API (campos fora da combinacao ativa nunca
 * sao persistidos nem transmitidos).
 */

import { validarCpfOuCnpj } from "./cpf";

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

/** Pergunta 3.1 (usucapião): "Quero informar o número da matrícula?". */
export const INFORMA_MATRICULA_OPCOES = [
  { codigo: "SIM", label: "Sim", bloqueia: false },
  { codigo: "NAO", label: "Não", bloqueia: false },
  { codigo: "NAO_SEI", label: "Não sei", bloqueia: true },
] as const;

export type QualidadeCodigo = (typeof QUALIDADE_OPCOES)[number]["codigo"];
export type ResultadoCodigo = (typeof RESULTADO_OPCOES)[number]["codigo"];
export type SituacaoCodigo = (typeof SITUACAO_OPCOES)[number]["codigo"];

export const MENSAGEM_NAO_SEI =
  "Não é possível continuar com “Não sei”. Consulte as instruções do site ou " +
  "o atendimento do IGC para identificar a informação antes de prosseguir.";

export const LIMITE_NOME_POLIGONO = 15;
export const ALERTA_QTD_POLIGONOS = 6;

/**
 * Acima disso o pedido não segue o fluxo normal: fica congelado até a DDD liberar (#PEND-31).
 * Enquanto o congelamento não existe, o servidor recusa o envio.
 */
export const LIMITE_POLIGONOS_ENVIO = 12;

/** Teto por solicitação, mesmo liberada pela DDD. */
export const LIMITE_POLIGONOS_MAXIMO = 100;

/** Valor gravado em `cjtMatricula` quando o solicitante não tem o número (usucapião). */
export const MATRICULA_USUCAPIAO = "Usucapião";

/** Resposta de "Quero informar o número da matrícula?" (usucapião, situações 3b e 3c). */
export type InformaMatricula = "SIM" | "NAO" | "NAO_SEI";

export type CampoCjt =
  | "propriedadeDe"
  | "informaMatricula"
  | "matricula"
  | "qtdPoligonos"
  | "nomesPoligonos"
  | "codigoIncra";

export interface FormularioCjt {
  qualidade: QualidadeCodigo | "";
  resultado: ResultadoCodigo | "";
  situacao: SituacaoCodigo | "";
  propriedadeDe: string;
  informaMatricula: InformaMatricula | "";
  matricula: string;
  qtdPoligonos: string;
  nomesPoligonos: string[];
  /** Parcela do SIGEF de cada polígono, na mesma ordem dos nomes (gleba com 2 ou mais). */
  parcelasPoligonos: string[];
  codigoIncra: string;
  declaracao: boolean;
}

export function formularioVazio(): FormularioCjt {
  return {
    qualidade: "",
    resultado: "",
    situacao: "",
    propriedadeDe: "",
    informaMatricula: "",
    matricula: "",
    qtdPoligonos: "",
    nomesPoligonos: [],
    parcelasPoligonos: [],
    codigoIncra: "",
    declaracao: false,
  };
}

/** Situacoes em que o campo "Propriedade de" aparece (secoes 5, 7 e 8). */
const SITUACOES_COM_PROPRIETARIO: SituacaoCodigo[] = ["3a", "3c", "3d"];

/** Situacoes em que o prefixo fixo "Espólio de" precede o nome informado. */
const SITUACOES_ESPOLIO: SituacaoCodigo[] = ["3a", "3c"];

export const PREFIXO_ESPOLIO = "Espólio de";

/** Situações de usucapião (3b e 3c): abrem a pergunta "Quero informar o número da matrícula?". */
const SITUACOES_USUCAPIAO: SituacaoCodigo[] = ["3b", "3c"];

/**
 * A pergunta da matrícula só existe onde o campo Matrícula existe (resultado por Matrícula
 * ou Gleba) e a situação é de usucapião.
 */
export function perguntaMatriculaAplicavel(
  resultado: ResultadoCodigo | "",
  situacao: SituacaoCodigo | ""
): boolean {
  return (
    (resultado === "2a" || resultado === "2b") &&
    SITUACOES_USUCAPIAO.includes(situacao as SituacaoCodigo)
  );
}

export function bloqueiaAvanco(form: FormularioCjt): boolean {
  return (
    form.qualidade === "1c" ||
    form.resultado === "2d" ||
    form.situacao === "3e" ||
    (perguntaMatriculaAplicavel(form.resultado, form.situacao) &&
      form.informaMatricula === "NAO_SEI")
  );
}

export function combinacaoDefinida(form: FormularioCjt): boolean {
  return (
    Boolean(form.qualidade && form.resultado && form.situacao) &&
    !bloqueiaAvanco(form) &&
    (!perguntaMatriculaAplicavel(form.resultado, form.situacao) || Boolean(form.informaMatricula))
  );
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
  if (perguntaMatriculaAplicavel(resultado, situacao)) {
    campos.push("informaMatricula");
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
  if (!campos.includes("informaMatricula")) limpo.informaMatricula = "";
  if (!campos.includes("matricula")) limpo.matricula = "";
  // "Não" preenche a matrícula com a palavra Usucapião; o literal só vale nesse ramo.
  if (limpo.informaMatricula === "NAO" && campos.includes("matricula")) {
    limpo.matricula = MATRICULA_USUCAPIAO;
  } else if (limpo.matricula === MATRICULA_USUCAPIAO) {
    limpo.matricula = "";
  }
  if (!campos.includes("qtdPoligonos")) limpo.qtdPoligonos = "";
  if (!campos.includes("nomesPoligonos")) {
    limpo.nomesPoligonos = [];
    limpo.parcelasPoligonos = [];
  }
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

export const LIMITE_DIGITOS_CPF_CNPJ = 14;

/** Algarismos de um CPF (11) ou CNPJ (14), limitados ao tamanho do CNPJ. */
export function digitosCpfCnpj(valor: string): string {
  return somenteDigitos(valor).slice(0, LIMITE_DIGITOS_CPF_CNPJ);
}

/**
 * Mascara de CPF (até 11 algarismos: 000.000.000-00) ou de CNPJ (12 a 14:
 * 00.000.000/0000-00), aplicada conforme o usuário digita.
 */
export function mascaraCpfCnpj(valor: string): string {
  const d = digitosCpfCnpj(valor);
  if (d.length <= 11) {
    const base = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(".");
    return d.length > 9 ? `${base}-${d.slice(9)}` : base;
  }
  const base = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}`;
  return d.length > 12 ? `${base}-${d.slice(12)}` : base;
}

/** CPF (11) ou CNPJ (14) com o tamanho completo. */
export function cpfCnpjCompleto(valor: string): boolean {
  const n = somenteDigitos(valor).length;
  return n === 11 || n === 14;
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

/** Tipos de nome de polígono; "" = apenas o complemento (documento do cliente, item 8). */
export type TipoNomePoligono = "Gleba" | "Parte" | "Parcela" | "";

export const LIMITE_COMPLEMENTO = 3;
const PADRAO_COMPLEMENTO = /^[A-Za-z0-9-]{1,3}$/;

/** Separa "Gleba A-1" em tipo e complemento; null quando o nome foge do padrão. */
export function separarNome(nome: string): { tipo: TipoNomePoligono; complemento: string } | null {
  const comTipo = /^(Gleba|Parte|Parcela) (\S+)$/.exec(nome);
  if (comTipo && PADRAO_COMPLEMENTO.test(comTipo[2])) {
    return { tipo: comTipo[1] as TipoNomePoligono, complemento: comTipo[2] };
  }
  return PADRAO_COMPLEMENTO.test(nome) ? { tipo: "", complemento: nome } : null;
}

/** Nomes que aparecem mais de uma vez (sem diferenciar maiúsculas). */
export function nomesRepetidos(nomes: string[]): Set<string> {
  const vistos = new Set<string>();
  const repetidos = new Set<string>();
  for (const n of nomes) {
    const chave = n.trim().toLowerCase();
    if (!chave) continue;
    if (vistos.has(chave)) repetidos.add(chave);
    vistos.add(chave);
  }
  return repetidos;
}

/**
 * Valida a nomenclatura fechada dos polígonos (tipo + complemento de até 3 caracteres).
 * Vale na tela e no servidor (#PEND-36).
 */
export function erroNomenclatura(nomes: string[]): string | null {
  const partes = nomes.map((n) => separarNome(n.trim()));
  if (partes.some((p) => p === null)) {
    return `Informe o complemento de cada polígono: até ${LIMITE_COMPLEMENTO} caracteres, com letras sem acento, números ou “-”.`;
  }
  if (new Set(partes.map((p) => p!.tipo)).size > 1) {
    return "Use o mesmo tipo de nome em todos os polígonos.";
  }
  if (nomesRepetidos(nomes).size > 0) {
    return "Não repita nomes de polígono na mesma solicitação.";
  }
  return null;
}

export type ErrosCjt = Partial<Record<keyof FormularioCjt | "combinacao", string>>;

export function validarFormulario(
  form: FormularioCjt,
  opcoes: { liberado?: boolean; exigirParcelas?: boolean } = {}
): ErrosCjt {
  const erros: ErrosCjt = {};

  if (!codigoValido(form.qualidade, QUALIDADE_OPCOES)) erros.qualidade = "Selecione uma opção.";
  if (!codigoValido(form.resultado, RESULTADO_OPCOES)) erros.resultado = "Selecione uma opção.";
  if (!codigoValido(form.situacao, SITUACAO_OPCOES)) erros.situacao = "Selecione uma opção.";
  if (bloqueiaAvanco(form)) erros.combinacao = MENSAGEM_NAO_SEI;
  if (Object.keys(erros).length > 0) return erros;

  // O servidor deriva o que a combinação ativa define (ex.: matrícula "Usucapião" no ramo Não).
  form = limparCamposNaoAplicaveis(form);
  const campos = camposAplicaveis(form.resultado, form.situacao);

  if (campos.includes("informaMatricula") && !form.informaMatricula) {
    erros.informaMatricula = "Selecione uma opção.";
  }

  if (campos.includes("propriedadeDe")) {
    const nome = form.propriedadeDe.trim();
    if (!nome) {
      erros.propriedadeDe = exigeEspolio(form.situacao)
        ? "Informe o nome do falecido."
        : "Informe o nome do proprietário.";
    }
  }

  if (campos.includes("matricula") && form.informaMatricula !== "NAO") {
    const matricula = form.matricula.trim();
    if (!matricula) {
      erros.matricula = "Informe o número da matrícula (somente algarismos).";
    } else if (!/^\d+$/.test(matricula)) {
      erros.matricula = "A matrícula deve ter somente algarismos.";
    }
  }

  if (campos.includes("qtdPoligonos")) {
    if (!quantidadeValida(form.qtdPoligonos)) {
      erros.qtdPoligonos = "Informe um número inteiro igual ou superior a 1.";
    } else {
      const qtd = parseInt(form.qtdPoligonos, 10);
      const nomes = form.nomesPoligonos.map((n) => n.trim());
      if (qtd > LIMITE_POLIGONOS_MAXIMO) {
        erros.qtdPoligonos = `O máximo é ${LIMITE_POLIGONOS_MAXIMO} polígonos por solicitação. Fale com o atendimento do IGC.`;
      } else if (qtd > LIMITE_POLIGONOS_ENVIO && !opcoes.liberado) {
        erros.qtdPoligonos =
          "Pedidos com 13 ou mais polígonos exigem análise da DDD antes de continuar. Use “Enviar para análise da DDD” para que a equipe libere o preenchimento.";
      } else if (nomes.length !== qtd) {
        erros.nomesPoligonos = "Informe um nome para cada polígono.";
      } else if (nomes.some((n) => !n)) {
        erros.nomesPoligonos = "Nenhum nome de gleba/polígono pode ficar vazio.";
      } else if (nomes.some((n) => n.length > LIMITE_NOME_POLIGONO)) {
        erros.nomesPoligonos = `Cada nome deve ter até ${LIMITE_NOME_POLIGONO} caracteres.`;
      } else {
        const erroNomes = erroNomenclatura(nomes);
        if (erroNomes) erros.nomesPoligonos = erroNomes;
      }
    }
  }

  // Gleba com 2 ou mais polígonos e imóvel do SIGEF: cada polígono indica a sua parcela (#PEND-34).
  if (
    campos.includes("nomesPoligonos") &&
    opcoes.exigirParcelas &&
    form.nomesPoligonos.length >= 2 &&
    !erros.qtdPoligonos &&
    !erros.nomesPoligonos
  ) {
    const erroParcelas = erroParcelasPoligonos(form.parcelasPoligonos, form.nomesPoligonos.length);
    if (erroParcelas) erros.parcelasPoligonos = erroParcelas;
  }

  if (campos.includes("codigoIncra")) {
    const digitos = somenteDigitos(form.codigoIncra);
    if (digitos.length > 0 && digitos.length !== LIMITE_DIGITOS_INCRA) {
      erros.codigoIncra = "O código INCRA deve ter 13 algarismos.";
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
  cjtInformaMatricula: string | null;
  cjtMatricula: string | null;
  cjtQtdPoligonos: number | null;
  cjtNomesPoligonos: string | null;
  cjtPoligonos: string | null;
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
    cjtInformaMatricula:
      campos.includes("informaMatricula") &&
      (limpo.informaMatricula === "SIM" || limpo.informaMatricula === "NAO")
        ? limpo.informaMatricula
        : null,
    cjtMatricula: !campos.includes("matricula")
      ? null
      : limpo.informaMatricula === "NAO"
        ? MATRICULA_USUCAPIAO
        : somenteDigitos(limpo.matricula) || null,
    cjtQtdPoligonos: campos.includes("qtdPoligonos") && Number.isInteger(qtd) ? qtd : null,
    cjtNomesPoligonos: campos.includes("nomesPoligonos")
      ? JSON.stringify(limpo.nomesPoligonos.map((n) => n.trim()))
      : null,
    cjtPoligonos: campos.includes("nomesPoligonos")
      ? poligonosJson(limpo.nomesPoligonos, limpo.parcelasPoligonos)
      : null,
    cjtCodigoIncra:
      campos.includes("codigoIncra") && incra.length === LIMITE_DIGITOS_INCRA ? incra : null,
    cjtDeclaracaoAceita: limpo.declaracao,
  };
}

export interface DadosCjtRascunho {
  cjtQualidade: string | null;
  cjtResultado: string | null;
  cjtSituacao: string | null;
  cjtPropriedadeDe: string | null;
  cjtInformaMatricula: string | null;
  cjtMatricula: string | null;
  cjtQtdPoligonos: number | null;
  cjtNomesPoligonos: string | null;
  cjtPoligonos: string | null;
  cjtCodigoIncra: string | null;
  cjtDeclaracaoAceita: boolean;
}

const LIMITE_TEXTO_RASCUNHO = 300;
const LIMITE_POLIGONOS_RASCUNHO = 100;

/**
 * Rascunho (#PEND-42): guarda o que o solicitante já respondeu, sem exigir nada. Respostas
 * fora das opções, textos enormes e campos que não pertencem à combinação ativa são
 * descartados; o envio de verdade valida tudo com `validarFormulario`.
 */
export function normalizarRascunho(form: FormularioCjt): DadosCjtRascunho {
  const limpo = limparCamposNaoAplicaveis(form);
  const codigo = (valor: string, opcoes: readonly { codigo: string }[]) =>
    opcoes.some((o) => o.codigo === valor) ? valor : null;
  const qtd = quantidadeValida(limpo.qtdPoligonos) ? parseInt(limpo.qtdPoligonos, 10) : NaN;
  const nomes = limpo.nomesPoligonos
    .slice(0, LIMITE_POLIGONOS_RASCUNHO)
    .map((n) => n.trim().slice(0, LIMITE_NOME_POLIGONO));
  const informa =
    limpo.informaMatricula === "SIM" || limpo.informaMatricula === "NAO"
      ? limpo.informaMatricula
      : null;

  return {
    cjtQualidade: codigo(limpo.qualidade, QUALIDADE_OPCOES),
    cjtResultado: codigo(limpo.resultado, RESULTADO_OPCOES),
    cjtSituacao: codigo(limpo.situacao, SITUACAO_OPCOES),
    cjtPropriedadeDe: limpo.propriedadeDe.trim().slice(0, LIMITE_TEXTO_RASCUNHO) || null,
    cjtInformaMatricula: informa,
    cjtMatricula:
      informa === "NAO"
        ? MATRICULA_USUCAPIAO
        : somenteDigitos(limpo.matricula).slice(0, 30) || null,
    cjtQtdPoligonos: Number.isInteger(qtd) && qtd <= LIMITE_POLIGONOS_RASCUNHO ? qtd : null,
    cjtNomesPoligonos: nomes.some(Boolean) ? JSON.stringify(nomes) : null,
    cjtPoligonos: poligonosJson(nomes, limpo.parcelasPoligonos.map((p) => p.trim().slice(0, 60))),
    cjtCodigoIncra: somenteDigitos(limpo.codigoIncra).slice(0, LIMITE_DIGITOS_INCRA) || null,
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
    informaMatricula: texto(bruto.informaMatricula) as FormularioCjt["informaMatricula"],
    matricula: texto(bruto.matricula),
    qtdPoligonos:
      typeof bruto.qtdPoligonos === "number"
        ? String(bruto.qtdPoligonos)
        : texto(bruto.qtdPoligonos),
    nomesPoligonos: nomes,
    parcelasPoligonos: Array.isArray(bruto.parcelasPoligonos)
      ? bruto.parcelasPoligonos.map((p) => texto(p))
      : [],
    codigoIncra: texto(bruto.codigoIncra),
    declaracao: bruto.declaracao === true,
  };
}

/**
 * Representação (#PEND-44): quem escolhe "Representante" na Pergunta 1 informa o CPF ou CNPJ
 * (com dígitos verificadores válidos) e o nome de quem representa. Quem é proprietário não
 * representa ninguém: os dados de representação, se vierem, são descartados.
 */
export function validarRepresentacao(dados: {
  qualidade: string;
  emNomeDeCpf: unknown;
  emNomeDeNome: unknown;
}): { ok: true; cpf: string | null; nome: string | null } | { ok: false; erro: string } {
  if (dados.qualidade !== "1a") return { ok: true, cpf: null, nome: null };

  const cpf = typeof dados.emNomeDeCpf === "string" ? somenteDigitos(dados.emNomeDeCpf) : "";
  const nome = typeof dados.emNomeDeNome === "string" ? dados.emNomeDeNome.trim() : "";
  if (!cpf) return { ok: false, erro: "Informe o CPF ou CNPJ do proprietário representado." };
  if (!validarCpfOuCnpj(cpf)) {
    return { ok: false, erro: "O CPF ou CNPJ do proprietário representado é inválido." };
  }
  if (nome.length < 2) return { ok: false, erro: "Informe o nome do proprietário representado." };
  return { ok: true, cpf, nome };
}

/** Polígono nomeado ligado à parcela do SIGEF (gleba com 2 ou mais polígonos). */
export interface PoligonoVinculado {
  nome: string;
  parcelaCodigo: string | null;
  nomeArea?: string | null;
  areaHa?: number | null;
}

/** Todo polígono indica uma parcela, e cada parcela só pode ser usada uma vez. */
export function erroParcelasPoligonos(parcelas: string[], quantidade: number): string | null {
  const lista = Array.from({ length: quantidade }, (_, i) => (parcelas[i] ?? "").trim());
  if (lista.some((p) => !p)) return "Indique a parcela de cada polígono.";
  if (new Set(lista).size !== lista.length) return "Cada polígono precisa de uma parcela diferente.";
  return null;
}

/** Pares nome/parcela em JSON; null quando nenhuma parcela foi indicada. */
export function poligonosJson(nomes: string[], parcelas: string[]): string | null {
  const pares: PoligonoVinculado[] = nomes.map((nome, i) => ({
    nome: nome.trim(),
    parcelaCodigo: (parcelas[i] ?? "").trim() || null,
  }));
  return pares.some((p) => p.parcelaCodigo) ? JSON.stringify(pares) : null;
}

/**
 * Polígonos de uma requisição: os pares guardados (`cjtPoligonos`) ou, nas requisições
 * antigas, só os nomes (`cjtNomesPoligonos`), sem parcela.
 */
export function lerPoligonos(
  cjtPoligonos: string | null | undefined,
  cjtNomesPoligonos: string | null | undefined
): PoligonoVinculado[] {
  const tentar = (json: string | null | undefined): unknown => {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  };
  const pares = tentar(cjtPoligonos);
  if (Array.isArray(pares)) {
    return pares
      .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
      .map((p) => ({
        nome: String(p.nome ?? ""),
        parcelaCodigo: typeof p.parcelaCodigo === "string" ? p.parcelaCodigo : null,
        nomeArea: typeof p.nomeArea === "string" ? p.nomeArea : null,
        areaHa: typeof p.areaHa === "number" ? p.areaHa : null,
      }));
  }
  const nomes = tentar(cjtNomesPoligonos);
  return Array.isArray(nomes) ? nomes.map((n) => ({ nome: String(n), parcelaCodigo: null })) : [];
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
