/**
 * Roda uma vez quando o servidor Next sobe. Liga o agendador da análise de duplicidade
 * (#PEND-30), só no runtime Node (o Edge não tem banco). `register` não pode demorar:
 * o agendador apenas arma os temporizadores.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { iniciarAgendador } = await import("./lib/agendador-processo");
  iniciarAgendador();
}
