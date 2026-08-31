import Link from "next/link";
import { FileText, Paperclip } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { formatarCPF } from "@/lib/cpf";
import { statusRequisicao, PAGAMENTO_LABEL } from "@/lib/requisicao-status";
import { rotuloOpcao, propriedadeDeExibicao, mascaraIncra } from "@/lib/cjt-formulario";
import { WORKFLOW_STAGES, type WorkflowStage } from "@/lib/workflow";

export type RequisicaoDetalhada = Prisma.SolicitacaoGetPayload<{
  include: {
    solicitante: true;
    documentos: { select: { id: true; tipo: true; nomeArquivo: true } };
    process: { select: { id: true; ordem: true; situacao: true; tipoServico: true } };
  };
}>;

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
 */
export function RequisicaoDetalhe({
  requisicao,
  escopo,
}: {
  requisicao: RequisicaoDetalhada;
  escopo: "CLIENTE" | "INTERNO";
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
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.classe}`}>
            {st.label}
          </span>
        </div>
      </div>

      <Bloco titulo="Identificação do pedido">
        <Item rotulo="Qualidade do solicitante" valor={rotuloOpcao(requisicao.cjtQualidade)} />
        <Item rotulo="Resultado pretendido" valor={rotuloOpcao(requisicao.cjtResultado)} />
        <Item rotulo="Situação do imóvel" valor={rotuloOpcao(requisicao.cjtSituacao)} />
        {propriedade && <Item rotulo="Propriedade de" valor={propriedade} />}
        {requisicao.cjtMatricula && (
          <Item rotulo="Matrícula" valor={requisicao.cjtMatricula} />
        )}
        {requisicao.cjtQtdPoligonos != null && (
          <Item rotulo="Quantidade de polígonos" valor={String(requisicao.cjtQtdPoligonos)} />
        )}
        {poligonos.length > 0 && (
          <Item rotulo="Glebas/polígonos" valor={poligonos.join(", ")} />
        )}
        {requisicao.cjtCodigoIncra && (
          <Item rotulo="INCRA/SNCR" valor={mascaraIncra(requisicao.cjtCodigoIncra)} />
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

      <Bloco titulo="Imóvel">
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
            <Item
              rotulo="Município"
              valor={
                requisicao.sigefMunicipio
                  ? `${requisicao.sigefMunicipio}/${requisicao.sigefUf ?? ""}`
                  : "—"
              }
            />
          </>
        ) : (
          <p className="text-sm text-gray-600 col-span-2">
            Imóvel sem registro no INCRA — dados serão preenchidos pela equipe do
            IGC a partir dos documentos anexados.
          </p>
        )}
        {requisicao.emNomeDeNome && (
          <Item
            rotulo="Representando"
            valor={`${requisicao.emNomeDeNome}${
              requisicao.emNomeDeCpf ? ` (${formatarCPF(requisicao.emNomeDeCpf)})` : ""
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
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-3">{titulo}</h3>
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2">{children}</dl>
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
