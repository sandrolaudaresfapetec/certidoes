import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSolicitanteLogado } from "@/lib/portal-auth";

/**
 * POST /api/portal/cadastro
 * Body: { email: string, telefone: string }
 * Complemento de cadastro do solicitante (conforme reunião: apenas e-mail e
 * telefone para contato — sem município/RA, que são dados do imóvel).
 */
export async function POST(request: NextRequest) {
  const solicitante = await getSolicitanteLogado();
  if (!solicitante) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const email = (body.email ?? "").toString().trim();
  const telefone = (body.telefone ?? "").toString().trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Informe um e-mail válido." },
      { status: 400 }
    );
  }
  if (telefone.replace(/\D/g, "").length < 10) {
    return NextResponse.json(
      { error: "Informe um telefone válido com DDD." },
      { status: 400 }
    );
  }

  await prisma.solicitante.update({
    where: { id: solicitante.id },
    data: { email, telefone, cadastroCompleto: true },
  });

  return NextResponse.json({ ok: true });
}
