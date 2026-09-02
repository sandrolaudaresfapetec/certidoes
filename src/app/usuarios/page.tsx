import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { UsuariosAdmin } from "@/components/usuarios-admin";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const admin = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { processesResponsible: true } } },
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-6 w-6" />
          Usuarios
        </h1>
        <p className="text-gray-500 mt-1">
          Gerenciamento da equipe — exclusivo do administrador
        </p>
      </div>

      <UsuariosAdmin
        adminId={admin.id}
        usuarios={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          active: u.active,
          processos: u._count.processesResponsible,
        }))}
      />
    </div>
  );
}
