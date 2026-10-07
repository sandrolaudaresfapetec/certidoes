"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Upload,
} from "lucide-react";
import {
  QUALIDADE_OPCOES,
  RESULTADO_OPCOES,
  SITUACAO_OPCOES,
  MENSAGEM_NAO_SEI,
  ALERTA_QTD_POLIGONOS,
  INFORMA_MATRICULA_OPCOES,
  LIMITE_POLIGONOS_ENVIO,
  MATRICULA_USUCAPIAO,
  PREFIXO_ESPOLIO,
  ajustarNomesPoligonos,
  camposAplicaveis,
  combinacaoDefinida,
  exigeEspolio,
  formularioVazio,
  limparCamposNaoAplicaveis,
  perguntaMatriculaAplicavel,
  cpfCnpjCompleto,
  digitosCpfCnpj,
  digitosIncra,
  mascaraCpfCnpj,
  mascaraIncra,
  somenteDigitos,
  validarFormulario,
  type ErrosCjt,
  type FormularioCjt,
} from "@/lib/cjt-formulario";
import { ProgressoSolicitacao } from "@/components/requisicao/progresso-solicitacao";
import { MapaImovel } from "@/components/requisicao/mapa-imovel";
import { useConclusaoSolicitacao } from "@/components/requisicao/introducao-cjt";
import { NomesPoligonos } from "@/components/requisicao/nomes-poligonos";

interface SigefParcela {
  codigoImovel: string;
  parcelaCodigo: string;
  nomeArea: string;
  areaHectares: number;
  municipio: string;
  uf: string;
  status: string;
  /** Contorno do imóvel (GeoJSON), quando a consulta o devolve. */
  geometria?: unknown;
}

interface SigefResult {
  origem: "SIGEF_REAL" | "SIMULADO";
  parcelas: SigefParcela[];
  aviso?: string;
}

/**
 * Estado atual de uma requisição em edição. O solicitante pode alterar os
 * dados que ele mesmo informou; nada de status, processo ou pagamento.
 */
export interface RequisicaoEdicao {
  /** Endpoint PATCH da própria requisição. */
  endpoint: string;
  cjt: FormularioCjt;
  tipoViaSigef: boolean;
  sigefParcelaCodigo: string | null;
  emNomeDeCpf: string | null;
  emNomeDeNome: string | null;
  observacao: string | null;
  /** Documentos já anexados, que não precisam ser reenviados. */
  documentosEnviados: string[];
}

interface RequisicaoFormProps {
  /** CPF do solicitante usado na consulta de imóveis do SIGEF. */
  cpf: string;
  /** Endpoint que cria a requisição. */
  criarEndpoint: string;
  /** Endpoint de upload dos documentos. */
  documentosEndpoint: string;
  /** Campos extras enviados na criação (ex.: solicitanteId no atendimento). */
  payloadExtra?: Record<string, unknown>;
  /** Link exibido ao concluir. */
  painelHref: string;
  painelLabel: string;
  /** Quando presente, o formulário altera a requisição em vez de criar. */
  edicao?: RequisicaoEdicao;
  /**
   * SOLICITANTE (portal): caixas que abrem uma a uma, com barra de progresso, e a tela
   * "Solicitação enviada com sucesso". ATENDIMENTO usa o formulário inteiro e a
   * confirmação curta com o protocolo.
   */
  variante?: "SOLICITANTE" | "ATENDIMENTO";
}

const NOMES_CAIXAS = [
  "Solicitante",
  "Configuração da CJT",
  "Dados do imóvel",
  "Imóvel e documentos",
] as const;

/** Quantos polígonos cada resultado aceita (documento do cliente, item 4). */
const DICAS_RESULTADO: Record<string, string> = {
  "2a": "aceita apenas 1 polígono, sendo 1 matrícula",
  "2b": "1 ou mais polígonos da mesma matrícula",
  "2c": "aceita 1 polígono e não olha as matrículas",
};

type EtapaImovel = "consultando" | "selecao" | "semRegistro";

