"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Loader2, Lock, MessageCircleQuestion } from "lucide-react";
import { LIMITE_TEXTO_CHAT, RESPOSTA_ENCERRADA, type LadoChat, type MensagemChat } from "@/lib/chat-tipos";

const INTERVALO_ATUALIZACAO_MS = 20_000;

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** Cores por lado: verde no portal do solicitante, azul no backoffice (padrão de cada área). */
const TEMA: Record<LadoChat, { balao: string; botao: string }> = {
  SOLICITANTE: { balao: "bg-emerald-700", botao: "bg-emerald-700 hover:bg-emerald-800" },
  ATENDIMENTO: { balao: "bg-blue-700", botao: "bg-blue-700 hover:bg-blue-800" },
};

/**
 * Conversa da solicitação. `endpoint` é a rota de mensagens da área (portal ou atendimento).
 * Atualiza sozinho a cada 20 s enquanto a aba está visível e na hora em que o usuário envia.
 */
export function ChatSolicitacao({
  endpoint,
  lado,
  inicial,
  aceitaInicial,
  titulo,
  subtitulo,
  rotuloCampo,
}: {
  endpoint: string;
  lado: LadoChat;
  inicial: MensagemChat[];
  aceitaInicial: boolean;
  titulo: string;
  subtitulo?: string;
  rotuloCampo: string;
}) {
  const [mensagens, setMensagens] = useState<MensagemChat[]>(inicial);
  const [aceita, setAceita] = useState(aceitaInicial);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const tema = TEMA[lado];
  const perguntaAberta =
    lado === "SOLICITANTE" && mensagens.some((m) => m.tipo === "PERGUNTA" && !m.respondidaEm);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMensagens(data.mensagens);
      setAceita(Boolean(data.aceita));
      setAtualizadoEm(new Date());
    } catch {
      // Sem rede: mantém o que está na tela e tenta de novo no próximo ciclo.
    }
  }, [endpoint]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") carregar();
    }, INTERVALO_ATUALIZACAO_MS);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") carregar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [carregar]);

  useEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensagens.length]);

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    if (enviando) return;
    if (!texto.trim()) {
      setErro("Escreva uma mensagem antes de enviar.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.error || "Não foi possível enviar a mensagem. Tente novamente.");
        return;
      }
      setTexto("");
      setMensagens((atual) =>
        atual.some((m) => m.id === data.mensagem.id) ? atual : [...atual, data.mensagem]
      );
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function responder(mensagemId: string, opcao: string) {
    setRespondendo(mensagemId);
    setErro(null);
    try {
      const res = await fetch(`${endpoint}/${mensagemId}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opcao }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.error || "Não foi possível registrar a resposta. Tente novamente.");
        await carregar();
        return;
      }
      setMensagens((atual) => atual.map((m) => (m.id === data.mensagem.id ? data.mensagem : m)));
      // A resposta pode mudar a situação da requisição (seguir para a fila, arquivar).
      await carregar();
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setRespondendo(null);
    }
  }

  const idCampo = `chat-texto-${lado.toLowerCase()}`;
  const idErro = `${idCampo}-erro`;

  return (
    <section
      id="conversa"
      className="bg-white rounded-lg border border-gray-200"
      aria-labelledby={`${idCampo}-titulo`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
        <div className="min-w-0">
          <h2 id={`${idCampo}-titulo`} className="text-sm font-semibold text-gray-900">
            {titulo}
          </h2>
          {subtitulo && <p className="text-xs text-gray-600">{subtitulo}</p>}
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600" aria-live="off">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          {atualizadoEm ? (
            <>
              Atualizado às{" "}
              <time dateTime={atualizadoEm.toISOString()} suppressHydrationWarning>
                {atualizadoEm.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Sao_Paulo",
                })}
              </time>
            </>
          ) : (
            "Atualiza sozinho a cada 20 segundos"
          )}
        </span>
      </header>

      {perguntaAberta && (
        <p
          role="status"
          className="mx-5 mt-4 flex items-start gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900"
        >
          <MessageCircleQuestion className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          Há uma pergunta esperando a sua resposta abaixo. Ela precisa ser respondida para a análise da
          requisição continuar.
        </p>
      )}

      <div
        ref={listaRef}
        role="log"
        aria-live="polite"
        aria-label="Mensagens da solicitação"
        className="grid max-h-96 gap-3 overflow-y-auto px-5 py-4"
      >
        {mensagens.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-600">
            Nenhuma mensagem ainda.{" "}
            {lado === "SOLICITANTE"
              ? "Escreva abaixo para falar com o IGC."
              : "Escreva abaixo para falar com o solicitante."}
          </p>
        )}
        {mensagens.map((m) => (
          <Mensagem
            key={m.id}
            mensagem={m}
            lado={lado}
            balaoProprio={tema.balao}
            respondendo={respondendo === m.id}
            onResponder={responder}
          />
        ))}
      </div>

      {aceita ? (
        <form onSubmit={enviar} className="grid gap-2 border-t border-gray-100 px-5 py-4" noValidate>
          <label htmlFor={idCampo} className="text-xs font-semibold text-gray-600">
            {rotuloCampo}
          </label>
          <textarea
            id={idCampo}
            value={texto}
            maxLength={LIMITE_TEXTO_CHAT}
            onChange={(e) => {
              setTexto(e.target.value);
              setErro(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) enviar();
            }}
            placeholder="Escreva sua mensagem"
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? idErro : undefined}
            className="min-h-14 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {erro && (
            <p id={idErro} role="alert" className="text-xs text-red-600">
              {erro}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-gray-600">
              {texto.length} de {LIMITE_TEXTO_CHAT} caracteres
            </span>
            <button
              type="submit"
              disabled={enviando}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm text-white disabled:opacity-50 ${tema.botao}`}
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Enviar mensagem
            </button>
          </div>
        </form>
      ) : (
        <p className="flex items-start gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4 text-xs text-gray-700">
          <Lock className="mt-px h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
          Esta solicitação foi arquivada e não aceita novas mensagens. O histórico continua
          disponível para consulta.
        </p>
      )}
    </section>
  );
}

