import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "./print-button";
import { requireUsuario } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Fragmento {
  municipio?: string;
  areaHa?: number;
  percentual?: number;
}

export default async function CertidaoPage({ params }: PageProps) {
  await requireUsuario();

  const { id } = await params;

  const processo = await prisma.process.findUnique({
    where: { id },
    include: {
      tecnicoResp: true,
      tecnicoConf: true,
      solicitacao: { include: { solicitante: true } },
      cortesDivisa: {
        include: { linhaDivisa: true },
        orderBy: { dataCorte: "desc" },
        take: 1,
      },
      workflowActions: {
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!processo || !/certid/i.test(processo.tipoServico)) {
    notFound();
  }

  const signerFor = (stage: string) =>
    processo.workflowActions.find((a) => a.fromStatus === stage)?.user?.name;

  const gerente = await prisma.user.findFirst({ where: { role: "GERENTE", active: true } });
  const diretor = await prisma.user.findFirst({ where: { role: "DIRETOR", active: true } });

  const assinaturas = [
    {
      papel: "Tecnico Responsavel",
      nome: signerFor("assinatura_tecnico") || processo.tecnicoResp?.name,
      data: processo.dtAssTecnico,
    },
    {
      papel: "Gerente",
      nome: signerFor("assinatura_gerente") || gerente?.name,
      data: processo.dtAssGerente,
    },
    {
      papel: "Diretor do IGC",
      nome: signerFor("assinatura_diretor") || diretor?.name,
      data: processo.dtAssDiretor,
    },
  ];

  const emitida = Boolean(processo.dtAssDiretor);

  const corte = processo.cortesDivisa[0];
  let fragmentos: Fragmento[] = [];
  if (corte) {
    try {
      fragmentos = JSON.parse(corte.resultadoJson) as Fragmento[];
    } catch {
      fragmentos = [];
    }
  }

  const conteudoAssinado = JSON.stringify({
    id: processo.id,
    protocolo: processo.solicitacao?.protocolo ?? null,
    interessado: processo.interessado,
    cpfCnpj: processo.cpfCnpj,
    sigefCodigoImovel: processo.sigefCodigoImovel,
    sigefParcelaCodigo: processo.sigefParcelaCodigo,
    sigefAreaHectares: processo.sigefAreaHectares,
    fragmentos,
    dtAssTecnico: processo.dtAssTecnico?.toISOString() ?? null,
    dtAssGerente: processo.dtAssGerente?.toISOString() ?? null,
    dtAssDiretor: processo.dtAssDiretor?.toISOString() ?? null,
  });
  const codigoVerificacao = createHash("sha256")
    .update(conteudoAssinado)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/processos/${processo.id}`}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao Processo
        </Link>
        <PrintButton />
      </div>

      {!emitida && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800 print:hidden">
          Documento em elaboracao: a certidao so e valida apos a assinatura
          digital do Diretor do IGC.
        </div>
      )}

      <div className="bg-white border border-gray-300 shadow-sm p-10 print:shadow-none print:border-0">
        {/* Cabecalho */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <p className="text-xs uppercase tracking-widest text-gray-600">
            Governo do Estado de Sao Paulo
          </p>
          <h1 className="text-lg font-bold text-gray-900 mt-1">
            Instituto Geografico e Cartografico — IGC
          </h1>
          <h2 className="text-base font-semibold text-gray-800 mt-3 uppercase">
            Certidao de Localizacao de Imovel
          </h2>
          {processo.solicitacao?.protocolo && (
            <p className="text-sm text-gray-600 mt-1">
              Protocolo {processo.solicitacao.protocolo} — Processo #{processo.ordem}
            </p>
          )}
        </div>

        {/* Interessado */}
        <Section titulo="Interessado">
          <Campo label="Nome" valor={processo.interessado} />
          <Campo label="CPF/CNPJ" valor={processo.cpfCnpj} />
          <Campo label="E-mail" valor={processo.email} />
          <Campo label="Telefone" valor={processo.telefone} />
        </Section>

        {/* Imovel */}
        <Section titulo="Imovel Rural (SIGEF/INCRA)">
          <Campo label="Codigo do imovel" valor={processo.sigefCodigoImovel} />
          <Campo label="Codigo da parcela" valor={processo.sigefParcelaCodigo} />
          <Campo
            label="Area certificada (ha)"
            valor={
              processo.sigefAreaHectares != null
                ? processo.sigefAreaHectares.toLocaleString("pt-BR", {
                    maximumFractionDigits: 4,
                  })
                : null
            }
          />
          <Campo label="Situacao no SIGEF" valor={processo.sigefStatus} />
          <Campo
            label="Municipio de cadastro"
            valor={
              processo.sigefMunicipio
                ? `${processo.sigefMunicipio}/${processo.sigefUf ?? "SP"}`
                : processo.municipio
            }
          />
          <Campo label="Consultado em" valor={formatDate(processo.sigefConsultadoEm)} />
        </Section>

        {/* Corte por divisa municipal */}
        {fragmentos.length > 0 && (
          <Section titulo="Localizacao por Municipio (corte pelas linhas de divisa validadas)">
            <div className="col-span-2">
              <table className="w-full text-sm border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="border border-gray-300 px-3 py-1.5">Municipio</th>
                    <th className="border border-gray-300 px-3 py-1.5">Area (ha)</th>
                    <th className="border border-gray-300 px-3 py-1.5">Percentual</th>
                  </tr>
                </thead>
                <tbody>
                  {fragmentos.map((f, i) => (
                    <tr key={i}>
                      <td className="border border-gray-300 px-3 py-1.5">
                        {f.municipio || "Nao identificado"}
                      </td>
                      <td className="border border-gray-300 px-3 py-1.5">
                        {f.areaHa != null
                          ? f.areaHa.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
                          : "-"}
                      </td>
                      <td className="border border-gray-300 px-3 py-1.5">
                        {f.percentual != null ? `${f.percentual.toFixed(2)}%` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {corte?.linhaDivisa && (
                <p className="text-xs text-gray-600 mt-2">
                  Linha de divisa: {corte.linhaDivisa.codigo}
                  {corte.linhaDivisa.descricao ? ` — ${corte.linhaDivisa.descricao}` : ""} (
                  {corte.linhaDivisa.bancoOrigem}, validada em{" "}
                  {formatDate(corte.linhaDivisa.dataValidacao)}) · Corte executado em{" "}
                  {formatDateTime(corte.dataCorte)}
                </p>
              )}
            </div>
          </Section>
        )}

        {/* Certifica */}
        <div className="my-6 text-sm text-gray-800 leading-relaxed text-justify">
          <p>
            O Instituto Geografico e Cartografico do Estado de Sao Paulo CERTIFICA,
            com base nas linhas de divisa municipais validadas e na geometria
            certificada do imovel no SIGEF/INCRA, a localizacao municipal do imovel
            rural acima identificado, conforme quadro de municipios e percentuais
            apresentado neste documento.
          </p>
        </div>

        {/* Assinaturas */}
        <div className="mt-8 border-t border-gray-300 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase mb-3">
            Assinaturas Digitais
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {assinaturas.map((a) => (
              <div
                key={a.papel}
                className={`border rounded-md p-3 text-center ${
                  a.data ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-gray-50"
                }`}
              >
                <p className="text-xs font-medium text-gray-500 uppercase">{a.papel}</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{a.nome || "-"}</p>
                {a.data ? (
                  <>
                    <p className="text-xs text-emerald-700 mt-1 font-medium">
                      Assinado digitalmente
                    </p>
                    <p className="text-xs text-gray-600">{formatDateTime(a.data)}</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Pendente</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rodape */}
        <div className="mt-8 border-t border-gray-300 pt-3 text-xs text-gray-500">
          {emitida ? (
            <p>
              Documento assinado digitalmente no sistema de certidoes do IGC.
              Codigo de verificacao: <span className="font-mono">{codigoVerificacao}</span>
              {processo.dtUpadoSei && (
                <> · Disponibilizado no SEI em {formatDate(processo.dtUpadoSei)}</>
              )}
              {processo.numeroSaidaIGC && <> · Saida IGC n. {processo.numeroSaidaIGC}</>}
            </p>
          ) : (
            <p>Minuta sem validade — aguardando assinatura digital do Diretor do IGC.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-3">
        {titulo}
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">{children}</div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string | null | undefined }) {
  return (
    <div className="text-sm">
      <span className="text-gray-500">{label}: </span>
      <span className="text-gray-900 font-medium">{valor || "-"}</span>
    </div>
  );
}
