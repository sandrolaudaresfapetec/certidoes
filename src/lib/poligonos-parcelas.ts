import type { PoligonoVinculado } from "@/lib/cjt-formulario";

/** O que a consulta ao SIGEF devolve sobre cada parcela (só o que a conferência usa). */
export interface ParcelaConsultada {
  parcelaCodigo: string;
  nomeArea: string;
  areaHectares: number;
}

/**
 * Confere o vínculo polígono → parcela contra o que o SIGEF devolveu para o solicitante
 * (#PEND-34): a parcela precisa constar na consulta, não pode se repetir, e a parcela do
 * primeiro polígono é o imóvel principal da requisição. Devolve os pares já com nome e área.
 */
export function conferirParcelasDosPoligonos(dados: {
  nomes: string[];
  parcelas: string[];
  consulta: ParcelaConsultada[];
  parcelaPrincipal?: string | null;
}): { ok: true; poligonos: PoligonoVinculado[] } | { ok: false; erro: string } {
  const poligonos: PoligonoVinculado[] = [];
  for (let i = 0; i < dados.nomes.length; i++) {
    const codigo = (dados.parcelas[i] ?? "").trim();
    const encontrada = dados.consulta.find((p) => p.parcelaCodigo === codigo);
    if (!encontrada) {
      return {
        ok: false,
        erro: `A parcela escolhida para "${dados.nomes[i]}" não consta entre os imóveis do solicitante no SIGEF.`,
      };
    }
    poligonos.push({
      nome: dados.nomes[i].trim(),
      parcelaCodigo: encontrada.parcelaCodigo,
      nomeArea: encontrada.nomeArea,
      areaHa: encontrada.areaHectares,
    });
  }
  const principal = (dados.parcelaPrincipal ?? "").toString().trim();
  if (principal && principal !== poligonos[0]?.parcelaCodigo) {
    return { ok: false, erro: "O imóvel principal deve ser a parcela do primeiro polígono." };
  }
  return { ok: true, poligonos };
}
