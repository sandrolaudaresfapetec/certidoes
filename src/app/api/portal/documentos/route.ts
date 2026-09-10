import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSolicitanteLogado } from "@/lib/portal-auth";
import { STATUS_EDITAVEIS } from "@/lib/solicitacao-status";

const TIPOS_VALIDOS = ["PLANTA", "DOC_PROPRIEDADE", "PROCURACAO"];
const MIME_VALIDOS = ["application/pdf", "image/jpeg", "image/png"];
const TAMANHO_MAX = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/portal/documentos (multipart/form-data)
 * Campos: solicitacaoId, tipo (PLANTA | DOC_PROPRIEDADE | PROCURACAO), arquivo
 * Documentos só são exigidos quando o imóvel não está no SIGEF (planta +
 * comprovante de propriedade) ou quando o solicitante é procurador (procuração).
 * Enviar de novo um tipo já anexado substitui o arquivo anterior, e só é
 * possível enquanto a requisição não entrou em análise.
 */
export async function POST(request: NextRequest) {
  const solicitante = await getSolicitanteLogado();
  if (!solicitante) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formulário inválido." }, { status: 400 });
  }

  const solicitacaoId = (form.get("solicitacaoId") ?? "").toString();
  const tipo = (form.get("tipo") ?? "").toString();
  const arquivo = form.get("arquivo");

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json(
      { error: "Tipo de documento inválido." },
      { status: 400 }
    );
  }
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return NextResponse.json({ error: "Anexe o arquivo." }, { status: 400 });
  }
  if (arquivo.size > TAMANHO_MAX) {
    return NextResponse.json(
      { error: "Arquivo excede o limite de 10 MB." },
      { status: 400 }
    );
  }
  if (!MIME_VALIDOS.includes(arquivo.type)) {
    return NextResponse.json(
      { error: "Formato não aceito. Envie PDF, JPG ou PNG." },
      { status: 400 }
    );
  }

  const solicitacao = await prisma.solicitacao.findFirst({
    where: { id: solicitacaoId, solicitanteId: solicitante.id },
  });
  if (!solicitacao) {
    return NextResponse.json(
      { error: "Solicitação não encontrada." },
      { status: 404 }
    );
  }
  if (
    solicitacao.processId ||
    solicitacao.finalizadaEm ||
    !STATUS_EDITAVEIS.includes(solicitacao.status)
  ) {
    return NextResponse.json(
      { error: "Esta requisição já está em andamento e não aceita novos documentos." },
      { status: 409 }
    );
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());

  const documento = await prisma.$transaction(async (tx) => {
    // Substituição: o funcionário deve ver apenas o arquivo vigente de cada tipo.
    await tx.documento.deleteMany({ where: { solicitacaoId: solicitacao.id, tipo } });
    return tx.documento.create({
      data: {
        tipo,
        nomeArquivo: arquivo.name,
        mimeType: arquivo.type,
        tamanhoBytes: arquivo.size,
        conteudoBase64: buffer.toString("base64"),
        solicitacaoId: solicitacao.id,
      },
      select: { id: true, tipo: true, nomeArquivo: true, tamanhoBytes: true },
    });
  });

  return NextResponse.json(documento, { status: 201 });
}
