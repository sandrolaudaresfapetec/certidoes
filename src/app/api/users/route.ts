import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioApi } from "@/lib/auth";

export async function GET() {
  const sessao = await exigirUsuarioApi();
  if ("erro" in sessao) return sessao.erro;

  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, role: true, department: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
