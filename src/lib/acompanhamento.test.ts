import { describe, expect, it } from "vitest";
import { acompanhamentoRequisicao } from "./requisicao-status";

const base = { pagamentoStatus: null, finalizadaEm: null };
const estados = (a: ReturnType<typeof acompanhamentoRequisicao>) =>
  a.tipo === "ETAPA" ? a.subetapas?.map((s) => s.estado[0]).join("") : undefined;

describe("acompanhamentoRequisicao: Atendimento", () => {
  it("sem documentos conferidos: checagem de documentos é a atual", () => {
    const a = acompanhamentoRequisicao({ ...base, situacaoProcesso: "entrada_sdtc" });
    expect(a).toMatchObject({ tipo: "ETAPA", atual: 1, detalhe: "Checagem de documentos" });
    expect(estados(a)).toBe("AP");
  });
  it("documentos conferidos e sem SEI: liberação do número SEI", () => {
    const a = acompanhamentoRequisicao({ ...base, situacaoProcesso: "entrada_sdtc", docsConferidosEm: new Date() });
    expect(a).toMatchObject({ atual: 1, detalhe: "Liberação do número SEI" });
    expect(estados(a)).toBe("FA");
  });
  it("o SEI sozinho não pula a checagem de documentos", () => {
    const a = acompanhamentoRequisicao({ ...base, situacaoProcesso: "entrada_sdtc", expediente: "123" });
    expect(a).toMatchObject({ detalhe: "Checagem de documentos" });
  });
  it("as duas feitas: as duas subetapas concluídas e nenhuma atual", () => {
    const a = acompanhamentoRequisicao({ ...base, situacaoProcesso: "entrada_sdtc", docsConferidosEm: new Date(), expediente: "123" });
    expect(estados(a)).toBe("FF");
    expect(a.tipo === "ETAPA" && a.detalhe).toBeUndefined();
  });
});

describe("acompanhamentoRequisicao: Setor Técnico", () => {
  it.each([
    ["distribuicao_gdat", "Triagem", "APPP"],
    ["analise_tecnica", "Elaboração da divisa", "FAPP"],
    ["conferencia", "Conferência da divisa", "FFAP"],
    ["assinatura_tecnico", "Expedição", "FFFA"],
  ])("%s é a subetapa %s", (situacaoProcesso, detalhe, esperado) => {
    const a = acompanhamentoRequisicao({ ...base, situacaoProcesso });
    expect(a).toMatchObject({ tipo: "ETAPA", atual: 2, detalhe });
    expect(estados(a)).toBe(esperado);
  });
  it("assinaturas do gerente e do diretor e o upload no SEI ficam em Documento em assinatura", () => {
    for (const s of ["assinatura_gerente", "assinatura_diretor", "upload_sei"]) {
      expect(acompanhamentoRequisicao({ ...base, situacaoProcesso: s })).toMatchObject({ atual: 3 });
    }
  });
});

describe("acompanhamentoRequisicao: pagamento e estados especiais", () => {
  it("finalizado: aguardando pagamento ou liberado para download", () => {
    expect(acompanhamentoRequisicao({ ...base, situacaoProcesso: "finalizado" })).toMatchObject({ atual: 4 });
    expect(acompanhamentoRequisicao({ ...base, situacaoProcesso: "finalizado", pagamentoStatus: "PAGO" })).toMatchObject({ atual: 5 });
    expect(acompanhamentoRequisicao({ ...base, situacaoProcesso: "finalizado", pagamentoStatus: "ISENTO" })).toMatchObject({ atual: 5 });
  });
  it("sobrestado, cancelado e arquivada", () => {
    expect(acompanhamentoRequisicao({ ...base, situacaoProcesso: "sobrestado" }).tipo).toBe("SOBRESTADO");
    expect(acompanhamentoRequisicao({ ...base, situacaoProcesso: "cancelado" }).tipo).toBe("CANCELADO");
    expect(acompanhamentoRequisicao({ ...base, situacaoProcesso: null, statusRequisicao: "ARQUIVADA" }).tipo).toBe("ARQUIVADA");
    expect(acompanhamentoRequisicao({ ...base, situacaoProcesso: "analise_tecnica", statusRequisicao: "ARQUIVADA" }).tipo).toBe("ARQUIVADA");
  });
});

describe("acompanhamentoRequisicao: antes do processo", () => {
  const sem = { ...base, situacaoProcesso: null };
  const titulo = (statusRequisicao: string, analiseDuplicidadeEm?: Date | null) => {
    const a = acompanhamentoRequisicao({ ...sem, statusRequisicao, analiseDuplicidadeEm });
    return a.tipo === "ETAPA" ? a.aviso?.titulo : undefined;
  };
  it("fica na conformidade mínima com um aviso da situação", () => {
    expect(acompanhamentoRequisicao({ ...sem, statusRequisicao: "PENDENTE" })).toMatchObject({ atual: 0 });
    expect(titulo("DEVOLVIDA")).toMatch(/Devolvida/);
    expect(titulo("AGUARDANDO_LIBERACAO")).toMatch(/liberação/);
    expect(titulo("AGUARDANDO_CLIENTE")).toMatch(/resposta/);
    expect(titulo("RASCUNHO")).toMatch(/Liberada/);
    expect(titulo("ARQUIVAMENTO_SOLICITADO")).toMatch(/arquivamento/);
  });
  it("pendente: análise de duplicidade ou aguardando abertura do processo", () => {
    expect(titulo("PENDENTE", null)).toMatch(/duplicidade/);
    expect(titulo("PENDENTE", new Date())).toMatch(/abertura do processo/);
  });
  it("requisição já finalizada sem processo vai para pagamento", () => {
    expect(acompanhamentoRequisicao({ ...sem, finalizadaEm: new Date() })).toMatchObject({ atual: 4 });
  });
});
