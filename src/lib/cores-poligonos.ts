/** Cor de cada polígono nomeado, usada na lista, no mapa e na legenda (a cor nunca é a única pista). */
export const CORES_POLIGONOS = [
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#8b5cf6",
  "#0891b2",
  "#d946ef",
  "#65a30d",
  "#ea580c",
  "#4f46e5",
  "#be123c",
  "#0d9488",
] as const;

export function corDoPoligono(indice: number): string {
  return CORES_POLIGONOS[indice % CORES_POLIGONOS.length];
}
