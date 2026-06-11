import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const situacao = searchParams.get("situacao");
  const tipoServico = searchParams.get("tipoServico");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {};

  if (situacao) {
    where.situacao = situacao;
  }
  if (tipoServico) {
    where.tipoServico = tipoServico;
  }
  if (search) {
    where.OR = [
      { interessado: { contains: search } },
      { expediente: { contains: search } },
      { municipio: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const [processes, total] = await Promise.all([
    prisma.process.findMany({
      where,
      include: {
        tecnicoResp: { select: { id: true, name: true } },
        tecnicoConf: { select: { id: true, name: true } },
        criadoPor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.process.count({ where }),
  ]);

  return NextResponse.json({ processes, total, page, limit });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const maxOrdem = await prisma.process.findFirst({
    orderBy: { ordem: "desc" },
    select: { ordem: true },
  });

  const processo = await prisma.process.create({
    data: {
      ordem: (maxOrdem?.ordem || 0) + 1,
      anoEntrada: body.anoEntrada || new Date().getFullYear(),
      tipoServico: body.tipoServico,
      expediente: body.expediente,
      dtAbertoSei: body.dtAbertoSei ? new Date(body.dtAbertoSei) : new Date(),
      dtCompile: body.dtCompile ? new Date(body.dtCompile) : null,
      tipo: body.tipo,
      interessado: body.interessado,
      email: body.email,
      telefone: body.telefone,
      cpfCnpj: body.cpfCnpj,
      dtNascimentoIdoso: body.dtNascimentoIdoso
        ? new Date(body.dtNascimentoIdoso)
        : null,
      municipio: body.municipio,
      ra: body.ra,
      dra: body.dra,
      pasta: body.pasta,
      utm: body.utm,
      observacaoEntrada: body.observacaoEntrada,
      base: body.base,
      departamento: body.departamento,
      situacao: "entrada_sdtc",
      criadoPorId: body.criadoPorId,
    },
    include: {
      tecnicoResp: { select: { id: true, name: true } },
      criadoPor: { select: { id: true, name: true } },
    },
  });

  // Create notification for all GDAT users about new entry
  const gdatUsers = await prisma.user.findMany({
    where: {
      OR: [
        { role: "ADMIN" },
        { role: "GERENTE" },
        { department: { in: ["CATDT", "CG"] } },
      ],
    },
  });

  await prisma.notification.createMany({
    data: gdatUsers.map((user) => ({
      type: "NOVA_ENTRADA",
      title: "Novo Processo Registrado",
      message: `Processo ${processo.expediente || processo.ordem} - ${processo.interessado} - ${processo.tipoServico}`,
      processId: processo.id,
      userId: user.id,
    })),
  });

  return NextResponse.json(processo, { status: 201 });
}
