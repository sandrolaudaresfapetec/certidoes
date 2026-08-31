import { MailCheck } from "lucide-react";
import { requireSolicitante } from "@/lib/portal-auth";
import { CadastroContatoForm } from "@/components/cadastro-contato-form";

export default async function CompletarCadastroPage() {
  const solicitante = await requireSolicitante();

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-6">
          <MailCheck className="h-10 w-10 text-emerald-700 mx-auto mb-2" />
          <h1 className="text-xl font-bold text-gray-900">Finalize seu cadastro</h1>
          <p className="text-sm text-gray-500 mt-1">
            Precisamos apenas dos seus dados de contato para comunicação sobre
            suas requisições. O endereço do imóvel será informado em cada
            certidão — não faz parte do seu cadastro.
          </p>
        </div>

        <CadastroContatoForm
          emailInicial={solicitante.email ?? ""}
          telefoneInicial={solicitante.telefone ?? ""}
          labelBotao="Concluir cadastro"
          redirecionarPara="/portal"
        />
      </div>
    </div>
  );
}
