/** Rotulos e cores dos status das requisicoes (portal, atendimento e backoffice). */
export const REQUISICAO_STATUS: Record<string, { label: string; classe: string }> = {
  PENDENTE: { label: "Pendente", classe: "bg-amber-100 text-amber-800" },
  EM_ANALISE: { label: "Em análise", classe: "bg-blue-100 text-blue-800" },
  APROVADA: { label: "Aprovada", classe: "bg-emerald-100 text-emerald-800" },
  DEVOLVIDA: { label: "Devolvida", classe: "bg-red-100 text-red-800" },
  CONCLUIDA: { label: "Concluída", classe: "bg-gray-200 text-gray-700" },
};

export function statusRequisicao(status: string): { label: string; classe: string } {
  return REQUISICAO_STATUS[status] ?? REQUISICAO_STATUS.PENDENTE;
}

export const PAGAMENTO_LABEL: Record<string, string> = {
  PENDENTE: "Pagamento pendente",
  PAGO: "Pago",
  ISENTO: "Isento",
};
