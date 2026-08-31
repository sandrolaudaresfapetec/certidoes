"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";

/** Cadastro/manutenção de cliente pelo Atendimento. */
export function ClienteForm() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    setSalvo(null);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, nome, email, telefone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Não foi possível salvar o cliente.");
        return;
      }
      setSalvo(data.nome);
      setCpf("");
      setNome("");
      setEmail("");
      setTelefone("");
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={salvar} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <h2 className="font-semibold text-gray-900">Cadastro de Cliente</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="cliente-cpf" className="block text-xs text-gray-600 mb-1">
            CPF *
          </label>
          <input
            id="cliente-cpf"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="cliente-nome" className="block text-xs text-gray-600 mb-1">
            Nome *
          </label>
          <input
            id="cliente-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="cliente-email" className="block text-xs text-gray-600 mb-1">
            E-mail *
          </label>
          <input
            id="cliente-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="cliente-telefone" className="block text-xs text-gray-600 mb-1">
            Telefone *
          </label>
          <input
            id="cliente-telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      {erro && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {erro}
        </p>
      )}
      {salvo && (
        <p className="text-sm text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4" />
          Cliente {salvo} salvo.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar cliente
      </button>
    </form>
  );
}
