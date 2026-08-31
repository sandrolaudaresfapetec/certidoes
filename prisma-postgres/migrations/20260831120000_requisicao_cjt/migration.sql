-- Formulario orientado CJT (Especificacao Funcional v1.0), origem da
-- requisicao (portal/atendimento) e finalizacao com pagamento.
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "cjtQualidade" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "cjtResultado" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "cjtSituacao" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "cjtPropriedadeDe" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "cjtMatricula" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "cjtQtdPoligonos" INTEGER;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "cjtNomesPoligonos" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "cjtCodigoIncra" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "origem" TEXT NOT NULL DEFAULT 'PORTAL';
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "abertaPorUserId" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "pagamentoStatus" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "pagamentoValor" DOUBLE PRECISION;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "pagamentoEm" TIMESTAMP(3);
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "pagamentoObs" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "finalizadaEm" TIMESTAMP(3);
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "cjtDeclaracaoAceita" BOOLEAN NOT NULL DEFAULT false;
