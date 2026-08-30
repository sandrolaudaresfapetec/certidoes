import { PrismaClient } from "@prisma/client";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Adapter dual conforme o ambiente:
 *  - Desenvolvimento local: SQLite (better-sqlite3) — zero config
 *  - Producao (Fly.io): PostgreSQL/PostGIS via DATABASE_URL do `fly postgres attach`
 * A deteccao e feita por NODE_ENV + presenca de DATABASE_URL postgres.
 */
function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const isPostgres = databaseUrl.startsWith("postgres");

  if (isPostgres) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require("@prisma/adapter-pg");
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
