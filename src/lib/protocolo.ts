import { prisma } from "@/lib/prisma";

/** Formato do protocolo: CERT-AAAA-NNNNNN, com o sequencial reiniciado a cada ano. */
export function formatarProtocolo(ano: number, sequencial: number): string {
  return `CERT-${ano}-${String(sequencial).padStart(6, "0")}`;
}

/** Sequencial de um protocolo no formato acima, ou null se o texto não segue o padrão. */
export function sequencialDoProtocolo(protocolo: string, ano: number): number | null {
  const m = new RegExp(`^CERT-${ano}-(\\d{1,})$`).exec(protocolo);
  return m ? Number.parseInt(m[1], 10) : null;
}

function violouUnicidade(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

/**
 * Próximo protocolo do ano: maior sequencial já gravado + 1. Antes era `count()+1`, que
 * repete número quando duas requisições chegam juntas ou quando alguma é apagada.
 */
export async function proximoProtocolo(agora: Date = new Date()): Promise<string> {
  const ano = agora.getFullYear();
  const ultima = await prisma.solicitacao.findFirst({
    where: { protocolo: { startsWith: `CERT-${ano}-` } },
    orderBy: { protocolo: "desc" },
    select: { protocolo: true },
  });
  const ultimo = ultima ? (sequencialDoProtocolo(ultima.protocolo, ano) ?? 0) : 0;
  return formatarProtocolo(ano, ultimo + 1);
}

/**
 * Cria o registro com um protocolo novo. Se outra requisição ganhar o mesmo número no
 * intervalo (violação de unicidade em `protocolo`), tenta de novo com o seguinte.
 */
export async function criarComProtocolo<T>(
  criar: (protocolo: string) => Promise<T>,
  tentativas = 5
): Promise<T> {
  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await criar(await proximoProtocolo());
    } catch (e) {
      if (!violouUnicidade(e)) throw e;
      ultimoErro = e;
    }
  }
  throw ultimoErro;
}
