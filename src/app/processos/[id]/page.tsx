import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { WORKFLOW_STAGES, ALLOWED_TRANSITIONS, type WorkflowStage } from "@/lib/workflow";
import { formatDate, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, User, FileText, MapPin, Shield, CheckSquare } from "lucide-react";
import { WorkflowActions } from "@/components/workflow-actions";
import { DocValidation } from "@/components/doc-validation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProcessoDetailPage({ params }: PageProps) {
  const currentUser = await requireAuth();
  const { id } = await params;

  const processo = await prisma.process.findUnique({
    where: { id },
    include: {
      tecnicoResp: true,
      tecnicoConf: true,
      criadoPor: true,
      workflowActions: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!processo) {
    notFound();
  }

  const stageConfig = WORKFLOW_STAGES[processo.situacao as WorkflowStage];
  const allowedNext = ALLOWED_TRANSITIONS[processo.situacao as WorkflowStage] || [];

  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
  });

  const canValidateDocs = ["ADMIN", "SDTC"].includes(currentUser.role);

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/processos"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos Processos
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Processo #{processo.ordem}
          </h1>
          {stageConfig && (
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${stageConfig.bgLight} ${stageConfig.textColor} ${stageConfig.borderColor} border`}
            >
              {stageConfig.label}
            </span>
          )}
          {processo.tipo === "idoso" && (
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">
              Prioridade Idoso
            </span>
          )}
          {processo.docsValidados && (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <CheckSquare className="h-3 w-3" /> Docs OK
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" />
              Dados do Interessado
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Interessado" value={processo.interessado} />
              <InfoField label="Tipo" value={processo.tipo} />
              <InfoField label="Email" value={processo.email} />
              <InfoField label="Telefone" value={processo.telefone} />
              <InfoField label="CPF/CNPJ" value={processo.cpfCnpj} />
              {processo.dtNascimentoIdoso && (
                <InfoField
                  label="Data Nascimento (Idoso)"
                  value={formatDate(processo.dtNascimentoIdoso)}
                />
              )}
            </div>
          </div>

          {/* Process Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-400" />
              Dados do Processo
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Tipo de Servico" value={processo.tipoServico} />
              <InfoField label="Expediente (SEI)" value={processo.expediente} />
              <InfoField label="Ano de Entrada" value={String(processo.anoEntrada)} />
              <InfoField label="Aberto SEI em" value={formatDate(processo.dtAbertoSei)} />
              <InfoField label="Base" value={processo.base} />
              <InfoField label="Departamento" value={processo.departamento} />
              <InfoField label="Pasta" value={processo.pasta} />
              <InfoField label="UTM" value={processo.utm} />
            </div>
            {processo.observacaoEntrada && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-xs font-medium text-gray-500 mb-1">Observacao de Entrada</p>
                <p className="text-sm text-gray-700">{processo.observacaoEntrada}</p>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-400" />
              Localizacao
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Municipio" value={processo.municipio} />
              <InfoField label="RA" value={processo.ra} />
              <InfoField label="DRA" value={processo.dra} />
              <InfoField label="Dificuldade de Divisa" value={processo.divisaDificuldade} />
            </div>
          </div>

          {/* SIGEF Data */}
          {(processo.codigoSigef || processo.matriculaSigef || processo.nomeFazenda) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-gray-400" />
                Dados SIGEF/INCRA
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Codigo Parcela SIGEF" value={processo.codigoSigef} />
                <InfoField label="Status SIGEF" value={processo.statusSigef} />
                <InfoField label="Area (ha)" value={processo.areaSigef ? `${processo.areaSigef} ha` : null} />
                <InfoField label="Matricula" value={processo.matriculaSigef} />
                <InfoField label="Detentor" value={processo.detentorSigef} />
                <InfoField label="Municipio SIGEF" value={processo.municipioSigef} />
                <InfoField label="UF SIGEF" value={processo.ufSigef} />
                <InfoField label="Nome da Fazenda" value={processo.nomeFazenda} />
                <InfoField label="Representante Tecnico" value={processo.representanteTecnico} />
                <InfoField label="Data Registro SIGEF" value={formatDate(processo.dataRegistroSigef)} />
              </div>
            </div>
          )}

          {/* Technical Work */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Trabalho Tecnico
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoField
                label="Tecnico Responsavel"
                value={processo.tecnicoResp?.name}
              />
              <InfoField
                label="Conferente"
                value={processo.tecnicoConf?.name}
              />
              <InfoField label="Data Email" value={formatDate(processo.dtEmail)} />
              <InfoField label="Data Visita" value={formatDate(processo.dtVisita1)} />
              <InfoField label="Data Conferencia" value={formatDate(processo.dtConf)} />
              <InfoField label="Quem Vai Assinar" value={processo.quemVaiAssinar} />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <InfoField
                label="ST Gabinete P1"
                value={processo.stGabineteP1 ? `${processo.stGabineteP1}h` : null}
              />
              <InfoField
                label="ST Gabinete P2"
                value={processo.stGabineteP2 ? `${processo.stGabineteP2}h` : null}
              />
              <InfoField
                label="ST Campo"
                value={processo.stCampo ? `${processo.stCampo}h` : null}
              />
            </div>
            {processo.observacoesTecnico && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                <p className="text-xs font-medium text-gray-500 mb-1">Observacoes do Tecnico</p>
                <p className="text-sm text-gray-700">{processo.observacoesTecnico}</p>
              </div>
            )}
          </div>

          {/* Signatures & Output */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Assinaturas e Saida
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Assinatura Tecnico" value={formatDate(processo.dtAssTecnico)} />
              <InfoField label="Assinatura Gerente" value={formatDate(processo.dtAssGerente)} />
              <InfoField label="Assinatura Diretor" value={formatDate(processo.dtAssDiretor)} />
              <InfoField label="Upload SEI" value={formatDate(processo.dtUpadoSei)} />
              <InfoField label="N. Saida IGC" value={processo.numeroSaidaIGC} />
            </div>
          </div>

          {/* Workflow History */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              Historico de Transicoes
            </h2>
            {processo.workflowActions.length > 0 ? (
              <div className="space-y-3">
                {processo.workflowActions.map((action) => {
                  const fromConfig = WORKFLOW_STAGES[action.fromStatus as WorkflowStage];
                  const toConfig = WORKFLOW_STAGES[action.toStatus as WorkflowStage];
                  return (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-md"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs ${fromConfig?.bgLight} ${fromConfig?.textColor}`}>
                            {fromConfig?.label || action.fromStatus}
                          </span>
                          <span className="text-gray-400">&rarr;</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${toConfig?.bgLight} ${toConfig?.textColor}`}>
                            {toConfig?.label || action.toStatus}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {action.user.name} - {formatDateTime(action.createdAt)}
                        </p>
                        {action.action && (
                          <p className="text-xs text-gray-600 mt-0.5">{action.action}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhuma transicao registrada.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <WorkflowActions
            processId={processo.id}
            currentStatus={processo.situacao as WorkflowStage}
            allowedTransitions={allowedNext}
            users={users}
          />

          {/* Document Validation (SDTC only) */}
          {canValidateDocs && processo.situacao === "entrada_sdtc" && (
            <DocValidation
              processId={processo.id}
              docRequerimento={processo.docRequerimento}
              docIdentidade={processo.docIdentidade}
              docProcuracao={processo.docProcuracao}
              docComprovante={processo.docComprovante}
              docPlanta={processo.docPlanta}
              docMatricula={processo.docMatricula}
              docArt={processo.docArt}
              docsValidados={processo.docsValidados}
              obsDocumentos={processo.obsDocumentos}
            />
          )}

          {/* Doc validation status (read-only for non-SDTC) */}
          {!canValidateDocs && processo.docsValidados && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-green-600" />
                Documentacao Validada
              </h2>
              <p className="text-xs text-green-700">
                Todos os documentos obrigatorios foram verificados pelo SDTC.
              </p>
            </div>
          )}

          {/* Financial */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Financeiro</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Taxa Abertura</span>
                <span className="font-medium">R$ {(processo.taxaAbertura || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Serv. Gabinete</span>
                <span className="font-medium">R$ {(processo.servicoTecGabinete || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Taxa Vistoria</span>
                <span className="font-medium">R$ {(processo.taxaVistoria || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Serv. Campo</span>
                <span className="font-medium">R$ {(processo.servicoTecCampo || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-900">Total</span>
                <span className="font-bold text-gray-900">R$ {(processo.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Metadados</h2>
            <div className="space-y-2 text-sm">
              <InfoField label="Criado por" value={processo.criadoPor?.name} />
              <InfoField label="Criado em" value={formatDateTime(processo.createdAt)} />
              <InfoField label="Atualizado em" value={formatDateTime(processo.updatedAt)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-sm text-gray-900">{value || "-"}</p>
    </div>
  );
}
