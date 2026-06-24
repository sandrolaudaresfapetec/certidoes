import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOVBR_CLIENT_ID;
  const redirectUri = process.env.GOVBR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/govbr/callback`;
  const authUrl = process.env.GOVBR_AUTH_URL || "https://sso.acesso.gov.br/authorize";

  if (!clientId) {
    const baseUrl = request.nextUrl.origin;
    return Response.redirect(
      `${baseUrl}/login?error=govbr_nao_configurado`
    );
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "openid email profile govbr_confiabilidades",
    redirect_uri: redirectUri,
    nonce: crypto.randomUUID(),
    state: crypto.randomUUID(),
  });

  return Response.redirect(`${authUrl}?${params.toString()}`);
}
