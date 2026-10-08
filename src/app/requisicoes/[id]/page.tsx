import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario, podeAtender } from "@/lib/auth";
import { RequisicaoDetalhe } from "@/components/requisicao-detalhe";
import { geometriaDoAcervo } from "@/components/requisicao/geometria";
import {
  AberturaProcesso,
  ConferirDocumentos,
  DecidirArquivamento,
  DesarquivarRequisicao,
  DevolverRequisicao,
  FinalizacaoPagamento,
  LiberarRequisicao,
} from "@/components/atendimento-acoes";
import {
  STATUS_SOLICITACAO,
  bloqueioAcaoAtendimento,
  podeDesarquivar,
  podeDevolver,
  podeLiberar,
  statusAposDesarquivar,
  visivelAoAtendimento,
} from "@/lib/solicitacao-estados";
import { statusRequisicao } from "@/lib/requisicao-status";
import { chatAceitaMensagens, chatVisivel, listarMensagens, marcarLido } from "@/lib/chat";
import { ChatSolicitacao } from "@/components/requisicao/chat";
import { carregarPoligonosDetalhe } from "@/lib/poligonos-detalhe";
import { sobreposicoesDe } from "@/lib/duplicidade-servidor";
import { AvisoAnaliseDuplicidade, AvisoSobreposicao } from "@/components/requisicao/avisos-duplicidade";

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
        select: {
          id: true,
          ordem: true,
          situacao: true,
          tipoServico: true,
          expediente: true,
          nivelComplexidade: true,
        },
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

  // Repetições e sobreposições achadas pela análise de duplicidade (#PEND-30).
  const sobreposicoes = await sobreposicoesDe(requisicao);

  // Polígonos nomeados ligados às parcelas do SIGEF (gleba com 2 ou mais).
  const poligonosVinculados = await carregarPoligonosDetalhe(requisicao);

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

      {atendimento && podeDesarquivar(requisicao) && (
        <div role="status" className="rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm text-gray-800">
          <strong className="font-semibold">Requisição arquivada.</strong> Para devolvê-la ao andamento,{" "}
          <a href="#desarquivar" className="font-semibold text-emerald-700 underline">
            desarquive-a
          </a>{" "}
          (o painel fica no fim da página).
        </div>
      )}
      <AvisoSobreposicao sobreposicoes={sobreposicoes} />
      {atendimento && (
        <AvisoAnaliseDuplicidade
          status={requisicao.status}
          processId={requisicao.processId}
          analiseDuplicidadeEm={requisicao.analiseDuplicidadeEm}
        />
      )}

      {atendimento && requisicao.status === STATUS_SOLICITACAO.ARQUIVAMENTO_SOLICITADO && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong className="font-semibold">
            O solicitante pediu o arquivamento
            {requisicao.arquivamentoSolicitadoEm &&
              ` em ${new Date(requisicao.arquivamentoSolicitadoEm).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                dateStyle: "short",
                timeStyle: "short",
              })}`}
            .
          </strong>{" "}
          Abertura de processo e pagamento ficam bloqueados até a decisão.
          {requisicao.arquivamentoMotivo && (
            <blockquote className="mt-2 whitespace-pre-wrap rounded-md border border-amber-200 bg-white px-3 py-2 text-gray-900">
              {requisicao.arquivamentoMotivo}
            </blockquote>
          )}
        </div>
      )}

      <RequisicaoDetalhe
        requisicao={requisicao}
        escopo="INTERNO"
        geometriaImovel={geometriaImovel}
        poligonosVinculados={poligonosVinculados}
        chat={
          chatDisponivel ? (
            <ChatSolicitacao
              // Recria o chat quando a página recarrega com outro estado (ex.: arquivada agora).
              key={`${requisicao.status}-${mensagens.length}`}
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
          {requisicao.status === STATUS_SOLICITACAO.ARQUIVAMENTO_SOLICITADO && (
            <DecidirArquivamento
              requisicaoId={requisicao.id}
              numeroProcesso={requisicao.process?.ordem ?? null}
            />
          )}
          {podeDesarquivar(requisicao) && (
            <DesarquivarRequisicao
              requisicaoId={requisicao.id}
              destino={statusRequisicao(statusAposDesarquivar(requisicao)).label}
            />
          )}
          {podeLiberar(requisicao) && <LiberarRequisicao requisicaoId={requisicao.id} />}
          {podeDevolver(requisicao) && <DevolverRequisicao requisicaoId={requisicao.id} />}
          {bloqueioAcaoAtendimento(requisicao.status) === null && (
            <>
              {requisicao.analiseDuplicidadeEm && !requisicao.docsConferidosEm && (
                <ConferirDocumentos requisicaoId={requisicao.id} />
              )}
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
