import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSolicitanteApi } from "@/lib/portal-auth";
import { criarComProtocolo } from "@/lib/protocolo";
import {
  formularioDoPayload,
  normalizarParaPersistencia,
  primeiroErro,
  validarFormulario,
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

  // O formulario CJT e revalidado no servidor: campos fora da combinacao
  // ativa sao descartados antes de persistir (Especificacao Funcional v1.0).
  const formulario = formularioDoPayload(body.cjt);
  const erroCjt = primeiroErro(validarFormulario(formulario));
  if (erroCjt) {
    return NextResponse.json({ error: erroCjt }, { status: 400 });
  }
  const cjt = normalizarParaPersistencia(formulario);

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
    },
    })
  );

  return NextResponse.json(solicitacao, { status: 201 });
}
