"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertPermission } from "@/lib/permissions/guards";
import { getSessionContext, primaryMembership } from "@/lib/permissions/context";
import { leaseSchema, renewalOfferSchema } from "@/lib/validation/leases";
import { parseForm, toSafeError, type FormState } from "@/lib/utils/form-state";
import { recordAudit } from "@/lib/utils/audit";
import { notify } from "@/features/notifications/service";

async function currentOrganisationId(): Promise<string> {
  const ctx = await getSessionContext();
  const membership = primaryMembership(ctx);
  if (!membership) throw new Error("No organisation membership found for the current user.");
  return membership.organisationId;
}

/** Sequential, human-readable lease code scoped to the organisation. */
async function nextLeaseCode(organisationId: string): Promise<string> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("leases")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId);
  return `LEASE-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

function monthsBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
}

/**
 * Creates a lease in `draft`. No rent is generated yet — the schedule is
 * produced at activation so a half-finished draft never creates financial
 * obligations.
 */
export async function createLeaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "leases.manage");

    const parsed = parseForm(leaseSchema, formData);
    if (!parsed.ok) return parsed.state;
    const input = parsed.data;

    const supabase = await createClient();

    // The unit must belong to this org and not already have a live lease.
    const { data: unit } = await supabase
      .from("units")
      .select("id, property_id, status")
      .eq("id", input.unit_id)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!unit) return { status: "error", message: "That unit could not be found in your organisation." };

    const { count: liveLeases } = await supabase
      .from("leases")
      .select("id", { count: "exact", head: true })
      .eq("unit_id", input.unit_id)
      .in("status", ["active", "expiring", "renewal_offered", "pending"]);

    if ((liveLeases ?? 0) > 0) {
      return { status: "error", message: "This unit already has a live lease. Terminate it before creating a new one." };
    }

    const months = Math.max(1, monthsBetween(input.start_date, input.end_date));
    const leaseCode = await nextLeaseCode(organisationId);

    const { data, error } = await supabase
      .from("leases")
      .insert({
        organisation_id: organisationId,
        property_id: input.property_id,
        unit_id: input.unit_id,
        tenant_id: input.tenant_id,
        owner_id: input.owner_id ?? null,
        lease_code: leaseCode,
        start_date: input.start_date,
        end_date: input.end_date,
        monthly_rent: input.monthly_rent,
        total_contract_rent: Number((input.monthly_rent * months).toFixed(2)),
        security_deposit: input.security_deposit ?? 0,
        payment_frequency: input.payment_frequency,
        payment_method: input.payment_method,
        grace_period_days: input.grace_period_days,
        notes: input.notes ?? null,
        status: "draft",
        created_by: ctx.userId,
      })
      .select("id")
      .single();

    if (error) throw error;

    await supabase.from("lease_events").insert({
      lease_id: data.id,
      event_type: "created",
      to_status: "draft",
      actor_id: ctx.userId,
    });

    await recordAudit({
      organisationId, action: "lease.created", entityTable: "leases", entityId: data.id,
      metadata: { lease_code: leaseCode, monthly_rent: input.monthly_rent },
    });

    revalidatePath("/leases");
    return { status: "success", message: `Lease ${leaseCode} created as a draft.`, id: data.id };
  } catch (error) {
    return toSafeError(error);
  }
}

/**
 * Activates a draft/pending lease. This is the moment rent obligations come
 * into existence: the database function generates the instalment schedule
 * from the lease's frequency, and the unit is marked occupied.
 */
export async function activateLeaseAction(leaseId: string): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "leases.manage");
    const supabase = await createClient();

    const { data: lease } = await supabase
      .from("leases")
      .select("id, status, unit_id, tenant_id, lease_code")
      .eq("id", leaseId)
      .eq("organisation_id", organisationId)
      .maybeSingle();

    if (!lease) return { status: "error", message: "Lease not found." };
    if (!["draft", "pending"].includes(lease.status)) {
      return { status: "error", message: `A lease in "${lease.status}" status can't be activated.` };
    }

    const { error: statusError } = await supabase
      .from("leases")
      .update({ status: "active", activated_at: new Date().toISOString() })
      .eq("id", leaseId);
    if (statusError) throw statusError;

    // generate_rent_schedule raises if a schedule already exists, which keeps
    // repeated activation attempts from duplicating rent.
    const { error: scheduleError } = await supabase.rpc("generate_rent_schedule", {
      p_lease_id: leaseId,
      p_actor: ctx.userId,
    });
    if (scheduleError) throw scheduleError;

    await supabase.from("units").update({ status: "occupied" }).eq("id", lease.unit_id);

    await supabase.from("lease_events").insert({
      lease_id: leaseId,
      event_type: "activated",
      from_status: "draft",
      to_status: "active",
      actor_id: ctx.userId,
    });

    await notify({
      organisationId,
      tenantId: lease.tenant_id,
      type: "lease_activated",
      title: "Your lease is now active",
      body: `Lease ${lease.lease_code} has been activated and your rent schedule is available.`,
      link: "/tenant/lease",
    });

    await recordAudit({
      organisationId, action: "lease.activated", entityTable: "leases", entityId: leaseId,
      metadata: { lease_code: lease.lease_code },
    });

    revalidatePath(`/leases/${leaseId}`);
    revalidatePath("/leases");
    revalidatePath("/dashboard");
    return { status: "success", message: "Lease activated and rent schedule generated." };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function terminateLeaseAction(leaseId: string, reason: string): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "leases.manage");
    const supabase = await createClient();

    const { data: lease } = await supabase
      .from("leases")
      .select("id, status, unit_id, lease_code")
      .eq("id", leaseId)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!lease) return { status: "error", message: "Lease not found." };

    const { error } = await supabase
      .from("leases")
      .update({
        status: "terminated",
        terminated_at: new Date().toISOString(),
        termination_reason: reason || null,
      })
      .eq("id", leaseId);
    if (error) throw error;

    // Outstanding instalments are deliberately preserved — terminating a lease
    // doesn't erase money the tenant already owes.
    await supabase.from("units").update({ status: "vacant" }).eq("id", lease.unit_id);

    await supabase.from("lease_events").insert({
      lease_id: leaseId,
      event_type: "terminated",
      from_status: lease.status,
      to_status: "terminated",
      notes: reason,
      actor_id: ctx.userId,
    });

    await recordAudit({
      organisationId, action: "lease.terminated", entityTable: "leases", entityId: leaseId,
      metadata: { reason, lease_code: lease.lease_code },
    });

    revalidatePath(`/leases/${leaseId}`);
    revalidatePath("/leases");
    return { status: "success", message: "Lease terminated. Outstanding balances have been kept." };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function createRenewalOfferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "leases.manage");

    const parsed = parseForm(renewalOfferSchema, formData);
    if (!parsed.ok) return parsed.state;
    const input = parsed.data;

    const supabase = await createClient();
    const { data: lease } = await supabase
      .from("leases")
      .select("id, status, tenant_id, lease_code")
      .eq("id", input.lease_id)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!lease) return { status: "error", message: "Lease not found." };

    if (!["active", "expiring"].includes(lease.status)) {
      return { status: "error", message: "Only an active or expiring lease can be offered a renewal." };
    }

    const { data, error } = await supabase
      .from("lease_renewal_offers")
      .insert({
        lease_id: input.lease_id,
        new_start_date: input.new_start_date,
        new_end_date: input.new_end_date,
        new_monthly_rent: input.new_monthly_rent,
        new_security_deposit: input.new_security_deposit ?? null,
        notes: input.notes ?? null,
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    if (error) throw error;

    await supabase.from("leases").update({ status: "renewal_offered" }).eq("id", input.lease_id);

    await notify({
      organisationId,
      tenantId: lease.tenant_id,
      type: "renewal_offer",
      title: "Renewal offer received",
      body: `Your landlord has offered to renew ${lease.lease_code}. Review and respond in your portal.`,
      link: "/tenant/lease",
    });

    await recordAudit({
      organisationId, action: "lease.renewal_offered", entityTable: "lease_renewal_offers", entityId: data.id,
      metadata: { lease_id: input.lease_id, new_monthly_rent: input.new_monthly_rent },
    });

    revalidatePath(`/leases/${input.lease_id}`);
    return { status: "success", message: "Renewal offer sent to the tenant.", id: data.id };
  } catch (error) {
    return toSafeError(error);
  }
}

