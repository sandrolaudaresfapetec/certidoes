/** Converte o GeoJSON guardado como texto no acervo SIGEF; null se ausente ou inválido. */
export function geometriaDoAcervo(json: string | null | undefined): unknown | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
