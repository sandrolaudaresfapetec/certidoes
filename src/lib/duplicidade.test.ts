import { describe, expect, it } from "vitest";
import {
  chaveDuplicidade,
  classificarPar,
  codigosDasParcelas,
  compararParcelas,
  escolherPergunta,
  lerChaveDuplicidade,
  lerSobreposicao,
  mesmoCadastro,
  textoDaPergunta,
  type Achado,
  type ParcelaGeo,
  type RequisicaoComparavel,
} from "./duplicidade";

// Quadrados de ~1 km (0,01 grau) a 23°S: cerca de 100 ha cada.
function quadrado(lon: number, lat: number, lado = 0.01): ParcelaGeo["geometria"] {
  return {
    type: "Polygon",
    coordinates: [[[lon, lat], [lon + lado, lat], [lon + lado, lat + lado], [lon, lat + lado], [lon, lat]]],
  };
}
const P1: ParcelaGeo = { codigo: "P1", geometria: quadrado(-47, -23) };
const P1_COPIA: ParcelaGeo = { codigo: "P1-OUTRO-CODIGO", geometria: quadrado(-47, -23) };
const P2_VIZINHA: ParcelaGeo = { codigo: "P2", geometria: quadrado(-46.99, -23) }; // encosta no lado leste
const P3_METADE: ParcelaGeo = { codigo: "P3", geometria: quadrado(-46.995, -23) }; // cobre metade de P1
const P4_LONGE: ParcelaGeo = { codigo: "P4", geometria: quadrado(-45, -22) };

const cadastro = { cjtQualidade: "1b", cjtResultado: "2b", cjtSituacao: "3d", cjtMatricula: "123" };

function req(id: string, parcelas: ParcelaGeo[], extra: Partial<RequisicaoComparavel> = {}): RequisicaoComparavel {
  return {
    id,
    protocolo: `CERT-2026-${id}`,
    solicitanteId: "u1",
    status: "PENDENTE",
    processId: null,
    finalizadaEm: null,
    createdAt: new Date("2026-10-01T10:00:00Z"),
    parcelas,
    cadastro,
    ...extra,
  };
}

describe("compararParcelas", () => {
  it("mesmo código é a mesma geometria, mesmo sem contorno no acervo", () => {
    expect(compararParcelas([{ codigo: "X", geometria: null }], [{ codigo: "X", geometria: null }]).relacao).toBe("MESMA");
  });
  it("contorno praticamente igual com outro código é a mesma geometria", () => {
    expect(compararParcelas([P1], [P1_COPIA]).relacao).toBe("MESMA");
  });
  it("vizinhas que só se encostam não são sobreposição", () => {
    expect(compararParcelas([P1], [P2_VIZINHA]).relacao).toBe("NENHUMA");
  });
  it("cobrir metade da menor parcela é sobreposição", () => {
    const r = compararParcelas([P1], [P3_METADE]);
    expect(r.relacao).toBe("SOBREPOSICAO");
    expect(r.fracao).toBeGreaterThan(0.4);
  });
  it("parcelas distantes não têm relação", () => {
    expect(compararParcelas([P1], [P4_LONGE]).relacao).toBe("NENHUMA");
  });
  it("sem parcelas de um dos lados não compara", () => {
    expect(compararParcelas([], [P1]).relacao).toBe("NENHUMA");
  });
  it("conjunto maior que contém a parcela é sobreposição, não a mesma geometria", () => {
    expect(compararParcelas([P1], [P1_COPIA, P4_LONGE]).relacao).toBe("SOBREPOSICAO");
  });
  it("mesmo conjunto de polígonos, em outra ordem, é a mesma geometria", () => {
    expect(compararParcelas([P1, P4_LONGE], [P4_LONGE, P1_COPIA]).relacao).toBe("MESMA");
  });
  it("geometria inválida não derruba a comparação", () => {
    const ruim: ParcelaGeo = { codigo: "RUIM", geometria: { type: "Polygon", coordinates: [] } };
    expect(() => compararParcelas([ruim], [P1])).not.toThrow();
  });
});

