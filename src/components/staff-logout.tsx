"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

/** Encerra a sessao do backoffice e volta para a tela de login. */
export function StaffLogoutButton() {
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={sair}
      className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900"
    >
      <LogOut className="h-4 w-4" />
      Sair
    </button>
  );
}
