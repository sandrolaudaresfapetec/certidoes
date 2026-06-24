import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return Response.json(
      { error: "E-mail e senha sao obrigatorios" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.active) {
    return Response.json(
      { error: "Credenciais invalidas" },
      { status: 401 }
    );
  }

  if (!user.passwordHash) {
    return Response.json(
      { error: "Usuario sem senha cadastrada. Use o login Gov.br." },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return Response.json(
      { error: "Credenciais invalidas" },
      { status: 401 }
    );
  }

  await createSession(user.id, user.role, user.name);

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    },
  });
}
