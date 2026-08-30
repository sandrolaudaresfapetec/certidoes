/**
 * Integração com o SIGEF/INCRA via API SIGEFGEO (Conecta gov.br)
 *
 * API oficial: https://www.gov.br/conecta/catalogo/apis/sigef-geo
 * Endpoint produção: https://apigateway.conectagov.estaleiro.serpro.gov.br/api-sigef-geo/v1/parcelas
 * Acesso: exige adesão do órgão ao Conecta gov.br (client_id/client_secret OAuth2).
 *
 * Comportamento:
 *  - Se SIGEF_MOCK=true ou não houver credenciais configuradas, retorna dados
 *    SIMULADOS (determinísticos, derivados do CPF/CNPJ) para desenvolvimento.
 *  - Se houver credenciais, tenta a API real; em caso de falha, faz fallback
 *    para o modo simulado e registra o aviso no resultado.
 */

export interface SigefParcela {
  codigoImovel: string;
  geometria?: unknown; // GeoJSON (quando enriquecido com CAR)
  parcelaCodigo: string;
  nomeArea: string;
  detentorNome: string;
  detentorCpfCnpj: string;
  titularNome?: string;
  areaHectares: number;
  municipio: string;
  uf: string;
  status: string;
  situacaoInformada?: string;
  natureza?: string;
  registroMatricula?: string;
  dataAprovacao?: string;
}

export interface SigefConsultaResult {
  origem: "SIGEF_REAL" | "SIMULADO";
  parcelas: SigefParcela[];
  aviso?: string;
}

const SIGEF_BASE_URL =
  process.env.SIGEF_BASE_URL ||
  "https://apigateway.conectagov.estaleiro.serpro.gov.br/api-sigef-geo/v1";

const SIGEF_TOKEN_URL =
  process.env.SIGEF_TOKEN_URL ||
  "https://apigateway.conectagov.estaleiro.serpro.gov.br/oauth/v1";

// ---------------------------------------------------------------------------
// Mock determinístico (desenvolvimento / fallback)
// ---------------------------------------------------------------------------

