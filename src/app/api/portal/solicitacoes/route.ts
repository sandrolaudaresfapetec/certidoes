import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSolicitanteApi } from "@/lib/portal-auth";
import { criarComProtocolo } from "@/lib/protocolo";
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

/** GET /api/portal/solicitacoes — lista as solicitações do solicitante logado. */
export async function GET() {
  const sessao = await exigirSolicitanteApi();
  if ("erro" in sessao) return sessao.erro;
  const { solicitante } = sessao;

  const solicitacoes = await prisma.solicitacao.findMany({
    where: { solicitanteId: solicitante.id },
    orderBy: { createdAt: "desc" },
    include: { documentos: { select: { id: true, tipo: true, nomeArquivo: true } } },
  });

  return NextResponse.json(solicitacoes);
}

/**
 * POST /api/portal/solicitacoes
 * Cria uma nova solicitação de certidão a partir do portal.
 * tipoViaSigef=true  → imóvel selecionado entre as parcelas do SIGEF (sem documentos)
 * tipoViaSigef=false → imóvel sem registro no INCRA (exigirá planta + doc. propriedade;
 *                      dados do imóvel serão preenchidos internamente pelo funcionário)
 */
export async function POST(request: NextRequest) {
  const sessao = await exigirSolicitanteApi();
  if ("erro" in sessao) return sessao.erro;
  const { solicitante } = sessao;
  if (!solicitante.cadastroCompleto) {
    return NextResponse.json(
      { error: "Complete seu cadastro (e-mail e telefone) antes de solicitar." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const tipoViaSigef = body.tipoViaSigef !== false;

  // Rascunho (#PEND-42): guarda o que já foi respondido, sem validar nem enviar.
  if (body.rascunho === true) {
    const rascunho = await criarComProtocolo((protocolo) =>
      prisma.solicitacao.create({
        data: {
          protocolo,
          status: STATUS_SOLICITACAO.RASCUNHO,
          solicitanteId: solicitante.id,
          ...dadosDoRascunho(body, tipoViaSigef),
        },
      })
    );
    return NextResponse.json(rascunho, { status: 201 });
  }

  if (tipoViaSigef && !body.sigefCodigoImovel) {
    return NextResponse.json(
      { error: "Selecione o imóvel do SIGEF para o qual deseja a certidão." },
      { status: 400 }
    );
  }

  // O formulario CJT e revalidado no servidor: campos fora da combinacao
  // ativa sao descartados antes de persistir (Especificacao Funcional v1.0).
  const formulario = formularioDoPayload(body.cjt);
  const erroCjt = primeiroErro(validarFormulario(formulario, { exigirParcelas: tipoViaSigef }));
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

  const solicitacao = await criarComProtocolo((protocolo) =>
    prisma.solicitacao.create({
    data: {
      protocolo,
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
      solicitanteId: solicitante.id,
      ...cjt,
      cjtPoligonos: vinculo.cjtPoligonos,
    },
    })
  );

  return NextResponse.json(solicitacao, { status: 201 });
}
