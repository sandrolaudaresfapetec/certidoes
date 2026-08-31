import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAtendimentoApi } from "@/lib/auth";

const TIPOS_VALIDOS = ["PLANTA", "DOC_PROPRIEDADE", "PROCURACAO"];
const MIME_VALIDOS = ["application/pdf", "image/jpeg", "image/png"];
const TAMANHO_MAX = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/requisicoes/documentos (multipart/form-data)
 * Anexa documentos a uma requisição aberta pelo Atendimento.
 */
export async function POST(request: NextRequest) {
  const sessao = await exigirAtendimentoApi();
  if ("erro" in sessao) return sessao.erro;

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formulário inválido." }, { status: 400 });
  }

  const solicitacaoId = (form.get("solicitacaoId") ?? "").toString();
  const tipo = (form.get("tipo") ?? "").toString();
  const arquivo = form.get("arquivo");

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
  }
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return NextResponse.json({ error: "Anexe o arquivo." }, { status: 400 });
  }
  if (arquivo.size > TAMANHO_MAX) {
    return NextResponse.json({ error: "Arquivo excede o limite de 10 MB." }, { status: 400 });
  }
  if (!MIME_VALIDOS.includes(arquivo.type)) {
    return NextResponse.json(
      { error: "Formato não aceito. Envie PDF, JPG ou PNG." },
      { status: 400 }
    );
  }

  const solicitacao = await prisma.solicitacao.findUnique({ where: { id: solicitacaoId } });
  if (!solicitacao) {
    return NextResponse.json({ error: "Requisição não encontrada." }, { status: 404 });
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());

  const documento = await prisma.documento.create({
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

  return NextResponse.json(documento, { status: 201 });
}
