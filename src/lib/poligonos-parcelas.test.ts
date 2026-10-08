import { describe, expect, it } from "vitest";
import { conferirParcelasDosPoligonos } from "./poligonos-parcelas";

const consulta = [
  { parcelaCodigo: "FIXT-0001", nomeArea: "Fazenda Santa Luzia", areaHectares: 120.5 },
  { parcelaCodigo: "P-2", nomeArea: "Sítio São Bento", areaHectares: 48.2 },
  { parcelaCodigo: "P-3", nomeArea: "Gleba C", areaHectares: 10 },
];

describe("conferirParcelasDosPoligonos", () => {
  it("devolve os pares com nome e área vindos da consulta", () => {
    const r = conferirParcelasDosPoligonos({
      nomes: ["Gleba A", "Gleba B"],
      parcelas: ["FIXT-0001", "P-2"],
      consulta,
      parcelaPrincipal: "FIXT-0001",
    });
    expect(r).toEqual({
      ok: true,
      poligonos: [
        { nome: "Gleba A", parcelaCodigo: "FIXT-0001", nomeArea: "Fazenda Santa Luzia", areaHa: 120.5 },
        { nome: "Gleba B", parcelaCodigo: "P-2", nomeArea: "Sítio São Bento", areaHa: 48.2 },
      ],
    });
  });

  it("recusa parcela que não consta na consulta do solicitante", () => {
    const r = conferirParcelasDosPoligonos({
      nomes: ["Gleba A", "Gleba B"],
      parcelas: ["FIXT-0001", "DE-OUTRA-PESSOA"],
      consulta,
    });
    expect(r).toMatchObject({ ok: false });
    expect(r.ok === false && r.erro).toContain("Gleba B");
  });

  it("o imóvel principal tem de ser a parcela do primeiro polígono", () => {
    const base = { nomes: ["A", "B"], parcelas: ["FIXT-0001", "P-2"], consulta };
    expect(conferirParcelasDosPoligonos({ ...base, parcelaPrincipal: "P-2" })).toMatchObject({ ok: false });
    expect(conferirParcelasDosPoligonos({ ...base, parcelaPrincipal: "FIXT-0001" })).toMatchObject({ ok: true });
    expect(conferirParcelasDosPoligonos({ ...base, parcelaPrincipal: null })).toMatchObject({ ok: true });
  });
});
