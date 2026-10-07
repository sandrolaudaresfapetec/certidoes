import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSolicitante } from "@/lib/portal-auth";
import { RequisicaoForm } from "@/components/requisicao-form";
import {
  LIMITE_POLIGONOS_MAXIMO,
  ajustarNomesPoligonos,
  formularioDoPayload,
  lerPoligonos,
} from "@/lib/cjt-formulario";
import { clientePodeEditar } from "@/lib/solicitacao-estados";

export const dynamic = "force-dynamic";

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

  const editavel = clientePodeEditar(requisicao);

  const rascunho = requisicao.status === "RASCUNHO";

  const voltar = (
    <Link
      href={rascunho ? "/portal?grupo=nao-enviadas" : `/portal/requisicoes/${requisicao.id}`}
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
    >
      <ArrowLeft className="h-4 w-4" />
      {rascunho ? "Minhas Requisições" : "Acompanhar Requisição"}
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

  const nomesGuardados = requisicao.cjtNomesPoligonos
    ? (JSON.parse(requisicao.cjtNomesPoligonos) as string[])
    : [];
  // Liberado pela DDD com mais de 12 polígonos: o rascunho guardou só 12 nomes; completa a lista.
  const liberada = Boolean(requisicao.liberadaEm);
  const qtd = requisicao.cjtQtdPoligonos;
  const nomes =
    liberada && qtd
      ? ajustarNomesPoligonos(nomesGuardados, Math.min(qtd, LIMITE_POLIGONOS_MAXIMO))
      : nomesGuardados;

  return (
    <div>
      {voltar}
      <h1 className="text-xl font-semibold text-gray-900 mb-1">
        {rascunho ? "Continuar solicitação" : "Alterar Requisição"} {requisicao.protocolo}
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        {rascunho
          ? `Este é um rascunho salvo em ${new Date(requisicao.updatedAt).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              dateStyle: "short",
              timeStyle: "short",
            })}. Complete as respostas e envie quando estiver pronto. Nada é analisado pelo IGC antes do envio.`
          : "Revise as respostas e os dados do imóvel. As alterações substituem os dados enviados anteriormente."}
      </p>
      {requisicao.congeladaEm && (
        <p className="mb-6 -mt-3 text-sm">
          <Link
            href={`/portal/requisicoes/${requisicao.id}#conversa`}
            className="text-emerald-800 underline"
          >
            Ver conversa com a DDD
          </Link>
        </p>
      )}

      <RequisicaoForm
        cpf={solicitante.cpf}
        criarEndpoint="/api/portal/solicitacoes"
        documentosEndpoint="/api/portal/documentos"
        variante="SOLICITANTE"
        painelHref={`/portal/requisicoes/${requisicao.id}`}
        painelLabel="Ver requisição"
        edicao={{
          endpoint: `/api/portal/solicitacoes/${requisicao.id}`,
          cjt: formularioDoPayload({
            qualidade: requisicao.cjtQualidade,
            resultado: requisicao.cjtResultado,
            situacao: requisicao.cjtSituacao,
            propriedadeDe: requisicao.cjtPropriedadeDe,
            informaMatricula: requisicao.cjtInformaMatricula,
            matricula: requisicao.cjtMatricula,
            qtdPoligonos: requisicao.cjtQtdPoligonos,
            nomesPoligonos: nomes,
            parcelasPoligonos: ajustarNomesPoligonos(
              lerPoligonos(requisicao.cjtPoligonos, null).map((p) => p.parcelaCodigo ?? ""),
              nomes.length
            ),
            codigoIncra: requisicao.cjtCodigoIncra,
            declaracao: requisicao.cjtDeclaracaoAceita,
          }),
          tipoViaSigef: requisicao.tipoViaSigef,
          sigefParcelaCodigo: requisicao.sigefParcelaCodigo,
          emNomeDeCpf: requisicao.emNomeDeCpf,
          emNomeDeNome: requisicao.emNomeDeNome,
          observacao: requisicao.observacao,
          documentosEnviados: requisicao.documentos.map((d) => d.tipo),
          id: requisicao.id,
          rascunho,
          liberada,
        }}
      />
    </div>
  );
}
