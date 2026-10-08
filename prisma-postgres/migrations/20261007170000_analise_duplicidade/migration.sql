-- Analise de duplicidade das requisicoes (#PEND-30) e execucoes agendadas.
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "analiseDuplicidadeEm" TIMESTAMP(3);
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "sobreposicao" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "sobreposicaoCom" TEXT;
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "arquivadaEm" TIMESTAMP(3);
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "arquivamentoMotivo" TEXT;

CREATE TABLE IF NOT EXISTS "ExecucaoAgendada" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "iniciadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidaEm" TIMESTAMP(3),
    "resumo" TEXT,
    CONSTRAINT "ExecucaoAgendada_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ExecucaoAgendada_chave_key" ON "ExecucaoAgendada"("chave");
CREATE INDEX IF NOT EXISTS "ExecucaoAgendada_tipo_iniciadaEm_idx" ON "ExecucaoAgendada"("tipo", "iniciadaEm");
