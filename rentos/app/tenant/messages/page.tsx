import { AlertCircle, Bell, Check, CheckCheck, MessageSquare } from "lucide-react";
import { requireTenant } from "@/features/portals/tenant-guard";
import { createClient } from "@/lib/supabase/server";
import { STUB_THREADS } from "@/features/portals/tenant-stub-data";
import { TENANT_NAV } from "@/features/portals/tenant-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type NotificationRow = {
  id: string; type: string; title: string; body: string | null;
  is_read: boolean; created_at: string;
};

/**
 * Messages.
 *
 * Notifications are real — one-way, from us to you. The conversation itself
 * is stubbed: there is no messages or conversations table, so replies
 * cannot be stored.
 *
 * TODO: see features/portals/tenant-stub-data.ts for the migration.
 */
export default async function TenantMessagesPage() {
  const { ctx, tenantId } = await requireTenant();
  if (!tenantId) {
    return (
      <PortalLayout title="Tenant" nav={TENANT_NAV}>
        <EmptyState icon={AlertCircle} title="Not linked to a tenancy"
          description="An administrator needs to attach this account to a tenant record." />
      </PortalLayout>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, is_read, created_at")
    .eq("profile_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const notifications = (data ?? []) as NotificationRow[];
  const threads = STUB_THREADS;
  const awaitingReply = threads.filter((t) => t.status === "open").length;
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <PortalLayout title="Tenant" nav={TENANT_NAV}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Messages</h1>
          <p className="text-sm text-neutral-500">Anything you have asked us, and anything we have told you.</p>
        </div>
        <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
          Conversations are sample data
        </span>
      </div>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Conversations" value={threads.length} icon={MessageSquare} />
        <StatCard label="Awaiting a reply" value={awaitingReply}
          tone={awaitingReply > 0 ? "warning" : "success"} />
        <StatCard label="Unread notices" value={unread} icon={Bell}
          tone={unread > 0 ? "info" : "default"} />
      </div>

      {notifications.length > 0 && (
        <>
          <h2 className="mb-3 text-base">Notices</h2>
          <div className="stagger mb-6 space-y-2">
            {notifications.map((n) => (
              <Card key={n.id} className={n.is_read ? undefined : "border-neutral-900"}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-sm text-neutral-600">{n.body}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-neutral-400">{formatDateTime(n.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-3 text-base">Conversations</h2>
      <div className="stagger space-y-4">
        {threads.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">{t.subject}</h3>
                  {t.about && <p className="text-xs text-neutral-500">About {t.about}</p>}
                </div>
                <Badge variant={t.status === "open" ? "warning" : t.status === "answered" ? "success" : "neutral"}>
                  {t.status === "open" ? "Waiting on us" : t.status === "answered" ? "Answered" : "Closed"}
                </Badge>
              </div>

              <div className="mt-4 space-y-3">
                {t.messages.map((m) => (
                  <div key={m.id} className={m.sender === "tenant" ? "flex justify-end" : "flex justify-start"}>
                    <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${
                      m.sender === "tenant" ? "bg-neutral-900 text-white"
                      : m.sender === "system" ? "bg-neutral-50 text-neutral-600"
                      : "bg-neutral-100 text-neutral-900"}`}>
                      {m.sender !== "tenant" && (
                        <p className="mb-0.5 text-xs font-medium opacity-70">{m.senderName}</p>
                      )}
                      <p className="text-sm leading-relaxed">{m.body}</p>
                      <p className={`mt-1 flex items-center gap-1 text-xs ${
                        m.sender === "tenant" ? "text-neutral-400" : "text-neutral-500"}`}>
                        {formatDateTime(m.sentAt)}
                        {/* Whether staff have read it. A portal that swallows a
                            message with no acknowledgement teaches tenants to
                            phone instead. */}
                        {m.sender === "tenant" && (
                          m.readByStaff
                            ? <><CheckCheck className="h-3 w-3" /> Read</>
                            : <><Check className="h-3 w-3" /> Sent</>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {t.status !== "closed" && (
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <Textarea rows={2} placeholder="Write a reply" disabled />
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" disabled>Send</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        The notices above are real. Conversations are sample data and replies are disabled:
        there is no messages or conversations table yet. See
        features/portals/tenant-stub-data.ts.
      </p>
    </PortalLayout>
  );
}
