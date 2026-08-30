-- Restaura campos de workflow/sobrestamento usados pela API
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "dtInicioSobrestado" TIMESTAMP(3);
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "dtFimSobrestado" TIMESTAMP(3);
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "dtCancelado" TIMESTAMP(3);
ALTER TABLE "WorkflowAction" ADD COLUMN IF NOT EXISTS "fromStatus" TEXT;
ALTER TABLE "WorkflowAction" ADD COLUMN IF NOT EXISTS "toStatus" TEXT;
