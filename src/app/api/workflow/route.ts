import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ALLOWED_TRANSITIONS, type WorkflowStage } from "@/lib/workflow";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { processId, toStatus, userId, action } = body;

  if (!processId || !toStatus || !userId) {
    return NextResponse.json(
      { error: "processId, toStatus e userId sao obrigatorios" },
      { status: 400 }
    );
  }

  const processo = await prisma.process.findUnique({
    where: { id: processId },
  });

  if (!processo) {
    return NextResponse.json(
      { error: "Processo nao encontrado" },
      { status: 404 }
    );
  }

  const fromStatus = processo.situacao as WorkflowStage;
  const allowedNext = ALLOWED_TRANSITIONS[fromStatus] || [];

  if (!allowedNext.includes(toStatus as WorkflowStage)) {
    return NextResponse.json(
      {
        error: `Transicao de ${fromStatus} para ${toStatus} nao permitida`,
        allowedTransitions: allowedNext,
      },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {
    situacao: toStatus,
  };

  // Auto-populate dates based on transitions
  const now = new Date();
  switch (toStatus) {
    case "assinatura_tecnico":
      if (!processo.dtAssTecnico) updateData.dtAssTecnico = now;
      break;
    case "assinatura_gerente":
      if (!processo.dtAssGerente) updateData.dtAssGerente = now;
      break;
    case "assinatura_diretor":
      if (!processo.dtAssDiretor) updateData.dtAssDiretor = now;
      break;
    case "upload_sei":
      if (!processo.dtUpadoSei) updateData.dtUpadoSei = now;
      break;
    case "sobrestado":
      updateData.dtInicioSobrestado = now;
      break;
    case "cancelado":
      updateData.dtCancelado = now;
      break;
    case "conferencia":
      if (!processo.dtConf) updateData.dtConf = now;
      break;
  }

  // If coming back from sobrestado, record end date
  if (fromStatus === "sobrestado") {
    updateData.dtFimSobrestado = now;
  }

  const [updated] = await prisma.$transaction([
    prisma.process.update({
      where: { id: processId },
      data: updateData,
      include: {
        tecnicoResp: { select: { id: true, name: true } },
        tecnicoConf: { select: { id: true, name: true } },
      },
    }),
    prisma.workflowAction.create({
      data: {
        processId,
        fromStatus,
        toStatus,
        action: action || `Processo movido de ${fromStatus} para ${toStatus}`,
        userId,
      },
    }),
  ]);

  // Create notifications based on transition
  const notificationsToCreate: Array<{
    type: string;
    title: string;
    message: string;
    processId: string;
    userId: string;
  }> = [];

  const notifMessage = `Processo ${updated.expediente || updated.ordem} - ${updated.interessado}`;

  if (toStatus === "distribuicao_gdat") {
    const managers = await prisma.user.findMany({
      where: { role: { in: ["GERENTE", "ADMIN"] } },
    });
    managers.forEach((m) => {
      notificationsToCreate.push({
        type: "TRANSICAO",
        title: "Processo Aguardando Distribuicao",
        message: notifMessage,
        processId,
        userId: m.id,
      });
    });
  }

  if (toStatus === "analise_tecnica" && updated.tecnicoRespId) {
    notificationsToCreate.push({
      type: "ATRIBUICAO",
      title: "Processo Atribuido a Voce",
      message: notifMessage,
      processId,
      userId: updated.tecnicoRespId,
    });
  }

  if (toStatus === "conferencia" && updated.tecnicoConfId) {
    notificationsToCreate.push({
      type: "ANALISE_COMPLETA",
      title: "Processo Pronto para Conferencia",
      message: notifMessage,
      processId,
      userId: updated.tecnicoConfId,
    });
  }

  if (
    toStatus === "assinatura_tecnico" ||
    toStatus === "assinatura_gerente" ||
    toStatus === "assinatura_diretor"
  ) {
    const roleMap: Record<string, string> = {
      assinatura_tecnico: "TECNICO",
      assinatura_gerente: "GERENTE",
      assinatura_diretor: "DIRETOR",
    };
    const signers = await prisma.user.findMany({
      where: { role: roleMap[toStatus] },
    });
    signers.forEach((s) => {
      notificationsToCreate.push({
        type: "ASSINATURA_PENDENTE",
        title: "Assinatura Necessaria",
        message: notifMessage,
        processId,
        userId: s.id,
      });
    });
  }

  if (toStatus === "finalizado") {
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "GERENTE"] } },
    });
    admins.forEach((a) => {
      notificationsToCreate.push({
        type: "PROCESSO_CONCLUIDO",
        title: "Processo Finalizado",
        message: notifMessage,
        processId,
        userId: a.id,
      });
    });
  }

  if (notificationsToCreate.length > 0) {
    await prisma.notification.createMany({ data: notificationsToCreate });
  }

  return NextResponse.json(updated);
}
