"use client";

import dynamic from "next/dynamic";
import type { CamadaPoligono } from "./mapa-poligonos-leaflet";

export type { CamadaPoligono };

/** O Leaflet precisa do navegador: o mapa só é montado no cliente (`ssr: false`). */
const MapaPoligonosLeaflet = dynamic(() => import("./mapa-poligonos-leaflet"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-md border border-gray-300 bg-gray-50 text-sm text-gray-600">
      Carregando mapa…
    </div>
  ),
});

/**
 * Contornos dos polígonos nomeados, cada um na sua cor, com a legenda ao lado. A cor nunca é a
 * única pista: o nome aparece no mapa e na legenda, e quem não tem geometria é avisado.
 */
export function MapaPoligonos({
  camadas,
  descricao,
}: {
  camadas: CamadaPoligono[];
  descricao: string;
}) {
  const comGeometria = camadas.filter((c) => c.geometria);
  return (
    <div className="space-y-2">
      {comGeometria.length > 0 ? (
        <MapaPoligonosLeaflet camadas={camadas} descricao={descricao} />
      ) : (
        <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
          Mapa indisponível para estes polígonos.
        </p>
      )}
      {camadas.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
          {camadas.map((c) => (
            <li key={c.rotulo} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-sm border border-gray-400"
                style={{ background: c.cor }}
                aria-hidden="true"
              />
              {c.rotulo}
              {!c.geometria && <span className="text-gray-500">(mapa indisponível)</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
