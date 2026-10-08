"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Scissors, Loader2, Map as MapIcon, MousePointerClick, Search, Layers, Upload, PenTool, Download, Trash2, FolderOpen,
} from "lucide-react";
import { WORKFLOW_STAGES, type WorkflowStage } from "@/lib/workflow";

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

/** Limites municipais oficiais do IGC publicados no GeoServer da IDESP (base do IGC, nao de outros orgaos). */
const IDESP_WMS = "https://www.idesp.sp.gov.br/geoserver/idesp/wms";
const IDESP_LIMITES_MUNICIPAIS = "idesp:dradt_mvw_lml_municipio_a_2021";

type Recurso = { href: string; integrity: string };

/** Bibliotecas de mapa do unpkg, em versao fixa e com hash SRI (sha384) para o navegador recusar conteudo alterado. */
const CDN: Record<"leafletCss" | "leafletJs" | "geomanCss" | "geomanJs" | "shpJs", Recurso> = {
  leafletCss: { href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", integrity: "sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H" },
  leafletJs: { href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", integrity: "sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH" },
  geomanCss: { href: "https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.css", integrity: "sha384-nfYqa/3Xh7kCl9/bO8fCcmqGuhuVWAle+CQgdE/LdgaQiO6fSkKh8C0fLdCVrrQJ" },
  geomanJs: { href: "https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.min.js", integrity: "sha384-7CTDkMmRSjHvjl8ftuwzLq/ogrEnsuNoi3825eH06KuMNWWwcfaNIHol5+I3EAzO" },
  shpJs: { href: "https://unpkg.com/shpjs@6.1.0/dist/shp.js", integrity: "sha384-GIFORW2IBzirKvqqzlZo1DpZjgz7m+VmIHO0CWEZ8vnUPv2CVCIVe0+XEc5o7ltT" },
};

function carregarCss(id: string, recurso: Recurso) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = recurso.href;
  link.integrity = recurso.integrity;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

function carregarScript(recurso: Recurso): Promise<void> {
  const src = recurso.href;
  return new Promise((resolve, reject) => {
    const existente = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existente?.dataset.carregado) return resolve();
    const script = existente ?? document.createElement("script");
    script.addEventListener("load", () => {
      script.dataset.carregado = "1";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}`)));
    if (!existente) {
      script.src = src;
      script.integrity = recurso.integrity;
      script.crossOrigin = "anonymous";
      document.body.appendChild(script);
    }
  });
}

type Camada = { nome: string; total: number; poligonos: number };

/** KML (Google Earth) -> GeoJSON: Placemarks com Polygon, LineString e Point, inclusive em MultiGeometry. */
function kmlParaGeoJSON(texto: string): any {
  const doc = new DOMParser().parseFromString(texto, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("KML invalido");
  const coords = (el: Element | null) =>
    (el?.textContent ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((par) => par.split(",").slice(0, 2).map(Number))
      .filter((c) => c.length === 2 && c.every(Number.isFinite));
  const features: any[] = [];
  doc.querySelectorAll("Placemark").forEach((pm) => {
    const nome = pm.querySelector("name")?.textContent?.trim() ?? "";
    const props = { nome };
    pm.querySelectorAll("Polygon").forEach((pol) => {
      const anel = (sel: string) =>
        Array.from(pol.querySelectorAll(`${sel} LinearRing coordinates`)).map(coords);
      const externo = anel("outerBoundaryIs")[0];
      if (externo?.length >= 4) {
        features.push({ type: "Feature", properties: props, geometry: { type: "Polygon", coordinates: [externo, ...anel("innerBoundaryIs")] } });
      }
    });
    pm.querySelectorAll("LineString").forEach((ls) => {
      const c = coords(ls.querySelector("coordinates"));
      if (c.length >= 2) features.push({ type: "Feature", properties: props, geometry: { type: "LineString", coordinates: c } });
    });
    pm.querySelectorAll("Point").forEach((pt) => {
      const c = coords(pt.querySelector("coordinates"));
      if (c.length === 1) features.push({ type: "Feature", properties: props, geometry: { type: "Point", coordinates: c[0] } });
    });
  });
  return { type: "FeatureCollection", features };
}

function normalizarGeoJSON(dado: any): any {
  if (Array.isArray(dado)) {
    return { type: "FeatureCollection", features: dado.flatMap((d) => normalizarGeoJSON(d).features) };
  }
  if (dado?.type === "FeatureCollection") return dado;
  if (dado?.type === "Feature") return { type: "FeatureCollection", features: [dado] };
  if (dado?.type && dado?.coordinates) {
    return { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: dado }] };
  }
  throw new Error("Arquivo sem feicoes geograficas reconheciveis");
}

/** Reune os poligonos de uma colecao em uma unica geometria (Polygon ou MultiPolygon). */
function poligonosDe(fc: any): { type: "Polygon" | "MultiPolygon"; coordinates: any } | null {
  const aneis: any[] = [];
  for (const f of fc.features ?? []) {
    const g = f?.geometry;
    if (g?.type === "Polygon") aneis.push(g.coordinates);
    else if (g?.type === "MultiPolygon") aneis.push(...g.coordinates);
  }
  if (!aneis.length) return null;
  return aneis.length === 1
    ? { type: "Polygon", coordinates: aneis[0] }
    : { type: "MultiPolygon", coordinates: aneis };
}

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

/** Processo ligado ao mapa por `?processo=` (botão "Pré-análise de divisas" da tela do processo). */
type Vinculo =
  | { estado: "nenhum" }
  | { estado: "carregando" }
  | { estado: "erro"; mensagem: string }
  | {
      estado: "ok";
      id: string;
      ordem: number;
      interessado: string;
      municipio: string | null;
      etapa: string;
      parcelaCodigo: string | null;
    };

export default function GeometriaPage() {
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const [pronto, setPronto] = useState(false);
  const [geojson, setGeojson] = useState(JSON.stringify(IMOVEL_EXEMPLO, null, 2));
  const [processId, setProcessId] = useState("");
  const [vinculo, setVinculo] = useState<Vinculo>({ estado: "nenhum" });
  const [avisoParcela, setAvisoParcela] = useState<string | null>(null);
  const [processoGravado, setProcessoGravado] = useState<string | null>(null);
  const parcelaDoProcessoRef = useRef(false);
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
  const [sigefSincronizadoEm, setSigefSincronizadoEm] = useState<string | null>(null);
  const sigefLayerRef = useRef<any>(null);
  const selecaoRef = useRef<any>(null);
  const mostrarSigefRef = useRef(false);
  const modoCliqueRef = useRef(false);
  const pedidoPontoRef = useRef(0);
  const pedidoSigefRef = useRef(0);
  const [mostrarLimitesIgc, setMostrarLimitesIgc] = useState(false);
  const limitesIgcRef = useRef<any>(null);
  const [camadaProprietario, setCamadaProprietario] = useState<Camada | null>(null);
  const [carregandoArquivo, setCarregandoArquivo] = useState(false);
  const proprietarioLayerRef = useRef<any>(null);
  const proprietarioFcRef = useRef<any>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [camadaLimites, setCamadaLimites] = useState<Camada | null>(null);
  const [carregandoLimites, setCarregandoLimites] = useState(false);
  const limitesArquivoLayerRef = useRef<any>(null);
  const limitesArquivoRef = useRef<HTMLInputElement>(null);
  const pedidoLimitesRef = useRef(0);
  const [modoRascunho, setModoRascunho] = useState(false);
  const [rascunhoTotal, setRascunhoTotal] = useState(0);
  const desenhandoRef = useRef(false);

  // Lê `?processo=` ao abrir e carrega o processo (rota GET /api/processes/[id]).
  useEffect(() => {
    (async () => {
      const id = new URLSearchParams(window.location.search).get("processo");
      if (!id) return;
      setProcessId(id);
      setVinculo({ estado: "carregando" });
      try {
        const res = await fetch(`/api/processes/${encodeURIComponent(id)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            res.status === 404 ? "Processo não encontrado." : data.error || "Erro ao carregar o processo."
          );
        }
        setVinculo({
          estado: "ok",
          id: data.id,
          ordem: data.ordem,
          interessado: data.interessado,
          municipio: data.municipio ?? null,
          etapa: WORKFLOW_STAGES[data.situacao as WorkflowStage]?.label ?? data.situacao,
          parcelaCodigo: data.sigefParcelaCodigo ?? null,
        });
      } catch (e) {
        setProcessId("");
        setVinculo({ estado: "erro", mensagem: (e as Error).message });
      }
    })();
  }, []);

  // Com o mapa pronto, carrega como polígono em análise a parcela SIGEF do processo (se estiver no acervo).
  useEffect(() => {
    if (!pronto || vinculo.estado !== "ok" || parcelaDoProcessoRef.current) return;
    parcelaDoProcessoRef.current = true;
    const codigo = vinculo.parcelaCodigo;
    (async () => {
      if (!codigo) {
        setAvisoParcela(
          "Este processo não tem parcela do SIGEF registrada. Escolha a parcela no mapa ou pelo código, ou cole o GeoJSON."
        );
        return;
      }
      try {
        const res = await fetch(`/api/sigef/parcelas?codigo=${encodeURIComponent(codigo)}`);
        const data = await res.json();
        if (!res.ok || !data.parcelas?.length) throw new Error("fora do acervo");
        usarParcela(data.parcelas[0]);
      } catch {
        setAvisoParcela(
          `A parcela ${codigo} deste processo não está no acervo SIGEF importado. Escolha a parcela no mapa ou pelo código, ou cole o GeoJSON.`
        );
      }
    })();
  }, [pronto, vinculo]);

  function desvincular() {
    setVinculo({ estado: "nenhum" });
    setProcessId("");
    setAvisoParcela(null);
    setProcessoGravado(null);
    window.history.replaceState(null, "", "/geometria");
  }

  useEffect(() => {
    carregarCss("leaflet-css", CDN.leafletCss);
    carregarCss("geoman-css", CDN.geomanCss);
    carregarScript(CDN.leafletJs).then(async () => {
      await carregarScript(CDN.geomanJs).catch(() => undefined);
      const L = (window as any).L;
      const map = L.map("mapa-divisas").setView([-22.2, -48.6], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
      mapRef.current = map;
      map.on("moveend", () => atualizarCamadaSigef());
      map.on("click", (e: any) => {
        if (desenhandoRef.current) return;
        selecionarPorClique(e.latlng.lat, e.latlng.lng);
      });
      if (map.pm) {
        map.pm.setLang("pt_br");
        map.pm.setGlobalOptions({ pathOptions: { color: "#dc2626", weight: 3, fillOpacity: 0.15 } });
        const contar = () => setRascunhoTotal(map.pm.getGeomanDrawLayers().length);
        map.on("pm:drawstart", () => { desenhandoRef.current = true; });
        map.on("pm:drawend", () => { desenhandoRef.current = false; });
        map.on("pm:create", (e: any) => {
          e.layer.bindPopup("Rascunho do tecnico");
          contar();
        });
        map.on("pm:remove", contar);
      }
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
    }).catch((e) => setErro((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Limites municipais oficiais do IGC (WMS da IDESP) sobre o mapa base. */
  function alternarLimitesIgc(ativo: boolean) {
    const L = (window as any).L;
    const map = mapRef.current;
    setMostrarLimitesIgc(ativo);
    if (!map) return;
    if (ativo) {
      if (!limitesIgcRef.current) {
        limitesIgcRef.current = L.tileLayer.wms(IDESP_WMS, {
          layers: IDESP_LIMITES_MUNICIPAIS,
          format: "image/png",
          transparent: true,
          version: "1.1.1",
          opacity: 0.9,
          attribution: "Limites municipais 2021 — IGC/IDESP",
        });
      }
      limitesIgcRef.current.addTo(map);
    } else if (limitesIgcRef.current) {
      map.removeLayer(limitesIgcRef.current);
    }
  }

  /** Camada enviada pelo proprietario (GeoJSON, KML ou shapefile zipado) desenhada sobre o mapa. */
  async function abrirCamadaProprietario(arquivo: File) {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map) return;
    setCarregandoArquivo(true);
    setErro(null);
    try {
      const nome = arquivo.name;
      const fc = await lerArquivoGeografico(arquivo);
      removerCamadaProprietario();
      const layer = L.geoJSON(fc, {
        style: { color: "#ea580c", weight: 3, fillColor: "#fb923c", fillOpacity: 0.2 },
        onEachFeature: (f: any, l: any) => {
          const props = f.properties ?? {};
          const linhas = Object.entries(props)
            .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
            .slice(0, 12)
            .map(([k, v]) => `<b>${esc(k)}</b>: ${esc(v)}`);
          l.bindPopup(`<div style="font-size:12px"><b>Camada do proprietario — ${esc(nome)}</b><br/>${linhas.join("<br/>")}</div>`);
        },
      }).addTo(map);
      proprietarioLayerRef.current = layer;
      proprietarioFcRef.current = fc;
      const poligonos = fc.features.filter((f: any) => /Polygon$/.test(f.geometry?.type ?? "")).length;
      setCamadaProprietario({ nome, total: fc.features.length, poligonos });
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.2));
    } catch (e) {
      setErro((e as Error).message || "Falha ao abrir a camada enviada pelo proprietario");
    } finally {
      setCarregandoArquivo(false);
      if (arquivoRef.current) arquivoRef.current.value = "";
    }
  }

  /** Le GeoJSON, KML ou shapefile zipado e devolve uma FeatureCollection normalizada. */
  async function lerArquivoGeografico(arquivo: File): Promise<any> {
    const ext = arquivo.name.toLowerCase().split(".").pop() ?? "";
    let fc: any;
    if (ext === "zip") {
      await carregarScript(CDN.shpJs);
      fc = normalizarGeoJSON(await (window as any).shp(await arrayBufferDe(arquivo)));
    } else if (ext === "kml") {
      fc = kmlParaGeoJSON(await arquivo.text());
    } else if (ext === "geojson" || ext === "json") {
      fc = normalizarGeoJSON(JSON.parse(await arquivo.text()));
    } else {
      throw new Error("Formato nao suportado: envie .geojson, .json, .kml ou .zip (shapefile)");
    }
    if (!fc.features.length) throw new Error("O arquivo nao contem feicoes geograficas");
    return fc;
  }

  /** Limites de municipios enviados em arquivo (KML ou shapefile) para a pré-análise, sobre o mapa base. */
  async function abrirLimitesMunicipais(arquivo: File) {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map) return;
    const pedido = ++pedidoLimitesRef.current;
    setCarregandoLimites(true);
    setErro(null);
    try {
      const nome = arquivo.name;
      const fc = await lerArquivoGeografico(arquivo);
      if (pedido !== pedidoLimitesRef.current) return;
      const layer = L.geoJSON(fc, {
        style: { color: "#7c3aed", weight: 2, dashArray: "6 4", fillOpacity: 0 },
        pointToLayer: (_f: any, latlng: any) => L.circleMarker(latlng, { radius: 4, color: "#7c3aed" }),
        onEachFeature: (f: any, l: any) => {
          const props = f.properties ?? {};
          const linhas = Object.entries(props)
            .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
            .slice(0, 12)
            .map(([k, v]) => `<b>${esc(k)}</b>: ${esc(v)}`);
          l.bindPopup(`<div style="font-size:12px"><b>Limites de municipios (pré-análise) — ${esc(nome)}</b><br/>${linhas.join("<br/>")}</div>`);
        },
      });
      removerLimitesMunicipais();
      layer.addTo(map);
      limitesArquivoLayerRef.current = layer;
      const poligonos = fc.features.filter((f: any) => /Polygon$/.test(f.geometry?.type ?? "")).length;
      setCamadaLimites({ nome, total: fc.features.length, poligonos });
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.2));
    } catch (e) {
      setErro((e as Error).message || "Falha ao abrir o arquivo de limites de municipios");
    } finally {
      setCarregandoLimites(false);
      if (limitesArquivoRef.current) limitesArquivoRef.current.value = "";
    }
  }

  function removerLimitesMunicipais() {
    pedidoLimitesRef.current++;
    if (limitesArquivoLayerRef.current) mapRef.current?.removeLayer(limitesArquivoLayerRef.current);
    limitesArquivoLayerRef.current = null;
    setCamadaLimites(null);
  }

  function arrayBufferDe(arquivo: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result as ArrayBuffer);
      leitor.onerror = () => reject(leitor.error);
      leitor.readAsArrayBuffer(arquivo);
    });
  }

  function removerCamadaProprietario() {
    if (proprietarioLayerRef.current) mapRef.current?.removeLayer(proprietarioLayerRef.current);
    proprietarioLayerRef.current = null;
    proprietarioFcRef.current = null;
    setCamadaProprietario(null);
  }

  /** Troca o poligono de analise por uma geometria desenhada/enviada (em vez da parcela do SIGEF). */
  function usarGeometria(geometria: any, origem: string, rotulo: string) {
    const L = (window as any).L;
    const map = mapRef.current;
    setGeojson(JSON.stringify({
      type: "Feature",
      properties: { nome: rotulo, origem },
      geometry: geometria,
    }, null, 2));
    setParcelaInfo(rotulo);
    if (selecaoRef.current) map.removeLayer(selecaoRef.current);
    const layer = L.geoJSON({ type: "Feature", properties: {}, geometry: geometria }, {
      style: { color: "#6366f1", weight: 3, fillColor: "#6366f1", fillOpacity: 0.2 },
      interactive: false,
    }).addTo(map);
    selecaoRef.current = layer;
    map.fitBounds(layer.getBounds().pad(0.3));
  }

  function usarCamadaProprietario() {
    const geometria = poligonosDe(proprietarioFcRef.current ?? {});
    if (!geometria || !camadaProprietario) {
      setErro("A camada enviada nao contem poligonos");
      return;
    }
    usarGeometria(geometria, "PROPRIETARIO", `Camada do proprietario — ${camadaProprietario.nome}`);
  }

  /** Camada de rascunho: barra de desenho (poligono, retangulo, linha, marcador, editar, arrastar, apagar). */
  function alternarRascunho(ativo: boolean) {
    const map = mapRef.current;
    setModoRascunho(ativo);
    if (!map?.pm) return;
    if (ativo) {
      map.pm.addControls({
        position: "topleft",
        drawMarker: true,
        drawPolyline: true,
        drawRectangle: true,
        drawPolygon: true,
        drawCircle: false,
        drawCircleMarker: false,
        drawText: false,
        editMode: true,
        dragMode: true,
        cutPolygon: false,
        removalMode: true,
        rotateMode: false,
      });
    } else {
      map.pm.disableDraw();
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalRemovalMode();
      map.pm.disableGlobalDragMode();
      map.pm.removeControls();
      desenhandoRef.current = false;
    }
  }

  function rascunhoGeoJSON(): any {
    const camadas = mapRef.current?.pm?.getGeomanDrawLayers() ?? [];
    return { type: "FeatureCollection", features: camadas.map((l: any) => l.toGeoJSON()) };
  }

  function usarRascunho() {
    const geometria = poligonosDe(rascunhoGeoJSON());
    if (!geometria) {
      setErro("Desenhe ao menos um poligono ou retangulo no rascunho");
      return;
    }
    usarGeometria(geometria, "RASCUNHO", "Rascunho desenhado pelo tecnico");
  }

  function exportarRascunho() {
    const blob = new Blob([JSON.stringify(rascunhoGeoJSON(), null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rascunho-${new Date().toISOString().slice(0, 10)}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function limparRascunho() {
    const map = mapRef.current;
    for (const l of map?.pm?.getGeomanDrawLayers() ?? []) map.removeLayer(l);
    setRascunhoTotal(0);
  }

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
        setSigefSincronizadoEm(total.sincronizacao?.iniciadoEm ?? null);
      } catch {
        setTotalSigefImportado(null);
        setSigefSincronizadoEm(null);
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
      if (!res.ok) throw new Error(data.error || "Erro na pré-análise");
      setResultado(data);
      setProcessoGravado(processId || null);
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
        Pré-análise de Divisas — Geometria do Imóvel
      </h1>

      {vinculo.estado === "carregando" && (
        <p role="status" className="text-sm text-gray-600">Carregando o processo vinculado…</p>
      )}
      {vinculo.estado === "erro" && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong className="font-semibold">{vinculo.mensagem}</strong> A tela segue sem vínculo com processo.
        </p>
      )}
      {vinculo.estado === "ok" && (
        <div
          role="status"
          className={`rounded-md border p-3 text-sm ${
            avisoParcela ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-200 bg-blue-50 text-blue-900"
          }`}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              <strong className="font-semibold">Processo vinculado:</strong> #{vinculo.ordem} · {vinculo.interessado}
              {vinculo.municipio ? ` · ${vinculo.municipio}` : ""} · {vinculo.etapa}
            </span>
            <Link href={`/processos/${vinculo.id}`} className="underline">Abrir processo</Link>
            <button type="button" onClick={desvincular} className="underline">Desvincular</button>
          </div>
          {avisoParcela && <p className="mt-1">{avisoParcela}</p>}
        </div>
      )}

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
                  ? "Nenhuma parcela no acervo — a sincronização diária com o INCRA (02:00) ainda não carregou as parcelas."
                  : totalSigefVisivel === null
                    ? `Aproxime o mapa (zoom ${ZOOM_MIN_SIGEF}+) para carregar as parcelas do SIGEF.`
                    : `${totalSigefVisivel} parcelas nesta janela — contorno violeta` +
                      (totalSigefImportado === null ? "." : `, de ${totalSigefImportado.toLocaleString("pt-BR")} de SP.`) +
                      (sigefSincronizadoEm
                        ? ` Acervo INCRA sincronizado em ${new Date(sigefSincronizadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`
                        : "")}
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
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-amber-900 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarLimitesIgc}
                disabled={!pronto}
                onChange={(e) => alternarLimitesIgc(e.target.checked)}
                className="accent-amber-600"
              />
              <Layers className="h-3.5 w-3.5" />
              Limites municipais do IGC (IDESP 2021)
            </label>
            {mostrarLimitesIgc && (
              <p className="text-[11px] text-amber-700">
                Base oficial de limites municipais do IGC, servida pelo GeoServer da IDESP (WMS), sobre o mapa base.
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={limitesArquivoRef}
                type="file"
                accept=".kml,.zip,.geojson,.json"
                className="hidden"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) abrirLimitesMunicipais(arquivo);
                }}
              />
              <button
                type="button"
                onClick={() => limitesArquivoRef.current?.click()}
                disabled={!pronto || carregandoLimites}
                title="Abrir arquivo KML ou shapefile (.zip) com limites de municipios para a pré-análise, sobre o mapa base"
                className="flex items-center gap-1.5 text-xs bg-violet-700 text-white px-3 py-1.5 rounded-md font-medium hover:bg-violet-800 disabled:opacity-50"
              >
                {carregandoLimites ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderOpen className="h-3.5 w-3.5" />}
                Abrir limites de municípios (KML/shapefile)
              </button>
              {camadaLimites && (
                <button
                  type="button"
                  onClick={removerLimitesMunicipais}
                  className="flex items-center gap-1 text-xs text-amber-900 px-2 py-1.5 rounded-md hover:bg-amber-100"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </button>
              )}
            </div>
            {camadaLimites && (
              <p className="text-[11px] text-amber-700">
                {camadaLimites.nome}: {camadaLimites.total} feições ({camadaLimites.poligonos} polígonos) — contorno roxo tracejado, para pré-análise.
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={arquivoRef}
                type="file"
                accept=".geojson,.json,.kml,.zip"
                className="hidden"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) abrirCamadaProprietario(arquivo);
                }}
              />
              <button
                type="button"
                onClick={() => arquivoRef.current?.click()}
                disabled={!pronto || carregandoArquivo}
                title="Abrir a camada enviada pelo proprietario (GeoJSON, KML ou shapefile .zip) quando nao for usar a parcela do SIGEF"
                className="flex items-center gap-1.5 text-xs bg-orange-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-orange-700 disabled:opacity-50"
              >
                {carregandoArquivo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Abrir camada do proprietario
              </button>
              {camadaProprietario && (
                <>
                  <button
                    type="button"
                    onClick={usarCamadaProprietario}
                    disabled={!camadaProprietario.poligonos}
                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Usar como poligono de analise
                  </button>
                  <button
                    type="button"
                    onClick={removerCamadaProprietario}
                    className="flex items-center gap-1 text-xs text-amber-900 px-2 py-1.5 rounded-md hover:bg-amber-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remover
                  </button>
                </>
              )}
            </div>
            {camadaProprietario && (
              <p className="text-[11px] text-amber-700">
                {camadaProprietario.nome}: {camadaProprietario.total} feicoes ({camadaProprietario.poligonos} poligonos) — contorno laranja.
              </p>
            )}
            <label className="flex items-center gap-2 text-xs font-medium text-amber-900 cursor-pointer">
              <input
                type="checkbox"
                checked={modoRascunho}
                disabled={!pronto}
                onChange={(e) => alternarRascunho(e.target.checked)}
                className="accent-amber-600"
              />
              <PenTool className="h-3.5 w-3.5" />
              Rascunho: desenhar sobre o mapa
            </label>
            {modoRascunho && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-amber-700">
                  Use a barra de desenho no canto do mapa: poligono, retangulo, linha, marcador, editar, arrastar e apagar.
                  {rascunhoTotal > 0 ? ` ${rascunhoTotal} elemento(s) desenhado(s) — contorno vermelho.` : ""}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={usarRascunho}
                    disabled={!rascunhoTotal}
                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Usar rascunho como poligono de analise
                  </button>
                  <button
                    type="button"
                    onClick={exportarRascunho}
                    disabled={!rascunhoTotal}
                    className="flex items-center gap-1 text-xs text-amber-900 px-2 py-1.5 rounded-md hover:bg-amber-100 disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" /> Exportar GeoJSON
                  </button>
                  <button
                    type="button"
                    onClick={limparRascunho}
                    disabled={!rascunhoTotal}
                    className="flex items-center gap-1 text-xs text-amber-900 px-2 py-1.5 rounded-md hover:bg-amber-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Limpar
                  </button>
                </div>
              </div>
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
          {vinculo.estado === "ok" ? (
            <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
              Pré-análise será gravada no processo <strong>#{vinculo.ordem}</strong>.
            </p>
          ) : (
            <>
              <input
                value={processId}
                onChange={(e) => setProcessId(e.target.value)}
                aria-label="ID do processo"
                placeholder="ID do processo (opcional — vincula a rastreabilidade)"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-600">
                Dica: para abrir o mapa já ligado a um processo, use o botão &quot;Pré-análise de divisas&quot; na tela do processo.
              </p>
            </>
          )}
          <button
            onClick={calcular}
            disabled={loading || !pronto}
            className="w-full flex items-center justify-center gap-2 bg-emerald-700 text-white py-2.5 rounded-md text-sm font-medium hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
            Calcular pré-análise
          </button>
          {erro && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{erro}</p>}

          {resultado && (
            <div className="border-t border-gray-100 pt-3">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                resultado.classificacao === "PIOR_CASO" ? "bg-red-100 text-red-800"
                : resultado.classificacao === "DIFICIL" ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"}`}>
                Caso: {resultado.classificacao}
              </span>
              {resultado.nivelSugerido != null && (
                <span className="ml-2 text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                  Nível sugerido: {resultado.nivelSugerido}
                </span>
              )}
              {resultado.nivelMotivo && (
                <p className="mt-1 text-xs text-gray-700">
                  {resultado.nivelMotivo}. O técnico responsável confirma o nível no processo.
                </p>
              )}
              {processoGravado && (
                <p className="mt-2 text-sm text-gray-800">
                  Pré-análise gravada no processo{" "}
                  {vinculo.estado === "ok" && vinculo.id === processoGravado ? `#${vinculo.ordem}` : "informado"}.{" "}
                  <Link href={`/processos/${processoGravado}/certidao`} className="text-blue-700 underline">
                    Ver minuta da certidão
                  </Link>
                </p>
              )}
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
              <p className="text-xs text-gray-500 mt-1">
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
