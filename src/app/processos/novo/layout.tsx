import { requireUsuario } from "@/lib/auth";

export default async function NovoProcessoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUsuario();
  return children;
}
