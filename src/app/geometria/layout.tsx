import { requireGeometria } from "@/lib/auth";

export default async function GeometriaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireGeometria();
  return children;
}
