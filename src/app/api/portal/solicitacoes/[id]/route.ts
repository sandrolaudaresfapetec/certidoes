import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSolicitanteApi } from "@/lib/portal-auth";
import { clientePodeEditar } from "@/lib/solicitacao-estados";
import { mensagemDeSistema } from "@/lib/chat";
import { dadosDoRascunho } from "@/lib/solicitacao-rascunho";
import { resolverPoligonos } from "@/lib/poligonos-parcelas-servidor";
import { STATUS_SOLICITACAO } from "@/lib/solicitacao-estados";
import {
  formularioDoPayload,
  normalizarParaPersistencia,
  primeiroErro,
  validarFormulario,
  validarRepresentacao,
} from "@/lib/cjt-formulario";

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
  const sessao = await exigirSolicitanteApi();
  if ("erro" in sessao) return sessao.erro;
  const { solicitante } = sessao;

  const atual = await prisma.solicitacao.findFirst({
    where: { id, solicitanteId: solicitante.id },
  });
  if (!atual) {
    return NextResponse.json({ error: "Requisição não encontrada." }, { status: 404 });
  }
  if (!clientePodeEditar(atual)) {
    return NextResponse.json(
      { error: "Esta requisição já está em andamento e não pode mais ser alterada." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const tipoViaSigef = body.tipoViaSigef !== undefined ? body.tipoViaSigef !== false : atual.tipoViaSigef;

  // Salvar rascunho (#PEND-42): só rascunho, sem validar e sem enviar.
  if (body.rascunho === true) {
    if (atual.status !== STATUS_SOLICITACAO.RASCUNHO) {
      return NextResponse.json(
        { error: "Só uma requisição ainda não enviada pode ser salva como rascunho." },
        { status: 409 }
      );
    }
    const salvo = await prisma.solicitacao.update({
      where: { id },
      data: dadosDoRascunho(body, tipoViaSigef),
    });
    return NextResponse.json(salvo);
  }

  if (tipoViaSigef && !body.sigefCodigoImovel) {
    return NextResponse.json(
      { error: "Selecione o imóvel do SIGEF para o qual deseja a certidão." },
      { status: 400 }
    );
  }

  const formulario = formularioDoPayload(body.cjt);
  // Pedido liberado pela DDD pode passar de 12 polígonos (#PEND-31).
  const erroCjt = primeiroErro(
    validarFormulario(formulario, { liberado: Boolean(atual.liberadaEm), exigirParcelas: tipoViaSigef })
  );
  if (erroCjt) {
    return NextResponse.json({ error: erroCjt }, { status: 400 });
  }
  const cjt = normalizarParaPersistencia(formulario);

  // Gleba com 2+ polígonos: cada polígono liga a uma parcela do SIGEF do solicitante (#PEND-34).
  const vinculo = await resolverPoligonos({
    cpf: solicitante.cpf,
    formulario,
    tipoViaSigef,
    parcelaPrincipal: body.sigefParcelaCodigo,
  });
  if (!vinculo.ok) return NextResponse.json({ error: vinculo.erro }, { status: 400 });

  // Representante informa CPF/CNPJ válido e nome de quem representa (#PEND-44).
  const representacao = validarRepresentacao({
    qualidade: formulario.qualidade,
    emNomeDeCpf: body.emNomeDeCpf,
    emNomeDeNome: body.emNomeDeNome,
  });
  if (!representacao.ok) {
    return NextResponse.json({ error: representacao.erro }, { status: 400 });
  }
  const emNomeDeCpf = representacao.cpf;
  const emNomeDeNome = representacao.nome;

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
      // Os dados mudaram: a análise de duplicidade recomeça (#PEND-30).
      analiseDuplicidadeEm: null,
      sobreposicao: false,
      sobreposicaoCom: null,
      ...cjt,
      cjtPoligonos: vinculo.cjtPoligonos,
    },
  });

  // Aviso no chat só quando é uma devolvida corrigida (rascunho enviado não tem conversa ainda).
  if (atual.status === STATUS_SOLICITACAO.DEVOLVIDA) {
    await mensagemDeSistema({
      solicitacaoId: solicitacao.id,
      texto: "O solicitante reenviou a requisição corrigida.",
      chave: `REENVIO:${Date.now()}`,
      tipo: "EVENTO",
    });
  }

  return NextResponse.json(solicitacao);
}
