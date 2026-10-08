import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Cog,
  ListChecks,
  MessageCircleQuestion,
  RotateCcw,
  Snowflake,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { GRUPOS_ATENDIMENTO, type ChaveGrupoAtendimento } from "@/lib/requisicao-grupos-atendimento";

const VISUAL: Record<ChaveGrupoAtendimento, { Icone: LucideIcon; cor: string }> = {
  "analise-duplicidade": { Icone: Timer, cor: "text-amber-500" },
  fila: { Icone: ListChecks, cor: "text-blue-600" },
  "aguardando-cliente": { Icone: MessageCircleQuestion, cor: "text-violet-600" },
  congeladas: { Icone: Snowflake, cor: "text-orange-500" },
  "em-analise": { Icone: Cog, cor: "text-blue-600" },
  devolvidas: { Icone: RotateCcw, cor: "text-red-500" },
  "arquivamento-solicitado": { Icone: ArchiveRestore, cor: "text-amber-600" },
  arquivadas: { Icone: Archive, cor: "text-gray-500" },
  concluidas: { Icone: CheckCircle2, cor: "text-emerald-600" },
};

/**
 * Situação das requisições no backoffice: um cartão por grupo, com a contagem de todas as
 * requisições visíveis ao atendimento. Cada cartão é um link que aplica o filtro (`?grupo=`);
 * o cartão ativo volta à lista completa. A busca e o seletor de situação são mantidos.
 */
export function CartoesSituacaoAtendimento({
  contagens,
  ativo,
  q,
  status,
}: {
  contagens: Record<string, number>;
  ativo: string;
  q: string;
  status: string;
}) {
  function href(chave: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (chave !== ativo) params.set("grupo", chave);
    const qs = params.toString();
    return qs ? `/requisicoes?${qs}` : "/requisicoes";
  }

  return (
    <ul
      aria-label="Situação das requisições"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
    >
      {GRUPOS_ATENDIMENTO.map((g) => {
        const { Icone, cor } = VISUAL[g.chave];
        const selecionado = ativo === g.chave;
        return (
          <li key={g.chave}>
            <Link
              href={href(g.chave)}
              title={g.dica}
              aria-current={selecionado ? "true" : undefined}
              className={`flex h-full items-center gap-3 rounded-lg border p-4 ${
                selecionado
                  ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600"
                  : "border-gray-200 bg-white hover:border-gray-400"
              }`}
            >
              <Icone className={`h-7 w-7 shrink-0 ${cor}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-2xl font-bold text-gray-900">{contagens[g.chave] ?? 0}</span>
                <span className="block text-xs text-gray-600">{g.rotulo}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