const MOCK_LOCALIDADES = [
  { municipio: "Brotas", uf: "SP" },
  { municipio: "Holambra", uf: "SP" },
  { municipio: "Águas da Prata", uf: "SP" },
  { municipio: "São Pedro", uf: "SP" },
  { municipio: "Itirapina", uf: "SP" },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function gerarParcelasMock(cpfCnpjDigits: string): SigefParcela[] {
  const h = hashString(cpfCnpjDigits || "0");
  const qtd = (h % 2) + 1; // 1 ou 2 parcelas
  const parcelas: SigefParcela[] = [];

  for (let i = 0; i < qtd; i++) {
    const hi = hashString(cpfCnpjDigits + ":" + i);
    const loc = MOCK_LOCALIDADES[hi % MOCK_LOCALIDADES.length];
    const area = 1 + ((hi % 48000) / 100); // 1,00 ha a ~480 ha
    parcelas.push({
      codigoImovel: `9${String(10000000 + (hi % 89999999))}`,
      parcelaCodigo: `${(hi % 0xfffffff).toString(16).toUpperCase().padStart(8, "0")}-${(hi % 0xffff).toString(16).toUpperCase().padStart(4, "0")}`,
      nomeArea: `Imóvel Rural ${loc.municipio} - Gleba ${String.fromCharCode(65 + i)}`,
      detentorNome: "Titular simulado (SIGEF)",
      detentorCpfCnpj: cpfCnpjDigits,
      areaHectares: Math.round(area * 100) / 100,
      municipio: loc.municipio,
      uf: loc.uf,
      status: i === 0 ? "Certificada" : "Em processamento",
      situacaoInformada: "Regular",
      natureza: "Imóvel Rural",
      registroMatricula: `Matrícula ${10000 + (hi % 89999)} - CRI de ${loc.municipio}`,
      dataAprovacao: new Date(2023, hi % 12, (hi % 27) + 1).toISOString(),
    });
  }
  return parcelas;
}

// ---------------------------------------------------------------------------
// Autenticação OAuth2 (Conecta gov.br / SERPRO)
// ---------------------------------------------------------------------------

let tokenCache: { token: string; expiraEm: number } | null = null;

async function obterTokenConecta(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiraEm - 60_000) {
    return tokenCache.token;
  }

  const clientId = process.env.SIGEF_CLIENT_ID!;
  const clientSecret = process.env.SIGEF_CLIENT_SECRET!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(SIGEF_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Falha ao obter token Conecta gov.br (HTTP ${res.status})`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };

  tokenCache = {
    token: data.access_token,
    expiraEm: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return tokenCache.token;
}

// ---------------------------------------------------------------------------
// Consulta
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapearParcela(p: any): SigefParcela {
  return {
    codigoImovel: String(p.codigoImovel ?? ""),
    parcelaCodigo: String(p.parcelaCodigo ?? p.id ?? ""),
    nomeArea: String(p.nomeArea ?? ""),
    detentorNome: String(p.detentorNome ?? p.titularNome ?? ""),
    detentorCpfCnpj: String(p.detentorCpf ?? p.detentorCnpj ?? p.titularCpf ?? p.titularCnpj ?? ""),
    titularNome: p.titularNome ? String(p.titularNome) : undefined,
    areaHectares: Number(p.areaHectares ?? 0),
    municipio: String(p.municipio ?? ""),
    uf: String(p.uf ?? ""),
    status: String(p.status ?? ""),
    situacaoInformada: p.situacaoInformada ? String(p.situacaoInformada) : undefined,
    natureza: p.natureza ? String(p.natureza) : undefined,
    registroMatricula: p.registroMatricula ? String(p.registroMatricula) : undefined,
    dataAprovacao: p.dataAprovacao ? String(p.dataAprovacao) : undefined,
  };
}

/**
 * Vinculo simulado com imoveis REAIS: quando o acervo SIGEF/INCRA importado
 * (tabela SigefParcela) tem dados, o CPF e associado deterministicamente a
 * parcelas certificadas reais — atributos e geometria oficiais do shapefile.
 */
async function gerarParcelasDoAcervo(
  cpfCnpjDigits: string
): Promise<{ parcelas: SigefParcela[]; aviso: string } | null> {
  const { prisma } = await import("@/lib/prisma");
  const total = await prisma.sigefParcela.count();
  if (total === 0) return null;

  const h = hashString(cpfCnpjDigits || "0");
  const qtd = (h % 2) + 1; // 1 ou 2 parcelas
  const skip = h % Math.max(total - qtd + 1, 1);
  const linhas = await prisma.sigefParcela.findMany({
    skip,
    take: qtd,
    orderBy: { codigoParcela: "asc" },
  });
  if (linhas.length === 0) return null;

  return {
    parcelas: linhas.map((p) => ({
      codigoImovel: p.codigoImovel || p.codigoParcela,
      parcelaCodigo: p.codigoParcela,
      nomeArea: p.nomeArea || "Imóvel rural certificado",
      detentorNome: "Titular vinculado ao CPF (vínculo simulado)",
      detentorCpfCnpj: cpfCnpjDigits,
      areaHectares: p.areaHa ?? 0,
      municipio: p.municipio || String(p.municipioIbge ?? ""),
      uf: p.uf,
      status: p.status || "Certificada",
      situacaoInformada: p.situacaoImovel || undefined,
      natureza: "Imóvel Rural",
      registroMatricula: p.matricula || undefined,
      dataAprovacao: p.dataAprovacao?.toISOString(),
      geometria: JSON.parse(p.geometria),
    })),
    aviso:
      "Parcelas reais do acervo SIGEF/INCRA importado (vínculo ao CPF simulado — API Conecta gov.br não configurada).",
  };
}

/**
 * Versao enriquecida do mock: tenta buscar geometrias REAIS do CAR (SICAR)
 * e mescla com os atributos simulados (titular, codigo SIGEF). Se o CAR
 * estiver fora, cai no mock puro. Controlado por SIGEF_CAR (padrao: true).
 */
async function gerarParcelasMockComCar(cpfCnpjDigits: string): Promise<{ parcelas: SigefParcela[]; aviso?: string }> {
  const parcelas = gerarParcelasMock(cpfCnpjDigits);
  if ((process.env.SIGEF_CAR || "true").toLowerCase() !== "true") {
    return { parcelas };
  }
  try {
    const { buscarImoveisCar } = await import("@/lib/car");
    const imoveis = await buscarImoveisCar("SP", parcelas.length);
    imoveis.forEach((car, i) => {
      if (parcelas[i]) {
        parcelas[i].geometria = car.geometria;
        parcelas[i].municipio = car.municipio || parcelas[i].municipio;
        parcelas[i].uf = car.uf || parcelas[i].uf;
        parcelas[i].areaHectares = car.areaHa || parcelas[i].areaHectares;
        parcelas[i].nomeArea = `${parcelas[i].nomeArea} (CAR ${car.codImovel})`;
      }
    });
    return {
      parcelas,
      aviso: "Dados simulados enriquecidos com geometrias reais do CAR/SICAR (GeoServer publico).",
    };
  } catch {
    return { parcelas, aviso: "CAR indisponivel — usando geometrias 100% simuladas." };
  }
}

/**
 * Consulta as parcelas georreferenciadas de um CPF/CNPJ no SIGEF.
 * Nunca lança exceção: em qualquer falha, retorna dados simulados com aviso.
 */
export async function consultarParcelasSigef(
  cpfCnpj: string
): Promise<SigefConsultaResult> {
  const digits = cpfCnpj.replace(/\D/g, "");
  const mockForcado = (process.env.SIGEF_MOCK || "true").toLowerCase() === "true";
  const temCredenciais = Boolean(
    process.env.SIGEF_CLIENT_ID && process.env.SIGEF_CLIENT_SECRET
  );

  if (mockForcado || !temCredenciais) {
    const acervo = await gerarParcelasDoAcervo(digits).catch(() => null);
    if (acervo) {
      return { origem: "SIMULADO", parcelas: acervo.parcelas, aviso: acervo.aviso };
    }
    const mock = await gerarParcelasMockComCar(digits);
    return {
      origem: "SIMULADO",
      parcelas: mock.parcelas,
      aviso: temCredenciais
        ? "SIGEF_MOCK=true: retornando dados simulados."
        : "Credenciais do Conecta gov.br não configuradas (SIGEF_CLIENT_ID/SIGEF_CLIENT_SECRET). Retornando dados simulados.",
    };
  }

  try {
    const token = await obterTokenConecta();
    const paramDoc = digits.length === 11 ? "detentorCpf" : "detentorCnpj";
    const url = `${SIGEF_BASE_URL}/parcelas?${paramDoc}=${digits}&size=20`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`API SIGEFGEO respondeu HTTP ${res.status}`);
    }

    const data = await res.json();
    const content: any[] = data.content ?? data._embedded?.parcelas ?? [];
    return { origem: "SIGEF_REAL", parcelas: content.map(mapearParcela) };
  } catch (err) {
    const acervo = await gerarParcelasDoAcervo(digits).catch(() => null);
    if (acervo) {
      return {
        origem: "SIMULADO",
        parcelas: acervo.parcelas,
        aviso: `Falha na integração real com o SIGEF (${(err as Error).message}). ${acervo.aviso}`,
      };
    }
    const mock = await gerarParcelasMockComCar(digits);
    return {
      origem: "SIMULADO",
      parcelas: mock.parcelas,
      aviso: `Falha na integração real com o SIGEF (${(err as Error).message}). Retornando dados simulados.`,
    };
  }
}
