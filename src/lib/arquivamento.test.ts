import { describe, expect, it } from "vitest";
import {
  MOTIVO_ARQUIVAMENTO_MAX,
  MOTIVO_ARQUIVAMENTO_MIN,
  opcaoDeArquivamento,
  podeDesarquivar,
  statusAposDesarquivar,
  statusAposRecusa,
  validarMotivoArquivamento,
} from "./solicitacao-estados";

const ANALISADA = new Date("2026-10-07T15:00:00Z");

describe("opcaoDeArquivamento", () => {
  it("enviada e ainda não analisada, sem processo: imediato", () => {
    expect(opcaoDeArquivamento({ status: "PENDENTE", processId: null, analiseDuplicidadeEm: null }).tipo).toBe("IMEDIATO");
  });
  it("congelada (13+ polígonos) também arquiva na hora", () => {
    expect(opcaoDeArquivamento({ status: "AGUARDANDO_LIBERACAO", processId: null, analiseDuplicidadeEm: null }).tipo).toBe("IMEDIATO");
  });
  it("já analisada: vai para a DDD", () => {
    expect(opcaoDeArquivamento({ status: "PENDENTE", processId: null, analiseDuplicidadeEm: ANALISADA }).tipo).toBe("VIA_DDD");
  });
  it("com processo aberto: vai para a DDD, mesmo sem análise registrada", () => {
    expect(opcaoDeArquivamento({ status: "EM_ANALISE", processId: "p1", analiseDuplicidadeEm: null }).tipo).toBe("VIA_DDD");
  });
  it("devolvida: vai para a DDD", () => {
    expect(opcaoDeArquivamento({ status: "DEVOLVIDA", processId: null, analiseDuplicidadeEm: null }).tipo).toBe("VIA_DDD");
  });
  it("não há botão para finalizada, concluída, arquivada, pedido em aberto, rascunho e pergunta aberta", () => {
    for (const status of ["CONCLUIDA", "APROVADA", "ARQUIVADA", "ARQUIVAMENTO_SOLICITADO", "RASCUNHO", "AGUARDANDO_CLIENTE"]) {
      const r = opcaoDeArquivamento({ status, processId: null, analiseDuplicidadeEm: null });
      expect(r.tipo, status).toBe("NAO");
      expect(r.tipo === "NAO" && r.motivo.length).toBeGreaterThan(5);
    }
    expect(opcaoDeArquivamento({ status: "EM_ANALISE", processId: "p1", finalizadaEm: new Date() }).tipo).toBe("NAO");
  });
});

describe("validarMotivoArquivamento", () => {
  it("opcional no imediato: vazio vale e vira null", () => {
    expect(validarMotivoArquivamento("   ", false)).toEqual({ ok: true, motivo: null });
    expect(validarMotivoArquivamento(undefined, false)).toEqual({ ok: true, motivo: null });
  });
  it("obrigatório quando vai para a DDD", () => {
    expect(validarMotivoArquivamento("", true)).toMatchObject({ ok: false });
    expect("a".repeat(MOTIVO_ARQUIVAMENTO_MIN - 1)).toHaveLength(MOTIVO_ARQUIVAMENTO_MIN - 1);
    expect(validarMotivoArquivamento("curto", true)).toMatchObject({ ok: false });
    expect(validarMotivoArquivamento("  Pedido feito por engano  ", true)).toEqual({ ok: true, motivo: "Pedido feito por engano" });
  });
  it("informado, mesmo opcional, respeita os limites", () => {
    expect(validarMotivoArquivamento("abc", false)).toMatchObject({ ok: false });
    expect(validarMotivoArquivamento("x".repeat(MOTIVO_ARQUIVAMENTO_MAX + 1), false)).toMatchObject({ ok: false });
  });
  it("o rótulo aparece na mensagem de erro", () => {
    const r = validarMotivoArquivamento("", true, "justificativa");
    expect(r.ok === false && r.erro).toContain("justificativa");
  });
});

describe("statusAposRecusa", () => {
  it("volta ao status guardado", () => {
    expect(statusAposRecusa({ arquivamentoStatusAnterior: "DEVOLVIDA" })).toBe("DEVOLVIDA");
    expect(statusAposRecusa({ arquivamentoStatusAnterior: "PENDENTE" })).toBe("PENDENTE");
  });
  it("sem status guardado, deduz pelo processo", () => {
    expect(statusAposRecusa({ processId: "p1" })).toBe("EM_ANALISE");
    expect(statusAposRecusa({ processId: null })).toBe("PENDENTE");
  });
  it("ignora status guardado inválido", () => {
    expect(statusAposRecusa({ arquivamentoStatusAnterior: "ARQUIVADA", processId: null })).toBe("PENDENTE");
  });
});

describe("desarquivar", () => {
  it("só requisição arquivada pode ser desarquivada", () => {
    expect(podeDesarquivar({ status: "ARQUIVADA" })).toBe(true);
    for (const status of ["PENDENTE", "EM_ANALISE", "ARQUIVAMENTO_SOLICITADO", "CONCLUIDA", "RASCUNHO"]) {
      expect(podeDesarquivar({ status }), status).toBe(false);
    }
  });
  it("volta ao status de antes do arquivamento", () => {
    for (const anterior of ["PENDENTE", "EM_ANALISE", "DEVOLVIDA", "AGUARDANDO_LIBERACAO"]) {
      expect(statusAposDesarquivar({ arquivamentoStatusAnterior: anterior })).toBe(anterior);
    }
  });
  it("pergunta de duplicidade encerrada não reabre: vai para a fila", () => {
    expect(statusAposDesarquivar({ arquivamentoStatusAnterior: "AGUARDANDO_CLIENTE" })).toBe("PENDENTE");
  });
  it("sem status guardado, deduz pelos dados", () => {
    expect(statusAposDesarquivar({ processId: "p1" })).toBe("EM_ANALISE");
    expect(statusAposDesarquivar({ congeladaEm: new Date(), liberadaEm: null })).toBe("AGUARDANDO_LIBERACAO");
    expect(statusAposDesarquivar({ congeladaEm: new Date(), liberadaEm: new Date() })).toBe("PENDENTE");
    expect(statusAposDesarquivar({})).toBe("PENDENTE");
  });
  it("ignora status guardado que não é de retorno", () => {
    expect(statusAposDesarquivar({ arquivamentoStatusAnterior: "ARQUIVADA", processId: null })).toBe("PENDENTE");
  });
});
