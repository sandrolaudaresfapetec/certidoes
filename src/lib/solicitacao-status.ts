/**
 * Situações em que o solicitante ainda pode alterar a própria requisição e
 * (re)enviar documentos. Depois da abertura do processo os dados alimentam a
 * análise técnica e só o backoffice altera; a devolução existe justamente para
 * o cliente corrigir.
 */
export const STATUS_EDITAVEIS = ["PENDENTE", "DEVOLVIDA"];
