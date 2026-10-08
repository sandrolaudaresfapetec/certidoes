import { describe, expect, it } from "vitest";
import {
  GRUPOS_ATENDIMENTO,
  chaveDoGrupoPelosParametros,
  grupoAtendimento,
} from "./requisicao-grupos-atendimento";

describe("grupos de situação do atendimento", () => {
  it("as chaves são únicas e cada grupo tem rótulo e filtro", () => {
    const chaves = GRUPOS_ATENDIMENTO.map((g) => g.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
    for (const g of GRUPOS_ATENDIMENTO) {
      expect(g.rotulo.length).toBeGreaterThan(3);
      expect(Object.keys(g.filtro).length).toBeGreaterThan(0);
    }
  });

  it("grupoAtendimento acha pela chave e ignora chave inválida", () => {
    expect(grupoAtendimento("arquivadas")?.rotulo).toBe("Arquivadas");
    expect(grupoAtendimento("nao-existe")).toBeNull();
    expect(grupoAtendimento(undefined)).toBeNull();
    expect(grupoAtendimento("")).toBeNull();
  });

  it("links antigos viram o cartão equivalente, e o grupo informado tem prioridade", () => {
    expect(chaveDoGrupoPelosParametros({ semProcesso: "1" })).toBe("fila");
    expect(chaveDoGrupoPelosParametros({ analise: "1" })).toBe("analise-duplicidade");
    expect(chaveDoGrupoPelosParametros({ grupo: "devolvidas", semProcesso: "1" })).toBe("devolvidas");
    expect(chaveDoGrupoPelosParametros({ grupo: "lixo" })).toBeNull();
    expect(chaveDoGrupoPelosParametros({})).toBeNull();
  });

  it("'Na fila' exige análise feita e sem processo; 'Aguardando análise' exige análise vazia", () => {
    const fila = grupoAtendimento("fila")!.filtro as Record<string, unknown>;
    expect(fila.status).toBe("PENDENTE");
    expect(fila.processId).toBeNull();
    expect(fila.analiseDuplicidadeEm).toEqual({ not: null });
    const analise = grupoAtendimento("analise-duplicidade")!.filtro as Record<string, unknown>;
    expect(analise.analiseDuplicidadeEm).toBeNull();
  });
});
