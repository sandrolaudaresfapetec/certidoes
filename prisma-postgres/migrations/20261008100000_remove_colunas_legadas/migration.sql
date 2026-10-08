-- Colunas legadas de Process nunca lidas pelo app (#PEND-19).
ALTER TABLE "Process" DROP COLUMN IF EXISTS "processes";
ALTER TABLE "Process" DROP COLUMN IF EXISTS "users";
