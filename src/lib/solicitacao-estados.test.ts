import { describe, expect, it } from "vitest";
import { REQUISICAO_STATUS, statusRequisicao } from "./requisicao-status";
import {
  MOTIVO_DEVOLUCAO_MAX,
  STATUS_FORA_DA_FILA,
  STATUS_SOLICITACAO,
  bloqueioAcaoAtendimento,
  clientePodeEditar,
  podeCongelar,
  podeDevolver,
  podeLiberar,
  validarMotivoDevolucao,
  visivelAoAtendimento,
} from "./solicitacao-estados";

describe("clientePodeEditar", () => {
  it("só deixa editar requisição devolvida ou rascunho, sem processo e sem finalização", () => {
    expect(clientePodeEditar({ status: "DEVOLVIDA" })).toBe(true);
    expect(clientePodeEditar({ status: "RASCUNHO" })).toBe(true);
    expect(clientePodeEditar({ status: "RASCUNHO", processId: "p1" })).toBe(false);
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

describe("podeDevolver", () => {
  it("devolve requisição pendente, sem processo e sem finalização", () => {
    expect(podeDevolver({ status: "PENDENTE" })).toBe(true);
    expect(podeDevolver({ status: "EM_ANALISE" })).toBe(true);
    expect(podeDevolver({ status: "PENDENTE", processId: "p1" })).toBe(false);
    expect(podeDevolver({ status: "PENDENTE", finalizadaEm: new Date() })).toBe(false);
  });

  it.each(["DEVOLVIDA", "APROVADA", "CONCLUIDA", "RASCUNHO", "ARQUIVADA"])(
    "não devolve em %s",
    (status) => {
      expect(podeDevolver({ status })).toBe(false);
    }
  );
});

describe("validarMotivoDevolucao", () => {
  it("exige pelo menos 10 caracteres úteis", () => {
    expect(validarMotivoDevolucao("curto")).toMatchObject({ ok: false });
    expect(validarMotivoDevolucao("         x         ")).toMatchObject({ ok: false });
    expect(validarMotivoDevolucao(undefined)).toMatchObject({ ok: false });
    expect(validarMotivoDevolucao("  matrícula divergente  ")).toEqual({
      ok: true,
      motivo: "matrícula divergente",
    });
  });

  it("recusa mais que o máximo", () => {
    expect(validarMotivoDevolucao("a".repeat(MOTIVO_DEVOLUCAO_MAX))).toMatchObject({ ok: true });
    expect(validarMotivoDevolucao("a".repeat(MOTIVO_DEVOLUCAO_MAX + 1))).toMatchObject({ ok: false });
  });
});

describe("rascunho e atendimento", () => {
  it("o atendimento não vê rascunho", () => {
    expect(visivelAoAtendimento("RASCUNHO")).toBe(false);
    expect(visivelAoAtendimento("PENDENTE")).toBe(true);
    expect(visivelAoAtendimento("DEVOLVIDA")).toBe(true);
  });

  it.each(["RASCUNHO", "DEVOLVIDA", "AGUARDANDO_LIBERACAO", "AGUARDANDO_CLIENTE", "ARQUIVADA", "ARQUIVAMENTO_SOLICITADO"])(
    "bloqueia abrir processo e pagamento em %s",
    (status) => {
      expect(bloqueioAcaoAtendimento(status)).toEqual(expect.any(String));
    }
  );

  it.each(["PENDENTE", "EM_ANALISE", "APROVADA", "CONCLUIDA"])("libera em %s", (status) => {
    expect(bloqueioAcaoAtendimento(status)).toBeNull();
  });
});

describe("congelamento por 13+ polígonos (#PEND-31)", () => {
  it("o atendimento vê rascunho só depois de congelado", () => {
    expect(visivelAoAtendimento("RASCUNHO")).toBe(false);
    expect(visivelAoAtendimento("RASCUNHO", new Date())).toBe(true);
    expect(visivelAoAtendimento("AGUARDANDO_LIBERACAO", new Date())).toBe(true);
  });

  it("só congela rascunho com mais de 12 polígonos", () => {
    expect(podeCongelar({ status: "RASCUNHO", cjtQtdPoligonos: 13 })).toBe(true);
    expect(podeCongelar({ status: "RASCUNHO", cjtQtdPoligonos: 12 })).toBe(false);
    expect(podeCongelar({ status: "RASCUNHO", cjtQtdPoligonos: null })).toBe(false);
    expect(podeCongelar({ status: "PENDENTE", cjtQtdPoligonos: 20 })).toBe(false);
    expect(podeCongelar({ status: "AGUARDANDO_LIBERACAO", cjtQtdPoligonos: 20 })).toBe(false);
  });

  it("só libera pedido aguardando liberação", () => {
    expect(podeLiberar({ status: "AGUARDANDO_LIBERACAO" })).toBe(true);
    expect(podeLiberar({ status: "RASCUNHO" })).toBe(false);
    expect(podeLiberar({ status: "PENDENTE" })).toBe(false);
  });

  it("o pedido congelado não está na fila de abertura de processo e não é editável", () => {
    expect(STATUS_FORA_DA_FILA).toContain("AGUARDANDO_LIBERACAO");
    expect(STATUS_FORA_DA_FILA).toContain("RASCUNHO");
    expect(STATUS_FORA_DA_FILA).not.toContain("PENDENTE");
    expect(clientePodeEditar({ status: "AGUARDANDO_LIBERACAO" })).toBe(false);
  });
});
