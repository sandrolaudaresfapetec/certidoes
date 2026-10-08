import { requireUsuario } from "@/lib/auth";
import { CertidaoDocumento } from "@/components/certidao-documento";

export const dynamic = "force-dynamic";

export default async function CertidaoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUsuario();
  const { id } = await params;
  return <CertidaoDocumento processoId={id} voltarHref={`/processos/${id}`} voltarRotulo="Voltar ao Processo" />;
}
