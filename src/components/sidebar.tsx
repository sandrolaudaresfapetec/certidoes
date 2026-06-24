"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import {
  LayoutDashboard,
  FileText,
  Columns3,
  Bell,
  PlusCircle,
  Users,
  Settings,
  LogOut,
  GitBranch,
  MapPin,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  DIRETOR: "Diretor",
  TECNICO: "Tecnico",
  CONFERENTE: "Conferente",
  SDTC: "SDTC",
  GDTAC: "GDTAC",
  CLIENTE: "Cliente",
};

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Processos", href: "/processos", icon: FileText },
  { name: "Quadro", href: "/quadro", icon: Columns3 },
  {
    name: "Novo Processo",
    href: "/processos/novo",
    icon: PlusCircle,
    roles: ["ADMIN", "SDTC"],
  },
  { name: "Notificacoes", href: "/notificacoes", icon: Bell },
  { name: "Fluxo", href: "/fluxo", icon: GitBranch },
  { name: "SIGEF", href: "/sigef", icon: MapPin, roles: ["ADMIN", "SDTC", "GDTAC", "TECNICO", "GERENTE", "DIRETOR"] },
  {
    name: "Usuarios",
    href: "/usuarios",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    name: "Configuracoes",
    href: "/configuracoes",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visibleNav = navigation.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-[#071D41] flex flex-col z-50">
      {/* Header with logos */}
      <div className="px-4 py-5 border-b border-[#1351B4]/30">
        <div className="flex items-center gap-3 mb-3">
          <Image
            src="/images/logoSP.png"
            alt="Governo SP"
            width={40}
            height={40}
            className="rounded bg-white p-0.5"
          />
          <Image
            src="/images/igc-logo.png"
            alt="IGC SP"
            width={40}
            height={40}
            className="rounded bg-white p-0.5"
          />
        </div>
        <h1 className="text-base font-bold text-white leading-tight">
          Sistema de Certidoes
        </h1>
        <p className="text-[11px] text-blue-300 mt-0.5">
          IGC - Instituto Geografico e Cartografico
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#1351B4] text-white"
                  : "text-blue-200 hover:bg-[#1351B4]/40 hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      {user && (
        <div className="p-4 border-t border-[#1351B4]/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#1351B4] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {user.name}
              </p>
              <p className="text-[11px] text-blue-300 truncate">
                {ROLE_LABELS[user.role] || user.role}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-blue-300 hover:text-white text-sm transition-colors w-full px-1"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#1351B4]/30">
        <p className="text-[10px] text-blue-400 text-center">
          Governo do Estado de Sao Paulo
        </p>
        <p className="text-[10px] text-blue-500 text-center">
          SEMIL - Sec. Meio Ambiente
        </p>
      </div>
    </div>
  );
}
