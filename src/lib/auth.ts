import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import { PAPEIS, type Papel } from "@/lib/papeis";

/**
 * Autenticacao do backoffice do IGC.
 *
 * Identidade: e-mail institucional + senha, guardada como hash scrypt na
 * coluna `passwordHash`. A sessao e um cookie httpOnly assinado com
 * HMAC-SHA256 (`userId.expiracao.assinatura`), verificado no servidor em cada
 * pagina e rota de API. Quando o login corporativo (Keycloak) entrar, basta
 * trocar a emissao da sessao pelo callback OIDC — o restante permanece igual.
 */

export const SESSION_COOKIE = "igc_session";

/** Duracao da sessao do backoffice. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const SCRYPT_KEYLEN = 64;

export function papelValido(role: string): role is Papel {
  return PAPEIS.includes(role as Papel);
}

/** Papeis que operam a area de Atendimento (cadastro, abertura, pagamento). */
export const PAPEIS_ATENDIMENTO = ["ADMIN", "SDTC"];

/** Papeis que assinam processos. */
export const PAPEIS_ASSINATURA = ["TECNICO", "CONFERENTE", "GERENTE", "DIRETOR", "ADMIN"];

function sessionSecret(): string {
  const secret = process.env.STAFF_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("STAFF_SESSION_SECRET é obrigatório em produção.");
  }
  return "dev-staff-secret-change-me";
}

export function hashSenha(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verificarSenha(senha: string, armazenado: string | null): boolean {
  if (!armazenado) return false;
  const [algoritmo, salt, hash] = armazenado.split(":");
  if (algoritmo !== "scrypt" || !salt || !hash) return false;
  // Hash corrompido nao pode ditar o custo do scrypt nem derrubar o login.
  if (hash.length !== SCRYPT_KEYLEN * 2 || !/^[0-9a-f]+$/.test(hash)) return false;
  const esperado = Buffer.from(hash, "hex");
  const calculado = scryptSync(senha, salt, SCRYPT_KEYLEN);
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

function assinar(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex").slice(0, 32);
}

export function assinarSessao(userId: string, agoraMs = Date.now()): string {
  const expira = agoraMs + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${expira}`;
  return `${payload}.${assinar(payload)}`;
}

/** Devolve o id do usuario quando a sessao e valida e nao expirou. */
export function verificarSessao(valor: string | undefined, agoraMs = Date.now()): string | null {
  if (!valor) return null;
  const partes = valor.split(".");
  if (partes.length !== 3) return null;
  const [userId, expira, sig] = partes;
  const esperado = assinar(`${userId}.${expira}`);
  if (sig !== esperado) return null;
  const limite = Number(expira);
  if (!Number.isFinite(limite) || limite <= agoraMs) return null;
  return userId;
}

export async function getUsuarioLogado(): Promise<User | null> {
  const store = await cookies();
  const id = verificarSessao(store.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  return prisma.user.findFirst({ where: { id, active: true } });
}

/** Exige usuario do backoffice; redireciona para /login caso contrario. */
export async function requireUsuario(): Promise<User> {
  const usuario = await getUsuarioLogado();
  if (!usuario) redirect("/login");
  return usuario;
}

/** Exige ADMIN; usuarios de outros papeis nao acessam gerenciamento de usuarios. */
export async function requireAdmin(): Promise<User> {
  const usuario = await requireUsuario();
  if (usuario.role !== "ADMIN") redirect("/");
  return usuario;
}

/** Checagem de sessao em rotas de API: usuario autenticado ou resposta de erro. */
export type ChecagemApi = { usuario: User } | { erro: NextResponse };

export async function exigirUsuarioApi(): Promise<ChecagemApi> {
  const usuario = await getUsuarioLogado();
  if (!usuario) {
    return {
      erro: NextResponse.json({ error: "Autenticação necessária." }, { status: 401 }),
    };
  }
  return { usuario };
}

export async function exigirAdminApi(): Promise<ChecagemApi> {
  const sessao = await exigirUsuarioApi();
  if ("erro" in sessao) return sessao;
  if (sessao.usuario.role !== "ADMIN") {
    return {
      erro: NextResponse.json({ error: "Ação exclusiva de ADMIN." }, { status: 403 }),
    };
  }
  return sessao;
}

export async function exigirAtendimentoApi(): Promise<ChecagemApi> {
  const sessao = await exigirUsuarioApi();
  if ("erro" in sessao) return sessao;
  if (!podeAtender(sessao.usuario)) {
    return {
      erro: NextResponse.json(
        { error: "Ação exclusiva do Atendimento." },
        { status: 403 }
      ),
    };
  }
  return sessao;
}

export function podeAtender(user: User | null): boolean {
  return Boolean(user && PAPEIS_ATENDIMENTO.includes(user.role));
}

export function podeAssinar(user: User | null): boolean {
  return Boolean(user && PAPEIS_ASSINATURA.includes(user.role));
}

/** Etapa do workflow em que o papel do usuario precisa assinar. */
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
