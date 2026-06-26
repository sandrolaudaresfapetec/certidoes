-- CreateTable
CREATE TABLE "Solicitacao" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "tipoServico" TEXT NOT NULL,
    "interessado" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "cpfCnpj" TEXT,
    "tipo" TEXT NOT NULL,
    "dtNascimentoIdoso" TIMESTAMP(3),
    "municipio" TEXT,
    "ra" TEXT,
    "codigoSigef" TEXT,
    "areaSigef" DOUBLE PRECISION,
    "statusSigef" TEXT,
    "nomeFazenda" TEXT,
    "matriculaSigef" TEXT,
    "detentorSigef" TEXT,
    "municipioSigef" TEXT,
    "ufSigef" TEXT,
    "representanteTecnico" TEXT,
    "docRequerimento" BOOLEAN NOT NULL DEFAULT false,
    "docIdentidade" BOOLEAN NOT NULL DEFAULT false,
    "docProcuracao" BOOLEAN NOT NULL DEFAULT false,
    "docComprovante" BOOLEAN NOT NULL DEFAULT false,
    "docPlanta" BOOLEAN NOT NULL DEFAULT false,
    "docMatricula" BOOLEAN NOT NULL DEFAULT false,
    "docArt" BOOLEAN NOT NULL DEFAULT false,
    "arquivoGeo" TEXT,
    "observacaoSDTC" TEXT,
    "clienteId" TEXT NOT NULL,
    "processId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Solicitacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Solicitacao_processId_key" ON "Solicitacao"("processId");

-- AddForeignKey
ALTER TABLE "Solicitacao" ADD CONSTRAINT "Solicitacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitacao" ADD CONSTRAINT "Solicitacao_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;
