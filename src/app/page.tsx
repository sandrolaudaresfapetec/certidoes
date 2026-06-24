import { prisma } from "@/lib/prisma";
import { requireAuth, getProcessFilter } from "@/lib/auth";
import { WORKFLOW_STAGES, KANBAN_STAGES, type WorkflowStage } from "@/lib/workflow";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuth();
  const filter = getProcessFilter(user.id, user.role);

  const [
    totalProcessos,
    processosPorSituacao,
    processosRecentes,
    processosFinalizados,
    processosSobrestados,
    processosCancelados,
  ] = await Promise.all([
    prisma.process.count({ where: filter }),
    prisma.process.groupBy({
      by: ["situacao"],
      where: filter,
      _count: { situacao: true },
    }),
    prisma.process.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        tecnicoResp: { select: { name: true } },
      },
    }),
    prisma.process.count({ where: { ...filter, situacao: "finalizado" } }),
    prisma.process.count({ where: { ...filter, situacao: "sobrestado" } }),
    prisma.process.count({ where: { ...filter, situacao: "cancelado" } }),
  ]);

  const ativos = totalProcessos - processosFinalizados - processosCancelados;

  const situacaoMap: Record<string, number> = {};
  processosPorSituacao.forEach((item) => {
    situacaoMap[item.situacao] = item._count.situacao;
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#071D41]">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Visao geral dos processos de certidao IGC SP
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Total de Processos"
          value={totalProcessos}
          icon={<FileText className="h-6 w-6 text-[#1351B4]" />}
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Processos Ativos"
          value={ativos}
          icon={<Clock className="h-6 w-6 text-yellow-600" />}
          bgColor="bg-yellow-50"
        />
        <StatCard
          title="Finalizados"
          value={processosFinalizados}
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          bgColor="bg-green-50"
        />
        <StatCard
          title="Sobrestados"
          value={processosSobrestados}
          icon={<AlertTriangle className="h-6 w-6 text-orange-600" />}
          bgColor="bg-orange-50"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#071D41]">
            Distribuicao por Etapa
          </h2>
          <Link
            href="/quadro"
            className="text-sm text-[#1351B4] hover:text-[#071D41] flex items-center gap-1"
          >
            Ver Quadro <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {KANBAN_STAGES.map((stage) => {
            const config = WORKFLOW_STAGES[stage];
            const count = situacaoMap[stage] || 0;
            return (
              <div
                key={stage}
                className={`${config.bgLight} ${config.borderColor} border rounded-lg p-3 text-center`}
              >
                <div className={`text-2xl font-bold ${config.textColor}`}>
                  {count}
                </div>
                <div className="text-xs text-gray-600 mt-1">{config.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#071D41]">
            Processos Recentes
          </h2>
          <Link
            href="/processos"
            className="text-sm text-[#1351B4] hover:text-[#071D41] flex items-center gap-1"
          >
            Ver Todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Ordem
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Interessado
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Situacao
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Tecnico
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processosRecentes.map((proc) => {
                const stageConfig =
                  WORKFLOW_STAGES[proc.situacao as WorkflowStage];
                return (
                  <tr key={proc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      <Link
                        href={`/processos/${proc.id}`}
                        className="text-[#1351B4] hover:underline"
                      >
                        #{proc.ordem}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {proc.interessado}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {proc.tipoServico}
                    </td>
                    <td className="px-6 py-3">
                      {stageConfig && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stageConfig.bgLight} ${stageConfig.textColor}`}
                        >
                          {stageConfig.label}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {proc.tecnicoResp?.name || "-"}
                    </td>
                  </tr>
                );
              })}
              {processosRecentes.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    Nenhum processo encontrado.
                    <br />
                    <Link
                      href="/processos/novo"
                      className="text-[#1351B4] hover:underline mt-1 inline-block"
                    >
                      Criar primeiro processo
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  bgColor,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-[#071D41] mt-1">{value}</p>
        </div>
        <div className={`${bgColor} rounded-full p-3`}>{icon}</div>
      </div>
    </div>
  );
}