describe("classificarPar", () => {
  it("S1: mesma geometria e cadastro, outra finalizada, mesmo solicitante", () => {
    const a = classificarPar(req("nova", [P1]), req("velha", [P1_COPIA], { status: "CONCLUIDA", finalizadaEm: new Date() }));
    expect(a?.situacao).toBe("S1");
  });
  it("S2: mesma geometria, cadastro diferente, outra finalizada", () => {
    const outra = req("velha", [P1], { status: "CONCLUIDA", finalizadaEm: new Date(), cadastro: { ...cadastro, cjtMatricula: "999" } });
    expect(classificarPar(req("nova", [P1]), outra)?.situacao).toBe("S2");
  });
  it("S3: mesma geometria e cadastro, outra em andamento e sem processo", () => {
    expect(classificarPar(req("nova", [P1]), req("outra", [P1]))?.situacao).toBe("S3");
    expect(classificarPar(req("nova", [P1]), req("outra", [P1], { status: "AGUARDANDO_CLIENTE" }))?.situacao).toBe("S3");
  });
  it("S3 vira S4 quando a outra já tem processo aberto", () => {
    const a = classificarPar(req("nova", [P1]), req("outra", [P1], { status: "EM_ANALISE", processId: "p1" }));
    expect(a?.situacao).toBe("S4");
  });
  it("S3 vira S4 quando a outra foi devolvida", () => {
    expect(classificarPar(req("nova", [P1]), req("outra", [P1], { status: "DEVOLVIDA" }))?.situacao).toBe("S4");
  });
  it("em andamento com cadastro diferente é S4", () => {
    const outra = req("outra", [P1], { cadastro: { ...cadastro, cjtMatricula: "999" } });
    expect(classificarPar(req("nova", [P1]), outra)?.situacao).toBe("S4");
  });
  it("solicitantes diferentes caem em S4, mesmo finalizada", () => {
    const outra = req("velha", [P1], { solicitanteId: "u2", status: "CONCLUIDA", finalizadaEm: new Date() });
    expect(classificarPar(req("nova", [P1]), outra)?.situacao).toBe("S4");
  });
  it("sobreposição parcial é sempre S4", () => {
    const a = classificarPar(req("nova", [P1]), req("outra", [P3_METADE]));
    expect(a?.situacao).toBe("S4");
    expect(a?.motivo).toContain("%");
  });
  it("sem relação geométrica não há achado", () => {
    expect(classificarPar(req("nova", [P1]), req("outra", [P4_LONGE]))).toBeNull();
  });
  it("ignora rascunho, arquivada e a própria requisição", () => {
    for (const status of ["RASCUNHO", "ARQUIVADA", "AGUARDANDO_LIBERACAO", "ARQUIVAMENTO_SOLICITADO"]) {
      expect(classificarPar(req("nova", [P1]), req("outra", [P1], { status }))).toBeNull();
    }
    expect(classificarPar(req("a", [P1]), req("a", [P1]))).toBeNull();
  });
});

describe("escolherPergunta", () => {
  const achado = (situacao: Achado["situacao"], id: string, dia: number): Achado => ({
    situacao,
    outra: { id, protocolo: `C-${id}`, status: "PENDENTE", finalizadaEm: null, createdAt: new Date(2026, 9, dia) },
    relacao: "MESMA",
    mesmoCadastro: true,
    fracao: 1,
    motivo: "x",
  });
  it("S3 vence S1, que vence S2; S4 nunca vira pergunta", () => {
    const r = escolherPergunta([achado("S4", "a", 5), achado("S2", "b", 4), achado("S1", "c", 3), achado("S3", "d", 1)]);
    expect(r.pergunta?.outra.id).toBe("d");
    expect(r.demais.map((x) => x.outra.id).sort()).toEqual(["a", "b", "c"]);
  });
  it("no empate escolhe a mais recente", () => {
    expect(escolherPergunta([achado("S1", "velha", 1), achado("S1", "nova", 9)]).pergunta?.outra.id).toBe("nova");
  });
  it("só S4 não gera pergunta", () => {
    expect(escolherPergunta([achado("S4", "a", 1)]).pergunta).toBeNull();
  });
});

describe("apoio", () => {
  it("mesmo cadastro ignora caixa e espaços", () => {
    expect(mesmoCadastro({ cjtMatricula: " ABC " }, { cjtMatricula: "abc" })).toBe(true);
    expect(mesmoCadastro({ cjtMatricula: "1" }, { cjtMatricula: "2" })).toBe(false);
    expect(mesmoCadastro({ emNomeDeCpf: "111" }, {})).toBe(false);
  });
  it("códigos das parcelas juntam o principal e os polígonos, sem repetir", () => {
    const cjtPoligonos = JSON.stringify([
      { nome: "A", parcelaCodigo: "P1" },
      { nome: "B", parcelaCodigo: "P2" },
    ]);
    expect(codigosDasParcelas({ sigefParcelaCodigo: "P1", cjtPoligonos }).sort()).toEqual(["P1", "P2"]);
    expect(codigosDasParcelas({})).toEqual([]);
  });
  it("chave da pergunta é estável e reversível", () => {
    const chave = chaveDuplicidade("S3", "abc123");
    expect(chave).toBe("DUP:S3:abc123");
    expect(lerChaveDuplicidade(chave)).toEqual({ situacao: "S3", idOutra: "abc123" });
    expect(lerChaveDuplicidade("OUTRA")).toBeNull();
    expect(lerChaveDuplicidade(null)).toBeNull();
  });
  it("texto da pergunta cita os protocolos", () => {
    const a: Achado = {
      situacao: "S3",
      outra: { id: "o", protocolo: "CERT-2", status: "PENDENTE", finalizadaEm: null, createdAt: new Date() },
      relacao: "MESMA",
      mesmoCadastro: true,
      fracao: 1,
      motivo: "",
    };
    const t = textoDaPergunta(a, "CERT-1");
    expect(t).toContain("CERT-1");
    expect(t).toContain("CERT-2");
  });
  it("lerSobreposicao tolera lixo", () => {
    expect(lerSobreposicao("não é json")).toEqual([]);
    expect(lerSobreposicao(null)).toEqual([]);
    expect(lerSobreposicao(JSON.stringify([{ id: "a", protocolo: "P", situacao: "S4", motivo: "m" }, { x: 1 }]))).toHaveLength(1);
  });
});
