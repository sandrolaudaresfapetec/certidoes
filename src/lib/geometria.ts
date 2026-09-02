/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Modulo de Geometria de Divisas (reuniao 31/07/2026)
 *
 * Fluxo: poligono do imovel (SIGEF) x linhas de divisa validadas (PostGIS) ->
 * corte automatico -> tecnico confere areas/percentuais por municipio ->
 * conferencia/assinatura. Casos: FACIL (fora do corredor de 1km),
 * MEDIO (no corredor sem corte), DIFICIL (corte simples 2 municipios),
 * PIOR_CASO (divisa triplice/quadrupla ou rio — extend + merge automatico).
 */
import * as turf from "@turf/turf";

export interface LinhaDivisaGeo {
  id: string;
  codigo: string;
  tipo: string;
  municipios: string[];
  feature: any; // GeoJSON LineString/MultiLineString
}

export interface FragmentoCorte {
  fragmento: number;
  areaHa: number;
  percentual: number;
  municipio: string | null; // sugestao automatica; tecnico confirma na tela
  geometria: any;
}

export interface ResultadoCorteDivisa {
  classificacao: "FACIL" | "MEDIO" | "DIFICIL" | "PIOR_CASO";
  fragmentos: FragmentoCorte[];
  linhasUsadas: { id: string; codigo: string }[];
}

const CORREDOR_KM = 1; // corredor de seguranca de 1 km nas fronteiras

function estenderLinha(feature: any, km = 50): any {
  // Extend: garante que a linha transpassa o poligono (rios, divisas curtas).
  // Prolonga cada extremidade na direcao do segmento terminal.
  try {
    const linhas = turf.flatten(feature).features.filter(
      (f: any) => f.geometry?.type === "LineString"
    );
    const estendidas = linhas.map((linha: any) => {
      const coords = linha.geometry.coordinates as number[][];
      if (coords.length < 2) return linha;
      const inicio = turf.destination(
        coords[0],
        km,
        turf.bearing(coords[1], coords[0]),
        { units: "kilometers" }
      ).geometry.coordinates;
      const fim = turf.destination(
        coords[coords.length - 1],
        km,
        turf.bearing(coords[coords.length - 2], coords[coords.length - 1]),
        { units: "kilometers" }
      ).geometry.coordinates;
      return turf.lineString([inicio, ...coords, fim]);
    });
    if (estendidas.length === 0) return feature;
    if (estendidas.length === 1) return estendidas[0];
    return turf.multiLineString(
      estendidas.map((l: any) => l.geometry.coordinates)
    );
  } catch {
    return feature;
  }
}

/** Corta um poligono por uma linha: diferenca contra um buffer fino da linha,
 *  separando as partes resultantes (turf nao possui polygonSlice). */
function cortarPorLinha(poligono: any, linha: any): any[] {
  const faca = turf.buffer(linha, 0.0005, { units: "kilometers" });
  if (!faca) return [poligono];
  const resto: any = turf.difference(
    turf.featureCollection([poligono, faca as any]) as any
  );
  if (!resto) return [poligono];
  const pecas = turf.flatten(resto).features.filter(
    (f: any) => f.geometry?.type === "Polygon" && turf.area(f) > 0
  );
  return pecas.length > 1 ? pecas : [poligono];
}

export function classificarCaso(imovel: any, linhas: LinhaDivisaGeo[]): ResultadoCorteDivisa["classificacao"] {
  const intersectantes = linhas.filter((l) => {
    try { return turf.booleanIntersects(imovel, l.feature); } catch { return false; }
  });

  if (intersectantes.length === 0) {
    // Sem corte: esta dentro do corredor de seguranca?
    const noCorredor = linhas.some((l) => {
      try {
        const buf = turf.buffer(l.feature, CORREDOR_KM, { units: "kilometers" });
        return buf ? turf.booleanIntersects(imovel, buf as any) : false;
      } catch { return false; }
    });
    return noCorredor ? "MEDIO" : "FACIL";
  }

  const municipios = new Set(intersectantes.flatMap((l) => l.municipios));
  const temRio = intersectantes.some((l) => l.tipo === "RIO");
  if (temRio || municipios.size >= 3 || intersectantes.some((l) => l.tipo === "TRIPLICE" || l.tipo === "QUADRUPLA")) {
    return "PIOR_CASO";
  }
  return "DIFICIL";
}

/** Municipio declarado no proprio imovel (CAR/SICAR e SIGEF trazem o municipio
 *  do cadastro). Serve de referencia quando nenhuma linha de divisa corta o
 *  poligono e, portanto, nao ha municipios vindos da divisa. */
function municipioDeclarado(imovel: any): string | null {
  const props = imovel?.properties ?? {};
  if (typeof props.municipio === "string" && props.municipio.trim()) {
    return props.municipio.trim();
  }
  if (Array.isArray(props.municipios) && props.municipios.length === 1) {
    const unico = props.municipios[0];
    if (typeof unico === "string" && unico.trim()) return unico.trim();
  }
  return null;
}

