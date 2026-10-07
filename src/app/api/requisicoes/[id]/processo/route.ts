import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAtendimentoApi } from "@/lib/auth";

/**
 * POST /api/requisicoes/[id]/processo — Abertura de Processo (Atendimento).
 * Converte a requisição do cliente em processo na entrada do SDTC, herdando os
 * dados do interessado e do imóvel já informados na requisição.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessao = await exigirAtendimentoApi();
  if ("erro" in sessao) return sessao.erro;

  const requisicao = await prisma.solicitacao.findUnique({
    where: { id },
    include: { solicitante: true },
  });
  if (!requisicao) {
    return NextResponse.json({ error: "Requisição não encontrada." }, { status: 404 });
  }
  if (requisicao.processId) {
    return NextResponse.json(
      { error: "Esta requisição já possui processo aberto." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const expediente = (body.expediente ?? "").toString().trim() || null;
  const observacaoEntrada = (body.observacaoEntrada ?? "").toString().trim() || null;

  const processo = await prisma.$transaction(async (tx) => {
    // Os dados do imóvel são relidos aqui: o cliente pode corrigir a requisição
    // até a abertura, e o processo tem de herdar a versão vencedora da corrida.
    const atual = await tx.solicitacao.findUnique({
      where: { id: requisicao.id },
      include: { solicitante: true },
    });
    if (!atual || atual.processId) {
      throw new Error("PROCESSO_JA_ABERTO");
    }

    const maxOrdem = await tx.process.findFirst({
      orderBy: { ordem: "desc" },
      select: { ordem: true },
    });

    const criado = await tx.process.create({
      data: {
        ordem: (maxOrdem?.ordem || 0) + 1,
        anoEntrada: new Date().getFullYear(),
        tipoServico: "Certidao",
        expediente,
        dtAbertoSei: new Date(),
        tipo: "Comum-CPF",
        interessado: atual.solicitante.nome,
        email: atual.solicitante.email,
        telefone: atual.solicitante.telefone,
        cpfCnpj: atual.solicitante.cpf,
        municipio: atual.sigefMunicipio,
        observacaoEntrada,
        situacao: "entrada_sdtc",
        criadoPorId: sessao.usuario.id,
        sigefCodigoImovel: atual.sigefCodigoImovel,
        sigefParcelaCodigo: atual.sigefParcelaCodigo,
        sigefAreaHectares: atual.sigefAreaHectares,
        sigefMunicipio: atual.sigefMunicipio,
        sigefUf: atual.sigefUf,
        sigefStatus: atual.sigefStatus,
        sigefOrigem: atual.sigefOrigem,
        sigefConsultadoEm: atual.sigefCodigoImovel ? new Date() : null,
      },
    });

    const vinculadas = await tx.solicitacao.updateMany({
      where: { id: requisicao.id, processId: null },
      data: { processId: criado.id, status: "EM_ANALISE" },
    });
    if (vinculadas.count === 0) {
      throw new Error("PROCESSO_JA_ABERTO");
    }

    return criado;
  }).catch((e: Error) => {
    if (e.message === "PROCESSO_JA_ABERTO") return null;
    throw e;
  });

  if (!processo) {
    return NextResponse.json(
      { error: "Esta requisição já possui processo aberto." },
      { status: 400 }
    );
  }

  const responsaveis = await prisma.user.findMany({
    where: { active: true, OR: [{ role: "ADMIN" }, { role: "GERENTE" }] },
    select: { id: true },
  });
  if (responsaveis.length > 0) {
    await prisma.notification.createMany({
      data: responsaveis.map((u) => ({
        type: "NOVA_ENTRADA",
        title: "Novo Processo Registrado",
        message: `Processo ${processo.ordem} — ${processo.interessado} — requisição ${requisicao.protocolo}`,
        processId: processo.id,
        userId: u.id,
      })),
    });
  }

  return NextResponse.json(processo, { status: 201 });
}
