"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { Scissors, Loader2, Map as MapIcon, MousePointerClick, Search } from "lucide-react";

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

/** Zoom minimo para pedir as parcelas da janela (abaixo disso a janela e grande demais). */
const ZOOM_MIN_SIGEF = 12;

/** Atributos vem de fonte externa (DBF do acervo do INCRA): sempre escapar. */
function esc(valor: unknown): string {
  return String(valor ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function popupParcela(parcela: any) {
  const linha = (rotulo: string, valor: string) =>
    `<div style="display:flex;gap:6px"><span style="color:#6b7280">${rotulo}</span><b>${esc(valor)}</b></div>`;
  const area = parcela.areaHa === null ? "—" : `${Number(parcela.areaHa).toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ha`;
  return (
    `<div style="font-size:12px;line-height:1.5;min-width:230px">` +
    `<div style="font-family:monospace;font-weight:700;margin-bottom:4px">${esc(parcela.codigoParcela)}</div>` +
    linha("Area/imovel:", parcela.nomeArea || "—") +
    linha("Municipio:", `${parcela.municipio || parcela.municipioIbge || "—"}/${parcela.uf}`) +
    linha("Area:", area) +
    linha("Situacao:", parcela.situacaoImovel || "—") +
    linha("Status:", parcela.status || "—") +
    linha("Resp. tecnico:", parcela.rt || "—") +
    linha("ART:", parcela.art || "—") +
    linha("Matricula:", parcela.matricula || "—") +
    `<div style="color:#9ca3af;margin-top:4px">Fonte: SIGEF/INCRA (acervo importado)</div></div>`
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
  const [carregandoParcela, setCarregandoParcela] = useState(false);
  const [parcelaInfo, setParcelaInfo] = useState<string | null>(null);
  const [codigoParcela, setCodigoParcela] = useState("");
  const [modoClique, setModoClique] = useState(false);
  const [carregandoPonto, setCarregandoPonto] = useState(false);
  const [mostrarSigef, setMostrarSigef] = useState(false);
  const [carregandoSigef, setCarregandoSigef] = useState(false);
  const [totalSigefVisivel, setTotalSigefVisivel] = useState<number | null>(null);
  const [totalSigefImportado, setTotalSigefImportado] = useState<number | null>(null);
  const sigefLayerRef = useRef<any>(null);
  const selecaoRef = useRef<any>(null);
  const mostrarSigefRef = useRef(false);
  const modoCliqueRef = useRef(false);
  const pedidoPontoRef = useRef(0);
  const pedidoSigefRef = useRef(0);

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
      map.on("moveend", () => atualizarCamadaSigef());
      map.on("click", (e: any) => selecionarPorClique(e.latlng.lat, e.latlng.lng));
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
   * Parcelas do SIGEF da janela atual. Vem da tabela SigefParcela (shapefile do
   * acervo do INCRA importado), porque o acervo nao responde fora do Brasil.
   */
  async function atualizarCamadaSigef() {
    const L = (window as any).L;
    const map = mapRef.current;
    const pedido = ++pedidoSigefRef.current;
    if (!map || !mostrarSigefRef.current) return;
    if (map.getZoom() < ZOOM_MIN_SIGEF) {
      sigefLayerRef.current?.clearLayers();
      setTotalSigefVisivel(null);
      setCarregandoSigef(false);
      return;
    }
    const b = map.getBounds();
    const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n: number) => n.toFixed(6)).join(",");
    setCarregandoSigef(true);
    try {
      const res = await fetch(`/api/sigef/parcelas?bbox=${bbox}&limite=300`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao consultar as parcelas do SIGEF");
      if (pedido !== pedidoSigefRef.current || !mostrarSigefRef.current) return;
      const grupo = sigefLayerRef.current;
      grupo.clearLayers();
      (data.parcelas ?? []).forEach((parcela: any) => {
        L.geoJSON({ type: "Feature", properties: {}, geometry: parcela.geometria }, {
          style: { color: "#7c3aed", weight: 1.5, fillColor: "#7c3aed", fillOpacity: 0.05 },
        })
          .bindPopup(popupParcela(parcela))
          .on("click", (ev: any) => {
            if (!modoCliqueRef.current) return;
            // Sem isso o clique tambem chega ao mapa e dispara a consulta por ponto.
            L.DomEvent.stopPropagation(ev);
            usarParcela(parcela);
          })
          .addTo(grupo);
      });
      setTotalSigefVisivel((data.parcelas ?? []).length);
    } catch (e) {
      if (pedido === pedidoSigefRef.current) setErro((e as Error).message);
    } finally {
      if (pedido === pedidoSigefRef.current) setCarregandoSigef(false);
    }
  }

  async function alternarCamadaSigef(ativo: boolean) {
    const L = (window as any).L;
    const map = mapRef.current;
    setMostrarSigef(ativo);
    mostrarSigefRef.current = ativo;
    if (!map) return;
    if (ativo) {
      sigefLayerRef.current ??= L.layerGroup();
      sigefLayerRef.current.addTo(map);
      atualizarCamadaSigef();
      try {
        const total = await (await fetch("/api/sigef/parcelas?uf=SP")).json();
        setTotalSigefImportado(total.total ?? null);
      } catch {
        setTotalSigefImportado(null);
      }
    } else {
      pedidoSigefRef.current++;
      setCarregandoSigef(false);
      if (sigefLayerRef.current) {
        sigefLayerRef.current.clearLayers();
        map.removeLayer(sigefLayerRef.current);
      }
      setTotalSigefVisivel(null);
    }
  }

  /** Clique no mapa: a parcela do SIGEF que contem o ponto vira o poligono de analise. */
  async function selecionarPorClique(lat: number, lon: number) {
    if (!modoCliqueRef.current) return;
    const pedido = ++pedidoPontoRef.current;
    setCarregandoPonto(true);
    setErro(null);
    try {
      const res = await fetch(`/api/sigef/parcelas?lon=${lon.toFixed(6)}&lat=${lat.toFixed(6)}`);
      const data = await res.json();
      if (pedido !== pedidoPontoRef.current || !modoCliqueRef.current) return;
      if (!res.ok) throw new Error(data.error || "Falha ao consultar as parcelas do SIGEF");
      usarParcela(data.parcelas[0]);
    } catch (e) {
      if (pedido === pedidoPontoRef.current) setErro((e as Error).message);
    } finally {
      if (pedido === pedidoPontoRef.current) setCarregandoPonto(false);
    }
  }

  /** Vira o poligono de analise: preenche o GeoJSON, destaca no mapa e abre o popup. */
  function usarParcela(parcela: any) {
    const L = (window as any).L;
    const map = mapRef.current;
    setGeojson(JSON.stringify({
      type: "Feature",
      properties: {
        nome: parcela.codigoParcela,
        nomeArea: parcela.nomeArea,
        municipio: parcela.municipio,
        municipioIbge: parcela.municipioIbge,
        uf: parcela.uf,
        areaHa: parcela.areaHa,
        matricula: parcela.matricula,
      },
      geometry: parcela.geometria,
    }, null, 2));
    setParcelaInfo(
      `SIGEF ${parcela.codigoParcela} — ${parcela.municipio || parcela.municipioIbge || "—"}/${parcela.uf}` +
      (parcela.areaHa === null ? "" : ` · ${Number(parcela.areaHa).toLocaleString("pt-BR")} ha`) +
      (parcela.status ? ` · ${parcela.status}` : "")
    );
    if (selecaoRef.current) map.removeLayer(selecaoRef.current);
    const layer = L.geoJSON({ type: "Feature", properties: {}, geometry: parcela.geometria }, {
      style: { color: "#6366f1", weight: 3, fillColor: "#6366f1", fillOpacity: 0.2 },
    })
      .bindPopup(popupParcela(parcela))
      .addTo(map);
    selecaoRef.current = layer;
    const bounds = layer.getBounds();
    map.fitBounds(bounds.pad(0.3));
    layer.openPopup(bounds.getCenter());
  }

  function desenharImovel(feature: any, cor: string) {
    const L = (window as any).L;
    const layer = L.geoJSON(feature, { style: { color: cor, weight: 2, fillOpacity: 0.25 } }).addTo(mapRef.current);
    layersRef.current.push(layer);
    mapRef.current.fitBounds(layer.getBounds().pad(0.2));
  }

  async function carregarParcela() {
    const codigo = codigoParcela.trim();
    if (!codigo) return;
    setCarregandoParcela(true);
    setErro(null);
    try {
      const res = await fetch(`/api/sigef/parcelas?codigo=${encodeURIComponent(codigo)}`);
      const data = await res.json();
      if (!res.ok || !data.parcelas?.length) throw new Error(data.error || "Parcela nao encontrada no SIGEF");
      usarParcela(data.parcelas[0]);
    } catch (e) {
      setErro((e as Error).message || "Falha ao consultar as parcelas do SIGEF");
    } finally {
      setCarregandoParcela(false);
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
          <div className="bg-violet-50 border border-violet-200 rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-violet-900 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarSigef}
                disabled={!pronto}
                onChange={(e) => alternarCamadaSigef(e.target.checked)}
                className="accent-violet-600"
              />
              Mostrar parcelas SIGEF (SP)
              {carregandoSigef && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            </label>
            {mostrarSigef && (
              <p className="text-[11px] text-violet-700">
                {totalSigefImportado === 0
                  ? "Nenhuma parcela importada — rode scripts/import-sigef-shp.ts com o shapefile do acervo do INCRA."
                  : totalSigefVisivel === null
                    ? `Aproxime o mapa (zoom ${ZOOM_MIN_SIGEF}+) para carregar as parcelas do SIGEF.`
                    : `${totalSigefVisivel} parcelas nesta janela — contorno violeta` +
                      (totalSigefImportado === null ? "." : `, de ${totalSigefImportado.toLocaleString("pt-BR")} importadas de SP.`)}
              </p>
            )}
            <label className="flex items-center gap-2 text-xs font-medium text-violet-900 cursor-pointer">
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
                className="accent-violet-600"
              />
              <MousePointerClick className="h-3.5 w-3.5" />
              Selecionar parcela por clique
              {carregandoPonto && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            </label>
            {modoClique && (
              <p className="text-[11px] text-violet-700">
                Clique sobre uma propriedade: a parcela do SIGEF que contem o ponto vira o poligono de analise.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-gray-600">
              Parcela SIGEF
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={codigoParcela}
                onChange={(e) => setCodigoParcela(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") carregarParcela();
                }}
                placeholder="Codigo da parcela SIGEF"
                className="w-56 border border-gray-300 rounded-md px-2 py-1.5 text-xs font-mono"
                title="Codigo da parcela certificada no SIGEF (acervo do INCRA)"
              />
              <button
                type="button"
                onClick={carregarParcela}
                disabled={carregandoParcela || !pronto || !codigoParcela.trim()}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
              >
                {carregandoParcela ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Buscar pelo codigo
              </button>
            </div>
          </div>
          <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded p-2">
            Poligono em analise: {parcelaInfo ?? ROTULO_EXEMPLO}
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
