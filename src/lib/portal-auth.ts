import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
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
export const PORTAL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

/** Mesma regra do backoffice (src/lib/auth.ts): sem segredo em producao o portal nao sobe. */
function sessionSecret(): string {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PORTAL_SESSION_SECRET nao definido em producao");
  }
  return "dev-portal-secret-change-me";
}

function assinar(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex").slice(0, 32);
}

/** Token `solicitanteId.expiracaoMs.assinatura`: a validade vai assinada, nao depende so do cookie. */
export function assinarSessao(solicitanteId: string, agoraMs = Date.now()): string {
  const expira = agoraMs + PORTAL_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${solicitanteId}.${expira}`;
  return `${payload}.${assinar(payload)}`;
}

/** Devolve o id do solicitante quando a sessao e valida e nao expirou. */
export function verificarSessao(valor: string | undefined, agoraMs = Date.now()): string | null {
  if (!valor) return null;
  const partes = valor.split(".");
  if (partes.length !== 3) return null;
  const [id, expira, sig] = partes;
  if (!id || sig !== assinar(`${id}.${expira}`)) return null;
  const limite = Number(expira);
  if (!Number.isFinite(limite) || limite <= agoraMs) return null;
  return id;
}

/** Opcoes do cookie de sessao do portal (httpOnly, secure em producao). */
export function opcoesCookiePortal(maxAge = PORTAL_SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/** Login simulado do gov.br (CPF + nome) so existe com GOVBR_MOCK=true; ver README. */
export function loginSimuladoHabilitado(): boolean {
  return process.env.GOVBR_MOCK === "true";
}

export async function getSolicitanteLogado(): Promise<Solicitante | null> {
  const store = await cookies();
  const id = verificarSessao(store.get(PORTAL_COOKIE)?.value);
  if (!id) return null;
  return prisma.solicitante.findUnique({ where: { id } });
}

export type ChecagemPortalApi = { solicitante: Solicitante } | { erro: NextResponse };

/**
 * Para rotas de API do portal: devolve o solicitante logado ou a resposta 401.
 * Uso: `const sessao = await exigirSolicitanteApi(); if ("erro" in sessao) return sessao.erro;`.
 * Rota que lê ou altera uma requisição ainda precisa filtrar por dono
 * (`where: { id, solicitanteId: sessao.solicitante.id }`).
 */
export async function exigirSolicitanteApi(): Promise<ChecagemPortalApi> {
  const solicitante = await getSolicitanteLogado();
  if (!solicitante) {
    return { erro: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  return { solicitante };
}

/** Exige solicitante logado; redireciona para /portal/login caso contrario. */
export async function requireSolicitante(): Promise<Solicitante> {
  const solicitante = await getSolicitanteLogado();
  if (!solicitante) redirect("/portal/login");
  return solicitante;
}
