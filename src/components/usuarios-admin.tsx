"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { PAPEIS, SENHA_MINIMA } from "@/lib/papeis";

export interface UsuarioAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  active: boolean;
  processos: number;
}

const CORES_PAPEL: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  GERENTE: "bg-pink-100 text-pink-700",
  DIRETOR: "bg-red-100 text-red-700",
  TECNICO: "bg-blue-100 text-blue-700",
  CONFERENTE: "bg-orange-100 text-orange-700",
  SDTC: "bg-teal-100 text-teal-700",
};

/**
 * Gerenciamento de usuarios do backoffice — criacao, alteracao de papel e
 * departamento, redefinicao de senha e ativacao/desativacao. A tela e as
 * rotas /api/users so respondem ao ADMIN.
 */
export function UsuariosAdmin({
  usuarios,
  adminId,
}: {
  usuarios: UsuarioAdmin[];
  adminId: string;
}) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function enviar(url: string, method: "POST" | "PATCH", corpo: unknown) {
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar.");
      setCriando(false);
      setEditando(null);
      router.refresh();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      {erro && (
        <p
          role="alert"
          className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3"
        >
          {erro}
        </p>
      )}

      {criando ? (
        <FormularioUsuario
          titulo="Novo usuário"
          salvando={salvando}
          exigeSenha
          onCancelar={() => setCriando(false)}
          onSalvar={(dados) => enviar("/api/users", "POST", dados)}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setErro(null);
            setEditando(null);
            setCriando(true);
          }}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Novo usuário
        </button>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
              <th className="px-6 py-3 text-left">Nome</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Funcao</th>
              <th className="px-6 py-3 text-left">Departamento</th>
              <th className="px-6 py-3 text-center">Processos</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 align-top">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                      {user.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{user.name}</span>
                  </div>
                  {editando === user.id && (
                    <div className="mt-3">
                      <FormularioUsuario
                        titulo={`Editar ${user.name}`}
                        salvando={salvando}
                        inicial={user}
                        onCancelar={() => setEditando(null)}
                        onSalvar={(dados) => enviar(`/api/users/${user.id}`, "PATCH", dados)}
                      />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CORES_PAPEL[user.role] || "bg-gray-100 text-gray-700"}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.department || "-"}</td>
                <td className="px-6 py-4 text-sm text-center text-gray-600">{user.processos}</td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${user.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {user.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => {
                      setErro(null);
                      setCriando(false);
                      setEditando(editando === user.id ? null : user.id);
                    }}
                    className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  {user.id !== adminId && (
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() =>
                        enviar(`/api/users/${user.id}`, "PATCH", { active: !user.active })
                      }
                      className="ml-4 text-sm text-gray-600 hover:underline disabled:opacity-50"
                    >
                      {user.active ? "Desativar" : "Reativar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                  Nenhum usuario cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FormularioUsuario({
  titulo,
  inicial,
  exigeSenha = false,
  salvando,
  onSalvar,
  onCancelar,
}: {
  titulo: string;
  inicial?: UsuarioAdmin;
  exigeSenha?: boolean;
  salvando: boolean;
  onSalvar: (dados: Record<string, unknown>) => void;
  onCancelar: () => void;
}) {
  const [name, setName] = useState(inicial?.name ?? "");
  const [email, setEmail] = useState(inicial?.email ?? "");
  const [role, setRole] = useState(inicial?.role ?? "TECNICO");
  const [department, setDepartment] = useState(inicial?.department ?? "");
  const [senha, setSenha] = useState("");

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{titulo}</h2>
        <button type="button" onClick={onCancelar} aria-label="Fechar">
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-xs font-medium text-gray-700">
          Nome
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-medium text-gray-700">
          E-mail institucional
          <input
            type="email"
            value={email}
            disabled={Boolean(inicial)}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-normal disabled:bg-gray-100 disabled:text-gray-500"
          />
        </label>
        <label className="text-xs font-medium text-gray-700">
          Funcao
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-normal"
          >
            {PAPEIS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-700">
          Departamento
          <input
            type="text"
            value={department}
            placeholder="CATDT, CG, SDTC..."
            onChange={(e) => setDepartment(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-medium text-gray-700 sm:col-span-2">
          {exigeSenha ? "Senha inicial" : "Nova senha (deixe vazio para manter)"}
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-normal"
          />
          <span className="block mt-1 font-normal text-gray-500">
            Mínimo de {SENHA_MINIMA} caracteres.
          </span>
        </label>
      </div>

      <button
        type="button"
        disabled={salvando}
        onClick={() =>
          onSalvar(
            exigeSenha
              ? { name, email, role, department, senha }
              : { name, role, department, senha }
          )
        }
        className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar
      </button>
    </div>
  );
}
