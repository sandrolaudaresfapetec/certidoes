import { NextRequest, NextResponse } from "next/server";
import {
  buscarImoveisCar,
  buscarImoveisPorBbox,
  buscarImovelNoPonto,
  buscarImovelPorCodigo,
} from "@/lib/car";
import { exigirUsuarioApi } from "@/lib/auth";

const FONTE = "CAR/SICAR (geoserver.car.gov.br)";

/**
 * GET /api/car/imoveis?uf=SP&quantidade=2  — imoveis ativos de demonstracao
 * GET /api/car/imoveis?codigo=SP-3500402-... — imovel especifico pelo codigo CAR
 * GET /api/car/imoveis?bbox=minLon,minLat,maxLon,maxLat — imoveis da janela do mapa
 * GET /api/car/imoveis?lon=-47.31&lat=-21.93 — imovel que contem o ponto clicado
 */
export async function GET(request: NextRequest) {
  const sessao = await exigirUsuarioApi();
  if ("erro" in sessao) return sessao.erro;

  const params = request.nextUrl.searchParams;
  const codigo = params.get("codigo");
  const bbox = params.get("bbox");
  const lon = params.get("lon");
  const lat = params.get("lat");
  const uf = params.get("uf") || "SP";
  try {
    if (lon && lat) {
      const imovel = await buscarImovelNoPonto(Number(lon), Number(lat), uf);
      if (!imovel) {
        return NextResponse.json(
          { error: "Nenhum imovel do CAR neste ponto. Clique sobre a area de um imovel." },
          { status: 404 }
        );
      }
      return NextResponse.json({ fonte: FONTE, imoveis: [imovel] });
    }

    if (bbox) {
      const [minLon, minLat, maxLon, maxLat] = bbox.split(",").map(Number);
      if ([minLon, minLat, maxLon, maxLat].some((n) => !Number.isFinite(n))) {
        return NextResponse.json(
          { error: "bbox invalido. Use bbox=minLon,minLat,maxLon,maxLat" },
          { status: 400 }
        );
      }
      const limite = Math.min(Number(params.get("limite") || 250), 500);
      const imoveis = await buscarImoveisPorBbox(minLon, minLat, maxLon, maxLat, limite, uf);
      return NextResponse.json({ fonte: FONTE, uf, imoveis });
    }

    if (codigo) {
      const imovel = await buscarImovelPorCodigo(codigo);
      if (!imovel) {
        return NextResponse.json(
          { error: `Imovel ${codigo} nao encontrado no CAR (SP).` },
          { status: 404 }
        );
      }
      return NextResponse.json({ fonte: FONTE, imoveis: [imovel] });
    }

    const qtd = Math.min(Number(params.get("quantidade") || 2), 10);
    const imoveis = await buscarImoveisCar(uf, qtd);
    return NextResponse.json({ fonte: FONTE, uf, imoveis });
  } catch (e) {
    const msg = (e as Error).message;
    const status = /invalid[ao]/i.test(msg) ? 400 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
