-- Chat da solicitacao (#PEND-25): mensagens entre solicitante e DDD e marcas de leitura.
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "chatLidoSolicitanteEm" TIMESTAMP(3);
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "chatLidoAtendimentoEm" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "MensagemSolicitacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "autorTipo" TEXT NOT NULL,
    "autorUserId" TEXT,
    "autorNome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'TEXTO',
    "texto" TEXT NOT NULL,
    "opcoes" TEXT,
    "respostaOpcao" TEXT,
    "respondidaEm" TIMESTAMP(3),
    "chave" TEXT,
    "solicitacaoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MensagemSolicitacao_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "Solicitacao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MensagemSolicitacao_solicitacaoId_chave_key" ON "MensagemSolicitacao"("solicitacaoId", "chave");
CREATE INDEX IF NOT EXISTS "MensagemSolicitacao_solicitacaoId_createdAt_idx" ON "MensagemSolicitacao"("solicitacaoId", "createdAt");
