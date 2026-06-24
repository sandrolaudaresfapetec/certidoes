const SIGEF_BASE_URL = "https://sigef.incra.gov.br/geo/parcela/json";

export interface SigefParcela {
  codigoParcela: string;
  status: string;
  area: number;
  municipio: string;
  uf: string;
  detentor: string;
  matricula: string;
  geometria: {
    type: string;
    coordinates: number[][][];
  } | null;
}

export async function buscarParcelaSigef(
  codigoParcela: string
): Promise<SigefParcela | null> {
  try {
    const response = await fetch(`${SIGEF_BASE_URL}/${codigoParcela}/`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      codigoParcela: data.parcela_codigo || codigoParcela,
      status: data.status || "Desconhecido",
      area: data.area_ha || 0,
      municipio: data.municipio || "",
      uf: data.uf || "SP",
      detentor: data.detentor || "",
      matricula: data.matricula || "",
      geometria: data.geometry || null,
    };
  } catch {
    return null;
  }
}

export async function buscarParcelasPorMunicipio(
  codigoMunicipio: string
): Promise<SigefParcela[]> {
  try {
    const response = await fetch(
      `https://sigef.incra.gov.br/geo/parcela/json/?municipio=${codigoMunicipio}&limit=50`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data.features)) return [];

    return data.features.map(
      (f: { properties: Record<string, string | number>; geometry: { type: string; coordinates: number[][][] } | null }) => ({
        codigoParcela: f.properties.parcela_codigo || "",
        status: (f.properties.status as string) || "",
        area: (f.properties.area_ha as number) || 0,
        municipio: (f.properties.municipio as string) || "",
        uf: (f.properties.uf as string) || "SP",
        detentor: (f.properties.detentor as string) || "",
        matricula: (f.properties.matricula as string) || "",
        geometria: f.geometry || null,
      })
    );
  } catch {
    return [];
  }
}
