"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

export function MarkReadButton({ notificationIds }: { notificationIds: string[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleMarkAllRead() {
    setLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds, read: true }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleMarkAllRead}
      disabled={loading}
      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle className="h-4 w-4" />
      )}
      Marcar todas como lidas
    </button>
  );
}
