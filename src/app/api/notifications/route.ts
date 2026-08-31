import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioApi } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const sessao = await exigirUsuarioApi();
  if ("erro" in sessao) return sessao.erro;

  const searchParams = request.nextUrl.searchParams;
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  // Cada usuario le apenas as proprias notificacoes.
  const userId = sessao.usuario.id;

  const where: Record<string, unknown> = { userId };
  if (unreadOnly) {
    where.read = false;
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: {
        process: {
          select: {
            id: true,
            ordem: true,
            expediente: true,
            interessado: true,
            situacao: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId, read: false },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const sessao = await exigirUsuarioApi();
  if ("erro" in sessao) return sessao.erro;

  const body = await request.json();
  const { notificationIds, read } = body;

  if (!notificationIds || notificationIds.length === 0) {
    return NextResponse.json(
      { error: "notificationIds sao obrigatorios" },
      { status: 400 }
    );
  }

  await prisma.notification.updateMany({
    where: { id: { in: notificationIds }, userId: sessao.usuario.id },
    data: { read: read ?? true },
  });

  return NextResponse.json({ success: true });
}
