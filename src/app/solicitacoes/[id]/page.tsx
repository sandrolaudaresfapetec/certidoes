"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  ArrowLeft,
  CheckCircle,
  Circle,
  XCircle,
  AlertCircle,
  Send,
  RotateCcw,
  Loader2,
  MapPin,
  User,
  FileText,
  ExternalLink,
} from "lucide-react";

interface Solicitacao {
  id: string;
  status: string;
  tipoServico: string;
  interessado: string;
  email: string | null;
  telefone: string | null;
  cpfCnpj: string | null;
  tipo: string;
  dtNascimentoIdoso: string | null;
  municipio: string | null;
  ra: string | null;
  codigoSigef: string | null;
  areaSigef: number | null;
  statusSigef: string | null;
  nomeFazenda: string | null;
  matriculaSigef: string | null;
  detentorSigef: string | null;
  municipioSigef: string | null;
  ufSigef: string | null;
  representanteTecnico: string | null;
  docRequerimento: boolean;
  docIdentidade: boolean;
  docProcuracao: boolean;
  docComprovante: boolean;
  docPlanta: boolean;
  docMatricula: boolean;
  docArt: boolean;
  arquivoGeo: string | null;
  observacaoSDTC: string | null;
  clienteId: string;
  processId: string | null;
  createdAt: string;
  updatedAt: string;
  cliente: { id: string; name: string; email: string; phone: string | null };
  process: { id: string; ordem: number; situacao: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pendente: { label: "Pendente", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  em_analise: { label: "Em Analise", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  aprovada: { label: "Aprovada", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  devolvida: { label: "Devolvida", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  rejeitada: { label: "Rejeitada", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

const DOCUMENTOS = [
  { key: "docRequerimento", label: "Requerimento assinado", required: true },
  { key: "docIdentidade", label: "Documento de identidade", required: true },
  { key: "docProcuracao", label: "Procuracao (se representante)", required: false },
  { key: "docComprovante", label: "Comprovante de pagamento", required: true },
  { key: "docPlanta", label: "Planta / Croqui do imovel", required: true },
  { key: "docMatricula", label: "Matricula do imovel", required: true },
  { key: "docArt", label: "ART / RRT do responsavel tecnico", required: false },
];

export default function SolicitacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [solicitacao, setSolicitacao] = useState<Solicitacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [observacao, setObservacao] = useState("");
  const [userRole, setUserRole] = useState("");
  const [solicitacaoId, setSolicitacaoId] = useState("");

  useEffect(() => {
    params.then((p) => {
      setSolicitacaoId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (!solicitacaoId) return;

    async function load() {
      try {
        const [solRes, meRes] = await Promise.all([
          fetch(`/api/solicitacoes/${solicitacaoId}`),
          fetch("/api/auth/me"),
        ]);
        if (!solRes.ok) {
          setError("Solicitacao nao encontrada");
          return;
        }
        const solData = await solRes.json();
        setSolicitacao(solData);
        setObservacao(solData.observacaoSDTC || "");
        if (meRes.ok) {
          const meData = await meRes.json();
          setUserRole(meData.role);
        }
      } catch {
        setError("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [solicitacaoId]);

  async function updateStatus(newStatus: string) {
    setActionLoading(newStatus);
    setError("");
    try {
      const res = await fetch(`/api/solicitacoes/${solicitacaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          observacaoSDTC: observacao,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao atualizar");
        return;
      }
      const updated = await res.json();
      setSolicitacao(updated);
    } catch {
      setError("Erro de conexao");
    } finally {
      setActionLoading("");
    }
  }

  async function updateDocs(docKey: string, value: boolean) {
    try {
      const res = await fetch(`/api/solicitacoes/${solicitacaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [docKey]: value }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSolicitacao(updated);
      }
    } catch {
      // silent fail for doc toggle
    }
  }

  async function converterParaProcesso() {
    setActionLoading("converter");
    setError("");
    try {
      const res = await fetch(`/api/solicitacoes/${solicitacaoId}/converter`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao converter");
        return;
      }
      setSolicitacao((prev) =>
        prev
          ? {
              ...prev,
              status: "aprovada",
              processId: data.processo.id,
              process: {
                id: data.processo.id,
                ordem: data.processo.ordem,
                situacao: data.processo.situacao,
              },
            }
          : null
      );
    } catch {
      setError("Erro de conexao");
    } finally {
      setActionLoading("");
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!solicitacao) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-700">{error || "Solicitacao nao encontrada"}</p>
          <Link href="/solicitacoes" className="text-sm text-gray-600 hover:underline mt-2 inline-block">
            Voltar para solicitacoes
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_LABELS[solicitacao.status] || {
    label: solicitacao.status,
    color: "text-gray-700",
    bg: "bg-gray-50",
  };

  const isSDTC = ["ADMIN", "SDTC"].includes(userRole);
  const isCliente = userRole === "CLIENTE";
  const canReview = isSDTC && ["pendente", "em_analise"].includes(solicitacao.status);

  const docsCount = DOCUMENTOS.filter(
    (d) => solicitacao[d.key as keyof Solicitacao] === true
  ).length;
  const requiredDocs = DOCUMENTOS.filter((d) => d.required);
  const requiredDocsCount = requiredDocs.filter(
    (d) => solicitacao[d.key as keyof Solicitacao] === true
  ).length;

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/solicitacoes"
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              Solicitacao — {solicitacao.tipoServico}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Criada em {new Date(solicitacao.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg border ${statusConfig.bg}`}>
            <span className={`font-semibold ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Process link if converted */}
        {solicitacao.process && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-800 font-medium">
                Convertida para Processo #{solicitacao.process.ordem}
              </span>
            </div>
            <Link
              href={`/processos/${solicitacao.process.id}`}
              className="text-sm text-green-700 hover:text-green-900 flex items-center gap-1 font-medium"
            >
              Ver Processo <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* SDTC observation if devolvida */}
        {solicitacao.status === "devolvida" && solicitacao.observacaoSDTC && isCliente && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-orange-800 mb-1">
              Observacao do SDTC:
            </h3>
            <p className="text-sm text-orange-700">{solicitacao.observacaoSDTC}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dados do Interessado */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados do Interessado
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <DetailField label="Nome" value={solicitacao.interessado} />
                <DetailField label="Tipo" value={solicitacao.tipo} />
                <DetailField label="CPF/CNPJ" value={solicitacao.cpfCnpj} />
                <DetailField label="E-mail" value={solicitacao.email} />
                <DetailField label="Telefone" value={solicitacao.telefone} />
                <DetailField label="Municipio" value={solicitacao.municipio} />
                <DetailField label="RA" value={solicitacao.ra} />
                {solicitacao.dtNascimentoIdoso && (
                  <DetailField
                    label="Data Nascimento"
                    value={new Date(solicitacao.dtNascimentoIdoso).toLocaleDateString("pt-BR")}
                  />
                )}
              </div>
            </div>

            {/* Dados SIGEF */}
            {solicitacao.codigoSigef && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Dados SIGEF / INCRA
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <DetailField label="Codigo SIGEF" value={solicitacao.codigoSigef} />
                  <DetailField label="Area (ha)" value={solicitacao.areaSigef?.toString()} />
                  <DetailField label="Status" value={solicitacao.statusSigef} />
                  <DetailField label="Denominacao" value={solicitacao.nomeFazenda} />
                  <DetailField label="Matricula" value={solicitacao.matriculaSigef} />
                  <DetailField label="Detentor" value={solicitacao.detentorSigef} />
                  <DetailField label="Municipio SIGEF" value={solicitacao.municipioSigef} />
                  <DetailField label="UF" value={solicitacao.ufSigef} />
                  <DetailField label="Resp. Tecnico" value={solicitacao.representanteTecnico} />
                </div>
              </div>
            )}

            {solicitacao.arquivoGeo && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Arquivo Georreferenciado
                </h2>
                <p className="text-sm text-gray-700">{solicitacao.arquivoGeo}</p>
              </div>
            )}
          </div>

          {/* Right column: Documents + Actions */}
          <div className="space-y-6">
            {/* Checklist de Documentos */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos ({docsCount}/7)
              </h2>
              <div className="space-y-2">
                {DOCUMENTOS.map((doc) => {
                  const checked = solicitacao[doc.key as keyof Solicitacao] === true;
                  return (
                    <label
                      key={doc.key}
                      className={`flex items-center gap-2 p-2 rounded-lg text-sm cursor-pointer transition-colors ${
                        checked
                          ? "bg-green-50 text-green-800"
                          : "text-gray-600 hover:bg-gray-50"
                      } ${canReview ? "cursor-pointer" : ""}`}
                    >
                      {canReview ? (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => updateDocs(doc.key, e.target.checked)}
                          className="sr-only"
                        />
                      ) : null}
                      {checked ? (
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      )}
                      <span>
                        {doc.label}
                        {doc.required && <span className="text-red-500 ml-0.5">*</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                {requiredDocsCount}/{requiredDocs.length} obrigatorios
                {requiredDocsCount >= requiredDocs.length ? (
                  <span className="text-green-600 ml-1 font-medium">— Completo</span>
                ) : (
                  <span className="text-orange-600 ml-1">— Incompleto</span>
                )}
              </div>
            </div>

            {/* SDTC Actions */}
            {canReview && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-3">
                  Acoes SDTC
                </h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observacao
                  </label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                    rows={3}
                    placeholder="Observacoes sobre a solicitacao..."
                  />
                </div>

                <div className="space-y-2">
                  {solicitacao.status === "pendente" && (
                    <button
                      onClick={() => updateStatus("em_analise")}
                      disabled={!!actionLoading}
                      className="w-full inline-flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {actionLoading === "em_analise" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Iniciar Analise
                    </button>
                  )}

                  <button
                    onClick={converterParaProcesso}
                    disabled={!!actionLoading}
                    className="w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {actionLoading === "converter" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Aprovar e Converter para Processo
                  </button>

                  <button
                    onClick={() => updateStatus("devolvida")}
                    disabled={!!actionLoading}
                    className="w-full inline-flex items-center justify-center gap-2 bg-orange-50 text-orange-700 border border-orange-200 px-4 py-2 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {actionLoading === "devolvida" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Devolver ao Cliente
                  </button>

                  <button
                    onClick={() => updateStatus("rejeitada")}
                    disabled={!!actionLoading}
                    className="w-full inline-flex items-center justify-center gap-2 bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {actionLoading === "rejeitada" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Rejeitar
                  </button>
                </div>
              </div>
            )}

            {/* Cliente info for SDTC */}
            {isSDTC && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-3">
                  Cliente
                </h2>
                <div className="text-sm space-y-1">
                  <p className="text-gray-700 font-medium">{solicitacao.cliente.name}</p>
                  <p className="text-gray-500">{solicitacao.cliente.email}</p>
                  {solicitacao.cliente.phone && (
                    <p className="text-gray-500">{solicitacao.cliente.phone}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-gray-500">{label}:</span>{" "}
      <span className="font-medium text-gray-800">{value || "-"}</span>
    </div>
  );
}
