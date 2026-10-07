-- Pedido com 13 ou mais poligonos: congelado ate a DDD liberar (#PEND-31).
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "congeladaEm" TIMESTAMP(3);
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "liberadaEm" TIMESTAMP(3);
