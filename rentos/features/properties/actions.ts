"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertPermission } from "@/lib/permissions/guards";
import { getSessionContext, primaryMembership } from "@/lib/permissions/context";
import { propertySchema, unitSchema } from "@/lib/validation/entities";
import { parseForm, toSafeError, type FormState } from "@/lib/utils/form-state";
import { recordAudit } from "@/lib/utils/audit";

async function currentOrganisationId(): Promise<string> {
  const ctx = await getSessionContext();
  const membership = primaryMembership(ctx);
  if (!membership) throw new Error("No organisation membership found for the current user.");
  return membership.organisationId;
}

export async function createPropertyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "properties.manage");

    const parsed = parseForm(propertySchema, formData);
    if (!parsed.ok) return parsed.state;
    const { owner_id, ...propertyFields } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("properties")
      .insert({ ...propertyFields, organisation_id: organisationId, created_by: ctx.userId })
      .select("id")
      .single();

    if (error) throw error;

    // Optional ownership link created in the same flow so a property is never
    // orphaned from its owner just because it was a separate step.
    if (owner_id) {
      await supabase.from("property_owners").insert({
        property_id: data.id,
        owner_id,
        ownership_percentage: 100,
      });
    }

    await recordAudit({
      organisationId,
      action: "property.created",
      entityTable: "properties",
      entityId: data.id,
      metadata: { name: propertyFields.name, code: propertyFields.property_code },
    });

    revalidatePath("/properties");
    revalidatePath("/dashboard");
    return { status: "success", message: "Property created.", id: data.id };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function updatePropertyAction(propertyId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    await assertPermission(organisationId, "properties.manage");

    const parsed = parseForm(propertySchema, formData);
    if (!parsed.ok) return parsed.state;
    const { owner_id: _ownerId, ...propertyFields } = parsed.data;

    const supabase = await createClient();
    const { error } = await supabase
      .from("properties")
      .update(propertyFields)
      .eq("id", propertyId)
      .eq("organisation_id", organisationId);

    if (error) throw error;

    await recordAudit({
      organisationId,
      action: "property.updated",
      entityTable: "properties",
      entityId: propertyId,
      metadata: { name: propertyFields.name },
    });

    revalidatePath(`/properties/${propertyId}`);
    revalidatePath("/properties");
    return { status: "success", message: "Property updated.", id: propertyId };
  } catch (error) {
    return toSafeError(error);
  }
}

/**
 * Archives rather than deletes: properties are tied to leases, payments and
 * owner statements, so hard deletion would break financial auditability.
 */
export async function archivePropertyAction(propertyId: string): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    await assertPermission(organisationId, "properties.manage");

    const supabase = await createClient();

    const { count } = await supabase
      .from("leases")
      .select("id", { count: "exact", head: true })
      .eq("property_id", propertyId)
      .in("status", ["active", "expiring", "renewal_offered"]);

    if ((count ?? 0) > 0) {
      return {
        status: "error",
        message: `This property has ${count} active lease(s). Terminate or transfer them before archiving.`,
      };
    }

    const { error } = await supabase
      .from("properties")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", propertyId)
      .eq("organisation_id", organisationId);

    if (error) throw error;

    await recordAudit({ organisationId, action: "property.archived", entityTable: "properties", entityId: propertyId });

    revalidatePath("/properties");
    return { status: "success", message: "Property archived." };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function createUnitAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    await assertPermission(organisationId, "properties.manage");

    const parsed = parseForm(unitSchema, formData);
    if (!parsed.ok) return parsed.state;

    const supabase = await createClient();

    // Confirm the property belongs to this organisation before writing a unit
    // against it. RLS would also reject it, but this yields a clear message.
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", parsed.data.property_id)
      .eq("organisation_id", organisationId)
      .maybeSingle();

    if (!property) return { status: "error", message: "That property could not be found in your organisation." };

    const { data, error } = await supabase
      .from("units")
      .insert({ ...parsed.data, organisation_id: organisationId })
      .select("id")
      .single();

    if (error) throw error;

    await recordAudit({
      organisationId,
      action: "unit.created",
      entityTable: "units",
      entityId: data.id,
      metadata: { unit_number: parsed.data.unit_number, property_id: parsed.data.property_id },
    });

    revalidatePath(`/properties/${parsed.data.property_id}/units`);
    revalidatePath(`/properties/${parsed.data.property_id}`);
    revalidatePath("/dashboard");
    return { status: "success", message: "Unit added.", id: data.id };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function updateUnitAction(unitId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    await assertPermission(organisationId, "properties.manage");

    const parsed = parseForm(unitSchema, formData);
    if (!parsed.ok) return parsed.state;

    const supabase = await createClient();

    // A unit with an active lease can't be flipped to vacant/inactive by hand —
    // the lease is the source of truth for occupancy.
    if (["vacant", "inactive"].includes(parsed.data.status)) {
      const { count } = await supabase
        .from("leases")
        .select("id", { count: "exact", head: true })
        .eq("unit_id", unitId)
        .in("status", ["active", "expiring", "renewal_offered"]);
      if ((count ?? 0) > 0) {
        return {
          status: "error",
          message: "This unit has an active lease, so it can't be marked vacant. Terminate the lease first.",
        };
      }
    }

    const { error } = await supabase
      .from("units")
      .update(parsed.data)
      .eq("id", unitId)
      .eq("organisation_id", organisationId);

    if (error) throw error;

    await recordAudit({ organisationId, action: "unit.updated", entityTable: "units", entityId: unitId });

    revalidatePath(`/properties/${parsed.data.property_id}/units`);
    return { status: "success", message: "Unit updated.", id: unitId };
  } catch (error) {
    return toSafeError(error);
  }
}
