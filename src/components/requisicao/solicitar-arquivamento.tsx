"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";
import { MOTIVO_ARQUIVAMENTO_MAX, MOTIVO_ARQUIVAMENTO_MIN } from "@/lib/solicitacao-estados";

/**
 * Pedido de arquivamento pelo solicitante (#PEND-29). Confirmação inline, no próprio cartão:
 * `IMEDIATO` arquiva na hora e sem custo (motivo opcional); `VIA_DDD` envia o pedido para a
 * DDD decidir (motivo obrigatório; pode haver custo).
 */
export function SolicitarArquivamento({
  requisicaoId,
  tipo,
}: {
  requisicaoId: string;
  tipo: "IMEDIATO" | "VIA_DDD";
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const obrigatorio = tipo === "VIA_DDD";

  function fechar() {
    setAberto(false);
    setMotivo("");
    setErro(null);
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const limpo = motivo.trim();
    if (obrigatorio && limpo.length < MOTIVO_ARQUIVAMENTO_MIN) {
      setErro(`Escreva o motivo com pelo menos ${MOTIVO_ARQUIVAMENTO_MIN} caracteres.`);
      return;
    }
    if (!obrigatorio && limpo && limpo.length < MOTIVO_ARQUIVAMENTO_MIN) {
      setErro(`Se for escrever o motivo, use pelo menos ${MOTIVO_ARQUIVAMENTO_MIN} caracteres.`);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/portal/solicitacoes/${requisicaoId}/arquivar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo, tipo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.error || "Não foi possível arquivar a requisição. Tente novamente.");
        // A situação pode ter mudado (ex.: a análise rodou agora): atualiza a página.
        if (res.status === 409) router.refresh();
        return;
      }
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="arquivar-titulo"
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 id="arquivar-titulo" className="font-semibold text-gray-900">
            Arquivar requisição
          </h3>
          <p className="text-xs text-gray-600">
            Não precisa mais desta requisição? Você pode pedir que ela seja arquivada.
          </p>
        </div>
        {!aberto && (
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-400 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
          >
            <Archive className="h-4 w-4" aria-hidden="true" />
            Arquivar requisição
          </button>
        )}
      </div>

      {aberto && (
        <form
          onSubmit={confirmar}
          noValidate
          className="mt-4 grid gap-2 rounded-md border border-amber-200 bg-amber-50 p-4"
        >
          <p className="text-xs text-amber-900">
            {tipo === "IMEDIATO" ? (
              <>
                <strong className="font-semibold">Arquivamento imediato, sem custo.</strong> Esta
                requisição ainda não foi analisada pela equipe e não tem processo. Ao confirmar, ela
                é arquivada agora.
              </>
            ) : (
              <>
                <strong className="font-semibold">Pedido de arquivamento à DDD.</strong> Esta
                requisição já está em andamento. Seu pedido vai para a DDD, que decide; o
                arquivamento pode ter custo. Enquanto isso ela continua em andamento.
              </>
            )}
          </p>
          <label htmlFor="arquivar-motivo" className="text-xs font-semibold text-amber-900">
            {obrigatorio ? "Motivo do pedido" : "Motivo (opcional)"}
          </label>
          <textarea
            id="arquivar-motivo"
            value={motivo}
            maxLength={MOTIVO_ARQUIVAMENTO_MAX}
            autoFocus
            onChange={(e) => {
              setMotivo(e.target.value);
              setErro(null);
            }}
            placeholder="Conte por que não precisa mais desta requisição"
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "arquivar-erro" : "arquivar-dica"}
            className="min-h-20 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <p id="arquivar-dica" className="text-xs text-amber-900">
            {motivo.length} de {MOTIVO_ARQUIVAMENTO_MAX} caracteres
            {obrigatorio ? ` (mínimo ${MOTIVO_ARQUIVAMENTO_MIN})` : ""}
          </p>
          {erro && (
            <p id="arquivar-erro" role="alert" className="text-xs text-red-700">
              {erro}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-800 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {tipo === "IMEDIATO" ? "Confirmar arquivamento" : "Enviar pedido de arquivamento"}
            </button>
            <button
              type="button"
              onClick={fechar}
              className="rounded-md border border-gray-400 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
            >
              Voltar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
