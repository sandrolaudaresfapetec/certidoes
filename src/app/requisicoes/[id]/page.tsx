import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario, podeAtender } from "@/lib/auth";
import { RequisicaoDetalhe } from "@/components/requisicao-detalhe";
import { geometriaDoAcervo } from "@/components/requisicao/geometria";
import { AberturaProcesso, FinalizacaoPagamento } from "@/components/atendimento-acoes";
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
  if (!requisicao) notFound();

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
  const chatDisponivel = atendimento && chatVisivel(requisicao.status);
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
              aceitaInicial={chatAceitaMensagens(requisicao.status)}
              titulo="Conversa com o solicitante"
              subtitulo={`${requisicao.solicitante.nome} · ${requisicao.protocolo}`}
              rotuloCampo="Mensagem para o solicitante"
            />
          ) : null
        }
      />

      {atendimento && (
        <div className="space-y-6">
          {!requisicao.process && <AberturaProcesso requisicaoId={requisicao.id} />}
          <FinalizacaoPagamento
            requisicaoId={requisicao.id}
            statusInicial={requisicao.pagamentoStatus}
            valorInicial={requisicao.pagamentoValor}
          />
        </div>
      )}
    </div>
  );
}
