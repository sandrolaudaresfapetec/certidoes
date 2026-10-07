import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy (Next.js 16; antes chamado middleware).
 *
 * As sessões do backoffice (`igc_session`) e do portal (`portal_session`) são
 * mantidas em cookie, então qualquer site poderia disparar uma mutação no
 * navegador de um usuário logado. Toda requisição que altera dados precisa vir
 * da própria origem: o `Origin` é comparado com o host da requisição e pedidos
 * sem `Origin` só passam quando o navegador informa `Sec-Fetch-Site` própria
 * (formulários e fetch de terceiros sempre enviam um dos dois).
 */
const METODOS_SEGUROS = ["GET", "HEAD", "OPTIONS"];

export function proxy(request: NextRequest) {
  if (METODOS_SEGUROS.includes(request.method)) {
    return NextResponse.next();
  }

  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return recusar();
  }

  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("host");
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return recusar();
    }
    if (!host || originHost !== host) {
      return recusar();
    }
  } else if (!site) {
    // Cliente sem `Origin` nem `Sec-Fetch-Site`: pode ser um script legítimo
    // (curl, integrações) ou um navegador antigo. Sem sessão de cookie não há
    // risco de CSRF; com sessão, exigimos a origem.
    const temSessao =
      request.cookies.has("igc_session") || request.cookies.has("portal_session");
    if (temSessao) {
      return recusar();
    }
  }

  return NextResponse.next();
}

function recusar() {
  return NextResponse.json(
    { error: "Origem da requisição não autorizada." },
    { status: 403 }
  );
}

export const config = {
  matcher: "/api/:path*",
};
