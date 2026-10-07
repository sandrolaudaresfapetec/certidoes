import { describe, expect, it } from "vitest";
import { formularioVazio, normalizarRascunho, type FormularioCjt } from "./cjt-formulario";
import { dadosDoRascunho } from "./solicitacao-rascunho";

function form(parcial: Partial<FormularioCjt>): FormularioCjt {
  return { ...formularioVazio(), ...parcial };
}

describe("normalizarRascunho", () => {
  it("aceita o formulário vazio: nada é obrigatório", () => {
    expect(normalizarRascunho(formularioVazio())).toEqual({
      cjtQualidade: null,
      cjtResultado: null,
      cjtSituacao: null,
      cjtPropriedadeDe: null,
      cjtInformaMatricula: null,
      cjtMatricula: null,
      cjtQtdPoligonos: null,
      cjtNomesPoligonos: null,
      cjtCodigoIncra: null,
      cjtDeclaracaoAceita: false,
    });
  });

  it("guarda respostas parciais e descarta o que não pertence à combinação", () => {
    const r = normalizarRascunho(
      form({ qualidade: "1b", resultado: "2c", situacao: "3d", propriedadeDe: " Maria ", matricula: "999" })
    );
    expect(r).toMatchObject({
      cjtQualidade: "1b",
      cjtResultado: "2c",
      cjtSituacao: "3d",
      cjtPropriedadeDe: "Maria",
      cjtMatricula: null,
    });
  });

  it("descarta códigos inválidos e satura tamanhos", () => {
    const r = normalizarRascunho(
      form({
        qualidade: "9z" as never,
        resultado: "2b",
        situacao: "3d",
        propriedadeDe: "x".repeat(1000),
        matricula: "1".repeat(100),
        qtdPoligonos: "500",
        nomesPoligonos: ["Gleba A", "G".repeat(80)],
      })
    );
    expect(r.cjtQualidade).toBeNull();
    expect(r.cjtPropriedadeDe).toHaveLength(300);
    expect(r.cjtMatricula).toHaveLength(30);
    expect(r.cjtQtdPoligonos).toBeNull();
    expect(JSON.parse(r.cjtNomesPoligonos!)[1]).toHaveLength(15);
  });

  it("usucapião: Não vira o literal, Não sei não é guardado", () => {
    const base = { qualidade: "1b" as const, resultado: "2a" as const, situacao: "3b" as const };
    expect(normalizarRascunho(form({ ...base, informaMatricula: "NAO" }))).toMatchObject({
      cjtInformaMatricula: "NAO",
      cjtMatricula: "Usucapião",
    });
    expect(normalizarRascunho(form({ ...base, informaMatricula: "NAO_SEI" })).cjtInformaMatricula).toBeNull();
  });
});

describe("dadosDoRascunho", () => {
  it("monta o rascunho sem validar o corpo", () => {
    const d = dadosDoRascunho({ cjt: { qualidade: "1b" }, observacao: "  oi  " }, true);
    expect(d).toMatchObject({
      tipoViaSigef: true,
      sigefCodigoImovel: null,
      emNomeDeCpf: null,
      observacao: "oi",
      cjtQualidade: "1b",
    });
  });

  it("representação só vale para Representante e sem validar dígitos", () => {
    const corpo = { emNomeDeCpf: "529.982.247-2", emNomeDeNome: "Ana", cjt: { qualidade: "1a" } };
    expect(dadosDoRascunho(corpo, true)).toMatchObject({ emNomeDeCpf: "5299822472", emNomeDeNome: "Ana" });
    expect(dadosDoRascunho({ ...corpo, cjt: { qualidade: "1b" } }, true)).toMatchObject({
      emNomeDeCpf: null,
      emNomeDeNome: null,
    });
  });

  it("sem registro no SIGEF não guarda dados de imóvel", () => {
    const d = dadosDoRascunho({ sigefCodigoImovel: "X", sigefAreaHectares: "10" }, false);
    expect(d).toMatchObject({ tipoViaSigef: false, sigefCodigoImovel: null, sigefAreaHectares: null });
  });

  it("área inválida vira nula", () => {
    expect(dadosDoRascunho({ sigefAreaHectares: "abc" }, true).sigefAreaHectares).toBeNull();
    expect(dadosDoRascunho({ sigefAreaHectares: "12.5" }, true).sigefAreaHectares).toBe(12.5);
  });
});
