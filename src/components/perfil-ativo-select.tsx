"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface PerfilOpcao {
  id: string;
  name: string;
  role: string;
}

/** Seletor do perfil ativo do backoffice (define as ações disponíveis). */
export function PerfilAtivoSelect({
  usuarios,
  ativoId,
}: {
  usuarios: PerfilOpcao[];
  ativoId: string | null;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  async function trocar(userId: string) {
    setSalvando(true);
    await fetch("/api/perfil-ativo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setSalvando(false);
    router.refresh();
  }

  return (
    <div>
      <label htmlFor="perfil-ativo" className="block text-xs text-gray-500 mb-1">
        Perfil ativo
      </label>
      <select
        id="perfil-ativo"
        value={ativoId ?? ""}
        disabled={salvando}
        onChange={(e) => trocar(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
      >
        {usuarios.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} — {u.role}
          </option>
        ))}
      </select>
    </div>
  );
}
