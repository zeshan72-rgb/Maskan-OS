"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/features/notifications/actions";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const TONE: Record<string, string> = {
  rent_overdue: "bg-red-500",
  cheque_bounced: "bg-red-500",
  payment_rejected: "bg-red-500",
  rent_upcoming: "bg-amber-500",
  cheque_due: "bg-amber-500",
  lease_expiring: "bg-amber-500",
  payment_confirmed: "bg-emerald-500",
  renewal_offer: "bg-sky-500",
  work_assigned: "bg-sky-500",
};

export function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const unread = notifications.filter((n) => !n.is_read).length;

  function openNotification(notification: NotificationItem) {
    startTransition(async () => {
      if (!notification.is_read) await markNotificationReadAction(notification.id);
      setOpen(false);
      if (notification.link) router.push(notification.link);
      else router.refresh();
    });
  }

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <Button
        size="icon"
        variant="ghost"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold tabular-nums text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          {/* Click-away layer so the panel closes without trapping focus. */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />

          <div className="absolute right-0 z-50 mt-2 w-80 animate-[scale-in_0.16s_cubic-bezier(0.22,1,0.36,1)] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <p className="text-sm font-medium text-neutral-900">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={markAll}
                  className="flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-neutral-900"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-neutral-500">
                  Nothing new. Rent reminders, cheque alerts and maintenance updates land here.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {notifications.map((notification) => (
                    <li key={notification.id}>
                      <button
                        onClick={() => openNotification(notification)}
                        className={cn(
                          "flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-neutral-50",
                          !notification.is_read && "bg-sky-50/40"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                            notification.is_read ? "bg-neutral-200" : (TONE[notification.type] ?? "bg-neutral-400")
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-sm", notification.is_read ? "text-neutral-600" : "font-medium text-neutral-900")}>
                            {notification.title}
                          </span>
                          {notification.body && (
                            <span className="mt-0.5 block text-xs text-neutral-500">{notification.body}</span>
                          )}
                          <span className="mt-0.5 block text-xs text-neutral-400">
                            {formatDateTime(notification.created_at)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
