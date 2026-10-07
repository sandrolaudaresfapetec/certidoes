"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { SERVICE_TYPES, CLIENT_TYPES, BASES, DEPARTMENTS } from "@/lib/workflow";

type Tipo = "texto" | "email" | "data" | "ano" | "dinheiro" | "lista" | "area";

interface CampoDef {
  nome: string;
  rotulo: string;
  tipo: Tipo;
  obrigatorio?: boolean;
  opcoes?: readonly string[];
  dica?: string;
  /** Campo ocupa a largura toda da seção (áreas de texto). */
  largo?: boolean;
}

interface SecaoDef {
  id: string;
  titulo: string;
  campos: CampoDef[];
}

export interface UsuarioOpcao {
  id: string;
  name: string;
  role: string;
}

interface ProcessoEdicaoFormProps {
  processoId: string;
  /** Valores atuais, já como texto (datas em aaaa-mm-dd, taxas em pt-BR). */
  inicial: Record<string, string>;
  /** Usuários que a API aceita como técnico responsável (TECNICO ou ADMIN). */
  tecnicos: UsuarioOpcao[];
  /** Usuários que a API aceita como conferente (CONFERENTE ou ADMIN). */
  conferentes: UsuarioOpcao[];
}

const SECOES: SecaoDef[] = [
  {
    id: "servico",
    titulo: "Tipo de Servico e Expediente",
    campos: [
      { nome: "tipoServico", rotulo: "Tipo de Servico", tipo: "lista", obrigatorio: true, opcoes: SERVICE_TYPES },
      {
        nome: "expediente",
        rotulo: "Expediente (SEI)",
        tipo: "texto",
        dica: "É o número que o solicitante vê no portal.",
      },
      { nome: "dtAbertoSei", rotulo: "Data Abertura SEI", tipo: "data" },
      { nome: "anoEntrada", rotulo: "Ano de Entrada", tipo: "ano", obrigatorio: true },
    ],
  },
  {
    id: "interessado",
    titulo: "Dados do Interessado",
    campos: [
      { nome: "interessado", rotulo: "Interessado", tipo: "texto", obrigatorio: true },
      { nome: "tipo", rotulo: "Tipo", tipo: "lista", obrigatorio: true, opcoes: CLIENT_TYPES },
      { nome: "email", rotulo: "Email", tipo: "email" },
      { nome: "telefone", rotulo: "Telefone", tipo: "texto" },
      { nome: "cpfCnpj", rotulo: "CPF/CNPJ", tipo: "texto" },
      { nome: "dtNascimentoIdoso", rotulo: "Data Nascimento (Idoso)", tipo: "data" },
    ],
  },
  {
    id: "localizacao",
    titulo: "Localizacao",
    campos: [
      { nome: "municipio", rotulo: "Municipio", tipo: "texto" },
      { nome: "ra", rotulo: "RA (Regiao Administrativa)", tipo: "texto" },
      { nome: "dra", rotulo: "DRA", tipo: "texto" },
      { nome: "utm", rotulo: "UTM", tipo: "texto" },
      { nome: "pasta", rotulo: "Pasta", tipo: "texto" },
      { nome: "divisaDificuldade", rotulo: "Dificuldade de Divisa", tipo: "texto" },
    ],
  },
  {
    id: "tecnico",
    titulo: "Trabalho Tecnico",
    campos: [
      // tecnicoRespId e tecnicoConfId são desenhados à parte (listas de usuários).
      { nome: "quemVaiAssinar", rotulo: "Quem Vai Assinar", tipo: "texto" },
      { nome: "dtEmail", rotulo: "Data Email", tipo: "data" },
      { nome: "dtVisita1", rotulo: "Data Visita 1", tipo: "data" },
      { nome: "dtVisita2", rotulo: "Data Visita 2", tipo: "data" },
      { nome: "base", rotulo: "Base", tipo: "lista", opcoes: BASES },
      { nome: "departamento", rotulo: "Departamento", tipo: "lista", opcoes: DEPARTMENTS },
      { nome: "observacoesTecnico", rotulo: "Observacoes do Tecnico", tipo: "area", largo: true },
    ],
  },
  {
    id: "financeiro",
    titulo: "Financeiro, Prioridade e Saida",
    campos: [
      { nome: "taxaAbertura", rotulo: "Taxa Abertura (R$)", tipo: "dinheiro" },
      { nome: "taxaVistoria", rotulo: "Taxa Vistoria (R$)", tipo: "dinheiro" },
      { nome: "nivelPrioridade", rotulo: "Nivel de Prioridade", tipo: "texto" },
      { nome: "statusEscritorio", rotulo: "Status do Escritorio", tipo: "texto" },
      { nome: "numeroSaidaIGC", rotulo: "N. Saida IGC", tipo: "texto" },
      { nome: "dtCompile", rotulo: "Data Compilacao", tipo: "data" },
      { nome: "observacaoEntrada", rotulo: "Observacoes de Entrada", tipo: "area", largo: true },
    ],
  },
];

