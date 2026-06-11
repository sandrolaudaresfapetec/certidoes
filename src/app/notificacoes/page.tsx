import { prisma } from "@/lib/prisma";

import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { Bell, CheckCircle, Clock, FileText, UserCheck, AlertTriangle } from "lucide-react";
import { MarkReadButton } from "@/components/mark-read-button";

export const dynamic = "force-dynamic";

const typeIcons: Record<string, React.ReactNode> = {
  NOVA_ENTRADA: <FileText className="h-5 w-5 text-blue-500" />,
  ATRIBUICAO: <UserCheck className="h-5 w-5 text-indigo-500" />,
  ANALISE_COMPLETA: <CheckCircle className="h-5 w-5 text-green-500" />,
  CONFERENCIA_COMPLETA: <CheckCircle className="h-5 w-5 text-orange-500" />,
  ASSINATURA_PENDENTE: <Clock className="h-5 w-5 text-purple-500" />,
  PROCESSO_CONCLUIDO: <CheckCircle className="h-5 w-5 text-emerald-500" />,
  PRAZO_VENCIDO: <AlertTriangle className="h-5 w-5 text-red-500" />,
  TRANSICAO: <Bell className="h-5 w-5 text-gray-500" />,
};

export default async function NotificacoesPage() {
  const notifications = await prisma.notification.findMany({
    include: {
      process: {
        select: {
          id: true,
          ordem: true,
          expediente: true,
          interessado: true,
          situacao: true,
        },
      },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notificacoes
          </h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} nao lida${unreadCount > 1 ? "s" : ""}`
              : "Todas lidas"}
          </p>
        </div>
        {unreadCount > 0 && (
          <MarkReadButton
            notificationIds={notifications.filter((n) => !n.read).map((n) => n.id)}
          />
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((notif) => {
          const icon = typeIcons[notif.type] || <Bell className="h-5 w-5 text-gray-400" />;
          return (
            <div
              key={notif.id}
              className={`bg-white rounded-lg border p-4 flex items-start gap-4 ${
                notif.read
                  ? "border-gray-200"
                  : "border-blue-200 bg-blue-50/30"
              }`}
            >
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-medium ${notif.read ? "text-gray-700" : "text-gray-900"}`}>
                    {notif.title}
                  </h3>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{notif.message}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-gray-400">
                    {formatDateTime(notif.createdAt)}
                  </span>
                  <span className="text-xs text-gray-400">
                    Para: {notif.user.name}
                  </span>
                  {notif.process && (
                    <Link
                      href={`/processos/${notif.process.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver processo #{notif.process.ordem}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {notifications.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p>Nenhuma notificacao</p>
          </div>
        )}
      </div>
    </div>
  );
}
