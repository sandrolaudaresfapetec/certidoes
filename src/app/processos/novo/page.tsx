"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SERVICE_TYPES, CLIENT_TYPES, BASES, DEPARTMENTS } from "@/lib/workflow";
import { ArrowLeft, Save, Loader2, Search, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

interface SigefData {
  codigoParcela: string;
  status: string;
  area: number;
  municipio: string;
  uf: string;
  detentor: string;
  matricula: string;
}

export default function NovoProcessoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sigefLoading, setSigefLoading] = useState(false);
  const [sigefError, setSigefError] = useState<string | null>(null);
  const [sigefData, setSigefData] = useState<SigefData | null>(null);
  const [codigoSigef, setCodigoSigef] = useState("");

  const buscarSigef = useCallback(async () => {
    if (!codigoSigef.trim()) {
      setSigefError("Informe o codigo da parcela SIGEF");
      return;
    }
    setSigefLoading(true);
    setSigefError(null);
    try {
      const res = await fetch(`/api/sigef?codigo=${encodeURIComponent(codigoSigef)}`);
      if (!res.ok) {
        const data = await res.json();
        setSigefError(data.error || "Parcela nao encontrada no SIGEF");
        setSigefData(null);
        return;
      }
      const data = await res.json();
      setSigefData(data);
    } catch {
      setSigefError("Erro ao consultar SIGEF. Tente novamente.");
      setSigefData(null);
    } finally {
      setSigefLoading(false);
    }
  }, [codigoSigef]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (value) data[key] = value.toString();
    });

    // Add SIGEF data if loaded
    if (sigefData) {
      data.codigoSigef = sigefData.codigoParcela;
      data.areaSigef = String(sigefData.area);
      data.statusSigef = sigefData.status;
      data.detentorSigef = sigefData.detentor;
      data.matriculaSigef = sigefData.matricula;
      data.municipioSigef = sigefData.municipio;
      data.ufSigef = sigefData.uf;
      if (!data.municipio && sigefData.municipio) {
        data.municipio = sigefData.municipio;
      }
    }

    // Validation
    if (!data.tipoServico) {
      setError("Selecione o tipo de servico");
      setLoading(false);
      return;
    }
    if (!data.interessado) {
      setError("Informe o nome do interessado");
      setLoading(false);
      return;
    }
    if (!data.tipo) {
      setError("Selecione o tipo de interessado");
      setLoading(false);
      return;
    }
    if (data.cpfCnpj && !validarCpfCnpj(data.cpfCnpj)) {
      setError("CPF/CNPJ invalido. Verifique o formato.");
      setLoading(false);
      return;
    }

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
    <div className="p-8 max-w-5xl">
      <Link
        href="/processos"
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Novo Processo</h1>
      <p className="text-sm text-gray-500 mb-6">
        Preencha os dados do interessado e da area. Use a consulta SIGEF para preencher automaticamente os dados do imovel.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Service Type */}
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

        {/* Section 2: Client / Interested Party */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Dados do Interessado
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Dados da pessoa ou entidade que solicita a certidao.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nome do Interessado *" name="interessado" required>
              <input
                type="text"
                name="interessado"
                required
                placeholder="Nome completo"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Tipo de Interessado *" name="tipo" required>
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
            <FormField label="Email *" name="email">
              <input
                type="email"
                name="email"
                required
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
            <FormField label="CPF/CNPJ *" name="cpfCnpj">
              <input
                type="text"
                name="cpfCnpj"
                required
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
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

        {/* Section 3: SIGEF / Area Data */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            Dados da Area (SIGEF/INCRA)
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Informe o codigo da parcela SIGEF para preencher automaticamente os dados do imovel rural.
          </p>
          
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={codigoSigef}
              onChange={(e) => setCodigoSigef(e.target.value)}
              placeholder="Codigo da parcela SIGEF (UUID)"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={buscarSigef}
              disabled={sigefLoading}
              className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {sigefLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Consultar SIGEF
            </button>
          </div>

          {sigefError && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
              <p className="text-sm text-yellow-700">{sigefError}</p>
            </div>
          )}

          {sigefData && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Dados SIGEF carregados com sucesso</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Parcela:</span> <span className="font-medium">{sigefData.codigoParcela}</span></div>
                <div><span className="text-gray-500">Status:</span> <span className="font-medium">{sigefData.status}</span></div>
                <div><span className="text-gray-500">Area:</span> <span className="font-medium">{sigefData.area} ha</span></div>
                <div><span className="text-gray-500">Municipio:</span> <span className="font-medium">{sigefData.municipio}</span></div>
                <div><span className="text-gray-500">Detentor:</span> <span className="font-medium">{sigefData.detentor}</span></div>
                <div><span className="text-gray-500">Matricula:</span> <span className="font-medium">{sigefData.matricula}</span></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Municipio" name="municipio">
              <input
                type="text"
                name="municipio"
                defaultValue={sigefData?.municipio || ""}
                key={sigefData?.municipio || "empty"}
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
            <FormField label="Nome da Fazenda/Propriedade" name="nomeFazenda">
              <input
                type="text"
                name="nomeFazenda"
                placeholder="Nome do imovel rural"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Representante Tecnico" name="representanteTecnico">
              <input
                type="text"
                name="representanteTecnico"
                placeholder="Nome do responsavel tecnico"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
          </div>
        </div>

        {/* Section 4: Technical */}
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
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-gray-700 text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
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

function validarCpfCnpj(value: string): boolean {
  const cleaned = value.replace(/[.\-\/]/g, "");
  if (cleaned.length === 11) return validarCpf(cleaned);
  if (cleaned.length === 14) return validarCnpj(cleaned);
  return false;
}

function validarCpf(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  let rest = 11 - (sum % 11);
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  rest = 11 - (sum % 11);
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(cpf.charAt(10));
}

function validarCnpj(cnpj: string): boolean {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(cnpj.charAt(i)) * weights1[i];
  let rest = sum % 11;
  const d1 = rest < 2 ? 0 : 11 - rest;
  if (d1 !== parseInt(cnpj.charAt(12))) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(cnpj.charAt(i)) * weights2[i];
  rest = sum % 11;
  const d2 = rest < 2 ? 0 : 11 - rest;
  return d2 === parseInt(cnpj.charAt(13));
}
