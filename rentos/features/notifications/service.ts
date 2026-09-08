import { createClient } from "@/lib/supabase/server";

export type NotificationType =
  | "rent_upcoming"
  | "rent_overdue"
  | "payment_confirmed"
  | "payment_rejected"
  | "cheque_due"
  | "cheque_bounced"
  | "lease_expiring"
  | "lease_activated"
  | "renewal_offer"
  | "maintenance_update"
  | "work_assigned"
  | "document_required";

export interface NotifyParams {
  organisationId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  /** Target by profile directly, or by the tenant/owner/vendor record they're linked to. */
  profileId?: string;
  tenantId?: string;
  ownerId?: string;
  vendorId?: string;
}

/**
 * Creates in-app notifications for the people linked to a record.
 *
 * Email and WhatsApp are additional channels on top of this: when a provider
 * is configured, the corresponding integration reads communication_logs and
 * dispatches. Without credentials nothing is faked — the in-app notification
 * still lands, and no "sent" log is written.
 */
export async function notify(params: NotifyParams): Promise<void> {
  try {
    const supabase = await createClient();
    const profileIds = new Set<string>();

    if (params.profileId) profileIds.add(params.profileId);

    const linkedColumn = params.tenantId
      ? { column: "tenant_id" as const, value: params.tenantId }
      : params.ownerId
        ? { column: "owner_id" as const, value: params.ownerId }
        : params.vendorId
          ? { column: "vendor_id" as const, value: params.vendorId }
          : null;

    if (linkedColumn) {
      const { data: members } = await supabase
        .from("organisation_members")
        .select("profile_id")
        .eq("organisation_id", params.organisationId)
        .eq(linkedColumn.column, linkedColumn.value)
        .eq("is_active", true);
      for (const m of members ?? []) profileIds.add(m.profile_id);
    }

    if (profileIds.size === 0) return;

    await supabase.from("notifications").insert(
      Array.from(profileIds).map((profileId) => ({
        organisation_id: params.organisationId,
        profile_id: profileId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        link: params.link ?? null,
      }))
    );
  } catch (error) {
    // Notifications must never break the business action that triggered them.
    console.error("[rentos] notification dispatch failed", params.type, error);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
}

export async function getUnreadNotifications(profileId: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, is_read, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
