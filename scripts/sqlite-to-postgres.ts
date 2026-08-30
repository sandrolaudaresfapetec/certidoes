/**
 * Migracao unica de dados: SQLite (dev.db) -> PostgreSQL/PostGIS (Fly.io)
 * Uso:  npx tsx scripts/sqlite-to-postgres.ts
 * Pre-requisitos:
 *   1. DATABASE_URL apontando para o Postgres do Fly (fly proxy 5432 -a certidoes-postgis)
 *   2. Migrations postgres ja aplicadas (prisma migrate deploy --config prisma.config.postgres.ts)
 * O script e idempotente por tabela: pula registros cujo id ja existe no destino.
 */
import Database from "better-sqlite3";
import { Client } from "pg";
import path from "path";

const sqlite = new Database(path.resolve(process.cwd(), "prisma/dev.db"), { readonly: true });
const pg = new Client({ connectionString: process.env.DATABASE_URL });

// Colunas de data por tabela (conversao SQLite -> TIMESTAMP)
const DATE_COLS: Record<string, string[]> = {
  Process: ["dtAbertoSei","dtCompile","dtNascimentoIdoso","dtEmail","dtVisita1","dtVisita2","dtConf","dtAssTecnico","dtAssGerente","dtAssDiretor","dtSaida","dtInicioSobrestado","dtFimSobrestado","dtCancelado","dtUpadoSei","sigefConsultadoEm","createdAt","updatedAt"],
  User: ["createdAt","updatedAt"],
  Notification: ["createdAt"],
  WorkflowAction: ["createdAt"],
  SigefConsulta: ["createdAt"],
  Solicitante: ["createdAt","updatedAt"],
  Solicitacao: ["createdAt","updatedAt"],
  Documento: ["createdAt"],
  LinhaDivisa: ["dataValidacao","createdAt"],
  CorteDivisa: ["dataCorte"],
};
const BOOL_COLS: Record<string, string[]> = {
  User: ["active"], Notification: ["read"], SigefConsulta: ["sucesso"],
  Solicitante: ["cadastroCompleto"], Solicitacao: ["tipoViaSigef"],
};
const TABLES = ["User","Process","Notification","WorkflowAction","SigefConsulta","Solicitante","Solicitacao","Documento","LinhaDivisa","CorteDivisa"];

function toDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return new Date(v); // epoch ms (SQLite/Prisma)
  const d = new Date(String(v).replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  await pg.connect();
  for (const table of TABLES) {
    const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];
    if (rows.length === 0) { console.log(`- ${table}: vazia`); continue; }
    let inseridos = 0;
    for (const row of rows) {
      const cols = Object.keys(row);
      const values = cols.map((c) => {
        const v = row[c];
        if (BOOL_COLS[table]?.includes(c)) return v === 1 || v === true;
        if (DATE_COLS[table]?.includes(c)) return toDate(v);
        return v;
      });
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(",");
      try {
        await pg.query(
          `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
          values
        );
        inseridos++;
      } catch (e) {
        console.error(`  erro em ${table} id=${row.id}:`, (e as Error).message);
      }
    }
    console.log(`✓ ${table}: ${inseridos}/${rows.length} registros migrados`);
  }
  await pg.end();
  console.log("Migracao concluida.");
}
main().catch((e) => { console.error(e); process.exit(1); });