const TODOS_OS_CAMPOS: CampoDef[] = SECOES.flatMap((s) => s.campos);
const NOMES_USUARIO = ["tecnicoRespId", "tecnicoConfId"] as const;

/** Converte "1.350,50" ou "350" em número; null se não for um valor monetário. */
function lerDinheiro(texto: string): number | null {
  const limpo = texto.trim().replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Number(limpo);
}

/**
 * Valor que a API recebe para um campo (null limpa o campo). A rota não valida tipos nem
 * trata data vazia, então a conversão é feita aqui. `erro` vem preenchido quando o texto
 * é inválido.
 */
function converter(campo: CampoDef, texto: string): { valor: string | number | null; erro?: string } {
  const t = texto.trim();
  if (campo.obrigatorio && t === "") return { valor: null, erro: "Campo obrigatório." };
  if (t === "") return { valor: null };
  if (campo.tipo === "ano") {
    const n = Number(t);
    if (!Number.isInteger(n) || n < 1900 || n > 2100) {
      return { valor: null, erro: "Informe um ano entre 1900 e 2100." };
    }
    return { valor: n };
  }
  if (campo.tipo === "dinheiro") {
    const n = lerDinheiro(t);
    return n === null ? { valor: null, erro: "Informe um valor como 350,00." } : { valor: n };
  }
  if (campo.tipo === "data") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : null;
    if (!d || Number.isNaN(d.getTime())) return { valor: null, erro: "Informe uma data válida." };
    // Meio-dia local: a tela do processo mostra a data no fuso do servidor, e a meia-noite UTC cairia no dia anterior.
    return { valor: d.toISOString() };
  }
  return { valor: t };
}

