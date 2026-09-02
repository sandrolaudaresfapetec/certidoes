import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSolicitante } from "@/lib/portal-auth";
import { RequisicaoForm } from "@/components/requisicao-form";
import { formularioDoPayload } from "@/lib/cjt-formulario";

export const dynamic = "force-dynamic";

/** Situações em que a requisição ainda aceita alteração pelo cliente. */
const STATUS_EDITAVEIS = ["PENDENTE", "DEVOLVIDA"];

export default async function EditarRequisicaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const solicitante = await requireSolicitante();

  // Escopo do cliente: apenas requisições do próprio solicitante.
  const requisicao = await prisma.solicitacao.findFirst({
    where: { id, solicitanteId: solicitante.id },
    include: { documentos: { select: { tipo: true } } },
  });
  if (!requisicao) notFound();

  const editavel =
    !requisicao.processId &&
    !requisicao.finalizadaEm &&
    STATUS_EDITAVEIS.includes(requisicao.status);

  const voltar = (
    <Link
      href={`/portal/requisicoes/${requisicao.id}`}
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
    >
      <ArrowLeft className="h-4 w-4" />
      Acompanhar Requisição
    </Link>
  );

  if (!editavel) {
    return (
      <div>
        {voltar}
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Requisição {requisicao.protocolo}
        </h1>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
          Esta requisição já está em andamento no IGC e não pode mais ser
          alterada. Fale com o atendimento para pedir a devolução.
        </p>
      </div>
    );
  }

  const nomes = requisicao.cjtNomesPoligonos
    ? (JSON.parse(requisicao.cjtNomesPoligonos) as string[])
    : [];

  return (
    <div>
      {voltar}
      <h1 className="text-xl font-semibold text-gray-900 mb-1">
        Alterar Requisição {requisicao.protocolo}
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Revise as respostas e os dados do imóvel. As alterações substituem os
        dados enviados anteriormente.
      </p>

      <RequisicaoForm
        cpf={solicitante.cpf}
        criarEndpoint="/api/portal/solicitacoes"
        documentosEndpoint="/api/portal/documentos"
        painelHref={`/portal/requisicoes/${requisicao.id}`}
        painelLabel="Ver requisição"
        edicao={{
          endpoint: `/api/portal/solicitacoes/${requisicao.id}`,
          cjt: formularioDoPayload({
            qualidade: requisicao.cjtQualidade,
            resultado: requisicao.cjtResultado,
            situacao: requisicao.cjtSituacao,
            propriedadeDe: requisicao.cjtPropriedadeDe,
            matricula: requisicao.cjtMatricula,
            qtdPoligonos: requisicao.cjtQtdPoligonos,
            nomesPoligonos: nomes,
            codigoIncra: requisicao.cjtCodigoIncra,
            declaracao: requisicao.cjtDeclaracaoAceita,
          }),
          tipoViaSigef: requisicao.tipoViaSigef,
          sigefParcelaCodigo: requisicao.sigefParcelaCodigo,
          emNomeDeCpf: requisicao.emNomeDeCpf,
          emNomeDeNome: requisicao.emNomeDeNome,
          observacao: requisicao.observacao,
          documentosEnviados: requisicao.documentos.map((d) => d.tipo),
        }}
      />
    </div>
  );
}
