import { UserCog } from "lucide-react";
import { requireSolicitante } from "@/lib/portal-auth";
import { formatarCPF } from "@/lib/cpf";
import { CadastroContatoForm } from "@/components/cadastro-contato-form";

export const dynamic = "force-dynamic";

export default async function CadastroPage() {
  const solicitante = await requireSolicitante();

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="mb-6">
          <UserCog className="h-8 w-8 text-emerald-700 mb-2" />
          <h1 className="text-xl font-bold text-gray-900">Meu cadastro</h1>
          <p className="text-sm text-gray-500 mt-1">
            Nome e CPF vêm da identidade validada pelo gov.br e não podem ser
            alterados aqui.
          </p>
        </div>

        <dl className="text-sm mb-6 space-y-1">
          <div className="flex justify-between">
            <dt className="text-gray-500">Nome</dt>
            <dd className="text-gray-900">{solicitante.nome}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">CPF</dt>
            <dd className="text-gray-900">{formatarCPF(solicitante.cpf)}</dd>
          </div>
        </dl>

        <CadastroContatoForm
          emailInicial={solicitante.email ?? ""}
          telefoneInicial={solicitante.telefone ?? ""}
          labelBotao="Salvar dados de contato"
        />
      </div>
    </div>
  );
}
