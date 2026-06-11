-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
    "situacao" TEXT NOT NULL DEFAULT 'entrada_sdtc',
    "nivelPrioridade" TEXT,
    "statusEscritorio" TEXT,
    "observacaoEntrada" TEXT,
    "diasTranscorridos" INTEGER NOT NULL DEFAULT 0,
    "tecnicoRespId" TEXT,
    "quemVaiAssinar" TEXT,
    "dtEmail" DATETIME,
    "dtVisita1" DATETIME,
    "observacoesTecnico" TEXT,
    "tecnicoConfId" TEXT,
    "observacoesConferencia" TEXT,
    "dtConf" DATETIME,
    "numeroSaidaIGC" TEXT,
    "stGabineteP1" REAL DEFAULT 0,
    "stGabineteP2" REAL DEFAULT 0,
    "stCampo" REAL DEFAULT 0,
    "dtAssTecnico" DATETIME,
    "dtAssGerente" DATETIME,
    "dtAssDiretor" DATETIME,
    "dtUpadoSei" DATETIME,
    "dtInicioSobrestado" DATETIME,
    "dtFimSobrestado" DATETIME,
    "dtCancelado" DATETIME,
    "motivoCancelamento" TEXT,
    "taxaAbertura" REAL DEFAULT 0,
    "servicoTecGabinete" REAL DEFAULT 0,
    "taxaVistoria" REAL DEFAULT 0,
    "servicoTecCampo" REAL DEFAULT 0,
    "total" REAL DEFAULT 0,
    "base" TEXT,
    "departamento" TEXT,
    "criadoPorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Process_tecnicoRespId_fkey" FOREIGN KEY ("tecnicoRespId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Process_tecnicoConfId_fkey" FOREIGN KEY ("tecnicoConfId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Process_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "processId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowAction_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkflowAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Process_ordem_key" ON "Process"("ordem");
