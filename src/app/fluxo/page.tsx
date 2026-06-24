import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { ArrowRight, ArrowDown, FileText, Users, Search, CheckCircle, PenTool, Upload, Ban, Pause } from "lucide-react";

const stages = [
  {
    id: "entrada_sdtc",
    name: "1. Entrada SDTC",
    description: "Registro do processo, verificacao de documentos, abertura no SEI",
    responsible: "Funcionario SDTC",
    icon: FileText,
    color: "#1351B4",
    href: "/processos?situacao=entrada_sdtc",
  },
  {
    id: "distribuicao_gdat",
    name: "2. Distribuicao GDAT",
    description: "Designacao do tecnico responsavel, definicao de prioridade",
    responsible: "Funcionario GDTAC",
    icon: Users,
    color: "#2670E8",
    href: "/processos?situacao=distribuicao_gdat",
  },
  {
    id: "analise_tecnica",
    name: "3. Analise Tecnica",
    description: "Trabalho de gabinete (QGIS), visita de campo se necessario",
    responsible: "Tecnico",
    icon: Search,
    color: "#0C326F",
    href: "/processos?situacao=analise_tecnica",
  },
  {
    id: "conferencia",
    name: "4. Conferencia",
    description: "Revisao e validacao dos dados tecnicos pelo conferente",
    responsible: "Conferente",
    icon: CheckCircle,
    color: "#155BCB",
    href: "/processos?situacao=conferencia",
  },
  {
    id: "assinatura_tecnico",
    name: "5. Assinatura Tecnico",
    description: "Assinatura do tecnico responsavel pela analise",
    responsible: "Tecnico",
    icon: PenTool,
    color: "#1351B4",
    href: "/processos?situacao=assinatura_tecnico",
  },
  {
    id: "assinatura_gerente",
    name: "6. Assinatura Gerente",
    description: "Assinatura do gerente da area tecnica",
    responsible: "Gerente",
    icon: PenTool,
    color: "#0C326F",
    href: "/processos?situacao=assinatura_gerente",
  },
  {
    id: "assinatura_diretor",
    name: "7. Assinatura Diretor",
    description: "Assinatura final do diretor do IGC",
    responsible: "Diretor",
    icon: PenTool,
    color: "#071D41",
    href: "/processos?situacao=assinatura_diretor",
  },
  {
    id: "saida_upload_sei",
    name: "8. Upload SEI",
    description: "Upload da certidao assinada no sistema SEI",
    responsible: "SDTC",
    icon: Upload,
    color: "#2670E8",
    href: "/processos?situacao=saida_upload_sei",
  },
  {
    id: "finalizado",
    name: "9. Finalizado",
    description: "Processo concluido, certidao emitida e disponivel",
    responsible: "Sistema",
    icon: CheckCircle,
    color: "#168821",
    href: "/processos?situacao=finalizado",
  },
];

const alternativeFlows = [
  {
    id: "sobrestado",
    name: "Sobrestado",
    description: "Processo suspenso temporariamente por pendencia externa",
    icon: Pause,
    color: "#B8860B",
  },
  {
    id: "cancelado",
    name: "Cancelado",
    description: "Processo cancelado por desistencia ou irregularidade",
    icon: Ban,
    color: "#E52207",
  },
];

export default async function FluxoPage() {
  await requireAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#071D41]">
          Fluxo de Certidao
        </h1>
        <p className="text-gray-600 mt-1">
          Etapas do processo de emissao de certidao do IGC SP
        </p>
      </div>

      {/* Main flow */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-[#071D41] mb-6">
          Fluxo Principal
        </h2>
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div key={stage.id}>
                <Link
                  href={stage.href}
                  className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-[#1351B4] hover:shadow-md transition-all group"
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: stage.color }}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#071D41] group-hover:text-[#1351B4] transition-colors">
                      {stage.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {stage.description}
                    </p>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#1351B4] font-medium">
                      {stage.responsible}
                    </span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-[#1351B4] shrink-0 mt-3 transition-colors" />
                </Link>
                {index < stages.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-5 w-5 text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Alternative flows */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-[#071D41] mb-4">
          Fluxos Alternativos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alternativeFlows.map((flow) => {
            const Icon = flow.icon;
            return (
              <div
                key={flow.id}
                className="flex items-start gap-3 p-4 rounded-lg border border-gray-200"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: flow.color }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: flow.color }}>
                    {flow.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {flow.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <h3 className="text-sm font-semibold text-[#071D41] mb-2">
          Informacoes
        </h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>
            Clique em qualquer etapa para ver os processos naquele estagio.
          </li>
          <li>
            O SDTC abre o processo no sistema e o cliente preenche o formulario
            com os dados do imovel.
          </li>
          <li>
            Processos de clientes idosos recebem prioridade automatica.
          </li>
          <li>
            Devolucoes entre etapas sao permitidas quando necessario.
          </li>
        </ul>
      </div>
    </div>
  );
}
