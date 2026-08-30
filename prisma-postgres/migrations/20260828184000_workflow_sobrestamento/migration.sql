-- Restaura campos de workflow/sobrestamento usados pela API
ALTER TABLE "Process" ADD COLUMN "dtInicioSobrestado" TIMESTAMP(3);
ALTER TABLE "Process" ADD COLUMN "dtFimSobrestado" TIMESTAMP(3);
ALTER TABLE "Process" ADD COLUMN "dtCancelado" TIMESTAMP(3);
ALTER TABLE "WorkflowAction" ADD COLUMN "fromStatus" TEXT;
ALTER TABLE "WorkflowAction" ADD COLUMN "toStatus" TEXT;
