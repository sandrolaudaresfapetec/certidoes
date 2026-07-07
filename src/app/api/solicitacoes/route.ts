import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {};

  if (session.role === "CLIENTE") {
    where.clienteId = session.userId;
  } else if (!["ADMIN", "SDTC"].includes(session.role)) {
    return Response.json({ error: "Sem permissao" }, { status: 403 });
  }

  if (status) {
    where.status = status;
  }

  const [solicitacoes, total] = await Promise.all([
    prisma.solicitacao.findMany({
      where,
      include: {
        cliente: { select: { id: true, name: true, email: true } },
        process: { select: { id: true, ordem: true, situacao: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.solicitacao.count({ where }),
  ]);

  return Response.json({ solicitacoes, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Nao autenticado" }, { status: 401 });
  }

  if (session.role !== "CLIENTE") {
    return Response.json(
      { error: "Apenas clientes podem criar solicitacoes" },
      { status: 403 }
    );
  }

  const body = await request.json();

  const solicitacao = await prisma.solicitacao.create({
    data: {
      tipoServico: body.tipoServico,
      interessado: body.interessado,
      email: body.email || null,
      telefone: body.telefone || null,
      cpfCnpj: body.cpfCnpj || null,
      tipo: body.tipo || "Comum-CPF",
      dtNascimentoIdoso: body.dtNascimentoIdoso
        ? new Date(body.dtNascimentoIdoso)
        : null,
      municipio: body.municipio || null,
      ra: body.ra || null,
      codigoSigef: body.codigoSigef || null,
      areaSigef: body.areaSigef ? parseFloat(body.areaSigef) : null,
      statusSigef: body.statusSigef || null,
      nomeFazenda: body.nomeFazenda || null,
      matriculaSigef: body.matriculaSigef || null,
      detentorSigef: body.detentorSigef || null,
      municipioSigef: body.municipioSigef || null,
      ufSigef: body.ufSigef || null,
      representanteTecnico: body.representanteTecnico || null,
      docRequerimento: body.docRequerimento || false,
      docIdentidade: body.docIdentidade || false,
      docProcuracao: body.docProcuracao || false,
      docComprovante: body.docComprovante || false,
      docPlanta: body.docPlanta || false,
      docMatricula: body.docMatricula || false,
      docArt: body.docArt || false,
      arquivoGeo: body.arquivoGeo || null,
      clienteId: session.userId,
      status: "pendente",
    },
    include: {
      cliente: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify SDTC users about new solicitacao
  const sdtcUsers = await prisma.user.findMany({
    where: { active: true, role: { in: ["SDTC", "ADMIN"] } },
  });

  if (sdtcUsers.length > 0) {
    await prisma.notification.createMany({
      data: sdtcUsers.map((user) => ({
        type: "NOVA_SOLICITACAO",
        title: "Nova Solicitacao de Cliente",
        message: `${solicitacao.interessado} - ${solicitacao.tipoServico} - ${solicitacao.municipio || ""}`,
        userId: user.id,
      })),
    });
  }

  return Response.json(solicitacao, { status: 201 });
}
