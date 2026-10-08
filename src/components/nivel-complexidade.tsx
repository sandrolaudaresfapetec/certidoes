"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { NIVEL_MAXIMO, NIVEL_MINIMO } from "@/lib/complexidade";

/**
 * Nível de complexidade do processo, de 1 a 9 (#PEND-32). O corte de divisas sugere; o
 * técnico responsável (ou o Administrador) confirma ou muda. O solicitante só vê o número
 * depois da confirmação. Para os demais papéis o painel é só de leitura.
 */
export function NivelComplexidade({
  processoId,
  nivelAtual,
  confirmadoEm,
  sugestao,
  podeEditar,
}: {
  processoId: string;
  nivelAtual: number | null;
  confirmadoEm: string | null;
  /** Sugestão do último corte do processo (null se não houve corte com nível). */
  sugestao: { nivel: number; quando: string } | null;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [valor, setValor] = useState<string>(String(nivelAtual ?? sugestao?.nivel ?? ""));
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMensagem(null);
    try {
      const res = await fetch(`/api/processes/${processoId}/complexidade`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nivel: valor === "" ? null : Number(valor) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensagem({ texto: data.error || "Não foi possível salvar o nível.", erro: true });
        return;
      }
      setMensagem({
        texto:
          data.nivel === null
            ? "Nível removido: o solicitante deixa de ver a caixa."
            : `Nível ${data.nivel} confirmado. O solicitante já o vê no acompanhamento.`,
        erro: false,
      });
      router.refresh();
    } catch {
      setMensagem({ texto: "Erro de conexão. Tente novamente.", erro: true });
    } finally {
      setLoading(false);
    }
  }

  const niveis = Array.from({ length: NIVEL_MAXIMO - NIVEL_MINIMO + 1 }, (_, i) => NIVEL_MINIMO + i);

  return (
    <section
      aria-labelledby="nivel-titulo"
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >
      <h2 id="nivel-titulo" className="text-lg font-semibold text-gray-900 mb-3">
        Nível de complexidade
      </h2>
      {sugestao ? (
        <p className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          Sugerido pela pré-análise de {sugestao.quando}: <strong className="font-semibold">{sugestao.nivel}</strong>.
        </p>
      ) : (
        <p className="mb-3 text-xs text-gray-600">
          Nenhuma pré-análise de divisas com sugestão de nível foi registrada para este processo.
        </p>
      )}

      {podeEditar ? (
        <form onSubmit={confirmar} noValidate className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="nivel-select" className="block text-xs font-medium text-gray-600 mb-1">
              Nível (1 a 9)
            </label>
            <select
              id="nivel-select"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                setMensagem(null);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Sem nível</option>
              {niveis.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Confirmar nível
          </button>
        </form>
      ) : null}

      <p
        role={mensagem?.erro ? "alert" : "status"}
        className={`mt-3 text-xs ${mensagem?.erro ? "text-red-600" : "text-gray-600"}`}
      >
        {mensagem
          ? mensagem.texto
          : nivelAtual != null
            ? `Nível ${nivelAtual} confirmado${confirmadoEm ? ` em ${confirmadoEm}` : ""}. O solicitante o vê no acompanhamento.`
            : "Ainda não confirmado: o solicitante não vê o nível."}
      </p>
      {!podeEditar && (
        <p className="mt-1 text-xs text-gray-500">
          Só o técnico responsável pela análise (ou o Administrador) confirma o nível.
        </p>
      )}
    </section>
  );
}
