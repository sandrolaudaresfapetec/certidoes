import Link from "next/link";
import { PlusCircle, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatarCPF } from "@/lib/cpf";
import { statusRequisicao } from "@/lib/requisicao-status";
import { RequisicaoFiltros } from "@/components/requisicao-filtros";
import { requireUsuario, podeAtender } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { naoLidasPorSolicitacao } from "@/lib/chat";
import { SeloMensagensNovas } from "@/components/requisicao/selo-mensagens-novas";
import { SeloSobreposicao } from "@/components/requisicao/avisos-duplicidade";
import { CartoesSituacaoAtendimento } from "@/components/requisicao/cartoes-situacao-atendimento";
import {
  GRUPOS_ATENDIMENTO,
  chaveDoGrupoPelosParametros,
  grupoAtendimento,
} from "@/lib/requisicao-grupos-atendimento";
import { PainelDuplicidade } from "@/components/painel-duplicidade";
import { descreverResumo } from "@/lib/duplicidade-resumo";
import { idsComSobreposicao } from "@/lib/duplicidade-servidor";
import { proximoHorario, ultimaExecucao } from "@/lib/agendador";

export const dynamic = "force-dynamic";

export default async function RequisicoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    grupo?: string;
    semProcesso?: string;
    analise?: string;
  }>;
}) {
  const { q = "", status = "", grupo = "", semProcesso = "", analise = "" } = await searchParams;
  const usuario = await requireUsuario();
  const atendimento = podeAtender(usuario);

  // Rascunho é só do solicitante: o atendimento só o vê depois de congelado (13+ polígonos).
  const visiveis: Prisma.SolicitacaoWhereInput = {
    NOT: { status: "RASCUNHO", congeladaEm: null },
  };
  const chaveGrupo = chaveDoGrupoPelosParametros({ grupo, semProcesso, analise });
  const grupoAtivo = grupoAtendimento(chaveGrupo);
  const condicoes: Prisma.SolicitacaoWhereInput[] = [visiveis];
  if (status) condicoes.push({ status });
  if (grupoAtivo) condicoes.push(grupoAtivo.filtro);
  if (q) {
    condicoes.push({
      OR: [
        { protocolo: { contains: q } },
        { sigefNomeArea: { contains: q } },
        { sigefMunicipio: { contains: q } },
        { solicitante: { nome: { contains: q } } },
        { solicitante: { cpf: { contains: q.replace(/\D/g, "") || q } } },
      ],
    });
  }
  const where: Prisma.SolicitacaoWhereInput = { AND: condicoes };

  // Contagem de cada cartão (sobre tudo o que o atendimento enxerga, sem a busca).
  const contagensGrupos = await Promise.all(
    GRUPOS_ATENDIMENTO.map(async (g) => [g.chave, await prisma.solicitacao.count({ where: { AND: [visiveis, g.filtro] } })] as const)
  );
  const contagens: Record<string, number> = Object.fromEntries(contagensGrupos);

  const requisicoes = await prisma.solicitacao.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      solicitante: { select: { nome: true, cpf: true } },
      process: { select: { id: true, ordem: true } },
    },
  });
  const comSobreposicao = await idsComSobreposicao();
  const aguardandoAnalise = contagens["analise-duplicidade"] ?? 0;
  const ultima = usuario.role === "ADMIN" ? await ultimaExecucao() : null;
  const formatoQuando = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
  const proximo = proximoHorario(new Date());
  // Selo de mensagens novas só para quem pode abrir o chat (ADMIN e SDTC).
  const novas = atendimento
    ? await naoLidasPorSolicitacao(requisicoes, "ATENDIMENTO")
    : new Map<string, number>();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requisições</h1>
          <p className="text-sm text-gray-500">
            Requisições de certidão recebidas pelo portal e pelo atendimento.
          </p>
        </div>
        {atendimento && (
          <Link
            href="/requisicoes/nova"
            className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-emerald-800"
          >
            <PlusCircle className="h-4 w-4" />
            Nova Requisição
          </Link>
        )}
      </div>

      {usuario.role === "ADMIN" && (
        <PainelDuplicidade
          ultima={
            ultima?.concluidaEm
              ? {
                  quando: formatoQuando.format(ultima.concluidaEm),
                  resumo: ultima.resumo ? descreverResumo(ultima.resumo) : "sem detalhes",
                }
              : null
          }
          proxima={`${proximo.quando} às ${proximo.hora}`}
          aguardandoInicial={aguardandoAnalise}
        />
      )}

      <CartoesSituacaoAtendimento
        contagens={contagens}
        ativo={grupoAtivo?.chave ?? ""}
        q={q}
        status={status}
      />

      <RequisicaoFiltros
        action="/requisicoes"
        q={q}
        status={status}
        grupo={grupoAtivo?.chave}
        placeholder="Buscar por protocolo, cliente, CPF ou município"
        ocultarStatus={["RASCUNHO"]}
      />

      {grupoAtivo && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-gray-700">
            Mostrando: <strong className="font-semibold text-gray-900">{grupoAtivo.rotulo}</strong>
          </p>
          <Link
            href={q || status ? `/requisicoes?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}) })}` : "/requisicoes"}
            className="text-xs text-emerald-700 hover:underline"
          >
            Limpar filtro
          </Link>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg">
        {requisicoes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">
            Nenhuma requisição encontrada.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {requisicoes.map((r) => {
              const st = statusRequisicao(r.status);
              return (
                <li key={r.id}>
                  <Link
                    href={`/requisicoes/${r.id}`}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {r.protocolo} — {r.solicitante.nome}
                        </p>
                        <p className="text-xs text-gray-500">
                          CPF {formatarCPF(r.solicitante.cpf)} ·{" "}
                          {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                          {r.sigefMunicipio && ` · ${r.sigefMunicipio}/${r.sigefUf}`}
                          {r.process
                            ? ` · processo #${r.process.ordem}`
                            : " · sem processo aberto"}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      {comSobreposicao.has(r.id) && <SeloSobreposicao />}
                      {novas.has(r.id) && <SeloMensagensNovas quantidade={novas.get(r.id)!} />}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.classe}`}>
                        {st.label}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
