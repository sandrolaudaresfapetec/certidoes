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

  // O formulario CJT e revalidado no servidor: campos fora da combinacao
  // ativa sao descartados antes de persistir (Especificacao Funcional v1.0).
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

  const total = await prisma.solicitacao.count();

  const solicitacao = await prisma.solicitacao.create({
    data: {
      protocolo: gerarProtocolo(total + 1),
      tipoViaSigef,
      ...imovel,
      emNomeDeCpf,
      emNomeDeNome,
      observacao: (body.observacao ?? "").toString() || null,
      solicitanteId: solicitante.id,
      ...cjt,
    },
  });

  return NextResponse.json(solicitacao, { status: 201 });
}
