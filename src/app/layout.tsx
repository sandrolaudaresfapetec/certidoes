import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { prisma } from "@/lib/prisma";
import { getPerfilAtivo } from "@/lib/perfil-ativo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Certidoes IGC SP",
  description: "Sistema de gestao de processos e certidoes do IGC SP",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [usuarios, perfilAtivo] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    getPerfilAtivo(),
  ]);

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <Sidebar usuarios={usuarios} perfilAtivoId={perfilAtivo?.id ?? null} />
        <main className="flex-1 ml-64 bg-gray-50 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
