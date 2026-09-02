import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSolicitanteLogado } from "@/lib/portal-auth";
import {
  formularioDoPayload,
  normalizarParaPersistencia,
  primeiroErro,
  validarFormulario,
} from "@/lib/cjt-formulario";

/**
 * Situações em que o solicitante ainda pode alterar a própria requisição.
 * Depois da abertura do processo os dados alimentam a análise técnica e só o
 * backoffice altera; a devolução existe justamente para o cliente corrigir.
 */
const STATUS_EDITAVEIS = ["PENDENTE", "DEVOLVIDA"];

/**
 * PATCH /api/portal/solicitacoes/[id]
 *
 * Altera uma requisição do próprio solicitante. Aceita apenas os dados que o
 * cliente informa (imóvel do SIGEF, representação, observação e formulário
 * CJT); status, processo, pagamento, finalização e atribuições internas são
 * ignorados mesmo que venham no corpo.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const solicitante = await getSolicitanteLogado();
  if (!solicitante) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const atual = await prisma.solicitacao.findFirst({
    where: { id, solicitanteId: solicitante.id },
  });
  if (!atual) {
    return NextResponse.json({ error: "Requisição não encontrada." }, { status: 404 });
  }
  if (atual.processId || atual.finalizadaEm || !STATUS_EDITAVEIS.includes(atual.status)) {
    return NextResponse.json(
      { error: "Esta requisição já está em andamento e não pode mais ser alterada." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const tipoViaSigef = body.tipoViaSigef !== undefined ? body.tipoViaSigef !== false : atual.tipoViaSigef;

  if (tipoViaSigef && !body.sigefCodigoImovel) {
    return NextResponse.json(
      { error: "Selecione o imóvel do SIGEF para o qual deseja a certidão." },
      { status: 400 }
    );
  }

  const emNomeDeCpf = (body.emNomeDeCpf ?? "").toString().replace(/\D/g, "") || null;
  const emNomeDeNome = (body.emNomeDeNome ?? "").toString().trim() || null;
  if (emNomeDeCpf && !emNomeDeNome) {
    return NextResponse.json(
      { error: "Informe o nome do proprietário representado." },
      { status: 400 }
    );
  }

  const formulario = formularioDoPayload(body.cjt);
  const erroCjt = primeiroErro(validarFormulario(formulario));
  if (erroCjt) {
    return NextResponse.json({ error: erroCjt }, { status: 400 });
  }
  const cjt = normalizarParaPersistencia(formulario);

  const solicitacao = await prisma.solicitacao.update({
    where: { id: atual.id },
    data: {
      tipoViaSigef,
      sigefCodigoImovel: tipoViaSigef ? body.sigefCodigoImovel : null,
      sigefParcelaCodigo: tipoViaSigef ? body.sigefParcelaCodigo : null,
      sigefNomeArea: tipoViaSigef ? body.sigefNomeArea || null : null,
      sigefAreaHectares:
        tipoViaSigef && body.sigefAreaHectares != null
          ? parseFloat(body.sigefAreaHectares)
          : null,
      sigefMunicipio: tipoViaSigef ? body.sigefMunicipio || null : null,
      sigefUf: tipoViaSigef ? body.sigefUf || null : null,
      sigefStatus: tipoViaSigef ? body.sigefStatus || null : null,
      sigefOrigem: tipoViaSigef ? body.sigefOrigem || null : null,
      emNomeDeCpf,
      emNomeDeNome,
      observacao: (body.observacao ?? "").toString() || null,
      // Requisição devolvida volta à fila de atendimento depois da correção.
      status: "PENDENTE",
      ...cjt,
    },
  });

  return NextResponse.json(solicitacao);
}
