import Link from "next/link";
import { getSolicitanteLogado } from "@/lib/portal-auth";
import { LogoutButton } from "@/components/portal-logout";

export const metadata = {
  title: "Portal do Solicitante — Certidões",
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const solicitante = await getSolicitanteLogado();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-800 text-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/portal" className="flex items-center gap-2 font-semibold">
            <span className="bg-white text-emerald-800 rounded px-2 py-0.5 text-xs font-bold">
              gov.br
            </span>
            Portal de Certidões
          </Link>
          {solicitante && (
            <div className="flex items-center gap-4 text-sm">
              <span className="hidden sm:inline opacity-90">
                {solicitante.nome}
              </span>
              <LogoutButton />
            </div>
          )}
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      <footer className="text-center text-xs text-gray-400 pb-8">
        Serviço de emissão de certidões — identidade validada pela plataforma gov.br
      </footer>
    </div>
  );
}
