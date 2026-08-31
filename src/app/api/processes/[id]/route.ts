import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAtendimentoApi, exigirUsuarioApi } from "@/lib/auth";

/**
 * Campos editaveis pelo Atendimento. Situacao, datas de assinatura e autoria
 * ficam fora: sao gravadas apenas por /api/workflow a partir da sessao.
 */
const CAMPOS_EDITAVEIS = [
  "tipoServico", "expediente", "anoEntrada", "tipo", "interessado", "email",
  "telefone", "cpfCnpj", "municipio", "ra", "dra", "pasta", "utm", "base",
  "departamento", "observacaoEntrada", "observacoesTecnico", "taxaAbertura",
  "taxaVistoria", "tecnicoRespId", "tecnicoConfId", "divisaDificuldade",
  "nivelPrioridade", "statusEscritorio", "quemVaiAssinar", "numeroSaidaIGC",
  "dtAbertoSei", "dtCompile", "dtNascimentoIdoso", "dtEmail", "dtVisita1",
  "dtVisita2",
];

const CAMPOS_DATA = [
  "dtAbertoSei", "dtCompile", "dtNascimentoIdoso", "dtEmail", "dtVisita1",
  "dtVisita2",
];

/** Papeis aceitos em cada atribuicao pessoal do processo. */
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
  const sessao = await exigirAtendimentoApi();
  if ("erro" in sessao) return sessao.erro;

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!CAMPOS_EDITAVEIS.includes(key)) continue;
    data[key] = CAMPOS_DATA.includes(key) && value ? new Date(value as string) : value;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nenhum campo editavel informado" }, { status: 400 });
  }

  const erroAtribuicao = await validarAtribuicoes(data);
  if (erroAtribuicao) {
    return NextResponse.json({ error: erroAtribuicao }, { status: 400 });
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
