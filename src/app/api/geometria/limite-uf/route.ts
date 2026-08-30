import { NextRequest, NextResponse } from "next/server";

/** Codigos IBGE das UFs aceitas (o sistema atende SP, as demais ficam disponiveis para consulta). */
const UF_IBGE: Record<string, string> = {
  SP: "35",
  MG: "31",
  PR: "41",
  MS: "50",
  RJ: "33",
  GO: "52",
};

const MALHAS_IBGE = "https://servicodados.ibge.gov.br/api/v3/malhas/estados";

/** GET /api/geometria/limite-uf?uf=SP — limite estadual (malha IBGE) para enquadrar o mapa. */
export async function GET(request: NextRequest) {
  const uf = (request.nextUrl.searchParams.get("uf") || "SP").toUpperCase();
  const codigo = UF_IBGE[uf];
  if (!codigo) {
    return NextResponse.json({ error: `UF ${uf} nao suportada.` }, { status: 400 });
  }
  const url =
    `${MALHAS_IBGE}/${codigo}?formato=application/vnd.geo+json&qualidade=intermediaria`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`IBGE respondeu HTTP ${res.status}`);
    const geojson = await res.json();
    return NextResponse.json({ uf, fonte: "Malhas territoriais IBGE", geojson });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
