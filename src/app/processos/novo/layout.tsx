import { redirect } from "next/navigation";
import { podeAtender, requireUsuario } from "@/lib/auth";

export default async function NovoProcessoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireUsuario();
  if (!podeAtender(usuario)) redirect("/processos");
  return children;
}
