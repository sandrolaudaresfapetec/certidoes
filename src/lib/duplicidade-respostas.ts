import { prisma } from "@/lib/prisma";
import { paraMensagemChat } from "@/lib/chat";
import { RESPOSTA_ENCERRADA, type MensagemChat } from "@/lib/chat-tipos";
import { chaveDuplicidade, lerChaveDuplicidade } from "@/lib/duplicidade";
import { STATUS_SOLICITACAO } from "@/lib/solicitacao-estados";
import { Conflito, arquivarNaTransacao, devolverAFilaSeLivre, eventoNaTransacao } from "@/lib/arquivamento-servidor";

/**
 * Resposta do solicitante às perguntas de duplicidade (#PEND-30). Cada resposta é uma
 * transação: a pergunta só é respondida se ainda estiver aberta, e o efeito (seguir para a
 * fila ou arquivar) acontece junto. Em S3 as DUAS perguntas são fechadas na mesma transação,
 * em ordem de id, para duas respostas simultâneas nunca arquivarem as duas requisições.
 */

export type ResultadoRespostaDuplicidade =
  | { ok: true; mensagem: MensagemChat }
  | { ok: false; erro: string; status: 400 | 404 | 409 };

function lerOpcoes(json: string | null): { id: string; rotulo: string }[] {
  try {
    const lista: unknown = json ? JSON.parse(json) : [];
    return Array.isArray(lista) ? lista.filter((o) => typeof o?.id === "string") : [];
  } catch {
    return [];
  }
}

export async function responderDuplicidade(dados: {
  solicitacaoId: string;
  mensagemId: string;
  opcaoId: string;
}): Promise<ResultadoRespostaDuplicidade> {
  const pergunta = await prisma.mensagemSolicitacao.findFirst({
    where: { id: dados.mensagemId, solicitacaoId: dados.solicitacaoId },
  });
  const chave = lerChaveDuplicidade(pergunta?.chave);
  if (!pergunta || pergunta.tipo !== "PERGUNTA" || !chave) {
    return { ok: false, erro: "Pergunta não encontrada.", status: 404 };
  }
  if (!lerOpcoes(pergunta.opcoes).some((o) => o.id === dados.opcaoId)) {
    return { ok: false, erro: "Escolha uma das opções da pergunta.", status: 400 };
  }
  const esta = await prisma.solicitacao.findUnique({
    where: { id: dados.solicitacaoId },
    select: { id: true, protocolo: true, status: true },
  });
  if (!esta) return { ok: false, erro: "Pergunta não encontrada.", status: 404 };
  const outra = await prisma.solicitacao.findUnique({
    where: { id: chave.idOutra },
    select: { id: true, protocolo: true, status: true },
  });

  try {
    await prisma.$transaction(async (tx) => {
      const agora = new Date();

      if (chave.situacao === "S3") {
        // Fecha as duas perguntas em ordem de id (evita impasse entre respostas simultâneas).
        const parPergunta = await tx.mensagemSolicitacao.findFirst({
          where: { solicitacaoId: chave.idOutra, chave: chaveDuplicidade("S3", dados.solicitacaoId) },
          select: { id: true },
        });
        const alvos = [
          { id: pergunta.id, opcao: dados.opcaoId },
          ...(parPergunta ? [{ id: parPergunta.id, opcao: RESPOSTA_ENCERRADA }] : []),
        ].sort((a, b) => a.id.localeCompare(b.id));
        for (const a of alvos) {
          const r = await tx.mensagemSolicitacao.updateMany({
            where: { id: a.id, respondidaEm: null },
            data: { respostaOpcao: a.opcao, respondidaEm: agora },
          });
          if (r.count === 0) throw new Conflito();
        }
        if (!outra) throw new Conflito();

        const manterEsta = dados.opcaoId === "manter_esta";
        const perde = manterEsta ? outra : esta;
        const fica = manterEsta ? esta : outra;
        await arquivarNaTransacao(
          tx,
          perde,
          `Arquivada a pedido do solicitante: duplicada da ${fica.protocolo}.`,
          [STATUS_SOLICITACAO.PENDENTE, STATUS_SOLICITACAO.AGUARDANDO_CLIENTE]
        );
        await eventoNaTransacao(tx, fica.id, `DUP-RESP:${pergunta.id}`, `Resposta registrada. Esta requisição segue; a ${perde.protocolo} foi arquivada.`);
        await eventoNaTransacao(tx, perde.id, `DUP-RESP:${parPergunta?.id ?? pergunta.id}`, `Resposta registrada. Esta requisição foi arquivada; a ${fica.protocolo} segue.`);
        await devolverAFilaSeLivre(tx, fica.id);
        return;
      }

      // S1 e S2: só esta requisição é afetada.
      const r = await tx.mensagemSolicitacao.updateMany({
        where: { id: pergunta.id, respondidaEm: null },
        data: { respostaOpcao: dados.opcaoId, respondidaEm: agora },
      });
      if (r.count === 0) throw new Conflito();

      if (dados.opcaoId === "arquivar") {
        await arquivarNaTransacao(tx, esta, `Arquivada a pedido do solicitante: já existe a certidão ${outra?.protocolo ?? "anterior"}.`, [
          STATUS_SOLICITACAO.AGUARDANDO_CLIENTE,
          STATUS_SOLICITACAO.PENDENTE,
        ]);
        await eventoNaTransacao(tx, esta.id, `DUP-RESP:${pergunta.id}`, "Resposta registrada. Esta requisição foi arquivada a seu pedido.");
      } else {
        await eventoNaTransacao(tx, esta.id, `DUP-RESP:${pergunta.id}`, "Resposta registrada. A requisição segue para a fila do atendimento.");
        await devolverAFilaSeLivre(tx, esta.id);
      }
    });
  } catch (e) {
    if (e instanceof Conflito) {
      return {
        ok: false,
        erro: "Esta pergunta já foi respondida ou a situação da requisição mudou. Atualize a página.",
        status: 409,
      };
    }
    throw e;
  }

  const atualizada = await prisma.mensagemSolicitacao.findUniqueOrThrow({ where: { id: pergunta.id } });
  return { ok: true, mensagem: paraMensagemChat(atualizada) };
}
