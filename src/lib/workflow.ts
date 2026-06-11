export const WORKFLOW_STAGES = {
  entrada_sdtc: {
    label: "Entrada SDTC",
    description: "Registro inicial do processo no SDTC",
    order: 1,
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgLight: "bg-blue-50",
    borderColor: "border-blue-300",
  },
  distribuicao_gdat: {
    label: "Distribuicao GDAT",
    description: "Atribuicao ao tecnico responsavel",
    order: 2,
    color: "bg-indigo-500",
    textColor: "text-indigo-700",
    bgLight: "bg-indigo-50",
    borderColor: "border-indigo-300",
  },
  analise_tecnica: {
    label: "Analise Tecnica",
    description: "Trabalho de gabinete e campo pelo tecnico",
    order: 3,
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgLight: "bg-yellow-50",
    borderColor: "border-yellow-300",
  },
  conferencia: {
    label: "Conferencia",
    description: "Revisao tecnica por conferente",
    order: 4,
    color: "bg-orange-500",
    textColor: "text-orange-700",
    bgLight: "bg-orange-50",
    borderColor: "border-orange-300",
  },
  assinatura_tecnico: {
    label: "Assinatura Tecnico",
    description: "Aguardando assinatura do tecnico responsavel",
    order: 5,
    color: "bg-purple-500",
    textColor: "text-purple-700",
    bgLight: "bg-purple-50",
    borderColor: "border-purple-300",
  },
  assinatura_gerente: {
    label: "Assinatura Gerente",
    description: "Aguardando assinatura do gerente",
    order: 6,
    color: "bg-pink-500",
    textColor: "text-pink-700",
    bgLight: "bg-pink-50",
    borderColor: "border-pink-300",
  },
  assinatura_diretor: {
    label: "Assinatura Diretor",
    description: "Aguardando assinatura do diretor",
    order: 7,
    color: "bg-red-500",
    textColor: "text-red-700",
    bgLight: "bg-red-50",
    borderColor: "border-red-300",
  },
  upload_sei: {
    label: "Upload SEI",
    description: "Upload da certidao no sistema SEI",
    order: 8,
    color: "bg-teal-500",
    textColor: "text-teal-700",
    bgLight: "bg-teal-50",
    borderColor: "border-teal-300",
  },
  finalizado: {
    label: "Finalizado",
    description: "Processo concluido e certidao emitida",
    order: 9,
    color: "bg-green-500",
    textColor: "text-green-700",
    bgLight: "bg-green-50",
    borderColor: "border-green-300",
  },
  sobrestado: {
    label: "Sobrestado",
    description: "Processo suspenso temporariamente",
    order: 10,
    color: "bg-gray-500",
    textColor: "text-gray-700",
    bgLight: "bg-gray-50",
    borderColor: "border-gray-300",
  },
  cancelado: {
    label: "Cancelado",
    description: "Processo cancelado",
    order: 11,
    color: "bg-red-800",
    textColor: "text-red-900",
    bgLight: "bg-red-50",
    borderColor: "border-red-300",
  },
} as const;

export type WorkflowStage = keyof typeof WORKFLOW_STAGES;

export const ACTIVE_WORKFLOW_STAGES: WorkflowStage[] = [
  "entrada_sdtc",
  "distribuicao_gdat",
  "analise_tecnica",
  "conferencia",
  "assinatura_tecnico",
  "assinatura_gerente",
  "assinatura_diretor",
  "upload_sei",
  "finalizado",
];

export const KANBAN_STAGES: WorkflowStage[] = [
  "entrada_sdtc",
  "distribuicao_gdat",
  "analise_tecnica",
  "conferencia",
  "assinatura_tecnico",
  "assinatura_gerente",
  "assinatura_diretor",
  "upload_sei",
];

export const ALLOWED_TRANSITIONS: Record<WorkflowStage, WorkflowStage[]> = {
  entrada_sdtc: ["distribuicao_gdat", "cancelado"],
  distribuicao_gdat: ["analise_tecnica", "sobrestado", "cancelado"],
  analise_tecnica: ["conferencia", "sobrestado", "cancelado"],
  conferencia: ["assinatura_tecnico", "analise_tecnica", "sobrestado", "cancelado"],
  assinatura_tecnico: ["assinatura_gerente", "conferencia", "sobrestado"],
  assinatura_gerente: ["assinatura_diretor", "assinatura_tecnico", "sobrestado"],
  assinatura_diretor: ["upload_sei", "assinatura_gerente"],
  upload_sei: ["finalizado"],
  finalizado: [],
  sobrestado: [
    "distribuicao_gdat",
    "analise_tecnica",
    "conferencia",
    "cancelado",
  ],
  cancelado: [],
};

export const SERVICE_TYPES = [
  "Certidao",
  "Drenagem",
  "Parecer",
  "Tracado de Divisa em Planta",
  "Informacao Tecnica",
] as const;

export const CLIENT_TYPES = [
  "Comum-CPF",
  "Comum-CNPJ",
  "Orgao-Publico",
  "Justica",
  "idoso",
] as const;

export const DEPARTMENTS = ["CATDT", "CG", "SDTC"] as const;

export const BASES = ["10k", "50k", "MDT 2023", "Ortomosaico 2010"] as const;

export const CANCELLATION_REASONS = [
  "Duplicidade de entrada",
  "A pedido do cliente",
  "Atribuicao erronea ao IGC",
  "Cliente nao responde",
  "Problemas no SEI",
] as const;

export const NOTIFICATION_TYPES = {
  NOVA_ENTRADA: {
    label: "Nova Entrada",
    description: "Novo processo registrado no sistema",
  },
  ATRIBUICAO: {
    label: "Atribuicao",
    description: "Processo atribuido a voce",
  },
  AGUARDANDO_CLIENTE: {
    label: "Aguardando Cliente",
    description: "Aguardando resposta do cliente",
  },
  ANALISE_COMPLETA: {
    label: "Analise Completa",
    description: "Analise tecnica finalizada",
  },
  CONFERENCIA_COMPLETA: {
    label: "Conferencia Completa",
    description: "Conferencia tecnica finalizada",
  },
  ASSINATURA_PENDENTE: {
    label: "Assinatura Pendente",
    description: "Sua assinatura e necessaria",
  },
  PROCESSO_CONCLUIDO: {
    label: "Processo Concluido",
    description: "Processo finalizado com sucesso",
  },
  PRAZO_VENCIDO: {
    label: "Prazo Vencido",
    description: "Prazo do processo ultrapassado",
  },
  TRANSICAO: {
    label: "Transicao de Etapa",
    description: "Processo movido para nova etapa",
  },
} as const;
