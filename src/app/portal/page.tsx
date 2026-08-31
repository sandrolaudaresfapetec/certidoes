import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSolicitante } from "@/lib/portal-auth";
import { formatarCPF } from "@/lib/cpf";
import { statusRequisicao } from "@/lib/requisicao-status";
import { RequisicaoFiltros } from "@/components/requisicao-filtros";
import { FileText, PlusCircle, Clock, CheckCircle2, RotateCcw } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PortalHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const solicitante = await requireSolicitante();
  if (!solicitante.cadastroCompleto) redirect("/portal/completar-cadastro");

  const { q = "", status = "" } = await searchParams;

  const filtro: Prisma.SolicitacaoWhereInput = { solicitanteId: solicitante.id };
  if (status) filtro.status = status;
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

  const pendentes = todas.filter((s) => ["PENDENTE", "EM_ANALISE"].includes(s.status)).length;
  const aprovadas = todas.filter((s) => ["APROVADA", "CONCLUIDA"].includes(s.status)).length;
  const devolvidas = todas.filter((s) => s.status === "DEVOLVIDA").length;

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

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-amber-500" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{pendentes}</p>
            <p className="text-xs text-gray-500">Requisições pendentes</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{aprovadas}</p>
            <p className="text-xs text-gray-500">Requisições aprovadas</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
          <RotateCcw className="h-8 w-8 text-red-500" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{devolvidas}</p>
            <p className="text-xs text-gray-500">Requisições devolvidas</p>
          </div>
        </div>
      </div>

      <RequisicaoFiltros action="/portal" q={q} status={status} />

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Minhas Requisições</h2>
        </div>
        {solicitacoes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">
            {q || status
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
                    href={`/portal/requisicoes/${s.id}`}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
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
                          {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                          {s.sigefMunicipio && ` · ${s.sigefMunicipio}/${s.sigefUf}`}
                          {s.documentos.length > 0 &&
                            ` · ${s.documentos.length} documento(s) anexado(s)`}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.classe}`}>
                      {st.label}
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
