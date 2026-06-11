"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SERVICE_TYPES, CLIENT_TYPES, BASES, DEPARTMENTS } from "@/lib/workflow";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NovoProcessoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (value) data[key] = value.toString();
    });

    try {
      const res = await fetch("/api/processes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Erro ao criar processo");
        return;
      }

      const processo = await res.json();
      router.push(`/processos/${processo.id}`);
    } catch {
      setError("Erro de conexao");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href="/processos"
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Novo Processo</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Service Type */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Tipo de Servico
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tipo de Servico *" name="tipoServico" required>
              <select
                name="tipoServico"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Expediente (SEI)" name="expediente">
              <input
                type="text"
                name="expediente"
                placeholder="Ex: DDD_013.000034472026-66"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Data Abertura SEI" name="dtAbertoSei">
              <input
                type="date"
                name="dtAbertoSei"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Ano de Entrada" name="anoEntrada">
              <input
                type="number"
                name="anoEntrada"
                defaultValue={new Date().getFullYear()}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
          </div>
        </div>

        {/* Client */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Dados do Interessado
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Interessado *" name="interessado" required>
              <input
                type="text"
                name="interessado"
                required
                placeholder="Nome completo"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Tipo *" name="tipo" required>
              <select
                name="tipo"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {CLIENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Email" name="email">
              <input
                type="email"
                name="email"
                placeholder="email@exemplo.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Telefone" name="telefone">
              <input
                type="text"
                name="telefone"
                placeholder="(11) 99999-9999"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="CPF/CNPJ" name="cpfCnpj">
              <input
                type="text"
                name="cpfCnpj"
                placeholder="000.000.000-00"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Data Nascimento (Idoso)" name="dtNascimentoIdoso">
              <input
                type="date"
                name="dtNascimentoIdoso"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Localizacao
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Municipio" name="municipio">
              <input
                type="text"
                name="municipio"
                placeholder="Municipio"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="RA (Regiao Administrativa)" name="ra">
              <input
                type="text"
                name="ra"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="DRA" name="dra">
              <input
                type="text"
                name="dra"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="UTM" name="utm">
              <input
                type="text"
                name="utm"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Pasta" name="pasta">
              <input
                type="text"
                name="pasta"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Dificuldade de Divisa" name="divisaDificuldade">
              <input
                type="text"
                name="divisaDificuldade"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
          </div>
        </div>

        {/* Technical */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Dados Tecnicos
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Base" name="base">
              <select
                name="base"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {BASES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Departamento" name="departamento">
              <select
                name="departamento"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Observacoes de Entrada" name="observacaoEntrada">
              <textarea
                name="observacaoEntrada"
                rows={3}
                placeholder="Observacoes sobre o processo..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Criar Processo
          </button>
          <Link
            href="/processos"
            className="px-6 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

function FormField(props: {
  label: string;
  name?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="block text-xs font-medium text-gray-600 mb-1">
        {props.label}
      </span>
      {props.children}
    </div>
  );
}
