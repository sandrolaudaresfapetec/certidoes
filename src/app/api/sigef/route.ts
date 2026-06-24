import { NextRequest } from "next/server";
import { buscarParcelaSigef, buscarParcelasPorMunicipio } from "@/lib/sigef";

export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("codigo");
  const municipio = request.nextUrl.searchParams.get("municipio");

  if (codigo) {
    const parcela = await buscarParcelaSigef(codigo);
    if (!parcela) {
      return Response.json(
        { error: "Parcela nao encontrada no SIGEF" },
        { status: 404 }
      );
    }
    return Response.json(parcela);
  }

  if (municipio) {
    const parcelas = await buscarParcelasPorMunicipio(municipio);
    return Response.json({ parcelas, total: parcelas.length });
  }

  return Response.json(
    { error: "Informe codigo da parcela ou codigo do municipio" },
    { status: 400 }
  );
}
