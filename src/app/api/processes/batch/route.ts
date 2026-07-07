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
  const { processIds, toStatus, action } = body;

  if (
    !Array.isArray(processIds) ||
    processIds.length === 0 ||
    !toStatus
  ) {
    return Response.json(
      { error: "processIds (array) e toStatus sao obrigatorios" },
      { status: 400 }
    );
  }

  if (processIds.length > 200) {
    return Response.json(
      { error: "Maximo de 200 processos por vez" },
      { status: 400 }
    );
  }

  const processes = await prisma.process.findMany({
    where: { id: { in: processIds } },
  });

  const results: Array<{
    id: string;
    ordem: number;
    success: boolean;
    error?: string;
  }> = [];

  const now = new Date();

  for (const proc of processes) {
    const fromStatus = proc.situacao as WorkflowStage;
    const allowedNext = ALLOWED_TRANSITIONS[fromStatus] || [];

    if (!allowedNext.includes(toStatus as WorkflowStage)) {
      results.push({
        id: proc.id,
        ordem: proc.ordem,
        success: false,
        error: `Transicao de ${fromStatus} para ${toStatus} nao permitida`,
      });
      continue;
    }

    const updateData: Record<string, unknown> = { situacao: toStatus };
    switch (toStatus) {
      case "assinatura_tecnico":
        if (!proc.dtAssTecnico) updateData.dtAssTecnico = now;
        break;
      case "assinatura_gerente":
        if (!proc.dtAssGerente) updateData.dtAssGerente = now;
        break;
      case "assinatura_diretor":
        if (!proc.dtAssDiretor) updateData.dtAssDiretor = now;
        break;
      case "upload_sei":
        if (!proc.dtUpadoSei) updateData.dtUpadoSei = now;
        break;
      case "conferencia":
        if (!proc.dtConf) updateData.dtConf = now;
        break;
      case "sobrestado":
        updateData.dtInicioSobrestado = now;
        break;
      case "cancelado":
        updateData.dtCancelado = now;
        break;
    }

    if (fromStatus === "sobrestado") {
      updateData.dtFimSobrestado = now;
    }

    try {
      await prisma.$transaction([
        prisma.process.update({
          where: { id: proc.id },
          data: updateData,
        }),
        prisma.workflowAction.create({
          data: {
            processId: proc.id,
            fromStatus,
            toStatus,
            action:
              action ||
              `Operacao em lote: ${fromStatus} -> ${toStatus}`,
            userId: session.userId,
          },
        }),
      ]);
      results.push({ id: proc.id, ordem: proc.ordem, success: true });
    } catch {
      results.push({
        id: proc.id,
        ordem: proc.ordem,
        success: false,
        error: "Erro ao atualizar processo",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  const succeededProcs = processes.filter((p) =>
    results.some((r) => r.id === p.id && r.success)
  );
  if (succeededProcs.length > 0) {
    const roleMap: Record<string, string[]> = {
      distribuicao_gdat: ["GERENTE", "ADMIN", "GDTAC"],
      analise_tecnica: ["TECNICO"],
      conferencia: ["CONFERENTE"],
      assinatura_tecnico: ["TECNICO"],
      assinatura_gerente: ["GERENTE"],
      assinatura_diretor: ["DIRETOR"],
      upload_sei: ["SDTC"],
      finalizado: ["ADMIN", "GERENTE"],
    };
    const targetRoles = roleMap[toStatus as string] || [];
    if (targetRoles.length > 0) {
      const targetUsers = await prisma.user.findMany({
        where: { role: { in: targetRoles }, active: true },
        select: { id: true },
      });
      const userIds = targetUsers.map((u) => u.id);
      for (const proc of succeededProcs) {
        notifyUsersOnTransition({
          userIds,
          processOrdem: proc.ordem,
          expediente: proc.expediente,
          interessado: proc.interessado,
          fromStage: proc.situacao,
          toStage: toStatus as string,
          prisma,
        }).catch((err) =>
          console.error("[WhatsApp] Erro batch:", err)
        );
      }
    }
  }

  return Response.json({
    total: results.length,
    success: successCount,
    failed: failCount,
    results,
  });
}
