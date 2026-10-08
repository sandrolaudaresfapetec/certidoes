import { prisma } from "@/lib/prisma";
import { executarAnalise } from "@/lib/duplicidade-servidor";
import type { ResumoAnalise } from "@/lib/duplicidade-resumo";

/**
 * Agendador da análise de duplicidade (#PEND-30), dentro do app: às 12:00 e às 00:00 de
 * Brasília. Idempotência por horário: cada horário vira uma linha única em `ExecucaoAgendada`
 * (`duplicidade:2026-10-07T12`) e só quem a gravar executa. Duas instâncias, um deploy no meio
 * ou um agendador externo chamando junto nunca rodam o mesmo horário duas vezes.
 */

export const TIPO_DUPLICIDADE = "duplicidade";
export const FUSO = "America/Sao_Paulo";
/** Execução iniciada e nunca concluída há mais que isto é considerada travada e retomada. */
export const TEMPO_LIMITE_EXECUCAO_MS = 30 * 60 * 1000;

function partesNoFuso(agora: Date): { ano: string; mes: string; dia: string; hora: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);
  const pega = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return { ano: pega("year"), mes: pega("month"), dia: pega("day"), hora: Number(pega("hour")) };
}

/** Horário (slot) a que `agora` pertence: 00 ou 12 do dia, em Brasília. */
export function slotDe(agora: Date): string {
  const { ano, mes, dia, hora } = partesNoFuso(agora);
  return `${ano}-${mes}-${dia}T${hora >= 12 ? "12" : "00"}`;
}

export function chaveDoSlot(slot: string): string {
  return `${TIPO_DUPLICIDADE}:${slot}`;
}

/** Próximo horário de execução (12:00 ou 00:00 de Brasília), para mostrar na tela. */
export function proximoHorario(agora: Date): { hora: "00:00" | "12:00"; quando: "hoje" | "amanhã" } {
  const { hora } = partesNoFuso(agora);
  if (hora < 12) return { hora: "12:00", quando: "hoje" };
  return { hora: "00:00", quando: "amanhã" };
}

function violouUnicidade(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

export type ResultadoSlot =
  | { executou: true; slot: string; resumo: ResumoAnalise }
  | { executou: false; slot: string; motivo: "JA_EXECUTADO" | "EM_EXECUCAO" };

/**
 * Executa o horário atual se ainda não foi executado. Seguro de chamar a qualquer momento
 * e por qualquer número de processos: quem perde a disputa pelo horário só devolve o motivo.
 */
export async function executarSlot(agora: Date = new Date()): Promise<ResultadoSlot> {
  const slot = slotDe(agora);
  const chave = chaveDoSlot(slot);

  const existente = await prisma.execucaoAgendada.findUnique({ where: { chave } });
  let id: string;
  if (existente) {
    if (existente.concluidaEm) return { executou: false, slot, motivo: "JA_EXECUTADO" };
    if (agora.getTime() - existente.iniciadaEm.getTime() < TEMPO_LIMITE_EXECUCAO_MS) {
      return { executou: false, slot, motivo: "EM_EXECUCAO" };
    }
    // Travada: retoma só quem trocar o `iniciadaEm` antigo pelo novo (comparar e trocar).
    const retomada = await prisma.execucaoAgendada.updateMany({
      where: { id: existente.id, concluidaEm: null, iniciadaEm: existente.iniciadaEm },
      data: { iniciadaEm: agora },
    });
    if (retomada.count === 0) return { executou: false, slot, motivo: "EM_EXECUCAO" };
    id = existente.id;
  } else {
    try {
      id = (await prisma.execucaoAgendada.create({ data: { chave, tipo: TIPO_DUPLICIDADE, iniciadaEm: agora } })).id;
    } catch (e) {
      if (violouUnicidade(e)) return { executou: false, slot, motivo: "EM_EXECUCAO" };
      throw e;
    }
  }

  // Se a análise falhar a linha fica sem `concluidaEm` e o horário é retomado depois.
  const resumo = await executarAnalise();
  await prisma.execucaoAgendada.update({
    where: { id },
    data: { concluidaEm: new Date(), resumo: JSON.stringify(resumo) },
  });
  return { executou: true, slot, resumo };
}

/**
 * "Rodar análise agora" (ADMIN): fora do calendário, mas registrada como as demais para a tela
 * mostrar a última execução. A chave é única por chamada; quem garante que nada é analisado
 * duas vezes é a reserva de cada requisição, não o horário.
 */
export async function executarManual(agora: Date = new Date()): Promise<ResumoAnalise> {
  const chave = `${TIPO_DUPLICIDADE}:manual:${agora.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  const { id } = await prisma.execucaoAgendada.create({ data: { chave, tipo: TIPO_DUPLICIDADE, iniciadaEm: agora } });
  const resumo = await executarAnalise();
  await prisma.execucaoAgendada.update({
    where: { id },
    data: { concluidaEm: new Date(), resumo: JSON.stringify(resumo) },
  });
  return resumo;
}

export interface UltimaExecucao {
  slot: string;
  iniciadaEm: Date;
  concluidaEm: Date | null;
  resumo: ResumoAnalise | null;
}

export async function ultimaExecucao(): Promise<UltimaExecucao | null> {
  const linha = await prisma.execucaoAgendada.findFirst({
    where: { tipo: TIPO_DUPLICIDADE, concluidaEm: { not: null } },
    orderBy: { iniciadaEm: "desc" },
  });
  if (!linha) return null;
  let resumo: ResumoAnalise | null = null;
  try {
    resumo = linha.resumo ? (JSON.parse(linha.resumo) as ResumoAnalise) : null;
  } catch {
    resumo = null;
  }
  return {
    slot: linha.chave.slice(TIPO_DUPLICIDADE.length + 1),
    iniciadaEm: linha.iniciadaEm,
    concluidaEm: linha.concluidaEm,
    resumo,
  };
}
