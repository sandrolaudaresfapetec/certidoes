"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Mapa com o contorno do imóvel (GeoJSON em lon/lat). Carregado só no navegador. */
export default function MapaImovelLeaflet({
  geometria,
  descricao,
}: {
  geometria: unknown;
  descricao: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mapa = L.map(el, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(mapa);
    const contorno = L.geoJSON(geometria as GeoJSON.GeoJsonObject, {
      style: { color: "#047857", weight: 2.5, fillColor: "#047857", fillOpacity: 0.22 },
    }).addTo(mapa);
    mapa.fitBounds(contorno.getBounds(), { padding: [24, 24], maxZoom: 17 });
    return () => {
      mapa.remove();
    };
  }, [geometria]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label={descricao}
      className="h-72 w-full overflow-hidden rounded-md border border-gray-300"
    />
  );
}
