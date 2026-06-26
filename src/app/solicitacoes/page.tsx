import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import {
  ClipboardList,
  PlusCircle,
  Eye,
  Search,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pendente: { label: "Pendente", color: "text-yellow-700", bg: "bg-yellow-50" },
  em_analise: { label: "Em Analise", color: "text-blue-700", bg: "bg-blue-50" },
  aprovada: { label: "Aprovada", color: "text-green-700", bg: "bg-green-50" },
  devolvida: { label: "Devolvida", color: "text-orange-700", bg: "bg-orange-50" },
  rejeitada: { label: "Rejeitada", color: "text-red-700", bg: "bg-red-50" },
};

export default async function SolicitacoesPage() {
  const user = await requireAuth();

  if (!["CLIENTE", "ADMIN", "SDTC"].includes(user.role)) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Voce nao tem permissao para acessar esta pagina.</p>
      </div>
    );
  }

  const isCliente = user.role === "CLIENTE";

  const where: Record<string, unknown> = isCliente
    ? { clienteId: user.id }
    : {};

  const solicitacoes = await prisma.solicitacao.findMany({
    where,
    include: {
      cliente: { select: { id: true, name: true, email: true } },
      process: { select: { id: true, ordem: true, situacao: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusCounts: Record<string, number> = {};
  solicitacoes.forEach((s) => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            {isCliente ? "Minhas Solicitacoes" : "Solicitacoes de Clientes"}
          </h1>
          <p className="text-gray-500 mt-1">
            {isCliente
              ? "Acompanhe o andamento das suas solicitacoes de certidao"
              : "Revise e aprove solicitacoes de clientes"}
          </p>
        </div>
        {isCliente && (
          <Link
            href="/solicitacoes/nova"
            className="inline-flex items-center gap-2 bg-gray-700 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <PlusCircle className="h-4 w-4" />
            Nova Solicitacao
          </Link>
        )}
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Object.entries(STATUS_LABELS).map(([key, config]) => (
          <div
            key={key}
            className={`${config.bg} border rounded-lg p-3 text-center`}
          >
            <div className={`text-xl font-bold ${config.color}`}>
              {statusCounts[key] || 0}
            </div>
            <div className="text-xs text-gray-600 mt-1">{config.label}</div>
          </div>
        ))}
      </div>

      {solicitacoes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Nenhuma solicitacao encontrada
          </h2>
          {isCliente && (
            <Link
              href="/solicitacoes/nova"
              className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium mt-2"
            >
              Criar nova solicitacao <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Tipo Servico
                  </th>
                  {!isCliente && (
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Cliente
                    </th>
                  )}
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Interessado
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Municipio
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Documentos
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Processo
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Acao
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitacoes.map((sol) => {
                  const statusConfig = STATUS_LABELS[sol.status] || {
                    label: sol.status,
                    color: "text-gray-700",
                    bg: "bg-gray-50",
                  };
                  const docsCount = [
                    sol.docRequerimento,
                    sol.docIdentidade,
                    sol.docProcuracao,
                    sol.docComprovante,
                    sol.docPlanta,
                    sol.docMatricula,
                    sol.docArt,
                  ].filter(Boolean).length;

                  return (
                    <tr key={sol.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        {sol.tipoServico}
                      </td>
                      {!isCliente && (
                        <td className="px-6 py-3 text-sm text-gray-700">
                          {sol.cliente.name}
                        </td>
                      )}
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {sol.interessado}
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
                      <td className="px-6 py-3 text-sm text-gray-700">
                        <span className={docsCount >= 5 ? "text-green-600 font-medium" : "text-orange-600"}>
                          {docsCount}/7
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {sol.process ? (
                          <Link
                            href={`/processos/${sol.process.id}`}
                            className="text-gray-700 hover:underline font-medium"
                          >
                            #{sol.process.ordem}
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {sol.createdAt.toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-3">
                        <Link
                          href={`/solicitacoes/${sol.id}`}
                          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </Link>
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