export function ProcessoEdicaoForm({
  processoId,
  inicial,
  tecnicos,
  conferentes,
}: ProcessoEdicaoFormProps) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, string>>(inicial);
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const alertaRef = useRef<HTMLDivElement>(null);

  function alterar(nome: string, valor: string) {
    setValores((v) => ({ ...v, [nome]: valor }));
    setAviso(null);
  }

  function mostrarErro(mensagem: string) {
    setErro(mensagem);
    requestAnimationFrame(() => alertaRef.current?.focus());
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);

    const novosErros: Record<string, string> = {};
    const payload: Record<string, string | number | null> = {};
    for (const campo of TODOS_OS_CAMPOS) {
      const atual = converter(campo, valores[campo.nome] ?? "");
      if (atual.erro) {
        novosErros[campo.nome] = atual.erro;
        continue;
      }
      const original = converter(campo, inicial[campo.nome] ?? "");
      if (atual.valor !== original.valor) payload[campo.nome] = atual.valor;
    }
    for (const nome of NOMES_USUARIO) {
      const atual = valores[nome] || null;
      if (atual !== (inicial[nome] || null)) payload[nome] = atual;
    }

    setErrosCampo(novosErros);
    if (Object.keys(novosErros).length > 0) {
      mostrarErro("Corrija os campos destacados antes de salvar.");
      return;
    }
    if (Object.keys(payload).length === 0) {
      setAviso("Nenhuma alteração para salvar.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch(`/api/processes/${processoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        mostrarErro(data.error || "Erro ao salvar o processo.");
        return;
      }
      router.push(`/processos/${processoId}?salvo=1`);
    } catch {
      mostrarErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} noValidate className="space-y-4 max-w-4xl">
      {erro && (
        <div
          ref={alertaRef}
          tabIndex={-1}
          role="alert"
          className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 outline-none"
        >
          <strong className="font-semibold">Não foi possível salvar.</strong> {erro}
        </div>
      )}

      {SECOES.map((secao) => (
        <section
          key={secao.id}
          aria-labelledby={`sec-${secao.id}`}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h2 id={`sec-${secao.id}`} className="text-lg font-semibold text-gray-900 mb-4">
            {secao.titulo}
          </h2>

          {secao.id === "tecnico" && (
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <ListaUsuarios
                nome="tecnicoRespId"
                rotulo="Tecnico Responsavel"
                dica="Só técnicos e administradores ativos."
                usuarios={tecnicos}
                valor={valores.tecnicoRespId ?? ""}
                onChange={alterar}
              />
              <ListaUsuarios
                nome="tecnicoConfId"
                rotulo="Conferente"
                dica="Só conferentes e administradores ativos."
                usuarios={conferentes}
                valor={valores.tecnicoConfId ?? ""}
                onChange={alterar}
              />
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {secao.campos
              .filter((c) => !c.largo)
              .map((c) => (
                <Campo
                  key={c.nome}
                  def={c}
                  valor={valores[c.nome] ?? ""}
                  erro={errosCampo[c.nome]}
                  onChange={alterar}
                />
              ))}
          </div>
          {secao.campos
            .filter((c) => c.largo)
            .map((c) => (
              <div key={c.nome} className="mt-4">
                <Campo
                  def={c}
                  valor={valores[c.nome] ?? ""}
                  erro={errosCampo[c.nome]}
                  onChange={alterar}
                />
              </div>
            ))}
        </section>
      ))}

      {aviso && (
        <p role="status" className="text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-md p-3">
          {aviso}
        </p>
      )}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={salvando}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar alterações
        </button>
        <Link
          href={`/processos/${processoId}`}
          className="px-6 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

const CLASSE_CAMPO = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm";

function Campo({
  def,
  valor,
  erro,
  onChange,
}: {
  def: CampoDef;
  valor: string;
  erro?: string;
  onChange: (nome: string, valor: string) => void;
}) {
  const id = `campo-${def.nome}`;
  const descricao = [def.dica && `${id}-dica`, erro && `${id}-erro`].filter(Boolean).join(" ") || undefined;
  const comum = {
    id,
    value: valor,
    "aria-describedby": descricao,
    "aria-invalid": erro ? true : undefined,
    className: CLASSE_CAMPO,
  };

  let controle: React.ReactNode;
  if (def.tipo === "lista") {
    // Valor antigo fora do catálogo continua selecionável, para não ser apagado sem querer.
    const opcoes = def.opcoes ?? [];
    const extra = valor && !opcoes.includes(valor) ? [valor] : [];
    controle = (
      <select {...comum} onChange={(e) => onChange(def.nome, e.target.value)}>
        <option value="">Selecione...</option>
        {[...opcoes, ...extra].map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  } else if (def.tipo === "area") {
    controle = <textarea {...comum} rows={3} onChange={(e) => onChange(def.nome, e.target.value)} />;
  } else {
    const tipoInput = def.tipo === "data" ? "date" : def.tipo === "ano" ? "number" : def.tipo === "email" ? "email" : "text";
    controle = (
      <input
        {...comum}
        type={tipoInput}
        inputMode={def.tipo === "dinheiro" ? "decimal" : undefined}
        onChange={(e) => onChange(def.nome, e.target.value)}
      />
    );
  }

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1">
        {def.rotulo}
        {def.obrigatorio && " *"}
      </label>
      {controle}
      {def.dica && (
        <p id={`${id}-dica`} className="text-xs text-gray-600 mt-1">
          {def.dica}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} role="alert" className="text-xs text-red-700 mt-1">
          {erro}
        </p>
      )}
    </div>
  );
}

function ListaUsuarios({
  nome,
  rotulo,
  dica,
  usuarios,
  valor,
  onChange,
}: {
  nome: string;
  rotulo: string;
  dica: string;
  usuarios: UsuarioOpcao[];
  valor: string;
  onChange: (nome: string, valor: string) => void;
}) {
  const id = `campo-${nome}`;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1">
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        aria-describedby={`${id}-dica`}
        onChange={(e) => onChange(nome, e.target.value)}
        className={CLASSE_CAMPO}
      >
        <option value="">Sem atribuição</option>
        {usuarios.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.role})
          </option>
        ))}
      </select>
      <p id={`${id}-dica`} className="text-xs text-gray-600 mt-1">
        {dica}
      </p>
    </div>
  );
}
