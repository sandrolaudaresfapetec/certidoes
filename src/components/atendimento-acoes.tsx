"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  MOTIVO_ARQUIVAMENTO_MAX,
  MOTIVO_ARQUIVAMENTO_MIN,
  MOTIVO_DEVOLUCAO_MAX,
  MOTIVO_DEVOLUCAO_MIN,
} from "@/lib/solicitacao-estados";

/**
 * Liberação de um pedido congelado por ter 13 ou mais polígonos (#PEND-31). A mensagem
 * opcional vai ao chat do solicitante.
 */
export function LiberarRequisicao({ requisicaoId }: { requisicaoId: string }) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function liberar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/requisicoes/${requisicaoId}/liberar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.error || "Não foi possível liberar o preenchimento.");
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
    <form
      onSubmit={liberar}
      noValidate
      className="bg-white border border-gray-200 rounded-lg p-6 space-y-3"
    >
      <h3 className="font-semibold text-gray-900">Liberar preenchimento</h3>
      <p className="text-xs text-gray-600">
        O solicitante volta a poder editar e enviar. A requisição só entra na fila depois do
        envio.
      </p>
      <div>
        <label htmlFor="liberar-mensagem" className="block text-xs text-gray-600 mb-1">
          Mensagem ao solicitante (opcional)
        </label>
        <textarea
          id="liberar-mensagem"
          value={mensagem}
          maxLength={1000}
          onChange={(e) => {
            setMensagem(e.target.value);
            setErro(null);
          }}
          placeholder="Ex.: Documentos conferidos. Pode continuar."
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? "liberar-erro" : undefined}
          className="min-h-14 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {erro && (
        <p id="liberar-erro" role="alert" className="text-xs text-red-600">
          {erro}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Liberar preenchimento
      </button>
    </form>
  );
}

/**
 * Devolução da requisição ao solicitante (#PEND-26). Confirmação inline, no próprio cartão:
 * o motivo é obrigatório e vai ao chat do solicitante.
 */
