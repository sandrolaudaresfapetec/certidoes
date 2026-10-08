import Link from "next/link";
import { FileText, Lock, Paperclip, Pencil } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { formatarCPF } from "@/lib/cpf";
import { statusRequisicao, PAGAMENTO_LABEL } from "@/lib/requisicao-status";
import {
  rotuloOpcao,
  propriedadeDeExibicao,
  mascaraIncra,
  mascaraCpfCnpj,
} from "@/lib/cjt-formulario";
import { WORKFLOW_STAGES, type WorkflowStage } from "@/lib/workflow";
import { AcompanhamentoRequisicao } from "@/components/requisicao/acompanhamento";
import { MapaImovel } from "@/components/requisicao/mapa-imovel";
import { MapaPoligonos } from "@/components/requisicao/mapa-poligonos";
import { corDoPoligono } from "@/lib/cores-poligonos";
import type { PoligonoDetalhe } from "@/lib/poligonos-detalhe";

export type RequisicaoDetalhada = Prisma.SolicitacaoGetPayload<{
  include: {
    solicitante: true;
    documentos: { select: { id: true; tipo: true; nomeArquivo: true } };
    process: {
      select: { id: true; ordem: true; situacao: true; tipoServico: true; expediente: true };
    };
  };
}>;

/** Status em que o solicitante aguarda a equipe e, por isso, não pode alterar o pedido. */
const STATUS_AGUARDANDO_EQUIPE = ["PENDENTE", "EM_ANALISE", "APROVADA"];

const TIPO_DOC_LABEL: Record<string, string> = {
  PLANTA: "Planta do imóvel",
  DOC_PROPRIEDADE: "Comprovante de propriedade",
  PROCURACAO: "Procuração",
};

function nomesPoligonos(json: string | null): string[] {
  if (!json) return [];
  try {
    const lista: unknown = JSON.parse(json);
    return Array.isArray(lista) ? lista.map((n) => String(n)) : [];
  } catch {
    return [];
  }
}

/**
 * Visualização de uma requisição.
 * escopo="CLIENTE" oculta dados internos (contato do solicitante e processo);
 * escopo="INTERNO" é usado pelo atendimento e pelos responsáveis técnicos.
 * `editavel` (só escopo CLIENTE) indica que a requisição foi devolvida e o solicitante
 * pode alterá-la. `geometriaImovel` é o contorno da parcela no acervo SIGEF (null se não houver).
 */
