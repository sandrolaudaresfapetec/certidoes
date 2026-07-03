import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const baseUrl = request.nextUrl.origin;

  if (error || !code) {
    return Response.redirect(
      `${baseUrl}/login?error=${error || "sem_codigo"}`
    );
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("govbr_state")?.value;
  const codeVerifier = cookieStore.get("govbr_code_verifier")?.value;

  cookieStore.delete("govbr_state");
  cookieStore.delete("govbr_code_verifier");

  if (!savedState || savedState !== state) {
    return Response.redirect(`${baseUrl}/login?error=state_invalido`);
  }

  if (!codeVerifier) {
    return Response.redirect(`${baseUrl}/login?error=sessao_expirada`);
  }

  const clientId = process.env.GOVBR_CLIENT_ID;
  const clientSecret = process.env.GOVBR_CLIENT_SECRET;
  const tokenUrl =
    process.env.GOVBR_TOKEN_URL || "https://sso.staging.acesso.gov.br/token";
  const userinfoUrl =
    process.env.GOVBR_USERINFO_URL ||
    "https://sso.staging.acesso.gov.br/userinfo";
  const redirectUri =
    process.env.GOVBR_REDIRECT_URI || `${baseUrl}/api/auth/govbr/callback`;

  if (!clientId || !clientSecret) {
    return Response.redirect(`${baseUrl}/login?error=govbr_nao_configurado`);
  }

  try {
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error("Gov.br token error:", tokenRes.status, errorBody);
      return Response.redirect(`${baseUrl}/login?error=token_invalido`);
    }

    const tokenData = await tokenRes.json();

    const userInfoRes = await fetch(userinfoUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      return Response.redirect(`${baseUrl}/login?error=userinfo_falhou`);
    }

    const userInfo = await userInfoRes.json();
    const cpf = userInfo.preferred_username || userInfo.sub;
    const name =
      userInfo.name || userInfo.preferred_username || "Cliente Gov.br";
    const email = userInfo.email || `${cpf}@govbr.user`;

    let user = await prisma.user.findFirst({
      where: { OR: [{ govBrSub: cpf }, { cpf }] },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          cpf,
          govBrSub: cpf,
          role: "CLIENTE",
          active: true,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { govBrSub: cpf, name: name || user.name },
      });
    }

    await createSession(user.id, user.role, user.name);
    return Response.redirect(baseUrl);
  } catch (err) {
    console.error("Gov.br callback error:", err);
    return Response.redirect(`${baseUrl}/login?error=erro_interno`);
  }
}
