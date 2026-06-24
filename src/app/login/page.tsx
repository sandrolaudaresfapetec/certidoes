"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogIn, Shield, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#071D41] to-[#0C2D6B] px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#071D41] px-8 py-6 text-center">
            <div className="flex justify-center items-center gap-4 mb-4">
              <Image
                src="/images/logoSP.png"
                alt="Governo SP"
                width={60}
                height={60}
                className="rounded-full bg-white p-1"
              />
              <Image
                src="/images/igc-logo.png"
                alt="IGC SP"
                width={60}
                height={60}
                className="rounded-full bg-white p-1"
              />
            </div>
            <h1 className="text-xl font-bold text-white">
              Sistema de Certidoes
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              Instituto Geografico e Cartografico de Sao Paulo
            </p>
          </div>

          <div className="p-8">
            {/* Gov.br Login Button */}
            <button
              onClick={handleGovBr}
              className="w-full flex items-center justify-center gap-3 bg-[#1351B4] hover:bg-[#0C326F] text-white font-semibold py-3 px-4 rounded-lg transition-colors mb-6"
            >
              <Shield className="h-5 w-5" />
              Entrar com Gov.br
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1351B4] focus:border-transparent outline-none transition"
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1351B4] focus:border-transparent outline-none transition"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#071D41] hover:bg-[#0C2D6B] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
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
          <div className="bg-gray-50 px-8 py-4 text-center border-t">
            <p className="text-xs text-gray-500">
              Governo do Estado de Sao Paulo
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Secretaria de Meio Ambiente, Infraestrutura e Logistica
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