export function cortarImovel(imovel: any, linhas: LinhaDivisaGeo[]): ResultadoCorteDivisa {
  const classificacao = classificarCaso(imovel, linhas);
  const intersectantes = linhas.filter((l) => {
    try { return turf.booleanIntersects(imovel, l.feature); } catch { return false; }
  });
  const linhasUsadas = intersectantes.map((l) => ({ id: l.id, codigo: l.codigo }));

  const areaTotal = turf.area(imovel); // m2
  let pecas: any[] = [imovel];

  if (intersectantes.length > 0) {
    for (const linha of intersectantes) {
      const linhaEstendida = estenderLinha(linha.feature);
      const novasPecas: any[] = [];
      for (const peca of pecas) {
        try {
          novasPecas.push(...cortarPorLinha(peca, linhaEstendida));
        } catch {
          novasPecas.push(peca);
        }
      }
      pecas = novasPecas;
    }
  }

  // Merge automatico de microfragmentos (< 0,5% da area) ao maior vizinho —
  // evita separacao indevida de fragmentos que pela lei nao se separam (ex.: rios)
  pecas = mergeMicrofragmentos(pecas, areaTotal);

  const municipiosRef = [...new Set(intersectantes.flatMap((l) => l.municipios))];
  const declarado = municipioDeclarado(imovel);
  let fragmentos: FragmentoCorte[] = pecas.map((p, i) => {
    const area = turf.area(p);
    return {
      fragmento: i + 1,
      areaHa: Math.round((area / 10000) * 100) / 100,
      percentual: Math.round((area / areaTotal) * 10000) / 100,
      municipio: municipiosRef.length > 0 ? municipiosRef[Math.min(i, municipiosRef.length - 1)] : declarado,
      geometria: p.geometry,
    };
  });

  fragmentos = identificarMunicipios(fragmentos, intersectantes, municipiosRef).map((f) => ({
    ...f,
    municipio: f.municipio ?? declarado,
  }));
  return { classificacao, fragmentos, linhasUsadas };
}

/** Identifica o municipio de cada fragmento: centroide dentro do buffer (1 km)
 *  da linha de divisa -> municipio do lado oposto ao fragmento; fora do buffer,
 *  herda o municipio de referencia (primeira linha intersectante). */
function identificarMunicipios(
  fragmentos: FragmentoCorte[],
  linhas: LinhaDivisaGeo[],
  municipiosRef: string[]
): FragmentoCorte[] {
  if (fragmentos.length <= 1 || municipiosRef.length === 0) return fragmentos;
  const intersectantes = linhas.filter((l) => l.municipios.length >= 2);

  return fragmentos.map((frag) => {
    try {
      const centroide = turf.centroid(frag.geometria as any);
      for (const linha of intersectantes) {
        const buf = turf.buffer(linha.feature, CORREDOR_KM, { units: "kilometers" });
        if (buf && turf.booleanPointInPolygon(centroide, buf as any)) {
          // Fragmento esta na zona de divisa: distribui entre os municipios da linha
          const ladoA = linha.municipios[0];
          const ladoB = linha.municipios[1];
          const corA = corDoFragmento(frag.geometria, linha.feature);
          return { ...frag, municipio: corA ? ladoA : ladoB };
        }
      }
    } catch { /* mantem municipio de referencia */ }
    return { ...frag, municipio: frag.municipio ?? municipiosRef[0] };
  });
}

/** Lado do fragmento em relacao a linha: sinal do produto vetorial entre a
 *  direcao do segmento mais proximo e o vetor ate o centroide. */
function corDoFragmento(geometria: any, linha: any): boolean {
  const c = turf.centroid(geometria).geometry.coordinates;
  const linhas = turf.flatten(linha).features.filter(
    (f: any) => f.geometry?.type === "LineString"
  );
  let melhor = { dist: Infinity, cruz: 0 };
  for (const l of linhas) {
    const coords = l.geometry.coordinates as unknown as number[][];
    for (let i = 0; i < coords.length - 1; i++) {
      const [ax, ay] = coords[i];
      const [bx, by] = coords[i + 1];
      const meio = [(ax + bx) / 2, (ay + by) / 2];
      const dist = (c[0] - meio[0]) ** 2 + (c[1] - meio[1]) ** 2;
      if (dist < melhor.dist) {
        melhor = {
          dist,
          cruz: (bx - ax) * (c[1] - ay) - (by - ay) * (c[0] - ax),
        };
      }
    }
  }
  return melhor.cruz >= 0;
}

function mergeMicrofragmentos(pecas: any[], areaTotal: number): any[] {
  if (pecas.length <= 1) return pecas;
  const LIMIAR = 0.005; // 0,5%
  const grandes = pecas.filter((p) => turf.area(p) / areaTotal >= LIMIAR);
  const micros = pecas.filter((p) => turf.area(p) / areaTotal < LIMIAR);
  for (const micro of micros) {
    // funde o microfragmento ao maior poligono disponivel
    let maior = grandes[0];
    for (const g of grandes) if (turf.area(g) > turf.area(maior)) maior = g;
    try {
      const unido: any = turf.union(turf.featureCollection([maior, micro]) as any);
      if (unido) grandes[grandes.indexOf(maior)] = unido;
    } catch { /* mantem separado se a uniao falhar */ }
  }
  return grandes.length > 0 ? grandes : pecas;
}
