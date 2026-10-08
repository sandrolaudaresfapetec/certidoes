import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { executarSlot } from "@/lib/agendador";

/**
 * POST /api/cron/duplicidade — gancho para um agendador externo (cron da infra), protegido
 * por `Authorization: Bearer <CRON_TOKEN>`. Sem `CRON_TOKEN` configurado a rota não existe.
 * Executa o horário atual (12:00 ou 00:00 de Brasília) só se ainda não rodou: chamar várias
 * vezes, ou junto com o agendador do app, é seguro.
 */
function tokenValido(recebido: string | null, esperado: string): boolean {
  const a = Buffer.from(recebido ?? "");
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const esperado = process.env.CRON_TOKEN;
  if (!esperado) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const cabecalho = request.headers.get("authorization") ?? "";
  const recebido = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : null;
  if (!tokenValido(recebido, esperado)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  return NextResponse.json(await executarSlot());
}
