-- Banco SQLite de desenvolvimento reconstruido a partir do schema (as migrations antigas duplicavam colunas, #PEND-18).
-- O banco de producao/staging e o PostgreSQL de prisma-postgres/migrations.
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT,
    "department" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Solicitante" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cpf" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "cadastroCompleto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
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
    "cjtQualidade" TEXT,
    "cjtResultado" TEXT,
    "cjtSituacao" TEXT,
    "cjtPropriedadeDe" TEXT,
    "cjtMatricula" TEXT,
    "cjtInformaMatricula" TEXT,
    "cjtQtdPoligonos" INTEGER,
    "cjtNomesPoligonos" TEXT,
    "cjtPoligonos" TEXT,
    "cjtCodigoIncra" TEXT,
    "cjtDeclaracaoAceita" BOOLEAN NOT NULL DEFAULT false,
    "origem" TEXT NOT NULL DEFAULT 'PORTAL',
    "abertaPorUserId" TEXT,
    "pagamentoStatus" TEXT,
    "pagamentoValor" REAL,
    "pagamentoEm" DATETIME,
    "pagamentoObs" TEXT,
    "finalizadaEm" DATETIME,
    "devolucaoMotivo" TEXT,
    "devolvidaEm" DATETIME,
    "congeladaEm" DATETIME,
    "liberadaEm" DATETIME,
    "docsConferidosEm" DATETIME,
    "analiseDuplicidadeEm" DATETIME,
    "sobreposicao" BOOLEAN NOT NULL DEFAULT false,
    "sobreposicaoCom" TEXT,
    "arquivadaEm" DATETIME,
    "arquivamentoMotivo" TEXT,
    "arquivamentoSolicitadoEm" DATETIME,
    "arquivamentoStatusAnterior" TEXT,
    "solicitanteId" TEXT NOT NULL,
    "processId" TEXT,
    "chatLidoSolicitanteEm" DATETIME,
    "chatLidoAtendimentoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Solicitacao_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Solicitante" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Solicitacao_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MensagemSolicitacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "autorTipo" TEXT NOT NULL,
    "autorUserId" TEXT,
    "autorNome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'TEXTO',
    "texto" TEXT NOT NULL,
    "opcoes" TEXT,
    "respostaOpcao" TEXT,
    "respondidaEm" DATETIME,
    "chave" TEXT,
    "solicitacaoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MensagemSolicitacao_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "Solicitacao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ordem" INTEGER NOT NULL,
    "anoEntrada" INTEGER NOT NULL,
    "tipoServico" TEXT NOT NULL,
    "expediente" TEXT,
    "dtAbertoSei" DATETIME,
    "dtCompile" DATETIME,
    "dtUpadoSei" DATETIME,
    "tipo" TEXT NOT NULL,
    "interessado" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "cpfCnpj" TEXT,
    "dtNascimentoIdoso" DATETIME,
    "idadeTrava" REAL,
    "pasta" TEXT,
    "utm" TEXT,
    "municipio" TEXT,
    "ra" TEXT,
    "dra" TEXT,
    "divisaDificuldade" TEXT,
    "nivelComplexidade" INTEGER,
    "nivelComplexidadeEm" DATETIME,
    "situacao" TEXT NOT NULL DEFAULT 'entrada_sdtc',
    "nivelPrioridade" TEXT,
    "statusEscritorio" TEXT,
    "observacaoEntrada" TEXT,
    "diasTranscorridos" INTEGER NOT NULL DEFAULT 0,
    "tecnicoRespId" TEXT,
    "quemVaiAssinar" TEXT,
    "dtEmail" DATETIME,
    "dtVisita1" DATETIME,
    "dtVisita2" DATETIME,
    "tecnicoConfId" TEXT,
    "dtConf" DATETIME,
    "dtAssTecnico" DATETIME,
    "dtAssGerente" DATETIME,
    "dtAssDiretor" DATETIME,
    "dtSaida" DATETIME,
    "formaSaida" TEXT,
    "diasTotais" INTEGER,
    "dtInicioSobrestado" DATETIME,
    "dtFimSobrestado" DATETIME,
    "dtCancelado" DATETIME,
    "stGabineteP1" REAL,
    "stGabineteP2" REAL,
    "stCampo" REAL,
    "observacoesTecnico" TEXT,
    "base" TEXT,
    "departamento" TEXT,
    "sigefCodigoImovel" TEXT,
    "sigefParcelaCodigo" TEXT,
    "sigefAreaHectares" REAL,
    "sigefMunicipio" TEXT,
    "sigefUf" TEXT,
    "sigefStatus" TEXT,
    "sigefOrigem" TEXT,
    "sigefConsultadoEm" DATETIME,
    "numeroSaidaIGC" TEXT,
    "servicoTecCampo" REAL,
    "servicoTecGabinete" REAL,
    "taxaAbertura" REAL,
    "taxaVistoria" REAL,
    "total" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "criadoPorId" TEXT,
    CONSTRAINT "Process_tecnicoRespId_fkey" FOREIGN KEY ("tecnicoRespId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Process_tecnicoConfId_fkey" FOREIGN KEY ("tecnicoConfId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Process_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SigefConsulta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cpfCnpj" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "sucesso" BOOLEAN NOT NULL DEFAULT true,
    "mensagem" TEXT,
    "payload" TEXT,
    "processId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SigefConsulta_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "processId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "acao" TEXT,
    "action" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "deEtapa" TEXT,
    "paraEtapa" TEXT,
    "observacao" TEXT,
    "processId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowAction_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkflowAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LinhaDivisa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL,
    "finalizada" BOOLEAN NOT NULL DEFAULT false,
    "geometria" TEXT NOT NULL,
    "bancoOrigem" TEXT NOT NULL,
    "dataValidacao" DATETIME NOT NULL,
    "municipios" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CorteDivisa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classificacao" TEXT NOT NULL,
    "nivelSugerido" INTEGER,
    "geometriaImovel" TEXT NOT NULL,
    "resultadoJson" TEXT NOT NULL,
    "dataCorte" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processId" TEXT,
    "linhaDivisaId" TEXT,
    CONSTRAINT "CorteDivisa_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CorteDivisa_linhaDivisaId_fkey" FOREIGN KEY ("linhaDivisaId") REFERENCES "LinhaDivisa" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SigefParcela" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigoParcela" TEXT NOT NULL,
    "nomeArea" TEXT,
    "codigoImovel" TEXT,
    "municipioIbge" INTEGER,
    "municipio" TEXT,
    "uf" TEXT NOT NULL,
    "areaHa" REAL,
    "situacaoImovel" TEXT,
    "status" TEXT,
    "rt" TEXT,
    "art" TEXT,
    "matricula" TEXT,
    "dataSubmissao" DATETIME,
    "dataAprovacao" DATETIME,
    "geometria" TEXT NOT NULL,
    "minLon" REAL NOT NULL,
    "minLat" REAL NOT NULL,
    "maxLon" REAL NOT NULL,
    "maxLat" REAL NOT NULL,
    "fonte" TEXT NOT NULL,
    "assinatura" TEXT,
    "importadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ExecucaoAgendada" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chave" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "iniciadaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidaEm" DATETIME,
    "resumo" TEXT
);

-- CreateTable
CREATE TABLE "SigefSincronizacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uf" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fonteUrl" TEXT NOT NULL,
    "fonteEtag" TEXT,
    "fonteModificadoEm" DATETIME,
    "lidas" INTEGER NOT NULL DEFAULT 0,
    "inseridas" INTEGER NOT NULL DEFAULT 0,
    "atualizadas" INTEGER NOT NULL DEFAULT 0,
    "removidas" INTEGER NOT NULL DEFAULT 0,
    "mensagem" TEXT,
    "iniciadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminadoEm" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Solicitante_cpf_key" ON "Solicitante"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Solicitacao_protocolo_key" ON "Solicitacao"("protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "Solicitacao_processId_key" ON "Solicitacao"("processId");

-- CreateIndex
CREATE INDEX "MensagemSolicitacao_solicitacaoId_createdAt_idx" ON "MensagemSolicitacao"("solicitacaoId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MensagemSolicitacao_solicitacaoId_chave_key" ON "MensagemSolicitacao"("solicitacaoId", "chave");

-- CreateIndex
CREATE UNIQUE INDEX "Process_ordem_key" ON "Process"("ordem");

-- CreateIndex
CREATE UNIQUE INDEX "LinhaDivisa_codigo_key" ON "LinhaDivisa"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "SigefParcela_codigoParcela_key" ON "SigefParcela"("codigoParcela");

-- CreateIndex
CREATE INDEX "SigefParcela_uf_minLon_maxLon_idx" ON "SigefParcela"("uf", "minLon", "maxLon");

-- CreateIndex
CREATE INDEX "SigefParcela_uf_minLat_maxLat_idx" ON "SigefParcela"("uf", "minLat", "maxLat");

-- CreateIndex
CREATE INDEX "SigefParcela_municipioIbge_idx" ON "SigefParcela"("municipioIbge");

-- CreateIndex
CREATE UNIQUE INDEX "ExecucaoAgendada_chave_key" ON "ExecucaoAgendada"("chave");

-- CreateIndex
CREATE INDEX "ExecucaoAgendada_tipo_iniciadaEm_idx" ON "ExecucaoAgendada"("tipo", "iniciadaEm");

-- CreateIndex
CREATE INDEX "SigefSincronizacao_uf_iniciadoEm_idx" ON "SigefSincronizacao"("uf", "iniciadoEm");

