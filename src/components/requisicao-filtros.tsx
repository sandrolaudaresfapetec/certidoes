import { Search } from "lucide-react";
import { REQUISICAO_STATUS } from "@/lib/requisicao-status";

interface RequisicaoFiltrosProps {
  /** Rota que recebe os filtros por querystring (method GET). */
  action: string;
  q?: string;
  status?: string;
  /** Campo de busca adicional exibido apenas no atendimento. */
  placeholder?: string;
}

/** Filtros de requisições (busca textual + status), sem JavaScript no cliente. */
export function RequisicaoFiltros({
  action,
  q = "",
  status = "",
  placeholder = "Buscar por protocolo, imóvel ou município",
}: RequisicaoFiltrosProps) {
  return (
    <form
      action={action}
      method="get"
      className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-lg p-4"
    >
      <div className="flex-1 min-w-56">
        <label htmlFor="filtro-q" className="block text-xs font-medium text-gray-600 mb-1">
          Buscar
        </label>
        <input
          id="filtro-q"
          type="search"
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="filtro-status" className="block text-xs font-medium text-gray-600 mb-1">
          Situação
        </label>
        <select
          id="filtro-status"
          name="status"
          defaultValue={status}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">Todas</option>
          {Object.entries(REQUISICAO_STATUS).map(([codigo, info]) => (
            <option key={codigo} value={codigo}>
              {info.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
      >
        <Search className="h-4 w-4" />
        Filtrar
      </button>
    </form>
  );
}
