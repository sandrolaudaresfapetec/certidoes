import { NextResponse } from "next/server";
import { opcoesCookiePortal, PORTAL_COOKIE } from "@/lib/portal-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PORTAL_COOKIE, "", opcoesCookiePortal(0));
  return res;
}
