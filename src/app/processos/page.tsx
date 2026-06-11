import { prisma } from "@/lib/prisma";
import { WORKFLOW_STAGES, type WorkflowStage } from "@/lib/workflow";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Search, Filter, PlusCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    situacao?: string;
    tipoServico?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function ProcessosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const situacao = params.situacao;
  const tipoServico = params.tipoServico;
  const search = params.search;
  const page = parseInt(params.page || "1");
  const limit = 25;

  const where: Record<string, unknown> = {};
  if (situacao) where.situacao = situacao;
  if (tipoServico) where.tipoServico = tipoServico;
  if (search) {
    where.OR = [
      { interessado: { contains: search } },
      { expediente: { contains: search } },
      { municipio: { contains: search } },
    ];
  }

  const [processes, total] = await Promise.all([
    prisma.process.findMany({
      where,
      include: {
        tecnicoResp: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.process.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  function buildUrl(newParams: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { situacao, tipoServico, search, page: String(page), ...newParams };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "undefined") p.set(k, v);
    }
    return `/processos?${p.toString()}`;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Processos</h1>
          <p className="text-gray-500 mt-1">{total} processos encontrados</p>
        </div>
        <Link
          href="/processos/novo"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <PlusCircle className="h-4 w-4" />
          Novo Processo
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <form className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Buscar por interessado, expediente ou municipio..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {situacao && <input type="hidden" name="situacao" value={situacao} />}
            {tipoServico && <input type="hidden" name="tipoServico" value={tipoServico} />}
            <button
              type="submit"
              className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md text-sm hover:bg-gray-200"
            >
              Buscar
            </button>
          </form>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildUrl({ situacao: undefined, page: "1" })}
                className={`px-3 py-1 rounded-full text-xs font-medium ${!situacao ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                Todos
              </Link>
              {(Object.keys(WORKFLOW_STAGES) as WorkflowStage[]).map((stage) => {
                const config = WORKFLOW_STAGES[stage];
                return (
                  <Link
                    key={stage}
                    href={buildUrl({ situacao: stage, page: "1" })}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${situacao === stage ? `${config.bgLight} ${config.textColor}` : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    {config.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  Ordem
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  Expediente
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  Interessado
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  Tipo Servico
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  Municipio
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  Situacao
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  Tecnico
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  Abertura SEI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processes.map((proc) => {
                const stageConfig = WORKFLOW_STAGES[proc.situacao as WorkflowStage];
                return (
                  <tr key={proc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/processos/${proc.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        #{proc.ordem}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {proc.expediente || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {proc.interessado}
                      {proc.tipo === "idoso" && (
                        <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          Idoso
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {proc.tipoServico}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {proc.municipio || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {stageConfig && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stageConfig.bgLight} ${stageConfig.textColor}`}
                        >
                          {stageConfig.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {proc.tecnicoResp?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(proc.dtAbertoSei)}
                    </td>
                  </tr>
                );
              })}
              {processes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                    Nenhum processo encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Pagina {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  Proxima
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
