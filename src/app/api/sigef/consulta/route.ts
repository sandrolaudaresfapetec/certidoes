import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consultarParcelasSigef } from "@/lib/sigef";
import { getUsuarioLogado } from "@/lib/auth";
import { getSolicitanteLogado } from "@/lib/portal-auth";

/**
 * POST /api/sigef/consulta
 * Body: { cpfCnpj: string, processId?: string }
 * Consulta parcelas do solicitante no SIGEF/INCRA (real via Conecta gov.br
 * ou simulado quando não há credenciais) e registra a consulta no banco.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const cpfCnpj = (body.cpfCnpj ?? "").toString();
  const digits = cpfCnpj.replace(/\D/g, "");

  if (!digits || (digits.length !== 11 && digits.length !== 14)) {
    return NextResponse.json(
      { error: "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido." },
      { status: 400 }
    );
  }

  // A consulta atende o portal e o backoffice: o solicitante logado só pode
  // consultar o próprio CPF; servidores do IGC consultam qualquer titular.
  const [usuario, solicitante] = await Promise.all([
    getUsuarioLogado(),
    getSolicitanteLogado(),
  ]);
  if (!usuario && !solicitante) {
    return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  }
  if (!usuario && solicitante && solicitante.cpf !== digits) {
    return NextResponse.json(
      { error: "A consulta ao SIGEF é limitada ao CPF do solicitante logado." },
      { status: 403 }
    );
  }

  const resultado = await consultarParcelasSigef(digits);

  await prisma.sigefConsulta.create({
    data: {
      cpfCnpj: digits,
      origem: resultado.origem,
      sucesso: true,
      mensagem: resultado.aviso ?? null,
      payload: JSON.stringify(resultado.parcelas),
      processId: body.processId ?? null,
    },
  });

  return NextResponse.json(resultado);
}
