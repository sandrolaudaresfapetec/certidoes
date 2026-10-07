-- Devolucao da requisicao ao solicitante (#PEND-26): motivo e data.
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "devolucaoMotivo" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "devolvidaEm" TIMESTAMP(3);
