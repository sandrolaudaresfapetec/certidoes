import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  if (!userId) {
    return NextResponse.json(
      { error: "userId e obrigatorio" },
      { status: 400 }
    );
  }

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
  const body = await request.json();
  const { notificationIds, read } = body;

  if (!notificationIds || notificationIds.length === 0) {
    return NextResponse.json(
      { error: "notificationIds sao obrigatorios" },
      { status: 400 }
    );
  }

  await prisma.notification.updateMany({
    where: { id: { in: notificationIds } },
    data: { read: read ?? true },
  });

  return NextResponse.json({ success: true });
}
