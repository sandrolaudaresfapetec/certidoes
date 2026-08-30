-- Campos legados detectados automaticamente
ALTER TABLE "Process" ADD COLUMN "numeroSaidaIGC" TEXT;
ALTER TABLE "Process" ADD COLUMN "processes" TEXT;
ALTER TABLE "Process" ADD COLUMN "servicoTecCampo" DOUBLE PRECISION;
ALTER TABLE "Process" ADD COLUMN "servicoTecGabinete" DOUBLE PRECISION;
ALTER TABLE "Process" ADD COLUMN "taxaAbertura" DOUBLE PRECISION;
ALTER TABLE "Process" ADD COLUMN "taxaVistoria" DOUBLE PRECISION;
ALTER TABLE "Process" ADD COLUMN "total" TEXT;
ALTER TABLE "Process" ADD COLUMN "users" TEXT;
