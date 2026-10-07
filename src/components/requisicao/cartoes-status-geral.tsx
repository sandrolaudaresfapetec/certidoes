import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Archive,
  RotateCcw,
  FilePen,
  type LucideIcon,
} from "lucide-react";
import { GRUPOS_STATUS_GERAL, type ChaveGrupoStatus } from "@/lib/requisicao-status";

const VISUAL: Record<ChaveGrupoStatus, { Icone: LucideIcon; cor: string }> = {
  "nao-enviadas": { Icone: FilePen, cor: "text-gray-500" },
  "em-analise": { Icone: Clock, cor: "text-amber-500" },
  devolvidas: { Icone: RotateCcw, cor: "text-red-500" },
  arquivadas: { Icone: Archive, cor: "text-gray-500" },
  concluidas: { Icone: CheckCircle2, cor: "text-emerald-600" },
};

/**
 * Status Geral do solicitante: um cartão por grupo, com a contagem de todas as suas
 * requisições. Cada cartão é um link que aplica o filtro (`?grupo=`); o cartão ativo
 * volta à lista completa. Grupos sem status no backend ficam desabilitados.
 */
export function CartoesStatusGeral({
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
    return qs ? `/portal?${qs}` : "/portal";
  }

  return (
    <ul
      aria-label="Situação geral das requisições"
      className="grid grid-cols-2 lg:grid-cols-5 gap-3"
    >
      {GRUPOS_STATUS_GERAL.map((g) => {
        const { Icone, cor } = VISUAL[g.chave];
        const selecionado = ativo === g.chave;
        const conteudo = (
          <>
            <Icone className={`h-8 w-8 shrink-0 ${cor}`} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-2xl font-bold text-gray-900">
                {contagens[g.chave] ?? 0}
              </span>
              <span className="block text-xs text-gray-600">{g.rotulo}</span>
              {g.status.length === 0 && (
                <span className="mt-1 inline-block rounded-full border border-dashed border-gray-400 bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                  em breve
                </span>
              )}
            </span>
          </>
        );
        return (
          <li key={g.chave}>
            {g.status.length === 0 ? (
              <div
                aria-disabled="true"
                className="flex h-full cursor-not-allowed items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 opacity-80"
              >
                {conteudo}
              </div>
            ) : (
              <Link
                href={href(g.chave)}
                aria-current={selecionado ? "true" : undefined}
                className={`flex h-full items-center gap-3 rounded-lg border p-4 ${
                  selecionado
                    ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600"
                    : "border-gray-200 bg-white hover:border-gray-400"
                }`}
              >
                {conteudo}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
