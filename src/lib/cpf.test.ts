import { describe, expect, it } from "vitest";
import { validarCNPJ, validarCPF, validarCpfOuCnpj } from "./cpf";

describe("validarCNPJ", () => {
  it("aceita CNPJ com dígitos verificadores corretos, com ou sem máscara", () => {
    expect(validarCNPJ("11222333000181")).toBe(true);
    expect(validarCNPJ("11.222.333/0001-81")).toBe(true);
  });

  it("recusa dígito errado, repetidos e tamanho errado", () => {
    expect(validarCNPJ("11222333000182")).toBe(false);
    expect(validarCNPJ("11111111111111")).toBe(false);
    expect(validarCNPJ("1122233300018")).toBe(false);
  });
});

describe("validarCpfOuCnpj", () => {
  it("escolhe a regra pelo número de dígitos", () => {
    expect(validarCpfOuCnpj("529.982.247-25")).toBe(true);
    expect(validarCpfOuCnpj("52998224700")).toBe(false);
    expect(validarCpfOuCnpj("11222333000181")).toBe(true);
    expect(validarCpfOuCnpj("123456789012")).toBe(false);
  });

  it("não confunde com a validação de CPF", () => {
    expect(validarCPF("11222333000181")).toBe(false);
  });
});
