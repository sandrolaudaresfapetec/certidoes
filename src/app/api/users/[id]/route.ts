import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdminApi, hashSenha, papelValido } from "@/lib/auth";
import { SENHA_MINIMA } from "@/lib/papeis";

const CAMPOS = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  active: true,
} as const;

/**
 * PATCH /api/users/[id] — altera nome, papel, departamento, situação e senha
 * de um usuário do backoffice (exclusivo do ADMIN).
 *
 * O e-mail identifica a conta no login institucional e não é editável; para
 * trocar de identidade, desative a conta e crie outra.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessao = await exigirAdminApi();
  if ("erro" in sessao) return sessao.erro;

  const alvo = await prisma.user.findUnique({ where: { id } });
  if (!alvo) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const dados: {
    name?: string;
    role?: string;
    department?: string | null;
    active?: boolean;
    passwordHash?: string;
  } = {};

  if (body.name !== undefined) {
    const name = body.name.toString().trim();
    if (name.length < 3) {
      return NextResponse.json({ error: "Informe o nome do usuário." }, { status: 400 });
    }
    dados.name = name;
  }

  if (body.role !== undefined) {
    const role = body.role.toString();
    if (!papelValido(role)) {
      return NextResponse.json({ error: "Papel inválido." }, { status: 400 });
    }
    dados.role = role;
  }

  if (body.department !== undefined) {
    dados.department = body.department?.toString().trim() || null;
  }

  if (body.active !== undefined) {
    dados.active = body.active === true;
  }

  if (body.senha !== undefined && body.senha !== "") {
    const senha = body.senha.toString();
    if (senha.length < SENHA_MINIMA) {
      return NextResponse.json(
        { error: `A senha deve ter ao menos ${SENHA_MINIMA} caracteres.` },
        { status: 400 }
      );
    }
    dados.passwordHash = hashSenha(senha);
  }

  // O administrador logado não pode revogar o próprio acesso e deixar o
  // sistema sem quem gerencie usuários.
  const perdeAcesso = dados.active === false || (dados.role && dados.role !== "ADMIN");
  if (alvo.id === sessao.usuario.id && perdeAcesso) {
    return NextResponse.json(
      { error: "Você não pode desativar nem alterar o próprio papel de ADMIN." },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({ where: { id: alvo.id }, data: dados, select: CAMPOS });
  return NextResponse.json(user);
}
