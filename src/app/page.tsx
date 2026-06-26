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
  ClipboardList,
  PlusCircle,
  Send,
  RotateCcw,
} from "lucide-react";

export const dynamic = "force-dynamic";

const SOLICITACAO_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pendente: { label: "Pendente", color: "text-yellow-700", bg: "bg-yellow-50" },
  em_analise: { label: "Em Analise", color: "text-blue-700", bg: "bg-blue-50" },
  aprovada: { label: "Aprovada", color: "text-green-700", bg: "bg-green-50" },
  devolvida: { label: "Devolvida", color: "text-orange-700", bg: "bg-orange-50" },
  rejeitada: { label: "Rejeitada", color: "text-red-700", bg: "bg-red-50" },
};

export default async function DashboardPage() {
  const user = await requireAuth();

  if (user.role === "CLIENTE") {
    return <ClienteDashboard userId={user.id} userName={user.name} />;
  }

  return <InternalDashboard userId={user.id} role={user.role} />;
}

async function ClienteDashboard({ userId, userName }: { userId: string; userName: string }) {
  const [
    solicitacoes,
    totalSolicitacoes,
    pendentes,
    emAnalise,
    aprovadas,
    devolvidas,
  ] = await Promise.all([
    prisma.solicitacao.findMany({
      where: { clienteId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.solicitacao.count({ where: { clienteId: userId } }),
    prisma.solicitacao.count({ where: { clienteId: userId, status: "pendente" } }),
    prisma.solicitacao.count({ where: { clienteId: userId, status: "em_analise" } }),
    prisma.solicitacao.count({ where: { clienteId: userId, status: "aprovada" } }),
    prisma.solicitacao.count({ where: { clienteId: userId, status: "devolvida" } }),
  ]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Bem-vindo, {userName}
        </h1>
        <p className="text-gray-500 mt-1">
          Acompanhe suas solicitacoes de certidao junto ao IGC SP
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Total de Solicitacoes"
          value={totalSolicitacoes}
          icon={<ClipboardList className="h-6 w-6 text-gray-600" />}
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Pendentes"
          value={pendentes}
          icon={<Clock className="h-6 w-6 text-yellow-600" />}
          bgColor="bg-yellow-50"
        />
        <StatCard
          title="Aprovadas"
          value={aprovadas}
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          bgColor="bg-green-50"
        />
        <StatCard
          title="Devolvidas"
          value={devolvidas}
          icon={<RotateCcw className="h-6 w-6 text-orange-600" />}
          bgColor="bg-orange-50"
        />
      </div>

      {totalSolicitacoes === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Send className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Nenhuma solicitacao ainda
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Para solicitar uma certidao cartografica, preencha o formulario com
            seus dados pessoais e as informacoes do imovel (arquivo georreferenciado SIGEF).
          </p>
          <Link
            href="/solicitacoes/nova"
            className="inline-flex items-center gap-2 bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            <PlusCircle className="h-5 w-5" />
            Nova Solicitacao
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Minhas Solicitacoes
            </h2>
            <Link
              href="/solicitacoes"
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              Ver Todas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Servico
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Municipio
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitacoes.map((sol) => {
                  const statusConfig = SOLICITACAO_STATUS_LABELS[sol.status] || {
                    label: sol.status,
                    color: "text-gray-700",
                    bg: "bg-gray-50",
                  };
                  return (
                    <tr key={sol.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        <Link
                          href={`/solicitacoes/${sol.id}`}
                          className="text-gray-700 hover:underline"
                        >
                          {sol.tipoServico}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {sol.municipio || sol.municipioSigef || "-"}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {sol.createdAt.toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

async function InternalDashboard({ userId, role }: { userId: string; role: string }) {
  const filter = getProcessFilter(userId, role);

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

  // For SDTC, also show pending solicitacoes count
  const pendingSolicitacoes = ["ADMIN", "SDTC"].includes(role)
    ? await prisma.solicitacao.count({ where: { status: { in: ["pendente", "em_analise"] } } })
    : 0;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Visao geral dos processos de certidao IGC SP
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Total de Processos"
          value={totalProcessos}
          icon={<FileText className="h-6 w-6 text-gray-600" />}
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

      {/* Pending solicitacoes alert for SDTC/ADMIN */}
      {pendingSolicitacoes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {pendingSolicitacoes} solicitacao(oes) aguardando analise
              </p>
              <p className="text-xs text-amber-600">
                Clientes enviaram solicitacoes que precisam de verificacao documental
              </p>
            </div>
          </div>
          <Link
            href="/solicitacoes"
            className="text-sm font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1"
          >
            Ver Solicitacoes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Distribuicao por Etapa
          </h2>
          <Link
            href="/quadro"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
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
          <h2 className="text-lg font-semibold text-gray-800">
            Processos Recentes
          </h2>
          <Link
            href="/processos"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
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
                        className="text-gray-700 hover:underline font-medium"
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
                      className="text-gray-700 hover:underline mt-1 inline-block"
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
          <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <div className={`${bgColor} rounded-full p-3`}>{icon}</div>
      </div>
    </div>
  );
}
