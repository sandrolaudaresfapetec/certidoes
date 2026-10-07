import { describe, expect, it } from "vitest";
import {
  formularioVazio,
  limparCamposNaoAplicaveis,
  normalizarParaPersistencia,
  validarFormulario,
  type FormularioCjt,
} from "./cjt-formulario";

function formulario(parcial: Partial<FormularioCjt>): FormularioCjt {
  return { ...formularioVazio(), declaracao: true, ...parcial };
}

describe("matriz do formulário CJT (linha de base antes das mudanças das próximas fases)", () => {
  it("aceita proprietário, matrícula e situação comum", () => {
    const f = formulario({
      qualidade: "1b",
      resultado: "2a",
      situacao: "3d",
      propriedadeDe: "Maria de Souza",
      matricula: "12345",
    });
    expect(validarFormulario(f)).toEqual({});
  });

  it.each([
    ["1c", "2a", "3d"],
    ["1b", "2d", "3d"],
    ["1b", "2a", "3e"],
  ])('bloqueia "Não sei" (%s, %s, %s)', (qualidade, resultado, situacao) => {
    const erros = validarFormulario(
      formulario({ qualidade: qualidade as never, resultado: resultado as never, situacao: situacao as never })
    );
    expect(erros.combinacao).toBeDefined();
  });

  it("exige a matrícula com algarismos quando o resultado é matrícula", () => {
    const f = formulario({
      qualidade: "1b",
      resultado: "2a",
      situacao: "3d",
      propriedadeDe: "Maria",
      matricula: "abc",
    });
    expect(validarFormulario(f).matricula).toBeDefined();
  });

  it("descarta campos fora da combinação antes de persistir", () => {
    const f = formulario({
      qualidade: "1b",
      resultado: "2c",
      situacao: "3d",
      propriedadeDe: "Maria",
      matricula: "999",
      qtdPoligonos: "3",
      nomesPoligonos: ["A", "B", "C"],
    });
    const limpo = limparCamposNaoAplicaveis(f);
    expect(limpo.matricula).toBe("");
    expect(limpo.qtdPoligonos).toBe("");
    expect(normalizarParaPersistencia(f).cjtMatricula).toBeNull();
  });

  it("recusa nomes de polígono repetidos", () => {
    const f = formulario({
      qualidade: "1b",
      resultado: "2b",
      situacao: "3d",
      propriedadeDe: "Maria",
      matricula: "123",
      qtdPoligonos: "2",
      nomesPoligonos: ["Gleba A", "gleba a"],
    });
    expect(validarFormulario(f).nomesPoligonos).toBeDefined();
  });
});
