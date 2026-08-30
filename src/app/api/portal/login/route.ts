import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validarCPF } from "@/lib/cpf";
import { assinarSessao, PORTAL_COOKIE } from "@/lib/portal-auth";

/**
 * POST /api/portal/login
 * Body: { cpf: string, nome: string }
 * Simula o retorno do login gov.br (GOVBR_MOCK): o CPF e validado com o
 * checksum oficial e o solicitante e criado/recuperado. Quando o Keycloak
 * OIDC estiver ativo, este endpoint sera substituido pelo callback OIDC.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const cpf = (body.cpf ?? "").toString().replace(/\D/g, "");
  const nome = (body.nome ?? "").toString().trim();

  if (!validarCPF(cpf)) {
    return NextResponse.json(
      { error: "CPF inválido. Confira os dígitos informados." },
      { status: 400 }
    );
  }
  if (nome.length < 3) {
    return NextResponse.json(
      { error: "Informe o nome completo." },
      { status: 400 }
    );
  }

  const solicitante = await prisma.solicitante.upsert({
    where: { cpf },
    create: { cpf, nome },
    update: { nome },
  });

  const res = NextResponse.json({
    ok: true,
    cadastroCompleto: solicitante.cadastroCompleto,
  });
  res.cookies.set(PORTAL_COOKIE, assinarSessao(solicitante.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h
  });
  return res;
}
