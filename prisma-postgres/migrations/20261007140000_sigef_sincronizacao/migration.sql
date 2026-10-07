ALTER TABLE "SigefParcela" ADD COLUMN IF NOT EXISTS "assinatura" TEXT;

CREATE TABLE IF NOT EXISTS "SigefSincronizacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uf" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fonteUrl" TEXT NOT NULL,
    "fonteEtag" TEXT,
    "fonteModificadoEm" TIMESTAMP(3),
    "lidas" INTEGER NOT NULL DEFAULT 0,
    "inseridas" INTEGER NOT NULL DEFAULT 0,
    "atualizadas" INTEGER NOT NULL DEFAULT 0,
    "removidas" INTEGER NOT NULL DEFAULT 0,
    "mensagem" TEXT,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminadoEm" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "SigefSincronizacao_uf_iniciadoEm_idx" ON "SigefSincronizacao"("uf", "iniciadoEm");
