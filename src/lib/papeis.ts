/**
 * Constantes de papel e senha compartilhadas entre servidor e cliente.
 * Ficam fora de `auth.ts` porque aquele modulo depende de `next/headers` e do
 * Prisma, que nao podem ser importados por componentes de cliente.
 */

/** Papeis atribuiveis a um usuario do backoffice. */
export const PAPEIS = [
  "ADMIN",
  "GERENTE",
  "DIRETOR",
  "TECNICO",
  "CONFERENTE",
  "SDTC",
] as const;

export type Papel = (typeof PAPEIS)[number];

/** Tamanho minimo da senha definida pelo administrador. */
export const SENHA_MINIMA = 8;
