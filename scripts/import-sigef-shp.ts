/**
 * Importa manualmente o shapefile de parcelas certificadas do SIGEF (Acervo
 * Fundiario do INCRA, ex.: "Sigef Brasil_SP.zip") para a tabela SigefParcela.
 *
 * Uso:  npx tsx scripts/import-sigef-shp.ts <arquivo.shp|arquivo.zip> [UF]
 *
 * Usa a mesma rotina da sincronizacao diaria (src/lib/sigef-sync.ts): grava so
 * as parcelas novas/alteradas e remove as que nao estao mais no arquivo. Serve
 * para carregar um ambiente a partir de um zip baixado a mao (o INCRA so
 * responde a IPs no Brasil); em producao o processo `sigef_sync` faz isso
 * sozinho todos os dias.
 */
import { prisma } from "../src/lib/prisma";
import { sincronizarAcervo } from "../src/lib/sigef-sync";

async function main() {
  const arquivo = process.argv[2];
  if (!arquivo) {
    throw new Error("Uso: npx tsx scripts/import-sigef-shp.ts <arquivo.shp|arquivo.zip> [UF]");
  }
  const r = await sincronizarAcervo({ arquivo, uf: process.argv[3] });
  if (r.status === "ERRO") process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
