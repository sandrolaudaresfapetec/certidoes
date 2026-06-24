import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      cpf: true,
      phone: true,
      active: true,
    },
  });

  if (!user || !user.active) {
    return Response.json({ error: "Usuario inativo" }, { status: 401 });
  }

  return Response.json({ user });
}
