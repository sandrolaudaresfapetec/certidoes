import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSolicitante } from "@/lib/portal-auth";
import { RequisicaoDetalhe } from "@/components/requisicao-detalhe";

export const dynamic = "force-dynamic";

export default async function AcompanharRequisicaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const solicitante = await requireSolicitante();

  // Escopo do cliente: apenas requisições do próprio solicitante.
  const requisicao = await prisma.solicitacao.findFirst({
    where: { id, solicitanteId: solicitante.id },
    include: {
      solicitante: true,
      documentos: { select: { id: true, tipo: true, nomeArquivo: true } },
      process: { select: { id: true, ordem: true, situacao: true, tipoServico: true } },
    },
  });
  if (!requisicao) notFound();

  // Alteração pelo cliente só antes da abertura do processo (ou após devolução).
  const editavel =
    !requisicao.processId &&
    !requisicao.finalizadaEm &&
    ["PENDENTE", "DEVOLVIDA"].includes(requisicao.status);

  return (
    <div>
      <Link
        href="/portal"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Minhas Requisições
      </Link>
      <div className="flex items-center justify-between mb-4 gap-4">
        <h1 className="text-xl font-semibold text-gray-900">Acompanhar Requisição</h1>
        {editavel && (
          <Link
            href={`/portal/requisicoes/${requisicao.id}/editar`}
            className="inline-flex items-center gap-1 bg-emerald-700 text-white px-4 py-2 rounded-md text-sm hover:bg-emerald-800"
          >
            <Pencil className="h-4 w-4" />
            Alterar requisição
          </Link>
        )}
      </div>
      <RequisicaoDetalhe requisicao={requisicao} escopo="CLIENTE" />
    </div>
  );
}
