-- Pedido de arquivamento pelo solicitante (#PEND-29).
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "arquivamentoSolicitadoEm" TIMESTAMP(3);
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "arquivamentoStatusAnterior" TEXT;
