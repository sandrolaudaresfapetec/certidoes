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

/** UFs com camada publicada no GeoServer do SICAR que o sistema consulta. */
const UFS_SUPORTADAS = ["SP", "MG", "PR", "MS", "RJ", "GO"];

/** Impede que uma UF arbitraria da querystring vire nome de camada no WFS. */
function camada(uf: string): string {
  const sigla = uf.trim().toUpperCase();
  if (!UFS_SUPORTADAS.includes(sigla)) {
    throw new Error(`UF invalida. Suportadas: ${UFS_SUPORTADAS.join(", ")}`);
  }
  return `sicar:sicar_imoveis_${sigla.toLowerCase()}`;
}

function coordenada(valor: number, limite: number, nome: string): number {
  if (!Number.isFinite(valor) || Math.abs(valor) > limite) {
    throw new Error(`${nome} invalido (esperado entre -${limite} e ${limite}).`);
  }
  return valor;
}

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
  const layer = camada(uf);
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
  const layer = camada(uf);
  const oeste = coordenada(minLon, 180, "minLon");
  const sul = coordenada(minLat, 90, "minLat");
  const leste = coordenada(maxLon, 180, "maxLon");
  const norte = coordenada(maxLat, 90, "maxLat");
  if (oeste >= leste || sul >= norte) {
    throw new Error("bbox invalido: minLon/minLat devem ser menores que maxLon/maxLat.");
  }
  const count = Math.min(Math.max(Math.trunc(limite) || 1, 1), 500);
  const url =
    `${CAR_WFS}?service=WFS&version=2.0.0&request=GetFeature` +
    `&typeNames=${layer}&count=${count}&outputFormat=application/json` +
    `&bbox=${sul},${oeste},${norte},${leste}`;

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
  const layer = camada(uf);
  const x = coordenada(lon, 180, "lon");
  const y = coordenada(lat, 90, "lat");
  const cql = encodeURIComponent(
    `INTERSECTS(geo_area_imovel, POINT(${y} ${x}))`
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
