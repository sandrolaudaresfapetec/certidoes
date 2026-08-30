-- Restaura campo dtUpadoSei (data de upload no SEI) usado pelo workflow
ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "dtUpadoSei" TIMESTAMP(3);
