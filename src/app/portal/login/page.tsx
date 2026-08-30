"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";

export default function PortalLoginPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, nome }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Não foi possível entrar.");
        return;
      }
      router.push(data.cadastroCompleto ? "/portal" : "/portal/completar-cadastro");
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-6">
          <ShieldCheck className="h-10 w-10 text-emerald-700 mx-auto mb-2" />
          <h1 className="text-xl font-bold text-gray-900">
            Acesse com sua conta gov.br
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sua identidade é validada pela plataforma gov.br. Não é necessário
            enviar documento de identidade.
          </p>
        </div>

        {/* GOVBR_MOCK: quando o Keycloak OIDC estiver ativo, este formulário é
            substituído pelo botão oficial "Entrar com gov.br" */}
        <form onSubmit={entrar} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              CPF
            </label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nome completo
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como consta no gov.br"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-700 text-white py-2.5 rounded-md text-sm font-medium hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar com gov.br
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Ambiente de homologação — login gov.br em modo simulado.
        </p>
      </div>
    </div>
  );
}
