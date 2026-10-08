import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioApi, podeAtender } from "@/lib/auth";

/**
 * Campos editaveis pelo Atendimento. Situacao, datas de assinatura e autoria
 * ficam fora: sao gravadas apenas por /api/workflow a partir da sessao.
 */
const CAMPOS_EDITAVEIS = [
  "tipoServico", "expediente", "anoEntrada", "tipo", "interessado", "email",
  "telefone", "cpfCnpj", "municipio", "ra", "dra", "pasta", "utm", "base",
  "departamento", "observacaoEntrada", "observacoesTecnico", "taxaAbertura",
  "taxaVistoria", "servicoTecGabinete", "servicoTecCampo", "tecnicoRespId", "tecnicoConfId", "divisaDificuldade",
  "nivelPrioridade", "statusEscritorio", "quemVaiAssinar", "numeroSaidaIGC",
  "dtAbertoSei", "dtCompile", "dtNascimentoIdoso", "dtEmail", "dtVisita1",
  "dtVisita2",
];

const CAMPOS_DATA = [
  "dtAbertoSei", "dtCompile", "dtNascimentoIdoso", "dtEmail", "dtVisita1",
  "dtVisita2",
];

/** Valores em R$ que compoem `Process.total` (mesma ordem do cartao "Financeiro"). */
const CAMPOS_FINANCEIROS = [
  "taxaAbertura", "servicoTecGabinete", "taxaVistoria", "servicoTecCampo",
] as const;

const CAMPOS_INTEIRO = ["anoEntrada"];

const CAMPOS_OBRIGATORIOS = ["anoEntrada", "interessado"];

type Normalizado = { valor: unknown } | { erro: string };

/** Converte o JSON recebido no tipo da coluna; `""` e `null` limpam o campo. */
function normalizarCampo(campo: string, valor: unknown): Normalizado {
  if (valor === null || valor === undefined || valor === "") {
    return CAMPOS_OBRIGATORIOS.includes(campo)
      ? { erro: "campo obrigatorio" }
      : { valor: null };
  }
  if (CAMPOS_DATA.includes(campo)) {
    if (typeof valor !== "string" && typeof valor !== "number") return { erro: "data invalida" };
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? { erro: "data invalida" } : { valor: data };
  }
  if ((CAMPOS_FINANCEIROS as readonly string[]).includes(campo)) {
    const n = lerNumero(valor);
    if (n === null || n < 0) return { erro: "informe um valor em reais, ex.: 350.00" };
    return { valor: Math.round(n * 100) / 100 };
  }
  if (CAMPOS_INTEIRO.includes(campo)) {
    const n = lerNumero(valor);
    if (n === null || !Number.isInteger(n) || n < 1900 || n > 2100) {
      return { erro: "informe um ano entre 1900 e 2100" };
    }
    return { valor: n };
  }
  if (typeof valor !== "string") return { erro: "deve ser texto" };
  return { valor };
}

/** Aceita numero ou texto no formato "1350.50" / "1.350,50"; null se nao for numerico. */
function lerNumero(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== "string") return null;
  const limpo = valor.trim().replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(limpo)) return null;
  return Number(limpo);
}

/** Soma dos valores financeiros do processo (campos vazios contam como zero). */
function somarTotal(valores: Record<(typeof CAMPOS_FINANCEIROS)[number], number | null>): number {
  const soma = CAMPOS_FINANCEIROS.reduce((acc, c) => acc + (valores[c] ?? 0), 0);
  return Math.round(soma * 100) / 100;
}

/** Papeis aceitos em cada atribuicao pessoal do processo. */
const CAMPOS_ATRIBUICAO: string[] = ["tecnicoRespId", "tecnicoConfId"];

/** Papeis da etapa distribuicao_gdat (AUTORIZACAO_SAIDA em workflow.ts). */
export const PAPEIS_DISTRIBUICAO = ["GERENTE", "ADMIN"];
function podeDistribuir(usuario: { role: string }): boolean {
  return PAPEIS_DISTRIBUICAO.includes(usuario.role);
}

const PAPEIS_ATRIBUICAO: Record<"tecnicoRespId" | "tecnicoConfId", string[]> = {
  tecnicoRespId: ["TECNICO", "ADMIN"],
  tecnicoConfId: ["CONFERENTE", "ADMIN"],
};

