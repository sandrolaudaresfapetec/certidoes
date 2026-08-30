import { NextRequest, NextResponse } from "next/server";
import { buscarImoveisCar, buscarImovelPorCodigo } from "@/lib/car";

/**
 * GET /api/car/imoveis?uf=SP&quantidade=2  — imoveis ativos de demonstracao
 * GET /api/car/imoveis?codigo=SP-3500402-... — imovel especifico pelo codigo CAR
 */
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("codigo");
  try {
    if (codigo) {
      const imovel = await buscarImovelPorCodigo(codigo);
      if (!imovel) {
        return NextResponse.json(
          { error: `Imovel ${codigo} nao encontrado no CAR (SP).` },
          { status: 404 }
        );
      }
      return NextResponse.json({ fonte: "CAR/SICAR (geoserver.car.gov.br)", imoveis: [imovel] });
    }
    const uf = request.nextUrl.searchParams.get("uf") || "SP";
    const qtd = Math.min(Number(request.nextUrl.searchParams.get("quantidade") || 2), 10);
    const imoveis = await buscarImoveisCar(uf, qtd);
    return NextResponse.json({ fonte: "CAR/SICAR (geoserver.car.gov.br)", uf, imoveis });
  } catch (e) {
    const msg = (e as Error).message;
    const status = msg.includes("Formato invalido") ? 400 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