function Mensagem({
  mensagem: m,
  lado,
  balaoProprio,
  respondendo,
  onResponder,
}: {
  mensagem: MensagemChat;
  lado: LadoChat;
  balaoProprio: string;
  respondendo: boolean;
  onResponder: (mensagemId: string, opcao: string) => void;
}) {
  const quando = (
    <time dateTime={m.createdAt} suppressHydrationWarning>
      {formatoDataHora.format(new Date(m.createdAt))}
    </time>
  );

  if (m.autorTipo === "SISTEMA") {
    const escolhida = m.opcoes?.find((o) => o.id === m.respostaOpcao);
    return (
      <div className="grid max-w-[92%] justify-self-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
        <p className="flex items-start gap-2 [overflow-wrap:anywhere]">
          <Info className="mt-px h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
          <span className="whitespace-pre-wrap">{m.texto}</span>
        </p>
        {m.tipo === "PERGUNTA" && m.opcoes && (
          <>
            {m.respondidaEm && m.respostaOpcao === RESPOSTA_ENCERRADA ? (
              <p className="text-xs font-semibold text-gray-600">Pergunta encerrada.</p>
            ) : m.respondidaEm ? (
              <p className="text-xs font-semibold text-emerald-800">
                {lado === "SOLICITANTE" ? "Você respondeu" : "O solicitante respondeu"}:{" "}
                {escolhida?.rotulo ?? "—"}
              </p>
            ) : lado === "SOLICITANTE" ? (
              <div className="flex flex-wrap gap-2">
                {m.opcoes.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    disabled={respondendo}
                    onClick={() => onResponder(m.id, o.id)}
                    className="rounded-md border border-gray-400 bg-white px-3 py-1.5 text-xs text-gray-900 hover:bg-gray-100 disabled:opacity-50"
                  >
                    {o.rotulo}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600">Aguardando a resposta do solicitante.</p>
            )}
          </>
        )}
      </div>
    );
  }

  const meu = m.autorTipo === lado;
  return (
    <div className={`grid max-w-[80%] gap-0.5 ${meu ? "justify-self-end text-right" : "justify-self-start"}`}>
      <span className="text-[11px] text-gray-600">
        {meu ? "Você" : m.autorTipo === "ATENDIMENTO" ? `Atendimento IGC · ${m.autorNome}` : m.autorNome} · {quando}
      </span>
      <div
        className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-left text-sm [overflow-wrap:anywhere] ${
          meu ? `${balaoProprio} text-white` : "bg-gray-100 text-gray-900"
        }`}
      >
        {m.texto}
      </div>
    </div>
  );
}
