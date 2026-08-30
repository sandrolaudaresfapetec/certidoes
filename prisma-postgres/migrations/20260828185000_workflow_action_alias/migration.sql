-- Alias legado usado pela API de workflow
ALTER TABLE "WorkflowAction" ADD COLUMN IF NOT EXISTS "action" TEXT;
