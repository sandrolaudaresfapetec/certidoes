// Config Prisma para producao (PostgreSQL no Amazon RDS, apps no Fly.io).
// Uso: npx prisma migrate deploy --config prisma.config.postgres.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * DATABASE_URL e escrita para o node-postgres (runtime): `sslmode=verify-full&sslrootcert=<ca.pem>`.
 * O schema engine do `prisma migrate` entende outros nomes (`sslcert` = CA, `sslaccept=strict`),
 * entao a mesma URL e traduzida aqui.
 */
export function urlParaSchemaEngine(url: string | undefined): string | undefined {
  if (!url || !/^postgres(ql)?:/.test(url)) return url;
  const u = new URL(url);
  const ca = u.searchParams.get("sslrootcert");
  if (!ca) return url;
  u.searchParams.delete("sslrootcert");
  u.searchParams.set("sslmode", "require");
  u.searchParams.set("sslcert", ca);
  u.searchParams.set("sslaccept", "strict");
  return u.toString();
}

export default defineConfig({
  schema: "prisma-postgres/schema.prisma",
  migrations: {
    path: "prisma-postgres/migrations",
  },
  datasource: {
    url: urlParaSchemaEngine(process.env["DATABASE_URL"]),
  },
});
