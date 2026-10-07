"use client";

import dynamic from "next/dynamic";

/** O Leaflet precisa do navegador: o mapa só é montado no cliente (`ssr: false`). */
const MapaImovelLeaflet = dynamic(() => import("./mapa-imovel-leaflet"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-md border border-gray-300 bg-gray-50 text-sm text-gray-600">
      Carregando mapa…
    </div>
  ),
});

/**
 * Contorno do imóvel no mapa. Sem geometria, mostra o aviso em vez de um mapa vazio.
 * `descricao` é lida por tecnologias assistivas (ex.: "Contorno do imóvel X, 11,72 ha, Município/UF").
 */
export function MapaImovel({
  geometria,
  descricao,
}: {
  geometria: unknown | null | undefined;
  descricao: string;
}) {
  if (!geometria) {
    return (
      <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
        Mapa indisponível para este imóvel.
      </p>
    );
  }
  return <MapaImovelLeaflet geometria={geometria} descricao={descricao} />;
}
