"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertPermission } from "@/lib/permissions/guards";
import { getSessionContext, primaryMembership } from "@/lib/permissions/context";
import { ownerSchema, tenantSchema, ownerBankAccountSchema } from "@/lib/validation/entities";
import { parseForm, toSafeError, type FormState } from "@/lib/utils/form-state";
import { recordAudit } from "@/lib/utils/audit";

async function currentOrganisationId(): Promise<string> {
  const ctx = await getSessionContext();
  const membership = primaryMembership(ctx);
  if (!membership) throw new Error("No organisation membership found for the current user.");
  return membership.organisationId;
}

export async function createOwnerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "owners.manage");

    const parsed = parseForm(ownerSchema, formData);
    if (!parsed.ok) return parsed.state;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("owners")
      .insert({ ...parsed.data, organisation_id: organisationId, created_by: ctx.userId })
      .select("id")
      .single();
    if (error) throw error;

    await recordAudit({
      organisationId, action: "owner.created", entityTable: "owners", entityId: data.id,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/owners");
    return { status: "success", message: "Owner created.", id: data.id };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function updateOwnerAction(ownerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    await assertPermission(organisationId, "owners.manage");

    const parsed = parseForm(ownerSchema, formData);
    if (!parsed.ok) return parsed.state;

    const supabase = await createClient();
    const { error } = await supabase
      .from("owners").update(parsed.data).eq("id", ownerId).eq("organisation_id", organisationId);
    if (error) throw error;

    await recordAudit({ organisationId, action: "owner.updated", entityTable: "owners", entityId: ownerId });

    revalidatePath(`/owners/${ownerId}`);
    revalidatePath("/owners");
    return { status: "success", message: "Owner updated.", id: ownerId };
  } catch (error) {
    return toSafeError(error);
  }
}

/**
 * Owner bank details are handled by a separate action behind a separate
 * permission, so a property manager who can edit owner contact details
 * still can't read or change payout account numbers.
 */
export async function saveOwnerBankAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    await assertPermission(organisationId, "finance.bank_details.manage");

    const parsed = parseForm(ownerBankAccountSchema, formData);
    if (!parsed.ok) return parsed.state;

    const supabase = await createClient();

    const { data: owner } = await supabase
      .from("owners").select("id").eq("id", parsed.data.owner_id).eq("organisation_id", organisationId).maybeSingle();
    if (!owner) return { status: "error", message: "That owner could not be found in your organisation." };

    await supabase.from("owner_bank_accounts").update({ is_primary: false }).eq("owner_id", parsed.data.owner_id);

    const { error } = await supabase.from("owner_bank_accounts").insert({ ...parsed.data, is_primary: true });
    if (error) throw error;

    await recordAudit({
      organisationId,
      action: "owner.bank_details.changed",
      entityTable: "owner_bank_accounts",
      entityId: parsed.data.owner_id,
      metadata: { bank_name: parsed.data.bank_name },
    });

    revalidatePath(`/owners/${parsed.data.owner_id}`);
    return { status: "success", message: "Bank account saved." };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function createTenantAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "tenants.manage");

    const parsed = parseForm(tenantSchema, formData);
    if (!parsed.ok) return parsed.state;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenants")
      .insert({ ...parsed.data, organisation_id: organisationId, created_by: ctx.userId })
      .select("id")
      .single();
    if (error) throw error;

    await recordAudit({
      organisationId, action: "tenant.created", entityTable: "tenants", entityId: data.id,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/tenants");
    return { status: "success", message: "Tenant created.", id: data.id };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function updateTenantAction(tenantId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    await assertPermission(organisationId, "tenants.manage");

    const parsed = parseForm(tenantSchema, formData);
    if (!parsed.ok) return parsed.state;

    const supabase = await createClient();
    const { error } = await supabase
      .from("tenants").update(parsed.data).eq("id", tenantId).eq("organisation_id", organisationId);
    if (error) throw error;

    await recordAudit({ organisationId, action: "tenant.updated", entityTable: "tenants", entityId: tenantId });

    revalidatePath(`/tenants/${tenantId}`);
    revalidatePath("/tenants");
    return { status: "success", message: "Tenant updated.", id: tenantId };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function archiveTenantAction(tenantId: string): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    await assertPermission(organisationId, "tenants.manage");

    const supabase = await createClient();
    const { count } = await supabase
      .from("leases")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("status", ["active", "expiring", "renewal_offered"]);

    if ((count ?? 0) > 0) {
      return { status: "error", message: "This tenant has an active lease and can't be archived yet." };
    }

    const { error } = await supabase
      .from("tenants")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", tenantId)
      .eq("organisation_id", organisationId);
    if (error) throw error;

    await recordAudit({ organisationId, action: "tenant.archived", entityTable: "tenants", entityId: tenantId });

    revalidatePath("/tenants");
    return { status: "success", message: "Tenant archived." };
  } catch (error) {
    return toSafeError(error);
  }
}
