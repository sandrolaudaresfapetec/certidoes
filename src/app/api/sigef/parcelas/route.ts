import { NextRequest, NextResponse } from "next/server";
import {
  contarParcelas,
  parcelaNoPonto,
  parcelaPorCodigo,
  parcelasPorBbox,
} from "@/lib/sigef-parcelas";

const FONTE = "SIGEF/Acervo Fundiario (INCRA) — shapefile importado";

/**
 * GET /api/sigef/parcelas?bbox=minLon,minLat,maxLon,maxLat — parcelas da janela
 * GET /api/sigef/parcelas?lon=-47.31&lat=-21.93 — parcela que contem o ponto
 * GET /api/sigef/parcelas?codigo=<codigo da parcela> — parcela especifica
 * GET /api/sigef/parcelas?uf=SP — total importado da UF
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const bbox = params.get("bbox");
  const lon = params.get("lon");
  const lat = params.get("lat");
  const codigo = params.get("codigo");
  const uf = (params.get("uf") || "SP").trim().toUpperCase();

  try {
    if (lon && lat) {
      const lonNum = Number(lon);
      const latNum = Number(lat);
      if (!Number.isFinite(lonNum) || !Number.isFinite(latNum)) {
        return NextResponse.json({ error: "lon/lat invalidos." }, { status: 400 });
      }
      const parcela = await parcelaNoPonto(lonNum, latNum, uf);
      if (!parcela) {
        return NextResponse.json(
          { error: "Nenhuma parcela do SIGEF neste ponto. Clique sobre a area de uma parcela." },
          { status: 404 }
        );
      }
      return NextResponse.json({ fonte: FONTE, parcelas: [parcela] });
    }

    if (bbox) {
      const [minLon, minLat, maxLon, maxLat] = bbox.split(",").map(Number);
      if ([minLon, minLat, maxLon, maxLat].some((n) => !Number.isFinite(n))) {
        return NextResponse.json(
          { error: "bbox invalido. Use bbox=minLon,minLat,maxLon,maxLat" },
          { status: 400 }
        );
      }
      const limite = Math.min(Number(params.get("limite") || 300), 500);
      const parcelas = await parcelasPorBbox(minLon, minLat, maxLon, maxLat, limite, uf);
      return NextResponse.json({ fonte: FONTE, uf, parcelas });
    }

    if (codigo) {
      const parcela = await parcelaPorCodigo(codigo);
      if (!parcela) {
        return NextResponse.json(
          { error: `Parcela ${codigo} nao encontrada no acervo importado.` },
          { status: 404 }
        );
      }
      return NextResponse.json({ fonte: FONTE, parcelas: [parcela] });
    }

    return NextResponse.json({ fonte: FONTE, uf, total: await contarParcelas(uf) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
