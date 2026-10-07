import { prisma } from "@/lib/prisma";
import { consultarParcelasSigef } from "@/lib/sigef";

/** Campos do imovel do SIGEF persistidos na requisicao. */
export interface ImovelSigefPersistido {
  sigefCodigoImovel: string | null;
  sigefParcelaCodigo: string | null;
  sigefNomeArea: string | null;
  sigefAreaHectares: number | null;
  sigefMunicipio: string | null;
  sigefUf: string | null;
  sigefStatus: string | null;
  sigefOrigem: string | null;
}

/** Requisicao sem imovel do SIGEF (preenchimento interno pelo funcionario). */
export const IMOVEL_SIGEF_VAZIO: ImovelSigefPersistido = {
  sigefCodigoImovel: null,
  sigefParcelaCodigo: null,
  sigefNomeArea: null,
  sigefAreaHectares: null,
  sigefMunicipio: null,
  sigefUf: null,
  sigefStatus: null,
  sigefOrigem: null,
};

function texto(valor: unknown): string | null {
  const s = (valor ?? "").toString().trim();
  return s ? s.slice(0, 200) : null;
}

/**
 * Monta os dados do imovel a partir do acervo do SIGEF importado.
 *
 * O portal envia apenas o codigo da parcela escolhida; todos os atributos
 * (nome, area, municipio, uf, situacao, origem) vem do acervo importado ou,
 * quando o acervo nao cobre o solicitante, da consulta ao SIGEF refeita no
 * servidor para o proprio CPF/CNPJ. Codigo que nao aparece em nenhuma das duas
 * fontes e recusado (retorna null), para que o cliente nao possa cadastrar um
 * imovel inexistente nem sobrescrever os dados oficiais.
 */
export async function resolverImovelSigef(
  body: Record<string, unknown>,
  cpfCnpj: string
): Promise<ImovelSigefPersistido | null> {
  const parcelaCodigo = texto(body.sigefParcelaCodigo);
  if (!parcelaCodigo) return null;

  const parcela = await prisma.sigefParcela.findUnique({
    where: { codigoParcela: parcelaCodigo },
    select: {
      codigoParcela: true,
      codigoImovel: true,
      nomeArea: true,
      areaHa: true,
      municipio: true,
      municipioIbge: true,
      uf: true,
      status: true,
    },
  });

  if (parcela) {
    return {
      sigefCodigoImovel: parcela.codigoImovel || parcela.codigoParcela,
      sigefParcelaCodigo: parcela.codigoParcela,
      sigefNomeArea: parcela.nomeArea,
      sigefAreaHectares: parcela.areaHa,
      sigefMunicipio:
        parcela.municipio ||
        (parcela.municipioIbge ? `IBGE ${parcela.municipioIbge}` : null),
      sigefUf: parcela.uf,
      sigefStatus: parcela.status,
      sigefOrigem: "SIGEF_REAL",
    };
  }

  const consulta = await consultarParcelasSigef(cpfCnpj);
  const oferecida = consulta.parcelas.find(
    (p) => p.parcelaCodigo === parcelaCodigo
  );
  if (!oferecida) return null;

  return {
    sigefCodigoImovel: oferecida.codigoImovel || oferecida.parcelaCodigo,
    sigefParcelaCodigo: oferecida.parcelaCodigo,
    sigefNomeArea: texto(oferecida.nomeArea),
    sigefAreaHectares:
      Number.isFinite(oferecida.areaHectares) && oferecida.areaHectares > 0
        ? oferecida.areaHectares
        : null,
    sigefMunicipio: texto(oferecida.municipio),
    sigefUf: texto(oferecida.uf),
    sigefStatus: texto(oferecida.status),
    sigefOrigem: consulta.origem,
  };
}
