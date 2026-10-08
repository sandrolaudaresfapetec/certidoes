import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSolicitanteApi } from "@/lib/portal-auth";
import { respostaDocumento } from "@/lib/documento-download";

/** GET /api/portal/documentos/[id] — conteudo de um anexo da propria requisicao (#PEND-3). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSolicitanteApi();
  if ("erro" in sessao) return sessao.erro;
  const { id } = await params;

  const documento = await prisma.documento.findFirst({
    where: { id, solicitacao: { solicitanteId: sessao.solicitante.id } },
    select: { nomeArquivo: true, mimeType: true, conteudoBase64: true },
  });
  if (!documento) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }
  return respostaDocumento(documento);
}
