import { describe, expect, it } from "vitest";
import {
  MATRICULA_USUCAPIAO,
  erroNomenclatura,
  formularioDoPayload,
  formularioVazio,
  limparCamposNaoAplicaveis,
  normalizarParaPersistencia,
  validarFormulario,
  validarRepresentacao,
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


describe("usucapião: Quero informar o número da matrícula? (#PEND-35)", () => {
  const base = {
    qualidade: "1b" as const,
    resultado: "2a" as const,
    situacao: "3b" as const,
  };

  it("exige responder a pergunta nos casos de usucapião", () => {
    expect(validarFormulario(formulario({ ...base, matricula: "123" })).informaMatricula).toBeDefined();
  });

  it("Sim: fluxo normal, matrícula só com algarismos", () => {
    const ok = formulario({ ...base, informaMatricula: "SIM", matricula: "12345" });
    expect(validarFormulario(ok)).toEqual({});
    expect(normalizarParaPersistencia(ok)).toMatchObject({
      cjtInformaMatricula: "SIM",
      cjtMatricula: "12345",
    });
    expect(validarFormulario({ ...ok, matricula: "" }).matricula).toBeDefined();
    expect(validarFormulario({ ...ok, matricula: "12a45" }).matricula).toBeDefined();
  });

  it("Não: a matrícula vira Usucapião, mesmo que o corpo venha sem ela", () => {
    const f = formulario({ ...base, informaMatricula: "NAO", matricula: "" });
    expect(validarFormulario(f)).toEqual({});
    expect(normalizarParaPersistencia(f)).toMatchObject({
      cjtInformaMatricula: "NAO",
      cjtMatricula: MATRICULA_USUCAPIAO,
    });
  });

  it("Não sei: interrompe", () => {
    const f = formulario({ ...base, informaMatricula: "NAO_SEI" });
    expect(validarFormulario(f).combinacao).toBeDefined();
  });

  it("o literal Usucapião só vale no ramo Não", () => {
    const f = formulario({ ...base, informaMatricula: "SIM", matricula: MATRICULA_USUCAPIAO });
    expect(validarFormulario(f).matricula).toBeDefined();
    const comum = formulario({
      qualidade: "1b",
      resultado: "2a",
      situacao: "3d",
      propriedadeDe: "Maria",
      matricula: MATRICULA_USUCAPIAO,
    });
    expect(validarFormulario(comum).matricula).toBeDefined();
  });

  it("não pergunta fora de usucapião nem no resultado por Área", () => {
    expect(
      normalizarParaPersistencia(
        formulario({ ...base, situacao: "3d", propriedadeDe: "M", matricula: "1", informaMatricula: "SIM" })
      ).cjtInformaMatricula
    ).toBeNull();
    expect(
      normalizarParaPersistencia(formulario({ ...base, resultado: "2c", informaMatricula: "NAO" }))
        .cjtInformaMatricula
    ).toBeNull();
  });

  it("trocar a situação apaga a resposta e o literal", () => {
    const f = limparCamposNaoAplicaveis(
      formulario({ ...base, informaMatricula: "NAO", matricula: MATRICULA_USUCAPIAO, situacao: "3d" })
    );
    expect(f.informaMatricula).toBe("");
    expect(f.matricula).toBe("");
  });

  it("lê a resposta do corpo da requisição", () => {
    expect(formularioDoPayload({ informaMatricula: "NAO" }).informaMatricula).toBe("NAO");
  });
});

describe("polígonos no servidor (#PEND-36)", () => {
  const gleba = (qtd: string, nomes: string[]) =>
    formulario({
      qualidade: "1b",
      resultado: "2b",
      situacao: "3d",
      propriedadeDe: "Maria",
      matricula: "123",
      qtdPoligonos: qtd,
      nomesPoligonos: nomes,
    });

  it("aceita a nomenclatura fechada", () => {
    expect(validarFormulario(gleba("2", ["Gleba A-1", "Gleba A-2"]))).toEqual({});
    expect(validarFormulario(gleba("3", ["1", "2", "3"]))).toEqual({});
  });

  it.each([
    [["Fazenda Boa Esperança", "Sítio"]],
    [["Gleba ABCD", "Gleba B"]],
    [["Gleba A", "Parte B"]],
    [["Gleba ç", "Gleba b"]],
  ])("recusa nomes fora do padrão %j", (nomes) => {
    expect(validarFormulario(gleba("2", nomes)).nomesPoligonos).toBeDefined();
  });

  it("recusa repetidos sem diferenciar maiúsculas", () => {
    expect(erroNomenclatura(["Gleba A", "Gleba A"])).toContain("Não repita");
    expect(erroNomenclatura(["A", "a"])).toContain("Não repita");
    expect(erroNomenclatura(["Gleba A", "Gleba B"])).toBeNull();
  });

  it("12 polígonos segue o fluxo normal e 13 ou mais é recusado", () => {
    const nomes12 = Array.from({ length: 12 }, (_, i) => `Gleba ${i + 1}`);
    expect(validarFormulario(gleba("12", nomes12))).toEqual({});
    const nomes13 = Array.from({ length: 13 }, (_, i) => `Gleba ${i + 1}`);
    expect(validarFormulario(gleba("13", nomes13)).qtdPoligonos).toContain("13 ou mais");
  });
});

describe("representação (#PEND-44)", () => {
  it("Representante exige CPF/CNPJ válido e nome", () => {
    expect(validarRepresentacao({ qualidade: "1a", emNomeDeCpf: "529.982.247-25", emNomeDeNome: " Ana " })).toEqual({
      ok: true,
      cpf: "52998224725",
      nome: "Ana",
    });
    expect(validarRepresentacao({ qualidade: "1a", emNomeDeCpf: "11.222.333/0001-81", emNomeDeNome: "Empresa X" })).toMatchObject({
      ok: true,
      cpf: "11222333000181",
    });
    expect(validarRepresentacao({ qualidade: "1a", emNomeDeCpf: "", emNomeDeNome: "Ana" })).toMatchObject({ ok: false });
    expect(validarRepresentacao({ qualidade: "1a", emNomeDeCpf: "52998224700", emNomeDeNome: "Ana" })).toMatchObject({ ok: false });
    expect(validarRepresentacao({ qualidade: "1a", emNomeDeCpf: "52998224725", emNomeDeNome: " " })).toMatchObject({ ok: false });
  });

  it("proprietário não representa ninguém: os dados são descartados", () => {
    expect(validarRepresentacao({ qualidade: "1b", emNomeDeCpf: "52998224725", emNomeDeNome: "Ana" })).toEqual({
      ok: true,
      cpf: null,
      nome: null,
    });
  });
});