/** Erro descritivo quando a atribuicao aponta para conta inelegivel ou inativa. */
async function validarAtribuicoes(
  data: Record<string, unknown>
): Promise<string | null> {
  for (const campo of ["tecnicoRespId", "tecnicoConfId"] as const) {
    if (!(campo in data)) continue;
    const valor = data[campo];
    if (valor === null || valor === "") {
      data[campo] = null;
      continue;
    }
    if (typeof valor !== "string") return `${campo} invalido`;
    const usuario = await prisma.user.findFirst({
      where: { id: valor, active: true },
      select: { role: true },
    });
    if (!usuario) return `${campo}: usuario inexistente ou inativo`;
    if (!PAPEIS_ATRIBUICAO[campo].includes(usuario.role)) {
      return `${campo}: papel ${usuario.role} nao pode assumir esta atribuicao`;
    }
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessao = await exigirUsuarioApi();
  if ("erro" in sessao) return sessao.erro;

  const { id } = await params;
  const processo = await prisma.process.findUnique({
    where: { id },
    include: {
      // Nunca devolver o registro completo do usuario (contem passwordHash).
      tecnicoResp: { select: { id: true, name: true, role: true } },
      tecnicoConf: { select: { id: true, name: true, role: true } },
      criadoPor: { select: { id: true, name: true, role: true } },
      workflowActions: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      // Notificacoes seguem o escopo por usuario: cada um ve apenas as suas.
      notifications: {
        where: { userId: sessao.usuario.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!processo) {
    return NextResponse.json({ error: "Processo nao encontrado" }, { status: 404 });
  }

  return NextResponse.json(processo);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessao = await exigirUsuarioApi();
  if ("erro" in sessao) return sessao.erro;

  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Corpo deve ser um objeto JSON" }, { status: 400 });
  }

  // Atendimento (ADMIN/SDTC) edita tudo; quem distribui (GERENTE) so atribui tecnico e conferente.
  const apenasAtribuicao = Object.keys(body).every((k) => CAMPOS_ATRIBUICAO.includes(k));
  if (!podeAtender(sessao.usuario) && !(apenasAtribuicao && podeDistribuir(sessao.usuario))) {
    return NextResponse.json(
      { error: apenasAtribuicao ? "Atribuição exclusiva do Atendimento e da Gerência." : "Ação exclusiva do Atendimento." },
      { status: 403 }
    );
  }

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!CAMPOS_EDITAVEIS.includes(key)) continue;
    if (key === "tecnicoRespId" || key === "tecnicoConfId") {
      data[key] = value;
      continue;
    }
    const normalizado = normalizarCampo(key, value);
    if ("erro" in normalizado) {
      return NextResponse.json({ error: `${key}: ${normalizado.erro}`, campo: key }, { status: 400 });
    }
    data[key] = normalizado.valor;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nenhum campo editavel informado" }, { status: 400 });
  }

  const erroAtribuicao = await validarAtribuicoes(data);
  if (erroAtribuicao) {
    return NextResponse.json({ error: erroAtribuicao }, { status: 400 });
  }

  const atual = await prisma.process.findUnique({
    where: { id },
    select: { taxaAbertura: true, servicoTecGabinete: true, taxaVistoria: true, servicoTecCampo: true },
  });
  if (!atual) {
    return NextResponse.json({ error: "Processo nao encontrado" }, { status: 404 });
  }

  if (CAMPOS_FINANCEIROS.some((c) => c in data)) {
    data.total = somarTotal({
      taxaAbertura: (data.taxaAbertura ?? atual.taxaAbertura) as number | null,
      servicoTecGabinete: (data.servicoTecGabinete ?? atual.servicoTecGabinete) as number | null,
      taxaVistoria: (data.taxaVistoria ?? atual.taxaVistoria) as number | null,
      servicoTecCampo: (data.servicoTecCampo ?? atual.servicoTecCampo) as number | null,
    });
  }

  const processo = await prisma.process.update({
    where: { id },
    data,
    include: {
      tecnicoResp: { select: { id: true, name: true } },
      tecnicoConf: { select: { id: true, name: true } },
      criadoPor: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(processo);
}
