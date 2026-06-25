import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ALLOWED_TRANSITIONS, type WorkflowStage } from "@/lib/workflow";
import { notifyUsersOnTransition } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { processId, toStatus, action } = body;

  if (!processId || !toStatus) {
    return Response.json(
      { error: "processId e toStatus sao obrigatorios" },
      { status: 400 }
    );
  }

  const processo = await prisma.process.findUnique({
    where: { id: processId },
  });

  if (!processo) {
    return Response.json(
      { error: "Processo nao encontrado" },
      { status: 404 }
    );
  }

  const fromStatus = processo.situacao as WorkflowStage;
  const allowedNext = ALLOWED_TRANSITIONS[fromStatus] || [];

  if (!allowedNext.includes(toStatus as WorkflowStage)) {
    return Response.json(
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

  if (fromStatus === "sobrestado") {
    updateData.dtFimSobrestado = now;
  }

  if (body.tecnicoRespId) {
    updateData.tecnicoRespId = body.tecnicoRespId;
  }
  if (body.tecnicoConfId) {
    updateData.tecnicoConfId = body.tecnicoConfId;
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
        userId: session.userId,
      },
    }),
  ]);

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
      where: { role: { in: ["GERENTE", "ADMIN", "GDTAC"] }, active: true },
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
      where: { role: roleMap[toStatus], active: true },
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
      where: { role: { in: ["ADMIN", "GERENTE"] }, active: true },
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

    if (updated.clienteId) {
      notificationsToCreate.push({
        type: "PROCESSO_CONCLUIDO",
        title: "Sua Certidao foi Emitida",
        message: notifMessage,
        processId,
        userId: updated.clienteId,
      });
    }
  }

  if (notificationsToCreate.length > 0) {
    await prisma.notification.createMany({ data: notificationsToCreate });

    const whatsappUserIds = notificationsToCreate.map((n) => n.userId);
    notifyUsersOnTransition({
      userIds: whatsappUserIds,
      processOrdem: updated.ordem,
      expediente: updated.expediente,
      interessado: updated.interessado,
      fromStage: fromStatus,
      toStage: toStatus as string,
      prisma,
    }).catch((err) =>
      console.error("[WhatsApp] Erro ao notificar:", err)
    );
  }

  // Auto-transition: analise_tecnica -> conferencia when parecer is attached
  if (
    toStatus === "analise_tecnica" &&
    body.autoAdvance &&
    body.observacoesTecnico
  ) {
    const conferentesAvailable = await prisma.user.findMany({
      where: { role: "CONFERENTE", active: true },
      select: { id: true },
    });
    if (conferentesAvailable.length > 0) {
      const autoUpdated = await prisma.process.update({
        where: { id: processId },
        data: {
          situacao: "conferencia",
          observacoesTecnico: body.observacoesTecnico,
          dtConf: new Date(),
          tecnicoConfId: conferentesAvailable[0].id,
        },
      });
      await prisma.workflowAction.create({
        data: {
          processId,
          fromStatus: "analise_tecnica",
          toStatus: "conferencia",
          action: "Transicao automatica: parecer tecnico anexado",
          userId: session.userId,
        },
      });
      await prisma.notification.create({
        data: {
          type: "ANALISE_COMPLETA",
          title: "Processo Pronto para Conferencia (automatico)",
          message: notifMessage,
          processId,
          userId: conferentesAvailable[0].id,
        },
      });
      return Response.json(autoUpdated);
    }
  }

  return Response.json(updated);
}
