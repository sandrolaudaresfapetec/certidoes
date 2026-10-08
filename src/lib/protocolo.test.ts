import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { solicitacao: { findFirst } } }));

import {
  criarComProtocolo,
  formatarProtocolo,
  proximoProtocolo,
  sequencialDoProtocolo,
} from "./protocolo";

describe("formato do protocolo", () => {
  it("preenche o sequencial com zeros", () => {
    expect(formatarProtocolo(2026, 7)).toBe("CERT-2026-000007");
    expect(formatarProtocolo(2026, 1234567)).toBe("CERT-2026-1234567");
  });

  it("lê o sequencial só do ano pedido", () => {
    expect(sequencialDoProtocolo("CERT-2026-000014", 2026)).toBe(14);
    expect(sequencialDoProtocolo("CERT-2025-000014", 2026)).toBeNull();
    expect(sequencialDoProtocolo("lixo", 2026)).toBeNull();
  });
});

describe("proximoProtocolo", () => {
  beforeEach(() => findFirst.mockReset());

  it("começa em 1 no ano sem requisições", async () => {
    findFirst.mockResolvedValue(null);
    expect(await proximoProtocolo(new Date("2027-01-02T12:00:00"))).toBe("CERT-2027-000001");
  });

  it("soma 1 ao maior sequencial do ano", async () => {
    findFirst.mockResolvedValue({ protocolo: "CERT-2026-000014" });
    expect(await proximoProtocolo(new Date("2026-10-07T12:00:00"))).toBe("CERT-2026-000015");
  });
});

describe("criarComProtocolo", () => {
  beforeEach(() => findFirst.mockReset());

  it("tenta de novo quando outro pedido ganhou o mesmo número", async () => {
    const ano = new Date().getFullYear();
    findFirst
      .mockResolvedValueOnce({ protocolo: `CERT-${ano}-000014` })
      .mockResolvedValueOnce({ protocolo: `CERT-${ano}-000015` });
    const criar = vi
      .fn<(p: string) => Promise<{ protocolo: string }>>()
      .mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "P2002" }))
      .mockImplementation(async (p) => ({ protocolo: p }));

    const r = await criarComProtocolo(criar);
    expect(criar).toHaveBeenCalledTimes(2);
    expect(criar).toHaveBeenNthCalledWith(1, `CERT-${ano}-000015`);
    expect(r.protocolo).toBe(`CERT-${ano}-000016`);
  });

  it("não engole erro que não é de unicidade", async () => {
    findFirst.mockResolvedValue(null);
    const criar = vi.fn().mockRejectedValue(new Error("falha no banco"));
    await expect(criarComProtocolo(criar)).rejects.toThrow("falha no banco");
    expect(criar).toHaveBeenCalledTimes(1);
  });

  it("desiste depois de várias colisões", async () => {
    findFirst.mockResolvedValue(null);
    const criar = vi.fn().mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    await expect(criarComProtocolo(criar, 3)).rejects.toThrow("unique");
    expect(criar).toHaveBeenCalledTimes(3);
  });
});
