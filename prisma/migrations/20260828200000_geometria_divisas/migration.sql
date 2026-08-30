CREATE TABLE "LinhaDivisa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL,
    "geometria" TEXT NOT NULL,
    "bancoOrigem" TEXT NOT NULL,
    "dataValidacao" DATETIME NOT NULL,
    "municipios" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "LinhaDivisa_codigo_key" ON "LinhaDivisa"("codigo");

CREATE TABLE "CorteDivisa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classificacao" TEXT NOT NULL,
    "geometriaImovel" TEXT NOT NULL,
    "resultadoJson" TEXT NOT NULL,
    "dataCorte" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processId" TEXT,
    "linhaDivisaId" TEXT,
    CONSTRAINT "CorteDivisa_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CorteDivisa_linhaDivisaId_fkey" FOREIGN KEY ("linhaDivisaId") REFERENCES "LinhaDivisa" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "CorteDivisa_processId_idx" ON "CorteDivisa"("processId");
CREATE INDEX "CorteDivisa_dataCorte_idx" ON "CorteDivisa"("dataCorte");
