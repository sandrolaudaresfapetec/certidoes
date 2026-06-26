import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const solicitacao = await prisma.solicitacao.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, name: true, email: true, phone: true } },
      process: { select: { id: true, ordem: true, situacao: true } },
    },
  });

  if (!solicitacao) {
    return NextResponse.json({ error: "Solicitacao nao encontrada" }, { status: 404 });
  }

  // CLIENTE can only see their own
  if (session.role === "CLIENTE" && solicitacao.clienteId !== session.userId) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  // Only ADMIN, SDTC, and CLIENTE (own) can view
  if (!["ADMIN", "SDTC", "CLIENTE"].includes(session.role)) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  return NextResponse.json(solicitacao);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const solicitacao = await prisma.solicitacao.findUnique({
    where: { id },
  });

  if (!solicitacao) {
    return NextResponse.json({ error: "Solicitacao nao encontrada" }, { status: 404 });
  }

  // CLIENTE can update their own (if still pendente or devolvida)
  if (session.role === "CLIENTE") {
    if (solicitacao.clienteId !== session.userId) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }
    if (!["pendente", "devolvida"].includes(solicitacao.status)) {
      return NextResponse.json(
        { error: "Solicitacao nao pode ser editada neste status" },
        { status: 400 }
      );
    }
  } else if (!["ADMIN", "SDTC"].includes(session.role)) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  const allowedFields = [
    "status", "observacaoSDTC",
    "docRequerimento", "docIdentidade", "docProcuracao",
    "docComprovante", "docPlanta", "docMatricula", "docArt",
    "arquivoGeo", "tipoServico", "interessado", "email", "telefone",
    "cpfCnpj", "tipo", "municipio", "ra",
    "codigoSigef", "areaSigef", "statusSigef", "nomeFazenda",
    "matriculaSigef", "detentorSigef", "municipioSigef", "ufSigef",
    "representanteTecnico",
  ];

  for (const [key, value] of Object.entries(body)) {
    if (allowedFields.includes(key)) {
      if (key === "dtNascimentoIdoso" && value) {
        data[key] = new Date(value as string);
      } else if (key === "areaSigef" && value) {
        data[key] = parseFloat(value as string);
      } else {
        data[key] = value;
      }
    }
  }

  // If SDTC changes status to devolvida, notify client
  if (data.status === "devolvida" && ["ADMIN", "SDTC"].includes(session.role)) {
    const cliente = await prisma.user.findUnique({
      where: { id: solicitacao.clienteId },
    });
    if (cliente) {
      await prisma.notification.create({
        data: {
          type: "SOLICITACAO_DEVOLVIDA",
          title: "Solicitacao Devolvida",
          message: `Sua solicitacao de ${solicitacao.tipoServico} foi devolvida para correcao. ${data.observacaoSDTC || ""}`,
          userId: cliente.id,
        },
      });
    }
  }

  const updated = await prisma.solicitacao.update({
    where: { id },
    data,
    include: {
      cliente: { select: { id: true, name: true, email: true } },
      process: { select: { id: true, ordem: true, situacao: true } },
    },
  });

  return NextResponse.json(updated);
}
