"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface DocValidationProps {
  processId: string;
  docRequerimento: boolean;
  docIdentidade: boolean;
  docProcuracao: boolean;
  docComprovante: boolean;
  docPlanta: boolean;
  docMatricula: boolean;
  docArt: boolean;
  docsValidados: boolean;
  obsDocumentos: string | null;
}

const DOC_ITEMS = [
  { key: "docRequerimento", label: "Requerimento preenchido e assinado", required: true },
  { key: "docIdentidade", label: "Documento de identidade (RG/CPF/CNH)", required: true },
  { key: "docProcuracao", label: "Procuracao (se representante)", required: false },
  { key: "docComprovante", label: "Comprovante de pagamento", required: true },
  { key: "docPlanta", label: "Planta/Croqui da area", required: true },
  { key: "docMatricula", label: "Matricula do imovel", required: true },
  { key: "docArt", label: "ART do responsavel tecnico", required: false },
] as const;

export function DocValidation(props: DocValidationProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [docs, setDocs] = useState({
    docRequerimento: props.docRequerimento,
    docIdentidade: props.docIdentidade,
    docProcuracao: props.docProcuracao,
    docComprovante: props.docComprovante,
    docPlanta: props.docPlanta,
    docMatricula: props.docMatricula,
    docArt: props.docArt,
  });
  const [obs, setObs] = useState(props.obsDocumentos || "");

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/processes/${props.processId}/validate-docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...docs, obsDocumentos: obs || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao salvar validacao");
        return;
      }

      const data = await res.json();
      if (data.docsValidados) {
        setSuccess("Documentacao completa! Processo pode ser encaminhado.");
      } else {
        setSuccess("Checklist salvo. Documentacao incompleta.");
      }
      router.refresh();
    } catch {
      setError("Erro de conexao");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-gray-600" />
        Checklist de Documentos (SDTC)
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Verifique cada documento antes de encaminhar o processo.
      </p>

      <div className="space-y-2">
        {DOC_ITEMS.map((item) => (
          <label
            key={item.key}
            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded"
          >
            <input
              type="checkbox"
              checked={docs[item.key]}
              onChange={(e) =>
                setDocs((prev) => ({ ...prev, [item.key]: e.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300 text-gray-700 focus:ring-gray-500"
            />
            <span className={docs[item.key] ? "text-gray-700" : "text-gray-500"}>
              {item.label}
            </span>
            {item.required && (
              <span className="text-red-400 text-xs">*</span>
            )}
          </label>
        ))}
      </div>

      <div className="mt-4">
        <label className="text-xs font-medium text-gray-500 block mb-1">
          Observacoes
        </label>
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          rows={2}
          placeholder="Observacoes sobre a documentacao..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckSquare className="h-4 w-4" />
        )}
        Salvar Checklist
      </button>

      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-xs text-green-700">{success}</p>
        </div>
      )}
    </div>
  );
}
