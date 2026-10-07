/**
 * Processo `sigef_sync` do Fly (fly.toml): sincroniza o acervo SIGEF todos os
 * dias no horario SIGEF_SYNC_HORA (padrao 02:00) do fuso SIGEF_SYNC_TZ
 * (padrao America/Sao_Paulo), quando ninguem esta usando o sistema.
 *
 * Variaveis: SIGEF_SYNC_UF (SP), SIGEF_SYNC_AO_INICIAR=1 roda tambem ao subir.
 */
import { sincronizarAcervo } from "../src/lib/sigef-sync";

const TZ = process.env.SIGEF_SYNC_TZ ?? "America/Sao_Paulo";
const HORA = process.env.SIGEF_SYNC_HORA ?? "02:00";
const MAX_ESPERA_MS = 60 * 60 * 1000;

const log = (m: string) => console.log(`${new Date().toISOString()} [sigef-sync] ${m}`);

function partesNoFuso(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const { type, value } of f.formatToParts(d)) {
    if (type !== "literal") p[type] = Number(value);
  }
  return p;
}

/** Instante UTC que corresponde a `ano-mes-dia hora:minuto` no fuso `tz`. */
function instanteNoFuso(ano: number, mes: number, dia: number, hora: number, minuto: number, tz: string): Date {
  let palpite = Date.UTC(ano, mes - 1, dia, hora, minuto, 0);
  for (let i = 0; i < 2; i++) {
    const p = partesNoFuso(new Date(palpite), tz);
    const comoUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    palpite += Date.UTC(ano, mes - 1, dia, hora, minuto, 0) - comoUtc;
  }
  return new Date(palpite);
}

export function proximaExecucao(agora: Date, hora = HORA, tz = TZ): Date {
  const [hh, mm] = hora.split(":").map(Number);
  const hoje = partesNoFuso(agora, tz);
  let alvo = instanteNoFuso(hoje.year, hoje.month, hoje.day, hh, mm, tz);
  if (alvo.getTime() <= agora.getTime()) {
    const amanha = new Date(Date.UTC(hoje.year, hoje.month - 1, hoje.day + 1));
    alvo = instanteNoFuso(amanha.getUTCFullYear(), amanha.getUTCMonth() + 1, amanha.getUTCDate(), hh, mm, tz);
  }
  return alvo;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function executar(motivo: string) {
  log(`Iniciando sincronizacao (${motivo})`);
  try {
    const r = await sincronizarAcervo({ log });
    log(`Fim: ${r.status} — ${r.inseridas} novas, ${r.atualizadas} alteradas, ${r.removidas} removidas (${r.lidas} lidas)`);
  } catch (e) {
    log(`Falha inesperada: ${(e as Error).message}`);
  }
}

async function main() {
  log(`Agendado todos os dias as ${HORA} (${TZ})`);
  if (process.env.SIGEF_SYNC_AO_INICIAR === "1") await executar("ao iniciar");
  for (;;) {
    const alvo = proximaExecucao(new Date());
    log(`Proxima execucao: ${alvo.toISOString()}`);
    while (Date.now() < alvo.getTime()) {
      await dormir(Math.min(alvo.getTime() - Date.now(), MAX_ESPERA_MS));
    }
    await executar("agendamento diario");
  }
}

if (require.main === module) main();
