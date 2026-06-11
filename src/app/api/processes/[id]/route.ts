import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const processo = await prisma.process.findUnique({
    where: { id },
    include: {
      tecnicoResp: true,
      tecnicoConf: true,
      criadoPor: true,
      workflowActions: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      notifications: {
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
  const { id } = await params;
  const body = await request.json();

  const dateFields = [
    "dtAbertoSei", "dtCompile", "dtNascimentoIdoso", "dtEmail", "dtVisita1",
    "dtConf", "dtAssTecnico", "dtAssGerente", "dtAssDiretor", "dtUpadoSei",
    "dtInicioSobrestado", "dtFimSobrestado", "dtCancelado",
  ];

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (dateFields.includes(key) && value) {
      data[key] = new Date(value as string);
    } else {
      data[key] = value;
    }
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
