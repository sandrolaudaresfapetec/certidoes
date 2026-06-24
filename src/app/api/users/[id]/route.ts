import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/users/[id]">
) {
  const { id } = await ctx.params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.email !== undefined) data.email = body.email;
  if (body.role !== undefined) data.role = body.role;
  if (body.department !== undefined) data.department = body.department;
  if (body.cpf !== undefined) data.cpf = body.cpf || null;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.active !== undefined) data.active = body.active;
  if (body.password) {
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
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

  return Response.json(user);
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/users/[id]">
) {
  const { id } = await ctx.params;

  await prisma.user.update({
    where: { id },
    data: { active: false },
  });

  return Response.json({ success: true });
}
