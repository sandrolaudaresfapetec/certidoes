import { NextRequest } from "next/server";
import { cookies } from "next/headers";

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

function base64UrlEncode(buffer: Uint8Array): string {
  let str = "";
  for (const byte of buffer) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOVBR_CLIENT_ID;
  const redirectUri =
    process.env.GOVBR_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/auth/govbr/callback`;
  const authUrl =
    process.env.GOVBR_AUTH_URL || "https://sso.staging.acesso.gov.br/authorize";

  if (!clientId) {
    return Response.redirect(
      `${request.nextUrl.origin}/login?error=govbr_nao_configurado`
    );
  }

  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const cookieStore = await cookies();
  cookieStore.set("govbr_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    sameSite: "lax",
    path: "/",
  });
  cookieStore.set("govbr_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    sameSite: "lax",
    path: "/",
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "openid email profile govbr_confiabilidades",
    redirect_uri: redirectUri,
    nonce,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return Response.redirect(`${authUrl}?${params.toString()}`);
}
