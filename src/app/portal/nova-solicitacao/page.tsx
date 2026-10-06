import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSolicitante } from "@/lib/portal-auth";
import { RequisicaoForm } from "@/components/requisicao-form";
import { IntroducaoCjt } from "@/components/requisicao/introducao-cjt";

export default async function NovaSolicitacaoPage() {
  const solicitante = await requireSolicitante();

  return (
    <div>
      <Link
        href="/portal"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Minhas Requisições
      </Link>
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Nova Requisição</h1>

      <IntroducaoCjt>
        <RequisicaoForm
          cpf={solicitante.cpf}
          criarEndpoint="/api/portal/solicitacoes"
          documentosEndpoint="/api/portal/documentos"
          painelHref="/portal"
          painelLabel="Ver minhas requisições"
        />
      </IntroducaoCjt>
    </div>
  );
}
