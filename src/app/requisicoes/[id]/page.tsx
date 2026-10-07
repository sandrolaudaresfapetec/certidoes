import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario, podeAtender } from "@/lib/auth";
import { RequisicaoDetalhe } from "@/components/requisicao-detalhe";
import { geometriaDoAcervo } from "@/components/requisicao/geometria";
import {
  AberturaProcesso,
  DevolverRequisicao,
  FinalizacaoPagamento,
  LiberarRequisicao,
} from "@/components/atendimento-acoes";
import {
  STATUS_SOLICITACAO,
  bloqueioAcaoAtendimento,
  podeDevolver,
  podeLiberar,
  visivelAoAtendimento,
} from "@/lib/solicitacao-estados";
import { chatAceitaMensagens, chatVisivel, listarMensagens, marcarLido } from "@/lib/chat";
import { ChatSolicitacao } from "@/components/requisicao/chat";

export const dynamic = "force-dynamic";

export default async function VisualizarRequisicaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await requireUsuario();

  const requisicao = await prisma.solicitacao.findUnique({
    where: { id },
    include: {
      solicitante: true,
      documentos: { select: { id: true, tipo: true, nomeArquivo: true } },
      process: {
        select: { id: true, ordem: true, situacao: true, tipoServico: true, expediente: true },
      },
    },
  });
  // Rascunho é só do solicitante: o atendimento não o enxerga, nem pelo link direto.
  if (!requisicao || !visivelAoAtendimento(requisicao.status, requisicao.congeladaEm)) notFound();

  // Contorno do imóvel no acervo SIGEF importado (vazio até a importação; #PEND-33).
  const parcela = requisicao.sigefParcelaCodigo
    ? await prisma.sigefParcela.findUnique({
        where: { codigoParcela: requisicao.sigefParcelaCodigo },
        select: { geometria: true },
      })
    : null;
  const geometriaImovel = geometriaDoAcervo(parcela?.geometria);

  const atendimento = podeAtender(usuario);

  // Chat só para o atendimento (ADMIN e SDTC); abrir a tela conta como leitura.
  const chatDisponivel = atendimento && chatVisivel(requisicao.status, requisicao.congeladaEm);
  const mensagens = chatDisponivel ? await listarMensagens(requisicao.id) : [];
  if (chatDisponivel) await marcarLido(requisicao.id, "ATENDIMENTO");

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <Link
        href="/requisicoes"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Requisições
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Visualizar Requisição</h1>

      <RequisicaoDetalhe
        requisicao={requisicao}
        escopo="INTERNO"
        geometriaImovel={geometriaImovel}
        chat={
          chatDisponivel ? (
            <ChatSolicitacao
              endpoint={`/api/requisicoes/${requisicao.id}/mensagens`}
              lado="ATENDIMENTO"
              inicial={mensagens}
              aceitaInicial={chatAceitaMensagens(requisicao.status, requisicao.congeladaEm)}
              titulo="Conversa com o solicitante"
              subtitulo={`${requisicao.solicitante.nome} · ${requisicao.protocolo}`}
              rotuloCampo="Mensagem para o solicitante"
            />
          ) : null
        }
      />

      {atendimento && requisicao.status === STATUS_SOLICITACAO.DEVOLVIDA && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p>
            <strong className="font-semibold">
              Devolvida ao solicitante
              {requisicao.devolvidaEm &&
                ` em ${new Date(requisicao.devolvidaEm).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  dateStyle: "short",
                  timeStyle: "short",
                })}`}
              .
            </strong>{" "}
            Aguardando o reenvio. Abertura de processo e pagamento ficam bloqueados até lá.
          </p>
          {requisicao.devolucaoMotivo && (
            <blockquote className="mt-2 whitespace-pre-wrap rounded-md border border-red-200 bg-white px-3 py-2 text-gray-900">
              {requisicao.devolucaoMotivo}
            </blockquote>
          )}
        </div>
      )}

      {atendimento && requisicao.status === STATUS_SOLICITACAO.AGUARDANDO_LIBERACAO && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          <strong className="font-semibold">
            Pedido congelado: {requisicao.cjtQtdPoligonos} polígonos.
          </strong>{" "}
          Aguardando a liberação da DDD. Abertura de processo e pagamento ficam bloqueados.
        </div>
      )}

      {atendimento && requisicao.status === STATUS_SOLICITACAO.RASCUNHO && requisicao.liberadaEm && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <strong className="font-semibold">
            Liberada em{" "}
            {new Date(requisicao.liberadaEm).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              dateStyle: "short",
              timeStyle: "short",
            })}
            .
          </strong>{" "}
          Aguardando o solicitante concluir o preenchimento e enviar.
        </div>
      )}

      {atendimento && (
        <div className="space-y-6">
          {podeLiberar(requisicao) && <LiberarRequisicao requisicaoId={requisicao.id} />}
          {podeDevolver(requisicao) && <DevolverRequisicao requisicaoId={requisicao.id} />}
          {bloqueioAcaoAtendimento(requisicao.status) === null && (
            <>
              {!requisicao.process && <AberturaProcesso requisicaoId={requisicao.id} />}
              <FinalizacaoPagamento
                requisicaoId={requisicao.id}
                statusInicial={requisicao.pagamentoStatus}
                valorInicial={requisicao.pagamentoValor}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
