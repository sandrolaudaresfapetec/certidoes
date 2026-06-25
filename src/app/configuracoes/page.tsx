import { requireRole } from "@/lib/auth";
import { Settings, Phone, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  await requireRole("ADMIN");

  const whatsappConfigured = !!(
    process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN
  );

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        Configuracoes
      </h1>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <MessageCircle className="h-5 w-5" />
            Notificacoes WhatsApp
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Status da integracao:</span>
              {whatsappConfigured ? (
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Configurado
                </span>
              ) : (
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                  Nao configurado
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Quando configurado, notificacoes sao enviadas automaticamente via WhatsApp
              ao usuario destino quando um processo muda de etapa.
            </p>
            {!whatsappConfigured && (
              <div className="mt-3 p-3 bg-gray-50 rounded-md text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-700">Variaveis de ambiente necessarias:</p>
                <p>WHATSAPP_API_URL — URL da API (Evolution API, Z-API, etc)</p>
                <p>WHATSAPP_API_TOKEN — Token de autenticacao</p>
                <p>WHATSAPP_INSTANCE — Nome da instancia</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Outras configuracoes</h2>
          <ul className="space-y-2 text-sm text-gray-500">
            <li>- Configuracoes de notificacoes por email</li>
            <li>- Regras de prazo e prioridade</li>
            <li>- Integracao com SEI</li>
            <li>- Backup e exportacao de dados</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
