import { createHash } from "crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSolicitante } from "@/lib/portal-auth";
import { reciboDisponivel } from "@/lib/requisicao-status";
import { formatDateTime } from "@/lib/utils";
import { exibirCpfCnpj } from "@/lib/mascaras";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

const SITUACAO: Record<string, string> = { PAGO: "Pago", ISENTO: "Isento" };

/** Recibo do pagamento da requisição, para o solicitante imprimir ou salvar em PDF. */
export default async function ReciboPagamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const solicitante = await requireSolicitante();

  const requisicao = await prisma.solicitacao.findFirst({
    where: { id, solicitanteId: solicitante.id },
    include: {
      solicitante: true,
      process: { select: { ordem: true, expediente: true, tipoServico: true } },
    },
  });
  if (!requisicao) notFound();

  const voltar = `/portal/requisicoes/${requisicao.id}`;
  if (!reciboDisponivel(requisicao.pagamentoStatus)) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Link href={voltar} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Acompanhar Requisição
        </Link>
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          O recibo fica disponível depois que o Atendimento registrar o pagamento desta requisição.
        </p>
      </div>
    );
  }

  const isento = requisicao.pagamentoStatus === "ISENTO";
  const valor = requisicao.pagamentoValor ?? 0;
  const pagoEm = requisicao.pagamentoEm ?? requisicao.finalizadaEm ?? requisicao.updatedAt;
  const autenticacao = createHash("sha256")
    .update(`${requisicao.id}|${requisicao.protocolo}|${requisicao.pagamentoStatus}|${valor}|${pagoEm?.toISOString() ?? ""}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();

  const linhas: [string, string][] = [
    ["Protocolo", requisicao.protocolo],
    ["Solicitante", requisicao.solicitante.nome],
    ["CPF", exibirCpfCnpj(requisicao.solicitante.cpf) ?? requisicao.solicitante.cpf],
    ["Serviço", requisicao.process?.tipoServico ?? "Certidão de Jurisdição Territorial"],
    ["Processo", requisicao.process ? `#${requisicao.process.ordem}` : "—"],
    ["Expediente SEI", requisicao.process?.expediente ?? "—"],
    ["Imóvel", requisicao.sigefNomeArea ? `${requisicao.sigefNomeArea}${requisicao.sigefMunicipio ? ` — ${requisicao.sigefMunicipio}` : ""}` : "—"],
    ["Situação", SITUACAO[requisicao.pagamentoStatus ?? ""] ?? requisicao.pagamentoStatus ?? "—"],
    ["Valor", isento ? "Isento" : `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
    ["Data", pagoEm ? formatDateTime(pagoEm) : "—"],
  ];
  if (requisicao.pagamentoObs) linhas.push(["Observações", requisicao.pagamentoObs]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={voltar} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Acompanhar Requisição
        </Link>
        <PrintButton />
      </div>

      <article className="bg-white border border-gray-300 rounded-lg p-8 print:border-0 print:p-0">
        <header className="text-center border-b border-gray-300 pb-4 mb-6">
          <p className="text-xs uppercase tracking-wide text-gray-500">Governo do Estado de São Paulo</p>
          <h1 className="text-lg font-bold text-gray-900">Instituto Geográfico e Cartográfico — IGC</h1>
          <h2 className="mt-2 text-base font-semibold text-gray-800">
            {isento ? "Declaração de isenção de pagamento" : "Recibo de pagamento"}
          </h2>
        </header>

        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
          {linhas.map(([rotulo, texto]) => (
            <div key={rotulo} className="contents">
              <dt className="font-medium text-gray-600">{rotulo}</dt>
              <dd className="text-gray-900">{texto}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 text-sm text-gray-800">
          {isento
            ? "Declaramos que a requisição acima está isenta do pagamento da taxa de emissão da certidão."
            : "Recebemos do solicitante acima o valor referente à taxa de emissão da certidão requerida."}
        </p>

        <footer className="mt-8 border-t border-gray-200 pt-3 text-xs text-gray-500">
          Código de autenticação: <span className="font-mono">{autenticacao}</span> · emitido em{" "}
          {formatDateTime(new Date())}. Confira no Portal de Certidões, em Acompanhar Requisição.
        </footer>
      </article>
    </div>
  );
}
