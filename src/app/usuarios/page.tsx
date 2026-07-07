"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Phone, Plus, Pencil, Trash2, X, Save, Loader2 } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  DIRETOR: "Diretor",
  TECNICO: "Tecnico",
  CONFERENTE: "Conferente",
  SDTC: "Funcionario SDTC",
  GDTAC: "Funcionario GDTAC",
  CLIENTE: "Cliente",
};

const ROLES = ["ADMIN", "GERENTE", "DIRETOR", "TECNICO", "CONFERENTE", "SDTC", "GDTAC", "CLIENTE"];

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  GERENTE: "bg-pink-100 text-pink-700",
  DIRETOR: "bg-red-100 text-red-700",
  TECNICO: "bg-blue-100 text-blue-700",
  CONFERENTE: "bg-orange-100 text-orange-700",
  SDTC: "bg-teal-100 text-teal-700",
  GDTAC: "bg-cyan-100 text-cyan-700",
  CLIENTE: "bg-green-100 text-green-700",
};

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  cpf: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  role: string;
  department: string;
  cpf: string;
  phone: string;
}

const emptyForm: FormData = {
  name: "",
  email: "",
  password: "",
  role: "TECNICO",
  department: "",
  cpf: "",
  phone: "",
};

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 13 && d.startsWith("55")) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  return phone;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        setAuthorized(false);
        return;
      }
      const meData = await meRes.json();
      if (meData.user?.role !== "ADMIN") {
        setAuthorized(false);
        return;
      }

      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      department: user.department || "",
      cpf: user.cpf || "",
      phone: user.phone || "",
    });
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim() || !form.role) {
      setError("Nome, e-mail e perfil sao obrigatorios");
      return;
    }

    if (!editingUser && !form.password.trim()) {
      setError("Senha e obrigatoria para novos usuarios");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingUser) {
        const payload: Record<string, string> = {
          name: form.name,
          email: form.email,
          role: form.role,
          department: form.department,
          cpf: form.cpf,
          phone: form.phone,
        };
        if (form.password.trim()) {
          payload.password = form.password;
        }

        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Erro ao atualizar usuario");
          return;
        }
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
            department: form.department || null,
            cpf: form.cpf || null,
            phone: form.phone || null,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Erro ao criar usuario");
          return;
        }
      }

      setShowModal(false);
      fetchUsers();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/users/${deleteConfirm.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDeleteConfirm(null);
        fetchUsers();
      }
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-red-600">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="h-6 w-6" />
            Usuarios
          </h1>
          <p className="text-gray-500 mt-1">
            Gerenciamento de usuarios do sistema ({users.length})
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Usuario
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                Nome
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                Email
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  WhatsApp
                </span>
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                Funcao
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                Departamento
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">
                Status
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm font-medium">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {user.name}
                      </span>
                      {user.cpf && (
                        <p className="text-xs text-gray-400">{user.cpf}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {user.phone ? (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-green-600" />
                      {formatPhone(user.phone)}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Nao informado</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role] || "bg-gray-100 text-gray-700"}`}
                  >
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {user.department || "-"}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${user.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {user.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => openEdit(user)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(user)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  Nenhum usuario cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create / Edit User */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingUser ? "Editar Usuario" : "Novo Usuario"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {editingUser ? "(deixe vazio para manter)" : "*"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                  placeholder={
                    editingUser ? "Manter senha atual" : "Senha do usuario"
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil *
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                  placeholder="Ex: CATDT, CG, SDTC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {editingUser ? "Salvar Alteracoes" : "Criar Usuario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Confirmar Exclusao
              </h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">
                Tem certeza que deseja desativar o usuario{" "}
                <strong>{deleteConfirm.name}</strong> ({deleteConfirm.email})?
              </p>
              <p className="text-xs text-gray-400 mt-2">
                O usuario sera marcado como inativo e nao podera mais acessar o
                sistema.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Desativar Usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
