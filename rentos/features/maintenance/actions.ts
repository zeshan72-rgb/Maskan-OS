"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertPermission } from "@/lib/permissions/guards";
import { getSessionContext, primaryMembership } from "@/lib/permissions/context";
import { maintenanceRequestSchema, workOrderSchema } from "@/lib/validation/maintenance";
import { parseForm, toSafeError, type FormState } from "@/lib/utils/form-state";
import { recordAudit } from "@/lib/utils/audit";
import { notify } from "@/features/notifications/service";
import type { MaintenanceStatus } from "@/types/database";

async function currentOrganisationId(): Promise<string> {
  const ctx = await getSessionContext();
  const membership = primaryMembership(ctx);
  if (!membership) throw new Error("No organisation membership found for the current user.");
  return membership.organisationId;
}

async function nextRequestCode(organisationId: string): Promise<string> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("maintenance_requests")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId);
  return `MR-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

/**
 * Creates a maintenance request. Works for both staff (raising on a tenant's
 * behalf) and tenants raising their own — the tenant path resolves the unit
 * from their active lease rather than trusting a unit id from the form.
 */
export async function createMaintenanceRequestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const ctx = await getSessionContext();
    const membership = primaryMembership(ctx);
    if (!ctx || !membership) return { status: "error", message: "You must be signed in." };

    const parsed = parseForm(maintenanceRequestSchema, formData);
    if (!parsed.ok) return parsed.state;
    const input = parsed.data;

    const supabase = await createClient();
    const organisationId = membership.organisationId;

    const isTenant = !!membership.tenantId;
    if (!isTenant) {
      await assertPermission(organisationId, "maintenance.manage");
    }

    // Resolve the unit and its context. For a tenant, the unit must belong to
    // one of their own active leases.
    let leaseQuery = supabase
      .from("leases")
      .select("id, property_id, unit_id, tenant_id")
      .eq("organisation_id", organisationId)
      .eq("unit_id", input.unit_id)
      .in("status", ["active", "expiring", "renewal_offered"]);

    if (isTenant) leaseQuery = leaseQuery.eq("tenant_id", membership.tenantId!);

    const { data: leases } = await leaseQuery.limit(1);
    const lease = leases?.[0] ?? null;

    if (isTenant && !lease) {
      return { status: "error", message: "That unit isn't associated with your tenancy." };
    }

    let propertyId = lease?.property_id;
    if (!propertyId) {
      const { data: unit } = await supabase
        .from("units")
        .select("property_id")
        .eq("id", input.unit_id)
        .eq("organisation_id", organisationId)
        .maybeSingle();
      if (!unit) return { status: "error", message: "That unit could not be found." };
      propertyId = unit.property_id;
    }

    const requestCode = await nextRequestCode(organisationId);

    const { data, error } = await supabase
      .from("maintenance_requests")
      .insert({
        organisation_id: organisationId,
        property_id: propertyId,
        unit_id: input.unit_id,
        tenant_id: lease?.tenant_id ?? membership.tenantId ?? null,
        lease_id: lease?.id ?? null,
        category_id: input.category_id ?? null,
        priority: input.priority,
        description: input.description,
        access_notes: input.access_notes ?? null,
        preferred_time: input.preferred_time ?? null,
        request_code: requestCode,
        status: "submitted",
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    if (error) throw error;

    await recordAudit({
      organisationId, action: "maintenance.created", entityTable: "maintenance_requests", entityId: data.id,
      metadata: { request_code: requestCode, priority: input.priority },
    });

    revalidatePath("/maintenance");
    revalidatePath("/tenant/maintenance");
    revalidatePath("/dashboard");
    return { status: "success", message: `Request ${requestCode} submitted.`, id: data.id };
  } catch (error) {
    return toSafeError(error);
  }
}

/**
 * Converts a request into a work order and assigns it to a vendor or an
 * internal employee. The vendor gains visibility of exactly this job and
 * nothing else.
 */
export async function createWorkOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "maintenance.manage");

    const parsed = parseForm(workOrderSchema, formData);
    if (!parsed.ok) return parsed.state;
    const input = parsed.data;

    if (!input.vendor_id && !input.assigned_employee_id) {
      return { status: "error", message: "Assign the job to a vendor or an internal team member." };
    }

    const supabase = await createClient();

    const { data: request } = await supabase
      .from("maintenance_requests")
      .select("id, request_code, status")
      .eq("id", input.maintenance_request_id)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!request) return { status: "error", message: "Maintenance request not found." };

    const { data: workOrder, error } = await supabase
      .from("work_orders")
      .insert({
        organisation_id: organisationId,
        maintenance_request_id: input.maintenance_request_id,
        vendor_id: input.vendor_id ?? null,
        assigned_employee_id: input.assigned_employee_id ?? null,
        scheduled_at: input.scheduled_at ? new Date(input.scheduled_at).toISOString() : null,
        estimated_cost: input.estimated_cost ?? null,
        approved_amount: input.approved_amount ?? null,
        instructions: input.instructions ?? null,
        status: input.scheduled_at ? "scheduled" : "assigned",
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    if (error) throw error;

    await supabase
      .from("maintenance_requests")
      .update({ status: input.scheduled_at ? "scheduled" : "assigned" })
      .eq("id", input.maintenance_request_id);

    await supabase.from("work_order_events").insert({
      work_order_id: workOrder.id,
      event_type: "assigned",
      notes: input.instructions ?? null,
      actor_id: ctx.userId,
    });

    if (input.vendor_id) {
      await notify({
        organisationId,
        vendorId: input.vendor_id,
        type: "work_assigned",
        title: "New job assigned",
        body: `Request ${request.request_code} has been assigned to you.`,
        link: "/vendor",
      });
    }

    await recordAudit({
      organisationId, action: "work_order.created", entityTable: "work_orders", entityId: workOrder.id,
      metadata: { request_code: request.request_code, vendor_id: input.vendor_id },
    });

    revalidatePath(`/maintenance/${input.maintenance_request_id}`);
    revalidatePath("/maintenance");
    return { status: "success", message: "Work order created and assigned.", id: workOrder.id };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function updateMaintenanceStatusAction(
  requestId: string,
  status: MaintenanceStatus,
  notes?: string
): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "maintenance.manage");
    const supabase = await createClient();

    const { data: request } = await supabase
      .from("maintenance_requests")
      .select("id, request_code, tenant_id, status")
      .eq("id", requestId)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!request) return { status: "error", message: "Maintenance request not found." };

    const { error } = await supabase.from("maintenance_requests").update({ status }).eq("id", requestId);
    if (error) throw error;

    if (notes) {
      await supabase.from("maintenance_comments").insert({
        maintenance_request_id: requestId,
        body: notes,
        is_internal: false,
        author_id: ctx.userId,
      });
    }

    if (request.tenant_id) {
      await notify({
        organisationId,
        tenantId: request.tenant_id,
        type: "maintenance_update",
        title: `Request ${request.request_code} updated`,
        body: `Status changed to ${status.replace(/_/g, " ")}.`,
        link: "/tenant/maintenance",
      });
    }

    await recordAudit({
      organisationId, action: `maintenance.${status}`, entityTable: "maintenance_requests", entityId: requestId,
      metadata: { from: request.status, to: status },
    });

    revalidatePath(`/maintenance/${requestId}`);
    revalidatePath("/maintenance");
    revalidatePath("/tenant/maintenance");
    return { status: "success", message: `Request marked ${status.replace(/_/g, " ")}.` };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function addMaintenanceCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const ctx = await getSessionContext();
    const membership = primaryMembership(ctx);
    if (!ctx || !membership) return { status: "error", message: "You must be signed in." };

    const requestId = String(formData.get("maintenance_request_id") ?? "");
    const body = String(formData.get("body") ?? "").trim();
    const isInternal = formData.get("is_internal") === "on";

    if (!requestId) return { status: "error", message: "Request not identified." };
    if (body.length < 2) {
      return { status: "error", message: "Write a comment before posting.", fieldErrors: { body: "Comment is too short" } };
    }

    const supabase = await createClient();

    // RLS restricts inserts to org staff or the request's own tenant, so a
    // tenant can't comment on someone else's request even by guessing the id.
    const { error } = await supabase.from("maintenance_comments").insert({
      maintenance_request_id: requestId,
      body,
      is_internal: isInternal && !membership.tenantId,
      author_id: ctx.userId,
    });
    if (error) throw error;

    revalidatePath(`/maintenance/${requestId}`);
    revalidatePath("/tenant/maintenance");
    return { status: "success", message: "Comment added." };
  } catch (error) {
    return toSafeError(error);
  }
}

// ---------------------------------------------------------------------------
// Vendor-side actions — a vendor may only progress work orders assigned to
// their own vendor organisation. RLS enforces this; the checks here produce
// clear messages rather than raw policy errors.
// ---------------------------------------------------------------------------

type VendorEvent = "accepted" | "rejected" | "scheduled" | "arrived" | "started" | "completed";

const VENDOR_EVENT_STATUS: Record<VendorEvent, MaintenanceStatus | null> = {
  accepted: "assigned",
  rejected: null,
  scheduled: "scheduled",
  arrived: "in_progress",
  started: "in_progress",
  completed: "completed",
};

export async function vendorUpdateJobAction(
  workOrderId: string,
  event: VendorEvent,
  payload: { notes?: string; scheduledAt?: string; actualAmount?: number } = {}
): Promise<FormState> {
  try {
    const ctx = await getSessionContext();
    const membership = primaryMembership(ctx);
    if (!ctx || !membership?.vendorId) {
      return { status: "error", message: "Only a signed-in vendor can update jobs." };
    }

    const supabase = await createClient();

    const { data: workOrder } = await supabase
      .from("work_orders")
      .select("id, vendor_id, organisation_id, maintenance_request_id, status")
      .eq("id", workOrderId)
      .maybeSingle();

    if (!workOrder || workOrder.vendor_id !== membership.vendorId) {
      return { status: "error", message: "That job isn't assigned to you." };
    }

    const nextStatus = VENDOR_EVENT_STATUS[event];
    const updates: Record<string, unknown> = {};
    if (nextStatus) updates.status = nextStatus;
    if (event === "scheduled" && payload.scheduledAt) {
      updates.scheduled_at = new Date(payload.scheduledAt).toISOString();
    }
    if (event === "completed" && payload.actualAmount !== undefined) {
      updates.actual_amount = payload.actualAmount;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("work_orders").update(updates).eq("id", workOrderId);
      if (error) throw error;
    }

    await supabase.from("work_order_events").insert({
      work_order_id: workOrderId,
      event_type: event,
      notes: payload.notes ?? null,
      metadata: payload.actualAmount !== undefined ? { actual_amount: payload.actualAmount } : {},
      actor_id: ctx.userId,
    });

    // Keep the parent request in step with the job, except on rejection —
    // a rejected job goes back to the manager to reassign.
    if (nextStatus) {
      await supabase
        .from("maintenance_requests")
        .update({ status: nextStatus })
        .eq("id", workOrder.maintenance_request_id);
    } else if (event === "rejected") {
      await supabase
        .from("maintenance_requests")
        .update({ status: "reviewing" })
        .eq("id", workOrder.maintenance_request_id);
    }

    await recordAudit({
      organisationId: workOrder.organisation_id,
      action: `work_order.${event}`,
      entityTable: "work_orders",
      entityId: workOrderId,
      metadata: { notes: payload.notes, actual_amount: payload.actualAmount },
    });

    revalidatePath("/vendor");
    revalidatePath(`/maintenance/${workOrder.maintenance_request_id}`);
    return { status: "success", message: `Job marked ${event}.` };
  } catch (error) {
    return toSafeError(error);
  }
}
