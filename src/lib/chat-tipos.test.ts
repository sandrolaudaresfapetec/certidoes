import { describe, expect, it } from "vitest";
import {
  LIMITE_TEXTO_CHAT,
  chatAceitaMensagens,
  chatVisivel,
  contarNaoLidas,
  validarTextoMensagem,
} from "./chat-tipos";

describe("validarTextoMensagem", () => {
  it("recusa texto vazio ou só com espaços", () => {
    expect(validarTextoMensagem("   ")).toMatchObject({ ok: false });
    expect(validarTextoMensagem(undefined)).toMatchObject({ ok: false });
    expect(validarTextoMensagem(42)).toMatchObject({ ok: false });
  });

  it("apara espaços e aceita até o limite", () => {
    expect(validarTextoMensagem("  oi  ")).toEqual({ ok: true, texto: "oi" });
    expect(validarTextoMensagem("a".repeat(LIMITE_TEXTO_CHAT))).toMatchObject({ ok: true });
    expect(validarTextoMensagem("a".repeat(LIMITE_TEXTO_CHAT + 1))).toMatchObject({ ok: false });
  });
});

describe("estado do chat por status", () => {
  it("não existe em rascunho e só lê em arquivada", () => {
    expect(chatVisivel("RASCUNHO")).toBe(false);
    expect(chatAceitaMensagens("RASCUNHO")).toBe(false);
    expect(chatVisivel("ARQUIVADA")).toBe(true);
    expect(chatAceitaMensagens("ARQUIVADA")).toBe(false);
  });

  it.each(["PENDENTE", "EM_ANALISE", "DEVOLVIDA", "AGUARDANDO_LIBERACAO", "AGUARDANDO_CLIENTE", "CONCLUIDA"])(
    "aceita mensagens em %s",
    (status) => {
      expect(chatAceitaMensagens(status)).toBe(true);
    }
  );
});

describe("contarNaoLidas", () => {
  const t = (min: number) => new Date(Date.UTC(2026, 9, 7, 12, min));
  const mensagens = [
    { autorTipo: "SOLICITANTE", createdAt: t(1) },
    { autorTipo: "ATENDIMENTO", createdAt: t(2) },
    { autorTipo: "SISTEMA", createdAt: t(3) },
    { autorTipo: "SOLICITANTE", createdAt: t(4) },
  ];

  it("o solicitante vê como novas as do atendimento e do sistema", () => {
    expect(contarNaoLidas(mensagens, null, "SOLICITANTE")).toBe(2);
    expect(contarNaoLidas(mensagens, t(2), "SOLICITANTE")).toBe(1);
    expect(contarNaoLidas(mensagens, t(3), "SOLICITANTE")).toBe(0);
  });

  it("o atendimento só vê como novas as do solicitante", () => {
    expect(contarNaoLidas(mensagens, null, "ATENDIMENTO")).toBe(2);
    expect(contarNaoLidas(mensagens, t(1), "ATENDIMENTO")).toBe(1);
    expect(contarNaoLidas(mensagens, t(4), "ATENDIMENTO")).toBe(0);
  });
});
