import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAtendimentoApi } from "@/lib/auth";
import {
  formularioDoPayload,
  normalizarParaPersistencia,
  primeiroErro,
  validarFormulario,
} from "@/lib/cjt-formulario";

function gerarProtocolo(sequencial: number): string {
  const ano = new Date().getFullYear();
  return `CERT-${ano}-${String(sequencial).padStart(6, "0")}`;
}

/**
 * POST /api/requisicoes — abertura de requisição pelo Atendimento, em nome de
 * um cliente já cadastrado. Mesmo formulário CJT do portal, com origem
 * ATENDIMENTO e registro do atendente responsável.
 */
export async function POST(request: NextRequest) {
  const sessao = await exigirAtendimentoApi();
  if ("erro" in sessao) return sessao.erro;

  const body = await request.json().catch(() => ({}));
  const solicitanteId = (body.solicitanteId ?? "").toString();
  const solicitante = await prisma.solicitante.findUnique({ where: { id: solicitanteId } });
  if (!solicitante) {
    return NextResponse.json({ error: "Selecione o cliente." }, { status: 400 });
  }

  const tipoViaSigef = body.tipoViaSigef !== false;
  if (tipoViaSigef && !body.sigefCodigoImovel) {
    return NextResponse.json(
      { error: "Selecione o imóvel do SIGEF para o qual deseja a certidão." },
      { status: 400 }
    );
  }

  const formulario = formularioDoPayload(body.cjt);
  const erroCjt = primeiroErro(validarFormulario(formulario));
  if (erroCjt) {
    return NextResponse.json({ error: erroCjt }, { status: 400 });
  }
  const cjt = normalizarParaPersistencia(formulario);

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
      emNomeDeCpf: (body.emNomeDeCpf ?? "").toString().replace(/\D/g, "") || null,
      emNomeDeNome: (body.emNomeDeNome ?? "").toString().trim() || null,
      observacao: (body.observacao ?? "").toString() || null,
      solicitanteId: solicitante.id,
      origem: "ATENDIMENTO",
      abertaPorUserId: sessao.usuario.id,
      ...cjt,
    },
  });

  return NextResponse.json(solicitacao, { status: 201 });
}
