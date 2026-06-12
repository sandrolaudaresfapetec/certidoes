"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Columns3,
  Bell,
  PlusCircle,
  Users,
  Settings,
  GitBranch,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Processos", href: "/processos", icon: FileText },
  { name: "Quadro", href: "/quadro", icon: Columns3 },
  { name: "Novo Processo", href: "/processos/novo", icon: PlusCircle },
  { name: "Notificacoes", href: "/notificacoes", icon: Bell },
  { name: "Usuarios", href: "/usuarios", icon: Users },
  { name: "Configuracoes", href: "/configuracoes", icon: Settings },
  { name: "Fluxo", href: "/fluxo", icon: GitBranch },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <Image
            src="/images/logo-igc.jpg"
            alt="IGC - Instituto Geografico e Cartografico"
            width={48}
            height={48}
            className="object-contain"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">IGC SP</h1>
            <p className="text-[10px] text-gray-500 leading-tight">Instituto Geografico e Cartografico</p>
          </div>
        </div>
        <div className="flex items-center justify-center pt-2 border-t border-gray-100">
          <Image
            src="/images/logo-gov-sp.png"
            alt="Governo do Estado de Sao Paulo"
            width={120}
            height={24}
            className="object-contain"
          />
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1">Sistema de Certidoes</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            A
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Admin</p>
            <p className="text-xs text-gray-500">admin@igc.sp.gov.br</p>
          </div>
        </div>
      </div>
    </div>
  );
}
