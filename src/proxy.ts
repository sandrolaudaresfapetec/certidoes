import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Barreira de entrada do backoffice: sem cookie de sessao, paginas internas
 * vao para /login e APIs internas respondem 401. E uma checagem otimista —
 * a validacao da assinatura e do usuario continua sendo feita no servidor,
 * em cada pagina e rota de API.
 */

/** Mesmo nome de cookie de `src/lib/auth.ts` (o proxy nao compartilha modulos). */
const SESSION_COOKIE = "igc_session";

/** Areas abertas: login do backoffice, portal do solicitante e seus endpoints. */
const PUBLICO = [
  "/login",
  "/portal",
  "/api/auth",
  "/api/portal",
  // usada pelo portal e pelo backoffice; a propria rota valida as duas sessoes
  "/api/sigef/consulta",
  // bootstrap da instalacao; a propria rota exige ADMIN depois do primeiro uso
  "/api/seed",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLICO.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
