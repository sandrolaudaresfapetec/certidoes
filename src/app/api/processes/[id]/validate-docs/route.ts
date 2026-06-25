import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Nao autenticado" }, { status: 401 });
  }

  if (!["ADMIN", "SDTC"].includes(session.role)) {
    return Response.json(
      { error: "Apenas SDTC pode validar documentos" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await request.json();

  const processo = await prisma.process.findUnique({
    where: { id },
  });

  if (!processo) {
    return Response.json(
      { error: "Processo nao encontrado" },
      { status: 404 }
    );
  }

  const docs = {
    docRequerimento: Boolean(body.docRequerimento),
    docIdentidade: Boolean(body.docIdentidade),
    docProcuracao: Boolean(body.docProcuracao),
    docComprovante: Boolean(body.docComprovante),
    docPlanta: Boolean(body.docPlanta),
    docMatricula: Boolean(body.docMatricula),
    docArt: Boolean(body.docArt),
    obsDocumentos: body.obsDocumentos || null,
  };

  const allChecked =
    docs.docRequerimento &&
    docs.docIdentidade &&
    docs.docComprovante &&
    docs.docPlanta &&
    docs.docMatricula;

  const updated = await prisma.process.update({
    where: { id },
    data: {
      ...docs,
      docsValidados: allChecked,
    },
  });

  return Response.json({
    docsValidados: updated.docsValidados,
    message: allChecked
      ? "Documentos validados com sucesso"
      : "Documentacao incompleta. Verifique os itens obrigatorios.",
  });
}
