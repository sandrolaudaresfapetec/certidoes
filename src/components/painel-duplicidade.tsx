"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanSearch } from "lucide-react";
import { descreverResumo } from "@/lib/duplicidade-resumo";

/**
 * Painel da análise de duplicidade (só ADMIN): mostra a última execução, a próxima e
 * quantas requisições esperam, e deixa rodar a análise na hora (#PEND-30).
 */
export function PainelDuplicidade({
  ultima,
  proxima,
  aguardandoInicial,
}: {
  ultima: { quando: string; resumo: string } | null;
  proxima: string;
  aguardandoInicial: number;
}) {
  const router = useRouter();
  const [rodando, setRodando] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);
  const [aguardando, setAguardando] = useState(aguardandoInicial);

  async function rodar() {
    setRodando(true);
    setMensagem(null);
    try {
      const res = await fetch("/api/admin/duplicidade/executar", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensagem({ texto: data.error || "Não foi possível rodar a análise.", erro: true });
        return;
      }
      setAguardando(data.aguardando ?? 0);
      setMensagem({ texto: `Análise concluída: ${descreverResumo(data.resumo)}.`, erro: false });
      router.refresh();
    } catch {
      setMensagem({ texto: "Erro de conexão. Tente novamente.", erro: true });
    } finally {
      setRodando(false);
    }
  }

  return (
    <section
      aria-labelledby="painel-duplicidade-titulo"
      className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="min-w-0 space-y-0.5">
        <h2 id="painel-duplicidade-titulo" className="text-sm font-semibold text-gray-900">
          Análise de duplicidade
        </h2>
        <p className="text-xs text-gray-600">
          {ultima ? `Última execução: ${ultima.quando} (${ultima.resumo}).` : "Ainda não houve execução."}{" "}
          Próxima: {proxima}.{" "}
          <strong className="font-semibold text-gray-900">
            {aguardando} requisição{aguardando === 1 ? "" : "ões"} aguardando análise.
          </strong>
        </p>
        {mensagem && (
          <p role={mensagem.erro ? "alert" : "status"} className={`text-xs ${mensagem.erro ? "text-red-600" : "text-emerald-800"}`}>
            {mensagem.texto}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={rodar}
        disabled={rodando}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 disabled:opacity-50"
      >
        {rodando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ScanSearch className="h-4 w-4" aria-hidden="true" />}
        Rodar análise agora
      </button>
    </section>
  );
}
