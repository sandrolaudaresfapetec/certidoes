import { Settings } from "lucide-react";

export default function ConfiguracoesPage() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        Configuracoes
      </h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600">
          Configuracoes do sistema serao implementadas em versoes futuras.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-gray-500">
          <li>- Gerenciamento de usuarios</li>
          <li>- Configuracoes de notificacoes por email</li>
          <li>- Regras de prazo e prioridade</li>
          <li>- Integracao com SEI</li>
          <li>- Backup e exportacao de dados</li>
        </ul>
      </div>
    </div>
  );
}
