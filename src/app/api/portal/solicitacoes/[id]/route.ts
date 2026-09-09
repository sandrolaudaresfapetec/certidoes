import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSolicitanteLogado } from "@/lib/portal-auth";
import {
  formularioDoPayload,
  normalizarParaPersistencia,
  primeiroErro,
  validarFormulario,
} from "@/lib/cjt-formulario";
import { IMOVEL_SIGEF_VAZIO, resolverImovelSigef } from "@/lib/sigef-imovel";
import { STATUS_EDITAVEIS } from "@/lib/solicitacao-status";

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
  const imovel = tipoViaSigef
    ? await resolverImovelSigef(body, solicitante.cpf)
    : IMOVEL_SIGEF_VAZIO;
  if (!imovel) {
    return NextResponse.json(
      { error: "Imóvel do SIGEF não encontrado para o seu CPF/CNPJ. Refaça a consulta e selecione o imóvel na lista." },
      { status: 400 }
    );
  }

  // A condição de editabilidade vai no próprio UPDATE: se a Abertura de
  // Processo vencer a corrida entre a leitura acima e a gravação, nenhuma linha
  // é alterada e o cliente recebe 409 em vez de sobrescrever dados já em análise.
  const solicitacao = await prisma.$transaction(async (tx) => {
    const alterados = await tx.solicitacao.updateMany({
      where: {
        id: atual.id,
        solicitanteId: solicitante.id,
        processId: null,
        finalizadaEm: null,
        status: { in: STATUS_EDITAVEIS },
      },
      data: {
        tipoViaSigef,
        ...imovel,
        emNomeDeCpf,
        emNomeDeNome,
        observacao: (body.observacao ?? "").toString() || null,
        // Requisição devolvida volta à fila de atendimento depois da correção.
        status: "PENDENTE",
        ...cjt,
      },
    });
    if (alterados.count === 0) return null;

    // Sem representação a procuração anexada deixa de valer para a análise.
    if (!emNomeDeCpf) {
      await tx.documento.deleteMany({
        where: { solicitacaoId: atual.id, tipo: "PROCURACAO" },
      });
    }

    return tx.solicitacao.findUnique({ where: { id: atual.id } });
  });

  if (!solicitacao) {
    return NextResponse.json(
      { error: "Esta requisição já está em andamento e não pode mais ser alterada." },
      { status: 409 }
    );
  }

  return NextResponse.json(solicitacao);
}
