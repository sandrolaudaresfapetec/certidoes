"use client";

import { useState } from "react";
import { MapPin, Search, Loader2, AlertCircle, ExternalLink } from "lucide-react";

interface SigefParcela {
  codigoParcela: string;
  status: string;
  area: number;
  municipio: string;
  uf: string;
  detentor: string;
  matricula: string;
}

export default function SigefPage() {
  const [searchType, setSearchType] = useState<"codigo" | "municipio">("codigo");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parcela, setParcela] = useState<SigefParcela | null>(null);
  const [parcelas, setParcelas] = useState<SigefParcela[]>([]);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setParcela(null);
    setParcelas([]);
    setSearched(true);

    try {
      const param = searchType === "codigo" ? `codigo=${encodeURIComponent(query)}` : `municipio=${encodeURIComponent(query)}`;
      const res = await fetch(`/api/sigef?${param}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao consultar SIGEF");
        return;
      }

      if (searchType === "codigo") {
        setParcela(data);
      } else {
        setParcelas(data.parcelas || []);
      }
    } catch {
      setError("Erro de conexao com o servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Consulta SIGEF / INCRA
        </h1>
        <p className="text-gray-500 mt-1">
          Consulta de parcelas certificadas no Sistema de Gestao Fundiaria
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="searchType"
                checked={searchType === "codigo"}
                onChange={() => { setSearchType("codigo"); setQuery(""); }}
                className="w-4 h-4 text-gray-600 accent-gray-600"
              />
              <span className="text-sm font-medium text-gray-700">Codigo da Parcela</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="searchType"
                checked={searchType === "municipio"}
                onChange={() => { setSearchType("municipio"); setQuery(""); }}
                className="w-4 h-4 text-gray-600 accent-gray-600"
              />
              <span className="text-sm font-medium text-gray-700">Codigo do Municipio (IBGE)</span>
            </label>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchType === "codigo" ? "Ex: 00000000-0000-0000-0000-000000000000" : "Ex: 3550308 (Sao Paulo)"}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 bg-gray-700 text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Consultar
            </button>
          </div>
        </form>

        <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          Dados do{" "}
          <a
            href="https://sigef.incra.gov.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:underline"
          >
            SIGEF/INCRA
          </a>
          {" "}via API GEO
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {parcela && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-800">Dados da Parcela</h2>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Codigo</dt>
                <dd className="text-sm text-gray-900 mt-1 font-mono">{parcela.codigoParcela}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Status</dt>
                <dd className="text-sm mt-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${parcela.status === "Certificada" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {parcela.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Area (ha)</dt>
                <dd className="text-sm text-gray-900 mt-1">{parcela.area.toLocaleString("pt-BR")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Municipio / UF</dt>
                <dd className="text-sm text-gray-900 mt-1">{parcela.municipio} / {parcela.uf}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Detentor</dt>
                <dd className="text-sm text-gray-900 mt-1">{parcela.detentor || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Matricula</dt>
                <dd className="text-sm text-gray-900 mt-1">{parcela.matricula || "-"}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {parcelas.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Parcelas Encontradas</h2>
            <span className="text-sm text-gray-500">{parcelas.length} resultados</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">Codigo</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Area (ha)</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">Municipio</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">Detentor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parcelas.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{p.codigoParcela}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "Certificada" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {p.status || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{p.area.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.municipio}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.detentor || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {searched && !loading && !error && !parcela && parcelas.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p>Nenhuma parcela encontrada para esta consulta.</p>
        </div>
      )}
    </div>
  );
}
