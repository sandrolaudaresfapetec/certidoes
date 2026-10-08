import { Check, Clock } from "lucide-react";
import {
  ETAPAS_ACOMPANHAMENTO,
  acompanhamentoRequisicao,
} from "@/lib/requisicao-status";

const SITUACAO_PAGAMENTO: Record<string, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  ISENTO: "Isento",
};

interface AcompanhamentoProps {
  /** Número do expediente SEI do processo; ausente até o atendimento liberá-lo. */
  expediente: string | null;
  situacaoProcesso: string | null;
  pagamentoStatus: string | null;
  pagamentoValor: number | null;
  finalizadaEm: Date | null;
  /** Status da requisição (hoje só `ARQUIVADA` muda o acompanhamento). */
  statusRequisicao?: string;
}

type Estado = "FEITA" | "ATUAL" | "PENDENTE";

function estadoDaEtapa(indice: number, atual: number): Estado {
  if (indice < atual) return "FEITA";
  return indice === atual ? "ATUAL" : "PENDENTE";
}

const TEXTO_ESTADO: Record<Estado, string> = {
  FEITA: "concluída",
  ATUAL: "etapa atual",
  PENDENTE: "pendente",
};

function Marcador({
  estado,
  numero,
  ultimaConcluida,
}: {
  estado: Estado;
  numero: number;
  ultimaConcluida: boolean;
}) {
  if (estado === "FEITA" || (estado === "ATUAL" && ultimaConcluida)) {
    return (
      <span
        className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-700 text-white ${
          estado === "ATUAL" ? "ring-4 ring-emerald-100" : ""
        }`}
      >
        <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  if (estado === "ATUAL") {
    return (
      <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-700 text-sm font-bold text-white ring-4 ring-emerald-100">
        {numero}
      </span>
    );
  }
  return (
    <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-gray-300 bg-white text-sm text-gray-500">
      {numero}
    </span>
  );
}

function classeRotulo(estado: Estado): string {
  if (estado === "ATUAL") return "font-bold text-gray-900";
  return estado === "FEITA" ? "font-medium text-gray-700" : "text-gray-500";
}

/**
 * Acompanhamento da requisição para o solicitante: número SEI, etapa atual e
 * pagamento. A etapa é derivada do fluxo interno (ver `acompanhamentoRequisicao`).
 */
export function AcompanhamentoRequisicao({
  expediente,
  situacaoProcesso,
  pagamentoStatus,
  pagamentoValor,
  finalizadaEm,
  statusRequisicao,
}: AcompanhamentoProps) {
  const acomp = acompanhamentoRequisicao({ situacaoProcesso, pagamentoStatus, finalizadaEm, statusRequisicao });
  const ultima = ETAPAS_ACOMPANHAMENTO.length - 1;
  const mostrarRodape = Boolean(pagamentoStatus) || Boolean(finalizadaEm);

  return (
    <section
      aria-labelledby="acompanhamento-titulo"
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 id="acompanhamento-titulo" className="font-semibold text-gray-900">
            Acompanhamento
          </h3>
          <p className="text-xs text-gray-500">Etapa atual da sua solicitação no IGC.</p>
        </div>
        {expediente ? (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Número SEI</p>
            <p className="font-mono text-sm font-semibold text-gray-900">{expediente}</p>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Número SEI</p>
            <p className="flex items-center gap-1.5 text-sm text-gray-600">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Aguardando liberação do número SEI
            </p>
          </div>
        )}
      </div>

      {acomp.tipo === "SOBRESTADO" && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong className="font-semibold">Em sobrestamento.</strong> O andamento da sua
          solicitação está temporariamente suspenso.
        </p>
      )}

      {acomp.tipo === "CANCELADO" && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <strong className="font-semibold">Solicitação cancelada.</strong> Ela não terá mais
          andamento.
        </p>
      )}

      {acomp.tipo === "ARQUIVADA" && (
        <p className="rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-800">
          <strong className="font-semibold">Requisição arquivada.</strong> Ela não terá mais
          andamento. A conversa continua disponível para consulta.
        </p>
      )}

      {acomp.tipo === "ETAPA" && (
        <>
          {/* Telas largas: etapas lado a lado */}
          <ol aria-label="Etapas da solicitação" className="hidden sm:grid sm:grid-cols-6">
            {ETAPAS_ACOMPANHAMENTO.map((nome, i) => {
              const estado = estadoDaEtapa(i, acomp.atual);
              return (
                <li
                  key={nome}
                  aria-current={estado === "ATUAL" ? "step" : undefined}
                  className="relative flex flex-col items-center text-center"
                >
                  {i < ultima && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-1/2 top-4 h-0.5 w-full ${
                        estado === "FEITA" ? "bg-emerald-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                  <Marcador estado={estado} numero={i + 1} ultimaConcluida={i === ultima} />
                  <span className={`mt-2 px-1 text-xs ${classeRotulo(estado)}`}>
                    {nome}
                    <span className="sr-only"> ({TEXTO_ESTADO[estado]})</span>
                  </span>
                  {estado === "ATUAL" && acomp.detalhe && (
                    <span className="mt-0.5 px-1 text-[11px] text-emerald-800">
                      {acomp.detalhe}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          {/* Celular: etapas em lista vertical */}
          <ol aria-label="Etapas da solicitação" className="sm:hidden">
            {ETAPAS_ACOMPANHAMENTO.map((nome, i) => {
              const estado = estadoDaEtapa(i, acomp.atual);
              return (
                <li
                  key={nome}
                  aria-current={estado === "ATUAL" ? "step" : undefined}
                  className={`relative flex gap-3 ${i < ultima ? "pb-5" : ""}`}
                >
                  {i < ultima && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-4 top-8 h-full w-0.5 -translate-x-1/2 ${
                        estado === "FEITA" ? "bg-emerald-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                  <Marcador estado={estado} numero={i + 1} ultimaConcluida={i === ultima} />
                  <span className="pt-1.5">
                    <span className={`block text-sm ${classeRotulo(estado)}`}>
                      {nome}
                      <span className="sr-only"> ({TEXTO_ESTADO[estado]})</span>
                    </span>
                    {estado === "ATUAL" && acomp.detalhe && (
                      <span className="block text-xs text-emerald-800">{acomp.detalhe}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {mostrarRodape && (
        <p className="mt-5 border-t border-gray-100 pt-3 text-xs text-gray-600">
          {pagamentoStatus && (
            <>
              Pagamento:{" "}
              <strong className="font-medium text-gray-900">
                {SITUACAO_PAGAMENTO[pagamentoStatus] ?? pagamentoStatus}
                {pagamentoValor != null &&
                  ` — R$ ${pagamentoValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </strong>
            </>
          )}
          {pagamentoStatus && finalizadaEm && " · "}
          {finalizadaEm &&
            `Finalizada em ${new Date(finalizadaEm).toLocaleDateString("pt-BR")}`}
        </p>
      )}

      {acomp.tipo === "ETAPA" && acomp.atual === ultima && (
        <p className="mt-2 text-xs text-gray-500">
          O download da certidão ainda não está disponível neste portal.
        </p>
      )}
    </section>
  );
}
