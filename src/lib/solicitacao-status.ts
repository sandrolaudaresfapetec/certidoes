/**
 * Situações em que o solicitante ainda pode alterar a própria requisição.
 * Depois da abertura do processo os dados alimentam a análise técnica e só o
 * backoffice altera; a devolução existe justamente para o cliente corrigir.
 */
export const STATUS_EDITAVEIS = ["DEVOLVIDA"];

/**
 * Situações em que a requisição aceita documentos: além da devolução, a
 * requisição recém-criada (PENDENTE), porque o formulário envia os arquivos
 * logo depois de criá-la.
 */
export const STATUS_ACEITA_DOCUMENTOS = ["PENDENTE", ...STATUS_EDITAVEIS];
