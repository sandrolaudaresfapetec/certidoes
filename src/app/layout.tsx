import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { FeedbackWidget } from "@/components/feedback-widget";
import { getUsuarioLogado } from "@/lib/auth";

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
  const usuario = await getUsuarioLogado();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <FeedbackWidget
          projectId={process.env.NEXT_PUBLIC_FASTERFIXES_PROJECT_ID}
          apiOrigin={process.env.NEXT_PUBLIC_FASTERFIXES_API_ORIGIN}
        >
          {usuario && (
            <Sidebar
              usuario={{
                name: usuario.name,
                email: usuario.email,
                role: usuario.role,
              }}
            />
          )}
          <main
            className={`flex-1 bg-gray-50 min-h-screen ${usuario ? "ml-64" : ""}`}
          >
            {children}
          </main>
        </FeedbackWidget>
      </body>
    </html>
  );
}
