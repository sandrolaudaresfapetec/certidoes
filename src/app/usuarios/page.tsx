import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          processesResponsible: true,
          processesConference: true,
          notifications: { where: { read: false } },
        },
      },
    },
  });

  const roleColors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700",
    GERENTE: "bg-pink-100 text-pink-700",
    DIRETOR: "bg-red-100 text-red-700",
    TECNICO: "bg-blue-100 text-blue-700",
    CONFERENTE: "bg-orange-100 text-orange-700",
    SDTC: "bg-teal-100 text-teal-700",
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-6 w-6" />
          Usuarios
        </h1>
        <p className="text-gray-500 mt-1">Equipe do sistema</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                Nome
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                Email
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                Funcao
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                Departamento
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">
                Processos
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                      {user.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {user.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role] || "bg-gray-100 text-gray-700"}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {user.department || "-"}
                </td>
                <td className="px-6 py-4 text-sm text-center text-gray-600">
                  {user._count.processesResponsible}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${user.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {user.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                  Nenhum usuario cadastrado. Use a rota /api/seed para criar dados iniciais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
