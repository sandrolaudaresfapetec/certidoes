import { executarSlot } from "@/lib/agendador";

/**
 * Liga o agendador dentro do processo do servidor (chamado por `instrumentation.ts`).
 * A cada 5 minutos confere se o horário atual (00:00 ou 12:00 de Brasília) já rodou; se o
 * app estava parado na hora, roda assim que voltar. `AGENDADOR_DUPLICIDADE=off` desliga.
 */

const INTERVALO_MS = 5 * 60 * 1000;
const ATRASO_INICIAL_MS = 30 * 1000;

const global = globalThis as unknown as { __agendadorDuplicidade?: boolean };

async function tick() {
  try {
    const r = await executarSlot();
    if (r.executou) {
      console.log(`[agendador] duplicidade ${r.slot}:`, JSON.stringify(r.resumo));
    }
  } catch (e) {
    console.error("[agendador] falha na análise de duplicidade:", e);
  }
}

export function iniciarAgendador(): void {
  if (process.env.AGENDADOR_DUPLICIDADE === "off" || global.__agendadorDuplicidade) return;
  global.__agendadorDuplicidade = true;
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), INTERVALO_MS).unref();
  }, ATRASO_INICIAL_MS).unref();
}
