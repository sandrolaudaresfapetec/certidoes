"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Abertura de Processo a partir de uma requisição (Atendimento). */
export function AberturaProcesso({ requisicaoId }: { requisicaoId: string }) {
  const router = useRouter();
  const [expediente, setExpediente] = useState("");
  const [observacaoEntrada, setObservacaoEntrada] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function abrir(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/requisicoes/${requisicaoId}/processo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expediente, observacaoEntrada }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Não foi possível abrir o processo.");
        return;
      }
      router.push(`/processos/${data.id}`);
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={abrir} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <h3 className="font-semibold text-gray-900">Abertura de Processo</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="abertura-expediente" className="block text-xs text-gray-600 mb-1">
            Expediente SEI
          </label>
          <input
            id="abertura-expediente"
            value={expediente}
            onChange={(e) => setExpediente(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="abertura-obs" className="block text-xs text-gray-600 mb-1">
            Observação de entrada
          </label>
          <input
            id="abertura-obs"
            value={observacaoEntrada}
            onChange={(e) => setObservacaoEntrada(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>
      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Abrir processo na entrada do SDTC
      </button>
    </form>
  );
}

/** Finalização e Pagamento da requisição (Atendimento). */
export function FinalizacaoPagamento({
  requisicaoId,
  statusInicial,
  valorInicial,
}: {
  requisicaoId: string;
  statusInicial: string | null;
  valorInicial: number | null;
}) {
  const router = useRouter();
  const [pagamentoStatus, setPagamentoStatus] = useState(statusInicial ?? "PENDENTE");
  const [pagamentoValor, setPagamentoValor] = useState(
    valorInicial != null ? String(valorInicial) : ""
  );
  const [pagamentoObs, setPagamentoObs] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(finalizar: boolean) {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/requisicoes/${requisicaoId}/pagamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagamentoStatus, pagamentoValor, pagamentoObs, finalizar }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Não foi possível registrar o pagamento.");
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
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <h3 className="font-semibold text-gray-900">Finalização e Pagamento</h3>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="pg-status" className="block text-xs text-gray-600 mb-1">
            Situação
          </label>
          <select
            id="pg-status"
            value={pagamentoStatus}
            onChange={(e) => setPagamentoStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
            <option value="ISENTO">Isento</option>
          </select>
        </div>
        <div>
          <label htmlFor="pg-valor" className="block text-xs text-gray-600 mb-1">
            Valor (R$)
          </label>
          <input
            id="pg-valor"
            type="number"
            min={0}
            step="0.01"
            value={pagamentoValor}
            onChange={(e) => setPagamentoValor(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="pg-obs" className="block text-xs text-gray-600 mb-1">
            Observação
          </label>
          <input
            id="pg-obs"
            value={pagamentoObs}
            onChange={(e) => setPagamentoObs(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>
      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => enviar(false)}
          disabled={loading}
          className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Registrar pagamento
        </button>
        <button
          type="button"
          onClick={() => enviar(true)}
          disabled={loading || pagamentoStatus === "PENDENTE"}
          className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm hover:bg-emerald-800 disabled:opacity-50"
        >
          Finalizar requisição
        </button>
      </div>
      {pagamentoStatus === "PENDENTE" && (
        <p className="text-xs text-gray-500">
          A finalização fica disponível após o pagamento ser registrado como pago
          ou isento.
        </p>
      )}
    </div>
  );
}
