import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioApi } from "@/lib/auth";
import { respostaDocumento } from "@/lib/documento-download";

/** GET /api/requisicoes/documentos/[id] — conteudo de um anexo, para qualquer servidor logado (#PEND-3). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirUsuarioApi();
  if ("erro" in sessao) return sessao.erro;
  const { id } = await params;

  const documento = await prisma.documento.findUnique({
    where: { id },
    select: { nomeArquivo: true, mimeType: true, conteudoBase64: true },
  });
  if (!documento) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }
  return respostaDocumento(documento);
}
