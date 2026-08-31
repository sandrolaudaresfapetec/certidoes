"use client";

import { useState } from "react";
import { RequisicaoForm } from "@/components/requisicao-form";

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
}

/** Nova Requisição pelo Atendimento: escolhe o cliente e abre o formulário CJT. */
export function NovaRequisicaoAtendimento({
  clientes,
  clienteInicialId,
}: {
  clientes: Cliente[];
  clienteInicialId?: string;
}) {
  const [clienteId, setClienteId] = useState(clienteInicialId ?? "");
  const cliente = clientes.find((c) => c.id === clienteId) ?? null;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label htmlFor="req-cliente" className="block text-sm font-medium text-gray-900 mb-1">
          Cliente *
        </label>
        <select
          id="req-cliente"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">Selecione o cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} — {c.cpf}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Cliente não cadastrado? Cadastre em “Cadastro de Cliente”.
        </p>
      </div>

      {cliente && (
        <RequisicaoForm
          key={cliente.id}
          cpf={cliente.cpf}
          criarEndpoint="/api/requisicoes"
          documentosEndpoint="/api/requisicoes/documentos"
          payloadExtra={{ solicitanteId: cliente.id }}
          painelHref="/requisicoes"
          painelLabel="Ver requisições"
        />
      )}
    </div>
  );
}
