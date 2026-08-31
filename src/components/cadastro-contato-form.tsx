"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";

interface CadastroContatoFormProps {
  emailInicial?: string;
  telefoneInicial?: string;
  labelBotao: string;
  redirecionarPara?: string;
}

/** Dados de contato do solicitante (cadastro inicial e manutenção). */
export function CadastroContatoForm({
  emailInicial = "",
  telefoneInicial = "",
  labelBotao,
  redirecionarPara,
}: CadastroContatoFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(emailInicial);
  const [telefone, setTelefone] = useState(telefoneInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    setSalvo(false);
    try {
      const res = await fetch("/api/portal/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, telefone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Não foi possível salvar.");
        return;
      }
      if (redirecionarPara) {
        router.push(redirecionarPara);
      } else {
        setSalvo(true);
      }
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div>
        <label htmlFor="cadastro-email" className="block text-xs font-medium text-gray-600 mb-1">
          E-mail *
        </label>
        <input
          id="cadastro-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="cadastro-telefone" className="block text-xs font-medium text-gray-600 mb-1">
          Telefone (com DDD) *
        </label>
        <input
          id="cadastro-telefone"
          type="tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(61) 99999-9999"
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      {erro && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {erro}
        </p>
      )}
      {salvo && (
        <p className="text-sm text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4" />
          Dados atualizados.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-700 text-white py-2.5 rounded-md text-sm font-medium hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {labelBotao}
      </button>
    </form>
  );
}