export function RequisicaoForm({
  cpf,
  criarEndpoint,
  documentosEndpoint,
  payloadExtra,
  painelHref,
  painelLabel,
  edicao,
  variante = "ATENDIMENTO",
}: RequisicaoFormProps) {
  const progressivo = variante === "SOLICITANTE";
  const marcarConcluida = useConclusaoSolicitacao();
  const tituloEnvioRef = useRef<HTMLHeadingElement>(null);
  const [form, setForm] = useState<FormularioCjt>(edicao?.cjt ?? formularioVazio);
  const [erros, setErros] = useState<ErrosCjt>({});

  const [etapaImovel, setEtapaImovel] = useState<EtapaImovel>("consultando");
  const [sigef, setSigef] = useState<SigefResult | null>(null);
  const [selecionada, setSelecionada] = useState<SigefParcela | null>(null);

  const [emNomeDeCpf, setEmNomeDeCpf] = useState(edicao?.emNomeDeCpf ?? "");
  const [emNomeDeNome, setEmNomeDeNome] = useState(edicao?.emNomeDeNome ?? "");
  const [observacao, setObservacao] = useState(edicao?.observacao ?? "");

  const [planta, setPlanta] = useState<File | null>(null);
  const [docPropriedade, setDocPropriedade] = useState<File | null>(null);
  const [procuracao, setProcuracao] = useState<File | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);

  // Ao concluir, leva a tela e o foco para a confirmação.
  useEffect(() => {
    if (!protocolo) return;
    window.scrollTo({ top: 0 });
    tituloEnvioRef.current?.focus();
  }, [protocolo]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sigef/consulta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cpfCnpj: cpf }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSigef(data);
        if (edicao && !edicao.tipoViaSigef) {
          setEtapaImovel("semRegistro");
          return;
        }
        // Na edição a parcela já escolhida volta selecionada.
        const anterior = edicao?.sigefParcelaCodigo
          ? data.parcelas.find(
              (p: SigefParcela) => p.parcelaCodigo === edicao.sigefParcelaCodigo
            )
          : undefined;
        if (anterior) setSelecionada(anterior);
        setEtapaImovel(data.parcelas.length > 0 ? "selecao" : "semRegistro");
      } catch (e) {
        setErro((e as Error).message || "Erro ao consultar o SIGEF.");
        setEtapaImovel("semRegistro");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpf]);

  // Trocar uma resposta anterior recalcula a pergunta 4 e descarta os valores
  // que deixaram de ser aplicáveis (item 7 dos requisitos de interface).
  function responder(
    campo: "qualidade" | "resultado" | "situacao" | "informaMatricula",
    codigo: string
  ) {
    setForm((atual) =>
      limparCamposNaoAplicaveis({ ...atual, [campo]: codigo } as FormularioCjt)
    );
    setErros({});
  }

  function alterarQuantidade(valor: string) {
    const qtd = parseInt(valor, 10);
    setForm((atual) => ({
      ...atual,
      qtdPoligonos: valor,
      // Acima do limite do envio normal não se geram campos (o servidor também recusa).
      nomesPoligonos: ajustarNomesPoligonos(
        atual.nomesPoligonos,
        Number.isFinite(qtd) ? Math.min(qtd, LIMITE_POLIGONOS_ENVIO) : qtd
      ),
    }));
  }

  const campos = camposAplicaveis(form.resultado, form.situacao);
  const mostrarPergunta4 = combinacaoDefinida(form);
  const nomesInformados = campos.includes("nomesPoligonos")
    ? form.nomesPoligonos.map((n) => n.trim()).filter(Boolean)
    : [];
  // "Representante" na Pergunta 1 abre a caixa com os dados de quem é representado.
  const procurador = form.qualidade === "1a";
  const exigeDocsImovel = etapaImovel === "semRegistro";
  const enviados = edicao?.documentosEnviados ?? [];
  const temPlanta = Boolean(planta) || enviados.includes("PLANTA");
  const temDocPropriedade =
    Boolean(docPropriedade) || enviados.includes("DOC_PROPRIEDADE");
  const temProcuracao = Boolean(procuracao) || enviados.includes("PROCURACAO");

  // Cada caixa só libera a seguinte quando está completa (modo progressivo).
  const caixa1 =
    Boolean(form.qualidade) &&
    form.qualidade !== "1c" &&
    (!procurador || (cpfCnpjCompleto(emNomeDeCpf) && emNomeDeNome.trim().length > 1));
  const caixa2 = caixa1 && mostrarPergunta4;
  // As mesmas regras do servidor, inclusive a nomenclatura fechada dos polígonos (#PEND-36).
  const dadosCompletos = Object.keys(validarFormulario(form)).every((c) => c === "declaracao");
  const caixa3 = caixa2 && dadosCompletos;
  const caixa4 =
    caixa3 &&
    etapaImovel !== "consultando" &&
    (etapaImovel === "selecao" ? Boolean(selecionada) : temPlanta && temDocPropriedade) &&
    (!procurador || temProcuracao) &&
    form.declaracao;
  const verCaixa2 = progressivo ? caixa1 : true;
  const verCaixa3 = progressivo ? caixa2 : mostrarPergunta4;
  const verCaixa4 = progressivo ? caixa3 : mostrarPergunta4;
  const liberadas = [true, verCaixa2, verCaixa3, verCaixa4].filter(Boolean).length;
  const entra = progressivo ? "caixa-entra" : "";

  async function enviar() {
    const validacao: ErrosCjt = validarFormulario(form);
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    if (etapaImovel === "consultando") {
      setErro("Aguarde a consulta dos imóveis no SIGEF.");
      return;
    }
    if (etapaImovel === "selecao" && !selecionada) {
      setErro("Selecione o imóvel do SIGEF para o qual deseja a certidão.");
      return;
    }
    if (exigeDocsImovel && !(temPlanta && temDocPropriedade)) {
      setErro("Anexe a planta do imóvel e o comprovante de propriedade.");
      return;
    }
    if (procurador && !(temProcuracao && cpfCnpjCompleto(emNomeDeCpf) && emNomeDeNome.trim())) {
      setErro("Informe o CPF ou CNPJ e o nome de quem você representa e anexe a procuração.");
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const limpo = limparCamposNaoAplicaveis(form);
      const res = await fetch(edicao?.endpoint ?? criarEndpoint, {
        method: edicao ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payloadExtra,
          tipoViaSigef: Boolean(selecionada),
          sigefCodigoImovel: selecionada?.codigoImovel,
          sigefParcelaCodigo: selecionada?.parcelaCodigo,
          sigefNomeArea: selecionada?.nomeArea,
          sigefAreaHectares: selecionada?.areaHectares,
          sigefMunicipio: selecionada?.municipio,
          sigefUf: selecionada?.uf,
          sigefStatus: selecionada?.status,
          sigefOrigem: sigef?.origem,
          emNomeDeCpf: procurador ? emNomeDeCpf : undefined,
          emNomeDeNome: procurador ? emNomeDeNome : undefined,
          observacao: observacao || undefined,
          cjt: {
            qualidade: limpo.qualidade,
            resultado: limpo.resultado,
            situacao: limpo.situacao,
            propriedadeDe: limpo.propriedadeDe,
            informaMatricula: limpo.informaMatricula,
            matricula: limpo.matricula,
            qtdPoligonos: limpo.qtdPoligonos,
            nomesPoligonos: limpo.nomesPoligonos,
            codigoIncra: limpo.codigoIncra,
            declaracao: limpo.declaracao,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || (edicao ? "Erro ao alterar requisição." : "Erro ao criar requisição.")
        );
      }

      const uploads: [string, File | null][] = [
        ["PLANTA", planta],
        ["DOC_PROPRIEDADE", docPropriedade],
        ["PROCURACAO", procuracao],
      ];
      for (const [tipo, file] of uploads) {
        if (!file) continue;
        const fd = new FormData();
        fd.append("solicitacaoId", data.id);
        fd.append("tipo", tipo);
        fd.append("arquivo", file);
        const up = await fetch(documentosEndpoint, { method: "POST", body: fd });
        if (!up.ok) {
          const d = await up.json();
          throw new Error(d.error || `Falha ao enviar ${tipo}.`);
        }
      }
      setProtocolo(data.protocolo);
      marcarConcluida();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (protocolo) {
    if (variante === "SOLICITANTE") {
      return (
        <section
          aria-labelledby="envio-titulo"
          className="bg-white rounded-lg border border-gray-200 p-8 text-center"
        >
          <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" aria-hidden="true" />
          <h2
            id="envio-titulo"
            ref={tituloEnvioRef}
            tabIndex={-1}
            className="text-lg font-semibold text-gray-900 outline-none"
          >
            {edicao ? "Solicitação reenviada com sucesso" : "Solicitação enviada com sucesso"}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Protocolo <strong>{protocolo}</strong>
          </p>
          <div className="mt-4 mx-auto max-w-xl space-y-3 text-left text-sm leading-relaxed text-gray-700">
            <p>
              Sua solicitação foi encaminhada ao Setor de Atendimento e será avaliada em até 10
              dias, período de funcionamento do Instituto, de segunda a sexta-feira, das 9h às
              17h, exceto feriados.
            </p>
            {/* Texto do cliente (documento CJT). O chat existe em Acompanhar Requisição (#PEND-25). */}
            <p>
              Todas as comunicações e solicitações de complementação serão realizadas
              exclusivamente por este sistema, no chat da solicitação.
            </p>
            <p>
              Em “Minhas Requisições”, é possível acompanhar o andamento de cada solicitação.
            </p>
            <p className="pt-1 text-center font-semibold text-gray-900">
              Aguarde o retorno da equipe.
            </p>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Atenciosamente
            <br />
            <strong className="text-gray-900">Instituto Geográfico e Cartográfico – IGC</strong>
          </p>
          <Link
            href={painelHref}
            className="inline-block mt-5 bg-emerald-700 text-white px-5 py-2 rounded-md text-sm hover:bg-emerald-800"
          >
            {painelLabel}
          </Link>
        </section>
      );
    }
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-gray-900">
          {edicao ? "Alterações salvas!" : "Requisição registrada!"}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Protocolo <strong>{protocolo}</strong>.
        </p>
        <Link
          href={painelHref}
          className="inline-block mt-4 bg-emerald-700 text-white px-5 py-2 rounded-md text-sm hover:bg-emerald-800"
        >
          {painelLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {progressivo && (
        <>
          <ProgressoSolicitacao
            etapas={[
              { nome: NOMES_CAIXAS[0], feita: caixa1 },
              { nome: NOMES_CAIXAS[1], feita: caixa2 },
              { nome: NOMES_CAIXAS[2], feita: caixa3 },
              { nome: NOMES_CAIXAS[3], feita: caixa4 },
            ]}
          />
          <p aria-live="polite" className="sr-only">
            {`Etapas liberadas: ${liberadas} de 4. Última: ${NOMES_CAIXAS[liberadas - 1]}.`}
          </p>
        </>
      )}

      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Solicitante</h2>

        <Pergunta
          numero={1}
          titulo="Quem sou eu?"
          nome="cjt-qualidade"
          opcoes={QUALIDADE_OPCOES}
          valor={form.qualidade}
          erro={erros.qualidade}
          onChange={(c) => responder("qualidade", c)}
        />

        {form.qualidade === "1c" && (
          <p
            role="alert"
            className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            {MENSAGEM_NAO_SEI}
          </p>
        )}

        {procurador && (
          <div
            role="group"
            aria-labelledby="cjt-rep-titulo"
            className={`${entra} rounded-md border border-emerald-200 bg-emerald-50/60 p-4 space-y-3`}
          >
            <h3 id="cjt-rep-titulo" className="text-sm font-semibold text-gray-900">
              Dados de quem você representa
            </h3>
            <p className="text-xs text-gray-600">
              Informe o CPF ou o CNPJ do proprietário do imóvel e o nome (pessoa física) ou a
              razão social (empresa). A procuração é anexada no fim do formulário.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="cjt-rep-doc"
                  className="block text-sm font-medium text-gray-900 mb-1"
                >
                  CPF ou CNPJ *
                </label>
                <input
                  id="cjt-rep-doc"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={18}
                  value={mascaraCpfCnpj(emNomeDeCpf)}
                  onChange={(e) => setEmNomeDeCpf(digitosCpfCnpj(e.target.value))}
                  aria-describedby="cjt-rep-doc-dica"
                  placeholder="Digite o CPF ou o CNPJ"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <p id="cjt-rep-doc-dica" className="text-xs text-gray-600 mt-1">
                  CPF (11 números) ou CNPJ (14 números).
                </p>
              </div>
              <div>
                <label
                  htmlFor="cjt-rep-nome"
                  className="block text-sm font-medium text-gray-900 mb-1"
                >
                  Nome ou razão social *
                </label>
                <input
                  id="cjt-rep-nome"
                  type="text"
                  value={emNomeDeNome}
                  onChange={(e) => setEmNomeDeNome(e.target.value)}
                  placeholder="Como consta no documento"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {verCaixa2 && (
        <section
          className={`${entra} bg-white rounded-lg border border-gray-200 p-6 space-y-6`}
        >
          <h2 className="font-semibold text-gray-900">Configuração da CJT</h2>

          <Pergunta
            numero={2}
            titulo="O resultado será por:"
            nome="cjt-resultado"
            opcoes={RESULTADO_OPCOES}
            dicas={DICAS_RESULTADO}
            valor={form.resultado}
            erro={erros.resultado}
            onChange={(c) => responder("resultado", c)}
          />
          <Pergunta
            numero={3}
            titulo="Meu imóvel atualmente é:"
            nome="cjt-situacao"
            opcoes={SITUACAO_OPCOES}
            valor={form.situacao}
            erro={erros.situacao}
            onChange={(c) => responder("situacao", c)}
          />

          {perguntaMatriculaAplicavel(form.resultado, form.situacao) && (
            <div className="border-l-4 border-emerald-200 pl-4">
              <Pergunta
                numero="3.1"
                titulo="Quero informar o número da matrícula?"
                nome="cjt-informa-matricula"
                opcoes={INFORMA_MATRICULA_OPCOES}
                valor={form.informaMatricula}
                erro={erros.informaMatricula}
                onChange={(c) => responder("informaMatricula", c)}
              />
            </div>
          )}

          {(form.resultado === "2d" ||
            form.situacao === "3e" ||
            (perguntaMatriculaAplicavel(form.resultado, form.situacao) &&
              form.informaMatricula === "NAO_SEI")) && (
            <p
              role="alert"
              className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2"
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              {MENSAGEM_NAO_SEI}
            </p>
          )}
        </section>
      )}

      {verCaixa3 && (
        <section className={`${entra} bg-white rounded-lg border border-gray-200 p-6 space-y-5`}>
          <div>
            <h2 className="font-semibold text-gray-900">
              Pergunta 4 — Dados do imóvel
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Campos exibidos conforme a combinação selecionada nas perguntas 2 e 3.
            </p>
          </div>

          {campos.includes("propriedadeDe") && (
            <Campo
              id="cjt-propriedade"
              label="Propriedade de *"
              erro={erros.propriedadeDe}
              dica={
                <ul className="list-disc space-y-0.5 pl-5">
                  {exigeEspolio(form.situacao) ? (
                    <>
                      <li>Informe o nome do falecido.</li>
                      <li>
                        Com um falecido e outros herdeiros vivos, informe o nome do falecido e
                        depois “; Outros” (resultado: “Espólio de xxxx ; Outros”).
                      </li>
                    </>
                  ) : (
                    <li>Havendo vários proprietários, informe o primeiro seguido de “e outros”.</li>
                  )}
                  <li>Não use “S/M” nem “S/E” (“e sua mulher”, “e seu esposo”).</li>
                </ul>
              }
            >
              <div className="flex items-center gap-2">
                {exigeEspolio(form.situacao) && (
                  <span className="text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-md px-3 py-2 whitespace-nowrap">
                    {PREFIXO_ESPOLIO}
                  </span>
                )}
                <input
                  id="cjt-propriedade"
                  type="text"
                  value={form.propriedadeDe}
                  onChange={(e) =>
                    setForm((a) => ({ ...a, propriedadeDe: e.target.value }))
                  }
                  aria-describedby={descrito("cjt-propriedade", true, erros.propriedadeDe)}
                  aria-invalid={erros.propriedadeDe ? true : undefined}
                  className="w-full min-w-0 flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </Campo>
          )}

          {campos.includes("matricula") && (
            <Campo
              id="cjt-matricula"
              label="Matrícula *"
              erro={erros.matricula}
              dica={
                form.informaMatricula === "NAO" ? (
                  <p>
                    Preenchido automaticamente porque você informou que não tem o número da
                    matrícula.
                  </p>
                ) : (
                  <p>
                    Somente algarismos. Não colocar CRI, Trans, Transcrição, “-”, “/” ou outros
                    caracteres.
                  </p>
                )
              }
            >
              {form.informaMatricula === "NAO" ? (
                <div className="flex items-center gap-2">
                  <input
                    id="cjt-matricula"
                    type="text"
                    value={MATRICULA_USUCAPIAO}
                    readOnly
                    aria-readonly="true"
                    aria-describedby={descrito("cjt-matricula", true, erros.matricula)}
                    className="min-w-0 flex-1 cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700"
                  />
                  <span className="whitespace-nowrap text-xs text-gray-600">
                    Preenchido automaticamente
                  </span>
                </div>
              ) : (
                <input
                  id="cjt-matricula"
                  type="text"
                  inputMode="numeric"
                  value={form.matricula}
                  onChange={(e) =>
                    setForm((a) => ({ ...a, matricula: somenteDigitos(e.target.value) }))
                  }
                  aria-describedby={descrito("cjt-matricula", true, erros.matricula)}
                  aria-invalid={erros.matricula ? true : undefined}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              )}
            </Campo>
          )}

          {campos.includes("qtdPoligonos") && (
            <Campo
              id="cjt-qtd"
              label="Quantidade de polígonos *"
              erro={erros.qtdPoligonos}
            >
              <input
                id="cjt-qtd"
                type="number"
                min={1}
                value={form.qtdPoligonos}
                onChange={(e) => alterarQuantidade(e.target.value)}
                aria-describedby={descrito("cjt-qtd", false, erros.qtdPoligonos)}
                aria-invalid={erros.qtdPoligonos ? true : undefined}
                className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              {parseInt(form.qtdPoligonos, 10) > LIMITE_POLIGONOS_ENVIO && (
                <p
                  role="alert"
                  className="mt-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Pedidos com {LIMITE_POLIGONOS_ENVIO + 1} ou mais polígonos exigem análise da DDD e
                  ainda não podem ser enviados por aqui. Fale com o atendimento do IGC para seguir.
                </p>
              )}
              {parseInt(form.qtdPoligonos, 10) >= ALERTA_QTD_POLIGONOS &&
                parseInt(form.qtdPoligonos, 10) <= LIMITE_POLIGONOS_ENVIO && (
                <p
                  role="status"
                  className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                >
                  {`Atenção: ${form.qtdPoligonos} polígonos. Pedidos com ${ALERTA_QTD_POLIGONOS} ou mais polígonos exigem análise específica e podem ter prazo maior.`}
                </p>
              )}
            </Campo>
          )}

          {campos.includes("nomesPoligonos") && form.nomesPoligonos.length > 0 && (
            <NomesPoligonos
              id="cjt-nomes"
              nomes={form.nomesPoligonos}
              onChange={(nomes) => setForm((a) => ({ ...a, nomesPoligonos: nomes }))}
              erro={erros.nomesPoligonos}
            />
          )}

          {campos.includes("codigoIncra") && (
            <Campo
              id="cjt-incra"
              label="INCRA"
              opcional
              erro={erros.codigoIncra}
              dica={<p>Quando preenchido, deve ter 13 algarismos (xxx.xxx.xxx.xxx-x).</p>}
            >
              <input
                id="cjt-incra"
                type="text"
                inputMode="numeric"
                value={mascaraIncra(form.codigoIncra)}
                placeholder="xxx.xxx.xxx.xxx-x"
                onChange={(e) =>
                  setForm((a) => ({ ...a, codigoIncra: digitosIncra(e.target.value) }))
                }
                aria-describedby={descrito("cjt-incra", true, erros.codigoIncra)}
                aria-invalid={erros.codigoIncra ? true : undefined}
                className="w-64 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </Campo>
          )}
        </section>
      )}

      {verCaixa4 && (
        <section className={`${entra} bg-white rounded-lg border border-gray-200 p-6 space-y-5`}>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-700" />
            Imóvel e documentos
          </h2>

          {etapaImovel === "consultando" && (
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando imóveis vinculados ao CPF no SIGEF/INCRA...
            </p>
          )}

          {etapaImovel === "selecao" && sigef && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Selecione o imóvel para o qual a certidão será emitida:
              </p>
              <ul className="space-y-2">
                {sigef.parcelas.map((p) => {
                  const ativa = selecionada?.parcelaCodigo === p.parcelaCodigo;
                  return (
                    <li key={p.parcelaCodigo}>
                      <button
                        type="button"
                        onClick={() => setSelecionada(p)}
                        className={`w-full text-left border rounded-md p-3 text-sm transition ${
                          ativa
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-emerald-300"
                        }`}
                      >
                        <span className="font-medium text-gray-900 flex items-center gap-2 [overflow-wrap:anywhere]">
                          {p.nomeArea || "Imóvel rural"}
                          {ativa && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        </span>
                        <span className="block text-xs text-gray-600 mt-1 [overflow-wrap:anywhere]">
                          Código do imóvel {p.codigoImovel} ·{" "}
                          {p.areaHectares.toLocaleString("pt-BR")} ha · {p.municipio}/
                          {p.uf} · {p.status}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {selecionada && (
                <figure className="mt-4 space-y-2">
                  <figcaption className="text-sm font-bold text-gray-900">
                    Localização do imóvel selecionado
                  </figcaption>
                  <MapaImovel
                    geometria={selecionada.geometria}
                    descricao={descreverImovel(selecionada)}
                  />
                  <p className="text-xs text-gray-600">
                    Contorno do imóvel conforme o SIGEF/INCRA. O mapa é só para conferência:
                    confirme que é a área para a qual você quer a certidão.
                  </p>
                  {nomesInformados.length > 0 && (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                      <p className="font-medium text-gray-900">
                        Polígonos informados na Pergunta 4 ({nomesInformados.length})
                      </p>
                      <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {nomesInformados.map((nome) => (
                          <li
                            key={nome}
                            className="rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-xs"
                          >
                            {nome}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-gray-600">
                        Depois do envio, a equipe do IGC relaciona cada nome ao polígono do mapa.
                      </p>
                    </div>
                  )}
                </figure>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelecionada(null);
                  setEtapaImovel("semRegistro");
                }}
                className="mt-3 text-xs text-gray-500 underline underline-offset-2"
              >
                O imóvel não está nesta lista / não possui registro no INCRA
              </button>
            </div>
          )}

          {etapaImovel === "semRegistro" && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Nenhum imóvel localizado no SIGEF/INCRA. Anexe a{" "}
                <strong>planta do imóvel</strong> e o{" "}
                <strong>comprovante de propriedade</strong>; os dados do imóvel
                serão preenchidos pela equipe do IGC.
              </span>
            </p>
          )}

          {(exigeDocsImovel || procurador) && (
            <div className="space-y-3">
              {exigeDocsImovel && (
                <>
                  <DocField
                    label="Planta do imóvel *"
                    file={planta}
                    enviado={enviados.includes("PLANTA")}
                    onChange={setPlanta}
                  />
                  <DocField
                    label="Comprovante de propriedade *"
                    file={docPropriedade}
                    enviado={enviados.includes("DOC_PROPRIEDADE")}
                    onChange={setDocPropriedade}
                  />
                </>
              )}
              {procurador && (
                <DocField
                  label="Procuração *"
                  file={procuracao}
                  enviado={enviados.includes("PROCURACAO")}
                  onChange={setProcuracao}
                />
              )}
              <p className="text-xs text-gray-500">
                Formatos aceitos: PDF, JPG ou PNG — até 10 MB cada.
              </p>
            </div>
          )}

          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observações (opcional)"
            aria-label="Observações"
            rows={2}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.declaracao}
              onChange={(e) => setForm((a) => ({ ...a, declaracao: e.target.checked }))}
              className="mt-0.5 rounded border-gray-300"
            />
            Declaro que as informações prestadas e a documentação apresentada são
            verdadeiras e estão em conformidade com os padrões estabelecidos pelo Instituto.
          </label>
          {erros.declaracao && (
            <p role="alert" className="text-sm text-red-600">
              {erros.declaracao}
            </p>
          )}

          {erro && (
            <p
              role="alert"
              className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2"
            >
              {erro}
            </p>
          )}

          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            className="w-full bg-emerald-700 text-white py-2.5 rounded-md text-sm font-medium hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            {edicao ? "Salvar alterações" : "Enviar requisição"}
          </button>
        </section>
      )}
    </div>
  );
}

function Pergunta({
  numero,
  titulo,
  nome,
  opcoes,
  dicas,
  valor,
  erro,
  onChange,
}: {
  numero: number | string;
  titulo: string;
  nome: string;
  opcoes: readonly { codigo: string; label: string; bloqueia: boolean }[];
  /** Explicação curta exibida entre parênteses ao lado da opção, por código. */
  dicas?: Record<string, string>;
  valor: string;
  erro?: string;
  onChange: (codigo: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-900">
        {typeof numero === "number" ? `${numero}.` : numero} {titulo}
      </legend>
      <div className="mt-2 space-y-1.5">
        {opcoes.map((o) => (
          <label
            key={o.codigo}
            className="flex flex-wrap items-baseline gap-x-2 text-sm text-gray-700"
          >
            <input
              type="radio"
              name={nome}
              value={o.codigo}
              checked={valor === o.codigo}
              onChange={() => onChange(o.codigo)}
              className="self-center border-gray-300"
            />
            {o.label}
            {dicas?.[o.codigo] && (
              <span className="text-xs text-gray-600">({dicas[o.codigo]})</span>
            )}
          </label>
        ))}
      </div>
      {erro && (
        <p role="alert" className="text-sm text-red-600 mt-1">
          {erro}
        </p>
      )}
    </fieldset>
  );
}

/** Texto do mapa para tecnologias assistivas, só com os dados que a parcela traz. */
function descreverImovel(p: SigefParcela): string {
  const partes = [`Contorno do imóvel ${p.nomeArea || "rural"}`];
  if (p.areaHectares > 0) partes.push(`${p.areaHectares.toLocaleString("pt-BR")} ha`);
  if (p.municipio) partes.push(`${p.municipio}/${p.uf}`);
  return partes.join(", ");
}

/** Liga o campo à dica e ao erro (aria-describedby); o ids vêm de `Campo`. */
function descrito(id: string, dica: boolean, erro?: string): string | undefined {
  const ids = [dica && `${id}-dica`, erro && `${id}-erro`].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

/** Rótulo em negrito, explicação acima do campo e erro em texto abaixo. */
function Campo({
  id,
  label,
  opcional,
  dica,
  erro,
  children,
}: {
  id: string;
  label: string;
  opcional?: boolean;
  dica?: React.ReactNode;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-gray-900">
        {label}
        {opcional && <span className="font-normal text-gray-600"> (opcional)</span>}
      </label>
      {dica && (
        <div id={`${id}-dica`} className="mt-1 space-y-1 text-sm text-gray-700">
          {dica}
        </div>
      )}
      <div className="mt-2">{children}</div>
      {erro && (
        <p id={`${id}-erro`} role="alert" className="mt-1 text-sm text-red-600">
          {erro}
        </p>
      )}
    </div>
  );
}

function DocField({
  label,
  file,
  enviado,
  onChange,
}: {
  label: string;
  file: File | null;
  /** Documento deste tipo já anexado antes; reenviar é opcional. */
  enviado?: boolean;
  onChange: (f: File | null) => void;
}) {
  return (
    <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-md p-3 cursor-pointer hover:border-emerald-400">
      <Upload className="h-5 w-5 text-gray-400" />
      <span className="text-sm text-gray-700 flex-1">
        {label}
        {file && <span className="block text-xs text-emerald-700">{file.name}</span>}
        {!file && enviado && (
          <span className="block text-xs text-gray-500">
            Já enviado — escolha um arquivo para substituir.
          </span>
        )}
      </span>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
