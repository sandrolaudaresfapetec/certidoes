import { NextResponse } from "next/server";

interface DocumentoArquivo {
  nomeArquivo: string;
  mimeType: string;
  conteudoBase64: string;
}

/** Entrega o anexo gravado em base64 como arquivo (inline: PDF/imagem abrem no navegador). */
export function respostaDocumento(doc: DocumentoArquivo): NextResponse {
  const bytes = Buffer.from(doc.conteudoBase64, "base64");
  const nome = doc.nomeArquivo.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "documento";
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename="${nome}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