/**
 * Accepting a renewal creates the successor lease (linked to its predecessor,
 * so history is preserved), marks the old lease renewed, and generates the
 * new rent schedule.
 */
export async function acceptRenewalOfferAction(offerId: string, responseNotes?: string): Promise<FormState> {
  try {
    const ctx = await getSessionContext();
    if (!ctx) return { status: "error", message: "You must be signed in." };

    const supabase = await createClient();

    const { data: offer } = await supabase
      .from("lease_renewal_offers")
      .select("id, lease_id, new_start_date, new_end_date, new_monthly_rent, new_security_deposit, status")
      .eq("id", offerId)
      .maybeSingle();
    if (!offer) return { status: "error", message: "Renewal offer not found." };
    if (offer.status !== "pending") return { status: "error", message: "This offer has already been responded to." };

    const { data: lease } = await supabase
      .from("leases")
      .select("id, organisation_id, property_id, unit_id, owner_id, tenant_id, payment_frequency, payment_method, grace_period_days")
      .eq("id", offer.lease_id)
      .maybeSingle();
    if (!lease) return { status: "error", message: "Original lease not found." };

    const months = Math.max(1, monthsBetween(offer.new_start_date, offer.new_end_date));
    const leaseCode = await nextLeaseCode(lease.organisation_id);

    const { data: successor, error: createError } = await supabase
      .from("leases")
      .insert({
        organisation_id: lease.organisation_id,
        property_id: lease.property_id,
        unit_id: lease.unit_id,
        owner_id: lease.owner_id,
        tenant_id: lease.tenant_id,
        lease_code: leaseCode,
        start_date: offer.new_start_date,
        end_date: offer.new_end_date,
        monthly_rent: Number(offer.new_monthly_rent),
        total_contract_rent: Number((Number(offer.new_monthly_rent) * months).toFixed(2)),
        security_deposit: Number(offer.new_security_deposit ?? 0),
        payment_frequency: lease.payment_frequency,
        payment_method: lease.payment_method,
        grace_period_days: lease.grace_period_days,
        status: "draft",
        previous_lease_id: lease.id,
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    if (createError) throw createError;

    await supabase
      .from("lease_renewal_offers")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
        response_notes: responseNotes ?? null,
        successor_lease_id: successor.id,
      })
      .eq("id", offerId);

    // Activate the successor so the tenant immediately has a forward schedule.
    await supabase
      .from("leases")
      .update({ status: "active", activated_at: new Date().toISOString() })
      .eq("id", successor.id);

    const { error: scheduleError } = await supabase.rpc("generate_rent_schedule", {
      p_lease_id: successor.id,
      p_actor: ctx.userId,
    });
    if (scheduleError) throw scheduleError;

    await supabase.from("leases").update({ status: "renewed" }).eq("id", lease.id);

    await supabase.from("lease_events").insert([
      { lease_id: lease.id, event_type: "renewed", to_status: "renewed", actor_id: ctx.userId },
      { lease_id: successor.id, event_type: "created_from_renewal", to_status: "active", actor_id: ctx.userId },
    ]);

    await recordAudit({
      organisationId: lease.organisation_id,
      action: "lease.renewal_accepted",
      entityTable: "leases",
      entityId: successor.id,
      metadata: { previous_lease_id: lease.id, offer_id: offerId },
    });

    revalidatePath(`/leases/${lease.id}`);
    revalidatePath("/tenant/lease");
    revalidatePath("/leases");
    return { status: "success", message: `Renewal accepted. New lease ${leaseCode} is active.`, id: successor.id };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function respondToRenewalOfferAction(
  offerId: string,
  decision: "declined" | "discussion_requested",
  notes?: string
): Promise<FormState> {
  try {
    const ctx = await getSessionContext();
    if (!ctx) return { status: "error", message: "You must be signed in." };

    const supabase = await createClient();
    const { data: offer } = await supabase
      .from("lease_renewal_offers")
      .select("id, lease_id, status")
      .eq("id", offerId)
      .maybeSingle();
    if (!offer) return { status: "error", message: "Renewal offer not found." };
    if (offer.status !== "pending") return { status: "error", message: "This offer has already been responded to." };

    const { error } = await supabase
      .from("lease_renewal_offers")
      .update({ status: decision, responded_at: new Date().toISOString(), response_notes: notes ?? null })
      .eq("id", offerId);
    if (error) throw error;

    // The lease goes back to active so the manager can offer different terms.
    await supabase.from("leases").update({ status: "active" }).eq("id", offer.lease_id);

    revalidatePath(`/leases/${offer.lease_id}`);
    revalidatePath("/tenant/lease");
    return {
      status: "success",
      message: decision === "declined" ? "Renewal declined." : "Discussion requested — your manager has been notified.",
    };
  } catch (error) {
    return toSafeError(error);
  }
}
