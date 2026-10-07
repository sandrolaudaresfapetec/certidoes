import Link from "next/link";
import { PlusCircle, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatarCPF } from "@/lib/cpf";
import { statusRequisicao } from "@/lib/requisicao-status";
import { RequisicaoFiltros } from "@/components/requisicao-filtros";
import { requireUsuario, podeAtender } from "@/lib/auth";
import { STATUS_FORA_DA_FILA } from "@/lib/solicitacao-estados";
import type { Prisma } from "@prisma/client";
import { naoLidasPorSolicitacao } from "@/lib/chat";
import { SeloMensagensNovas } from "@/components/requisicao/selo-mensagens-novas";

export const dynamic = "force-dynamic";

export default async function RequisicoesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; semProcesso?: string }>;
}) {
  const { q = "", status = "", semProcesso = "" } = await searchParams;
  const usuario = await requireUsuario();
  const atendimento = podeAtender(usuario);

  // Rascunho é só do solicitante: o atendimento só o vê depois de congelado (13+ polígonos).
  const where: Prisma.SolicitacaoWhereInput = {
    NOT: { status: "RASCUNHO", congeladaEm: null },
  };
  if (status) where.status = status;
  if (semProcesso === "1") {
    where.processId = null;
    // Só o que está na fila: sem rascunho, congelada, devolvida, arquivada etc.
    if (!status) where.status = { notIn: [...STATUS_FORA_DA_FILA] };
  }
  if (q) {
    where.OR = [
      { protocolo: { contains: q } },
      { sigefNomeArea: { contains: q } },
      { sigefMunicipio: { contains: q } },
      { solicitante: { nome: { contains: q } } },
      { solicitante: { cpf: { contains: q.replace(/\D/g, "") || q } } },
    ];
  }

  const requisicoes = await prisma.solicitacao.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      solicitante: { select: { nome: true, cpf: true } },
      process: { select: { id: true, ordem: true } },
    },
  });
  // Selo de mensagens novas só para quem pode abrir o chat (ADMIN e SDTC).
  const novas = atendimento
    ? await naoLidasPorSolicitacao(requisicoes, "ATENDIMENTO")
    : new Map<string, number>();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requisições</h1>
          <p className="text-sm text-gray-500">
            Requisições de certidão recebidas pelo portal e pelo atendimento.
          </p>
        </div>
        {atendimento && (
          <Link
            href="/requisicoes/nova"
            className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-emerald-800"
          >
            <PlusCircle className="h-4 w-4" />
            Nova Requisição
          </Link>
        )}
      </div>

      <RequisicaoFiltros
        action="/requisicoes"
        q={q}
        status={status}
        placeholder="Buscar por protocolo, cliente, CPF ou município"
        ocultarStatus={["RASCUNHO"]}
      />

      <div className="flex gap-3 text-sm">
        <Link
          href="/requisicoes"
          className={`px-3 py-1 rounded-full border ${
            semProcesso === "1"
              ? "border-gray-200 text-gray-600"
              : "border-gray-900 text-gray-900"
          }`}
        >
          Todas
        </Link>
        <Link
          href="/requisicoes?semProcesso=1"
          className={`px-3 py-1 rounded-full border ${
            semProcesso === "1"
              ? "border-gray-900 text-gray-900"
              : "border-gray-200 text-gray-600"
          }`}
        >
          Aguardando abertura de processo
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        {requisicoes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">
            Nenhuma requisição encontrada.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {requisicoes.map((r) => {
              const st = statusRequisicao(r.status);
              return (
                <li key={r.id}>
                  <Link
                    href={`/requisicoes/${r.id}`}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {r.protocolo} — {r.solicitante.nome}
                        </p>
                        <p className="text-xs text-gray-500">
                          CPF {formatarCPF(r.solicitante.cpf)} ·{" "}
                          {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                          {r.sigefMunicipio && ` · ${r.sigefMunicipio}/${r.sigefUf}`}
                          {r.process
                            ? ` · processo #${r.process.ordem}`
                            : " · sem processo aberto"}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      {novas.has(r.id) && <SeloMensagensNovas quantidade={novas.get(r.id)!} />}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.classe}`}>
                        {st.label}
                      </span>
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
