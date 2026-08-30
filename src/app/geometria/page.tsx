"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { Scissors, Loader2, Map as MapIcon, MousePointerClick, Tractor } from "lucide-react";

/** Poligono de demonstracao: cobre a triplice Brotas / Torrinha / Sao Pedro (SP). */
const IMOVEL_EXEMPLO = {
  type: "Feature",
  properties: {
    nome: "Imovel de exemplo (SP)",
    municipios: ["Brotas", "Torrinha", "Sao Pedro"],
  },
  geometry: {
    type: "Polygon",
    coordinates: [[[-48.15, -22.40], [-48.05, -22.40], [-48.05, -22.30], [-48.15, -22.30], [-48.15, -22.40]]],
  },
};

const ROTULO_EXEMPLO = "Imovel de exemplo — Brotas / Torrinha / Sao Pedro (SP) · 11.436 ha";

const CORES = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6"];

const CAR_WMS = "https://geoserver.car.gov.br/geoserver/sicar/wms";
/** Zoom minimo para pedir as feicoes do WFS (abaixo disso a janela e grande demais). */
const ZOOM_MIN_CAR = 12;

function popupImovel(imovel: any) {
  const linha = (rotulo: string, valor: string) =>
    `<div style="display:flex;gap:6px"><span style="color:#6b7280">${rotulo}</span><b>${valor}</b></div>`;
  return (
    `<div style="font-size:12px;line-height:1.5;min-width:230px">` +
    `<div style="font-family:monospace;font-weight:700;margin-bottom:4px">${imovel.codImovel}</div>` +
    linha("Municipio:", `${imovel.municipio}/${imovel.uf}`) +
    linha("Area:", `${Number(imovel.areaHa).toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ha`) +
    linha("Modulos fiscais:", Number(imovel.modulosFiscais).toLocaleString("pt-BR", { maximumFractionDigits: 4 })) +
    linha("Situacao:", `${imovel.statusImovel}${imovel.tipoImovel ? ` (${imovel.tipoImovel})` : ""}`) +
    linha("Condicao:", imovel.condicao || "—") +
    `<div style="color:#9ca3af;margin-top:4px">Fonte: CAR/SICAR</div></div>`
  );
}

