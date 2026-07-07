-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "cpf" TEXT,
    "govBrSub" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "anoEntrada" INTEGER NOT NULL,
    "tipoServico" TEXT NOT NULL,
    "expediente" TEXT,
    "dtAbertoSei" TIMESTAMP(3),
    "dtCompile" TIMESTAMP(3),
    "tipo" TEXT NOT NULL,
    "interessado" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "cpfCnpj" TEXT,
    "dtNascimentoIdoso" TIMESTAMP(3),
    "idadeTrava" DOUBLE PRECISION,
    "pasta" TEXT,
    "utm" TEXT,
    "municipio" TEXT,
    "ra" TEXT,
    "dra" TEXT,
    "divisaDificuldade" TEXT,
    "codigoSigef" TEXT,
    "areaSigef" DOUBLE PRECISION,
    "statusSigef" TEXT,
    "situacao" TEXT NOT NULL DEFAULT 'entrada_sdtc',
    "nivelPrioridade" TEXT,
    "statusEscritorio" TEXT,
    "observacaoEntrada" TEXT,
    "diasTranscorridos" INTEGER NOT NULL DEFAULT 0,
    "tecnicoRespId" TEXT,
    "quemVaiAssinar" TEXT,
    "dtEmail" TIMESTAMP(3),
    "dtVisita1" TIMESTAMP(3),
    "observacoesTecnico" TEXT,
    "tecnicoConfId" TEXT,
    "observacoesConferencia" TEXT,
    "dtConf" TIMESTAMP(3),
    "numeroSaidaIGC" TEXT,
    "stGabineteP1" DOUBLE PRECISION DEFAULT 0,
    "stGabineteP2" DOUBLE PRECISION DEFAULT 0,
    "stCampo" DOUBLE PRECISION DEFAULT 0,
    "dtAssTecnico" TIMESTAMP(3),
    "dtAssGerente" TIMESTAMP(3),
    "dtAssDiretor" TIMESTAMP(3),
    "dtUpadoSei" TIMESTAMP(3),
    "dtInicioSobrestado" TIMESTAMP(3),
    "dtFimSobrestado" TIMESTAMP(3),
    "dtCancelado" TIMESTAMP(3),
    "motivoCancelamento" TEXT,
    "taxaAbertura" DOUBLE PRECISION DEFAULT 0,
    "servicoTecGabinete" DOUBLE PRECISION DEFAULT 0,
    "taxaVistoria" DOUBLE PRECISION DEFAULT 0,
    "servicoTecCampo" DOUBLE PRECISION DEFAULT 0,
    "total" DOUBLE PRECISION DEFAULT 0,
    "base" TEXT,
    "departamento" TEXT,
    "clienteId" TEXT,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "processId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAction" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "User_govBrSub_key" ON "User"("govBrSub");

-- CreateIndex
CREATE UNIQUE INDEX "Process_ordem_key" ON "Process"("ordem");

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_tecnicoRespId_fkey" FOREIGN KEY ("tecnicoRespId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_tecnicoConfId_fkey" FOREIGN KEY ("tecnicoConfId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
