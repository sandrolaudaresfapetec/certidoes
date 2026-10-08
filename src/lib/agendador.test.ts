import { beforeEach, describe, expect, it, vi } from "vitest";

const { execucao, executarAnalise } = vi.hoisted(() => ({
  execucao: {
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
  },
  executarAnalise: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { execucaoAgendada: execucao } }));
vi.mock("@/lib/duplicidade-servidor", () => ({ executarAnalise }));

import { chaveDoSlot, executarManual, executarSlot, proximoHorario, slotDe, TEMPO_LIMITE_EXECUCAO_MS } from "./agendador";

const RESUMO = { analisadas: 2, liberadas: 2, comPergunta: 0, comSobreposicao: 0, semGeometria: 0, jaAnalisadas: 0, erros: 0 };
// 15:00 UTC = 12:00 em Brasília (UTC-3).
const MEIO_DIA = new Date("2026-10-07T15:00:00Z");

beforeEach(() => {
  vi.resetAllMocks();
  executarAnalise.mockResolvedValue(RESUMO);
});

describe("slotDe", () => {
  it("usa o horário de Brasília, não o UTC", () => {
    expect(slotDe(new Date("2026-10-07T14:59:00Z"))).toBe("2026-10-07T00"); // 11:59 em Brasília
    expect(slotDe(new Date("2026-10-07T15:00:00Z"))).toBe("2026-10-07T12"); // 12:00
    expect(slotDe(new Date("2026-10-08T02:59:00Z"))).toBe("2026-10-07T12"); // 23:59
    expect(slotDe(new Date("2026-10-08T03:00:00Z"))).toBe("2026-10-08T00"); // 00:00 do dia seguinte
  });
  it("a chave do horário é estável", () => {
    expect(chaveDoSlot("2026-10-07T12")).toBe("duplicidade:2026-10-07T12");
  });
});

describe("proximoHorario", () => {
  it("antes do meio-dia a próxima é 12:00 de hoje; depois, 00:00 de amanhã", () => {
    expect(proximoHorario(new Date("2026-10-07T13:00:00Z"))).toEqual({ hora: "12:00", quando: "hoje" });
    expect(proximoHorario(MEIO_DIA)).toEqual({ hora: "00:00", quando: "amanhã" });
  });
});

describe("executarSlot", () => {
  it("horário novo: grava a execução, roda e conclui", async () => {
    execucao.findUnique.mockResolvedValue(null);
    execucao.create.mockResolvedValue({ id: "e1" });
    const r = await executarSlot(MEIO_DIA);
    expect(r).toEqual({ executou: true, slot: "2026-10-07T12", resumo: RESUMO });
    expect(execucao.create).toHaveBeenCalledWith({
      data: { chave: "duplicidade:2026-10-07T12", tipo: "duplicidade", iniciadaEm: MEIO_DIA },
    });
    expect(execucao.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "e1" }, data: expect.objectContaining({ concluidaEm: expect.any(Date) }) })
    );
    expect(executarAnalise).toHaveBeenCalledTimes(1);
  });

  it("horário já concluído não roda de novo", async () => {
    execucao.findUnique.mockResolvedValue({ id: "e1", concluidaEm: new Date(), iniciadaEm: MEIO_DIA });
    const r = await executarSlot(MEIO_DIA);
    expect(r).toEqual({ executou: false, slot: "2026-10-07T12", motivo: "JA_EXECUTADO" });
    expect(executarAnalise).not.toHaveBeenCalled();
  });

  it("execução em andamento (recente) não roda em paralelo", async () => {
    execucao.findUnique.mockResolvedValue({ id: "e1", concluidaEm: null, iniciadaEm: new Date(MEIO_DIA.getTime() - 60_000) });
    const r = await executarSlot(MEIO_DIA);
    expect(r).toMatchObject({ executou: false, motivo: "EM_EXECUCAO" });
    expect(executarAnalise).not.toHaveBeenCalled();
  });

  it("perdeu a disputa pela gravação do horário (duas instâncias): não roda", async () => {
    execucao.findUnique.mockResolvedValue(null);
    execucao.create.mockRejectedValue({ code: "P2002" });
    const r = await executarSlot(MEIO_DIA);
    expect(r).toMatchObject({ executou: false, motivo: "EM_EXECUCAO" });
    expect(executarAnalise).not.toHaveBeenCalled();
  });

  it("execução travada é retomada por quem trocar o início antigo pelo novo", async () => {
    const antigo = new Date(MEIO_DIA.getTime() - TEMPO_LIMITE_EXECUCAO_MS - 1000);
    execucao.findUnique.mockResolvedValue({ id: "e1", concluidaEm: null, iniciadaEm: antigo });
    execucao.updateMany.mockResolvedValue({ count: 1 });
    const r = await executarSlot(MEIO_DIA);
    expect(r).toMatchObject({ executou: true });
    expect(execucao.updateMany).toHaveBeenCalledWith({
      where: { id: "e1", concluidaEm: null, iniciadaEm: antigo },
      data: { iniciadaEm: MEIO_DIA },
    });
  });

  it("execução travada: se outra instância retomou primeiro, esta não roda", async () => {
    const antigo = new Date(MEIO_DIA.getTime() - TEMPO_LIMITE_EXECUCAO_MS - 1000);
    execucao.findUnique.mockResolvedValue({ id: "e1", concluidaEm: null, iniciadaEm: antigo });
    execucao.updateMany.mockResolvedValue({ count: 0 });
    const r = await executarSlot(MEIO_DIA);
    expect(r).toMatchObject({ executou: false, motivo: "EM_EXECUCAO" });
    expect(executarAnalise).not.toHaveBeenCalled();
  });

  it("se a análise falhar a execução não é concluída (o horário será retomado)", async () => {
    execucao.findUnique.mockResolvedValue(null);
    execucao.create.mockResolvedValue({ id: "e1" });
    executarAnalise.mockRejectedValue(new Error("banco fora"));
    await expect(executarSlot(MEIO_DIA)).rejects.toThrow("banco fora");
    expect(execucao.update).not.toHaveBeenCalled();
  });
});

describe("executarManual", () => {
  it("registra a execução com chave própria, roda a análise e conclui", async () => {
    execucao.create.mockResolvedValue({ id: "m1" });
    const resumo = await executarManual(MEIO_DIA);
    expect(resumo).toEqual(RESUMO);
    const chave = execucao.create.mock.calls[0][0].data.chave as string;
    expect(chave.startsWith("duplicidade:manual:")).toBe(true);
    expect(chave).not.toBe(chaveDoSlot("2026-10-07T12"));
    expect(execucao.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "m1" }, data: expect.objectContaining({ concluidaEm: expect.any(Date) }) })
    );
  });
});
