import { NextResponse } from "next/server";
import { exigirAdminApi } from "@/lib/auth";
import { contarAguardandoAnalise } from "@/lib/duplicidade-servidor";
import { executarManual } from "@/lib/agendador";

/**
 * POST /api/admin/duplicidade/executar — "Rodar análise agora" (só ADMIN).
 * Analisa na hora tudo o que está aguardando, sem esperar 12:00 ou 00:00. Segura para repetir
 * e para rodar junto com o agendador: cada requisição só é analisada uma vez.
 */
export async function POST() {
  const sessao = await exigirAdminApi();
  if ("erro" in sessao) return sessao.erro;

  const resumo = await executarManual();
  return NextResponse.json({ resumo, aguardando: await contarAguardandoAnalise() });
}
