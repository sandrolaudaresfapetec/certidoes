"use client";

import { useEffect, useState } from "react";
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
  LIMITE_NOME_POLIGONO,
  ALERTA_QTD_POLIGONOS,
  PREFIXO_ESPOLIO,
  ajustarNomesPoligonos,
  bloqueiaAvanco,
  camposAplicaveis,
  combinacaoDefinida,
  exigeEspolio,
  formularioVazio,
  limparCamposNaoAplicaveis,
  digitosIncra,
  mascaraIncra,
  somenteDigitos,
  validarFormulario,
  type ErrosCjt,
  type FormularioCjt,
} from "@/lib/cjt-formulario";

interface SigefParcela {
  codigoImovel: string;
  parcelaCodigo: string;
  nomeArea: string;
  areaHectares: number;
  municipio: string;
  uf: string;
  status: string;
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
}

type EtapaImovel = "consultando" | "selecao" | "semRegistro";

export function RequisicaoForm({
  cpf,
  criarEndpoint,
  documentosEndpoint,
  payloadExtra,
  painelHref,
  painelLabel,
  edicao,
}: RequisicaoFormProps) {
  const [form, setForm] = useState<FormularioCjt>(edicao?.cjt ?? formularioVazio);
  const [erros, setErros] = useState<ErrosCjt>({});

  const [etapaImovel, setEtapaImovel] = useState<EtapaImovel>("consultando");
  const [sigef, setSigef] = useState<SigefResult | null>(null);
  const [selecionada, setSelecionada] = useState<SigefParcela | null>(null);

  const [procurador, setProcurador] = useState(Boolean(edicao?.emNomeDeCpf));
  const [emNomeDeCpf, setEmNomeDeCpf] = useState(edicao?.emNomeDeCpf ?? "");
  const [emNomeDeNome, setEmNomeDeNome] = useState(edicao?.emNomeDeNome ?? "");
  const [observacao, setObservacao] = useState(edicao?.observacao ?? "");

  const [planta, setPlanta] = useState<File | null>(null);
  const [docPropriedade, setDocPropriedade] = useState<File | null>(null);
  const [procuracao, setProcuracao] = useState<File | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);

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
  function responder(campo: "qualidade" | "resultado" | "situacao", codigo: string) {
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
      nomesPoligonos: ajustarNomesPoligonos(atual.nomesPoligonos, qtd),
    }));
  }

  const campos = camposAplicaveis(form.resultado, form.situacao);
  const bloqueado = bloqueiaAvanco(form);
  const mostrarPergunta4 = combinacaoDefinida(form);
  const exigeDocsImovel = etapaImovel === "semRegistro";
  const enviados = edicao?.documentosEnviados ?? [];
  const temPlanta = Boolean(planta) || enviados.includes("PLANTA");
  const temDocPropriedade =
    Boolean(docPropriedade) || enviados.includes("DOC_PROPRIEDADE");
  const temProcuracao = Boolean(procuracao) || enviados.includes("PROCURACAO");

  async function enviar() {
    const validacao = validarFormulario(form);
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
    if (procurador && !(temProcuracao && emNomeDeCpf && emNomeDeNome)) {
      setErro("Informe os dados do proprietário representado e anexe a procuração.");
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
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (protocolo) {
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
      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="font-semibold text-gray-900">Identificação do pedido</h2>

        <Pergunta
          numero={1}
          titulo="Quem sou eu?"
          nome="cjt-qualidade"
          opcoes={QUALIDADE_OPCOES}
          valor={form.qualidade}
          erro={erros.qualidade}
          onChange={(c) => responder("qualidade", c)}
        />
        <Pergunta
          numero={2}
          titulo="O resultado será por:"
          nome="cjt-resultado"
          opcoes={RESULTADO_OPCOES}
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

        {bloqueado && (
          <p
            role="alert"
            className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            {MENSAGEM_NAO_SEI}
          </p>
        )}
      </section>

      {mostrarPergunta4 && (
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
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
                exigeEspolio(form.situacao)
                  ? "Informe o nome do falecido."
                  : "Havendo vários proprietários, informe o primeiro seguido de “e outros”."
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
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </Campo>
          )}

          {campos.includes("matricula") && (
            <Campo
              id="cjt-matricula"
              label="Matrícula *"
              erro={erros.matricula}
              dica="Somente algarismos; não é necessário escrever a palavra “Matrícula”."
            >
              <input
                id="cjt-matricula"
                type="text"
                inputMode="numeric"
                value={form.matricula}
                onChange={(e) =>
                  setForm((a) => ({ ...a, matricula: somenteDigitos(e.target.value) }))
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
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
                className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              {parseInt(form.qtdPoligonos, 10) >= ALERTA_QTD_POLIGONOS && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                  {`Atenção: ${form.qtdPoligonos} polígonos. Pedidos com ${ALERTA_QTD_POLIGONOS} ou mais polígonos exigem análise específica e podem ter prazo maior.`}
                </p>
              )}
            </Campo>
          )}

          {campos.includes("nomesPoligonos") && form.nomesPoligonos.length > 0 && (
            <Campo
              id="cjt-nomes"
              label="Nome de cada gleba/polígono *"
              erro={erros.nomesPoligonos}
              dica={`Até ${LIMITE_NOME_POLIGONO} caracteres, sem repetir nomes e sem usar nomes de municípios ou matrículas.`}
            >
              <div className="grid sm:grid-cols-2 gap-2">
                {form.nomesPoligonos.map((nome, i) => (
                  <input
                    key={i}
                    aria-label={`Nome do polígono ${i + 1}`}
                    type="text"
                    maxLength={LIMITE_NOME_POLIGONO}
                    value={nome}
                    placeholder={`Polígono ${i + 1}`}
                    onChange={(e) =>
                      setForm((a) => {
                        const nomes = [...a.nomesPoligonos];
                        nomes[i] = e.target.value;
                        return { ...a, nomesPoligonos: nomes };
                      })
                    }
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                ))}
              </div>
            </Campo>
          )}

          {campos.includes("codigoIncra") && (
            <Campo
              id="cjt-incra"
              label="INCRA/SNCR"
              erro={erros.codigoIncra}
              dica="Opcional. Quando preenchido, deve conter 13 algarismos (xxx.xxx.xxx.xxx-x)."
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
                className="w-64 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </Campo>
          )}
        </section>
      )}

      {mostrarPergunta4 && (
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
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
                        <span className="font-medium text-gray-900 flex items-center gap-2">
                          {p.nomeArea || "Imóvel rural"}
                          {ativa && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        </span>
                        <span className="block text-xs text-gray-600 mt-1">
                          Código do imóvel {p.codigoImovel} ·{" "}
                          {p.areaHectares.toLocaleString("pt-BR")} ha · {p.municipio}/
                          {p.uf} · {p.status}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
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

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={procurador}
              onChange={(e) => setProcurador(e.target.checked)}
              className="rounded border-gray-300"
            />
            Pedido apresentado por procurador(a) / representante
          </label>

          {procurador && (
            <div className="grid grid-cols-2 gap-3 pl-6">
              <input
                type="text"
                value={emNomeDeCpf}
                onChange={(e) => setEmNomeDeCpf(e.target.value)}
                placeholder="CPF do proprietário"
                aria-label="CPF do proprietário representado"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={emNomeDeNome}
                onChange={(e) => setEmNomeDeNome(e.target.value)}
                placeholder="Nome do proprietário"
                aria-label="Nome do proprietário representado"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
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
              <p className="text-xs text-gray-400">
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
            Declaro que as informações prestadas e a documentação apresentada estão
            de acordo com as instruções constantes no site.
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
  valor,
  erro,
  onChange,
}: {
  numero: number;
  titulo: string;
  nome: string;
  opcoes: readonly { codigo: string; label: string; bloqueia: boolean }[];
  valor: string;
  erro?: string;
  onChange: (codigo: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-900">
        {numero}. {titulo}
      </legend>
      <div className="mt-2 space-y-1.5">
        {opcoes.map((o) => (
          <label key={o.codigo} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name={nome}
              value={o.codigo}
              checked={valor === o.codigo}
              onChange={() => onChange(o.codigo)}
              className="border-gray-300"
            />
            {o.label}
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

function Campo({
  id,
  label,
  dica,
  erro,
  children,
}: {
  id: string;
  label: string;
  dica?: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900 mb-1">
        {label}
      </label>
      {children}
      {dica && <p className="text-xs text-gray-500 mt-1">{dica}</p>}
      {erro && (
        <p role="alert" className="text-sm text-red-600 mt-1">
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
