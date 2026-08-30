"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

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

type Etapa = "consultando" | "selecao" | "semRegistro" | "enviando" | "concluido";

export default function NovaSolicitacaoPage() {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>("consultando");
  const [sigef, setSigef] = useState<SigefResult | null>(null);
  const [selecionada, setSelecionada] = useState<SigefParcela | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Representação (procurador)
  const [procurador, setProcurador] = useState(false);
  const [emNomeDeCpf, setEmNomeDeCpf] = useState("");
  const [emNomeDeNome, setEmNomeDeNome] = useState("");
  const [observacao, setObservacao] = useState("");

  // Documentos (só quando sem registro no INCRA e/ou procuração)
  const [planta, setPlanta] = useState<File | null>(null);
  const [docPropriedade, setDocPropriedade] = useState<File | null>(null);
  const [procuracao, setProcuracao] = useState<File | null>(null);

  const protocoloRef = useRef<string | null>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);

  // Ao abrir "Nova Solicitação", busca automaticamente os imóveis do
  // solicitante no SIGEF pelo CPF do login gov.br (conforme reunião).
  useEffect(() => {
    (async () => {
      try {
        // Recupera o CPF do solicitante logado via listagem (dados da sessão)
        const meRes = await fetch("/api/portal/solicitacoes");
        if (meRes.status === 401) {
          router.push("/portal/login");
          return;
        }
        // O CPF vem do cookie de sessão; consultamos o SIGEF via endpoint
        // dedicado que aceita o CPF do próprio solicitante.
        const cpfRes = await fetch("/api/portal/me");
        const me = await cpfRes.json();
        const res = await fetch("/api/sigef/consulta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cpfCnpj: me.cpf }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSigef(data);
        setEtapa(data.parcelas.length > 0 ? "selecao" : "semRegistro");
      } catch (e) {
        setErro((e as Error).message || "Erro ao consultar o SIGEF.");
        setEtapa("semRegistro");
      }
    })();
  }, [router]);

  async function enviar() {
    setEtapa("enviando");
    setErro(null);
    try {
      const res = await fetch("/api/portal/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar solicitação.");
      protocoloRef.current = data.protocolo;
      setProtocolo(data.protocolo);

      // Upload dos documentos exigidos
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
        const up = await fetch("/api/portal/documentos", {
          method: "POST",
          body: fd,
        });
        if (!up.ok) {
          const d = await up.json();
          throw new Error(d.error || `Falha ao enviar ${tipo}.`);
        }
      }
      setEtapa("concluido");
    } catch (e) {
      setErro((e as Error).message);
      setEtapa(selecionada ? "selecao" : "semRegistro");
    }
  }

  const exigeDocsImovel = etapa === "semRegistro";
  const docsOk =
    (!exigeDocsImovel || (planta && docPropriedade)) &&
    (!procurador || (procuracao && emNomeDeCpf && emNomeDeNome));
  const podeEnviar =
    (etapa === "selecao" && selecionada && docsOk) ||
    (etapa === "semRegistro" && docsOk);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/portal"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao painel
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-emerald-700" />
          Nova Solicitação de Certidão
        </h1>

        {etapa === "consultando" && (
          <p className="mt-6 flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando imóveis vinculados ao seu CPF no SIGEF/INCRA...
          </p>
        )}

        {sigef && etapa !== "consultando" && (
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                sigef.origem === "SIGEF_REAL"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {sigef.origem === "SIGEF_REAL"
                ? "Consulta oficial ao SIGEF"
                : "Integração SIGEF em modo simulado"}
            </span>
          </div>
        )}

        {etapa === "selecao" && sigef && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-3">
              Encontramos os imóveis abaixo vinculados ao seu CPF. Selecione
              aquele para o qual deseja a certidão:
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
                        {ativa && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                      </span>
                      <span className="block text-xs text-gray-600 mt-1">
                        Código do imóvel {p.codigoImovel} ·{" "}
                        {p.areaHectares.toLocaleString("pt-BR")} ha ·{" "}
                        {p.municipio}/{p.uf} · {p.status}
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
                setEtapa("semRegistro");
              }}
              className="mt-3 text-xs text-gray-500 underline underline-offset-2"
            >
              Meu imóvel não está nesta lista / não possui registro no INCRA
            </button>
          </div>
        )}

        {etapa === "semRegistro" && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Nenhum imóvel vinculado ao seu CPF foi localizado no SIGEF/INCRA.
                Sua solicitação será aberta e os dados do imóvel serão
                preenchidos pela equipe responsável. Para isso, anexe abaixo a{" "}
                <strong>planta do imóvel</strong> e o{" "}
                <strong>comprovante de propriedade</strong> (não é necessária a
                matrícula).
              </span>
            </p>
          </div>
        )}

        {(etapa === "selecao" || etapa === "semRegistro") && (
          <div className="mt-6 space-y-4 border-t border-gray-100 pt-5">
            {/* Representação */}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={procurador}
                onChange={(e) => setProcurador(e.target.checked)}
                className="rounded border-gray-300"
              />
              Estou solicitando como procurador(a) / representante
            </label>

            {procurador && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <input
                  type="text"
                  value={emNomeDeCpf}
                  onChange={(e) => setEmNomeDeCpf(e.target.value)}
                  placeholder="CPF do proprietário"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={emNomeDeNome}
                  onChange={(e) => setEmNomeDeNome(e.target.value)}
                  placeholder="Nome do proprietário"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            )}

            {/* Uploads condicionais */}
            {(exigeDocsImovel || procurador) && (
              <div className="space-y-3">
                {exigeDocsImovel && (
                  <>
                    <DocField
                      label="Planta do imóvel *"
                      file={planta}
                      onChange={setPlanta}
                    />
                    <DocField
                      label="Comprovante de propriedade *"
                      file={docPropriedade}
                      onChange={setDocPropriedade}
                    />
                  </>
                )}
                {procurador && (
                  <DocField
                    label="Procuração *"
                    file={procuracao}
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
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />

            {erro && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {erro}
              </p>
            )}

            <button
              type="button"
              onClick={enviar}
              disabled={!podeEnviar}
              className="w-full bg-emerald-700 text-white py-2.5 rounded-md text-sm font-medium hover:bg-emerald-800 disabled:opacity-50"
            >
              Enviar solicitação
            </button>
          </div>
        )}

        {etapa === "enviando" && (
          <p className="mt-6 flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Registrando sua solicitação...
          </p>
        )}

        {etapa === "concluido" && (
          <div className="mt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900">
              Solicitação registrada!
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Protocolo <strong>{protocolo}</strong>. Você pode acompanhar o
              andamento no painel.
            </p>
            <Link
              href="/portal"
              className="inline-block mt-4 bg-emerald-700 text-white px-5 py-2 rounded-md text-sm hover:bg-emerald-800"
            >
              Ir para o painel
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function DocField({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-md p-3 cursor-pointer hover:border-emerald-400">
      <Upload className="h-5 w-5 text-gray-400" />
      <span className="text-sm text-gray-700 flex-1">
        {label}
        {file && (
          <span className="block text-xs text-emerald-700">{file.name}</span>
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
