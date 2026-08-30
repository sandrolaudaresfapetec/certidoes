import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Solicitante } from "@prisma/client";

/**
 * Autenticação do portal do solicitante.
 *
 * Identidade: login gov.br (brasil cidadao). Nesta fase o provedor OIDC
 * (Keycloak na infraestrutura GE21) ainda esta sendo finalizado, entao o
 * portal opera com GOVBR_MOCK=true: o login simula o retorno do gov.br
 * (CPF validado com checksum oficial). Quando o Keycloak estiver no ar,
 * basta trocar a emissao da sessao pelo callback OIDC real — a sessao
 * assinada (HMAC-SHA256) permanece identica.
 */

export const PORTAL_COOKIE = "portal_session";

function sessionSecret(): string {
  return process.env.PORTAL_SESSION_SECRET || "dev-portal-secret-change-me";
}

export function assinarSessao(solicitanteId: string): string {
  const sig = createHmac("sha256", sessionSecret())
    .update(solicitanteId)
    .digest("hex")
    .slice(0, 32);
  return `${solicitanteId}.${sig}`;
}

export function verificarSessao(valor: string | undefined): string | null {
  if (!valor) return null;
  const idx = valor.lastIndexOf(".");
  if (idx <= 0) return null;
  const id = valor.slice(0, idx);
  const sig = valor.slice(idx + 1);
  const esperado = createHmac("sha256", sessionSecret())
    .update(id)
    .digest("hex")
    .slice(0, 32);
  return sig === esperado ? id : null;
}

export async function getSolicitanteLogado(): Promise<Solicitante | null> {
  const store = await cookies();
  const id = verificarSessao(store.get(PORTAL_COOKIE)?.value);
  if (!id) return null;
  return prisma.solicitante.findUnique({ where: { id } });
}

/** Exige solicitante logado; redireciona para /portal/login caso contrario. */
export async function requireSolicitante(): Promise<Solicitante> {
  const solicitante = await getSolicitanteLogado();
  if (!solicitante) redirect("/portal/login");
  return solicitante;
}
