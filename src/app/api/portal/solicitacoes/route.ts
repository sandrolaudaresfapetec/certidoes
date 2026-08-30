import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSolicitanteLogado } from "@/lib/portal-auth";

function gerarProtocolo(sequencial: number): string {
  const ano = new Date().getFullYear();
  return `CERT-${ano}-${String(sequencial).padStart(6, "0")}`;
}

/** GET /api/portal/solicitacoes — lista as solicitações do solicitante logado. */
export async function GET() {
  const solicitante = await getSolicitanteLogado();
  if (!solicitante) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

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
  const solicitante = await getSolicitanteLogado();
  if (!solicitante) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
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

  const total = await prisma.solicitacao.count();

  const solicitacao = await prisma.solicitacao.create({
    data: {
      protocolo: gerarProtocolo(total + 1),
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
    },
  });

  return NextResponse.json(solicitacao, { status: 201 });
}
