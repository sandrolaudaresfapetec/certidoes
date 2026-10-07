import { describe, expect, it } from "vitest";
import { REQUISICAO_STATUS, statusRequisicao } from "./requisicao-status";
import { STATUS_SOLICITACAO, clientePodeEditar } from "./solicitacao-estados";

describe("clientePodeEditar", () => {
  it("só deixa editar requisição devolvida, sem processo e sem finalização", () => {
    expect(clientePodeEditar({ status: "DEVOLVIDA" })).toBe(true);
    expect(clientePodeEditar({ status: "DEVOLVIDA", processId: "p1" })).toBe(false);
    expect(clientePodeEditar({ status: "DEVOLVIDA", finalizadaEm: new Date() })).toBe(false);
  });

  it.each(["PENDENTE", "EM_ANALISE", "APROVADA", "CONCLUIDA", "ARQUIVADA"])(
    "bloqueia a edição em %s",
    (status) => {
      expect(clientePodeEditar({ status })).toBe(false);
    }
  );
});

describe("rótulos de status", () => {
  it("todo status do sistema tem rótulo próprio (senão a tela mostra Pendente)", () => {
    for (const status of Object.values(STATUS_SOLICITACAO)) {
      expect(REQUISICAO_STATUS[status], status).toBeDefined();
    }
  });

  it("status desconhecido cai em Pendente", () => {
    expect(statusRequisicao("XYZ")).toBe(REQUISICAO_STATUS.PENDENTE);
  });
});
