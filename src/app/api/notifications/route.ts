import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const where: Record<string, unknown> = { userId: session.userId };
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
      where: { userId: session.userId, read: false },
    }),
  ]);

  return Response.json({ notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { notificationIds, read } = body;

  if (!notificationIds || notificationIds.length === 0) {
    return Response.json(
      { error: "notificationIds sao obrigatorios" },
      { status: 400 }
    );
  }

  await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId: session.userId,
    },
    data: { read: read ?? true },
  });

  return Response.json({ success: true });
}
