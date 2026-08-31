import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Perfil ativo do backoffice.
 *
 * O backoffice ainda nao possui autenticacao propria (o login corporativo do
 * IGC sera integrado junto com o Keycloak do portal). Ate la, as telas por ator
 * do fluxo — Atendimento e Diretores/Gerentes/Tecnicos — usam o "perfil ativo":
 * o usuario escolhido na barra lateral, guardado no cookie abaixo. Ele define
 * quais acoes ficam disponiveis, nao substitui autenticacao.
 */
export const PERFIL_COOKIE = "perfil_ativo";

/** Papeis que operam a area de Atendimento (cadastro, abertura, pagamento). */
export const PAPEIS_ATENDIMENTO = ["ADMIN", "SDTC"];

/** Papeis que assinam processos. */
export const PAPEIS_ASSINATURA = ["TECNICO", "CONFERENTE", "GERENTE", "DIRETOR", "ADMIN"];

export async function getPerfilAtivo(): Promise<User | null> {
  const store = await cookies();
  const id = store.get(PERFIL_COOKIE)?.value;
  if (id) {
    const user = await prisma.user.findFirst({ where: { id, active: true } });
    if (user) return user;
  }
  return prisma.user.findFirst({
    where: { active: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export function podeAtender(user: User | null): boolean {
  return Boolean(user && PAPEIS_ATENDIMENTO.includes(user.role));
}

export function podeAssinar(user: User | null): boolean {
  return Boolean(user && PAPEIS_ASSINATURA.includes(user.role));
}

/** Etapa do workflow em que o papel do perfil ativo precisa assinar. */
export function etapasDeAssinatura(user: User | null): string[] {
  if (!user) return [];
  switch (user.role) {
    case "TECNICO":
      return ["assinatura_tecnico"];
    case "CONFERENTE":
      return ["conferencia"];
    case "GERENTE":
      return ["assinatura_gerente"];
    case "DIRETOR":
      return ["assinatura_diretor"];
    case "ADMIN":
      return ["conferencia", "assinatura_tecnico", "assinatura_gerente", "assinatura_diretor"];
    default:
      return [];
  }
}
