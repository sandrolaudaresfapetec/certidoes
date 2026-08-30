-- Sincroniza o banco com o schema atual: colunas e nulabilidade que faltavam
-- nas migrations (antes so eram criadas por `prisma db push`).

ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "dtVisita2" TIMESTAMP(3);
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "dtSaida" TIMESTAMP(3);
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "formaSaida" TEXT;
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "diasTotais" INTEGER;

ALTER TABLE "WorkflowAction" ADD COLUMN IF NOT EXISTS "acao" TEXT;
ALTER TABLE "WorkflowAction" ADD COLUMN IF NOT EXISTS "deEtapa" TEXT;
ALTER TABLE "WorkflowAction" ADD COLUMN IF NOT EXISTS "paraEtapa" TEXT;
ALTER TABLE "WorkflowAction" ADD COLUMN IF NOT EXISTS "observacao" TEXT;

ALTER TABLE "WorkflowAction" ALTER COLUMN "fromStatus" DROP NOT NULL;
ALTER TABLE "WorkflowAction" ALTER COLUMN "toStatus" DROP NOT NULL;
ALTER TABLE "WorkflowAction" ALTER COLUMN "action" DROP NOT NULL;
