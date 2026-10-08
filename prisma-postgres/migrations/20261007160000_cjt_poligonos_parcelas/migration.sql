-- Poligonos nomeados ligados as parcelas do SIGEF (#PEND-34, #PEND-45).
ALTER TABLE "Solicitacao" ADD COLUMN IF NOT EXISTS "cjtPoligonos" TEXT;
