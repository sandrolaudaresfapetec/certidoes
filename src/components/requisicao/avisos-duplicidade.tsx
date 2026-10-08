import Link from "next/link";
import { AlertTriangle, Clock, MessageCircleQuestion } from "lucide-react";
import type { SobreposicaoDaRequisicao } from "@/lib/duplicidade-servidor";
import { STATUS_SOLICITACAO } from "@/lib/solicitacao-estados";

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

const ROTULO_SITUACAO: Record<string, string> = {
  S1: "repetição de certidão finalizada",
  S2: "repetição com cadastro diferente",
  S3: "requisição igual em andamento",
  S4: "sobreposição",
};

/**
 * Selo curto de sobreposição, para listas (#PEND-30). Mostrado só ao backoffice: o
 * solicitante não recebe aviso de sobreposição.
 */
export function SeloSobreposicao() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      Sobreposição
    </span>
  );
}

/** Aviso vermelho com as requisições que se repetem ou se sobrepõem a esta. */
export function AvisoSobreposicao({ sobreposicoes }: { sobreposicoes: SobreposicaoDaRequisicao[] }) {
  if (sobreposicoes.length === 0) return null;
  return (
    <div role="status" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        Sobreposição com {sobreposicoes.length === 1 ? "outra requisição" : `${sobreposicoes.length} outras requisições`}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {sobreposicoes.map((s) => (
          <li key={s.id}>
            <Link href={`/requisicoes/${s.id}`} className="font-semibold underline">
              {s.protocolo}
            </Link>{" "}
            — {s.motivo}{" "}
            <span className="text-red-800/80">({ROTULO_SITUACAO[s.situacao] ?? s.situacao})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Situação da análise de duplicidade desta requisição, para a DDD. */
export function AvisoAnaliseDuplicidade({
  status,
  processId,
  analiseDuplicidadeEm,
}: {
  status: string;
  processId: string | null;
  analiseDuplicidadeEm: Date | null;
}) {
  if (status === STATUS_SOLICITACAO.PENDENTE && !analiseDuplicidadeEm && !processId) {
    return (
      <div role="status" className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <strong className="font-semibold">Aguardando a análise de duplicidade</strong> (roda às 12:00 e às
          00:00). A abertura do processo fica bloqueada até lá.
        </p>
      </div>
    );
  }
  if (status === STATUS_SOLICITACAO.AGUARDANDO_CLIENTE) {
    return (
      <div role="status" className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
        <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <strong className="font-semibold">Aguardando a resposta do solicitante</strong> a uma pergunta de
          duplicidade no chat. Abertura de processo e pagamento ficam bloqueados até lá.
        </p>
      </div>
    );
  }
  if (analiseDuplicidadeEm) {
    return (
      <p className="text-xs text-gray-600">
        Análise de duplicidade em {formatoDataHora.format(analiseDuplicidadeEm)}.
      </p>
    );
  }
  return null;
}
