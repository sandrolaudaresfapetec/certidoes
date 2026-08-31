import Link from "next/link";
import { PenLine } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPerfilAtivo, etapasDeAssinatura, podeAssinar } from "@/lib/perfil-ativo";
import { WORKFLOW_STAGES, type WorkflowStage } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export default async function AssinaturasPage() {
  const perfil = await getPerfilAtivo();
  const etapas = etapasDeAssinatura(perfil);

  if (!podeAssinar(perfil) || etapas.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Assinaturas Pendentes</h1>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-4">
          O perfil ativo ({perfil?.role ?? "sem perfil"}) não possui etapas de
          assinatura. Troque o perfil ativo na barra lateral.
        </p>
      </div>
    );
  }

  // Escopo do técnico: apenas os processos sob sua responsabilidade.
  const processos = await prisma.process.findMany({
    where: {
      situacao: { in: etapas },
      ...(perfil?.role === "TECNICO" ? { tecnicoRespId: perfil.id } : {}),
      ...(perfil?.role === "CONFERENTE" ? { tecnicoConfId: perfil.id } : {}),
    },
    orderBy: { updatedAt: "asc" },
    include: {
      tecnicoResp: { select: { name: true } },
      solicitacao: { select: { protocolo: true } },
    },
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assinaturas Pendentes</h1>
        <p className="text-sm text-gray-500">
          Processos aguardando ação de {perfil?.name} ({perfil?.role}).
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        {processos.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">
            Nenhum processo aguardando sua assinatura.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {processos.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/processos/${p.id}`}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <PenLine className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        #{p.ordem} — {p.interessado}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.tipoServico}
                        {p.solicitacao && ` · requisição ${p.solicitacao.protocolo}`}
                        {p.tecnicoResp && ` · técnico ${p.tecnicoResp.name}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
                    {WORKFLOW_STAGES[p.situacao as WorkflowStage]?.label ?? p.situacao}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
