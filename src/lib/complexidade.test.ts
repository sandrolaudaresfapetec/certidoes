import { describe, expect, it } from "vitest";
import { contarPoligonos, lerNivel, nivelValido, sugerirNivel } from "./complexidade";

const municipal = (finalizada = false) => ({ tipo: "DIVISA_MUNICIPAL", finalizada, municipios: ["A", "B"] });
const triplice = (finalizada = false) => ({ tipo: "TRIPLICE", finalizada, municipios: ["A", "B", "C"] });

describe("sugerirNivel", () => {
  it("longe da divisa: 1 com um polígono e 2 com vários", () => {
    expect(sugerirNivel({ linhasCortadas: [], qtdPoligonos: 1 }).nivel).toBe(1);
    expect(sugerirNivel({ linhasCortadas: [], qtdPoligonos: 3 }).nivel).toBe(2);
  });

  it("divisa finalizada: 3 e 4", () => {
    expect(sugerirNivel({ linhasCortadas: [municipal(true)], qtdPoligonos: 1 }).nivel).toBe(3);
    expect(sugerirNivel({ linhasCortadas: [municipal(true)], qtdPoligonos: 2 }).nivel).toBe(4);
  });

  it("divisa simples não finalizada: 5 e 6", () => {
    expect(sugerirNivel({ linhasCortadas: [municipal(false)], qtdPoligonos: 1 }).nivel).toBe(5);
    expect(sugerirNivel({ linhasCortadas: [municipal(false)], qtdPoligonos: 4 }).nivel).toBe(6);
  });

  it("tríplice não finalizada: 7 e 8; finalizada cai em 3 e 4", () => {
    expect(sugerirNivel({ linhasCortadas: [triplice(false)], qtdPoligonos: 1 }).nivel).toBe(7);
    expect(sugerirNivel({ linhasCortadas: [triplice(false)], qtdPoligonos: 2 }).nivel).toBe(8);
    expect(sugerirNivel({ linhasCortadas: [triplice(true)], qtdPoligonos: 1 }).nivel).toBe(3);
    expect(sugerirNivel({ linhasCortadas: [triplice(true)], qtdPoligonos: 2 }).nivel).toBe(4);
  });

  it("reta, foz, quádrupla, quíntupla, conflito e rio: sempre 9, mesmo finalizada e com vários polígonos", () => {
    for (const tipo of ["RETA", "FOZ", "QUADRUPLA", "QUINTUPLA", "CONFLITO", "RIO"]) {
      expect(sugerirNivel({ linhasCortadas: [{ tipo, finalizada: true }], qtdPoligonos: 1 }).nivel, tipo).toBe(9);
      expect(sugerirNivel({ linhasCortadas: [{ tipo, finalizada: true }], qtdPoligonos: 3 }).nivel, tipo).toBe(9);
    }
  });

  it("cortando várias linhas vale a mais difícil", () => {
    expect(sugerirNivel({ linhasCortadas: [municipal(true), municipal(false)], qtdPoligonos: 1 }).nivel).toBe(5);
    expect(sugerirNivel({ linhasCortadas: [municipal(false), triplice(false)], qtdPoligonos: 1 }).nivel).toBe(7);
    expect(sugerirNivel({ linhasCortadas: [triplice(false), { tipo: "FOZ" }], qtdPoligonos: 1 }).nivel).toBe(9);
  });

  it("três municípios entre as linhas cortadas valem como tríplice", () => {
    const duas = [
      { tipo: "DIVISA_MUNICIPAL", municipios: ["A", "B"] },
      { tipo: "DIVISA_MUNICIPAL", municipios: ["B", "C"] },
    ];
    expect(sugerirNivel({ linhasCortadas: duas, qtdPoligonos: 1 }).nivel).toBe(7);
  });

  it("linha sem o campo finalizada conta como não finalizada", () => {
    expect(sugerirNivel({ linhasCortadas: [{ tipo: "DIVISA_MUNICIPAL" }], qtdPoligonos: 1 }).nivel).toBe(5);
    expect(sugerirNivel({ linhasCortadas: [{ tipo: "DIVISA_MUNICIPAL", finalizada: null }], qtdPoligonos: 1 }).nivel).toBe(5);
  });

  it("o motivo descreve a origem da sugestão", () => {
    expect(sugerirNivel({ linhasCortadas: [municipal(false)], qtdPoligonos: 1 }).motivo).toBe(
      "divisa simples não finalizada, 1 polígono"
    );
    expect(sugerirNivel({ linhasCortadas: [], qtdPoligonos: 2 }).motivo).toBe("longe da divisa, 2 polígonos");
  });

  it("todos os níveis de 1 a 9 são alcançáveis", () => {
    const vistos = new Set<number>();
    for (const qtd of [1, 2]) {
      for (const linhas of [[], [municipal(true)], [municipal(false)], [triplice(false)], [{ tipo: "RETA" }]]) {
        vistos.add(sugerirNivel({ linhasCortadas: linhas, qtdPoligonos: qtd }).nivel);
      }
    }
    expect([...vistos].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe("contarPoligonos", () => {
  it("conta as partes de um MultiPolygon e aceita Feature", () => {
    expect(contarPoligonos({ type: "Polygon", coordinates: [[]] })).toBe(1);
    expect(contarPoligonos({ type: "MultiPolygon", coordinates: [[[]], [[]], [[]]] })).toBe(3);
    expect(contarPoligonos({ type: "Feature", geometry: { type: "MultiPolygon", coordinates: [[[]], [[]]] } })).toBe(2);
    expect(contarPoligonos(null)).toBe(1);
  });
});

describe("validação do nível", () => {
  it("só aceita inteiros de 1 a 9", () => {
    expect(nivelValido(1)).toBe(true);
    expect(nivelValido(9)).toBe(true);
    for (const v of [0, 10, 2.5, "3", null, NaN]) expect(nivelValido(v), String(v)).toBe(false);
  });
  it("lerNivel aceita número, texto numérico e vazio (retira o nível)", () => {
    expect(lerNivel(5)).toEqual({ ok: true, nivel: 5 });
    expect(lerNivel("7")).toEqual({ ok: true, nivel: 7 });
    expect(lerNivel("")).toEqual({ ok: true, nivel: null });
    expect(lerNivel(null)).toEqual({ ok: true, nivel: null });
    expect(lerNivel(undefined)).toEqual({ ok: true, nivel: null });
  });
  it("lerNivel recusa fora da faixa e lixo", () => {
    for (const v of [0, 10, -1, 3.5, "abc", {}, true]) expect(lerNivel(v), String(v)).toMatchObject({ ok: false });
  });
});
