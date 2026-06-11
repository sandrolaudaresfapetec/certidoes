import { prisma } from "@/lib/prisma";
import { WORKFLOW_STAGES, KANBAN_STAGES } from "@/lib/workflow";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function QuadroPage() {
  const processes = await prisma.process.findMany({
    where: {
      situacao: { in: KANBAN_STAGES as unknown as string[] },
    },
    include: {
      tecnicoResp: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const columns: Record<string, typeof processes> = {};
  KANBAN_STAGES.forEach((stage) => {
    columns[stage] = [];
  });
  processes.forEach((proc) => {
    if (columns[proc.situacao]) {
      columns[proc.situacao].push(proc);
    }
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quadro de Processos</h1>
        <p className="text-gray-500 mt-1">
          Visao Kanban do fluxo de trabalho
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_STAGES.map((stage) => {
          const config = WORKFLOW_STAGES[stage];
          const items = columns[stage] || [];
          return (
            <div
              key={stage}
              className="flex-shrink-0 w-72 bg-gray-100 rounded-lg"
            >
              {/* Column Header */}
              <div className={`px-4 py-3 rounded-t-lg ${config.bgLight} border-b-2 ${config.borderColor}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-semibold ${config.textColor}`}>
                    {config.label}
                  </h3>
                  <span className={`text-xs font-bold ${config.textColor} bg-white/50 px-2 py-0.5 rounded-full`}>
                    {items.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                {items.map((proc) => (
                  <Link
                    key={proc.id}
                    href={`/processos/${proc.id}`}
                    className="block bg-white rounded-md p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-gray-400">
                        #{proc.ordem}
                      </span>
                      {proc.tipo === "idoso" && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          Idoso
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {proc.interessado}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {proc.tipoServico}
                    </p>
                    {proc.municipio && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {proc.municipio}
                      </p>
                    )}
                    {proc.tecnicoResp && (
                      <div className="mt-2 flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center text-[10px] text-blue-700 font-medium">
                          {proc.tecnicoResp.name.charAt(0)}
                        </div>
                        <span className="text-xs text-gray-500">
                          {proc.tecnicoResp.name}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
                {items.length === 0 && (
                  <div className="text-center py-8 text-xs text-gray-400">
                    Nenhum processo
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
