import { NextResponse } from "next/server";
import { getSolicitanteLogado } from "@/lib/portal-auth";

/** GET /api/portal/me — dados básicos do solicitante logado (CPF, nome, cadastro). */
export async function GET() {
  const solicitante = await getSolicitanteLogado();
  if (!solicitante) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  return NextResponse.json({
    cpf: solicitante.cpf,
    nome: solicitante.nome,
    email: solicitante.email,
    cadastroCompleto: solicitante.cadastroCompleto,
  });
}
