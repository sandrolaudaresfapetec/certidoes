import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendWhatsApp } from "@/lib/whatsapp";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  if (!["ADMIN", "SDTC"].includes(session.role)) {
    return NextResponse.json(
      { error: "Apenas SDTC pode converter solicitacoes em processos" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const solicitacao = await prisma.solicitacao.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!solicitacao) {
    return NextResponse.json({ error: "Solicitacao nao encontrada" }, { status: 404 });
  }

  if (solicitacao.processId) {
    return NextResponse.json(
      { error: "Solicitacao ja foi convertida em processo" },
      { status: 400 }
    );
  }

  if (!["pendente", "em_analise"].includes(solicitacao.status)) {
    return NextResponse.json(
      { error: "Solicitacao precisa estar pendente ou em analise para ser convertida" },
      { status: 400 }
    );
  }

  // Check required documents
  const docsOk =
    solicitacao.docRequerimento &&
    solicitacao.docIdentidade &&
    solicitacao.docComprovante &&
    solicitacao.docPlanta &&
    solicitacao.docMatricula;

  if (!docsOk) {
    return NextResponse.json(
      { error: "Documentacao obrigatoria incompleta. Verifique: Requerimento, Identidade, Comprovante, Planta, Matricula." },
      { status: 400 }
    );
  }

  // Get next order number
  const maxOrdem = await prisma.process.findFirst({
    orderBy: { ordem: "desc" },
    select: { ordem: true },
  });

  // Create process from solicitacao in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const processo = await tx.process.create({
      data: {
        ordem: (maxOrdem?.ordem || 0) + 1,
        anoEntrada: new Date().getFullYear(),
        tipoServico: solicitacao.tipoServico,
        tipo: solicitacao.tipo,
        interessado: solicitacao.interessado,
        email: solicitacao.email,
        telefone: solicitacao.telefone,
        cpfCnpj: solicitacao.cpfCnpj,
        dtNascimentoIdoso: solicitacao.dtNascimentoIdoso,
        municipio: solicitacao.municipio,
        ra: solicitacao.ra,
        codigoSigef: solicitacao.codigoSigef,
        areaSigef: solicitacao.areaSigef,
        statusSigef: solicitacao.statusSigef,
        nomeFazenda: solicitacao.nomeFazenda,
        matriculaSigef: solicitacao.matriculaSigef,
        detentorSigef: solicitacao.detentorSigef,
        municipioSigef: solicitacao.municipioSigef,
        ufSigef: solicitacao.ufSigef,
        representanteTecnico: solicitacao.representanteTecnico,
        situacao: "entrada_sdtc",
        criadoPorId: session.userId,
        clienteId: solicitacao.clienteId,
        dtAbertoSei: new Date(),
      },
      include: {
        tecnicoResp: { select: { id: true, name: true } },
        criadoPor: { select: { id: true, name: true } },
      },
    });

    // Update solicitacao with process reference
    const updatedSolicitacao = await tx.solicitacao.update({
      where: { id },
      data: {
        status: "aprovada",
        processId: processo.id,
      },
    });

    // Create notification for client
    await tx.notification.create({
      data: {
        type: "SOLICITACAO_APROVADA",
        title: "Solicitacao Aprovada",
        message: `Sua solicitacao de ${solicitacao.tipoServico} foi aprovada e o Processo #${processo.ordem} foi criado.`,
        userId: solicitacao.clienteId,
        processId: processo.id,
      },
    });

    return { processo, solicitacao: updatedSolicitacao };
  });

  // Send WhatsApp notification to client
  if (solicitacao.cliente?.phone) {
    const message = `*IGC SP - Certidoes*\n\nSua solicitacao de ${solicitacao.tipoServico} foi aprovada!\nProcesso #${result.processo.ordem} criado.\n\nAcompanhe pelo sistema: ${process.env.NEXT_PUBLIC_APP_URL || "https://certidoes.fly.dev"}`;
    await sendWhatsApp({ to: solicitacao.cliente.phone, text: message }).catch(() => {});
  }

  return NextResponse.json(result, { status: 201 });
}
