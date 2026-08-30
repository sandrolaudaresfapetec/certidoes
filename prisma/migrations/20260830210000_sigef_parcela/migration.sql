CREATE TABLE "SigefParcela" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigoParcela" TEXT NOT NULL,
    "nomeArea" TEXT,
    "codigoImovel" TEXT,
    "municipioIbge" INTEGER,
    "municipio" TEXT,
    "uf" TEXT NOT NULL,
    "areaHa" REAL,
    "situacaoImovel" TEXT,
    "status" TEXT,
    "rt" TEXT,
    "art" TEXT,
    "matricula" TEXT,
    "dataSubmissao" DATETIME,
    "dataAprovacao" DATETIME,
    "geometria" TEXT NOT NULL,
    "minLon" REAL NOT NULL,
    "minLat" REAL NOT NULL,
    "maxLon" REAL NOT NULL,
    "maxLat" REAL NOT NULL,
    "fonte" TEXT NOT NULL,
    "importadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "SigefParcela_codigoParcela_key" ON "SigefParcela"("codigoParcela");
CREATE INDEX "SigefParcela_uf_minLon_maxLon_idx" ON "SigefParcela"("uf", "minLon", "maxLon");
CREATE INDEX "SigefParcela_uf_minLat_maxLat_idx" ON "SigefParcela"("uf", "minLat", "maxLat");
CREATE INDEX "SigefParcela_municipioIbge_idx" ON "SigefParcela"("municipioIbge");
