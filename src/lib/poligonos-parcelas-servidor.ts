import type { FormularioCjt } from "@/lib/cjt-formulario";
import { conferirParcelasDosPoligonos } from "@/lib/poligonos-parcelas";
import { consultarParcelasSigef } from "@/lib/sigef";

/**
 * Vínculo polígono → parcela de uma requisição (#PEND-34). Só existe em gleba com 2 ou mais
 * polígonos e imóvel do SIGEF; nos demais casos devolve `null` (nada a guardar). A conferência
 * usa a mesma consulta que a tela fez, para o CPF do solicitante.
 */
export async function resolverPoligonos(dados: {
  cpf: string;
  formulario: FormularioCjt;
  tipoViaSigef: boolean;
  parcelaPrincipal: unknown;
}): Promise<{ ok: true; cjtPoligonos: string | null } | { ok: false; erro: string }> {
  const { formulario } = dados;
  if (!dados.tipoViaSigef || formulario.resultado !== "2b" || formulario.nomesPoligonos.length < 2) {
    return { ok: true, cjtPoligonos: null };
  }
  const consulta = await consultarParcelasSigef(dados.cpf);
  const r = conferirParcelasDosPoligonos({
    nomes: formulario.nomesPoligonos,
    parcelas: formulario.parcelasPoligonos,
    consulta: consulta.parcelas,
    parcelaPrincipal: typeof dados.parcelaPrincipal === "string" ? dados.parcelaPrincipal : null,
  });
  if (!r.ok) return r;
  return { ok: true, cjtPoligonos: JSON.stringify(r.poligonos) };
}
