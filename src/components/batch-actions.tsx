"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WORKFLOW_STAGES, ALLOWED_TRANSITIONS, type WorkflowStage } from "@/lib/workflow";
import { CheckSquare, ArrowRight, Loader2, AlertCircle, CheckCircle, X } from "lucide-react";

interface ProcessSummary {
  id: string;
  ordem: number;
  interessado: string;
  situacao: string;
}

interface BatchActionsProps {
  processes: ProcessSummary[];
}

export function BatchActions({ processes }: BatchActionsProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  function toggleAll() {
    if (selected.size === processes.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(processes.map((p) => p.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  }

  const selectedProcesses = processes.filter((p) => selected.has(p.id));
  const commonStage = selectedProcesses.length > 0
    ? selectedProcesses.every((p) => p.situacao === selectedProcesses[0].situacao)
      ? selectedProcesses[0].situacao as WorkflowStage
      : null
    : null;

  const possibleTransitions = commonStage
    ? ALLOWED_TRANSITIONS[commonStage] || []
    : [];

  async function handleBatchTransition(toStatus: WorkflowStage) {
    if (selected.size === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/processes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processIds: Array.from(selected),
          toStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro na operacao em lote");
        return;
      }

      const data = await res.json();
      setResult({ success: data.success, failed: data.failed });
      setSelected(new Set());
      router.refresh();
    } catch {
      setError("Erro de conexao");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50"
        >
          <CheckSquare className="h-4 w-4" />
          Operacoes em Lote
        </button>
        {showPanel && (
          <span className="text-xs text-gray-500">
            {selected.size} de {processes.length} selecionados
          </span>
        )}
      </div>

      {showPanel && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.size === processes.length && processes.length > 0}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Selecionar todos
              </label>
              {selected.size > 0 && (
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}
            </div>

            {commonStage && possibleTransitions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Mover para:</span>
                {possibleTransitions.map((stage) => {
                  const config = WORKFLOW_STAGES[stage];
                  return (
                    <button
                      key={stage}
                      onClick={() => handleBatchTransition(stage)}
                      disabled={loading || selected.size === 0}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${config.bgLight} ${config.textColor} ${config.borderColor} hover:opacity-80 disabled:opacity-50`}
                    >
                      {loading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ArrowRight className="h-3 w-3" />
                      )}
                      {config.label}
                    </button>
                  );
                })}
              </div>
            )}

            {selected.size > 0 && !commonStage && (
              <p className="text-xs text-yellow-600">
                Selecione processos na mesma etapa para operacoes em lote.
              </p>
            )}
          </div>

          {/* Process selection list */}
          <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-md">
            {processes.map((proc) => {
              const stageConfig = WORKFLOW_STAGES[proc.situacao as WorkflowStage];
              return (
                <label
                  key={proc.id}
                  className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-50 ${selected.has(proc.id) ? "bg-blue-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(proc.id)}
                    onChange={() => toggleOne(proc.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-gray-500 w-12">#{proc.ordem}</span>
                  <span className="flex-1 font-medium text-gray-800">{proc.interessado}</span>
                  {stageConfig && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${stageConfig.bgLight} ${stageConfig.textColor}`}>
                      {stageConfig.label}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
          {result && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-xs text-green-700">
                {result.success} processos movidos com sucesso
                {result.failed > 0 && `, ${result.failed} falharam`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
