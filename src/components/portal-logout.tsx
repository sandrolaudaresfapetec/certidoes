"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function sair() {
    await fetch("/api/portal/logout", { method: "POST" });
    router.push("/portal/login");
    router.refresh();
  }

  return (
    <button
      onClick={sair}
      className="text-emerald-100 hover:text-white text-sm underline underline-offset-2"
    >
      Sair
    </button>
  );
}
