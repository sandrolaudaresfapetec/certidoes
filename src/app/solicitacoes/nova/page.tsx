"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Search,
  MapPin,
  FileText,
  User,
  Send,
  Loader2,
  CheckCircle,
  Circle,
  AlertCircle,
} from "lucide-react";

const TIPOS_SERVICO = [
  "Certidao",
  "Informacao",
  "Drenagem",
  "Visita",
  "Diligencia",
  "Manifestacao",
];

const TIPOS_PESSOA = [
  { value: "Comum-CPF", label: "Pessoa Fisica (CPF)" },
  { value: "Comum-CNPJ", label: "Pessoa Juridica (CNPJ)" },
  { value: "Orgao-Publico", label: "Orgao Publico" },
  { value: "Justica", label: "Justica" },
  { value: "idoso", label: "Idoso (prioridade)" },
];

const DOCUMENTOS = [
  { key: "docRequerimento", label: "Requerimento assinado", required: true },
  { key: "docIdentidade", label: "Documento de identidade", required: true },
  { key: "docProcuracao", label: "Procuracao (se representante)", required: false },
  { key: "docComprovante", label: "Comprovante de pagamento", required: true },
  { key: "docPlanta", label: "Planta / Croqui do imovel", required: true },
  { key: "docMatricula", label: "Matricula do imovel", required: true },
  { key: "docArt", label: "ART / RRT do responsavel tecnico", required: false },
];

