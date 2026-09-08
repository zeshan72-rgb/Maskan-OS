"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePlatformSuperAdmin } from "@/lib/permissions/guards";
import { toSafeError, type FormState } from "@/lib/utils/form-state";
import type { OrgStatus } from "@/types/database";

/**
 * Every action here re-asserts platform super admin before touching the
 * service-role client. The guard runs server-side on each call, not just at
 * page load, so a stale tab can't be used to act after access is removed.
 */

export async function setOrganisationStatusAction(
  organisationId: string,
  status: OrgStatus
): Promise<FormState> {
  try {
    const ctx = await requirePlatformSuperAdmin();
    const admin = createAdminClient();

    const { data: org } = await admin
      .from("organisations")
      .select("id, name, status")
      .eq("id", organisationId)
      .maybeSingle();
    if (!org) return { status: "error", message: "Organisation not found." };

    const { error } = await admin.from("organisations").update({ status }).eq("id", organisationId);
    if (error) throw error;

    await admin.from("audit_logs").insert({
      organisation_id: organisationId,
      actor_id: ctx.userId,
      action: `platform.organisation.${status}`,
      entity_table: "organisations",
      entity_id: organisationId,
      metadata: { from: org.status, to: status, name: org.name },
    });

    revalidatePath("/admin/organisations");
    revalidatePath(`/admin/organisations/${organisationId}`);
    return { status: "success", message: `${org.name} is now ${status}.` };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function assignPlanAction(organisationId: string, planId: string): Promise<FormState> {
  try {
    const ctx = await requirePlatformSuperAdmin();
    const admin = createAdminClient();

    const [{ data: org }, { data: plan }] = await Promise.all([
      admin.from("organisations").select("id, name").eq("id", organisationId).maybeSingle(),
      admin.from("plans").select("id, name, key").eq("id", planId).maybeSingle(),
    ]);
    if (!org) return { status: "error", message: "Organisation not found." };
    if (!plan) return { status: "error", message: "Plan not found." };

    const { data: existing } = await admin
      .from("organisation_subscriptions")
      .select("id, plan_id")
      .eq("organisation_id", organisationId)
      .maybeSingle();

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    let subscriptionId: string;
    if (existing) {
      const { error } = await admin
        .from("organisation_subscriptions")
        .update({
          plan_id: planId,
          status: "active",
          current_period_end: periodEnd.toISOString(),
          assigned_by: ctx.userId,
        })
        .eq("id", existing.id);
      if (error) throw error;
      subscriptionId = existing.id;
    } else {
      const { data, error } = await admin
        .from("organisation_subscriptions")
        .insert({
          organisation_id: organisationId,
          plan_id: planId,
          status: "active",
          current_period_end: periodEnd.toISOString(),
          assigned_by: ctx.userId,
        })
        .select("id")
        .single();
      if (error) throw error;
      subscriptionId = data.id;
    }

    await admin.from("subscription_events").insert({
      organisation_subscription_id: subscriptionId,
      event_type: existing ? "plan_changed" : "created",
      metadata: { plan: plan.key, assigned_by: ctx.userId },
    });

    await admin.from("audit_logs").insert({
      organisation_id: organisationId,
      actor_id: ctx.userId,
      action: "platform.plan.assigned",
      entity_table: "organisation_subscriptions",
      entity_id: subscriptionId,
      metadata: { plan: plan.name, organisation: org.name },
    });

    revalidatePath("/admin/organisations");
    revalidatePath(`/admin/organisations/${organisationId}`);
    revalidatePath("/admin/subscriptions");
    return { status: "success", message: `${org.name} moved to the ${plan.name} plan.` };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function setPlatformFeatureFlagAction(
  key: string,
  isEnabled: boolean,
  organisationId?: string
): Promise<FormState> {
  try {
    const ctx = await requirePlatformSuperAdmin();
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("feature_flags")
      .select("id")
      .eq("key", key)
      .is("organisation_id", organisationId ? undefined : null)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from("feature_flags")
        .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await admin
        .from("feature_flags")
        .insert({ key, is_enabled: isEnabled, organisation_id: organisationId ?? null });
      if (error) throw error;
    }

    await admin.from("audit_logs").insert({
      organisation_id: organisationId ?? null,
      actor_id: ctx.userId,
      action: "platform.feature_flag.changed",
      entity_table: "feature_flags",
      entity_id: null,
      metadata: { key, is_enabled: isEnabled },
    });

    revalidatePath("/admin/settings");
    return { status: "success", message: `${key.replace(/_/g, " ")} ${isEnabled ? "enabled" : "disabled"}.` };
  } catch (error) {
    return toSafeError(error);
  }
}
