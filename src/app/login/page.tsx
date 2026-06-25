"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { LogIn, Shield, Loader2 } from "lucide-react";

const GOV_BR_ERRORS: Record<string, string> = {
  govbr_nao_configurado:
    "Login Gov.br nao configurado. Contate o administrador.",
  token_invalido: "Erro ao autenticar com Gov.br. Tente novamente.",
  userinfo_falhou: "Erro ao obter dados do Gov.br. Tente novamente.",
  state_invalido: "Sessao expirada. Tente novamente.",
  sessao_expirada: "Sessao expirada. Tente novamente.",
  sem_codigo: "Autorizacao negada ou cancelada.",
  erro_interno: "Erro interno. Tente novamente.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const initialError = errorParam
    ? GOV_BR_ERRORS[errorParam] || `Erro: ${errorParam}`
    : "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao fazer login");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleGovBr() {
    window.location.href = "/api/auth/govbr";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-8 py-8 text-center border-b border-gray-200">
            <div className="flex justify-center items-center gap-5 mb-4">
              <Image
                src="/images/logoIGC.png"
                alt="IGC - Instituto Geografico e Cartografico"
                width={72}
                height={72}
              />
              <Image
                src="/images/logoSP.png"
                alt="Governo SP"
                width={52}
                height={52}
              />
            </div>
            <h1 className="text-xl font-bold text-gray-800">
              Sistema de Certidoes
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Instituto Geografico e Cartografico de Sao Paulo
            </p>
          </div>

          <div className="p-8">
            {/* Gov.br Login Button */}
            <button
              onClick={handleGovBr}
              className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 px-4 rounded-lg transition-colors mb-6"
            >
              <Shield className="h-5 w-5" />
              Entrar com Gov.br
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">
                  ou acesso institucional
                </span>
              </div>
            </div>

            {/* Internal Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  E-mail institucional
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none transition"
                  placeholder="usuario@igc.sp.gov.br"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none transition"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="h-5 w-5" />
                )}
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 text-center border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Governo do Estado de Sao Paulo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
