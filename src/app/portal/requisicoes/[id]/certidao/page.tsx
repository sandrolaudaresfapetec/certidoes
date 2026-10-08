import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSolicitante } from "@/lib/portal-auth";
import { certidaoLiberadaParaDownload } from "@/lib/requisicao-status";
import { CertidaoDocumento } from "@/components/certidao-documento";

export const dynamic = "force-dynamic";

/**
 * Download da certidao pelo solicitante (#PEND-28): so da propria requisicao e so depois
 * que o processo foi finalizado (assinaturas e SEI) e o pagamento registrado (pago ou isento).
 */
export default async function CertidaoPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const solicitante = await requireSolicitante();

  const requisicao = await prisma.solicitacao.findFirst({
    where: { id, solicitanteId: solicitante.id },
    select: {
      id: true,
      status: true,
      pagamentoStatus: true,
      finalizadaEm: true,
      process: { select: { id: true, situacao: true } },
    },
  });
  if (!requisicao?.process) notFound();

  const voltar = `/portal/requisicoes/${requisicao.id}`;
  if (!certidaoLiberadaParaDownload(requisicao)) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Link href={voltar} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Acompanhar Requisição
        </Link>
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          A certidão ainda não está liberada para download: ela fica disponível depois da assinatura do
          Diretor, do envio ao SEI e da confirmação do pagamento.
        </p>
      </div>
    );
  }

  return (
    <CertidaoDocumento
      processoId={requisicao.process.id}
      voltarHref={voltar}
      voltarRotulo="Acompanhar Requisição"
    />
  );
}
