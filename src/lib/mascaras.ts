/**
 * Máscaras de entrada e exibição (só apresentação). O valor enviado à API não muda de
 * contrato: CPF e CNPJ vão só com algarismos; o telefone vai formatado.
 */
import { cpfCnpjCompleto, digitosCpfCnpj, mascaraCpfCnpj, somenteDigitos } from "./cjt-formulario";

export { cpfCnpjCompleto, digitosCpfCnpj, mascaraCpfCnpj, somenteDigitos };

/** Função que formata o texto digitado, mantendo só o que a máscara aceita. */
export type Mascara = (valor: string) => string;

/** CPF em construção: 000.000.000-00 (até 11 algarismos). */
export function mascaraCpf(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  const base = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(".");
  return d.length > 9 ? `${base}-${d.slice(9)}` : base;
}

/** Telefone em construção: (11) 8888-7777 (10 algarismos) ou (11) 98888-7777 (11). */
export function mascaraTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  const corte = d.length > 10 ? 7 : 6;
  const fim = d.slice(corte);
  return `(${d.slice(0, 2)}) ${d.slice(2, corte)}${fim ? `-${fim}` : ""}`;
}

/** Telefone com DDD: 10 ou 11 algarismos. */
export function telefoneCompleto(valor: string): boolean {
  const n = somenteDigitos(valor).length;
  return n === 10 || n === 11;
}

/**
 * CPF ou CNPJ formatado para leitura. Valor que não é um dos dois (dado antigo ou
 * incompleto) volta como está, para não esconder o que está gravado.
 */
export function exibirCpfCnpj(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return cpfCnpjCompleto(valor) ? mascaraCpfCnpj(valor) : valor;
}
