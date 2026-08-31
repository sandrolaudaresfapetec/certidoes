import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validarCPF } from "@/lib/cpf";
import { getPerfilAtivo, podeAtender } from "@/lib/perfil-ativo";

/**
 * POST /api/clientes — Cadastro de Cliente pelo Atendimento.
 * Quando o CPF já existe, atualiza os dados de contato do cliente.
 */
export async function POST(request: NextRequest) {
  const perfil = await getPerfilAtivo();
  if (!podeAtender(perfil)) {
    return NextResponse.json(
      { error: "Perfil ativo não pertence ao Atendimento." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const cpf = (body.cpf ?? "").toString().replace(/\D/g, "");
  const nome = (body.nome ?? "").toString().trim();
  const email = (body.email ?? "").toString().trim();
  const telefone = (body.telefone ?? "").toString().trim();

  if (!validarCPF(cpf)) {
    return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
  }
  if (nome.length < 3) {
    return NextResponse.json({ error: "Informe o nome do cliente." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (telefone.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "Informe um telefone com DDD." }, { status: 400 });
  }

  const cliente = await prisma.solicitante.upsert({
    where: { cpf },
    create: { cpf, nome, email, telefone, cadastroCompleto: true },
    update: { nome, email, telefone, cadastroCompleto: true },
    select: { id: true, cpf: true, nome: true, email: true, telefone: true },
  });

  return NextResponse.json(cliente, { status: 201 });
}
