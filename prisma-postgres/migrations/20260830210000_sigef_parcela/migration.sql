CREATE TABLE IF NOT EXISTS "SigefParcela" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigoParcela" TEXT NOT NULL,
    "nomeArea" TEXT,
    "codigoImovel" TEXT,
    "municipioIbge" INTEGER,
    "municipio" TEXT,
    "uf" TEXT NOT NULL,
    "areaHa" DOUBLE PRECISION,
    "situacaoImovel" TEXT,
    "status" TEXT,
    "rt" TEXT,
    "art" TEXT,
    "matricula" TEXT,
    "dataSubmissao" TIMESTAMP(3),
    "dataAprovacao" TIMESTAMP(3),
    "geometria" TEXT NOT NULL,
    "minLon" DOUBLE PRECISION NOT NULL,
    "minLat" DOUBLE PRECISION NOT NULL,
    "maxLon" DOUBLE PRECISION NOT NULL,
    "maxLat" DOUBLE PRECISION NOT NULL,
    "fonte" TEXT NOT NULL,
    "importadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "SigefParcela_codigoParcela_key" ON "SigefParcela"("codigoParcela");
CREATE INDEX IF NOT EXISTS "SigefParcela_uf_minLon_maxLon_idx" ON "SigefParcela"("uf", "minLon", "maxLon");
CREATE INDEX IF NOT EXISTS "SigefParcela_uf_minLat_maxLat_idx" ON "SigefParcela"("uf", "minLat", "maxLat");
CREATE INDEX IF NOT EXISTS "SigefParcela_municipioIbge_idx" ON "SigefParcela"("municipioIbge");
