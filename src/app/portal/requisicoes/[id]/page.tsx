import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSolicitante } from "@/lib/portal-auth";
import { RequisicaoDetalhe } from "@/components/requisicao-detalhe";
import { geometriaDoAcervo } from "@/components/requisicao/geometria";
import { clientePodeEditar } from "@/lib/solicitacao-estados";
import { chatAceitaMensagens, chatVisivel, listarMensagens, marcarLido } from "@/lib/chat";
import { ChatSolicitacao } from "@/components/requisicao/chat";

export const dynamic = "force-dynamic";

export default async function AcompanharRequisicaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const solicitante = await requireSolicitante();

  // Escopo do cliente: apenas requisições do próprio solicitante.
  const requisicao = await prisma.solicitacao.findFirst({
    where: { id, solicitanteId: solicitante.id },
    include: {
      solicitante: true,
      documentos: { select: { id: true, tipo: true, nomeArquivo: true } },
      process: {
        select: { id: true, ordem: true, situacao: true, tipoServico: true, expediente: true },
      },
    },
  });
  if (!requisicao) notFound();
  // Rascunho não tem acompanhamento: o solicitante volta para continuar o formulário.
  if (requisicao.status === "RASCUNHO") redirect(`/portal/requisicoes/${id}/editar`);

  // Contorno do imóvel no acervo SIGEF importado (vazio até a importação; #PEND-33).
  const parcela = requisicao.sigefParcelaCodigo
    ? await prisma.sigefParcela.findUnique({
        where: { codigoParcela: requisicao.sigefParcelaCodigo },
        select: { geometria: true },
      })
    : null;
  const geometriaImovel = geometriaDoAcervo(parcela?.geometria);

  // O cliente só altera a requisição depois que a equipe a devolve.
  const editavel = clientePodeEditar(requisicao);

  // Chat: abrir a tela conta como leitura (some o selo "novas" da lista).
  const chatDisponivel = chatVisivel(requisicao.status);
  const mensagens = chatDisponivel ? await listarMensagens(requisicao.id) : [];
  if (chatDisponivel) await marcarLido(requisicao.id, "SOLICITANTE");

  return (
    <div>
      <Link
        href="/portal"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Minhas Requisições
      </Link>
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Acompanhar Requisição</h1>
      <RequisicaoDetalhe requisicao={requisicao} escopo="CLIENTE"
        editavel={editavel}
        geometriaImovel={geometriaImovel}
        chat={
          chatDisponivel ? (
            <ChatSolicitacao
              endpoint={`/api/portal/solicitacoes/${requisicao.id}/mensagens`}
              lado="SOLICITANTE"
              inicial={mensagens}
              aceitaInicial={chatAceitaMensagens(requisicao.status)}
              titulo="Conversa com o IGC"
              subtitulo="Todas as comunicações e pedidos de complementação são feitos aqui."
              rotuloCampo="Mensagem para o IGC"
            />
          ) : null
        }
      />
    </div>
  );
}
