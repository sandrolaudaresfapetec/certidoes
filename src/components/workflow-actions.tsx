"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WORKFLOW_STAGES, type WorkflowStage } from "@/lib/workflow";
import { ArrowRight, Loader2 } from "lucide-react";

interface WorkflowActionsProps {
  processId: string;
  currentStatus: WorkflowStage;
  allowedTransitions: WorkflowStage[];
  users: Array<{ id: string; name: string; role: string }>;
}

export function WorkflowActions({
  processId,
  currentStatus,
  allowedTransitions,
  users,
}: WorkflowActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState("");

  const currentConfig = WORKFLOW_STAGES[currentStatus];

  async function handleTransition(toStatus: WorkflowStage) {
    if (!selectedUser) {
      setError("Selecione o usuario responsavel pela acao");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processId,
          toStatus,
          userId: selectedUser,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao realizar transicao");
        return;
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
      <h2 className="text-sm font-semibold text-gray-900 mb-3">
        Acoes do Workflow
      </h2>

      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">Etapa Atual</p>
        <span
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${currentConfig.bgLight} ${currentConfig.textColor} ${currentConfig.borderColor} border`}
        >
          {currentConfig.label}
        </span>
      </div>

      {allowedTransitions.length > 0 && (
        <>
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Responsavel pela Acao
            </label>
            <select
              value={selectedUser}
              onChange={(e) => {
                setSelectedUser(e.target.value);
                setError(null);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Mover para:</p>
            {allowedTransitions.map((stage) => {
              const config = WORKFLOW_STAGES[stage];
              return (
                <button
                  key={stage}
                  onClick={() => handleTransition(stage)}
                  disabled={loading}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium border transition-colors ${config.bgLight} ${config.textColor} ${config.borderColor} hover:opacity-80 disabled:opacity-50`}
                >
                  <span className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    {config.label}
                  </span>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                </button>
              );
            })}
          </div>
        </>
      )}

      {allowedTransitions.length === 0 && (
        <p className="text-sm text-gray-500 italic">
          Nenhuma transicao disponivel para esta etapa.
        </p>
      )}

      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
