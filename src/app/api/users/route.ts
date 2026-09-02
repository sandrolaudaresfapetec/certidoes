import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdminApi, exigirUsuarioApi, hashSenha, papelValido } from "@/lib/auth";
import { SENHA_MINIMA } from "@/lib/papeis";

/** Campos publicos de um usuario (nunca inclui passwordHash). */
const CAMPOS = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  active: true,
} as const;

export async function GET(request: NextRequest) {
  const sessao = await exigirUsuarioApi();
  if ("erro" in sessao) return sessao.erro;

  // A lista completa (incluindo inativos) e do gerenciamento, restrito a ADMIN.
  const incluirInativos = request.nextUrl.searchParams.get("todos") === "true";
  if (incluirInativos && sessao.usuario.role !== "ADMIN") {
    return NextResponse.json({ error: "Ação exclusiva de ADMIN." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: incluirInativos ? {} : { active: true },
    select: CAMPOS,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

/** POST /api/users — cria usuario do backoffice (exclusivo do ADMIN). */
export async function POST(request: NextRequest) {
  const sessao = await exigirAdminApi();
  if ("erro" in sessao) return sessao.erro;

  const body = await request.json().catch(() => ({}));
  const name = (body.name ?? "").toString().trim();
  const email = (body.email ?? "").toString().trim().toLowerCase();
  const role = (body.role ?? "").toString();
  const department = (body.department ?? "").toString().trim() || null;
  const senha = (body.senha ?? "").toString();

  if (name.length < 3) {
    return NextResponse.json({ error: "Informe o nome do usuário." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (!papelValido(role)) {
    return NextResponse.json({ error: "Papel inválido." }, { status: 400 });
  }
  if (senha.length < SENHA_MINIMA) {
    return NextResponse.json(
      { error: `A senha deve ter ao menos ${SENHA_MINIMA} caracteres.` },
      { status: 400 }
    );
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    return NextResponse.json({ error: "Já existe usuário com este e-mail." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { name, email, role, department, passwordHash: hashSenha(senha) },
    select: CAMPOS,
  });

  return NextResponse.json(user, { status: 201 });
}
