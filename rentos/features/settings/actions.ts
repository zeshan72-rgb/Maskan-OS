"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertPermission } from "@/lib/permissions/guards";
import { getSessionContext, primaryMembership } from "@/lib/permissions/context";
import { parseForm, toSafeError, type FormState } from "@/lib/utils/form-state";
import { recordAudit } from "@/lib/utils/audit";
import { APP_CONFIG } from "@/lib/config/app";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const organisationSchema = z.object({
  name: z.string().trim().min(2, "Company name is required"),
  legal_name: optionalString,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, "Enter a valid email address"),
  phone: optionalString,
  address: optionalString,
});

const inviteSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  role_id: z.string().uuid("Choose a role"),
});

const bankAccountSchema = z.object({
  bank_name: z.string().trim().min(2, "Bank name is required"),
  account_name: z.string().trim().min(2, "Account name is required"),
  account_number: z.string().trim().min(4, "Account number is required"),
  iban: optionalString,
  is_default: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
});

async function currentOrganisationId(): Promise<string> {
  const ctx = await getSessionContext();
  const membership = primaryMembership(ctx);
  if (!membership) throw new Error("No organisation membership found for the current user.");
  return membership.organisationId;
}

export async function updateOrganisationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    await assertPermission(organisationId, "settings.manage");

    const parsed = parseForm(organisationSchema, formData);
    if (!parsed.ok) return parsed.state;

    const supabase = await createClient();
    const { error } = await supabase.from("organisations").update(parsed.data).eq("id", organisationId);
    if (error) throw error;

    await recordAudit({
      organisationId, action: "organisation.updated", entityTable: "organisations", entityId: organisationId,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/settings");
    return { status: "success", message: "Company details saved." };
  } catch (error) {
    return toSafeError(error);
  }
}

/**
 * Creates a single-use, expiring invitation. Roles are validated against the
 * catalogue, and platform_super_admin can never be granted this way — that
 * would let an organisation admin escalate to platform-wide access.
 */
export async function inviteMemberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    const ctx = await assertPermission(organisationId, "settings.manage");

    const parsed = parseForm(inviteSchema, formData);
    if (!parsed.ok) return parsed.state;

    const supabase = await createClient();

    const { data: role } = await supabase
      .from("roles")
      .select("id, key, name, organisation_id")
      .eq("id", parsed.data.role_id)
      .maybeSingle();

    if (!role) return { status: "error", message: "That role could not be found." };
    if (role.key === "platform_super_admin") {
      return { status: "error", message: "Platform administrator access can't be granted from an organisation." };
    }
    if (role.organisation_id !== null && role.organisation_id !== organisationId) {
      return { status: "error", message: "That role belongs to a different organisation." };
    }

    const { data: existing } = await supabase
      .from("invitations")
      .select("id")
      .eq("organisation_id", organisationId)
      .eq("email", parsed.data.email)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return { status: "error", message: "There's already a pending invitation for that email address." };
    }

    const { data, error } = await supabase
      .from("invitations")
      .insert({
        organisation_id: organisationId,
        email: parsed.data.email,
        role_id: parsed.data.role_id,
        invited_by: ctx.userId,
      })
      .select("id, token")
      .single();
    if (error) throw error;

    await recordAudit({
      organisationId, action: "invitation.sent", entityTable: "invitations", entityId: data.id,
      metadata: { email: parsed.data.email, role: role.name },
    });

    revalidatePath("/settings");

    // Email delivery happens through the transactional provider when it's
    // configured. Without credentials nothing is faked — the invitation link
    // is returned so an admin can share it directly.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const emailConfigured = !!process.env.RESEND_API_KEY;

    return {
      status: "success",
      id: data.id,
      message: emailConfigured
        ? `Invitation sent to ${parsed.data.email}.`
        : `Invitation created. ${APP_CONFIG.name} has no email provider configured, so share this link: ${appUrl}/invite/${data.token}`,
    };
  } catch (error) {
    return toSafeError(error);
  }
}

export async function addBankAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const organisationId = await currentOrganisationId();
    await assertPermission(organisationId, "finance.bank_details.manage");

    const parsed = parseForm(bankAccountSchema, formData);
    if (!parsed.ok) return parsed.state;

    const supabase = await createClient();

    if (parsed.data.is_default) {
      await supabase.from("bank_accounts").update({ is_default: false }).eq("organisation_id", organisationId);
    }

    const { data, error } = await supabase
      .from("bank_accounts")
      .insert({
        organisation_id: organisationId,
        bank_name: parsed.data.bank_name,
        account_name: parsed.data.account_name,
        account_number: parsed.data.account_number,
        iban: parsed.data.iban ?? null,
        is_default: parsed.data.is_default,
      })
      .select("id")
      .single();
    if (error) throw error;

    // Bank changes are high-risk, so the audit entry records the change
    // without storing the account number itself in the log.
    await recordAudit({
      organisationId, action: "bank_account.added", entityTable: "bank_accounts", entityId: data.id,
      metadata: { bank_name: parsed.data.bank_name, is_default: parsed.data.is_default },
    });

    revalidatePath("/settings");
    revalidatePath("/tenant");
    return { status: "success", message: "Bank account saved." };
  } catch (error) {
    return toSafeError(error);
  }
}
