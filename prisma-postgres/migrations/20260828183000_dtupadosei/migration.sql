-- Restaura campo dtUpadoSei (data de upload no SEI) usado pelo workflow
ALTER TABLE "Process" ADD COLUMN "dtUpadoSei" TIMESTAMP(3);
