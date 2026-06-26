import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }
  const role = request.nextUrl.searchParams.get("role");
  const where: Record<string, unknown> = {};
  if (role) where.role = role;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      cpf: true,
      phone: true,
      active: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return Response.json(users);
}

export async function POST(request: NextRequest) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }
  const body = await request.json();
  const { name, email, password, role, department, cpf, phone } = body;

  if (!name || !email || !role) {
    return Response.json(
      { error: "Nome, e-mail e perfil sao obrigatorios" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json(
      { error: "E-mail ja cadastrado" },
      { status: 409 }
    );
  }

  const passwordHash = password
    ? await bcrypt.hash(password, 10)
    : null;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      department: department || null,
      cpf: cpf || null,
      phone: phone || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      cpf: true,
      phone: true,
      active: true,
    },
  });

  return Response.json(user, { status: 201 });
}
