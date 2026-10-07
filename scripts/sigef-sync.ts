/**
 * Sincroniza a tabela SigefParcela com o acervo SIGEF do INCRA uma unica vez.
 *
 * Uso:  npx tsx scripts/sigef-sync.ts [--forcar] [--uf SP]
 *
 * Baixa "Sigef Brasil_<UF>.zip" (so responde a IPs no Brasil: rode na regiao
 * `gru` do Fly), grava apenas as parcelas novas/alteradas e remove as que
 * sairam do acervo. A execucao agendada fica em scripts/sigef-scheduler.ts.
 */
import { prisma } from "../src/lib/prisma";
import { sincronizarAcervo } from "../src/lib/sigef-sync";

async function main() {
  const args = process.argv.slice(2);
  const forcar = args.includes("--forcar");
  const iUf = args.indexOf("--uf");
  const uf = iUf >= 0 ? args[iUf + 1] : undefined;
  const r = await sincronizarAcervo({ uf, forcar });
  if (r.status === "ERRO") process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
