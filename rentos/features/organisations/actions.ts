"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, primaryMembership } from "@/lib/permissions/context";
import { parseForm, toSafeError, type FormState } from "@/lib/utils/form-state";
import { recordAudit } from "@/lib/utils/audit";

/**
 * Organisation creation and onboarding progress.
 *
 * This runs before a membership exists, so unlike the other feature actions
 * it cannot call assertPermission. It relies on the signed-in user instead,
 * and creates the owner membership as part of the same flow.
 */

const organisationSchema = z.object({
  name: z.string().trim().min(2, "Company name is required"),
  legal_name: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  country: z.string().trim().default("QA"),
  currency: z.string().trim().default("QAR"),
});

const ONBOARDING_STEPS = ["company", "portfolio", "team", "complete"] as const;

export async function createOrganisationAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const parsed = parseForm(organisationSchema, formData);
    if (!parsed.ok) return parsed.state;

    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { status: "error", message: "You are not signed in." };

    const { data: org, error: orgError } = await supabase
      .from("organisations")
      .insert({
        name: parsed.data.name,
        legal_name: parsed.data.legal_name ?? null,
        country: parsed.data.country,
        currency: parsed.data.currency,
        onboarding_step: "portfolio",
      })
      .select("id")
      .single();
    if (orgError) throw orgError;

    // The creator becomes the owner. Without this the account would have an
    // organisation it cannot reach.
    const { data: ownerRole } = await supabase
      .from("roles")
      .select("id")
      .eq("key", "org_owner")
      .is("organisation_id", null)
      .single();

    const { data: member, error: memberError } = await supabase
      .from("organisation_members")
      .insert({ organisation_id: org.id, profile_id: auth.user.id, is_active: true })
      .select("id")
      .single();
    if (memberError) throw memberError;

    if (ownerRole) {
      const { error: roleError } = await supabase
        .from("member_roles")
        .insert({ organisation_member_id: member.id, role_id: ownerRole.id });
      if (roleError) throw roleError;
    }

    await recordAudit({
      organisationId: org.id,
      action: "organisation.created",
      entityTable: "organisations",
      entityId: org.id,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/", "layout");
    return { status: "success", message: "Organisation created.", id: org.id };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function setOnboardingStepAction(step: string): Promise<FormState> {
  try {
    if (!ONBOARDING_STEPS.includes(step as (typeof ONBOARDING_STEPS)[number])) {
      return { status: "error", message: `Unknown onboarding step: ${step}` };
    }

    const membership = primaryMembership(await getSessionContext());
    if (!membership) return { status: "error", message: "No organisation to update." };

    const supabase = await createClient();
    const { error } = await supabase
      .from("organisations")
      .update({ onboarding_step: step })
      .eq("id", membership.organisationId);
    if (error) throw error;

    revalidatePath("/", "layout");
    return { status: "success" };
  } catch (error) {
    return toSafeError(error);
  }
}
