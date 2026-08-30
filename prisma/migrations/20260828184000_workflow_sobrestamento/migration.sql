-- Restaura campos de workflow/sobrestamento usados pela API
ALTER TABLE "Process" ADD COLUMN "dtInicioSobrestado" DATETIME;
ALTER TABLE "Process" ADD COLUMN "dtFimSobrestado" DATETIME;
ALTER TABLE "Process" ADD COLUMN "dtCancelado" DATETIME;
ALTER TABLE "WorkflowAction" ADD COLUMN "fromStatus" TEXT;
ALTER TABLE "WorkflowAction" ADD COLUMN "toStatus" TEXT;
