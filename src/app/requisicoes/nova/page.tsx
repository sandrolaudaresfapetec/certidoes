import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPerfilAtivo, podeAtender } from "@/lib/perfil-ativo";
import { NovaRequisicaoAtendimento } from "@/components/nova-requisicao-atendimento";

export const dynamic = "force-dynamic";

export default async function NovaRequisicaoPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { cliente } = await searchParams;
  const perfil = await getPerfilAtivo();

  if (!podeAtender(perfil)) {
    return (
      <div className="p-8">
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-4">
          Abertura de requisição é exclusiva do Atendimento. Troque o perfil
          ativo na barra lateral para um usuário do SDTC.
        </p>
      </div>
    );
  }

  const clientes = await prisma.solicitante.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, cpf: true },
    take: 500,
  });

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/requisicoes"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Requisições
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Nova Requisição</h1>
      <p className="text-sm text-gray-500 mb-6">
        Abertura de requisição pelo atendimento, em nome do cliente.
      </p>

      <NovaRequisicaoAtendimento clientes={clientes} clienteInicialId={cliente} />
    </div>
  );
}