export default function NovaSolicitacaoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sigefLoading, setSigefLoading] = useState(false);
  const [sigefError, setSigefError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [codigoSigef, setCodigoSigef] = useState("");

  const [form, setForm] = useState({
    tipoServico: "",
    interessado: "",
    email: "",
    telefone: "",
    cpfCnpj: "",
    tipo: "Comum-CPF",
    dtNascimentoIdoso: "",
    municipio: "",
    ra: "",
    codigoSigef: "",
    areaSigef: "",
    statusSigef: "",
    nomeFazenda: "",
    matriculaSigef: "",
    detentorSigef: "",
    municipioSigef: "",
    ufSigef: "",
    representanteTecnico: "",
    docRequerimento: false,
    docIdentidade: false,
    docProcuracao: false,
    docComprovante: false,
    docPlanta: false,
    docMatricula: false,
    docArt: false,
    arquivoGeo: "",
  });

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function buscarSigef() {
    if (!codigoSigef.trim()) return;
    setSigefLoading(true);
    setSigefError("");
    try {
      const res = await fetch(`/api/sigef?code=${encodeURIComponent(codigoSigef)}`);
      const data = await res.json();
      if (!res.ok) {
        setSigefError(data.error || "Erro ao buscar dados SIGEF");
        return;
      }
      if (data.parcelas && data.parcelas.length > 0) {
        const p = data.parcelas[0];
        setForm((prev) => ({
          ...prev,
          codigoSigef: p.codigoImovel || codigoSigef,
          areaSigef: p.area?.toString() || "",
          statusSigef: p.situacao || "",
          nomeFazenda: p.denominacao || "",
          matriculaSigef: p.matricula || "",
          detentorSigef: p.detentor || "",
          municipioSigef: p.municipio || "",
          ufSigef: p.uf || "",
          representanteTecnico: p.responsavelTecnico || "",
        }));
      } else {
        setSigefError("Nenhuma parcela encontrada com este codigo");
      }
    } catch {
      setSigefError("Erro de conexao ao buscar SIGEF");
    } finally {
      setSigefLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.tipoServico) {
      setError("Selecione o tipo de servico");
      return;
    }
    if (!form.interessado.trim()) {
      setError("Informe o nome do interessado");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao criar solicitacao");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/solicitacoes"), 2000);
    } catch {
      setError("Erro de conexao");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Solicitacao Enviada!
          </h1>
          <p className="text-gray-500">
            Sua solicitacao foi recebida e sera analisada pela equipe SDTC.
            Voce recebera uma notificacao quando houver atualizacao.
          </p>
        </div>
      </div>
    );
  }

  const docsChecked = DOCUMENTOS.filter(
    (d) => form[d.key as keyof typeof form] === true
  ).length;
  const requiredDocsChecked = DOCUMENTOS.filter(
    (d) => d.required && form[d.key as keyof typeof form] === true
  ).length;
  const totalRequired = DOCUMENTOS.filter((d) => d.required).length;

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Nova Solicitacao de Certidao
          </h1>
          <p className="text-gray-500 mt-1">
            Preencha os dados abaixo para solicitar uma certidao cartografica ao IGC SP
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Tipo de Servico */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Tipo de Servico
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TIPOS_SERVICO.map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => updateField("tipoServico", tipo)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    form.tipoServico === tipo
                      ? "border-gray-700 bg-gray-700 text-white"
                      : "border-gray-200 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Dados do Interessado */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados do Interessado
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={form.interessado}
                  onChange={(e) => updateField("interessado", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  placeholder="Nome completo do interessado"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Pessoa *
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) => updateField("tipo", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                >
                  {TIPOS_PESSOA.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF / CNPJ
                </label>
                <input
                  type="text"
                  value={form.cpfCnpj}
                  onChange={(e) => updateField("cpfCnpj", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => updateField("telefone", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  placeholder="(XX) XXXXX-XXXX"
                />
              </div>
              {form.tipo === "idoso" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={form.dtNascimentoIdoso}
                    onChange={(e) => updateField("dtNascimentoIdoso", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Municipio
                </label>
                <input
                  type="text"
                  value={form.municipio}
                  onChange={(e) => updateField("municipio", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  placeholder="Municipio do imovel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regiao Administrativa (RA)
                </label>
                <input
                  type="text"
                  value={form.ra}
                  onChange={(e) => updateField("ra", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  placeholder="RA"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Dados SIGEF */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Dados do Imovel (SIGEF/INCRA)
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Codigo SIGEF / Matricula INCRA
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codigoSigef}
                  onChange={(e) => setCodigoSigef(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  placeholder="Digite o codigo SIGEF ou matricula"
                />
                <button
                  type="button"
                  onClick={buscarSigef}
                  disabled={sigefLoading}
                  className="inline-flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
                >
                  {sigefLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Buscar SIGEF
                </button>
              </div>
              {sigefError && (
                <p className="text-sm text-red-600 mt-1">{sigefError}</p>
              )}
            </div>

            {form.codigoSigef && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Dados da Parcela
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <InfoField label="Codigo SIGEF" value={form.codigoSigef} />
                  <InfoField label="Area (ha)" value={form.areaSigef} />
                  <InfoField label="Status" value={form.statusSigef} />
                  <InfoField label="Denominacao" value={form.nomeFazenda} />
                  <InfoField label="Matricula" value={form.matriculaSigef} />
                  <InfoField label="Detentor" value={form.detentorSigef} />
                  <InfoField label="Municipio" value={form.municipioSigef} />
                  <InfoField label="UF" value={form.ufSigef} />
                  <InfoField label="Resp. Tecnico" value={form.representanteTecnico} />
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Arquivo Georreferenciado
              </label>
              <input
                type="text"
                value={form.arquivoGeo}
                onChange={(e) => updateField("arquivoGeo", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                placeholder="Nome do arquivo georreferenciado (ex: parcela_123.shp)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Informe o nome do arquivo georreferenciado que sera enviado
              </p>
            </div>
          </div>

          {/* Section 4: Documentos */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos Necessarios
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Marque os documentos que voce esta enviando junto com a solicitacao.
              Documentos marcados com * sao obrigatorios.
            </p>
            <div className="space-y-3">
              {DOCUMENTOS.map((doc) => (
                <label
                  key={doc.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form[doc.key as keyof typeof form] === true
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form[doc.key as keyof typeof form] === true}
                    onChange={(e) => updateField(doc.key, e.target.checked)}
                    className="sr-only"
                  />
                  {form[doc.key as keyof typeof form] === true ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                  )}
                  <span className="text-sm text-gray-700">
                    {doc.label}
                    {doc.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-500">
              {requiredDocsChecked}/{totalRequired} documentos obrigatorios marcados
              {requiredDocsChecked < totalRequired && (
                <span className="text-orange-600 ml-2">
                  (documentacao incompleta)
                </span>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/solicitacoes")}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-gray-700 text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar Solicitacao
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500">{label}:</span>{" "}
      <span className="font-medium text-gray-800">{value || "-"}</span>
    </div>
  );
}
