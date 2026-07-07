import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export type UserRole =
  | "ADMIN"
  | "GERENTE"
  | "DIRETOR"
  | "TECNICO"
  | "CONFERENTE"
  | "SDTC"
  | "GDTAC"
  | "CLIENTE";

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  DIRETOR: "Diretor",
  TECNICO: "Tecnico",
  CONFERENTE: "Conferente",
  SDTC: "Funcionario SDTC",
  GDTAC: "Funcionario GDTAC",
  CLIENTE: "Cliente",
};

export const INTERNAL_ROLES: UserRole[] = [
  "ADMIN",
  "GERENTE",
  "DIRETOR",
  "TECNICO",
  "CONFERENTE",
  "SDTC",
  "GDTAC",
];

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      cpf: true,
      active: true,
    },
  });

  if (!user || !user.active) return null;
  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(...roles: UserRole[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role as UserRole)) {
    redirect("/");
  }
  return user;
}

export function canViewAllProcesses(role: string): boolean {
  return ["ADMIN", "GERENTE", "DIRETOR"].includes(role);
}

export function canCreateProcess(role: string): boolean {
  return ["ADMIN", "SDTC"].includes(role);
}

export function canManageUsers(role: string): boolean {
  return ["ADMIN"].includes(role);
}

export function getProcessFilter(
  userId: string,
  role: string
): Record<string, unknown> {
  switch (role) {
    case "ADMIN":
    case "GERENTE":
    case "DIRETOR":
      return {};
    case "SDTC":
      return { criadoPorId: userId };
    case "GDTAC":
      return {
        OR: [
          { situacao: "distribuicao_gdat" },
          { situacao: "analise_tecnica" },
          { criadoPorId: userId },
        ],
      };
    case "TECNICO":
      return { tecnicoRespId: userId };
    case "CONFERENTE":
      return {
        OR: [{ tecnicoConfId: userId }, { situacao: "conferencia" }],
      };
    case "CLIENTE":
      return { clienteId: userId };
    default:
      return { id: "none" };
  }
}
