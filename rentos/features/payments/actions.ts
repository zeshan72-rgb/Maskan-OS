"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertPermission } from "@/lib/permissions/guards";
import { getSessionContext, primaryMembership } from "@/lib/permissions/context";
import { paymentSchema, allocationsSchema } from "@/lib/validation/leases";
import { parseForm, toSafeError, type FormState } from "@/lib/utils/form-state";
import { recordAudit } from "@/lib/utils/audit";
import { notify } from "@/features/notifications/service";
import {
  planAllocation, validateManualAllocation, writeAllocations, nextReceiptNumber, round2,
  type AllocationTarget,
} from "./allocation";

async function currentOrganisationId(): Promise<string> {
  const ctx = await getSessionContext();
  const membership = primaryMembership(ctx);
  if (!membership) throw new Error("No organisation membership found for the current user.");
  return membership.organisationId;
}

function parseAllocationsPayload(raw?: string): AllocationTarget[] {
  if (!raw) return [];
  try {
    const parsed = allocationsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    return parsed.data.map((entry) => ({ instalmentId: entry.instalment_id, amount: entry.amount }));
  } catch {
    return [];
  }
}

/**
 * Staff-recorded payment (cash, bank transfer already seen on statement,
 * or "other"). Recorded as confirmed and allocated immediately.
 */
export async function recordPaymentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "payments.manage");

    const parsed = parseForm(paymentSchema, formData);
    if (!parsed.ok) return parsed.state;
    const input = parsed.data;

    const supabase = await createClient();

    const { data: lease } = await supabase
      .from("leases")
      .select("id, tenant_id, lease_code")
      .eq("id", input.lease_id)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!lease) return { status: "error", message: "That lease could not be found in your organisation." };

    const { data: outstanding } = await supabase
      .from("rent_instalments")
      .select("id, outstanding_amount")
      .eq("lease_id", input.lease_id)
      .gt("outstanding_amount", 0)
      .order("due_date");

    const outstandingRows = (outstanding ?? []).map((i) => ({
      id: i.id,
      outstanding_amount: Number(i.outstanding_amount),
    }));

    let allocations: AllocationTarget[] = [];
    if (input.allocation_mode === "auto") {
      const plan = planAllocation(input.amount, outstandingRows);
      allocations = plan.allocations;
      if (plan.unallocated > 0 && plan.allocated === 0) {
        return { status: "error", message: "This lease has no outstanding rent to allocate against." };
      }
    } else if (input.allocation_mode === "manual") {
      allocations = parseAllocationsPayload(input.allocations);
      if (allocations.length === 0) {
        return { status: "error", message: "Select at least one instalment to allocate this payment to." };
      }
      const check = validateManualAllocation(input.amount, allocations, outstandingRows);
      if (!check.ok) return { status: "error", message: check.message };
    }

    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        organisation_id: organisationId,
        lease_id: input.lease_id,
        tenant_id: lease.tenant_id,
        amount: input.amount,
        method: input.method,
        status: "confirmed",
        reference: input.reference ?? null,
        payer_name: input.payer_name ?? null,
        paid_at: input.paid_at,
        note: input.note ?? null,
        confirmed_by: ctx.userId,
        confirmed_at: new Date().toISOString(),
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    if (error) throw error;

    await writeAllocations(supabase, payment.id, allocations);

    const receiptNumber = await nextReceiptNumber(supabase, organisationId);
    await supabase.from("receipts").insert({
      organisation_id: organisationId,
      payment_id: payment.id,
      receipt_number: receiptNumber,
    });

    await notify({
      organisationId,
      tenantId: lease.tenant_id,
      type: "payment_confirmed",
      title: "Payment recorded",
      body: `A payment of QAR ${input.amount.toFixed(2)} has been recorded against ${lease.lease_code}.`,
      link: "/tenant/payments",
    });

    await recordAudit({
      organisationId, action: "payment.recorded", entityTable: "payments", entityId: payment.id,
      metadata: { amount: input.amount, method: input.method, allocations: allocations.length, receipt: receiptNumber },
    });

    const allocatedTotal = round2(allocations.reduce((s, a) => s + a.amount, 0));
    const leftover = round2(input.amount - allocatedTotal);

    revalidatePath(`/leases/${input.lease_id}`);
    revalidatePath("/finance/payments");
    revalidatePath("/dashboard");

    return {
      status: "success",
      id: payment.id,
      message:
        leftover > 0
          ? `Payment recorded. QAR ${allocatedTotal.toFixed(2)} allocated; QAR ${leftover.toFixed(2)} is unallocated.`
          : `Payment recorded and allocated. Receipt ${receiptNumber}.`,
    };
  } catch (error) {
    return toSafeError(error);
  }
}

/**
 * Confirms a tenant-submitted bank transfer sitting in Pending Verification.
 * The accountant may correct the amount before confirming, since the uploaded
 * receipt is the source of truth rather than what the tenant typed.
 */
