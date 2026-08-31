import { requireUsuario } from "@/lib/auth";

export default async function GeometriaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUsuario();
  return children;
}
