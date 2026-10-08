import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { podeAtender, requireUsuario } from "@/lib/auth";
import { ProcessoEdicaoForm, type UsuarioOpcao } from "@/components/processo-edicao-form";

export const dynamic = "force-dynamic";

/** Mesmo fuso de `formatDate` (tela do processo): o campo mostra o dia que o usuário vê lá. */
function paraCampoData(data: Date | null): string {
  if (!data) return "";
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`;
}

const dinheiro = (n: number | null) =>
  n == null ? "" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function EditarProcessoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireUsuario();
  const { id } = await params;

  const processo = await prisma.process.findUnique({
    where: { id },
    include: {
      tecnicoResp: { select: { id: true, name: true, role: true } },
      tecnicoConf: { select: { id: true, name: true, role: true } },
    },
  });
  if (!processo) notFound();

  const voltar = (
    <Link
      href={`/processos/${processo.id}`}
      className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
    >
      <ArrowLeft className="h-4 w-4" /> Processo #{processo.ordem}
    </Link>
  );

  // Só facilita o uso: quem autoriza a alteração é a API (exigirAtendimentoApi).
  if (!podeAtender(usuario)) {
    return (
      <div className="p-8 max-w-4xl">
        {voltar}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Editar Processo #{processo.ordem}</h1>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
          Só o Atendimento (administrador ou SDTC) pode editar os dados do processo. Seu perfil,{" "}
          <strong>{usuario.role}</strong>, não tem esta permissão.
        </p>
      </div>
    );
  }

  // Mesmas regras de atribuição da API (PAPEIS_ATRIBUICAO em api/processes/[id]/route.ts).
  const ativos = await prisma.user.findMany({
    where: { active: true, role: { in: ["TECNICO", "CONFERENTE", "ADMIN"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  // Quem já está atribuído continua na lista, mesmo que tenha ficado inelegível.
  const comAtual = (lista: UsuarioOpcao[], atual: UsuarioOpcao | null) =>
    atual && !lista.some((u) => u.id === atual.id) ? [...lista, atual] : lista;
  const tecnicos = comAtual(
    ativos.filter((u) => u.role === "TECNICO" || u.role === "ADMIN"),
    processo.tecnicoResp
  );
  const conferentes = comAtual(
    ativos.filter((u) => u.role === "CONFERENTE" || u.role === "ADMIN"),
    processo.tecnicoConf
  );

  const inicial: Record<string, string> = {
    tipoServico: processo.tipoServico,
    expediente: processo.expediente ?? "",
    dtAbertoSei: paraCampoData(processo.dtAbertoSei),
    anoEntrada: String(processo.anoEntrada),
    interessado: processo.interessado,
    tipo: processo.tipo,
    email: processo.email ?? "",
    telefone: processo.telefone ?? "",
    cpfCnpj: processo.cpfCnpj ?? "",
    dtNascimentoIdoso: paraCampoData(processo.dtNascimentoIdoso),
    municipio: processo.municipio ?? "",
    ra: processo.ra ?? "",
    dra: processo.dra ?? "",
    utm: processo.utm ?? "",
    pasta: processo.pasta ?? "",
    divisaDificuldade: processo.divisaDificuldade ?? "",
    tecnicoRespId: processo.tecnicoRespId ?? "",
    tecnicoConfId: processo.tecnicoConfId ?? "",
    quemVaiAssinar: processo.quemVaiAssinar ?? "",
    dtEmail: paraCampoData(processo.dtEmail),
    dtVisita1: paraCampoData(processo.dtVisita1),
    dtVisita2: paraCampoData(processo.dtVisita2),
    base: processo.base ?? "",
    departamento: processo.departamento ?? "",
    observacoesTecnico: processo.observacoesTecnico ?? "",
    taxaAbertura: dinheiro(processo.taxaAbertura),
    servicoTecGabinete: dinheiro(processo.servicoTecGabinete),
    taxaVistoria: dinheiro(processo.taxaVistoria),
    servicoTecCampo: dinheiro(processo.servicoTecCampo),
    nivelPrioridade: processo.nivelPrioridade ?? "",
    statusEscritorio: processo.statusEscritorio ?? "",
    numeroSaidaIGC: processo.numeroSaidaIGC ?? "",
    dtCompile: paraCampoData(processo.dtCompile),
    observacaoEntrada: processo.observacaoEntrada ?? "",
  };

  return (
    <div className="p-8">
      {voltar}
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Editar Processo #{processo.ordem}</h1>
      <p className="text-sm text-gray-600 mb-6">
        Altere os dados e salve. Só os campos que você mudar são enviados.
      </p>
      <ProcessoEdicaoForm
        processoId={processo.id}
        inicial={inicial}
        tecnicos={tecnicos}
        conferentes={conferentes}
      />
    </div>
  );
}
