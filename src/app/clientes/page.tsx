import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarCPF } from "@/lib/cpf";
import { getPerfilAtivo, podeAtender } from "@/lib/perfil-ativo";
import { ClienteForm } from "@/components/cliente-form";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const perfil = await getPerfilAtivo();

  const where: Prisma.SolicitanteWhereInput = q
    ? { OR: [{ nome: { contains: q } }, { cpf: { contains: q.replace(/\D/g, "") || q } }] }
    : {};

  const clientes = await prisma.solicitante.findMany({
    where,
    orderBy: { nome: "asc" },
    take: 100,
    include: { _count: { select: { solicitacoes: true } } },
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="text-sm text-gray-500">
          Cadastro e manutenção de clientes atendidos pelo balcão do IGC.
        </p>
      </div>

      {podeAtender(perfil) ? (
        <ClienteForm />
      ) : (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
          O perfil ativo não pertence ao Atendimento — a lista abaixo é somente
          para consulta.
        </p>
      )}

      <form
        action="/clientes"
        method="get"
        className="flex items-end gap-3 bg-white border border-gray-200 rounded-lg p-4"
      >
        <div className="flex-1">
          <label htmlFor="clientes-q" className="block text-xs text-gray-600 mb-1">
            Buscar cliente
          </label>
          <input
            id="clientes-q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Nome ou CPF"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
        >
          Buscar
        </button>
      </form>

      <div className="bg-white border border-gray-200 rounded-lg">
        {clientes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">
            Nenhum cliente encontrado.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {clientes.map((c) => (
              <li key={c.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                  <p className="text-xs text-gray-500">
                    CPF {formatarCPF(c.cpf)}
                    {c.email && ` · ${c.email}`}
                    {c.telefone && ` · ${c.telefone}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">
                    {c._count.solicitacoes} requisição(ões)
                  </span>
                  {podeAtender(perfil) && (
                    <Link
                      href={`/requisicoes/nova?cliente=${c.id}`}
                      className="text-sm text-emerald-700 hover:underline"
                    >
                      Nova requisição
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