export default function GeometriaPage() {
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const [pronto, setPronto] = useState(false);
  const [geojson, setGeojson] = useState(JSON.stringify(IMOVEL_EXEMPLO, null, 2));
  const [processId, setProcessId] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [carregandoCar, setCarregandoCar] = useState(false);
  const [carregandoCamada, setCarregandoCamada] = useState(false);
  const [carInfo, setCarInfo] = useState<string | null>(null);
  const [codigoCar, setCodigoCar] = useState("");
  const [mostrarCar, setMostrarCar] = useState(false);
  const [modoClique, setModoClique] = useState(false);
  const [carregandoPonto, setCarregandoPonto] = useState(false);
  const [totalCarVisivel, setTotalCarVisivel] = useState<number | null>(null);
  const wmsRef = useRef<any>(null);
  const carLayerRef = useRef<any>(null);
  const selecaoRef = useRef<any>(null);
  const mostrarCarRef = useRef(false);
  const modoCliqueRef = useRef(false);
  const pedidoBboxRef = useRef(0);
  const pedidoPontoRef = useRef(0);

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = async () => {
      const L = (window as any).L;
      const map = L.map("mapa-divisas").setView([-22.2, -48.6], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
      mapRef.current = map;
      map.on("moveend", () => atualizarCamadaCar());
      map.on("click", (e: any) => selecionarPorClique(e.latlng.lat, e.latlng.lng));
      await fetch("/api/geometria/seed", { method: "POST" });
      // O mapa abre so com o limite estadual: a cobertura e todo o estado de SP.
      const limite = await (await fetch("/api/geometria/limite-uf?uf=SP")).json();
      if (limite.geojson) {
        const layer = L.geoJSON(limite.geojson, {
          style: { color: "#047857", weight: 2, fill: false },
          interactive: false,
        }).addTo(map);
        map.fitBounds(layer.getBounds());
      }
      setPronto(true);
    };
    document.body.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Contorno laranja dos imoveis da janela atual. O GeoServer do CAR ignora
   * SLD_BODY (estilo unico com preenchimento opaco), por isso as feicoes vem do
   * WFS e sao desenhadas no cliente; o WMS fica como base translucida.
   */
  async function atualizarCamadaCar() {
    const L = (window as any).L;
    const map = mapRef.current;
    const pedido = ++pedidoBboxRef.current;
    if (!map || !mostrarCarRef.current) return;
    if (map.getZoom() < ZOOM_MIN_CAR) {
      carLayerRef.current?.clearLayers();
      setTotalCarVisivel(null);
      setCarregandoCamada(false);
      return;
    }
    const b = map.getBounds();
    const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n: number) => n.toFixed(6)).join(",");
    setCarregandoCamada(true);
    try {
      const res = await fetch(`/api/car/imoveis?bbox=${bbox}&limite=300`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao consultar o CAR");
      if (pedido !== pedidoBboxRef.current || !mostrarCarRef.current) return;
      const grupo = carLayerRef.current;
      grupo.clearLayers();
      (data.imoveis ?? []).forEach((imovel: any) => {
        L.geoJSON({ type: "Feature", properties: {}, geometry: imovel.geometria }, {
          style: { color: "#f97316", weight: 1.5, fillColor: "#f97316", fillOpacity: 0.05 },
        })
          .bindPopup(popupImovel(imovel))
          .on("click", () => {
            if (modoCliqueRef.current) usarImovel(imovel, false);
          })
          .addTo(grupo);
      });
      setTotalCarVisivel((data.imoveis ?? []).length);
    } catch (e) {
      if (pedido === pedidoBboxRef.current) setErro((e as Error).message);
    } finally {
      if (pedido === pedidoBboxRef.current) setCarregandoCamada(false);
    }
  }

  function alternarCamadaCar(ativo: boolean) {
    const L = (window as any).L;
    const map = mapRef.current;
    setMostrarCar(ativo);
    mostrarCarRef.current = ativo;
    if (!map) return;
    if (ativo) {
      wmsRef.current ??= L.tileLayer.wms(CAR_WMS, {
        layers: "sicar:sicar_imoveis_sp",
        format: "image/png",
        transparent: true,
        opacity: 0.25,
        attribution: "CAR/SICAR",
      });
      carLayerRef.current ??= L.layerGroup();
      wmsRef.current.addTo(map);
      carLayerRef.current.addTo(map);
      atualizarCamadaCar();
    } else {
      pedidoBboxRef.current++;
      setCarregandoCamada(false);
      if (wmsRef.current) map.removeLayer(wmsRef.current);
      if (carLayerRef.current) {
        carLayerRef.current.clearLayers();
        map.removeLayer(carLayerRef.current);
      }
      setTotalCarVisivel(null);
    }
  }

  /** Clique no mapa: o WFS devolve a feicao que contem o ponto. */
  async function selecionarPorClique(lat: number, lon: number) {
    if (!modoCliqueRef.current) return;
    const pedido = ++pedidoPontoRef.current;
    setCarregandoPonto(true);
    setErro(null);
    try {
      const res = await fetch(`/api/car/imoveis?lon=${lon.toFixed(6)}&lat=${lat.toFixed(6)}`);
      const data = await res.json();
      if (pedido !== pedidoPontoRef.current || !modoCliqueRef.current) return;
      if (!res.ok) throw new Error(data.error || "Falha ao consultar o CAR");
      usarImovel(data.imoveis[0], false);
    } catch (e) {
      if (pedido === pedidoPontoRef.current) setErro((e as Error).message);
    } finally {
      if (pedido === pedidoPontoRef.current) setCarregandoPonto(false);
    }
  }

  /** Vira o poligono de analise: preenche o GeoJSON, destaca no mapa e abre o popup. */
  function usarImovel(imovel: any, voar: boolean) {
    const L = (window as any).L;
    const map = mapRef.current;
    setGeojson(JSON.stringify({
      type: "Feature",
      properties: {
        nome: imovel.codImovel,
        municipio: imovel.municipio,
        uf: imovel.uf,
        areaHa: imovel.areaHa,
        modulosFiscais: imovel.modulosFiscais,
      },
      geometry: imovel.geometria,
    }, null, 2));
    setCarInfo(
      `${imovel.codImovel} — ${imovel.municipio}/${imovel.uf} · ` +
      `${Number(imovel.areaHa).toLocaleString("pt-BR")} ha · ${imovel.modulosFiscais} MF · ${imovel.statusImovel}`
    );
    if (selecaoRef.current) map.removeLayer(selecaoRef.current);
    const layer = L.geoJSON({ type: "Feature", properties: {}, geometry: imovel.geometria }, {
      style: { color: "#6366f1", weight: 3, fillColor: "#6366f1", fillOpacity: 0.2 },
    })
      .bindPopup(popupImovel(imovel))
      .addTo(map);
    selecaoRef.current = layer;
    const bounds = layer.getBounds();
    if (voar) map.flyToBounds(bounds.pad(0.3), { duration: 1 });
    else map.fitBounds(bounds.pad(0.3));
    layer.openPopup(bounds.getCenter());
  }

  function desenharImovel(feature: any, cor: string) {
    const L = (window as any).L;
    const layer = L.geoJSON(feature, { style: { color: cor, weight: 2, fillOpacity: 0.25 } }).addTo(mapRef.current);
    layersRef.current.push(layer);
    mapRef.current.fitBounds(layer.getBounds().pad(0.2));
  }

  async function carregarCar(codigo?: string) {
    setCarregandoCar(true);
    setErro(null);
    try {
      const url = codigo && codigo.trim()
        ? `/api/car/imoveis?codigo=${encodeURIComponent(codigo.trim())}`
        : "/api/car/imoveis?uf=SP&quantidade=1";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.imoveis?.length) throw new Error(data.error || "Nenhum imovel retornado pelo CAR");
      usarImovel(data.imoveis[0], Boolean(codigo && codigo.trim()));
    } catch (e) {
      setErro((e as Error).message || "Falha ao consultar o CAR");
    } finally {
      setCarregandoCar(false);
    }
  }

  async function calcular() {
    setLoading(true);
    setErro(null);
    setResultado(null);
    try {
      const imovel = JSON.parse(geojson);
      const res = await fetch("/api/geometria/corte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imovel, processId: processId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no corte");
      setResultado(data);
      data.fragmentos.forEach((f: any, i: number) =>
        desenharImovel({ type: "Feature", properties: {}, geometry: f.geometria }, CORES[i % CORES.length])
      );
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <MapIcon className="h-6 w-6 text-emerald-700" />
        Corte de Divisas — Geometria do Imovel
      </h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="bg-orange-50 border border-orange-200 rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-orange-900 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarCar}
                disabled={!pronto}
                onChange={(e) => alternarCamadaCar(e.target.checked)}
                className="accent-orange-600"
              />
              Mostrar imoveis CAR (SP)
              {carregandoCamada && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-orange-900 cursor-pointer">
              <input
                type="checkbox"
                checked={modoClique}
                disabled={!pronto}
                onChange={(e) => {
                  setModoClique(e.target.checked);
                  modoCliqueRef.current = e.target.checked;
                  if (!e.target.checked) {
                    pedidoPontoRef.current++;
                    setCarregandoPonto(false);
                  }
                }}
                className="accent-orange-600"
              />
              <MousePointerClick className="h-3.5 w-3.5" />
              Selecionar imovel por clique
              {carregandoPonto && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            </label>
            {mostrarCar && (
              <p className="text-[11px] text-orange-700">
                {totalCarVisivel === null
                  ? `Aproxime o mapa (zoom ${ZOOM_MIN_CAR}+) para carregar os contornos do CAR.`
                  : `${totalCarVisivel} imoveis nesta janela — contorno laranja, direto do geoserver.car.gov.br.`}
              </p>
            )}
            {modoClique && (
              <p className="text-[11px] text-orange-700">
                Clique sobre uma propriedade: o WFS devolve a feicao que contem o ponto e ela vira o poligono de analise.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-gray-600">
              Imovel (SIGEF ou CAR)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={codigoCar}
                onChange={(e) => setCodigoCar(e.target.value)}
                placeholder="SP-3500402-0023CF65..."
                className="w-56 border border-gray-300 rounded-md px-2 py-1.5 text-xs font-mono"
                title="Codigo do imovel no CAR (SP-XXXXXXX-XXXX...)"
              />
              <button
                type="button"
                onClick={() => carregarCar(codigoCar || undefined)}
                disabled={carregandoCar || !pronto}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
              >
                {carregandoCar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tractor className="h-3.5 w-3.5" />}
                {codigoCar.trim() ? "Buscar pelo codigo" : "Carregar imovel real do CAR"}
              </button>
            </div>
          </div>
          <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded p-2">
            Poligono em analise: {carInfo ? `CAR/SICAR (SP) · ${carInfo}` : ROTULO_EXEMPLO}
          </p>
          <input
            value={processId}
            onChange={(e) => setProcessId(e.target.value)}
            placeholder="ID do processo (opcional — vincula a rastreabilidade)"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={calcular}
            disabled={loading || !pronto}
            className="w-full flex items-center justify-center gap-2 bg-emerald-700 text-white py-2.5 rounded-md text-sm font-medium hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
            Calcular corte
          </button>
          {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{erro}</p>}

          {resultado && (
            <div className="border-t border-gray-100 pt-3">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                resultado.classificacao === "PIOR_CASO" ? "bg-red-100 text-red-800"
                : resultado.classificacao === "DIFICIL" ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"}`}>
                Caso: {resultado.classificacao}
              </span>
              <p className="text-xs text-gray-500 mt-2">
                Linhas usadas: {resultado.linhasUsadas.map((l: any) => l.codigo).join(", ") || "nenhuma"} ·
                Registro: {resultado.corteId}
              </p>
              {/* Demonstrativo por municipio */}
              <div className="mt-3 mb-2 space-y-1.5">
                <p className="text-xs font-semibold text-gray-700">Demonstrativo por municipio:</p>
                {Object.entries(
                  resultado.fragmentos.reduce((acc: any, f: any) => {
                    const m = f.municipio || "Nao identificado";
                    acc[m] = (acc[m] || 0) + f.percentual;
                    return acc;
                  }, {})
                ).map(([mun, pct]: any) => (
                  <div key={mun} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-800 w-28 truncate">{mun}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-emerald-600 h-3 rounded-full"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-900 w-14 text-right">
                      {Number(pct).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
                    </span>
                  </div>
                ))}
              </div>
              <table className="w-full text-xs mt-2">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-1">Fragmento</th><th>Area (ha)</th><th>%</th><th>Municipio</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.fragmentos.map((f: any) => (
                    <tr key={f.fragmento} className="border-b border-gray-50">
                      <td className="py-1">{f.fragmento}</td>
                      <td>{f.areaHa.toLocaleString("pt-BR")}</td>
                      <td>{f.percentual.toLocaleString("pt-BR")}%</td>
                      <td className="font-medium">{f.municipio ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-1">
                O tecnico confere os municipios/percentuais antes de seguir para conferencia.
              </p>
            </div>
          )}
        </div>

        <div id="mapa-divisas" className="rounded-lg border border-gray-200" style={{ minHeight: 560 }} />
      </div>
    </div>
  );
}
