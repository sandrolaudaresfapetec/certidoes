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

function estenderLinha(feature: any): any {
  // Extend: garante que a linha transpassa o poligono (rios, divisas curtas)
  try {
    return (turf as any).lineExtend(feature, 5, 5, { units: "kilometers" });
  } catch {
    return feature;
  }
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
    return noCorredor ? "FACIL" : "MEDIO";
  }

  const municipios = new Set(intersectantes.flatMap((l) => l.municipios));
  const temRio = intersectantes.some((l) => l.tipo === "RIO");
  if (temRio || municipios.size >= 3 || intersectantes.some((l) => l.tipo === "TRIPLICE" || l.tipo === "QUADRUPLA")) {
    return "PIOR_CASO";
  }
  return "DIFICIL";
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
          const cortes: any = (turf as any).polygonSlice(peca, linhaEstendida);
          if (cortes && cortes.features && cortes.features.length > 0) {
            novasPecas.push(...cortes.features);
          } else {
            novasPecas.push(peca);
          }
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
  let fragmentos: FragmentoCorte[] = pecas.map((p, i) => {
    const area = turf.area(p);
    return {
      fragmento: i + 1,
      areaHa: Math.round((area / 10000) * 100) / 100,
      percentual: Math.round((area / areaTotal) * 10000) / 100,
      municipio: municipiosRef.length > 0 ? municipiosRef[Math.min(i, municipiosRef.length - 1)] : null,
      geometria: p.geometry,
    };
  });

  fragmentos = identificarMunicipios(fragmentos, intersectantes, municipiosRef);
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
          const corA = corDoFragmento(frag.geometria, linha.feature, ladoA);
          return { ...frag, municipio: corA ? ladoA : ladoB };
        }
      }
    } catch { /* mantem municipio de referencia */ }
    return { ...frag, municipio: frag.municipio ?? municipiosRef[0] };
  });
}

/** Heuristica de lado: compara o centroide do fragmento com o ponto medio da linha. */
function corDoFragmento(geometria: any, linha: any, _lado: string): boolean {
  const c = turf.centroid(geometria).geometry.coordinates;
  const coords = (linha.geometry?.coordinates ?? []) as number[][];
  const meio = coords[Math.floor(coords.length / 2)] ?? [0, 0];
  // lado "A" = leste/sul do ponto medio (deterministico por geometria)
  return c[0] * 0.7 + c[1] * 0.3 >= meio[0] * 0.7 + meio[1] * 0.3;
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
