import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdminApi } from "@/lib/auth";
import { garantirLinhasDemo } from "@/lib/linhas-demo";

/** POST /api/geometria/seed[?force=1] — linhas de divisa de demonstracao (interior de SP). */
export async function POST(request: NextRequest) {
  const sessao = await exigirAdminApi();
  if ("erro" in sessao) return sessao.erro;

  const force = request.nextUrl.searchParams.get("force") === "1";
  if (force) await prisma.linhaDivisa.deleteMany();

  const criadas = await garantirLinhasDemo();
  if (criadas === 0) {
    return NextResponse.json({ ok: true, mensagem: "Linhas ja existentes (use ?force=1 para recriar)." });
  }
  return NextResponse.json({ ok: true, criadas, uf: "SP" }, { status: 201 });
}
