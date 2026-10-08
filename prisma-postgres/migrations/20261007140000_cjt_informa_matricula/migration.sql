-- Usucapiao (#PEND-35): resposta de "Quero informar o numero da matricula?".
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "cjtInformaMatricula" TEXT;
