"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertPermission } from "@/lib/permissions/guards";
import { getSessionContext, primaryMembership } from "@/lib/permissions/context";
import { chequeSchema } from "@/lib/validation/leases";
import { parseForm, toSafeError, type FormState } from "@/lib/utils/form-state";
import { recordAudit } from "@/lib/utils/audit";
import { notify } from "@/features/notifications/service";
import type { ChequeStatus } from "@/types/database";

async function currentOrganisationId(): Promise<string> {
  const ctx = await getSessionContext();
  const membership = primaryMembership(ctx);
  if (!membership) throw new Error("No organisation membership found for the current user.");
  return membership.organisationId;
}

export async function createChequeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "payments.manage");

    const parsed = parseForm(chequeSchema, formData);
    if (!parsed.ok) return parsed.state;
    const input = parsed.data;

    const supabase = await createClient();

    const { data: lease } = await supabase
      .from("leases")
      .select("id")
      .eq("id", input.lease_id)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!lease) return { status: "error", message: "That lease could not be found in your organisation." };

    // If an instalment is linked, sanity-check it belongs to the same lease.
    if (input.rent_instalment_id) {
      const { data: instalment } = await supabase
        .from("rent_instalments")
        .select("id, lease_id")
        .eq("id", input.rent_instalment_id)
        .maybeSingle();
      if (!instalment || instalment.lease_id !== input.lease_id) {
        return { status: "error", message: "The selected instalment doesn't belong to this lease." };
      }
    }

    const { data, error } = await supabase
      .from("cheques")
      .insert({
        organisation_id: organisationId,
        lease_id: input.lease_id,
        rent_instalment_id: input.rent_instalment_id ?? null,
        cheque_number: input.cheque_number,
        bank_name: input.bank_name,
        payer_name: input.payer_name,
        amount: input.amount,
        cheque_date: input.cheque_date,
        received_date: input.received_date,
        internal_notes: input.internal_notes ?? null,
        status: "received",
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    if (error) throw error;

    await recordAudit({
      organisationId, action: "cheque.recorded", entityTable: "cheques", entityId: data.id,
      metadata: { cheque_number: input.cheque_number, amount: input.amount, bank: input.bank_name },
    });

    revalidatePath("/payments/cheques");
    revalidatePath(`/leases/${input.lease_id}`);
    return { status: "success", message: `Cheque ${input.cheque_number} recorded.`, id: data.id };
  } catch (error) {
    return toSafeError(error);
  }
}

/**
 * Advances a cheque through its lifecycle. The database enforces which
 * transitions are legal (received → submitted → cleared / bounced → replaced),
 * so an invalid jump is rejected regardless of how it was triggered.
 *
 * Clearing is special: it calls clear_cheque_to_payment, which atomically
 * creates the confirmed payment and allocates it to the linked instalment.
 */
export async function updateChequeStatusAction(
  chequeId: string,
  status: ChequeStatus,
  notes?: string
): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "payments.manage");
    const supabase = await createClient();

    const { data: cheque } = await supabase
      .from("cheques")
      .select("id, status, cheque_number, amount, lease_id, rent_instalment_id")
      .eq("id", chequeId)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!cheque) return { status: "error", message: "Cheque not found." };

    if (status === "cleared") {
      const { error: rpcError } = await supabase.rpc("clear_cheque_to_payment", {
        p_cheque_id: chequeId,
        p_actor: ctx.userId,
      });
      if (rpcError) throw rpcError;

      await recordAudit({
        organisationId, action: "cheque.cleared", entityTable: "cheques", entityId: chequeId,
        metadata: { cheque_number: cheque.cheque_number, amount: Number(cheque.amount) },
      });

      revalidatePath("/payments/cheques");
      revalidatePath(`/payments/cheques/${chequeId}`);
      revalidatePath(`/leases/${cheque.lease_id}`);
      revalidatePath("/dashboard");
      return { status: "success", message: "Cheque cleared. A confirmed payment has been created and allocated." };
    }

    const { error } = await supabase.from("cheques").update({ status }).eq("id", chequeId);
    if (error) throw error;

    if (notes) {
      await supabase
        .from("cheque_events")
        .update({ notes })
        .eq("cheque_id", chequeId)
        .eq("to_status", status);
    }

    if (status === "bounced") {
      const { data: lease } = await supabase
        .from("leases")
        .select("tenant_id, lease_code")
        .eq("id", cheque.lease_id)
        .maybeSingle();

      if (lease) {
        await notify({
          organisationId,
          tenantId: lease.tenant_id,
          type: "cheque_bounced",
          title: "Cheque returned unpaid",
          body: `Cheque ${cheque.cheque_number} for QAR ${Number(cheque.amount).toFixed(2)} was returned by the bank. Please arrange a replacement.`,
          link: "/tenant/payments",
        });
      }
    }

    await recordAudit({
      organisationId, action: `cheque.${status}`, entityTable: "cheques", entityId: chequeId,
      metadata: { cheque_number: cheque.cheque_number, from: cheque.status, to: status, notes },
    });

    revalidatePath("/payments/cheques");
    revalidatePath(`/payments/cheques/${chequeId}`);
    revalidatePath("/dashboard");
    return { status: "success", message: `Cheque marked ${status.replace(/_/g, " ")}.` };
  } catch (error) {
    return toSafeError(error);
  }
}

/**
 * Records a replacement cheque for one that bounced, preserving the original
 * record and its history rather than editing it in place.
 */
export async function replaceChequeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    await assertPermission(organisationId, "payments.manage");

    const originalId = String(formData.get("original_cheque_id") ?? "");
    if (!originalId) return { status: "error", message: "Original cheque not identified." };

    const supabase = await createClient();
    const { data: original } = await supabase
      .from("cheques")
      .select("id, status, lease_id, rent_instalment_id")
      .eq("id", originalId)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!original) return { status: "error", message: "Original cheque not found." };
    if (original.status !== "bounced") {
      return { status: "error", message: "Only a bounced cheque can be replaced." };
    }

    // Reuse the create flow for the new cheque, then mark the original replaced.
    formData.set("lease_id", original.lease_id);
    if (original.rent_instalment_id) formData.set("rent_instalment_id", original.rent_instalment_id);

    const created = await createChequeAction({ status: "idle" }, formData);
    if (created.status !== "success") return created;

    const { error } = await supabase.from("cheques").update({ status: "replaced" }).eq("id", originalId);
    if (error) throw error;

    await recordAudit({
      organisationId, action: "cheque.replaced", entityTable: "cheques", entityId: originalId,
      metadata: { replacement_cheque_id: created.id },
    });

    revalidatePath("/payments/cheques");
    return { status: "success", message: "Replacement cheque recorded and the original marked replaced.", id: created.id };
  } catch (error) {
    return toSafeError(error);
  }
}
