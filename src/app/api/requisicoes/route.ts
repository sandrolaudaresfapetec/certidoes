import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAtendimentoApi } from "@/lib/auth";
import { criarComProtocolo } from "@/lib/protocolo";
import { resolverPoligonos } from "@/lib/poligonos-parcelas-servidor";
import {
  formularioDoPayload,
  normalizarParaPersistencia,
  primeiroErro,
  validarFormulario,
  validarRepresentacao,
} from "@/lib/cjt-formulario";

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
  // O atendimento é a própria DDD: não tem o limite de 12 polígonos (#PEND-31).
  const erroCjt = primeiroErro(validarFormulario(formulario, { liberado: true, exigirParcelas: tipoViaSigef }));
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
      emNomeDeCpf: representacao.cpf,
      emNomeDeNome: representacao.nome,
      observacao: (body.observacao ?? "").toString() || null,
      solicitanteId: solicitante.id,
      origem: "ATENDIMENTO",
      abertaPorUserId: sessao.usuario.id,
      ...cjt,
      cjtPoligonos: vinculo.cjtPoligonos,
    },
    })
  );

  return NextResponse.json(solicitacao, { status: 201 });
}
