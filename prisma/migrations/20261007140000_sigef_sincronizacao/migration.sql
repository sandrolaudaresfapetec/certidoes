ALTER TABLE "SigefParcela" ADD COLUMN "assinatura" TEXT;

CREATE TABLE "SigefSincronizacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uf" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fonteUrl" TEXT NOT NULL,
    "fonteEtag" TEXT,
    "fonteModificadoEm" DATETIME,
    "lidas" INTEGER NOT NULL DEFAULT 0,
    "inseridas" INTEGER NOT NULL DEFAULT 0,
    "atualizadas" INTEGER NOT NULL DEFAULT 0,
    "removidas" INTEGER NOT NULL DEFAULT 0,
    "mensagem" TEXT,
    "iniciadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminadoEm" DATETIME
);
CREATE INDEX "SigefSincronizacao_uf_iniciadoEm_idx" ON "SigefSincronizacao"("uf", "iniciadoEm");
