import { formularioDoPayload, normalizarRascunho, somenteDigitos } from "@/lib/cjt-formulario";

function texto(valor: unknown, max = 200): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim().slice(0, max) : null;
}

/**
 * Dados de um rascunho a partir do corpo da requisição (#PEND-42). Não valida nada: guarda
 * o que veio, já saneado. Representação só vale para "Representante"; o resto é descartado.
 */
export function dadosDoRascunho(body: Record<string, unknown>, tipoViaSigef: boolean) {
  const formulario = formularioDoPayload(body.cjt);
  const area = Number(body.sigefAreaHectares);
  const representa = formulario.qualidade === "1a";

  return {
    tipoViaSigef,
    sigefCodigoImovel: tipoViaSigef ? texto(body.sigefCodigoImovel) : null,
    sigefParcelaCodigo: tipoViaSigef ? texto(body.sigefParcelaCodigo) : null,
    sigefNomeArea: tipoViaSigef ? texto(body.sigefNomeArea, 300) : null,
    sigefAreaHectares:
      tipoViaSigef && body.sigefAreaHectares != null && Number.isFinite(area) ? area : null,
    sigefMunicipio: tipoViaSigef ? texto(body.sigefMunicipio) : null,
    sigefUf: tipoViaSigef ? texto(body.sigefUf, 2) : null,
    sigefStatus: tipoViaSigef ? texto(body.sigefStatus) : null,
    sigefOrigem: tipoViaSigef ? texto(body.sigefOrigem, 20) : null,
    emNomeDeCpf: representa ? somenteDigitos(String(body.emNomeDeCpf ?? "")).slice(0, 14) || null : null,
    emNomeDeNome: representa ? texto(body.emNomeDeNome) : null,
    observacao: texto(body.observacao, 2000),
    ...normalizarRascunho(formulario),
  };
}
