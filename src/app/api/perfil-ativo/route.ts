import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERFIL_COOKIE } from "@/lib/perfil-ativo";

/** POST /api/perfil-ativo — troca o perfil ativo do backoffice (cookie). */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const userId = (body.userId ?? "").toString();

  const user = await prisma.user.findFirst({ where: { id: userId, active: true } });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const res = NextResponse.json({ id: user.id, name: user.name, role: user.role });
  res.cookies.set(PERFIL_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
