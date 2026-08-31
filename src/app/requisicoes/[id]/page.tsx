import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario, podeAtender } from "@/lib/auth";
import { RequisicaoDetalhe } from "@/components/requisicao-detalhe";
import { AberturaProcesso, FinalizacaoPagamento } from "@/components/atendimento-acoes";

export const dynamic = "force-dynamic";

export default async function VisualizarRequisicaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await requireUsuario();

  const requisicao = await prisma.solicitacao.findUnique({
    where: { id },
    include: {
      solicitante: true,
      documentos: { select: { id: true, tipo: true, nomeArquivo: true } },
      process: { select: { id: true, ordem: true, situacao: true, tipoServico: true } },
    },
  });
  if (!requisicao) notFound();

  const atendimento = podeAtender(usuario);

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <Link
        href="/requisicoes"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Requisições
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Visualizar Requisição</h1>

      <RequisicaoDetalhe requisicao={requisicao} escopo="INTERNO" />

      {atendimento && (
        <div className="space-y-6">
          {!requisicao.process && <AberturaProcesso requisicaoId={requisicao.id} />}
          <FinalizacaoPagamento
            requisicaoId={requisicao.id}
            statusInicial={requisicao.pagamentoStatus}
            valorInicial={requisicao.pagamentoValor}
          />
        </div>
      )}
    </div>
  );
}
