import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSolicitante } from "@/lib/portal-auth";
import { formatarCPF } from "@/lib/cpf";
import {
  GRUPOS_STATUS_GERAL,
  grupoStatusGeral,
  statusRequisicao,
} from "@/lib/requisicao-status";
import { RequisicaoFiltros } from "@/components/requisicao-filtros";
import { CartoesStatusGeral } from "@/components/requisicao/cartoes-status-geral";
import { FileText, PlusCircle } from "lucide-react";
import { naoLidasPorSolicitacao } from "@/lib/chat";
import { SeloMensagensNovas } from "@/components/requisicao/selo-mensagens-novas";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PortalHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; grupo?: string }>;
}) {
  const solicitante = await requireSolicitante();
  if (!solicitante.cadastroCompleto) redirect("/portal/completar-cadastro");

  const { q = "", status = "", grupo: grupoParam = "" } = await searchParams;
  const grupo = grupoStatusGeral(grupoParam);

  const filtro: Prisma.SolicitacaoWhereInput = { solicitanteId: solicitante.id };
  if (status) filtro.status = status;
  if (grupo) filtro.AND = [{ status: { in: [...grupo.status] } }];
  if (q) {
    filtro.OR = [
      { protocolo: { contains: q } },
      { sigefNomeArea: { contains: q } },
      { sigefMunicipio: { contains: q } },
      { cjtMatricula: { contains: q.replace(/\D/g, "") || q } },
    ];
  }

  const [solicitacoes, todas] = await Promise.all([
    prisma.solicitacao.findMany({
      where: filtro,
      orderBy: { createdAt: "desc" },
      include: { documentos: { select: { tipo: true } } },
    }),
    prisma.solicitacao.findMany({
      where: { solicitanteId: solicitante.id },
      select: { status: true },
    }),
  ]);
  const novas = await naoLidasPorSolicitacao(solicitacoes, "SOLICITANTE");

  const contagens = Object.fromEntries(
    GRUPOS_STATUS_GERAL.map((g) => [
      g.chave,
      todas.filter((s) => (g.status as readonly string[]).includes(s.status)).length,
    ])
  );

  const paramsSemGrupo = new URLSearchParams();
  if (q) paramsSemGrupo.set("q", q);
  if (status) paramsSemGrupo.set("status", status);
  const hrefSemGrupo = paramsSemGrupo.size ? `/portal?${paramsSemGrupo}` : "/portal";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {solicitante.nome.split(" ")[0]}
          </h1>
          <p className="text-sm text-gray-500">
            CPF {formatarCPF(solicitante.cpf)} — identidade validada pelo gov.br
          </p>
        </div>
        <Link
          href="/portal/nova-solicitacao"
          className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-emerald-800"
        >
          <PlusCircle className="h-4 w-4" />
          Nova Requisição
        </Link>
      </div>

      <CartoesStatusGeral contagens={contagens} ativo={grupo?.chave ?? ""} q={q} status={status} />

      <RequisicaoFiltros action="/portal" q={q} status={status} grupo={grupo?.chave} />

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">
            Minhas Requisições{grupo && ` · ${grupo.rotulo}`}
          </h2>
          {grupo && (
            <Link href={hrefSemGrupo} className="text-xs text-emerald-700 hover:underline">
              Limpar filtro
            </Link>
          )}
        </div>
        {solicitacoes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">
            {q || status || grupo
              ? "Nenhuma requisição encontrada com os filtros aplicados."
              : "Você ainda não possui requisições. Clique em Nova Requisição para começar."}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {solicitacoes.map((s) => {
              const st = statusRequisicao(s.status);
              return (
                <li key={s.id}>
                  <Link
                    href={
                      s.status === "RASCUNHO"
                        ? `/portal/requisicoes/${s.id}/editar`
                        : `/portal/requisicoes/${s.id}`
                    }
                    className="px-6 py-4 flex items-center justify-between gap-3 hover:bg-gray-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-5 w-5 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                          {s.protocolo}
                          {s.sigefNomeArea && (
                            <span className="text-gray-500 font-normal"> — {s.sigefNomeArea}</span>
                          )}
                          {!s.tipoViaSigef && (
                            <span className="ml-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                              Sem registro no INCRA
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {s.status === "RASCUNHO"
                            ? `Rascunho salvo em ${new Date(s.updatedAt).toLocaleDateString("pt-BR")}`
                            : new Date(s.createdAt).toLocaleDateString("pt-BR")}
                          {s.sigefMunicipio && ` · ${s.sigefMunicipio}/${s.sigefUf}`}
                          {s.documentos.length > 0 &&
                            ` · ${s.documentos.length} documento(s) anexado(s)`}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      {novas.has(s.id) && <SeloMensagensNovas quantidade={novas.get(s.id)!} />}
                      <span
                        className={`shrink-0 whitespace-nowrap text-xs font-medium px-2.5 py-1 rounded-full ${st.classe}`}
                      >
                        {st.label}
                      </span>
                      {s.status === "RASCUNHO" && (
                        <span className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white">
                          Continuar
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