export function RequisicaoDetalhe({
  requisicao,
  escopo,
  editavel = false,
  geometriaImovel = null,
  chat = null,
  acoesCliente = null,
  poligonosVinculados = [],
}: {
  requisicao: RequisicaoDetalhada;
  escopo: "CLIENTE" | "INTERNO";
  editavel?: boolean;
  geometriaImovel?: unknown | null;
  /** Cartão do chat (montado pela página, que carrega as mensagens). */
  chat?: React.ReactNode;
  /** Ações do solicitante abaixo do acompanhamento (ex.: pedir o arquivamento). */
  acoesCliente?: React.ReactNode;
  /** Polígonos nomeados ligados às parcelas do SIGEF (gleba com 2 ou mais); vazio se não houver. */
  poligonosVinculados?: PoligonoDetalhe[];
}) {
  const st = statusRequisicao(requisicao.status);
  const poligonos = nomesPoligonos(requisicao.cjtNomesPoligonos);
  const propriedade = propriedadeDeExibicao(
    requisicao.cjtSituacao,
    requisicao.cjtPropriedadeDe
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{requisicao.protocolo}</h2>
            <p className="text-xs text-gray-500">
              Aberta em {new Date(requisicao.createdAt).toLocaleDateString("pt-BR")} ·{" "}
              {requisicao.origem === "ATENDIMENTO" ? "Atendimento presencial" : "Portal do solicitante"}
            </p>
          </div>
          <span className={`shrink-0 whitespace-nowrap text-xs font-medium px-2.5 py-1 rounded-full ${st.classe}`}>
            {st.label}
          </span>
        </div>

        {escopo === "CLIENTE" && editavel && requisicao.status === "DEVOLVIDA" && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-900">
              <strong className="font-semibold">A equipe devolveu sua requisição.</strong>{" "}
              Revise os dados e envie novamente.
            </p>
            {requisicao.devolucaoMotivo && (
              <blockquote className="mt-2 whitespace-pre-wrap rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900 [overflow-wrap:anywhere]">
                {requisicao.devolucaoMotivo}
              </blockquote>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/portal/requisicoes/${requisicao.id}/editar`}
                className="inline-flex items-center gap-1 bg-emerald-700 text-white px-4 py-2 rounded-md text-sm hover:bg-emerald-800"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Alterar requisição
              </Link>
              <a
                href="#conversa"
                className="inline-flex items-center rounded-md border border-gray-400 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
              >
                Ver conversa
              </a>
            </div>
          </div>
        )}

        {escopo === "CLIENTE" && requisicao.status === "AGUARDANDO_LIBERACAO" && (
          <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-3">
            <p className="text-xs text-orange-900">
              <strong className="font-semibold">
                Seu pedido tem {requisicao.cjtQtdPoligonos} polígonos e aguarda a liberação da DDD.
              </strong>{" "}
              Enquanto isso o preenchimento fica pausado. Use a conversa abaixo para enviar as
              informações que a equipe pedir.
            </p>
          </div>
        )}

        {escopo === "CLIENTE" && requisicao.status === "RASCUNHO" && requisicao.congeladaEm && (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs text-emerald-900">
              <strong className="font-semibold">A DDD liberou o seu pedido.</strong> Você já pode
              continuar o preenchimento e enviar a solicitação.
            </p>
            <Link
              href={`/portal/requisicoes/${requisicao.id}/editar`}
              className="mt-3 inline-flex items-center gap-1 bg-emerald-700 text-white px-4 py-2 rounded-md text-sm hover:bg-emerald-800"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Continuar solicitação
            </Link>
          </div>
        )}

        {escopo === "CLIENTE" && requisicao.status === "ARQUIVAMENTO_SOLICITADO" && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-900">
              <strong className="font-semibold">
                Pedido de arquivamento enviado
                {requisicao.arquivamentoSolicitadoEm &&
                  ` em ${new Date(requisicao.arquivamentoSolicitadoEm).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    dateStyle: "short",
                    timeStyle: "short",
                  })}`}
                .
              </strong>{" "}
              Aguardando a decisão da DDD. Acompanhe pela conversa abaixo.
            </p>
            {requisicao.arquivamentoMotivo && (
              <blockquote className="mt-2 whitespace-pre-wrap rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900 [overflow-wrap:anywhere]">
                {requisicao.arquivamentoMotivo}
              </blockquote>
            )}
          </div>
        )}

        {requisicao.status === "ARQUIVADA" && (
          <div className="mt-4 rounded-md border border-gray-300 bg-gray-50 p-3">
            <p className="text-xs text-gray-800">
              <strong className="font-semibold">
                Arquivada
                {requisicao.arquivadaEm &&
                  ` em ${new Date(requisicao.arquivadaEm).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    dateStyle: "short",
                    timeStyle: "short",
                  })}`}
                .
              </strong>{" "}
              Esta requisição não terá mais andamento.
            </p>
            {requisicao.arquivamentoMotivo && (
              <blockquote className="mt-2 whitespace-pre-wrap rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 [overflow-wrap:anywhere]">
                {requisicao.arquivamentoMotivo}
              </blockquote>
            )}
          </div>
        )}

        {escopo === "CLIENTE" && !editavel && STATUS_AGUARDANDO_EQUIPE.includes(requisicao.status) && (
          <p className="mt-4 flex items-start gap-2 border-t border-gray-100 pt-3 text-xs text-gray-600">
            <Lock className="mt-px h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            Sua requisição está em análise e não pode ser alterada. Se a equipe precisar de
            ajustes, ela será devolvida a você.
          </p>
        )}
      </div>

      {escopo === "CLIENTE" && (
        <AcompanhamentoRequisicao
          expediente={requisicao.process?.expediente ?? null}
          situacaoProcesso={requisicao.process?.situacao ?? null}
          pagamentoStatus={requisicao.pagamentoStatus}
          pagamentoValor={requisicao.pagamentoValor}
          finalizadaEm={requisicao.finalizadaEm}
          statusRequisicao={requisicao.status}
        />
      )}

      {escopo === "CLIENTE" && acoesCliente}

      {chat}

      <Bloco titulo="Identificação do pedido">
        <Item rotulo="Qualidade do solicitante" valor={rotuloOpcao(requisicao.cjtQualidade)} />
        <Item rotulo="Resultado pretendido" valor={rotuloOpcao(requisicao.cjtResultado)} />
        <Item rotulo="Situação do imóvel" valor={rotuloOpcao(requisicao.cjtSituacao)} />
        {propriedade && <Item rotulo="Propriedade de" valor={propriedade} />}
        {requisicao.cjtMatricula && (
          <Item rotulo="Matrícula" valor={requisicao.cjtMatricula} />
        )}
        {requisicao.cjtCodigoIncra && (
          <Item rotulo="INCRA" valor={mascaraIncra(requisicao.cjtCodigoIncra)} />
        )}
        <Item
          rotulo="Declaração"
          valor={
            requisicao.cjtDeclaracaoAceita
              ? "Aceita pelo solicitante"
              : "Não registrada"
          }
        />
      </Bloco>

      <Bloco
        titulo="Imóvel"
        rodape={
          poligonosVinculados.length > 0 ? (
            <div className="mt-4 space-y-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="py-1 pr-2 font-normal">Polígono</th>
                    <th className="py-1 pr-2 font-normal">Parcela do SIGEF</th>
                    <th className="py-1 font-normal">Área</th>
                  </tr>
                </thead>
                <tbody>
                  {poligonosVinculados.map((p, i) => (
                    <tr key={p.nome} className="border-t border-gray-100 align-top">
                      <td className="py-1.5 pr-2 text-gray-900 [overflow-wrap:anywhere]">
                        <span
                          className="mr-2 inline-block h-3 w-3 rounded-sm border border-gray-400 align-[-1px]"
                          style={{ background: corDoPoligono(i) }}
                          aria-hidden="true"
                        />
                        {p.nome}
                      </td>
                      <td className="py-1.5 pr-2 text-gray-800 [overflow-wrap:anywhere]">
                        {p.nomeArea ?? "—"}
                        <span className="block text-xs text-gray-500">{p.parcelaCodigo}</span>
                      </td>
                      <td className="py-1.5 text-gray-800 whitespace-nowrap">
                        {p.areaHa != null ? `${p.areaHa.toLocaleString("pt-BR")} ha` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <MapaPoligonos
                camadas={poligonosVinculados.map((p, i) => ({
                  geometria: p.geometria,
                  rotulo: p.nome,
                  cor: corDoPoligono(i),
                }))}
                descricao={`Polígonos: ${poligonosVinculados.map((p) => p.nome).join(", ")}`}
              />
            </div>
          ) : requisicao.tipoViaSigef ? (
            <div className="mt-4">
              <MapaImovel
                geometria={geometriaImovel}
                descricao={`Contorno do imóvel ${requisicao.sigefNomeArea ?? "rural"}${
                  requisicao.sigefAreaHectares != null
                    ? `, ${requisicao.sigefAreaHectares.toLocaleString("pt-BR")} ha`
                    : ""
                }`}
              />
            </div>
          ) : undefined
        }
      >
        {requisicao.tipoViaSigef ? (
          <>
            <Item rotulo="Nome da área" valor={requisicao.sigefNomeArea ?? "—"} />
            <Item rotulo="Código do imóvel" valor={requisicao.sigefCodigoImovel ?? "—"} />
            <Item rotulo="Parcela SIGEF" valor={requisicao.sigefParcelaCodigo ?? "—"} />
            <Item
              rotulo="Área"
              valor={
                requisicao.sigefAreaHectares != null
                  ? `${requisicao.sigefAreaHectares.toLocaleString("pt-BR")} ha`
                  : "—"
              }
            />
            {escopo === "INTERNO" && (
              <Item
                rotulo="Município"
                valor={
                  requisicao.sigefMunicipio
                    ? `${requisicao.sigefMunicipio}/${requisicao.sigefUf ?? ""}`
                    : "—"
                }
              />
            )}
          </>
        ) : (
          <p className="text-sm text-gray-600 col-span-2">
            Imóvel sem registro no INCRA — dados serão preenchidos pela equipe do
            IGC a partir dos documentos anexados.
          </p>
        )}
        {requisicao.cjtQtdPoligonos != null && (
          <Item rotulo="Quantidade de polígonos" valor={String(requisicao.cjtQtdPoligonos)} />
        )}
        {poligonos.length > 0 && poligonosVinculados.length === 0 && (
          <div>
            <dt className="text-xs text-gray-500">Polígonos</dt>
            <dd>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {poligonos.map((nome) => (
                  <li
                    key={nome}
                    className="rounded-full border border-gray-300 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-800"
                  >
                    {nome}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {requisicao.emNomeDeNome && (
          <Item
            rotulo="Representando"
            valor={`${requisicao.emNomeDeNome}${
              requisicao.emNomeDeCpf ? ` (${mascaraCpfCnpj(requisicao.emNomeDeCpf)})` : ""
            }`}
          />
        )}
        {requisicao.observacao && <Item rotulo="Observações" valor={requisicao.observacao} />}
      </Bloco>

      {requisicao.documentos.length > 0 && (
        <Bloco titulo="Documentos">
          <ul className="col-span-2 space-y-1">
            {requisicao.documentos.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-sm text-gray-700">
                <Paperclip className="h-4 w-4 text-gray-400" />
                {TIPO_DOC_LABEL[d.tipo] ?? d.tipo} — {d.nomeArquivo}
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      {escopo === "INTERNO" && (
        <Bloco titulo="Solicitante">
          <Item rotulo="Nome" valor={requisicao.solicitante.nome} />
          <Item rotulo="CPF" valor={formatarCPF(requisicao.solicitante.cpf)} />
          <Item rotulo="E-mail" valor={requisicao.solicitante.email ?? "—"} />
          <Item rotulo="Telefone" valor={requisicao.solicitante.telefone ?? "—"} />
        </Bloco>
      )}

      {escopo === "INTERNO" && (
        <Bloco titulo="Andamento">
          {requisicao.process ? (
            <>
              <Item
                rotulo="Processo"
                valor={`#${requisicao.process.ordem} — ${requisicao.process.tipoServico}`}
              />
              <Item
                rotulo="Etapa atual"
                valor={
                  WORKFLOW_STAGES[requisicao.process.situacao as WorkflowStage]?.label ??
                  requisicao.process.situacao
                }
              />
              {escopo === "INTERNO" && (
                <div className="col-span-2">
                  <Link
                    href={`/processos/${requisicao.process.id}`}
                    className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    Abrir processo
                  </Link>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-600 col-span-2">
              Processo ainda não aberto pelo atendimento do IGC.
            </p>
          )}
          {requisicao.pagamentoStatus && (
            <Item
              rotulo="Pagamento"
              valor={`${PAGAMENTO_LABEL[requisicao.pagamentoStatus] ?? requisicao.pagamentoStatus}${
                requisicao.pagamentoValor != null
                  ? ` — R$ ${requisicao.pagamentoValor.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}`
                  : ""
              }`}
            />
          )}
          {requisicao.finalizadaEm && (
            <Item
              rotulo="Finalizada em"
              valor={new Date(requisicao.finalizadaEm).toLocaleDateString("pt-BR")}
            />
          )}
        </Bloco>
      )}
    </div>
  );
}

function Bloco({
  titulo,
  rodape,
  children,
}: {
  titulo: string;
  /** Conteúdo de largura total depois da lista de dados (ex.: mapa). */
  rodape?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-3">{titulo}</h3>
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2">{children}</dl>
      {rodape}
    </section>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{rotulo}</dt>
      <dd className="text-sm text-gray-900">{valor}</dd>
    </div>
  );
}
