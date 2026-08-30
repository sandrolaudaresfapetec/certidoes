"use client";

import { useState } from "react";
import { Search, Loader2, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";

interface SigefParcela {
  codigoImovel: string;
  parcelaCodigo: string;
  nomeArea: string;
  detentorNome: string;
  detentorCpfCnpj: string;
  titularNome?: string;
  areaHectares: number;
  municipio: string;
  uf: string;
  status: string;
  situacaoInformada?: string;
  natureza?: string;
  registroMatricula?: string;
  dataAprovacao?: string;
}

interface SigefConsultaResult {
  origem: "SIGEF_REAL" | "SIMULADO";
  parcelas: SigefParcela[];
  aviso?: string;
}

/**
 * Bloco de consulta ao SIGEF/INCRA para o formulário de novo processo.
 * Ao selecionar uma parcela, preenche inputs ocultos (sigef*) que são
 * enviados junto com o formulário, e tenta pré-preencher o campo município.
 */
export default function SigefConsulta() {
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<SigefConsultaResult | null>(null);
  const [selecionada, setSelecionada] = useState<SigefParcela | null>(null);

  async function consultar() {
    setLoading(true);
    setErro(null);
    setResultado(null);
    setSelecionada(null);

    try {
      const res = await fetch("/api/sigef/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpfCnpj }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Erro ao consultar o SIGEF");
        return;
      }
      setResultado(data);
    } catch {
      setErro("Erro de conexão ao consultar o SIGEF");
    } finally {
      setLoading(false);
    }
  }

  function selecionar(p: SigefParcela) {
    setSelecionada(p);
    // Pré-preenche o campo Município do formulário, se existir
    const input = document.querySelector<HTMLInputElement>('input[name="municipio"]');
    if (input && !input.value) {
      input.value = p.municipio;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-emerald-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-emerald-600" />
          Integração SIGEF/INCRA
        </h2>
        {resultado && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              resultado.origem === "SIGEF_REAL"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {resultado.origem === "SIGEF_REAL" ? "SIGEF (oficial)" : "Dados simulados"}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Consulte as parcelas georreferenciadas do solicitante no Sistema de
        Gestão Fundiária (SIGEF) do INCRA a partir do CPF/CNPJ.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={cpfCnpj}
          onChange={(e) => setCpfCnpj(e.target.value)}
          placeholder="CPF ou CNPJ do solicitante"
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={consultar}
          disabled={loading || !cpfCnpj.trim()}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Consultar SIGEF
        </button>
      </div>

      {erro && (
        <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-4 w-4" /> {erro}
        </p>
      )}

      {resultado?.aviso && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          {resultado.aviso}
        </p>
      )}

      {resultado && resultado.parcelas.length === 0 && (
        <p className="mt-3 text-sm text-gray-500">
          Nenhuma parcela encontrada para o documento informado.
        </p>
      )}

      {resultado && resultado.parcelas.length > 0 && (
        <ul className="mt-4 space-y-2">
          {resultado.parcelas.map((p) => {
            const ativa = selecionada?.parcelaCodigo === p.parcelaCodigo;
            return (
              <li key={p.parcelaCodigo}>
                <button
                  type="button"
                  onClick={() => selecionar(p)}
                  className={`w-full text-left border rounded-md p-3 text-sm transition ${
                    ativa
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 flex items-center gap-2">
                      {p.nomeArea || "Parcela SIGEF"}
                      {ativa && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === "Certificada"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span>Código do imóvel: {p.codigoImovel}</span>
                    <span>Área: {p.areaHectares.toLocaleString("pt-BR")} ha</span>
                    <span>
                      Município/UF: {p.municipio}/{p.uf}
                    </span>
                    {p.registroMatricula && <span>{p.registroMatricula}</span>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selecionada && (
        <>
          <p className="mt-3 text-xs text-emerald-700">
            Parcela selecionada — os dados do SIGEF serão vinculados ao processo.
          </p>
          <input type="hidden" name="sigefCodigoImovel" value={selecionada.codigoImovel} />
          <input type="hidden" name="sigefParcelaCodigo" value={selecionada.parcelaCodigo} />
          <input type="hidden" name="sigefAreaHectares" value={selecionada.areaHectares} />
          <input type="hidden" name="sigefMunicipio" value={selecionada.municipio} />
          <input type="hidden" name="sigefUf" value={selecionada.uf} />
          <input type="hidden" name="sigefStatus" value={selecionada.status} />
          <input type="hidden" name="sigefOrigem" value={resultado?.origem ?? "SIMULADO"} />
        </>
      )}
    </div>
  );
}
