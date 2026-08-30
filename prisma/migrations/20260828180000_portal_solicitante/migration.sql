-- Portal do Solicitante: cidadao autenticado via gov.br, solicitacoes e documentos

CREATE TABLE "Solicitante" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cpf" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "cadastroCompleto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Solicitante_cpf_key" ON "Solicitante"("cpf");

CREATE TABLE "Solicitacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "protocolo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "tipoViaSigef" BOOLEAN NOT NULL DEFAULT true,
    "sigefCodigoImovel" TEXT,
    "sigefParcelaCodigo" TEXT,
    "sigefNomeArea" TEXT,
    "sigefAreaHectares" REAL,
    "sigefMunicipio" TEXT,
    "sigefUf" TEXT,
    "sigefStatus" TEXT,
    "sigefOrigem" TEXT,
    "emNomeDeCpf" TEXT,
    "emNomeDeNome" TEXT,
    "observacao" TEXT,
    "solicitanteId" TEXT NOT NULL,
    "processId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Solicitacao_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Solicitante" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Solicitacao_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Solicitacao_protocolo_key" ON "Solicitacao"("protocolo");
CREATE UNIQUE INDEX "Solicitacao_processId_key" ON "Solicitacao"("processId");
CREATE INDEX "Solicitacao_solicitanteId_idx" ON "Solicitacao"("solicitanteId");

CREATE TABLE "Documento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "conteudoBase64" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Documento_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "Solicitacao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Documento_solicitacaoId_idx" ON "Documento"("solicitacaoId");
