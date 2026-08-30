/**
 * Integracao com o GeoServer publico do CAR (SICAR)
 * WFS: https://geoserver.car.gov.br/geoserver/sicar/wfs
 * Camadas: sicar:sicar_imoveis_<uf> (MultiPolygon, EPSG:4326)
 */

export interface CarImovel {
  codImovel: string;
  areaHa: number;
  municipio: string;
  uf: string;
  statusImovel: string;
  condicao: string;
  modulosFiscais: number;
  tipoImovel: string;
  geometria: unknown; // GeoJSON MultiPolygon
}

const CAR_WFS =
  process.env.CAR_WFS_URL ||
  "https://geoserver.car.gov.br/geoserver/sicar/wfs";

const LAYER_PADRAO = "sicar:sicar_imoveis_sp";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapear(f: any): CarImovel {
  return {
    codImovel: String(f.properties?.cod_imovel ?? ""),
    areaHa: Number(f.properties?.area ?? 0),
    municipio: String(f.properties?.municipio ?? ""),
    uf: String(f.properties?.uf ?? "SP"),
    statusImovel: String(f.properties?.status_imovel ?? ""),
    condicao: String(f.properties?.condicao ?? ""),
    modulosFiscais: Number(f.properties?.m_fiscal ?? 0),
    tipoImovel: String(f.properties?.tipo_imovel ?? ""),
    geometria: f.geometry,
  };
}

/** Busca um imovel CAR pelo codigo (ex.: SP-3500402-0023CF6564CA47AD8EA6E0BDD0ED25C2). */
export async function buscarImovelPorCodigo(codigo: string): Promise<CarImovel | null> {
  const cod = codigo.trim();
  if (!/^SP-[0-9]{7}-[0-9A-F]{32}$/i.test(cod)) {
    throw new Error("Formato invalido. Use: SP-XXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
  }
  const cql = encodeURIComponent(`cod_imovel='${cod.toUpperCase()}'`);
  const url =
    `${CAR_WFS}?service=WFS&version=2.0.0&request=GetFeature` +
    `&typeNames=${LAYER_PADRAO}&count=1&outputFormat=application/json&CQL_FILTER=${cql}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`CAR WFS respondeu HTTP ${res.status}`);
  const data = await res.json();
  const f = (data.features ?? [])[0];
  return f ? mapear(f) : null;
}

/**
 * Busca imoveis CAR de uma UF para demonstracao: somente status AT (ativo),
 * faixa de area realista (4 a 500 ha), offset pseudoaleatorio para variar.
 */
export async function buscarImoveisCar(
  uf: string = "SP",
  quantidade: number = 2
): Promise<CarImovel[]> {
  const layer = `sicar:sicar_imoveis_${uf.toLowerCase()}`;
  const offset = Math.floor(Math.random() * 2000);
  const cql = encodeURIComponent(
    "status_imovel='AT' AND area >= 4 AND area <= 500"
  );
  const url =
    `${CAR_WFS}?service=WFS&version=2.0.0&request=GetFeature` +
    `&typeNames=${layer}&count=${quantidade}&startIndex=${offset}` +
    `&outputFormat=application/json&CQL_FILTER=${cql}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`CAR WFS respondeu HTTP ${res.status}`);
  const data = await res.json();
  return (data.features ?? []).map(mapear);
}

/**
 * Imoveis dentro de uma janela do mapa. O WFS 2.0 do CAR usa a ordem de eixos
 * do EPSG:4326 (lat, lon) tanto no BBOX quanto no CQL — inverter devolve zero
 * feicoes em vez de erro.
 */
export async function buscarImoveisPorBbox(
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
  limite: number = 250,
  uf: string = "SP"
): Promise<CarImovel[]> {
  const layer = `sicar:sicar_imoveis_${uf.toLowerCase()}`;
  const url =
    `${CAR_WFS}?service=WFS&version=2.0.0&request=GetFeature` +
    `&typeNames=${layer}&count=${limite}&outputFormat=application/json` +
    `&bbox=${minLat},${minLon},${maxLat},${maxLon}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`CAR WFS respondeu HTTP ${res.status}`);
  const data = await res.json();
  return (data.features ?? []).map(mapear);
}

/** Imovel que contem o ponto clicado no mapa. */
export async function buscarImovelNoPonto(
  lon: number,
  lat: number,
  uf: string = "SP"
): Promise<CarImovel | null> {
  const layer = `sicar:sicar_imoveis_${uf.toLowerCase()}`;
  const cql = encodeURIComponent(
    `INTERSECTS(geo_area_imovel, POINT(${lat} ${lon}))`
  );
  const url =
    `${CAR_WFS}?service=WFS&version=2.0.0&request=GetFeature` +
    `&typeNames=${layer}&count=1&outputFormat=application/json&CQL_FILTER=${cql}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`CAR WFS respondeu HTTP ${res.status}`);
  const data = await res.json();
  const f = (data.features ?? [])[0];
  return f ? mapear(f) : null;
}