export async function confirmPaymentAction(
  paymentId: string,
  options: { amount?: number; reference?: string } = {}
): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "payments.manage");
    const supabase = await createClient();

    const { data: payment } = await supabase
      .from("payments")
      .select("id, lease_id, tenant_id, amount, status")
      .eq("id", paymentId)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!payment) return { status: "error", message: "Payment not found." };
    if (payment.status !== "pending_verification") {
      return { status: "error", message: "Only payments awaiting verification can be confirmed." };
    }

    const finalAmount = options.amount ?? Number(payment.amount);

    const { data: outstanding } = await supabase
      .from("rent_instalments")
      .select("id, outstanding_amount")
      .eq("lease_id", payment.lease_id)
      .gt("outstanding_amount", 0)
      .order("due_date");

    const plan = planAllocation(
      finalAmount,
      (outstanding ?? []).map((i) => ({ id: i.id, outstanding_amount: Number(i.outstanding_amount) }))
    );

    const { error } = await supabase
      .from("payments")
      .update({
        status: "confirmed",
        amount: finalAmount,
        reference: options.reference ?? undefined,
        confirmed_by: ctx.userId,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", paymentId);
    if (error) throw error;

    await writeAllocations(supabase, paymentId, plan.allocations);

    const receiptNumber = await nextReceiptNumber(supabase, organisationId);
    await supabase.from("receipts").insert({
      organisation_id: organisationId,
      payment_id: paymentId,
      receipt_number: receiptNumber,
    });

    await notify({
      organisationId,
      tenantId: payment.tenant_id,
      type: "payment_confirmed",
      title: "Payment confirmed",
      body: `Your payment of QAR ${finalAmount.toFixed(2)} has been confirmed. Receipt ${receiptNumber}.`,
      link: "/tenant/payments",
    });

    await recordAudit({
      organisationId, action: "payment.confirmed", entityTable: "payments", entityId: paymentId,
      metadata: { amount: finalAmount, receipt: receiptNumber },
    });

    revalidatePath("/finance/payments");
    revalidatePath(`/leases/${payment.lease_id}`);
    revalidatePath("/dashboard");
    return { status: "success", message: `Payment confirmed. Receipt ${receiptNumber}.` };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function rejectPaymentAction(paymentId: string, reason: string): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    await assertPermission(organisationId, "payments.manage");
    const supabase = await createClient();

    const { data: payment } = await supabase
      .from("payments")
      .select("id, tenant_id, status, lease_id")
      .eq("id", paymentId)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!payment) return { status: "error", message: "Payment not found." };
    if (payment.status !== "pending_verification") {
      return { status: "error", message: "Only payments awaiting verification can be rejected." };
    }

    const { error } = await supabase
      .from("payments")
      .update({ status: "rejected", rejected_reason: reason })
      .eq("id", paymentId);
    if (error) throw error;

    await notify({
      organisationId,
      tenantId: payment.tenant_id,
      type: "payment_rejected",
      title: "Payment could not be verified",
      body: reason || "Please check the transfer details and upload the correct receipt.",
      link: "/tenant/payments",
    });

    await recordAudit({
      organisationId, action: "payment.rejected", entityTable: "payments", entityId: paymentId,
      metadata: { reason },
    });

    revalidatePath("/finance/payments");
    return { status: "success", message: "Payment rejected and the tenant has been notified." };
  } catch (error) {
    return toSafeError(error);
  }
}

/**
 * Tenant-submitted proof of a bank transfer. Creates a payment in
 * `pending_verification` — it deliberately does NOT allocate anything until
 * an accountant confirms it, so unverified money never reduces arrears.
 */
export async function submitPaymentProofAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const ctx = await getSessionContext();
    const membership = primaryMembership(ctx);
    if (!ctx || !membership?.tenantId) {
      return { status: "error", message: "Only a signed-in tenant can submit payment proof." };
    }

    const amount = Number(formData.get("amount"));
    const reference = String(formData.get("reference") ?? "").trim();
    const paidAt = String(formData.get("paid_at") ?? "").trim();
    const leaseId = String(formData.get("lease_id") ?? "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return { status: "error", message: "Enter the amount you transferred.", fieldErrors: { amount: "Enter a valid amount" } };
    }
    if (!leaseId) return { status: "error", message: "No lease selected." };

    const supabase = await createClient();
    const { data: lease } = await supabase
      .from("leases")
      .select("id, organisation_id, tenant_id")
      .eq("id", leaseId)
      .eq("tenant_id", membership.tenantId)
      .maybeSingle();
    if (!lease) return { status: "error", message: "That lease isn't associated with your account." };

    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        organisation_id: lease.organisation_id,
        lease_id: lease.id,
        tenant_id: lease.tenant_id,
        amount,
        method: "bank_transfer",
        status: "pending_verification",
        reference: reference || null,
        paid_at: paidAt || new Date().toISOString().slice(0, 10),
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    if (error) throw error;

    revalidatePath("/tenant/payments");
    revalidatePath("/finance/payments");
    return {
      status: "success",
      id: payment.id,
      message: "Payment proof submitted. Your account team will verify it shortly.",
    };
  } catch (error) {
    return toSafeError(error);
  }
}
