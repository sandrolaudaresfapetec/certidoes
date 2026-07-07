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
  ClipboardList,
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

const INTERNAL_ROLES = ["ADMIN", "GERENTE", "DIRETOR", "TECNICO", "CONFERENTE", "SDTC", "GDTAC"];

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Minhas Solicitacoes", href: "/solicitacoes", icon: ClipboardList, roles: ["CLIENTE"] },
  {
    name: "Nova Solicitacao",
    href: "/solicitacoes/nova",
    icon: PlusCircle,
    roles: ["CLIENTE"],
  },
  { name: "Processos", href: "/processos", icon: FileText, roles: INTERNAL_ROLES },
  { name: "Solicitacoes", href: "/solicitacoes", icon: ClipboardList, roles: ["ADMIN", "SDTC"] },
  { name: "Quadro", href: "/quadro", icon: Columns3, roles: INTERNAL_ROLES },
  {
    name: "Novo Processo",
    href: "/processos/novo",
    icon: PlusCircle,
    roles: ["ADMIN", "SDTC"],
  },
  { name: "Notificacoes", href: "/notificacoes", icon: Bell },
  { name: "Fluxo", href: "/fluxo", icon: GitBranch, roles: INTERNAL_ROLES },
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
    <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-50">
      {/* Header with logos */}
      <div className="px-4 py-5 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <Image
            src="/images/logoIGC.png"
            alt="IGC - Instituto Geografico e Cartografico"
            width={48}
            height={48}
          />
          <Image
            src="/images/logoSP.png"
            alt="Governo SP"
            width={36}
            height={36}
          />
        </div>
        <h1 className="text-sm font-bold text-gray-800 leading-tight">
          Sistema de Certidoes
        </h1>
        <p className="text-[11px] text-gray-500 mt-0.5">
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
                  ? "bg-gray-100 text-gray-900 border-l-3 border-gray-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-sm font-bold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">
                {user.name}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {ROLE_LABELS[user.role] || user.role}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm transition-colors w-full px-1"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-[10px] text-gray-400 text-center">
          Governo do Estado de Sao Paulo
        </p>
      </div>
    </div>
  );
}
