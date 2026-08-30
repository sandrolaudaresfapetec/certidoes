-- Integração SIGEF/INCRA: dados da propriedade do solicitante

ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "sigefCodigoImovel" TEXT;
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "sigefParcelaCodigo" TEXT;
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "sigefAreaHectares" DOUBLE PRECISION;
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "sigefMunicipio" TEXT;
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "sigefUf" TEXT;
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "sigefStatus" TEXT;
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "sigefOrigem" TEXT;
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "sigefConsultadoEm" TIMESTAMP(3);

CREATE TABLE "SigefConsulta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cpfCnpj" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "sucesso" BOOLEAN NOT NULL DEFAULT true,
    "mensagem" TEXT,
    "payload" TEXT,
    "processId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SigefConsulta_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "SigefConsulta_processId_idx" ON "SigefConsulta"("processId");
CREATE INDEX "SigefConsulta_cpfCnpj_idx" ON "SigefConsulta"("cpfCnpj");
