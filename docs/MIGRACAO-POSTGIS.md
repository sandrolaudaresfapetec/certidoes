# Migração SQLite → PostgreSQL/PostGIS (módulo de geometria)

Status: **implementado (Fase 2)** — tudo pronto no código; falta apenas executar no Fly.io.

## O que já está pronto neste repositório

| Artefato | Descrição |
| --- | --- |
| `prisma-postgres/schema.prisma` | Schema com `provider = "postgresql"` |
| `prisma-postgres/migrations/` | Todas as migrations convertidas para dialeto Postgres (TIMESTAMP, DOUBLE PRECISION) |
| `prisma-postgres/migrations/9999_postgis_geometry/` | Colunas `geometry(Geometry, 4326)` + índices GIST em `LinhaDivisa` e `CorteDivisa` |
| `prisma.config.postgres.ts` | Config Prisma de produção (`migrate deploy --config prisma.config.postgres.ts`) |
| `src/lib/prisma.ts` | **Adapter dual**: SQLite em dev, Postgres quando `DATABASE_URL` começa com `postgres` |
| `scripts/sqlite-to-postgres.ts` | Migração de dados (idempotente, `ON CONFLICT DO NOTHING`) |
| `Dockerfile` / `docker-entrypoint.js` / `fly.toml` | **Litestream removido**; volume `/data` removido |

## Passo a passo no Fly.io (uma única vez)

```bash
# 1. Provisionar Postgres com PostGIS
fly postgres create --name certidoes-postgis --image-ref postgis/postgis:16-3.4 --region iad

# 2. Habilitar a extensão PostGIS
fly postgres connect -a certidoes-postgis
#   CREATE EXTENSION IF NOT EXISTS postgis;
#   \q

# 3. Ligar o banco à app (injeta DATABASE_URL como secret)
fly postgres attach certidoes-postgis -a certidoes

# 4. Aplicar as migrations Postgres ANTES do deploy com dados
fly proxy 15432:5432 -a certidoes-postgis &
DATABASE_URL="postgresql://postgres:<senha>@localhost:15432/certidoes" \
  npx prisma migrate deploy --config prisma.config.postgres.ts

# 5. Migrar os dados do SQLite atual (baixe o dev.db do volume ou da réplica Litestream)
DATABASE_URL="postgresql://postgres:<senha>@localhost:15432/certidoes" \
  npx tsx scripts/sqlite-to-postgres.ts

# 6. Deploy (entrypoint roda `migrate deploy` automaticamente)
fly deploy
```

## Notas
- **Dev local continua em SQLite** — nada muda para quem desenvolve (`npm run dev`).
- Os **cortes de divisa continuam em Turf.js** (Node); as colunas PostGIS habilitam consultas
  espaciais no banco (ST_Intersects/ST_Intersection/ST_Area) e o futuro atlas por expediente.
- Se a Fase 3 mover o corte para SQL espacial, basta substituir o corpo de `src/lib/geometria.ts`
  por queries `$queryRaw` com `ST_Split`/`ST_Union` — a API REST permanece igual.
