-- Subetapa de checagem de documentos (#PEND-27) e nivel de complexidade 1 a 9 (#PEND-32).
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "docsConferidosEm" TIMESTAMP(3);
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "nivelComplexidade" INTEGER;
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "nivelComplexidadeEm" TIMESTAMP(3);
ALTER TABLE "LinhaDivisa" ADD COLUMN IF NOT EXISTS "finalizada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CorteDivisa" ADD COLUMN IF NOT EXISTS "nivelSugerido" INTEGER;
