import { STATUS_SOLICITACAO } from "@/lib/solicitacao-estados";

/**
 * Partes do chat sem acesso a banco (tipos, limites e regras puras). O componente cliente
 * importa só daqui; `chat.ts` traz o que usa o Prisma.
 */

export const LIMITE_TEXTO_CHAT = 2000;

export type AutorChat = "SOLICITANTE" | "ATENDIMENTO" | "SISTEMA";
export type TipoMensagemChat = "TEXTO" | "PERGUNTA" | "EVENTO";
/** Quem está olhando o chat: define o que conta como "nova" e quem pode responder. */
export type LadoChat = "SOLICITANTE" | "ATENDIMENTO";

export interface OpcaoPergunta {
  id: string;
  rotulo: string;
}

/** Forma da mensagem que vai para a tela (datas em texto ISO, opções já lidas). */
export interface MensagemChat {
  id: string;
  autorTipo: AutorChat;
  autorNome: string;
  tipo: TipoMensagemChat;
  texto: string;
  opcoes: OpcaoPergunta[] | null;
  respostaOpcao: string | null;
  respondidaEm: string | null;
  createdAt: string;
}

/** Em rascunho comum o chat nem existe; arquivada só permite ler. */
export function chatVisivel(status: string): boolean {
  return status !== STATUS_SOLICITACAO.RASCUNHO;
}

export function chatAceitaMensagens(status: string): boolean {
  return chatVisivel(status) && status !== STATUS_SOLICITACAO.ARQUIVADA;
}

export function validarTextoMensagem(
  texto: unknown
): { ok: true; texto: string } | { ok: false; erro: string } {
  const limpo = typeof texto === "string" ? texto.trim() : "";
  if (!limpo) return { ok: false, erro: "Escreva uma mensagem antes de enviar." };
  if (limpo.length > LIMITE_TEXTO_CHAT) {
    return { ok: false, erro: `A mensagem pode ter até ${LIMITE_TEXTO_CHAT} caracteres.` };
  }
  return { ok: true, texto: limpo };
}

/**
 * Mensagens novas para quem olha. O solicitante vê como nova toda mensagem do atendimento
 * ou do sistema; o atendimento só as do solicitante. "Nova" = posterior à última leitura.
 */
export function contarNaoLidas(
  mensagens: { autorTipo: string; createdAt: Date }[],
  lidoEm: Date | null,
  lado: LadoChat
): number {
  return mensagens.filter((m) => {
    const dele = lado === "SOLICITANTE" ? m.autorTipo !== "SOLICITANTE" : m.autorTipo === "SOLICITANTE";
    return dele && (!lidoEm || m.createdAt > lidoEm);
  }).length;
}

