"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface CamadaPoligono {
  /** Contorno da parcela (GeoJSON em lon/lat); null quando o acervo não tem a geometria. */
  geometria: unknown | null;
  rotulo: string;
  cor: string;
}

/** Mapa com o contorno de cada polígono, na cor e com o nome informados. Só no navegador. */
export default function MapaPoligonosLeaflet({
  camadas,
  descricao,
}: {
  camadas: CamadaPoligono[];
  descricao: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // O mapa só é refeito quando a combinação de rótulos, cores e geometrias muda.
  const chave = useMemo(
    () => JSON.stringify(camadas.map((c) => [c.rotulo, c.cor, JSON.stringify(c.geometria ?? null).length])),
    [camadas]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mapa = L.map(el, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(mapa);
    const grupo = L.featureGroup();
    for (const c of camadas) {
      if (!c.geometria) continue;
      L.geoJSON(c.geometria as GeoJSON.GeoJsonObject, {
        style: { color: c.cor, weight: 3, fillColor: c.cor, fillOpacity: 0.3 },
      })
        .bindTooltip(c.rotulo, { permanent: true, direction: "center" })
        .addTo(grupo);
    }
    grupo.addTo(mapa);
    if (grupo.getLayers().length > 0) {
      mapa.fitBounds(grupo.getBounds(), { padding: [24, 24], maxZoom: 17 });
    }
    return () => {
      mapa.remove();
    };
    // `chave` resume as camadas: o mapa só é refeito quando elas mudam de verdade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label={descricao}
      className="h-72 w-full overflow-hidden rounded-md border border-gray-300"
    />
  );
}
