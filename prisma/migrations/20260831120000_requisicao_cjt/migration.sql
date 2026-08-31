-- Formulario orientado CJT (Especificacao Funcional v1.0), origem da
-- requisicao (portal/atendimento) e finalizacao com pagamento.
ALTER TABLE "Solicitacao" ADD COLUMN "cjtQualidade" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN "cjtResultado" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN "cjtSituacao" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN "cjtPropriedadeDe" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN "cjtMatricula" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN "cjtQtdPoligonos" INTEGER;
ALTER TABLE "Solicitacao" ADD COLUMN "cjtNomesPoligonos" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN "cjtCodigoIncra" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'PORTAL';
ALTER TABLE "Solicitacao" ADD COLUMN "abertaPorUserId" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN "pagamentoStatus" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN "pagamentoValor" REAL;
ALTER TABLE "Solicitacao" ADD COLUMN "pagamentoEm" DATETIME;
ALTER TABLE "Solicitacao" ADD COLUMN "pagamentoObs" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN "finalizadaEm" DATETIME;
ALTER TABLE "Solicitacao" ADD COLUMN "cjtDeclaracaoAceita" BOOLEAN NOT NULL DEFAULT false;