export function DevolverRequisicao({ requisicaoId }: { requisicaoId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    setAberto(false);
    setMotivo("");
    setErro(null);
  }

  async function devolver(e: React.FormEvent) {
    e.preventDefault();
    if (motivo.trim().length < MOTIVO_DEVOLUCAO_MIN) {
      setErro(`Escreva o motivo com pelo menos ${MOTIVO_DEVOLUCAO_MIN} caracteres.`);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/requisicoes/${requisicaoId}/devolver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.error || "Não foi possível devolver a requisição.");
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
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="font-semibold text-gray-900">Devolver ao solicitante</h3>
      <p className="mt-1 text-xs text-gray-600">
        O solicitante recebe o motivo no chat, pode corrigir os dados e reenviar. Enquanto isso a
        requisição sai da fila.
      </p>
      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="mt-3 rounded-md border border-gray-400 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
        >
          Devolver requisição
        </button>
      ) : (
        <form
          onSubmit={devolver}
          noValidate
          className="mt-3 grid gap-2 rounded-md border border-red-200 bg-red-50 p-4"
        >
          <label htmlFor="devolver-motivo" className="text-xs font-semibold text-red-900">
            Motivo da devolução
          </label>
          <textarea
            id="devolver-motivo"
            value={motivo}
            maxLength={MOTIVO_DEVOLUCAO_MAX}
            autoFocus
            onChange={(e) => {
              setMotivo(e.target.value);
              setErro(null);
            }}
            placeholder="Explique o que o solicitante precisa corrigir"
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "devolver-erro" : "devolver-dica"}
            className="min-h-20 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <p id="devolver-dica" className="text-xs text-red-900">
            {motivo.length} de {MOTIVO_DEVOLUCAO_MAX} caracteres (mínimo {MOTIVO_DEVOLUCAO_MIN})
          </p>
          {erro && (
            <p id="devolver-erro" role="alert" className="text-xs text-red-700">
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
              Confirmar devolução
            </button>
            <button
              type="button"
              onClick={fechar}
              className="rounded-md border border-gray-400 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * Decisão sobre o pedido de arquivamento do solicitante (#PEND-29). Confirmação inline:
 * aceitar arquiva (mensagem opcional ao solicitante); recusar exige justificativa, enviada
 * ao chat, e devolve a requisição ao andamento. Aceitar não cancela o processo aberto.
 */
export function DecidirArquivamento({
  requisicaoId,
  numeroProcesso,
}: {
  requisicaoId: string;
  numeroProcesso?: number | null;
}) {
  const router = useRouter();
  const [modo, setModo] = useState<"aceitar" | "recusar" | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    setModo(null);
    setJustificativa("");
    setErro(null);
  }

  async function decidir(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !modo) return;
    const aceitar = modo === "aceitar";
    const limpo = justificativa.trim();
    if (!aceitar && limpo.length < MOTIVO_ARQUIVAMENTO_MIN) {
      setErro(`Escreva a justificativa com pelo menos ${MOTIVO_ARQUIVAMENTO_MIN} caracteres.`);
      return;
    }
    if (aceitar && limpo && limpo.length < MOTIVO_ARQUIVAMENTO_MIN) {
      setErro(`Se for escrever uma mensagem, use pelo menos ${MOTIVO_ARQUIVAMENTO_MIN} caracteres.`);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/requisicoes/${requisicaoId}/arquivamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aceitar, justificativa }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.error || "Não foi possível registrar a decisão.");
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
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="font-semibold text-gray-900">Decidir arquivamento</h3>
      <p className="mt-1 text-xs text-gray-600">
        Aceitar arquiva a requisição; recusar a devolve ao andamento, com a justificativa no chat.
        {numeroProcesso != null &&
          ` O processo #${numeroProcesso} não é cancelado automaticamente: se for o caso, cancele-o em Processos.`}
      </p>
      {!modo ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModo("aceitar")}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-800"
          >
            Aceitar arquivamento
          </button>
          <button
            type="button"
            onClick={() => setModo("recusar")}
            className="rounded-md border border-gray-400 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
          >
            Recusar…
          </button>
        </div>
      ) : (
        <form
          onSubmit={decidir}
          noValidate
          className="mt-3 grid gap-2 rounded-md border border-amber-200 bg-amber-50 p-4"
        >
          <label htmlFor="arquivamento-justificativa" className="text-xs font-semibold text-amber-900">
            {modo === "recusar"
              ? "Justificativa da recusa (enviada ao solicitante no chat)"
              : "Mensagem ao solicitante (opcional)"}
          </label>
          <textarea
            id="arquivamento-justificativa"
            value={justificativa}
            maxLength={MOTIVO_ARQUIVAMENTO_MAX}
            autoFocus
            onChange={(e) => {
              setJustificativa(e.target.value);
              setErro(null);
            }}
            placeholder={
              modo === "recusar"
                ? "Explique por que o arquivamento não pode ser feito"
                : "Ex.: Arquivamento aceito, sem custo."
            }
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "arquivamento-erro" : undefined}
            className="min-h-20 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          {erro && (
            <p id="arquivamento-erro" role="alert" className="text-xs text-red-700">
              {erro}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm text-white disabled:opacity-50 ${
                modo === "recusar" ? "bg-red-700 hover:bg-red-800" : "bg-emerald-700 hover:bg-emerald-800"
              }`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {modo === "recusar" ? "Confirmar recusa" : "Confirmar arquivamento"}
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
    </div>
  );
}

/**
 * Desarquivar uma requisição (DDD). Confirmação inline: a justificativa é obrigatória e vai
 * ao chat do solicitante. `destino` é o rótulo do status para onde a requisição volta.
 */
export function DesarquivarRequisicao({
  requisicaoId,
  destino,
}: {
  requisicaoId: string;
  destino: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    setAberto(false);
    setJustificativa("");
    setErro(null);
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (justificativa.trim().length < MOTIVO_ARQUIVAMENTO_MIN) {
      setErro(`Escreva a justificativa com pelo menos ${MOTIVO_ARQUIVAMENTO_MIN} caracteres.`);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/requisicoes/${requisicaoId}/desarquivar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ justificativa }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.error || "Não foi possível desarquivar a requisição.");
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
    <div id="desarquivar" className="scroll-mt-6 bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="font-semibold text-gray-900">Desarquivar requisição</h3>
      <p className="mt-1 text-xs text-gray-600">
        A requisição volta para <strong className="font-semibold">{destino}</strong>
        {destino === "Pendente" && " e a análise de duplicidade recomeça"}. O solicitante vê a
        justificativa no chat.
      </p>
      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="mt-3 rounded-md border border-gray-400 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
        >
          Desarquivar requisição
        </button>
      ) : (
        <form
          onSubmit={confirmar}
          noValidate
          className="mt-3 grid gap-2 rounded-md border border-amber-200 bg-amber-50 p-4"
        >
          <label htmlFor="desarquivar-justificativa" className="text-xs font-semibold text-amber-900">
            Justificativa (enviada ao solicitante no chat)
          </label>
          <textarea
            id="desarquivar-justificativa"
            value={justificativa}
            maxLength={MOTIVO_ARQUIVAMENTO_MAX}
            autoFocus
            onChange={(e) => {
              setJustificativa(e.target.value);
              setErro(null);
            }}
            placeholder="Explique por que a requisição volta ao andamento"
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "desarquivar-erro" : "desarquivar-dica"}
            className="min-h-20 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <p id="desarquivar-dica" className="text-xs text-amber-900">
            {justificativa.length} de {MOTIVO_ARQUIVAMENTO_MAX} caracteres (mínimo {MOTIVO_ARQUIVAMENTO_MIN})
          </p>
          {erro && (
            <p id="desarquivar-erro" role="alert" className="text-xs text-red-700">
              {erro}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Confirmar desarquivamento
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
    </div>
  );
}

/**
 * Checagem de documentos (primeira subetapa do Setor de Atendimentos, #PEND-27). Um clique
 * marca como conferidos; o solicitante é avisado no chat e o acompanhamento avança.
 */
export function ConferirDocumentos({ requisicaoId }: { requisicaoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function conferir() {
    if (loading) return;
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/requisicoes/${requisicaoId}/documentos-conferidos`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.error || "Não foi possível registrar a conferência.");
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
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="font-semibold text-gray-900">Checagem de documentos</h3>
      <p className="mt-1 text-xs text-gray-600">
        Confira os documentos anexados e marque quando estiverem em ordem. O solicitante é avisado
        no chat e o acompanhamento avança para &quot;Liberação do número SEI&quot;.
      </p>
      {erro && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {erro}
        </p>
      )}
      <button
        type="button"
        onClick={conferir}
        disabled={loading}
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Marcar documentos como conferidos
      </button>
    </div>
  );
}

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
